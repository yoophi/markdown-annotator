# 07. 변환 과정의 특이점

조사 과정에서 발견한, 일반적인 markdown 미리보기 도구와 다른 **주목할 만한 설계·구현 특이점**을 모았다.

## ① Markdown 블록 분해에 marked를 쓰지 않고 자체 파서를 만듦

`parseMarkdownToBlocks`는 marked 같은 표준 파서로 AST를 만드는 대신, **줄 단위로 직접 순회하는 커스텀 파서**다.

- **이유**: annotation을 위해서는 각 블록이 **안정적인 id(`block-N`)**와 **원본 줄 번호(`startLine`)**를 가져야 한다. 표준 파서의 AST는 이 두 가지(특히 정확한 원본 줄 추적)를 보장하기 까다롭다.
- marked는 **인라인 정제**(raw HTML 블록 내부)와 **HtmlBlock 렌더**에만 부분적으로 쓰인다.

## ② 리스트 항목을 일부러 개별 블록으로 쪼갬

```ts
// List Items
const listMatch = trimmed.match(/^(\*|-|(\d+)\.)\s/);
if (listMatch) {
  flush(); // Treat each list item as a separate block for easier annotation
```

- 보통 markdown 파서는 리스트 전체를 하나의 노드로 본다.
- Plannotator는 **항목 하나하나를 독립 블록**으로 만들어, 리스트의 특정 항목만 정밀하게 주석할 수 있게 했다.

## ③ Frontmatter를 분리하되 원본 줄 번호를 보존

`extractFrontmatter`는 YAML frontmatter를 떼어내면서 `contentStartLine`을 계산한다.

- 선행 공백, frontmatter 블록 길이, 닫는 `---` 뒤 빈 줄까지 모두 셈에 넣는다.
- 덕분에 본문 어디에 주석을 달아도 **출력 피드백의 줄 번호가 원본 파일과 정확히 일치**한다. (`(line 12)` 라벨의 정확성)

## ④ HTML 입력의 "이중 경로": raw 보존 vs 변환

`.html` 입력은 두 가지로 다룰 수 있다.

| 경로 | 동작 | 장점 |
|------|------|------|
| **raw HTML (기본)** | 원본 HTML을 변환 없이 렌더 (`renderAs:'html'`) | 원래 레이아웃·스타일 유지 |
| **변환 (`--markdown`)** | Turndown으로 markdown화 후 블록 파싱 | 일관된 블록 단위 정밀 annotation |

대부분의 도구는 한쪽만 지원하는데, Plannotator는 사용자가 목적에 따라 고를 수 있게 했다.

## ⑤ raw HTML 렌더 = "marked → DOMPurify" 2단 정제

`sanitizeBlockHtml` (`packages/ui/utils/sanitizeHtml.ts`)

```ts
const rendered = marked.parse(html, { async: false, gfm: true, breaks: false });
return DOMPurify.sanitize(rendered, { ALLOWED_TAGS, ALLOWED_ATTR });
```

- 먼저 **marked로 한 번 통과**시킨다. `<details>…</details>` 안에 섞인 `**bun**` 같은 markdown을 실제 `<strong>`으로 만들어 GitHub 동작을 흉내내기 위함.
- 그 다음 **DOMPurify 허용 목록**으로 이벤트 핸들러·인라인 스타일·스크립트를 모두 제거한다.

## ⑥ URL 변환의 SSRF 방어 (`isLocalUrl`)

`packages/shared/url-to-markdown.ts`는 외부 URL을 Jina Reader로 보내기 전에 **로컬/사설 주소면 Jina를 건너뛰고 직접 fetch**한다.

- `localhost`, `127.x`, `10.x`, `192.168.x`, `172.16~31.x`, `169.254.x`, `.local`
- IPv6: link-local(`fe80::`), unique-local(`fc00::`/`fd00::`), IPv4-mapped(`::ffff:`)

```mermaid
flowchart TD
    URL["입력 URL"] --> CHK{isLocalUrl?}
    CHK -->|예 (사설/로컬)| DIRECT["직접 fetch<br/>(Jina로 내부망 유출 방지)"]
    CHK -->|아니오| JINA["Jina Reader 시도"]
    JINA -->|실패| TD["fetch + Turndown 폴백"]
```

> 코드 주석에 *WHATWG URL의 `hostname` getter가 IPv6를 대괄호 포함해 반환*한다는 점을 Bun/Node에서 실측 검증한 기록이 남아 있다. (`new URL("http://[::1]/").hostname` → `"[::1]"`)

## ⑦ URL 변환의 다단계 폴백 전략

`urlToMarkdown`은 단순히 Jina만 쓰지 않고 소스 종류를 단계적으로 판별한다.

1. **`.md` 등 raw 텍스트** → 그대로 사용 (`fetch-raw`)
2. **content negotiation** (예: Cloudflare의 "Markdown for Agents") → 협상된 markdown 사용
3. **Jina Reader** → markdown 변환 (`jina`)
4. **fetch + Turndown** → 최종 폴백 (`fetch+turndown`)

변환 소스가 무엇이었는지(`source`)를 기록해, 출력 피드백에 *"줄 번호는 변환된 markdown 기준"* 경고를 띄울지 판단한다.

## ⑧ Turndown 전에 `<style>`/`<script>` 강제 제거

```ts
td.remove(["style", "script", "noscript"]);
```

- Turndown은 인식 못 하는 태그를 기본적으로 빈 값으로 두지만, **그 텍스트 내용이 새어나올 수 있다**. CSS/JS 텍스트가 본문에 섞이는 것을 막기 위해 명시적으로 제거한다.

## ⑨ annotation은 오프셋이 아니라 "텍스트 + DOM 메타"로 저장

- 단순 `startOffset/endOffset`은 레거시로 남아 있고, 실제 복원은 **`originalText` 텍스트 검색 + `startMeta/endMeta`(parentTagName, parentIndex, textOffset)**로 한다.
- 재렌더·요소 재정렬·공유 URL 재로드에도 견딘다.

## ⑩ 코드 블록은 web-highlighter 우회

- `web-highlighter`가 `<pre>` 내부 선택을 지원하지 못해, **코드 블록만 수동 `<mark>` 래핑**으로 별도 처리한다.

## ⑪ 설정 저장에 localStorage가 아니라 쿠키 사용

- 각 hook 호출이 **랜덤 포트**에서 뜨기 때문에 origin 기반 localStorage는 공유가 안 된다.
- 그래서 identity·plan 저장 설정 등을 **쿠키**에 저장해 포트가 바뀌어도 유지되게 했다.

## ⑫ Plan editor HTML을 annotate가 그대로 재사용

- annotate 서버는 전용 프론트를 따로 두지 않고, **plan 리뷰 앱의 HTML을 `mode:"annotate"`로 재사용**한다. 빌드 산출물과 코드 경로를 공유해 유지보수 부담을 줄인다.
