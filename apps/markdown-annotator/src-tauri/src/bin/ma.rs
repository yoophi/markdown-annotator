use markdown_annotator_lib::cli_launcher::{self, CliMode};

fn main() {
    if let Err(error) = cli_launcher::run("ma", CliMode::Release) {
        eprintln!("ma: {error}");
        std::process::exit(1);
    }
}
