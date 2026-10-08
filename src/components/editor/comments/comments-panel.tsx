"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlertCircle,
  Check,
  MessageSquare,
  MessageSquareDashed,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { confirmToast } from "@/components/ui/confirm-toast";
import { formatRelative } from "@/lib/format/relative-time";
import { useNetworkStatus } from "@/lib/sync/use-network-status";
import type { ThreadView } from "@/lib/authz/comments";
import {
  collectCommentAnchors,
  removeCommentAnchor,
} from "@/components/editor/extensions/comment-mark";
import { useEditorSnapshot } from "@/components/editor/use-editor-snapshot";
import {
  CommentBody,
  extractMentions,
  MentionTextarea,
  type Member,
} from "@/components/editor/mention-textarea";

export type CommentDraft = { threadId: string; quote: string };

/**
 * Comment threads for the open document.
 *
 * The anchor for a new thread is placed in the document the moment the user
 * clicks "Comment" (while their selection is still exact), then the thread is
 * created on the server. Cancelling or failing removes the anchor again, so the
 * document never keeps a highlight without a conversation behind it.
 */
export function CommentsPanel({
  documentId,
  editor,
  threads,
  loadError,
  reload,
  canComment,
  currentUserId,
  isOwner,
  draft,
  onDraftDone,
  activeThreadId,
  onActivate,
}: {
  documentId: string;
  editor: Editor | null;
  threads: ThreadView[] | null;
  loadError: string | null;
  reload: () => Promise<void>;
  canComment: boolean;
  currentUserId: string;
  isOwner: boolean;
  draft: CommentDraft | null;
  onDraftDone: () => void;
  activeThreadId: string | null;
  onActivate: (threadId: string | null) => void;
}) {
  const { online } = useNetworkStatus();
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const [members, setMembers] = useState<Member[]>([]);
  const [draftText, setDraftText] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Which threads are still anchored in the text right now.
  const anchorKey = useEditorSnapshot(
    editor,
    (instance) => [...collectCommentAnchors(instance.state.doc).keys()].sort().join(","),
    "",
  );
  const anchored = new Set(anchorKey ? anchorKey.split(",") : []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/${encodeURIComponent(documentId)}/members`)
      .then((res) => (res.ok ? res.json() : { members: [] }))
      .then((data: { members: Member[] }) => {
        if (!cancelled) setMembers(data.members ?? []);
      })
      .catch(() => {
        // Mentions just won't autocomplete offline.
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  // A collaborator's new comment arrives as an anchor (via the CRDT) before our
  // next poll. Seeing an anchor we don't know triggers one refresh per new set.
  const lastUnknown = useRef("");
  useEffect(() => {
    if (!threads) return;
    const known = new Set(threads.map((thread) => thread.id));
    const unknown = [...anchored]
      .filter((id) => !known.has(id) && id !== draft?.threadId)
      .join(",");
    if (unknown && unknown !== lastUnknown.current) {
      lastUnknown.current = unknown;
      void reload();
    }
    // `anchored` derives from anchorKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorKey, threads, draft?.threadId, reload]);

  function scrollToThread(threadId: string) {
    onActivate(threadId);
    if (!editor) return;
    const range = collectCommentAnchors(editor.state.doc).get(threadId);
    if (!range) return;
    editor.commands.setTextSelection(range);
    const { node } = editor.view.domAtPos(range.from);
    const element = node instanceof Element ? node : node.parentElement;
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  async function postDraft() {
    if (!draft || posting) return;
    const body = draftText.trim();
    if (!body) return;
    if (!online) {
      setDraftError("You're offline. Comments are posted when you reconnect — keep this open.");
      return;
    }

    setPosting(true);
    setDraftError(null);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: draft.threadId,
          quote: draft.quote,
          body,
          mentions: extractMentions(body, members, currentUserId),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setDraftError(data.error ?? "Could not post the comment.");
        return;
      }
      const threadId = draft.threadId;
      setDraftText("");
      onDraftDone();
      await reload();
      setFilter("open");
      onActivate(threadId);
    } catch {
      setDraftError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPosting(false);
    }
  }

  function cancelDraft() {
    if (draft && editor) removeCommentAnchor(editor, draft.threadId);
    setDraftText("");
    setDraftError(null);
    onDraftDone();
  }

  const all = threads ?? [];
  const open = all.filter((thread) => !thread.resolved);
  const resolved = all.filter((thread) => thread.resolved);
  const visible = filter === "open" ? open : resolved;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="border-border flex gap-0.5 border-b p-1.5"
        role="tablist"
        aria-label="Comment filter"
      >
        {(
          [
            ["open", `Open (${open.length})`],
            ["resolved", `Resolved (${resolved.length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              filter === value
                ? "bg-primary-subtle text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {draft && canComment && (
          <div className="border-primary/40 bg-primary-subtle/40 rounded-lg border p-2.5">
            <Quote text={draft.quote} />
            <MentionTextarea
              value={draftText}
              onChange={setDraftText}
              onSubmit={() => void postDraft()}
              members={members}
              currentUserId={currentUserId}
              placeholder="Add a comment… (@ to mention, Ctrl+Enter to post)"
              ariaLabel="New comment"
              autoFocus
            />
            {draftError && <ErrorLine text={draftError} />}
            <div className="mt-2 flex justify-end gap-1.5">
              <Button variant="ghost" size="sm" onClick={cancelDraft} disabled={posting}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void postDraft()}
                loading={posting}
                disabled={!draftText.trim() || !online}
              >
                Comment
              </Button>
            </div>
          </div>
        )}

        {!canComment && (
          <p className="text-muted-foreground text-[11px]">
            You can read comments. Editors and owners can add them.
          </p>
        )}

        {threads === null && !loadError ? (
          <div className="space-y-2" aria-busy>
            <span className="sr-only" role="status">
              Loading comments…
            </span>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : threads === null && loadError ? (
          <div className="py-6 text-center">
            <ErrorLine text={loadError} />
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => void reload()}>
              Try again
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            size="sm"
            icon={filter === "open" ? <MessageSquare /> : <Check />}
            title={filter === "open" ? "No open comments" : "No resolved comments"}
            description={
              filter === "open" && canComment
                ? "Select text in the document and choose “Comment” to start a thread."
                : undefined
            }
          />
        ) : (
          visible.map((thread) => (
            <ThreadCard
              key={thread.id}
              documentId={documentId}
              thread={thread}
              editor={editor}
              anchored={anchored.has(thread.id)}
              active={thread.id === activeThreadId}
              canComment={canComment}
              canDelete={thread.authorId === currentUserId || isOwner}
              currentUserId={currentUserId}
              members={members}
              online={online}
              reload={reload}
              onSelect={() => scrollToThread(thread.id)}
              onDeleted={() => {
                if (thread.id === activeThreadId) onActivate(null);
              }}
            />
          ))
        )}

        {loadError && threads !== null && <ErrorLine text={loadError} />}
      </div>
    </div>
  );
}

