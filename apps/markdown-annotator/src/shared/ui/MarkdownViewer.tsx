import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ElementType } from "react";
import { MessageSquare, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MarkdownBlock } from "@/entities/markdown-block/model/types";
import { cn } from "@/lib/utils";

export type MarkdownViewerBlockNote = {
  id: string;
  comment: string;
};

type MarkdownViewerProps = {
  blocks: MarkdownBlock[];
  annotatedBlockIds?: Set<string>;
  deletedBlockIds?: Set<string>;
  noteAnnotationsByBlock?: ReadonlyMap<string, MarkdownViewerBlockNote[]>;
  onRequestBlockComment?: (block: MarkdownBlock) => void;
  onRequestBlockDelete?: (block: MarkdownBlock) => void;
};

function InlineMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children: inlineChildren }) => <>{inlineChildren}</>,
      }}
      remarkPlugins={[remarkGfm]}
    >
      {children}
    </ReactMarkdown>
  );
}

function BlockShell({
  block,
  annotated,
  deleted,
  notes,
  children,
  onRequestBlockComment,
  onRequestBlockDelete,
}: {
  block: MarkdownBlock;
  annotated: boolean;
  deleted: boolean;
  notes: MarkdownViewerBlockNote[];
  children: React.ReactNode;
  onRequestBlockComment?: (block: MarkdownBlock) => void;
  onRequestBlockDelete?: (block: MarkdownBlock) => void;
}) {
  const hasNotes = notes.length > 0;

  const handleToolbarMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleToolbarInteraction = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className={cn(
        "group/markdown-block relative border-r-4 border-transparent bg-transparent pr-12 transition-colors",
        "hover:border-border",
      )}
      data-annotated={annotated || undefined}
      data-block-id={block.id}
      data-block-type={block.type}
      data-start-line={block.startLine}
      data-end-line={block.endLine}
    >
      {hasNotes ? (
        <div
          className="absolute right-2 top-0"
          onMouseDown={handleToolbarMouseDown}
          onMouseUp={handleToolbarInteraction}
          onClick={handleToolbarInteraction}
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label="Show note annotations"
                  className="relative"
                  size="icon-sm"
                  type="button"
                  variant="secondary"
                />
              }
            >
              <StickyNote aria-hidden="true" />
              {notes.length > 1 ? (
                <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[0.625rem] font-medium text-primary-foreground">
                  {notes.length}
                </span>
              ) : null}
            </TooltipTrigger>
            <TooltipContent align="end" className="max-w-sm">
              <div className="flex flex-col gap-2">
                {notes.map((note) => (
                  <p key={note.id}>{note.comment}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : null}

      <div
        className={cn(
          "absolute right-2 top-0 hidden items-center gap-1 rounded-lg border bg-popover p-1 shadow-sm",
          "group-hover/markdown-block:flex group-focus-within/markdown-block:flex",
          hasNotes && "right-11",
        )}
        onMouseDown={handleToolbarMouseDown}
        onMouseUp={handleToolbarInteraction}
        onClick={handleToolbarInteraction}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Delete block"
                aria-pressed={deleted}
                size="icon-sm"
                type="button"
                variant={deleted ? "destructive" : "ghost"}
                onClick={() => onRequestBlockDelete?.(block)}
              />
            }
          >
            <Trash2 aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>{deleted ? "Cancel delete" : "Delete block"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label="Comment on block"
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => onRequestBlockComment?.(block)}
              />
            }
          >
            <MessageSquare aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent>Comment on block</TooltipContent>
        </Tooltip>
      </div>
      <div
        className={cn(
          deleted &&
            "text-destructive line-through decoration-destructive opacity-70 [&_*]:text-destructive",
        )}
        data-block-content
      >
        {children}
      </div>
    </div>
  );
}

