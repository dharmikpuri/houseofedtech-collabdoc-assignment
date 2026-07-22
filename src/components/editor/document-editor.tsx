"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";

import { EditorToolbar } from "./editor-toolbar";
import { ConnectionStatus, type WsStatus } from "./connection-status";

const WS_URL = process.env.NEXT_PUBLIC_COLLAB_WS_URL;

function colorFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360} 70% 45%)`;
}

export function DocumentEditor({
  documentId,
  editable,
  user,
}: {
  documentId: string;
  editable: boolean;
  user: { id: string; name: string };
}) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<WsStatus>("connecting");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const persistence = new IndexeddbPersistence(`collabdoc:${documentId}`, ydoc);

    let created: HocuspocusProvider | undefined;
    if (WS_URL) {
      created = new HocuspocusProvider({
        url: WS_URL,
        name: documentId,
        document: ydoc,
        token: async () => {
          const res = await fetch("/api/collab-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId }),
          });
          if (!res.ok) throw new Error("Could not authorize collaboration");
          const data = (await res.json()) as { token: string };
          return data.token;
        },
        onStatus: ({ status }) => setStatus(status as WsStatus),
        onSynced: () => setSynced(true),
        onDisconnect: () => setSynced(false),
      });
      // The provider is created/destroyed per mount (StrictMode-safe); the editor
      // re-inits with the presence-cursor extension once it exists.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProvider(created);
    }

    return () => {
      created?.destroy();
      setProvider(null);
      void persistence.destroy();
      ydoc.destroy();
    };
  }, [documentId, ydoc]);

  const editor = useEditor(
    {
      editable,
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: ydoc }),
        ...(provider
          ? [
              CollaborationCaret.configure({
                provider,
                user: { name: user.name, color: colorFromId(user.id) },
              }),
            ]
          : []),
        Placeholder.configure({ placeholder: "Start writing…" }),
      ],
      editorProps: {
        attributes: {
          class: "prose dark:prose-invert min-h-[300px] max-w-none py-4 focus:outline-none",
        },
      },
    },
    [provider, editable],
  );

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
