import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

type MarkdownViewerProps = {
  markdown: string;
  annotatedNodeIds?: Set<string>;
};

const textFromChildren = (children: unknown): string => {
  if (typeof children === "string") {
    return children;
  }

  if (Array.isArray(children)) {
    return children.map(textFromChildren).join("");
  }

  if (children && typeof children === "object" && "props" in children) {
    return textFromChildren((children as { props?: { children?: unknown } }).props?.children);
  }

  return "";
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

const nodeIdFor = (kind: string, index: number, children: unknown) => {
  const slug = slugify(textFromChildren(children));
  return slug ? `${kind}-${index}-${slug}` : `${kind}-${index}`;
};

export function MarkdownViewer({ markdown, annotatedNodeIds = new Set() }: MarkdownViewerProps) {
  const counters = new Map<string, number>();

  const nextIndex = (kind: string) => {
    const index = counters.get(kind) ?? 0;
    counters.set(kind, index + 1);
    return index;
  };

  const nodeProps = (kind: string, children: unknown) => {
    const nodeId = nodeIdFor(kind, nextIndex(kind), children);
    return {
      "data-node-id": nodeId,
      className: cn(
        "rounded-[6px] transition-shadow",
        annotatedNodeIds.has(nodeId) && "ring-2 ring-primary/35 ring-offset-2 ring-offset-background",
      ),
    };
  };

  const components: Components = {
    h1: ({ children, ...props }) => (
      <h1 {...props} {...nodeProps("h1", children)}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 {...props} {...nodeProps("h2", children)}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 {...props} {...nodeProps("h3", children)}>
        {children}
      </h3>
    ),
    p: ({ children, ...props }) => (
      <p {...props} {...nodeProps("p", children)}>
        {children}
      </p>
    ),
    li: ({ children, ...props }) => (
      <li {...props} {...nodeProps("li", children)}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...props }) => (
      <blockquote {...props} {...nodeProps("quote", children)}>
        {children}
      </blockquote>
    ),
    pre: ({ children, ...props }) => (
      <pre {...props} {...nodeProps("code", children)}>
        {children}
      </pre>
    ),
    table: ({ children, ...props }) => (
      <table {...props} {...nodeProps("table", children)}>
        {children}
      </table>
    ),
  };

  return (
    <article className="markdown-viewer max-w-none">
      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
