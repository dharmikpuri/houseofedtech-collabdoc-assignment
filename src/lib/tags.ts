/**
 * Tag normalisation, shared by the client (tag editor) and the server (AI
 * suggestions, storage) so both agree on exactly what a valid tag is:
 * lowercase, words joined by "-", only [a-z0-9-], at most 24 characters.
 */
export function normaliseTag(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
}

export const MAX_TAGS = 8;

/**
 * Soft, fixed tints for tag chips (the Notion convention): the same tag always
 * gets the same colour, so tags become recognisable at a glance. Classes are
 * written out in full so Tailwind can see them.
 */
const TAG_TINTS = [
  "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300",
  "bg-blue-100 text-blue-800 dark:bg-blue-400/15 dark:text-blue-300",
  "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300",
  "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300",
  "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300",
  "bg-teal-100 text-teal-800 dark:bg-teal-400/15 dark:text-teal-300",
] as const;

export function tagTint(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_TINTS[Math.abs(hash) % TAG_TINTS.length]!;
}
