const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "just now", "5 minutes ago", "yesterday", "3 weeks ago". */
export function formatRelative(value: string | Date, now = Date.now()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = date.getTime() - now;
  const abs = Math.abs(diff);
  if (Number.isNaN(abs) || abs < 45_000) return "just now";
  for (const [unit, ms] of UNITS) {
    if (abs >= ms) return formatter.format(Math.round(diff / ms), unit);
  }
  return "just now";
}
