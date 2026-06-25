# Technical Design: Stable Markdown Annotation

## Principle

Annotations should attach to the document model, not to incidental DOM structure.

## Proposed Data Model

```ts
type AnnotationAnchor = {
  nodeId: string
  startOffset?: number
  endOffset?: number
  selectedText?: string
}
```

The `nodeId` identifies a rendered block or inline unit. Offsets describe the selected text inside that unit.

## Rendering

Each meaningful Markdown element should receive a stable id.

```html
<p data-node-id="p-12">
  Use filesystem JSON cache for the MVP.
</p>
```

## Export

Feedback should be formatted for agent consumption.

```markdown
# Markdown Annotations

File: docs/plan.md

## 1. [change-request] Feedback on: "Use SQLite"
> Prefer a filesystem JSON cache for the MVP.
```

## Tradeoff

The first version can use simple block-level anchors. A later version can improve precision with Markdown AST positions and robust text matching.
