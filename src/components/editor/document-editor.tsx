"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import {
  Activity,
  History,
  ListTree,
  MessageSquare,
  PanelRightClose,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "react-toastify";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarStack, avatarColor } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { SyncDetails } from "@/components/sync/sync-details";
import { useOutbox } from "@/lib/outbox/use-outbox";
import { createMutationId } from "@/lib/outbox/outbox";
import { deriveSyncState, type WsStatus } from "@/lib/sync/status";
import { useNetworkStatus } from "@/lib/sync/use-network-status";
import { onCommand, type PanelTab } from "@/lib/commands/bus";
import { importStorageKey } from "@/lib/import/storage";
import {
  exportHtml,
  exportMarkdown,
  exportText,
  printDocument,
} from "@/lib/export/document-export";

import { EditorToolbar } from "./editor-toolbar";
import { AiBubbleMenu } from "./ai-bubble-menu";
import { AiPanel } from "./ai-panel";
import { VersionsPanel, type VersionSummary } from "./versions-panel";
import { OutlinePanel } from "./outline-panel";
import { ActivityPanel } from "./activity-panel";
import { ExportMenu } from "./export-menu";
import { SlashMenu } from "./slash-menu";
import { CommentsPanel, type CommentDraft } from "./comments/comments-panel";
import { CommentHighlights } from "./comments/comment-highlights";
import { useCommentThreads } from "./comments/use-comment-threads";
import {
  addCommentAnchor,
  CommentMark,
  removeCommentAnchor,
  threadIdsAt,
} from "./extensions/comment-mark";
import { SlashCommand } from "./extensions/slash-command";
import { AiAutocomplete } from "./extensions/ai-autocomplete";
import { useAiAutocomplete, useHasSuggestion } from "./use-ai-autocomplete";
import { useLocalFlag } from "@/lib/hooks/use-local-flag";
import { useEditorSnapshot } from "./use-editor-snapshot";

const WS_URL = process.env.NEXT_PUBLIC_COLLAB_WS_URL;

/** Re-index for search this long after the last edit (cheap: hash-skipped server-side). */
const INDEX_DEBOUNCE_MS = 45_000;

/** Above roughly this much text, whole-document features start hitting their 1 MB caps. */
const LARGE_DOCUMENT_POSITIONS = 350_000;

const PANELS: { id: PanelTab; label: string; icon: LucideIcon }[] = [
  { id: "versions", label: "Version history", icon: History },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "outline", label: "Outline", icon: ListTree },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "ai", label: "AI assistant", icon: Sparkles },
];

type Collaborator = { id: string; name: string };

