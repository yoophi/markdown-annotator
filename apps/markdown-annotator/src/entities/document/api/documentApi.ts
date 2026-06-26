import { invoke } from "@tauri-apps/api/core";
import type { MarkdownDocument } from "@/entities/document/model/types";

export function readMarkdownDocument(path: string): Promise<MarkdownDocument> {
  return invoke<MarkdownDocument>("read_markdown_file", { path });
}

export function requestOpenDocumentWindow(path: string): Promise<void> {
  return invoke<void>("request_open_document_window", { path });
}

export function requestOpenDocumentTab(path: string): Promise<void> {
  return invoke<void>("request_open_document_tab", { path });
}
