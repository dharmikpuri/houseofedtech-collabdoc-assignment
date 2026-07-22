"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";

import { EditorToolbar } from "./editor-toolbar";
import { ConnectionStatus, type WsStatus } from "./connection-status";

const WS_URL = process.env.NEXT_PUBLIC_COLLAB_WS_URL;

export function DocumentEditor({
  documentId,
  editable,
}: {
  documentId: string;
  editable: boolean;
}) {
  const [ydoc] = useState(() => new Y.Doc());
  const [status, setStatus] = useState<WsStatus>("connecting");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const persistence = new IndexeddbPersistence(`collabdoc:${documentId}`, ydoc);

    let provider: HocuspocusProvider | undefined;
    if (WS_URL) {
      provider = new HocuspocusProvider({
        url: WS_URL,
        name: documentId,
        document: ydoc,
        onStatus: ({ status }) => setStatus(status as WsStatus),
        onSynced: () => setSynced(true),
        onDisconnect: () => setSynced(false),
      });
    }

    return () => {
      provider?.destroy();
      void persistence.destroy();
      ydoc.destroy();
    };
  }, [documentId, ydoc]);

  const editor = useEditor({
    editable,
    immediatelyRender: false,
    extensions: [
      // Yjs owns undo/redo, so StarterKit's own history is disabled.
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
        <ConnectionStatus enabled={Boolean(WS_URL)} status={status} synced={synced} />
      </div>
    </div>
  );
}
