use crate::{
    application::document_service::DocumentService,
    domain::document::MarkdownDocument,
    infrastructure::fs_document_reader::FsDocumentReader,
};

#[tauri::command]
pub fn read_markdown_file(path: String) -> Result<MarkdownDocument, String> {
    let service = DocumentService::new(FsDocumentReader);
    service.read_markdown_file(&path)
}
