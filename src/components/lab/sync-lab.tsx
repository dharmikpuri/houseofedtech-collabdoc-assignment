"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Collaboration from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";
import {
  CheckCircle2,
  GitMerge,
  Laptop,
  Play,
  RotateCcw,
  Smartphone,
  TriangleAlert,
  Wifi,
  WifiOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Sync lab: two simulated devices editing one document, entirely in the page.
 *
 * It exists to make the CRDT's guarantees observable rather than claimed:
 *  - take either device offline and keep typing on both;
 *  - reconnect and watch them exchange only the missing updates (the same
 *    state-vector handshake the real Hocuspocus provider performs);
 *  - on every merge, the lab independently replays both devices' states in
 *    *both* orders on scratch documents and checks the results are identical —
 *    a live proof that the merge is deterministic and order-independent.
 *
 * No server, database or account is involved, so it works for anyone.
 */

type ClientId = "A" | "B";

type LogEntry = { id: number; text: string; tone: "info" | "success" | "warning" };

/** Marks updates we applied from the other device so they aren't echoed back. */
const REMOTE = Symbol("remote");

/** TipTap's Collaboration extension stores the document in this fragment. */
const FIELD = "default";

const SEED = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Launch checklist" }] },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Ship the offline sync queue on Friday." }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Review the release notes with the team." }],
    },
  ],
};

const CLIENTS: Record<ClientId, { name: string; device: string; icon: typeof Laptop }> = {
  A: { name: "Alice", device: "laptop", icon: Laptop },
  B: { name: "Bob", device: "phone", icon: Smartphone },
};

const fragmentText = (doc: Y.Doc) => doc.getXmlFragment(FIELD).toString();

export function SyncLab() {
  // Changing the key discards both documents and starts a clean session.
  const [session, setSession] = useState(0);
  return <LabSession key={session} onReset={() => setSession((value) => value + 1)} />;
}

