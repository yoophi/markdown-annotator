use std::{
    env,
    net::TcpStream,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::{Duration, Instant},
};

pub enum CliMode {
    Dev,
    Release,
}

pub fn run(command_name: &str, mode: CliMode) -> Result<(), String> {
    let Some(raw_target) = parse_target_arg(command_name)? else {
        println!("usage: {command_name} <markdown-file>");
        return Ok(());
    };

    let cwd = env::current_dir().map_err(|error| format!("failed to read cwd: {error}"))?;
    let target = resolve_markdown_file(&raw_target, &cwd)?;
    let app = match mode {
        CliMode::Dev => find_dev_app()?,
        CliMode::Release => find_release_app()?,
    };

    debug_log(command_name, format!("launch target: {}", target.display()));
    debug_log(command_name, format!("app executable: {}", app.display()));

    if matches!(mode, CliMode::Dev) {
        ensure_dev_server(command_name)?;
    }

    launch_app(command_name, &app, &target)
}

fn parse_target_arg(command_name: &str) -> Result<Option<String>, String> {
    let mut args = env::args().skip(1);
    let Some(target) = args.next() else {
        return Err(format!("usage: {command_name} <markdown-file>"));
    };

    if matches!(target.as_str(), "-h" | "--help") {
        return Ok(None);
    }

    if args.next().is_some() {
        return Err(format!("usage: {command_name} <markdown-file>"));
    }

    Ok(Some(target))
}

fn resolve_markdown_file(raw_target: &str, cwd: &Path) -> Result<PathBuf, String> {
    let path = PathBuf::from(raw_target);
    let candidate = if path.is_absolute() {
        path
    } else {
        cwd.join(path)
    };

    let canonical = candidate
        .canonicalize()
        .map_err(|error| format!("failed to resolve {}: {error}", candidate.display()))?;

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

fn find_release_app() -> Result<PathBuf, String> {
    if let Some(path) = env::var_os("MARKDOWN_ANNOTATOR_APP_PATH").map(PathBuf::from) {
        if path.is_file() {
            return Ok(path);
        }

        return Err(format!(
            "MARKDOWN_ANNOTATOR_APP_PATH does not point to an executable file: {}",
            path.display()
        ));
    }

    let current_exe =
        env::current_exe().map_err(|error| format!("failed to locate ma executable: {error}"))?;
    let exe_dir = current_exe
        .parent()
        .ok_or_else(|| "failed to locate ma executable directory".to_string())?;

    for candidate in release_sibling_app_candidates(exe_dir) {
        if candidate.is_file() {
            return Ok(candidate);
        }
    }

    for candidate in installed_app_candidates() {
        if candidate.is_file() {
            return Ok(candidate);
        }
    }

    Err("failed to locate Markdown Annotator app. Set MARKDOWN_ANNOTATOR_APP_PATH to the installed app executable".to_string())
}

fn find_dev_app() -> Result<PathBuf, String> {
    if let Some(path) = env::var_os("MARKDOWN_ANNOTATOR_APP_PATH").map(PathBuf::from) {
        if path.is_file() {
            return Ok(path);
        }

        return Err(format!(
            "MARKDOWN_ANNOTATOR_APP_PATH does not point to an executable file: {}",
            path.display()
        ));
    }

    let current_exe = env::current_exe()
        .map_err(|error| format!("failed to locate ma-dev executable: {error}"))?;
    let exe_dir = current_exe
        .parent()
        .ok_or_else(|| "failed to locate ma-dev executable directory".to_string())?;
    let candidate = exe_dir.join(app_executable_name());

    ensure_dev_app_built(&current_exe)?;

    if !candidate.is_file() {
        return Err(format!(
            "failed to locate development app executable: {}",
            candidate.display()
        ));
    }

    Ok(candidate)
}

#[cfg(unix)]
fn launch_app(command_name: &str, app: &Path, target: &Path) -> Result<(), String> {
    let app_dir = app.parent().ok_or_else(|| {
        format!(
            "failed to locate app executable directory: {}",
            app.display()
        )
    })?;
    let app_name = app
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| format!("failed to read app executable name: {}", app.display()))?;

    Command::new("nohup")
        .arg(format!("./{app_name}"))
        .arg(target)
        .current_dir(app_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| format!("failed to launch {}: {error}", app.display()))?;

    debug_log(command_name, "spawned app through nohup");
    Ok(())
}

