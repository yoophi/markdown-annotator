import type { AnnotationDraft } from "@/entities/annotation/model/types";
import type { MarkdownBlock } from "@/entities/markdown-block/model/types";

export function formatAnnotationsForAgent(
  fileName: string,
  annotations: AnnotationDraft[],
  blocks: MarkdownBlock[] = [],
) {
  if (annotations.length === 0) {
    return [
      "# Markdown Annotations",
      "",
      `File: ${fileName}`,
      "",
      "No annotations yet.",
    ].join("\n");
  }

  return [
    "# Markdown Annotations",
    "",
    `File: ${fileName}`,
    "",
    `I've reviewed this Markdown document and have ${annotations.length} piece${annotations.length > 1 ? "s" : ""} of feedback:`,
    "",
    ...[...annotations]
      .sort((a, b) => {
        const blockA = blocks.findIndex((block) => block.id === a.anchor.blockId);
        const blockB = blocks.findIndex((block) => block.id === b.anchor.blockId);
        if (blockA !== blockB) return blockA - blockB;
        return (a.anchor.startOffset ?? 0) - (b.anchor.startOffset ?? 0);
      })
      .map((annotation, index) => {
        return [
          `## ${index + 1}. [${annotation.type}] Feedback on: "${annotation.selectedText}"`,
          "",
          annotation.anchor.startOffset !== undefined && annotation.anchor.endOffset !== undefined
            ? `- Offset: ${annotation.anchor.startOffset}-${annotation.anchor.endOffset}`
            : null,
          `> ${annotation.comment}`,
        ]
          .filter(Boolean)
          .join("\n");
      }),
    "---",
    "",
    "Please address the annotation feedback above.",
  ].join("\n");
}
