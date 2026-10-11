"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlertCircle,
  ArrowUp,
  CheckSquare,
  Lightbulb,
  RefreshCw,
  ScrollText,
  Sparkles,
  Square,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { AiText } from "@/components/ai/ai-text";
import { streamAi } from "@/lib/ai/read-stream";

type AnalyzeTask = "summary" | "action-items" | "key-insights";

const TASKS: { id: AnalyzeTask; label: string; icon: typeof ScrollText; blurb: string }[] = [
  {
    id: "summary",
    label: "Summary",
    icon: ScrollText,
    blurb: "An executive summary of this document.",
  },
  {
    id: "action-items",
    label: "Action items",
    icon: CheckSquare,
    blurb: "Every task and commitment mentioned.",
  },
  { id: "key-insights", label: "Insights", icon: Lightbulb, blurb: "The points that matter most." },
];

type Output = {
  text: string;
  streaming: boolean;
  stopped?: boolean;
  error?: string;
};

type QaTurn = { question: string } & Output;

/**
 * The document AI assistant, with streamed answers.
 *
 * Answers appear token by token and can be stopped; stopping aborts the request
 * end to end (the server cancels the model call too). Partial text is kept and
 * labelled. Screen readers aren't fed every token — the region is marked busy
 * while streaming and a single status message announces completion.
 *
 * Results are cached per task while the panel is open; Regenerate re-runs one.
 * When AI isn't configured the panel explains what to set instead of vanishing.
 */