function LabSession({ onReset }: { onReset: () => void }) {
  const [docs] = useState(() => ({ A: new Y.Doc(), B: new Y.Doc() }));

  const [online, setOnline] = useState<Record<ClientId, boolean>>({ A: true, B: true });
  const onlineRef = useRef(online);
  const [pending, setPending] = useState<Record<ClientId, number>>({ A: 0, B: 0 });
  const [converged, setConverged] = useState(true);
  const [proof, setProof] = useState<boolean | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [scenarioRunning, setScenarioRunning] = useState(false);

  const logId = useRef(0);
  const seeding = useRef(true);
  const timers = useRef<number[]>([]);

  const addLog = useCallback((text: string, tone: LogEntry["tone"] = "info") => {
    logId.current += 1;
    const entry = { id: logId.current, text, tone };
    setLog((previous) => [entry, ...previous].slice(0, 40));
  }, []);

  const checkConvergence = useCallback(() => {
    setConverged(fragmentText(docs.A) === fragmentText(docs.B));
  }, [docs]);

  // Relay local updates between the two documents while the link is up;
  // otherwise count them as pending on the device that made them.
  useEffect(() => {
    const relay = (from: ClientId) => (update: Uint8Array, origin: unknown) => {
      if (origin === REMOTE) return;
      const to: ClientId = from === "A" ? "B" : "A";
      const linkUp = onlineRef.current.A && onlineRef.current.B;

      if (linkUp) {
        Y.applyUpdate(docs[to], update, REMOTE);
      } else if (!seeding.current) {
        setPending((previous) => ({ ...previous, [from]: previous[from] + 1 }));
      }
      checkConvergence();
    };

    const onA = relay("A");
    const onB = relay("B");
    docs.A.on("update", onA);
    docs.B.on("update", onB);
    return () => {
      docs.A.off("update", onA);
      docs.B.off("update", onB);
    };
  }, [docs, checkConvergence]);

  useEffect(() => {
    const scheduled = timers.current;
    return () => {
      for (const id of scheduled) window.clearTimeout(id);
    };
  }, []);

  /**
   * The reconnect handshake. Each side sends only what the other is missing,
   * computed from the other side's state vector — the same exchange the real
   * provider performs (sync step 1/2).
   */
  const reconcile = useCallback(() => {
    const fullA = Y.encodeStateAsUpdate(docs.A);
    const fullB = Y.encodeStateAsUpdate(docs.B);

    // Determinism proof: merge both states in both orders on scratch docs.
    const ab = new Y.Doc();
    Y.applyUpdate(ab, fullA);
    Y.applyUpdate(ab, fullB);
    const ba = new Y.Doc();
    Y.applyUpdate(ba, fullB);
    Y.applyUpdate(ba, fullA);
    const orderIndependent = fragmentText(ab) === fragmentText(ba);
    ab.destroy();
    ba.destroy();

    const toB = Y.encodeStateAsUpdate(docs.A, Y.encodeStateVector(docs.B));
    const toA = Y.encodeStateAsUpdate(docs.B, Y.encodeStateVector(docs.A));
    Y.applyUpdate(docs.B, toB, REMOTE);
    Y.applyUpdate(docs.A, toA, REMOTE);

    setPending({ A: 0, B: 0 });
    setProof(orderIndependent);
    checkConvergence();

    addLog(
      `Reconnected. Exchanged state vectors and sent only the missing updates: ${toB.byteLength} bytes Alice → Bob, ${toA.byteLength} bytes Bob → Alice.`,
    );
    addLog(
      orderIndependent
        ? "Verified: merging in either order produces the identical document."
        : "Warning: merge order changed the result.",
      orderIndependent ? "success" : "warning",
    );
  }, [docs, addLog, checkConvergence]);

  const setClientOnline = useCallback(
    (id: ClientId, value: boolean) => {
      const previous = onlineRef.current;
      if (previous[id] === value) return;
      const next = { ...previous, [id]: value };
      const wasUp = previous.A && previous.B;
      const isUp = next.A && next.B;

      // Update the ref synchronously so edits made in the same tick are routed
      // correctly, before React re-renders.
      onlineRef.current = next;
      setOnline(next);

      const { name } = CLIENTS[id];
      addLog(
        value
          ? `${name}'s ${CLIENTS[id].device} is back online.`
          : `${name}'s ${CLIENTS[id].device} went offline — edits stay local.`,
        value ? "info" : "warning",
      );

      if (!wasUp && isUp) reconcile();
    },
    [addLog, reconcile],
  );

  const editorA = useLabEditor(docs.A, "Alice types here…");
  const editorB = useLabEditor(docs.B, "Bob types here…");

  // Seed the shared document once, from Alice's side, while both are online.
  useEffect(() => {
    if (!editorA || !seeding.current) return;
    if (editorA.isEmpty) editorA.commands.setContent(SEED);
    seeding.current = false;
    addLog("Both devices are connected and share the same document.", "success");
    checkConvergence();
  }, [editorA, addLog, checkConvergence]);

  function runScenario() {
    if (!editorA || !editorB || scenarioRunning) return;
    setScenarioRunning(true);
    addLog("Scenario: both devices go offline and edit the same sentence concurrently.");

    const at = (ms: number, step: () => void) => {
      timers.current.push(window.setTimeout(step, ms));
    };

    at(0, () => {
      setClientOnline("A", false);
      setClientOnline("B", false);
    });
    at(600, () => {
      // Both insert at the very same position — the classic conflict that a
      // last-write-wins system would resolve by throwing one away.
      insertIntoParagraph(editorA, "Alice: ");
      addLog("Alice inserted text at the start of the first task (offline).");
    });
    at(1100, () => {
      insertIntoParagraph(editorB, "Bob: ");
      editorB.chain().focus("end").insertContent(" Bob added a note on his phone.").run();
      addLog("Bob inserted at the same position and appended a note (offline).");
    });
    at(2000, () => {
      setClientOnline("A", true);
      setClientOnline("B", true);
      addLog(
        "Concurrent inserts at one position are ordered by client id, so every device picks the same order — nothing is lost.",
        "success",
      );
      setScenarioRunning(false);
    });
  }

  const divergent = pending.A + pending.B;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge converged={converged} pending={divergent} proof={proof} />
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={runScenario}
            disabled={scenarioRunning || !editorA || !editorB}
          >
            <Play />
            Run conflict scenario
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset} disabled={scenarioRunning}>
            <RotateCcw />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(["A", "B"] as const).map((id) => (
          <DevicePanel
            key={id}
            id={id}
            editor={id === "A" ? editorA : editorB}
            online={online[id]}
            pending={pending[id]}
            disabled={scenarioRunning}
            onToggle={() => setClientOnline(id, !online[id])}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <section className="border-border bg-surface rounded-xl border">
          <h2 className="border-border border-b px-4 py-2.5 text-xs font-semibold tracking-wide uppercase">
            Event log
          </h2>
          <ol
            role="log"
            aria-live="polite"
            aria-label="Sync events"
            className="max-h-64 space-y-1.5 overflow-y-auto px-4 py-3 text-xs"
          >
            {log.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  "leading-relaxed",
                  entry.tone === "success" && "text-success",
                  entry.tone === "warning" && "text-warning",
                  entry.tone === "info" && "text-muted-foreground",
                )}
              >
                {entry.text}
              </li>
            ))}
          </ol>
        </section>

        <section className="border-border bg-surface rounded-xl border px-4 py-3 text-xs leading-relaxed">
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
            <GitMerge className="size-3.5" aria-hidden />
            What you&apos;re seeing
          </h2>
          <ul className="text-muted-foreground list-disc space-y-1.5 pl-4">
            <li>Each device has its own copy of the document — a Yjs CRDT.</li>
            <li>
              Offline edits are applied locally and counted as pending. Nothing is sent, nothing
              blocks.
            </li>
            <li>
              On reconnect, each side sends only the updates the other lacks, computed from its
              state vector.
            </li>
            <li>
              The lab re-merges both states in both orders to prove the result doesn&apos;t depend
              on who syncs first.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function useLabEditor(doc: Y.Doc, placeholder: string) {
  return useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: doc, field: FIELD }),
        Placeholder.configure({ placeholder }),
      ],
      editorProps: {
        attributes: {
          class: "prose dark:prose-invert max-w-none min-h-40 focus:outline-none",
        },
      },
    },
    [doc],
  );
}

