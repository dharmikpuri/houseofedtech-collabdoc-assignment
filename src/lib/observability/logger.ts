/**
 * Structured logging.
 *
 * Production emits one JSON object per line — what log platforms (Vercel,
 * Railway, Datadog…) index and filter on. Development prints a readable line.
 * Fields whose names look sensitive are redacted *before* anything is written,
 * so a careless `log.error("…", { headers })` can't leak a session cookie.
 */

type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const SENSITIVE = /pass(word)?|secret|token|authorization|cookie|api[-_]?key|dsn|credential/i;
const MAX_DEPTH = 4;

function redact(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE.test(key) ? "[redacted]" : redact(item, depth + 1);
  }
  return out;
}

const minLevel: Level =
  (process.env.LOG_LEVEL as Level | undefined) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function write(level: Level, message: string, fields: Fields = {}) {
  if (ORDER[level] < ORDER[minLevel]) return;
  const safe = redact(fields) as Fields;

  if (process.env.NODE_ENV === "production") {
    const line = JSON.stringify({ level, time: new Date().toISOString(), message, ...safe });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
    return;
  }

  const extra = Object.keys(safe).length ? ` ${JSON.stringify(safe)}` : "";
  const text = `[${level}] ${message}${extra}`;
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

export const log = {
  debug: (message: string, fields?: Fields) => write("debug", message, fields),
  info: (message: string, fields?: Fields) => write("info", message, fields),
  warn: (message: string, fields?: Fields) => write("warn", message, fields),
  error: (message: string, fields?: Fields) => write("error", message, fields),
};

export { redact };
