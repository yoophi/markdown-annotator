import type { AnnotationDraft } from "@/entities/annotation/model/types";

export function formatAnnotationsForAgent(fileName: string, annotations: AnnotationDraft[]) {
  if (annotations.length === 0) {
    return `File: ${fileName}\n\nNo annotations.`;
  }

  return [
    `File: ${fileName}`,
    ...annotations.map(
      (annotation, index) =>
        `${index + 1}. [${annotation.type}] "${annotation.selectedText}"\n   Comment: ${annotation.comment}`,
    ),
  ].join("\n");
}
