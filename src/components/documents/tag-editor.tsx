"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus, Sparkles, Tag, X } from "lucide-react";
import { toast } from "react-toastify";

import { cn } from "@/lib/utils";
import { MAX_TAGS, normaliseTag, tagTint } from "@/lib/tags";
import { requestEditorContent } from "@/lib/commands/bus";

/**
 * Document tags, shown under the title.
 *
 * Tags describe the document, so every collaborator sees them; only editors
 * can change them. AI can *suggest* tags from the content — the user picks
 * which to keep. Changes save immediately and roll back if the server refuses.
 */
export function TagEditor({
  documentId,
  initialTags,
  canEdit,
  aiEnabled,
}: {
  documentId: string;
  initialTags: string[];
  canEdit: boolean;
  aiEnabled: boolean;
}) {
  const [tags, setTags] = useState(initialTags);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(next: string[]) {
    if (!navigator.onLine) {
      toast.error("Editing tags needs a connection.");
      return false;
    }
    const previous = tags;
    setTags(next);
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { tags?: string[]; error?: string };
      if (!res.ok || !data.tags) throw new Error(data.error);
      setTags(data.tags);
      return true;
    } catch {
      setTags(previous);
      toast.error("Couldn't update tags.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function add(raw: string) {
    const tag = normaliseTag(raw);
    if (tag.length < 2 || tags.includes(tag)) return;
    if (tags.length >= MAX_TAGS) {
      toast.info(`A document can have up to ${MAX_TAGS} tags.`);
      return;
    }
    const ok = await save([...tags, tag]);
    if (ok) setSuggestions((current) => current.filter((item) => item !== tag));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await add(draft);
    setDraft("");
  }

  async function suggest() {
    setSuggesting(true);
    try {
      const content = await requestEditorContent();
      if (!content) {
        toast.info("The document is still loading — try again in a moment.");
        return;
      }
      const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}/ai/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await res.json().catch(() => ({}))) as { tags?: string[]; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't suggest tags.");
        return;
      }
      const fresh = (data.tags ?? []).filter((tag) => !tags.includes(tag));
      if (fresh.length === 0) toast.info("No new tag suggestions.");
      setSuggestions(fresh);
    } catch {
      toast.error("You appear to be offline. AI features need a connection.");
    } finally {
      setSuggesting(false);
    }
  }

  if (!canEdit && tags.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 print:hidden" aria-label="Tags">
      <Tag className="text-muted-foreground size-3.5" aria-hidden />

      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
            tagTint(tag),
          )}
        >
          {tag}
          {canEdit && (
            <button
              type="button"
              onClick={() => void save(tags.filter((item) => item !== tag))}
              disabled={saving}
              aria-label={`Remove tag ${tag}`}
              className="hover:text-foreground -mr-0.5 rounded-full"
            >
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}

      {canEdit && tags.length < MAX_TAGS && (
        <>
          {adding ? (
            <form onSubmit={submit} className="inline-flex">
              <input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => {
                  if (!draft.trim()) setAdding(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setDraft("");
                    setAdding(false);
                  }
                }}
                placeholder="tag name"
                maxLength={30}
                aria-label="New tag"
                className="border-border bg-input h-6 w-28 rounded-full border px-2 text-[11px] focus-visible:outline-none"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px]"
            >
              <Plus className="size-3" aria-hidden />
              Tag
            </button>
          )}

          {aiEnabled && (
            <button
              type="button"
              onClick={() => void suggest()}
              disabled={suggesting}
              className="text-primary inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium hover:underline disabled:opacity-60"
            >
              {suggesting ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-3" aria-hidden />
              )}
              Suggest tags
            </button>
          )}
        </>
      )}

      {suggestions.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => void add(tag)}
          disabled={saving}
          className={cn(
            "border-primary/40 text-primary hover:bg-primary-subtle inline-flex items-center gap-0.5 rounded-full border border-dashed px-2 py-0.5 text-[11px] font-medium transition-colors",
          )}
          aria-label={`Add suggested tag ${tag}`}
        >
          <Plus className="size-3" aria-hidden />
          {tag}
        </button>
      ))}
      {suggestions.length > 0 && (
        <button
          type="button"
          onClick={() => setSuggestions([])}
          className="text-muted-foreground hover:text-foreground text-[11px]"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
