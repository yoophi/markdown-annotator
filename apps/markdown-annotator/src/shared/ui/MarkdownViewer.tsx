import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ElementType } from "react";
import type { MarkdownBlock } from "@/entities/markdown-block/model/types";
import { cn } from "@/lib/utils";

type MarkdownViewerProps = {
  blocks: MarkdownBlock[];
  annotatedBlockIds?: Set<string>;
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
  children,
}: {
  block: MarkdownBlock;
  annotated: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group/markdown-block relative rounded-lg border border-transparent p-2 transition-colors",
        "hover:border-border hover:bg-muted/30",
        annotated && "border-primary/40 bg-primary/5 ring-2 ring-primary/20",
      )}
      data-block-id={block.id}
      data-block-type={block.type}
      data-start-line={block.startLine}
      data-end-line={block.endLine}
    >
      <div data-block-content>{children}</div>
    </div>
  );
}

function MarkdownBlockRenderer({
  block,
  annotated,
}: {
  block: MarkdownBlock;
  annotated: boolean;
}) {
  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level ?? 1}` as ElementType;
      return (
        <BlockShell block={block} annotated={annotated}>
          <Tag>
            <InlineMarkdown>{block.content}</InlineMarkdown>
          </Tag>
        </BlockShell>
      );
    }

    case "blockquote":
      return (
        <BlockShell block={block} annotated={annotated}>
          <blockquote>
            <InlineMarkdown>{block.content}</InlineMarkdown>
          </blockquote>
        </BlockShell>
      );

    case "list-item":
      return (
        <BlockShell block={block} annotated={annotated}>
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
        <BlockShell block={block} annotated={annotated}>
          <pre>
            <code>{block.content}</code>
          </pre>
        </BlockShell>
      );

    case "table":
      return (
        <BlockShell block={block} annotated={annotated}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
        </BlockShell>
      );

    case "hr":
      return (
        <BlockShell block={block} annotated={annotated}>
          <hr />
        </BlockShell>
      );

    case "paragraph":
    default:
      return (
        <BlockShell block={block} annotated={annotated}>
          <p>
            <InlineMarkdown>{block.content}</InlineMarkdown>
          </p>
        </BlockShell>
      );
  }
}

export function MarkdownViewer({ blocks, annotatedBlockIds = new Set() }: MarkdownViewerProps) {
  return (
    <article className="markdown-viewer flex max-w-none flex-col gap-2">
      {blocks.map((block) => (
        <MarkdownBlockRenderer
          annotated={annotatedBlockIds.has(block.id)}
          block={block}
          key={block.id}
        />
      ))}
    </article>
  );
}
