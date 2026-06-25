export type MarkdownBlockType =
  | "heading"
  | "paragraph"
  | "blockquote"
  | "list-item"
  | "code"
  | "table"
  | "hr";

export type MarkdownBlock = {
  id: string;
  type: MarkdownBlockType;
  content: string;
  order: number;
  startLine: number;
  endLine: number;
  level?: number;
  language?: string;
  ordered?: boolean;
  orderedStart?: number;
  checked?: boolean;
};
