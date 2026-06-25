export type AnnotationType = "question" | "change-request" | "note" | "approve";

export type AnnotationAnchor = {
  nodeId: string;
  startOffset?: number;
  endOffset?: number;
  selectedText?: string;
};

export type AnnotationDraft = {
  id: string;
  fileName: string;
  anchor: AnnotationAnchor;
  selectedText: string;
  comment: string;
  type: AnnotationType;
  createdAt: string;
};