/** Inserts text at the start of the first paragraph after the heading. */
function insertIntoParagraph(editor: Editor, text: string) {
  let target: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (target !== null) return false;
    if (node.type.name === "paragraph") {
      target = pos + 1;
      return false;
    }
    return true;
  });
  editor
    .chain()
    .insertContentAt(target ?? 1, text)
    .run();
}

function DevicePanel({
  id,
  editor,
  online,
  pending,
  disabled,
  onToggle,
}: {
  id: ClientId;
  editor: Editor | null;
  online: boolean;
  pending: number;
  disabled: boolean;
  onToggle: () => void;
}) {
  const { name, device, icon: Icon } = CLIENTS[id];

  return (
    <section
      className={cn(
        "bg-surface flex flex-col rounded-xl border transition-colors",
        online ? "border-border" : "border-warning/50",
      )}
      aria-label={`${name}'s ${device}`}
    >
      <header className="border-border flex items-center gap-2 border-b px-4 py-2.5">
        <Icon className="text-muted-foreground size-4" aria-hidden />
        <span className="text-sm font-medium">
          {name}&apos;s {device}
        </span>
        {pending > 0 && (
          <span className="bg-warning-subtle text-warning rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums">
            {pending} pending
          </span>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-pressed={online}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
            "disabled:pointer-events-none disabled:opacity-60",
            online
              ? "border-success/30 bg-success-subtle text-success"
              : "border-warning/30 bg-warning-subtle text-warning",
          )}
        >
          {online ? (
            <Wifi className="size-3.5" aria-hidden />
          ) : (
            <WifiOff className="size-3.5" aria-hidden />
          )}
          {online ? "Online" : "Offline"}
          <span className="sr-only">— toggle {name}&apos;s connection</span>
        </button>
      </header>
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </section>
  );
}

function StatusBadge({
  converged,
  pending,
  proof,
}: {
  converged: boolean;
  pending: number;
  proof: boolean | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite">
      {converged ? (
        <span className="bg-success-subtle text-success inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
          <CheckCircle2 className="size-3.5" aria-hidden />
          Converged — both devices hold identical documents
        </span>
      ) : (
        <span className="bg-warning-subtle text-warning inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
          <TriangleAlert className="size-3.5" aria-hidden />
          Diverged — {pending} update{pending === 1 ? "" : "s"} waiting to merge
        </span>
      )}
      {proof !== null && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
            proof ? "border-success/30 text-success" : "border-danger/30 text-danger",
          )}
        >
          <GitMerge className="size-3.5" aria-hidden />
          {proof ? "Last merge verified order-independent" : "Order dependence detected"}
        </span>
      )}
    </div>
  );
}