function ThreadCard({
  documentId,
  thread,
  editor,
  anchored,
  active,
  canComment,
  canDelete,
  currentUserId,
  members,
  online,
  reload,
  onSelect,
  onDeleted,
}: {
  documentId: string;
  thread: ThreadView;
  editor: Editor | null;
  anchored: boolean;
  active: boolean;
  canComment: boolean;
  canDelete: boolean;
  currentUserId: string;
  members: Member[];
  online: boolean;
  reload: () => Promise<void>;
  onSelect: () => void;
  onDeleted: () => void;
}) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<"reply" | "resolve" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/documents/${encodeURIComponent(documentId)}/comments/${encodeURIComponent(thread.id)}`;

  async function request(kind: "reply" | "resolve" | "delete", init: RequestInit) {
    if (!online) {
      setError("You're offline. Try again when you reconnect.");
      return false;
    }
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(base, init);
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return false;
      }
      return true;
    } catch {
      setError("Could not reach the server.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function sendReply() {
    const body = reply.trim();
    if (!body) return;
    const ok = await request("reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, mentions: extractMentions(body, members, currentUserId) }),
    });
    if (ok) {
      setReply("");
      await reload();
    }
  }

  async function toggleResolved() {
    const ok = await request("resolve", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: !thread.resolved }),
    });
    if (ok) await reload();
  }

  async function remove() {
    const confirmed = await confirmToast("Delete this comment thread for everyone?", "Delete");
    if (!confirmed) return;
    const ok = await request("delete", { method: "DELETE" });
    if (!ok) return;
    // Remove the anchor too, when we're allowed to edit the document.
    if (editor?.isEditable) removeCommentAnchor(editor, thread.id);
    onDeleted();
    await reload();
    toast.success("Comment thread deleted");
  }

  return (
    <article
      className={cn(
        "rounded-lg border p-2.5 transition-colors",
        active
          ? "border-warning/60 bg-warning-subtle/30"
          : "border-border hover:border-border-strong",
        thread.resolved && "opacity-80",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left"
        aria-label={`Go to the text for this comment: ${thread.quote}`}
        disabled={!anchored}
      >
        <Quote text={thread.quote} />
      </button>
      {!anchored && (
        <p className="text-muted-foreground mb-1.5 flex items-center gap-1 text-[10px]">
          <MessageSquareDashed className="size-3" aria-hidden />
          The commented text was removed from the document.
        </p>
      )}

      <ol className="space-y-2">
        {thread.comments.map((comment) => (
          <li key={comment.id} className="text-xs">
            <div className="flex items-center gap-1.5">
              <Avatar name={comment.authorName} id={comment.authorId} size="xs" />
              <span className="font-medium">{comment.authorName}</span>
              <time
                dateTime={comment.createdAt}
                title={new Date(comment.createdAt).toLocaleString()}
                className="text-muted-foreground text-[10px]"
                suppressHydrationWarning
              >
                {formatRelative(comment.createdAt)}
              </time>
            </div>
            <p className="mt-1 leading-relaxed break-words whitespace-pre-wrap">
              <CommentBody body={comment.body} members={members} />
            </p>
          </li>
        ))}
      </ol>

      {thread.resolved && thread.resolvedByName && (
        <p className="text-muted-foreground mt-2 flex items-center gap-1 text-[10px]">
          <Check className="size-3" aria-hidden />
          Resolved by {thread.resolvedByName}
        </p>
      )}

      {error && <ErrorLine text={error} />}

      {canComment && !thread.resolved && (
        <div className="mt-2">
          <MentionTextarea
            value={reply}
            onChange={setReply}
            onSubmit={() => void sendReply()}
            members={members}
            currentUserId={currentUserId}
            placeholder="Reply…"
            ariaLabel={`Reply to comment on “${thread.quote}”`}
            disabled={busy !== null}
          />
        </div>
      )}

      <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1">
        {canComment && !thread.resolved && reply.trim() && (
          <Button
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => void sendReply()}
            loading={busy === "reply"}
          >
            Reply
          </Button>
        )}
        {canComment && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-1.5 text-[11px]"
            onClick={() => void toggleResolved()}
            loading={busy === "resolve"}
          >
            {busy !== "resolve" && (thread.resolved ? <RotateCcw /> : <Check />)}
            {thread.resolved ? "Reopen" : "Resolve"}
          </Button>
        )}
        {canComment && canDelete && (
          <Button
            variant="danger-ghost"
            size="sm"
            className="h-7 px-1.5 text-[11px]"
            onClick={() => void remove()}
            loading={busy === "delete"}
            aria-label="Delete thread"
          >
            {busy !== "delete" && <Trash2 />}
          </Button>
        )}
      </div>
    </article>
  );
}

function Quote({ text }: { text: string }) {
  return (
    <p className="border-warning/60 text-muted-foreground mb-2 line-clamp-3 border-l-2 pl-2 text-[11px] italic">
      {text}
    </p>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <p role="alert" className="text-danger mt-1.5 flex items-start gap-1 text-[11px]">
      <AlertCircle className="mt-px size-3 shrink-0" aria-hidden />
      {text}
    </p>
  );
}
