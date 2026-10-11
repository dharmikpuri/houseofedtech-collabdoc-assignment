import { Extension } from "@tiptap/react";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * Inline AI autocomplete ("ghost text").
 *
 * The suggestion is a widget decoration, not document content: it never enters
 * the CRDT, so collaborators don't see it and it can't be synced by accident.
 * Only pressing Tab inserts it, as one normal transaction.
 *
 * Any change to the document or caret invalidates the suggestion, so stale
 * text is never shown. Fetching is handled by `useAiAutocomplete`.
 */

type AutocompleteState = { suggestion: string | null; pos: number | null };

const EMPTY: AutocompleteState = { suggestion: null, pos: null };

export const autocompleteKey = new PluginKey<AutocompleteState>("aiAutocomplete");

type ViewLike = { state: EditorState; dispatch: (tr: Transaction) => void };

export function showSuggestion(view: ViewLike, suggestion: string, pos: number) {
  view.dispatch(view.state.tr.setMeta(autocompleteKey, { suggestion, pos }));
}

export function clearSuggestion(view: ViewLike) {
  if (autocompleteKey.getState(view.state)?.suggestion) {
    view.dispatch(view.state.tr.setMeta(autocompleteKey, EMPTY));
  }
}

export const AiAutocomplete = Extension.create({
  name: "aiAutocomplete",
  // Run before list keymaps, so Tab accepts a visible suggestion instead of
  // indenting — but only while a suggestion is actually shown.
  priority: 1000,

  addProseMirrorPlugins() {
    return [
      new Plugin<AutocompleteState>({
        key: autocompleteKey,
        state: {
          init: () => EMPTY,
          apply(tr, value) {
            const meta = tr.getMeta(autocompleteKey) as AutocompleteState | undefined;
            if (meta) return meta;
            if (tr.docChanged || tr.selectionSet) return EMPTY;
            return value;
          },
        },
        props: {
          decorations(state) {
            const current = autocompleteKey.getState(state);
            if (!current?.suggestion || current.pos === null) return null;
            const text = current.suggestion;
            return DecorationSet.create(state.doc, [
              Decoration.widget(
                current.pos,
                () => {
                  const element = document.createElement("span");
                  element.className = "ai-ghost";
                  element.textContent = text;
                  // Announced separately (see the editor's status region).
                  element.setAttribute("aria-hidden", "true");
                  return element;
                },
                { side: 1, key: `ai-ghost:${text}` },
              ),
            ]);
          },
          handleKeyDown(view, event) {
            const current = autocompleteKey.getState(view.state);
            if (!current?.suggestion || current.pos === null) return false;

            if (
              event.key === "Tab" &&
              !event.shiftKey &&
              !event.altKey &&
              !event.ctrlKey &&
              !event.metaKey
            ) {
              event.preventDefault();
              view.dispatch(
                view.state.tr
                  .insertText(current.suggestion, current.pos)
                  .setMeta(autocompleteKey, EMPTY),
              );
              return true;
            }
            if (event.key === "Escape") {
              view.dispatch(view.state.tr.setMeta(autocompleteKey, EMPTY));
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
