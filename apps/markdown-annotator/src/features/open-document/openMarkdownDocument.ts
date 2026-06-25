import { open } from "@tauri-apps/plugin-dialog";
import { readMarkdownDocument } from "@/entities/document/api/documentApi";
import type { MarkdownDocument } from "@/entities/document/model/types";

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

function openMarkdownDocumentFromBrowser(): Promise<MarkdownDocument | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.mdx,text/markdown,text/plain";
    input.style.display = "none";

    input.addEventListener(
      "change",
      async () => {
        const file = input.files?.[0];
        input.remove();

        if (!file) {
          resolve(null);
          return;
        }

        resolve({
          fileName: file.name,
          absolutePath: file.name,
          markdownText: await file.text(),
        });
      },
      { once: true },
    );

    input.addEventListener(
      "cancel",
      () => {
        input.remove();
        resolve(null);
      },
      { once: true },
    );

    document.body.append(input);
    input.click();
  });
}

export async function openMarkdownDocument(): Promise<MarkdownDocument | null> {
  if (!isTauriRuntime()) {
    return openMarkdownDocumentFromBrowser();
  }

  const selected = await open({
    multiple: false,
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "mdx"] }],
  });

  if (typeof selected !== "string") {
    return null;
  }

  return readMarkdownDocument(selected);
}
