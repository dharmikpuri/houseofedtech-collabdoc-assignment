/**
 * A minimal in-page command bus.
 *
 * The command palette lives in the app shell; the editor lives deep inside a
 * page. Rather than lifting editor state into a global store just so the
 * palette can say "open comments", the palette dispatches a named command and
 * whichever component owns that behaviour (if mounted) handles it.
 */

export type PanelTab = "versions" | "comments" | "outline" | "activity" | "ai";

export type AppCommand =
  | { type: "editor.open-panel"; panel: PanelTab }
  | { type: "editor.export"; format: "markdown" | "html" | "text" | "print" }
  | { type: "editor.get-content"; resolve: (content: unknown) => void };

/**
 * Asks the mounted editor for its current content (TipTap JSON). Resolves to
 * null if no editor answers — e.g. it hasn't finished loading — so callers
 * never hang.
 */
export function requestEditorContent(timeoutMs = 500): Promise<unknown> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    dispatchCommand({
      type: "editor.get-content",
      resolve: (content) => {
        window.clearTimeout(timer);
        resolve(content);
      },
    });
  });
}

const EVENT = "collabdoc:command";

export function dispatchCommand(command: AppCommand) {
  window.dispatchEvent(new CustomEvent<AppCommand>(EVENT, { detail: command }));
}

export function onCommand(handler: (command: AppCommand) => void): () => void {
  const listener = (event: Event) => handler((event as CustomEvent<AppCommand>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
