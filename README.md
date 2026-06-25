# Markdown Annotator

Markdown 문서를 열고, 브라우저 UI에서 텍스트를 선택해 annotation을 남긴 뒤, agent에게 전달할 수 있는 구조화된 Markdown 피드백으로 내보내는 Tauri 데스크톱 앱입니다.

## 현재 범위

- Markdown 파일 열기
- Markdown 렌더링
- 텍스트 선택 기반 annotation draft 추가
- annotation 목록 표시
- agent용 Markdown export를 클립보드로 복사

```mermaid
flowchart LR
  A[Markdown File] --> B[Tauri Command]
  B --> C[Document Entity]
  C --> D[Annotator Page]
  D --> E[Annotation Drafts]
  E --> F[Agent Markdown Export]
```

## 문서

- [docs/plannotator/](./docs/plannotator/README.md) — `plannotator` 프로젝트를 조사하여 Markdown → annotation 가능한 HTML 변환 과정을 정리한 문서
- [docs/annotation-architecture.md](./docs/annotation-architecture.md) — Markdown annotator 기능 영역 분리, MVP 범위, agent export 구조 설계 조언

## 개발

```bash
pnpm install
pnpm dev
pnpm tauri:dev
pnpm storybook
```

검증:

```bash
pnpm check-types
pnpm build
pnpm build-storybook
cd apps/markdown-annotator/src-tauri && cargo check
```

## 앱 구조

프론트엔드는 `apps/markdown-annotator/src` 아래에서 Feature-Sliced Design을 따릅니다.

```text
src/
  app/        # 앱 조립과 전역 composition
  pages/      # 화면 단위 UI
  features/   # 사용자 액션과 비즈니스 interaction
  entities/   # domain model, API adapter, domain helper
  shared/     # 재사용 UI와 공통 유틸리티
  stories/    # Storybook stories
```

Tauri backend는 `apps/markdown-annotator/src-tauri/src` 아래에서 hexagonal architecture를 따릅니다.

```text
src-tauri/src/
  domain/          # 순수 domain model과 port
  application/     # use case와 business rule
  inbound/         # Tauri command 같은 inbound adapter
  infrastructure/  # filesystem 같은 outbound adapter
```

## 디렉터리 구조

```
markdown-annotator/
├── apps/
│   └── markdown-annotator/ # Tauri v2 + Vite + React desktop app
├── docs/
│   ├── annotation-architecture.md
│   └── plannotator/   # 조사 문서 (개요, 파이프라인, 출력 형식, 라이브러리, 특이점)
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── turbo.json
└── ref/               # 참고용 외부 프로젝트 (git 추적 제외)
```
