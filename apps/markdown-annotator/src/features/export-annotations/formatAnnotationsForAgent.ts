import type { AnnotationDraft } from "@/entities/annotation/model/types";

export function formatAnnotationsForAgent(fileName: string, annotations: AnnotationDraft[]) {
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
    ...annotations.map(
      (annotation, index) =>
        [
          `## ${index + 1}. [${annotation.type}] Feedback on: "${annotation.selectedText}"`,
          "",
          `- Anchor: \`${annotation.anchor.nodeId}\``,
          annotation.anchor.startOffset !== undefined && annotation.anchor.endOffset !== undefined
            ? `- Offset: ${annotation.anchor.startOffset}-${annotation.anchor.endOffset}`
            : null,
          `> ${annotation.comment}`,
        ]
          .filter(Boolean)
          .join("\n"),
    ),
    "---",
    "",
    "Please address the annotation feedback above.",
  ].join("\n");
}
