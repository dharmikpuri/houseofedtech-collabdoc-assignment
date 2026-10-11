"use client";

import type { Editor } from "@tiptap/react";

import { toMarkdown } from "@/lib/markdown/serialize";

/**
 * Client-side export. Everything is generated from the local document, so
 * export works offline and never uploads content anywhere.
 */

/** A filename that is valid on every major OS. */
function safeFilename(title: string, extension: string): string {
  const base =
    title
      .normalize("NFKD")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "Untitled";
  return `${base}.${extension}`;
}

function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!,
  );

export function exportMarkdown(editor: Editor, title: string) {
  const body = toMarkdown(editor.getJSON());
  download(safeFilename(title, "md"), "text/markdown", `# ${title}\n\n${body}`);
}

export function exportText(editor: Editor, title: string) {
  download(
    safeFilename(title, "txt"),
    "text/plain",
    `${title}\n\n${editor.getText({ blockSeparator: "\n\n" })}\n`,
  );
}

export function exportHtml(editor: Editor, title: string) {
  // The editor's HTML is produced from its own schema, so it contains only the
  // node and mark types the editor defines. Comment anchors are stripped: they
  // reference private threads that mean nothing outside the app.
  const body = editor
    .getHTML()
    .replace(/<span[^>]*data-thread-id="[^"]*"[^>]*>(.*?)<\/span>/g, "$1");
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { font: 16px/1.65 system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 46rem; margin: 3rem auto; padding: 0 1.25rem; color: #18181b; }
  h1, h2, h3 { line-height: 1.25; }
  pre { background: #f4f4f5; padding: .85rem 1rem; border-radius: 6px; overflow-x: auto; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9em; }
  blockquote { border-left: 3px solid #d4d4d8; margin-left: 0; padding-left: 1rem; color: #52525b; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #d4d4d8; padding: .4rem .6rem; text-align: left; vertical-align: top; }
  mark { background: #fef08a; }
  ul[data-type="taskList"] { list-style: none; padding-left: .25rem; }
  ul[data-type="taskList"] li { display: flex; gap: .5rem; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${body}
</body>
</html>
`;
  download(safeFilename(title, "html"), "text/html", html);
}

/**
 * "Save as PDF" goes through the browser's print dialog, with a print
 * stylesheet that hides the app chrome. That produces selectable, searchable
 * text — better than a rasterised PDF — with no extra dependency.
 */
export function printDocument() {
  window.print();
}
