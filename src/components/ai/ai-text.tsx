import { Fragment } from "react";
import Link from "next/link";
import { documentPath } from "@/config/routes";

export type Citation = { n: number; documentId: string; title: string };

/**
 * Renders model output safely and readably.
 *
 * - Output is rendered as text nodes, never HTML, so a response can't inject
 *   markup into the page.
 * - "- " lines become a real list when the whole answer is a list.
 * - "[n]" citations become links to the cited document when sources are given;
 *   a citation to a source that wasn't provided stays plain text.
 */
export function AiText({
  text,
  citations,
  className,
}: {
  text: string;
  citations?: Citation[];
  className?: string;
}) {
  const lines = text.split("\n").filter((line) => line.trim());
  const bullets = lines.filter((line) => /^\s*[-*•]\s/.test(line));

  if (bullets.length >= 2 && bullets.length === lines.length) {
    return (
      <ul className={className ?? "space-y-1.5 text-xs leading-relaxed"}>
        {bullets.map((line, index) => (
          <li key={index} className="flex gap-2">
            <span
              className="text-primary mt-1.5 size-1 shrink-0 rounded-full bg-current"
              aria-hidden
            />
            <span>
              <WithCitations text={line.replace(/^\s*[-*•]\s*/, "")} citations={citations} />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className={className ?? "text-xs leading-relaxed whitespace-pre-line"}>
      <WithCitations text={text} citations={citations} />
    </p>
  );
}

function WithCitations({ text, citations }: { text: string; citations?: Citation[] }) {
  if (!citations?.length) return <>{text}</>;
  const byNumber = new Map(citations.map((citation) => [citation.n, citation]));

  return (
    <>
      {text.split(/(\[\d{1,2}\])/g).map((part, index) => {
        const match = part.match(/^\[(\d{1,2})\]$/);
        const citation = match ? byNumber.get(Number(match[1])) : undefined;
        if (!citation) return <Fragment key={index}>{part}</Fragment>;
        return (
          <Link
            key={index}
            href={documentPath(citation.documentId)}
            title={citation.title}
            className="bg-primary-subtle text-primary mx-0.5 inline-flex items-center rounded px-1 align-baseline text-[10px] font-semibold no-underline hover:underline"
          >
            {citation.n}
          </Link>
        );
      })}
    </>
  );
}
