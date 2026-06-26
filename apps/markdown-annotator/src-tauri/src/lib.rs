mod application;
mod domain;
mod inbound;
mod infrastructure;

use inbound::tauri_commands::{
    open_welcome_window, read_markdown_file, request_open_document_tab,
    request_open_document_window,
};
use tauri::{Manager, RunEvent};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_markdown_file,
            request_open_document_tab,
            request_open_document_window
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let RunEvent::Ready = event {
                if app.webview_windows().is_empty() {
                    open_welcome_window(app);
                }
            }
        });
}
