mod application;
mod domain;
mod inbound;
mod infrastructure;

use inbound::tauri_commands::read_markdown_file;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![read_markdown_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
