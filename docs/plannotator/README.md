# Plannotator 조사 문서

`ref/plannotator` 프로젝트를 조사하여, **Markdown 문서를 annotation(주석) 가능한 HTML로 만드는 과정**을 정리한 문서 모음입니다.

## 문서 목록

| 문서 | 내용 |
|------|------|
| [01-overview.md](./01-overview.md) | 프로젝트 개요와 핵심 설계 철학 |
| [02-pipeline.md](./02-pipeline.md) | 입력 → 변환 → 렌더링 → annotation 전체 파이프라인 |
| [03-block-parsing-and-rendering.md](./03-block-parsing-and-rendering.md) | 블록 파싱과 DOM 렌더링 (annotation의 토대) |
| [04-annotation-system.md](./04-annotation-system.md) | annotation 부착·복원 메커니즘 |
| [05-output-format.md](./05-output-format.md) | **출력 데이터 형식** (피드백 markdown, stdout, 공유 페이로드) |
| [06-libraries.md](./06-libraries.md) | **변환에 사용하는 외부 라이브러리** |
| [07-notable-points.md](./07-notable-points.md) | **변환 과정의 특이점** |

## 한 줄 요약

> Plannotator는 Markdown을 **통째로 HTML로 변환하지 않고 블록 단위로 분해**한 뒤,
> 각 블록에 안정적인 `data-block-id`를 부여하고, **텍스트 기반으로 선택을 재현 가능하게**
> 만들어 "annotation 가능한 HTML"을 구성한다.

## 조사 대상 버전

- 경로: `ref/plannotator` (모노레포, Bun 런타임)
- 조사일: 2026-06-25
