/**
 * Sequence diff via longest common subsequence.
 *
 * Used twice by the version comparison: once over document blocks
 * (paragraphs, headings, list items) and once over the words inside each
 * changed block. Written in-house rather than pulled in as a dependency because
 * the requirement is narrow and the one property that matters — a hard bound on
 * cost for huge inputs — is simplest to guarantee directly.
 *
 * Cost control:
 *  - The common prefix and suffix are trimmed first. Real edits touch a small
 *    region, so the table usually covers a handful of items.
 *  - The LCS table is capped at `maxCells`. Past that, the function returns
 *    null and callers fall back to a coarser comparison instead of freezing the
 *    tab. At the default cap the table is ~8 MB and fills in a few milliseconds.
 */

export type DiffOp<T> = { type: "equal" | "insert" | "delete"; items: T[] };

type Step<T> = { type: DiffOp<T>["type"]; item: T };

const DEFAULT_MAX_CELLS = 4_000_000;

export function diffSequences<T>(
  a: readonly T[],
  b: readonly T[],
  equals: (x: T, y: T) => boolean,
  maxCells = DEFAULT_MAX_CELLS,
): DiffOp<T>[] | null {
  let start = 0;
  while (start < a.length && start < b.length && equals(a[start]!, b[start]!)) start += 1;

  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && equals(a[endA - 1]!, b[endB - 1]!)) {
    endA -= 1;
    endB -= 1;
  }

  const middle = lcsSteps(a.slice(start, endA), b.slice(start, endB), equals, maxCells);
  if (!middle) return null;

  const steps: Step<T>[] = [
    ...a.slice(0, start).map((item) => ({ type: "equal" as const, item })),
    ...middle,
    ...a.slice(endA).map((item) => ({ type: "equal" as const, item })),
  ];

  // Group consecutive steps of the same kind into runs.
  const ops: DiffOp<T>[] = [];
  for (const step of steps) {
    const last = ops[ops.length - 1];
    if (last && last.type === step.type) last.items.push(step.item);
    else ops.push({ type: step.type, items: [step.item] });
  }
  return ops;
}

function lcsSteps<T>(
  a: readonly T[],
  b: readonly T[],
  equals: (x: T, y: T) => boolean,
  maxCells: number,
): Step<T>[] | null {
  const n = a.length;
  const m = b.length;
  if (n === 0) return b.map((item) => ({ type: "insert", item }));
  if (m === 0) return a.map((item) => ({ type: "delete", item }));
  if ((n + 1) * (m + 1) > maxCells) return null;

  // lcs[i][j] = length of the LCS of a[i..] and b[j..], stored row-major. The
  // cap keeps min(n, m) ≤ 2000, so lengths always fit in 16 bits.
  const width = m + 1;
  const lcs = new Uint16Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i * width + j] = equals(a[i]!, b[j]!)
        ? lcs[(i + 1) * width + j + 1]! + 1
        : Math.max(lcs[(i + 1) * width + j]!, lcs[i * width + j + 1]!);
    }
  }

  const steps: Step<T>[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (equals(a[i]!, b[j]!)) {
      steps.push({ type: "equal", item: a[i]! });
      i += 1;
      j += 1;
    } else if (lcs[(i + 1) * width + j]! >= lcs[i * width + j + 1]!) {
      // Ties favour deletion first, so a replaced word reads "old → new".
      steps.push({ type: "delete", item: a[i]! });
      i += 1;
    } else {
      steps.push({ type: "insert", item: b[j]! });
      j += 1;
    }
  }
  while (i < n) steps.push({ type: "delete", item: a[i++]! });
  while (j < m) steps.push({ type: "insert", item: b[j++]! });
  return steps;
}