export function DocumentEditor({
  documentId,
  title,
  editable,
  isOwner,
  user,
  initialVersions,
  aiEnabled,
  initialThreadId,
}: {
  documentId: string;
  title: string;
  editable: boolean;
  isOwner: boolean;
  user: { id: string; name: string };
  initialVersions: VersionSummary[];
  aiEnabled: boolean;
  /** Opens the comments panel on this thread (deep link from a notification). */
  initialThreadId?: string;
}) {
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<WsStatus>("connecting");
  const [synced, setSynced] = useState(false);
  const [peers, setPeers] = useState<Collaborator[]>([]);
  const [panel, setPanel] = useState<PanelTab | null>(initialThreadId ? "comments" : null);
  const [localReady, setLocalReady] = useState(false);
  // Local updates the server has not yet acknowledged. Offline edits accumulate
  // here and drain on reconnect, which is what the pending indicator shows.
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId ?? null);
  const [commentDraft, setCommentDraft] = useState<CommentDraft | null>(null);
  const [sizeLimited, setSizeLimited] = useState(false);

  const { online } = useNetworkStatus();
  const comments = useCommentThreads(documentId);

  useEffect(() => {
    const persistence = new IndexeddbPersistence(`collabdoc:${documentId}`, ydoc);
    // Local content is available before (and without) any network round-trip —
    // this is what makes the editor usable offline and instantly on load.
    persistence.on("synced", () => setLocalReady(true));

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
        onSynced: () => {
          setSynced(true);
          setLastSyncedAt(new Date());
        },
        onDisconnect: () => setSynced(false),
        onUnsyncedChanges: ({ number }) => {
          setPendingUpdates(number);
          // Reaching zero means the server has acknowledged every local update.
          if (number === 0) setLastSyncedAt(new Date());
        },
        // The collab server tells us when a document passes its size limit;
        // edits then stay on this device instead of syncing.
        onStateless: ({ payload }) => {
          try {
            const message = JSON.parse(payload) as { type?: string };
            if (message.type === "document-too-large") setSizeLimited(true);
            else if (message.type === "document-size-ok") setSizeLimited(false);
          } catch {
            // Unknown stateless messages are ignored.
          }
        },
      });

      // Awareness carries presence. Everyone except us is a "peer"; the list is
      // de-duplicated by user id so two tabs from one person show once.
      created.on(
        "awarenessUpdate",
        ({ states }: { states: { clientId: number; user?: Collaborator }[] }) => {
          const seen = new Map<string, Collaborator>();
          for (const state of states) {
            const person = state.user;
            if (person?.id && person.id !== user.id) seen.set(person.id, person);
          }
          setPeers([...seen.values()]);
        },
      );

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
  }, [documentId, ydoc, user.id]);

  // The click handler is created once with the editor, so it reads the latest
  // behaviour through a ref instead of a stale closure.
  const onEditorClick = useRef<(pos: number) => void>(() => {});

  const editor = useEditor(
    {
      editable,
      immediatelyRender: false,
      extensions: [
        // Yjs owns undo/redo so history is per-user across collaborators.
        StarterKit.configure({
          undoRedo: false,
          link: {
            openOnClick: false,
            autolink: true,
            linkOnPaste: true,
            defaultProtocol: "https",
            HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
            // Script-bearing schemes never become links, however they arrive
            // (typed, pasted, or synced from a collaborator).
            isAllowedUri: (url, ctx) =>
              ctx.defaultValidate(url) && !/^\s*(javascript|data|vbscript|file):/i.test(url),
          },
        }),
        Highlight,
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        CommentMark,
        SlashCommand,
        AiAutocomplete,
        Collaboration.configure({ document: ydoc }),
        ...(provider
          ? [
              CollaborationCaret.configure({
                provider,
                user: { id: user.id, name: user.name, color: avatarColor(user.id) },
              }),
            ]
          : []),
        Placeholder.configure({
          placeholder: editable
            ? "Start writing, or type / for blocks…"
            : "This document is empty.",
        }),
      ],
      editorProps: {
        attributes: {
          class: "prose dark:prose-invert max-w-none focus:outline-none",
          "aria-label": "Document content",
        },
        handleClick: (_view, pos) => {
          onEditorClick.current(pos);
          return false;
        },
      },
    },
    [provider, editable],
  );

  // Inline AI autocomplete: opt-in (it spends tokens), remembered per browser.
  const [autocompleteOn, setAutocompleteOn] = useLocalFlag("collabdoc:ai-autocomplete");
  const autocompleteActive = aiEnabled && editable && autocompleteOn;
  useAiAutocomplete(editor, documentId, autocompleteActive);
  const hasSuggestion = useHasSuggestion(editor);

  // Keep the semantic-search index fresh: after edits settle, send the current
  // content. The server skips all work if the text hash is unchanged.
  useEffect(() => {
    if (!editor || !aiEnabled || !editable) return;
    let timer: number | undefined;
    const onUpdate = ({
      transaction,
    }: {
      transaction: { docChanged: boolean; getMeta: (key: string) => unknown };
    }) => {
      // Only the author of an edit re-indexes it; synced remote changes are
      // indexed by whoever made them (or by the server's stale sweep).
      if (!transaction.docChanged || transaction.getMeta("y-sync$")) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!navigator.onLine || editor.isDestroyed) return;
        void fetch(`/api/documents/${encodeURIComponent(documentId)}/index`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editor.getJSON() }),
        }).catch(() => undefined);
      }, INDEX_DEBOUNCE_MS);
    };
    editor.on("update", onUpdate);
    return () => {
      window.clearTimeout(timer);
      editor.off("update", onUpdate);
    };
  }, [editor, aiEnabled, editable, documentId]);

  // A cheap O(1) size proxy (ProseMirror positions ≈ characters) instead of
  // serialising the document on every keystroke. Snapshots, AI and export of
  // the whole document are capped at 1 MB of JSON, reached well before this.
  const nearLimit = useEditorSnapshot(
    editor,
    (instance) => instance.state.doc.content.size > LARGE_DOCUMENT_POSITIONS,
    false,
  );

  const openThreadIds = useMemo(
    () => (comments.threads ?? []).filter((thread) => !thread.resolved).map((thread) => thread.id),
    [comments.threads],
  );

  useEffect(() => {
    onEditorClick.current = (pos) => {
      if (!editor) return;
      const known = new Set(openThreadIds);
      const threadId = threadIdsAt(editor, pos).find((id) => known.has(id));
      if (threadId) {
        setActiveThreadId(threadId);
        setPanel("comments");
      }
    };
  });

  const startComment = useCallback(() => {
    if (!editor || !editable) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const quote = editor.state.doc
      .textBetween(from, to, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);
    if (!quote) return;

    // Only one unfinished comment at a time: drop the previous draft's anchor.
    if (commentDraft) removeCommentAnchor(editor, commentDraft.threadId);

    const threadId = createMutationId();
    addCommentAnchor(editor, from, to, threadId);
    setCommentDraft({ threadId, quote });
    setActiveThreadId(threadId);
    setPanel("comments");
  }, [editor, editable, commentDraft]);

  // Commands from the palette (open a panel, export).
  useEffect(
    () =>
      onCommand((command) => {
        if (command.type === "editor.open-panel") {
          setPanel(command.panel);
          return;
        }
        if (command.type === "editor.get-content") {
          command.resolve(editor && !editor.isDestroyed ? editor.getJSON() : null);
          return;
        }
        if (!editor) return;
        if (command.format === "markdown") exportMarkdown(editor, title);
        else if (command.format === "html") exportHtml(editor, title);
        else if (command.format === "text") exportText(editor, title);
        else printDocument();
      }),
    [editor, title],
  );

  // Markdown import: the new document's content was stashed by the importer.
  // Apply it once, only into an empty document, and only after the server's
  // copy (if reachable) has arrived — so it can never overwrite real content.
  useEffect(() => {
    if (!editor || !localReady || !editable) return;
    if (WS_URL && online && (status === "connecting" || (status === "connected" && !synced)))
      return;

    const key = importStorageKey(documentId);
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(key);
      if (raw) sessionStorage.removeItem(key);
    } catch {
      return;
    }
    if (!raw || !editor.isEmpty) return;

    try {
      editor.commands.setContent(JSON.parse(raw));
      toast.success("Document imported");
    } catch {
      toast.error("Couldn't import that file's content.");
    }
  }, [editor, localReady, editable, online, status, synced, documentId]);

  const outbox = useOutbox();
  const queuedHere = useMemo(
    () => outbox.items.filter((m) => m.documentId === documentId),
    [outbox.items, documentId],
  );
  // Failed items need the user's attention but aren't "in flight", so they
  // don't hold the status at "Syncing" forever.
  const queuedPending = queuedHere.filter((m) => m.status === "pending").length;

  const syncState = useMemo(
    () =>
      deriveSyncState({
        realtimeEnabled: Boolean(WS_URL),
        online,
        wsStatus: status,
        synced,
        pendingUpdates,
        queuedActions: queuedPending,
      }),
    [online, status, synced, pendingUpdates, queuedPending],
  );

  const togglePanel = useCallback(
    (tab: PanelTab) => setPanel((current) => (current === tab ? null : tab)),
    [],
  );

  const openComments = (comments.threads ?? []).filter((thread) => !thread.resolved).length;
  const activePanel = PANELS.find((item) => item.id === panel);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row print:block">
      <CommentHighlights
        openIds={commentDraft ? [...openThreadIds, commentDraft.threadId] : openThreadIds}
        activeId={panel === "comments" ? activeThreadId : null}
      />
      <SlashMenu />

      <div className="flex min-w-0 flex-1 flex-col print:block">
        <div className="border-border bg-surface/60 flex items-center gap-2 border-b px-3 py-1.5 print:hidden">
          <SyncDetails
            state={syncState}
            online={online}
            wsStatus={status}
            realtimeEnabled={Boolean(WS_URL)}
            pendingUpdates={pendingUpdates}
            lastSyncedAt={lastSyncedAt}
            localReady={localReady}
            queued={queuedHere}
            authPaused={outbox.authPaused}
          />

          {peers.length > 0 && (
            <Tooltip
              content={`${peers.map((peer) => peer.name).join(", ")} ${peers.length === 1 ? "is" : "are"} editing`}
            >
              <span className="flex items-center gap-1.5">
                <AvatarStack people={peers} max={3} />
              </span>
            </Tooltip>
          )}

          <div className="flex-1" />

          <ExportMenu editor={editor} title={title} />
          <span className="bg-border mx-0.5 h-5 w-px" aria-hidden />

          {PANELS.map(({ id, label, icon: Icon }) => (
            <PanelButton
              key={id}
              active={panel === id}
              onClick={() => togglePanel(id)}
              label={label}
              badge={id === "comments" && openComments > 0 ? openComments : undefined}
              icon={<Icon />}
            />
          ))}
        </div>

        {editable && (
          <EditorToolbar
            editor={editor}
            autocomplete={
              aiEnabled
                ? { enabled: autocompleteOn, onToggle: () => setAutocompleteOn(!autocompleteOn) }
                : undefined
            }
          />
        )}

        {(sizeLimited || nearLimit) && (
          <div
            role="alert"
            className="border-warning/30 bg-warning-subtle text-warning flex items-start gap-2 border-b px-4 py-2 text-xs print:hidden"
          >
            <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
            <p>
              {sizeLimited
                ? "This document has reached the maximum size, so new changes are kept on this device and aren't shared. Split it into smaller documents to keep collaborating."
                : "This document is getting very large. Saving versions, AI features and export work on documents up to 1 MB — consider splitting it."}
            </p>
          </div>
        )}

        <span className="sr-only" role="status" aria-live="polite">
          {autocompleteActive && hasSuggestion
            ? "AI suggestion available. Press Tab to accept or Escape to dismiss."
            : ""}
        </span>

        <div className="min-h-0 flex-1 overflow-y-auto print:overflow-visible">
          <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-10 sm:py-14 print:max-w-none print:p-0">
            {!localReady && !editor ? (
              <div className="space-y-4" aria-busy>
                <span className="sr-only" role="status">
                  Loading your local copy…
                </span>
                {[94, 86, 90, 62].map((width, index) => (
                  <Skeleton key={index} className="h-4" style={{ width: `${width}%` }} />
                ))}
              </div>
            ) : (
              <EditorContent editor={editor} />
            )}
          </div>
        </div>

        <AiBubbleMenu
          editor={editor}
          documentId={documentId}
          aiEnabled={aiEnabled && editable}
          onComment={editable ? startComment : undefined}
        />
      </div>

      {panel && activePanel && (
        <aside
          className="border-border bg-surface animate-slide-in-right flex max-h-[70vh] min-h-0 shrink-0 flex-col border-t lg:max-h-none lg:w-84 lg:border-t-0 lg:border-l print:hidden"
          aria-label={activePanel.label}
        >
          <div className="border-border flex h-12 items-center justify-between border-b px-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <activePanel.icon className="text-muted-foreground size-4" aria-hidden />
              {activePanel.label}
            </h2>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPanel(null)}
              aria-label="Close panel"
            >
              <PanelRightClose />
            </Button>
          </div>

          {panel === "versions" && (
            <VersionsPanel
              documentId={documentId}
              editor={editor}
              canManage={editable}
              aiEnabled={aiEnabled}
              initialVersions={initialVersions}
            />
          )}
          {panel === "comments" && (
            <CommentsPanel
              documentId={documentId}
              editor={editor}
              threads={comments.threads}
              loadError={comments.error}
              reload={comments.reload}
              canComment={editable}
              currentUserId={user.id}
              isOwner={isOwner}
              draft={commentDraft}
              onDraftDone={() => setCommentDraft(null)}
              activeThreadId={activeThreadId}
              onActivate={setActiveThreadId}
            />
          )}
          {panel === "outline" && <OutlinePanel editor={editor} />}
          {panel === "activity" && <ActivityPanel documentId={documentId} />}
          {panel === "ai" && (
            <AiPanel
              documentId={documentId}
              editor={editor}
              aiEnabled={aiEnabled}
              canEdit={editable}
            />
          )}
        </aside>
      )}
    </div>
  );
}

function PanelButton({
  active,
  onClick,
  label,
  icon,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={badge ? `${label} (${badge})` : label}
        aria-pressed={active}
        className={cn(
          "relative flex size-8 items-center justify-center rounded-md transition-colors [&_svg]:size-4",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
          active
            ? "bg-primary-subtle text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {icon}
        {badge !== undefined && (
          <span
            className="bg-warning absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[9px] leading-4 font-semibold text-white tabular-nums"
            aria-hidden
          >
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>
    </Tooltip>
  );
}
