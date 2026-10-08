"use client";

import { Fragment, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

export type Member = { userId: string; name: string };

const MAX_SUGGESTIONS = 6;

/**
 * Textarea with @mention autocomplete.
 *
 * Mentions are resolved from the final text at submit time (see
 * `extractMentions`) rather than tracked as the user types, so deleting an
 * "@Name" also removes the mention — nobody is notified about text that is no
 * longer there.
 */
export function MentionTextarea({
  value,
  onChange,
  onSubmit,
  members,
  currentUserId,
  placeholder,
  disabled,
  autoFocus,
  maxLength = 2_000,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  members: Member[];
  currentUserId: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  const candidates =
    query === null
      ? []
      : members
          .filter((member) => member.userId !== currentUserId)
          .filter((member) => member.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, MAX_SUGGESTIONS);
  const open = candidates.length > 0;

  function detect(text: string, caret: number) {
    const match = text.slice(0, caret).match(/(?:^|\s)@([^\s@]{0,30})$/);
    setQuery(match ? match[1]! : null);
    setIndex(0);
  }

  function choose(member: Member) {
    const element = ref.current;
    if (!element) return;
    const caret = element.selectionStart;
    const before = value.slice(0, caret).replace(/@([^\s@]{0,30})$/, `@${member.name} `);
    const next = before + value.slice(caret);
    onChange(next.slice(0, maxLength));
    setQuery(null);
    // Restore the caret after React applies the new value.
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(before.length, before.length);
    });
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          detect(event.target.value, event.target.selectionStart);
        }}
        onKeyDown={(event) => {
          if (open) {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIndex((i) => (i + 1) % candidates.length);
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setIndex((i) => (i - 1 + candidates.length) % candidates.length);
              return;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              const member = candidates[index];
              if (member) choose(member);
              return;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setQuery(null);
              return;
            }
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSubmit();
          }
        }}
        onBlur={() => setQuery(null)}
        onClick={(event) => detect(value, event.currentTarget.selectionStart)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={maxLength}
        rows={3}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        className={cn(
          "border-border bg-input w-full resize-none rounded-md border px-2.5 py-2 text-xs leading-relaxed",
          "placeholder:text-muted-foreground",
          "focus-visible:border-primary focus-visible:ring-ring/25 focus-visible:ring-2 focus-visible:outline-none",
          "disabled:opacity-60",
        )}
      />

      {open && (
        <ul
          role="listbox"
          aria-label="Mention someone"
          className="bg-overlay border-border absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border p-1 shadow-md"
          // Keep focus in the textarea while clicking a suggestion.
          onMouseDown={(event) => event.preventDefault()}
        >
          {candidates.map((member, i) => (
            <li
              key={member.userId}
              role="option"
              aria-selected={i === index}
              onMouseEnter={() => setIndex(i)}
              onClick={() => choose(member)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs",
                i === index ? "bg-muted" : "",
              )}
            >
              <Avatar name={member.name} id={member.userId} size="xs" />
              {member.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** User ids whose "@Name" appears in the text (excluding the author). */
export function extractMentions(body: string, members: Member[], currentUserId: string): string[] {
  return members
    .filter((member) => member.userId !== currentUserId)
    .filter((member) =>
      new RegExp(`(^|\\s)@${escapeRegExp(member.name)}(?=$|[\\s.,!?;:)])`).test(body),
    )
    .map((member) => member.userId);
}

/** Renders comment text with known @mentions highlighted. Text only — never HTML. */
export function CommentBody({ body, members }: { body: string; members: Member[] }) {
  const names = [...new Set(members.map((member) => member.name))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (names.length === 0) return <>{body}</>;

  const pattern = new RegExp(`(@(?:${names.map(escapeRegExp).join("|")}))`, "g");
  return (
    <>
      {body.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-primary font-medium">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