#[cfg(not(unix))]
fn launch_app(_command_name: &str, app: &Path, target: &Path) -> Result<(), String> {
    Command::new(app)
        .arg(target)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|error| format!("failed to launch {}: {error}", app.display()))?;

    Ok(())
}

fn ensure_dev_server(command_name: &str) -> Result<(), String> {
    if dev_server_is_running() {
        debug_log(command_name, "Vite dev server is already running");
        return Ok(());
    }

    let Some(app_dir) = local_app_dir_from_dev_exe()? else {
        return Err("failed to infer app package directory from ma-dev executable".to_string());
    };

    debug_log(
        command_name,
        format!("starting Vite dev server in {}", app_dir.display()),
    );
    Command::new("pnpm")
        .arg("run")
        .arg("dev")
        .current_dir(&app_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| {
            format!(
                "failed to start Vite dev server in {}: {error}",
                app_dir.display()
            )
        })?;

    wait_for_dev_server()
}

fn local_app_dir_from_dev_exe() -> Result<Option<PathBuf>, String> {
    let current_exe = env::current_exe()
        .map_err(|error| format!("failed to locate ma-dev executable: {error}"))?;

    let Some(src_tauri_dir) = current_exe
        .ancestors()
        .find(|candidate| candidate.join("tauri.conf.json").is_file())
    else {
        return Ok(None);
    };

    Ok(src_tauri_dir.parent().map(Path::to_path_buf))
}

fn ensure_dev_app_built(ma_dev_exe: &Path) -> Result<(), String> {
    let Some(src_tauri_dir) = ma_dev_exe
        .ancestors()
        .find(|candidate| candidate.join("tauri.conf.json").is_file())
    else {
        return Err("failed to infer src-tauri directory from ma-dev executable".to_string());
    };

    let status = Command::new("cargo")
        .arg("build")
        .arg("--bin")
        .arg("markdown-annotator")
        .current_dir(src_tauri_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::inherit())
        .status()
        .map_err(|error| {
            format!(
                "failed to build development app in {}: {error}",
                src_tauri_dir.display()
            )
        })?;

    if !status.success() {
        return Err(format!(
            "failed to build development app in {}: {status}",
            src_tauri_dir.display()
        ));
    }

    Ok(())
}

fn wait_for_dev_server() -> Result<(), String> {
    let deadline = Instant::now() + Duration::from_secs(15);

    while Instant::now() < deadline {
        if dev_server_is_running() {
            return Ok(());
        }

        thread::sleep(Duration::from_millis(150));
    }

    Err("Vite dev server did not start on localhost:1420 within 15 seconds".to_string())
}

fn dev_server_is_running() -> bool {
    TcpStream::connect(("127.0.0.1", 1420)).is_ok()
        || TcpStream::connect(("::1", 1420)).is_ok()
        || TcpStream::connect("localhost:1420").is_ok()
}

fn debug_log(command_name: &str, message: impl AsRef<str>) {
    if env::var_os("MA_VERBOSE").is_some() {
        eprintln!("{command_name}: {}", message.as_ref());
    }
}

fn release_sibling_app_candidates(exe_dir: &Path) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    #[cfg(target_os = "macos")]
    {
        candidates.push(exe_dir.join("../MacOS/markdown-annotator"));
    }

    #[cfg(not(target_os = "macos"))]
    {
        candidates.push(exe_dir.join(app_executable_name()));
    }

    candidates
}

fn installed_app_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    #[cfg(target_os = "macos")]
    {
        candidates.push(PathBuf::from(
            "/Applications/Markdown Annotator.app/Contents/MacOS/markdown-annotator",
        ));
        candidates.push(PathBuf::from(
            "/Applications/markdown-annotator.app/Contents/MacOS/markdown-annotator",
        ));
    }

    candidates
}

fn app_executable_name() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "markdown-annotator.exe"
    }

    #[cfg(not(target_os = "windows"))]
    {
        "markdown-annotator"
    }
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
