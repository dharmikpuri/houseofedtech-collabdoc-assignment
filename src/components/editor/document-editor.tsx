"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";

import { EditorToolbar } from "./editor-toolbar";
import { LocalSaveIndicator } from "./local-save-indicator";

/**
 * The local-first editor.
 *
 * Content lives in a Yjs document (a CRDT), NOT in React state or the database.
 * `y-indexeddb` mirrors that Yjs doc into the browser's IndexedDB, so:
 *   - editing never touches the network (offline-first),
 *   - reloading — even with no connection — restores the content, and
 *   - the same Yjs doc is what the sync engine will later replicate to the
 *     server, which is what makes conflict-free merging possible.
 *
 * There is intentionally no server round-trip here. Real-time sync is a later
 * phase; this component is the offline foundation it builds on.
 */
export function DocumentEditor({
  documentId,
  editable,
}: {
  documentId: string;
  editable: boolean;
}) {
  // One Yjs doc per mount. Y.Doc is plain JS, so constructing it during SSR is safe.
  const [ydoc] = useState(() => new Y.Doc());
  const [synced, setSynced] = useState(false);

  // IndexedDB access is browser-only, so it happens in an effect (never on the server).
  useEffect(() => {
    const persistence = new IndexeddbPersistence(`collabdoc:${documentId}`, ydoc);
    const handleSynced = () => setSynced(true);
    persistence.on("synced", handleSynced);

    return () => {
      persistence.off("synced", handleSynced);
      void persistence.destroy();
      ydoc.destroy();
    };
  }, [documentId, ydoc]);

  const editor = useEditor({
    editable,
    // Required for SSR: render on the client to avoid hydration mismatches.
    immediatelyRender: false,
    extensions: [
      // Collaboration owns undo/redo (via Yjs), so disable StarterKit's own.
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc }),
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    editorProps: {
      attributes: {
        class: "prose dark:prose-invert min-h-[300px] max-w-none py-4 focus:outline-none",
      },
    },
  });

  return (
    <div className="border-border rounded-lg border p-4">
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
      <div className="mt-2 flex justify-end">
        <LocalSaveIndicator synced={synced} />
      </div>
    </div>
  );
}