export function AiPanel({
  documentId,
  editor,
  aiEnabled,
  canEdit,
}: {
  documentId: string;
  editor: Editor | null;
  aiEnabled: boolean;
  canEdit: boolean;
}) {
  const [task, setTask] = useState<AnalyzeTask>("summary");
  const [outputs, setOutputs] = useState<Partial<Record<AnalyzeTask, Output>>>({});
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<QaTurn[]>([]);
  const [announcement, setAnnouncement] = useState("");

  const analyzeAbort = useRef<AbortController | null>(null);
  const askAbort = useRef<AbortController | null>(null);
  const answersRef = useRef<HTMLDivElement>(null);

  // Leaving the panel cancels anything still streaming.
  useEffect(
    () => () => {
      analyzeAbort.current?.abort();
      askAbort.current?.abort();
    },
    [],
  );

  const base = `/api/documents/${encodeURIComponent(documentId)}/ai`;

  const runTask = useCallback(
    async (target: AnalyzeTask) => {
      if (!editor) return;
      analyzeAbort.current?.abort();
      const controller = new AbortController();
      analyzeAbort.current = controller;

      setOutputs((prev) => ({ ...prev, [target]: { text: "", streaming: true } }));
      const outcome = await streamAi(
        `${base}/analyze?stream=1`,
        { content: editor.getJSON(), task: target },
        {
          signal: controller.signal,
          onText: (text) =>
            setOutputs((prev) => ({ ...prev, [target]: { text, streaming: true } })),
        },
      );
      setOutputs((prev) => ({ ...prev, [target]: { ...outcome, streaming: false } }));
      if (!outcome.error) setAnnouncement(outcome.stopped ? "Stopped." : "Result ready.");
      if (analyzeAbort.current === controller) analyzeAbort.current = null;
    },
    [base, editor],
  );

  async function handleAsk(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || !editor || askAbort.current) return;

    setQuestion("");
    const controller = new AbortController();
    askAbort.current = controller;
    const index = turns.length;
    setTurns((prev) => [...prev, { question: trimmed, text: "", streaming: true }]);

    const update = (patch: Partial<QaTurn>) =>
      setTurns((prev) => prev.map((turn, i) => (i === index ? { ...turn, ...patch } : turn)));

    const outcome = await streamAi(
      `${base}/ask?stream=1`,
      { content: editor.getJSON(), question: trimmed },
      {
        signal: controller.signal,
        onText: (text) => {
          update({ text });
          answersRef.current?.scrollTo({ top: answersRef.current.scrollHeight });
        },
      },
    );
    update({ ...outcome, streaming: false });
    if (!outcome.error) setAnnouncement(outcome.stopped ? "Stopped." : "Answer ready.");
    askAbort.current = null;
    requestAnimationFrame(() =>
      answersRef.current?.scrollTo({ top: answersRef.current.scrollHeight, behavior: "smooth" }),
    );
  }

  if (!aiEnabled) {
    return (
      <div className="p-4">
        <EmptyState
          size="sm"
          icon={<Sparkles />}
          title="AI features are switched off"
          description={
            <>
              Set <code className="bg-muted rounded px-1 py-0.5 text-xs">GEMINI_API_KEY</code> in
              your environment to enable summaries, insights and document Q&amp;A.
            </>
          }
        />
      </div>
    );
  }

  const activeTask = TASKS.find((item) => item.id === task)!;
  const output = outputs[task];
  const asking = turns.some((turn) => turn.streaming);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>

      <div
        className="border-border flex gap-0.5 border-b p-1.5"
        role="tablist"
        aria-label="AI analysis"
      >
        {TASKS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={task === id}
            onClick={() => setTask(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors [&_svg]:size-3.5",
              task === id
                ? "bg-primary-subtle text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto p-3"
        aria-busy={output?.streaming || undefined}
      >
        {!output ? (
          <div className="py-6 text-center">
            <p className="text-muted-foreground mb-3 text-xs text-balance">{activeTask.blurb}</p>
            <Button size="sm" onClick={() => void runTask(task)} disabled={!editor}>
              <Sparkles />
              Generate
            </Button>
          </div>
        ) : output.streaming && !output.text ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[92%]" />
            <Skeleton className="h-3 w-[76%]" />
            <StopButton onStop={() => analyzeAbort.current?.abort()} />
          </div>
        ) : (
          <div className="space-y-2.5">
            {output.text && <AiText text={output.text} />}
            {output.streaming && <StopButton onStop={() => analyzeAbort.current?.abort()} />}
            {output.stopped && <p className="text-muted-foreground text-[11px] italic">Stopped.</p>}
            {output.error && <ErrorNote text={output.error} />}
            {!output.streaming && (
              <Button
                variant="ghost"
                size="sm"
                className="-ml-1.5"
                onClick={() => void runTask(task)}
              >
                <RefreshCw />
                {output.error ? "Try again" : "Regenerate"}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="border-border border-t">
        <div ref={answersRef} className="max-h-60 overflow-y-auto px-3 py-2.5">
          {turns.length === 0 ? (
            <p className="text-muted-foreground py-1 text-xs">
              Ask anything about this document — answers come only from its contents.
            </p>
          ) : (
            <ul className="space-y-3">
              {turns.map((turn, index) => (
                <li
                  key={index}
                  className="space-y-1.5 text-xs"
                  aria-busy={turn.streaming || undefined}
                >
                  <p className="text-foreground font-medium">{turn.question}</p>
                  {turn.text && (
                    <div className="text-muted-foreground">
                      <AiText text={turn.text} />
                    </div>
                  )}
                  {turn.streaming && !turn.text && (
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <span
                        className="bg-primary size-1.5 animate-pulse rounded-full"
                        aria-hidden
                      />
                      Thinking…
                    </p>
                  )}
                  {turn.stopped && (
                    <p className="text-muted-foreground text-[11px] italic">Stopped.</p>
                  )}
                  {turn.error && <ErrorNote text={turn.error} />}
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleAsk} className="flex items-center gap-1.5 p-2">
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask this document…"
            aria-label="Ask a question about this document"
            maxLength={500}
            disabled={!editor}
            className="h-8 text-xs"
          />
          {asking ? (
            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              onClick={() => askAbort.current?.abort()}
              aria-label="Stop answering"
            >
              <Square className="fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon-sm"
              disabled={!question.trim() || !editor}
              aria-label="Send question"
            >
              <ArrowUp />
            </Button>
          )}
        </form>
      </div>

      {canEdit && (
        <p className="text-muted-foreground border-border border-t px-3 py-2 text-[11px]">
          Tip: select text for AI rewrites, or turn on autocomplete in the toolbar.
        </p>
      )}
    </div>
  );
}

function StopButton({ onStop }: { onStop: () => void }) {
  return (
    <Button variant="secondary" size="sm" onClick={onStop}>
      <Square className="fill-current" />
      Stop
    </Button>
  );
}

function ErrorNote({ text }: { text: string }) {
  return (
    <p className="text-danger flex items-start gap-1.5 text-xs" role="alert">
      <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
      {text}
    </p>
  );
}
