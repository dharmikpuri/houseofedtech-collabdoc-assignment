/** Thread ids from the server are validated to this alphabet; nothing else is styled. */
const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Highlight rules for comment anchors.
 *
 * Generated only from ids the server returned (or the local draft id we
 * minted) — never from marks found in the document — so a crafted mark from a
 * collaborator can't inject CSS. Resolved threads get no highlight.
 */
export function CommentHighlights({
  openIds,
  activeId,
}: {
  openIds: string[];
  activeId: string | null;
}) {
  const safe = openIds.filter((id) => SAFE_ID.test(id));
  if (safe.length === 0) return null;

  const selector = (id: string) => `.ProseMirror [data-thread-id="${id}"]`;
  let css = `${safe.map(selector).join(",")}{background:color-mix(in oklab,var(--warning) 20%,transparent);border-bottom:2px solid color-mix(in oklab,var(--warning) 70%,transparent);cursor:pointer;border-radius:2px}`;
  if (activeId && SAFE_ID.test(activeId) && safe.includes(activeId)) {
    css += `${selector(activeId)}{background:color-mix(in oklab,var(--warning) 42%,transparent);border-bottom-color:var(--warning)}`;
  }
  return <style>{css}</style>;
}
