import { invoke } from "@tauri-apps/api/core";
import type { MarkdownDocument } from "@/entities/document/model/types";

export function readMarkdownDocument(path: string): Promise<MarkdownDocument> {
  return invoke<MarkdownDocument>("read_markdown_file", { path });
}
