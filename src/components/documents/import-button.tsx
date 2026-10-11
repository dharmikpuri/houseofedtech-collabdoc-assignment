"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { firstHeading, parseMarkdown } from "@/lib/markdown/parse";
import { importStorageKey, PENDING_IMPORT_KEY } from "@/lib/import/storage";
import { documentPath } from "@/config/routes";

const MAX_BYTES = 1_000_000;
const ACCEPTED = /\.(md|markdown|txt)$/i;

/**
 * Imports a Markdown (or plain text) file as a new document.
 *
 * Parsing happens in the browser; the file is never uploaded. The server only
 * creates an empty document, and the parsed content is handed to its editor,
 * which inserts it into the CRDT like any other edit — so it syncs, merges and
 * versions normally.
 */
export function ImportButton() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!ACCEPTED.test(file.name)) {
      toast.error("Choose a Markdown (.md) or text (.txt) file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("That file is larger than 1 MB. Split it into smaller documents.");
      return;
    }
    if (!navigator.onLine) {
      toast.error("Importing creates a new document on the server, so it needs a connection.");
      return;
    }

    setBusy(true);
    try {
      const text = await file.text();
      const doc = parseMarkdown(text);
      const title =
        firstHeading(text) ?? (file.name.replace(/\.[^.]+$/, "").trim() || "Imported document");

      // The first H1 usually *is* the title; don't repeat it in the body.
      const [first, ...rest] = doc.content ?? [];
      if (
        first?.type === "heading" &&
        first.attrs?.level === 1 &&
        (first.content ?? [])
          .map((node) => node.text ?? "")
          .join("")
          .trim() === title
      ) {
        doc.content = rest.length ? rest : [{ type: "paragraph" }];
      }

      const serialized = JSON.stringify(doc);
      // Reserve storage *before* creating the document, so a full storage
      // quota fails cleanly instead of leaving an empty document behind.
      try {
        sessionStorage.setItem(PENDING_IMPORT_KEY, serialized);
      } catch {
        toast.error("This file is too large to import in this browser session.");
        return;
      }

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.slice(0, 200), source: "import" }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        sessionStorage.removeItem(PENDING_IMPORT_KEY);
        toast.error(data.error ?? "Could not create the document.");
        return;
      }

      sessionStorage.setItem(importStorageKey(data.id), serialized);
      sessionStorage.removeItem(PENDING_IMPORT_KEY);
      router.push(documentPath(data.id));
    } catch {
      toast.error("Couldn't read that file.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".md,.markdown,.txt,text/markdown,text/plain"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button variant="secondary" onClick={() => input.current?.click()} loading={busy}>
        {!busy && <Upload />}
        Import
      </Button>
    </>
  );
}
