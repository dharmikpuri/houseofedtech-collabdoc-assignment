"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { slashMenuStore } from "@/components/editor/extensions/slash-command";

const MENU_WIDTH = 256;
const MENU_MAX_HEIGHT = 320;

/**
 * The "/" block menu. Keyboard handling (arrows, Enter, Escape) lives in the
 * suggestion plugin so it works while focus stays in the editor; this renders
 * the list and handles pointer selection.
 */
export function SlashMenu() {
  const state = useSyncExternalStore(
    slashMenuStore.subscribe,
    slashMenuStore.getSnapshot,
    slashMenuStore.getServerSnapshot,
  );
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the highlighted option visible when navigating a long list.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${state.index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [state.index]);

  if (!state.open || !state.rect || typeof document === "undefined") return null;

  // Flip above the caret when there isn't room below, and keep inside the viewport.
  const spaceBelow = window.innerHeight - state.rect.bottom;
  const top =
    spaceBelow < MENU_MAX_HEIGHT + 16
      ? Math.max(8, state.rect.top - MENU_MAX_HEIGHT - 6)
      : state.rect.bottom + 6;
  const left = Math.min(Math.max(8, state.rect.left), window.innerWidth - MENU_WIDTH - 8);

  return createPortal(
    <div
      ref={listRef}
      role="listbox"
      aria-label="Insert block"
      className="bg-overlay border-border fixed z-50 overflow-y-auto rounded-lg border p-1 shadow-lg"
      style={{ top, left, width: MENU_WIDTH, maxHeight: MENU_MAX_HEIGHT }}
      // Keep focus (and the suggestion range) in the editor.
      onMouseDown={(event) => event.preventDefault()}
    >
      {state.items.map((item, index) => {
        // A group heading precedes the first item of each group.
        const header =
          index === 0 || state.items[index - 1]?.group !== item.group ? item.group : null;
        return (
          <div key={item.id}>
            {header && (
              <p className="text-muted-foreground px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wide uppercase">
                {header}
              </p>
            )}
            <button
              type="button"
              role="option"
              aria-selected={index === state.index}
              data-index={index}
              onMouseEnter={() => slashMenuStore.setIndex(index)}
              onClick={() => state.select?.(item)}
              className={cn(
                "flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left transition-colors",
                index === state.index ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <span className="text-sm font-medium">{item.title}</span>
              <span className="text-muted-foreground text-xs">{item.description}</span>
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
