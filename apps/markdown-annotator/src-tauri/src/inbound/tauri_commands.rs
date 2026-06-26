use crate::{
    application::document_service::DocumentService, domain::document::MarkdownDocument,
    infrastructure::fs_document_reader::FsDocumentReader,
};
use percent_encoding::{NON_ALPHANUMERIC, utf8_percent_encode};
use std::{
    collections::hash_map::DefaultHasher,
    hash::{Hash, Hasher},
    path::{Path, PathBuf},
};
use tauri::{Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

const WINDOW_HIGHLIGHT_EVENT: &str = "markdown-annotator://window-highlight";

#[tauri::command]
pub fn read_markdown_file(path: String) -> Result<MarkdownDocument, String> {
    let service = DocumentService::new(FsDocumentReader);
    service.read_markdown_file(&path)
}

#[tauri::command]
pub fn request_open_document_window(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let document_path = resolve_markdown_file(&path)?;
    let label = label_for_document(&document_path);

    if focus_if_open(&app, &label) {
        return Ok(());
    }

    create_document_window(&app, &label, &document_path).map(|_| ())
}

#[tauri::command]
pub fn request_open_document_tab(
    app: tauri::AppHandle,
    window: WebviewWindow,
    path: String,
) -> Result<(), String> {
    let document_path = resolve_markdown_file(&path)?;
    let label = label_for_document(&document_path);

    if focus_if_open(&app, &label) {
        return Ok(());
    }

    let new_window = create_document_window(&app, &label, &document_path)?;
    attach_window_as_tab(&window, &new_window);
    Ok(())
}

pub fn open_welcome_window(app: &tauri::AppHandle) {
    if app.get_webview_window("main").is_some() {
        return;
    }

    let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Markdown Annotator")
        .inner_size(1280.0, 860.0)
        .min_inner_size(980.0, 680.0);

    #[cfg(target_os = "macos")]
    {
        builder = builder.tabbing_identifier("markdown-annotator");
    }

    match builder.build() {
        Ok(window) => show_native_tab_bar(&window),
        Err(error) => eprintln!("failed to create main window: {error}"),
    }
}

fn create_document_window(
    app: &tauri::AppHandle,
    label: &str,
    path: &Path,
) -> Result<WebviewWindow, String> {
    let encoded_path = utf8_percent_encode(&path.to_string_lossy(), NON_ALPHANUMERIC).to_string();
    let url = format!("index.html?path={encoded_path}");
    let title = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Markdown document");

    let mut builder = WebviewWindowBuilder::new(app, label, WebviewUrl::App(url.into()))
        .title(title)
        .inner_size(1280.0, 860.0)
        .min_inner_size(980.0, 680.0);

    #[cfg(target_os = "macos")]
    {
        builder = builder.tabbing_identifier("markdown-annotator");
    }

    let window = builder
        .build()
        .map_err(|error| format!("failed to create document window: {error}"))?;
    show_native_tab_bar(&window);
    Ok(window)
}

#[cfg(target_os = "macos")]
fn attach_window_as_tab(base_window: &WebviewWindow, new_window: &WebviewWindow) {
    use objc2_app_kit::{NSWindow, NSWindowOrderingMode};

    let Ok(base_ptr) = base_window.ns_window() else {
        return;
    };
    let Ok(new_ptr) = new_window.ns_window() else {
        return;
    };

    let base_ns_window: &NSWindow = unsafe { &*base_ptr.cast::<NSWindow>() };
    let new_ns_window: &NSWindow = unsafe { &*new_ptr.cast::<NSWindow>() };

    if base_ns_window.tabbingIdentifier().to_string() == "markdown-annotator" {
        base_ns_window.addTabbedWindow_ordered(new_ns_window, NSWindowOrderingMode::Above);
    }
}

#[cfg(not(target_os = "macos"))]
fn attach_window_as_tab(_base_window: &WebviewWindow, _new_window: &WebviewWindow) {}

fn focus_if_open(app: &tauri::AppHandle, label: &str) -> bool {
    let Some(window) = app.get_webview_window(label) else {
        return false;
    };

    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
    show_native_tab_bar(&window);
    let _ = window.emit(WINDOW_HIGHLIGHT_EVENT, ());
    true
}

#[cfg(target_os = "macos")]
fn show_native_tab_bar(window: &WebviewWindow) {
    use objc2::MainThreadMarker;
    use objc2_app_kit::NSWindow;

    let window = window.clone();
    let app = window.app_handle().clone();
    let _ = app.run_on_main_thread(move || {
        let Some(_mtm) = MainThreadMarker::new() else {
            return;
        };
        let Ok(ptr) = window.ns_window() else {
            return;
        };
        let ns_window: &NSWindow = unsafe { &*ptr.cast::<NSWindow>() };

        if ns_window
            .tabGroup()
            .map(|tab_group| tab_group.isTabBarVisible())
            .unwrap_or(false)
        {
            return;
        }

        ns_window.toggleTabBar(None);
    });
}

#[cfg(not(target_os = "macos"))]
fn show_native_tab_bar(_window: &WebviewWindow) {}

fn label_for_document(path: &Path) -> String {
    let mut hasher = DefaultHasher::new();
    path.hash(&mut hasher);
    format!("document-{}", hasher.finish())
}

fn resolve_markdown_file(raw_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(raw_path);
    let canonical = path
        .canonicalize()
        .map_err(|error| format!("failed to resolve {raw_path}: {error}"))?;

    if !canonical.is_file() {
        return Err(format!(
            "target must be a markdown file: {}",
            canonical.display()
        ));
    }

    if !is_markdown_file(&canonical) {
        return Err(format!(
            "target must be a markdown file: {}",
            canonical.display()
        ));
    }

    Ok(canonical)
}

fn is_markdown_file(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| {
            matches!(
                extension.to_ascii_lowercase().as_str(),
                "md" | "markdown" | "mdx"
            )
        })
        .unwrap_or(false)
}
