import type { AnnotationDraft } from "@/entities/annotation/model/types";
import type { MarkdownBlock } from "@/entities/markdown-block/model/types";

function formatLineRange(annotation: AnnotationDraft) {
  if (annotation.anchor.startLine === undefined) {
    return null;
  }

  if (
    annotation.anchor.endLine === undefined ||
    annotation.anchor.endLine === annotation.anchor.startLine
  ) {
    return `- Line: ${annotation.anchor.startLine}`;
  }

  return `- Lines: ${annotation.anchor.startLine}-${annotation.anchor.endLine}`;
}

function formatGroupLineRange(annotations: AnnotationDraft[]) {
  const lines = annotations.flatMap((annotation) => [
    annotation.anchor.startLine,
    annotation.anchor.endLine ?? annotation.anchor.startLine,
  ]);
  const numericLines = lines.filter((line): line is number => line !== undefined);

  if (numericLines.length === 0) {
    return null;
  }

  const startLine = Math.min(...numericLines);
  const endLine = Math.max(...numericLines);

  return startLine === endLine ? `- Line: ${startLine}` : `- Lines: ${startLine}-${endLine}`;
}

function groupAnnotations(annotations: AnnotationDraft[]) {
  const groups = new Map<string, AnnotationDraft[]>();

  annotations.forEach((annotation) => {
    const key = annotation.groupId ?? annotation.id;
    const group = groups.get(key) ?? [];
    group.push(annotation);
    groups.set(key, group);
  });

  return Array.from(groups.values());
}

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

  const sortedGroups = groupAnnotations(annotations).sort((a, b) => {
    const firstA = a[0];
    const firstB = b[0];
    const blockA = blocks.findIndex((block) => block.id === firstA?.anchor.blockId);
    const blockB = blocks.findIndex((block) => block.id === firstB?.anchor.blockId);
    if (blockA !== blockB) return blockA - blockB;
    return (firstA?.anchor.startOffset ?? 0) - (firstB?.anchor.startOffset ?? 0);
  });

  return [
    "# Markdown Annotations",
    "",
    `File: ${fileName}`,
    "",
    `I've reviewed this Markdown document and have ${sortedGroups.length} piece${sortedGroups.length > 1 ? "s" : ""} of feedback:`,
    "",
    ...sortedGroups
      .map((group, index) => {
        const annotation = group[0];
        if (!annotation) {
          return null;
        }
        const selectedText = group.map((item) => item.selectedText).join("\n");

        if (annotation.type === "delete") {
          return [
            `## ${index + 1}. [delete] Remove this`,
            "",
            group.length > 1 ? formatGroupLineRange(group) : formatLineRange(annotation),
            "```markdown",
            selectedText,
            "```",
            "",
            `> ${annotation.comment}`,
          ]
            .filter(Boolean)
            .join("\n");
        }

        return [
          `## ${index + 1}. [${annotation.type}] Feedback on: "${selectedText}"`,
          "",
          group.length > 1 ? formatGroupLineRange(group) : formatLineRange(annotation),
          group.length === 1 && annotation.anchor.startOffset !== undefined && annotation.anchor.endOffset !== undefined
            ? `- Offset: ${annotation.anchor.startOffset}-${annotation.anchor.endOffset}`
            : null,
          `> ${annotation.comment}`,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .filter((section): section is string => section !== null),
    "---",
    "",
    "Please address the annotation feedback above.",
  ].join("\n");
}
