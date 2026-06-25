import { open } from "@tauri-apps/plugin-dialog";
import { readMarkdownDocument } from "@/entities/document/api/documentApi";
import type { MarkdownDocument } from "@/entities/document/model/types";

export async function openMarkdownDocument(): Promise<MarkdownDocument | null> {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdx"] }],
  });

  if (typeof selected !== "string") {
    return null;
  }

  return readMarkdownDocument(selected);
}
