export type AnnotationType = "question" | "change-request" | "note" | "approve";

export type AnnotationDraft = {
  id: string;
  selectedText: string;
  comment: string;
  type: AnnotationType;
};
