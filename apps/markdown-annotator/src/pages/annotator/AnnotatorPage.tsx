import { Copy, FileText, FolderOpen } from "lucide-react";
import { useMemo, useState } from "react";
import type { AnnotationDraft } from "@/entities/annotation/model/types";
import { sampleMarkdown } from "@/entities/document/model/sampleDocument";
import type { MarkdownDocument } from "@/entities/document/model/types";
import { formatAnnotationsForAgent } from "@/features/export-annotations/formatAnnotationsForAgent";
import { openMarkdownDocument } from "@/features/open-document/openMarkdownDocument";
import { MarkdownViewer } from "@/shared/ui/MarkdownViewer";

export function AnnotatorPage() {
  const [document, setDocument] = useState<MarkdownDocument | null>(null);
  const [selection, setSelection] = useState("");
  const [comment, setComment] = useState("");
  const [annotations, setAnnotations] = useState<AnnotationDraft[]>([]);
  const [status, setStatus] = useState("Markdown 파일을 열거나 샘플 문서에서 텍스트를 선택하세요.");

  const markdown = document?.markdownText ?? sampleMarkdown;
  const title = document?.fileName ?? "Sample document";
  const exportText = useMemo(
    () => formatAnnotationsForAgent(document?.fileName ?? "sample.md", annotations),
    [annotations, document?.fileName],
  );

  async function handleOpenFile() {
    try {
      const opened = await openMarkdownDocument();
      if (!opened) {
        return;
      }

      setDocument(opened);
      setAnnotations([]);
      setStatus(`${opened.fileName} 파일을 열었습니다.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "파일을 열 수 없습니다.");
    }
  }

  function captureSelection() {
    const selectedText = window.getSelection()?.toString().trim() ?? "";
    if (selectedText.length > 0) {
      setSelection(selectedText);
      setStatus("선택한 텍스트에 annotation을 추가할 수 있습니다.");
    }
  }

  function addAnnotation() {
    if (!selection || !comment.trim()) {
      setStatus("텍스트를 선택하고 comment를 입력하세요.");
      return;
    }

    setAnnotations((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        selectedText: selection,
        comment: comment.trim(),
        type: "note",
      },
    ]);
    setComment("");
    setSelection("");
    setStatus("Annotation을 추가했습니다.");
  }

  async function copyExport() {
    await navigator.clipboard.writeText(exportText);
    setStatus("Agent용 Markdown 출력을 클립보드에 복사했습니다.");
  }

  return (
    <main className="app-shell">
      <header className="toolbar">
        <div className="brand">
          <FileText size={20} aria-hidden="true" />
          <div>
            <h1>Markdown Annotator</h1>
            <p>{title}</p>
          </div>
        </div>
        <div className="toolbar-actions">
          <button type="button" onClick={handleOpenFile}>
            <FolderOpen size={16} aria-hidden="true" />
            Open
          </button>
          <button type="button" onClick={copyExport}>
            <Copy size={16} aria-hidden="true" />
            Export for Agent
          </button>
        </div>
      </header>

      <section className="workspace">
        <div className="document-pane" onMouseUp={captureSelection}>
          <MarkdownViewer markdown={markdown} />
        </div>

        <aside className="sidebar">
          <section className="panel">
            <h2>Selection</h2>
            <p className="selected-text">{selection || "문서에서 텍스트를 드래그해 선택하세요."}</p>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Comment"
              rows={5}
            />
            <button type="button" onClick={addAnnotation}>
              Add annotation
            </button>
          </section>

          <section className="panel annotations">
            <h2>Annotations</h2>
            {annotations.length === 0 ? (
              <p className="empty">아직 annotation이 없습니다.</p>
            ) : (
              annotations.map((annotation) => (
                <div className="annotation-item" key={annotation.id}>
                  <strong>{annotation.selectedText}</strong>
                  <p>{annotation.comment}</p>
                </div>
              ))
            )}
          </section>
        </aside>
      </section>

      <footer className="status-bar">{status}</footer>
    </main>
  );
}
