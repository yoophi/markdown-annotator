import {
  CheckCircle2,
  ClipboardCopy,
  FileText,
  FolderOpen,
  MessageSquarePlus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AnnotationAnchor, AnnotationDraft, AnnotationType } from "@/entities/annotation/model/types";
import { exampleMarkdownDocuments } from "@/entities/document/model/examples";
import type { MarkdownDocument } from "@/entities/document/model/types";
import { formatAnnotationsForAgent } from "@/features/export-annotations/formatAnnotationsForAgent";
import { parseMarkdownToBlocks } from "@/features/markdown-renderer/parseMarkdownToBlocks";
import { openMarkdownDocument } from "@/features/open-document/openMarkdownDocument";
import { MarkdownViewer } from "@/shared/ui/MarkdownViewer";

const annotationTypes: Array<{ value: AnnotationType; label: string }> = [
  { value: "change-request", label: "Change request" },
  { value: "question", label: "Question" },
  { value: "note", label: "Note" },
  { value: "approve", label: "Approve" },
];

function getSelectionAnchor(): AnnotationAnchor | null {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();
  if (!selection || !selectedText || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const startElement =
    range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement
      : (range.startContainer as Element);
  const blockContentElement = startElement?.closest<HTMLElement>("[data-block-content]");
  const annotatedElement = blockContentElement?.closest<HTMLElement>("[data-block-id]");
  if (!blockContentElement || !annotatedElement) {
    return null;
  }

  const prefixRange = range.cloneRange();
  prefixRange.selectNodeContents(blockContentElement);
  prefixRange.setEnd(range.startContainer, range.startOffset);
  const startOffset = prefixRange.toString().length;

  return {
    blockId: annotatedElement.dataset.blockId ?? "unknown-block",
    startOffset,
    endOffset: startOffset + selectedText.length,
    selectedText,
    startLine: Number(annotatedElement.dataset.startLine) || undefined,
    endLine: Number(annotatedElement.dataset.endLine) || undefined,
  };
}

export function AnnotatorPage() {
  const [selectedExampleId, setSelectedExampleId] = useState(exampleMarkdownDocuments[0]?.id ?? "");
  const [document, setDocument] = useState<MarkdownDocument>(() => {
    const initial = exampleMarkdownDocuments[0];
    return {
      fileName: initial.fileName,
      absolutePath: `examples/${initial.fileName}`,
      markdownText: initial.markdownText,
    };
  });
  const [selection, setSelection] = useState("");
  const [selectionAnchor, setSelectionAnchor] = useState<AnnotationAnchor | null>(null);
  const [annotationType, setAnnotationType] = useState<AnnotationType>("change-request");
  const [comment, setComment] = useState("");
  const [annotations, setAnnotations] = useState<AnnotationDraft[]>([]);
  const [status, setStatus] = useState("예제 문서를 선택하거나 로컬 Markdown 파일을 열 수 있습니다.");

  const title = document.fileName;
  const blocks = useMemo(() => parseMarkdownToBlocks(document.markdownText), [document.markdownText]);
  const exportText = useMemo(
    () => formatAnnotationsForAgent(document.fileName, annotations, blocks),
    [annotations, blocks, document.fileName],
  );
  const annotatedBlockIds = useMemo(
    () => new Set(annotations.map((annotation) => annotation.anchor.blockId)),
    [annotations],
  );

  function loadExample(exampleId: string | null) {
    if (!exampleId) {
      return;
    }

    const example = exampleMarkdownDocuments.find((candidate) => candidate.id === exampleId);
    if (!example) {
      return;
    }

    setSelectedExampleId(example.id);
    setDocument({
      fileName: example.fileName,
      absolutePath: `examples/${example.fileName}`,
      markdownText: example.markdownText,
    });
    setAnnotations([]);
    setSelection("");
    setSelectionAnchor(null);
    setComment("");
    setStatus(`${example.fileName} 예제를 불러왔습니다.`);
  }

  async function handleOpenFile() {
    try {
      const opened = await openMarkdownDocument();
      if (!opened) {
        return;
      }

      setDocument(opened);
      setAnnotations([]);
      setSelection("");
      setSelectionAnchor(null);
      setComment("");
      setStatus(`${opened.fileName} 파일을 열었습니다.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "파일을 열 수 없습니다.");
    }
  }

  function captureSelection() {
    const anchor = getSelectionAnchor();
    if (anchor?.selectedText) {
      setSelection(anchor.selectedText);
      setSelectionAnchor(anchor);
      setStatus("선택 anchor를 저장했습니다.");
    }
  }

  function addAnnotation() {
    if (!selection || !selectionAnchor || !comment.trim()) {
      setStatus("텍스트를 선택하고 comment를 입력하세요.");
      return;
    }

    setAnnotations((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        fileName: document.fileName,
        anchor: selectionAnchor,
        selectedText: selection,
        comment: comment.trim(),
        type: annotationType,
        createdAt: new Date().toISOString(),
      },
    ]);
    setComment("");
    setSelection("");
    setSelectionAnchor(null);
    window.getSelection()?.removeAllRanges();
    setStatus("Annotation을 추가했습니다.");
  }

  function deleteAnnotation(annotationId: string) {
    setAnnotations((current) => current.filter((annotation) => annotation.id !== annotationId));
    setStatus("Annotation을 삭제했습니다.");
  }

  async function copyExport() {
    await navigator.clipboard.writeText(exportText);
    setStatus("Agent용 Markdown 출력을 클립보드에 복사했습니다.");
  }

  return (
    <main className="flex h-screen min-h-0 flex-col bg-background text-foreground">
      <header className="flex min-h-16 items-center justify-between border-b bg-card px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <FileText aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-base font-semibold">Markdown Annotator</h1>
            <p className="max-w-[56vw] truncate text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedExampleId} onValueChange={loadExample}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="예제 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Examples</SelectLabel>
                {exampleMarkdownDocuments.map((example) => (
                  <SelectItem key={example.id} value={example.id}>
                    {example.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={handleOpenFile}>
            <FolderOpen data-icon="inline-start" aria-hidden="true" />
            Open
          </Button>
          <Button type="button" onClick={copyExport}>
            <ClipboardCopy data-icon="inline-start" aria-hidden="true" />
            Copy prompt
          </Button>
        </div>
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-h-0 bg-muted/30">
          <ScrollArea className="h-full">
            <div className="mx-auto max-w-5xl p-6" onMouseUp={captureSelection}>
              <Card>
                <CardHeader>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{document.absolutePath}</CardDescription>
                  <CardAction>
                    <Badge variant="secondary">{annotations.length} annotations</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <MarkdownViewer blocks={blocks} annotatedBlockIds={annotatedBlockIds} />
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>

        <aside className="min-h-0 border-l bg-card">
          <Tabs defaultValue="annotate" className="h-full gap-0">
            <div className="border-b p-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="annotate">Annotate</TabsTrigger>
                <TabsTrigger value="prompt">Prompt</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="annotate" className="min-h-0 flex-1">
              <ScrollArea className="h-[calc(100vh-8rem)]">
                <div className="flex flex-col gap-4 p-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Add annotation</CardTitle>
                      <CardDescription>문서에서 텍스트를 선택한 뒤 comment를 입력합니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FieldGroup>
                        <Field>
                          <FieldLabel>Selected text</FieldLabel>
                          <div className="min-h-16 rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground">
                            {selection || "문서에서 텍스트를 드래그하세요."}
                          </div>
                          <FieldDescription>
                            {selectionAnchor
                              ? "선택 범위가 저장되었습니다."
                              : "선택하면 block anchor와 offset을 내부적으로 저장합니다."}
                          </FieldDescription>
                        </Field>
                        <Field>
                          <FieldLabel>Type</FieldLabel>
                          <Select
                            value={annotationType}
                            onValueChange={(value) => {
                              if (value) {
                                setAnnotationType(value as AnnotationType);
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectLabel>Annotation type</SelectLabel>
                                {annotationTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="annotation-comment">Comment</FieldLabel>
                          <Textarea
                            id="annotation-comment"
                            value={comment}
                            onChange={(event) => setComment(event.target.value)}
                            placeholder="Agent가 반영해야 할 피드백을 적어주세요."
                            rows={5}
                          />
                        </Field>
                        <Button type="button" onClick={addAnnotation}>
                          <MessageSquarePlus data-icon="inline-start" aria-hidden="true" />
                          Add annotation
                        </Button>
                      </FieldGroup>
                    </CardContent>
                  </Card>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium">Annotations</h2>
                    <Badge variant="outline">{annotations.length}</Badge>
                  </div>

                  {annotations.length === 0 ? (
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <CheckCircle2 aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>No annotations yet</EmptyTitle>
                        <EmptyDescription>
                          Select text in the document to create structured feedback.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    annotations.map((annotation) => (
                      <Card key={annotation.id} size="sm">
                        <CardHeader>
                          <CardTitle className="line-clamp-2 text-sm">{annotation.selectedText}</CardTitle>
                          <CardDescription>{annotation.type}</CardDescription>
                          <CardAction>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => deleteAnnotation(annotation.id)}
                              aria-label="Delete annotation"
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </CardAction>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-2">
                          <Badge className="w-fit" variant="secondary">
                            {annotation.type}
                          </Badge>
                          <p className="text-sm text-muted-foreground">{annotation.comment}</p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="prompt" className="min-h-0 flex-1">
              <div className="flex h-[calc(100vh-8rem)] flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-medium">Agent prompt</h2>
                    <p className="text-sm text-muted-foreground">복사해서 agent session에 전달할 Markdown입니다.</p>
                  </div>
                  <Button type="button" size="sm" onClick={copyExport}>
                    <ClipboardCopy data-icon="inline-start" aria-hidden="true" />
                    Copy
                  </Button>
                </div>
                <Textarea className="min-h-0 flex-1 resize-none font-mono text-xs" readOnly value={exportText} />
              </div>
            </TabsContent>
          </Tabs>
        </aside>
      </section>

      <footer className="border-t bg-card px-4 py-2 text-xs text-muted-foreground">{status}</footer>
    </main>
  );
}
