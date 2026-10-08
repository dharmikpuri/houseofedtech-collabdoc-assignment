"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowUp,
  Database,
  FileText,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Search,
  Sparkles,
  Square,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AiText, type Citation } from "@/components/ai/ai-text";
import { streamAi } from "@/lib/ai/read-stream";
import { useNetworkStatus } from "@/lib/sync/use-network-status";
import type { SearchResult } from "@/lib/search/search";

type Mode = "ask" | "search";
type Coverage = { indexed: number; total: number };

type Answer = {
  question: string;
  text: string;
  sources: Citation[];
  streaming: boolean;
  stopped?: boolean;
  error?: string;
};

const MAX_INDEX_PASSES = 10;

/**
 * Workspace-wide semantic search and question answering.
 *
 * The query and mode live in the URL, so results survive a reload and can be
 * shared. Semantic results need an index; the page shows how much of the
 * workspace is indexed and can bring it up to date. Without AI configured,
 * search still works on titles and the Ask tab explains what to enable.
 */
export function SearchWorkspace({ aiEnabled }: { aiEnabled: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { online } = useNetworkStatus();

  const initialQuery = params.get("q") ?? "";
  const initialMode: Mode = params.get("mode") === "search" || !aiEnabled ? "search" : "ask";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [input, setInput] = useState(initialQuery);

  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [indexing, setIndexing] = useState(false);

  const [answer, setAnswer] = useState<Answer | null>(null);
  const askAbort = useRef<AbortController | null>(null);

  useEffect(() => () => askAbort.current?.abort(), []);

  const syncUrl = useCallback(
    (query: string, nextMode: Mode) => {
      const next = new URLSearchParams();
      if (query) next.set("q", query);
      if (nextMode === "search") next.set("mode", "search");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  const runSearch = useCallback(async (query: string) => {
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        results?: SearchResult[];
        coverage?: Coverage;
        error?: string;
      };
      if (!res.ok || !data.results) {
        setSearchError(data.error ?? "Search failed. Please try again.");
        return;
      }
      setResults(data.results);
      if (data.coverage) setCoverage(data.coverage);
    } catch {
      setSearchError("You appear to be offline. Search needs a connection.");
    } finally {
      setSearching(false);
    }
  }, []);

  const runAsk = useCallback(async (question: string) => {
    askAbort.current?.abort();
    const controller = new AbortController();
    askAbort.current = controller;

    setAnswer({ question, text: "", sources: [], streaming: true });
    const outcome = await streamAi(
      "/api/ai/ask-workspace",
      { question },
      {
        signal: controller.signal,
        onSources: (sources) => setAnswer((prev) => (prev ? { ...prev, sources } : prev)),
        onText: (text) => setAnswer((prev) => (prev ? { ...prev, text } : prev)),
      },
    );
    setAnswer((prev) => (prev ? { ...prev, ...outcome, streaming: false } : prev));
    if (askAbort.current === controller) askAbort.current = null;
  }, []);

  /** Indexes stale documents a few at a time until done (bounded). */
  const updateIndex = useCallback(async () => {
    if (!aiEnabled) return;
    setIndexing(true);
    try {
      for (let pass = 0; pass < MAX_INDEX_PASSES; pass += 1) {
        const res = await fetch("/api/search/index", { method: "POST" });
        if (!res.ok) break;
        const data = (await res.json()) as {
          remaining: number;
          coverage: Coverage;
          indexed: number;
        };
        setCoverage(data.coverage);
        if (data.remaining === 0 || data.indexed === 0) break;
      }
    } catch {
      // Offline or rate limited — the coverage line says where things stand.
    } finally {
      setIndexing(false);
    }
  }, [aiEnabled]);

  // Run the query from the URL on first load, and warm the index once.
  const started = useRef(false);
  useEffect(() => {
    // Scheduled rather than run inline so state only changes from a callback.
    // The guard lives inside the callback: under StrictMode the first timer is
    // cleared before it fires, and the re-run must still start the work.
    const timer = window.setTimeout(() => {
      if (started.current) return;
      started.current = true;
      if (initialQuery) {
        if (initialMode === "ask") void runAsk(initialQuery);
        else void runSearch(initialQuery);
      }
      void updateIndex();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialQuery, initialMode, runAsk, runSearch, updateIndex]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const query = input.trim();
    if (!query) return;
    syncUrl(query, mode);
    if (mode === "ask") void runAsk(query);
    else void runSearch(query);
  }

  function switchMode(next: Mode) {
    setMode(next);
    syncUrl(input.trim(), next);
  }

  return (
    <div className="space-y-5">
      <div
        className="border-border bg-surface inline-flex gap-0.5 rounded-lg border p-0.5"
        role="tablist"
        aria-label="Mode"
      >
        {(
          [
            ["ask", "Ask", MessageSquareText],
            ["search", "Search", Search],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => switchMode(value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors [&_svg]:size-4",
              mode === value
                ? "bg-primary-subtle text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            mode === "ask"
              ? "Ask about anything in your documents…"
              : "Search by meaning, not just keywords…"
          }
          aria-label={mode === "ask" ? "Question" : "Search query"}
          icon={mode === "ask" ? <Sparkles /> : <Search />}
          maxLength={mode === "ask" ? 500 : 300}
          className="h-11"
          autoFocus
        />
        {mode === "ask" && answer?.streaming ? (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => askAbort.current?.abort()}
          >
            <Square className="fill-current" />
            Stop
          </Button>
        ) : (
          <Button
            type="submit"
            size="lg"
            disabled={!input.trim() || !online || (mode === "ask" && !aiEnabled)}
            loading={mode === "search" && searching}
          >
            {!(mode === "search" && searching) && <ArrowUp />}
            {mode === "ask" ? "Ask" : "Search"}
          </Button>
        )}
      </form>

      {!online && (
        <p className="text-warning flex items-center gap-1.5 text-xs" role="status">
          <AlertCircle className="size-3.5" aria-hidden />
          You&apos;re offline. Search and Ask need a connection; your documents are still editable.
        </p>
      )}

      {aiEnabled && coverage && (
        <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
          <Database className="size-3.5" aria-hidden />
          {coverage.indexed} of {coverage.total} document{coverage.total === 1 ? "" : "s"} indexed
          for semantic search.
          <button
            type="button"
            onClick={() => void updateIndex()}
            disabled={indexing || !online}
            className="text-primary inline-flex items-center gap-1 font-medium hover:underline disabled:opacity-60"
          >
            {indexing ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-3" aria-hidden />
            )}
            {indexing ? "Updating…" : "Update index"}
          </button>
        </p>
      )}

      {mode === "ask" ? (
        !aiEnabled ? (
          <EmptyState
            icon={<Sparkles />}
            title="AI features are switched off"
            description={
              <>
                Set <code className="bg-muted rounded px-1 py-0.5 text-xs">GEMINI_API_KEY</code> to
                ask questions across your documents. Search still works on titles.
              </>
            }
          />
        ) : !answer ? (
          <EmptyState
            icon={<MessageSquareText />}
            title="Ask your workspace"
            description="Try “What did we decide about the launch date?” or “Summarise open action items across projects.”"
          />
        ) : (
          <AnswerView answer={answer} />
        )
      ) : (
        <SearchResults
          results={results}
          searching={searching}
          error={searchError}
          semantic={aiEnabled}
        />
      )}
    </div>
  );
}

function AnswerView({ answer }: { answer: Answer }) {
  return (
    <section
      className="border-border bg-surface rounded-xl border p-5"
      aria-busy={answer.streaming || undefined}
    >
      <p className="text-muted-foreground text-xs font-medium">{answer.question}</p>

      <div className="mt-3 text-sm">
        {answer.streaming && !answer.text ? (
          <div className="space-y-2">
            <span className="sr-only" role="status">
              Searching your documents…
            </span>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-[90%]" />
            <Skeleton className="h-3.5 w-[70%]" />
          </div>
        ) : (
          answer.text && (
            <AiText
              text={answer.text}
              citations={answer.sources}
              className="text-sm leading-relaxed whitespace-pre-line"
            />
          )
        )}
        {answer.stopped && <p className="text-muted-foreground mt-2 text-xs italic">Stopped.</p>}
        {answer.error && (
          <p className="text-danger mt-2 flex items-start gap-1.5 text-xs" role="alert">
            <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
            {answer.error}
          </p>
        )}
      </div>

      {answer.sources.length > 0 && (
        <div className="border-border mt-4 border-t pt-3">
          <h2 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
            Sources
          </h2>
          <ol className="space-y-1">
            {answer.sources.map((source) => (
              <li key={source.n} className="flex items-center gap-2 text-xs">
                <span className="bg-primary-subtle text-primary inline-flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold">
                  {source.n}
                </span>
                <Link href={`/documents/${source.documentId}`} className="truncate hover:underline">
                  {source.title}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!answer.streaming && !answer.error && (
        <span className="sr-only" role="status">
          Answer ready.
        </span>
      )}
    </section>
  );
}

function SearchResults({
  results,
  searching,
  error,
  semantic,
}: {
  results: SearchResult[] | null;
  searching: boolean;
  error: string | null;
  semantic: boolean;
}) {
  if (error) {
    return (
      <p className="text-danger flex items-start gap-1.5 text-sm" role="alert">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        {error}
      </p>
    );
  }
  if (searching && !results) {
    return (
      <div className="space-y-3" aria-busy>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (!results) {
    return (
      <EmptyState
        icon={<Search />}
        title="Search your documents"
        description={
          semantic
            ? "Semantic search finds passages by meaning — “budget risks” matches “we might overspend”."
            : "Title search is available. Configure AI for semantic search."
        }
      />
    );
  }
  if (results.length === 0) {
    return (
      <EmptyState
        icon={<Search />}
        title="No matches"
        description="Try different wording, or update the index if you've written a lot recently."
      />
    );
  }

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {results.length} result{results.length === 1 ? "" : "s"}
      </p>
      <ul className="border-border bg-surface divide-border divide-y overflow-hidden rounded-xl border">
        {results.map((result) => (
          <li
            key={result.documentId}
            className="hover:bg-muted/40 relative px-4 py-3 transition-colors"
          >
            <Link
              href={`/documents/${result.documentId}`}
              className="flex items-center gap-2 after:absolute after:inset-0"
            >
              <FileText className="text-primary size-4 shrink-0" aria-hidden />
              <span className="truncate text-sm font-medium">{result.title}</span>
              {result.score !== null && (
                <span
                  className="text-muted-foreground ml-auto shrink-0 text-[10px] tabular-nums"
                  title="Relevance"
                >
                  {Math.round(result.score * 100)}%
                </span>
              )}
            </Link>
            {result.snippet ? (
              <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                {result.snippet}
              </p>
            ) : (
              <p className="text-muted-foreground mt-1 text-xs italic">Title match</p>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