function MarkdownBlockRenderer({
  block,
  annotated,
  deleted,
  notes,
  onRequestBlockComment,
  onRequestBlockDelete,
}: {
  block: MarkdownBlock;
  annotated: boolean;
  deleted: boolean;
  notes: MarkdownViewerBlockNote[];
  onRequestBlockComment?: (block: MarkdownBlock) => void;
  onRequestBlockDelete?: (block: MarkdownBlock) => void;
}) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level ?? 1}` as ElementType;
      return (
        <BlockShell
          annotated={annotated}
          block={block}
          deleted={deleted}
          notes={notes}
          onRequestBlockComment={onRequestBlockComment}
          onRequestBlockDelete={onRequestBlockDelete}
        >
          <Tag>
            <InlineMarkdown>{block.content}</InlineMarkdown>
          </Tag>
        </BlockShell>
      );
    }

    case "blockquote":
      return (
        <BlockShell
          annotated={annotated}
          block={block}
          deleted={deleted}
          notes={notes}
          onRequestBlockComment={onRequestBlockComment}
          onRequestBlockDelete={onRequestBlockDelete}
        >
          <blockquote>
            <InlineMarkdown>{block.content}</InlineMarkdown>
          </blockquote>
        </BlockShell>
      );

    case "list-item":
      return (
        <BlockShell
          annotated={annotated}
          block={block}
          deleted={deleted}
          notes={notes}
          onRequestBlockComment={onRequestBlockComment}
          onRequestBlockDelete={onRequestBlockDelete}
        >
          <div
            className="flex items-start gap-3"
            style={{ marginLeft: `${(block.level ?? 0) * 1.25}rem` }}
          >
            <span className="mt-0.5 text-muted-foreground">
              {block.ordered ? `${block.orderedStart ?? 1}.` : "-"}
            </span>
            <div className={cn(block.checked && "text-muted-foreground line-through")}>
              <InlineMarkdown>{block.content}</InlineMarkdown>
            </div>
          </div>
        </BlockShell>
      );

    case "code":
      return (
        <BlockShell
          annotated={annotated}
          block={block}
          deleted={deleted}
          notes={notes}
          onRequestBlockComment={onRequestBlockComment}
          onRequestBlockDelete={onRequestBlockDelete}
        >
          <pre>
            <code>{block.content}</code>
          </pre>
        </BlockShell>
      );

    case "table":
      return (
        <BlockShell
          annotated={annotated}
          block={block}
          deleted={deleted}
          notes={notes}
          onRequestBlockComment={onRequestBlockComment}
          onRequestBlockDelete={onRequestBlockDelete}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
        </BlockShell>
      );

    case "hr":
      return (
        <BlockShell
          annotated={annotated}
          block={block}
          deleted={deleted}
          notes={notes}
          onRequestBlockComment={onRequestBlockComment}
          onRequestBlockDelete={onRequestBlockDelete}
        >
          <hr />
        </BlockShell>
      );

    case "paragraph":
    default:
      return (
        <BlockShell
          annotated={annotated}
          block={block}
          deleted={deleted}
          notes={notes}
          onRequestBlockComment={onRequestBlockComment}
          onRequestBlockDelete={onRequestBlockDelete}
        >
          <p>
            <InlineMarkdown>{block.content}</InlineMarkdown>
          </p>
        </BlockShell>
      );
  }
}

export function MarkdownViewer({
  blocks,
  annotatedBlockIds = new Set(),
  deletedBlockIds = new Set(),
  noteAnnotationsByBlock = new Map(),
  onRequestBlockComment,
  onRequestBlockDelete,
}: MarkdownViewerProps) {
  return (
    <article className="markdown-viewer flex max-w-none flex-col gap-0">
      {blocks.map((block) => (
        <MarkdownBlockRenderer
          annotated={annotatedBlockIds.has(block.id)}
          block={block}
          deleted={deletedBlockIds.has(block.id)}
          key={block.id}
          notes={noteAnnotationsByBlock.get(block.id) ?? []}
          onRequestBlockComment={onRequestBlockComment}
          onRequestBlockDelete={onRequestBlockDelete}
        />
      ))}
    </article>
  );
}
