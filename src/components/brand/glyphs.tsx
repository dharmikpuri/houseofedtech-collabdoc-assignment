import { cn } from "@/lib/utils";

/**
 * CollabDoc's filled icon set, for marketing surfaces.
 *
 * Interface chrome uses lucide's outline icons; these are the solid,
 * brand-coloured counterparts that carry feature lists and cards. Each glyph is
 * drawn on a 24-unit grid as filled shapes in `currentColor`, with inner detail
 * cut out in `--glyph-cut` (white in light mode, the page colour in dark), so
 * they read as one family at 16–28px. All are decorative.
 */

type GlyphProps = { className?: string };

const CUT = "var(--glyph-cut)";

function Glyph({ className, children }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-5 shrink-0", className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Cut-out detail drawn over a filled shape. */
function Cut({ d, width = 1.8 }: { d: string; width?: number }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={CUT}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** A filled stroke, for glyphs that are mostly line. */
function Line({ d, width = 2.4 }: { d: string; width?: number }) {
  return (
    <path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export function GlyphOffline(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M6.8 19.5a4.8 4.8 0 0 1-.7-9.55 6.4 6.4 0 0 1 12.3 1.1 4.25 4.25 0 0 1-.9 8.45H6.8Z" />
      <Cut d="M4.5 4.5 19.5 21" width={2.2} />
    </Glyph>
  );
}

export function GlyphMerge(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <Line d="M6 6.5v1.8c0 2.6 2 3.7 4.6 3.7H17" />
      <Line d="M6 17.5v-1.8c0-2.6 2-3.7 4.6-3.7" />
      <circle cx="6" cy="5" r="3" />
      <circle cx="6" cy="19" r="3" />
      <circle cx="18.5" cy="12" r="3.5" />
      <circle cx="18.5" cy="12" r="1.2" fill={CUT} />
    </Glyph>
  );
}

export function GlyphCursor(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path
        d="M4.6 3.2 19.4 9.7a.7.7 0 0 1-.06 1.3l-6.1 2.1-2.4 6.2a.7.7 0 0 1-1.31-.03L3.7 4.1a.7.7 0 0 1 .9-.9Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <Cut d="m13.6 13.4 5.4 5.4" width={2.2} />
    </Glyph>
  );
}

export function GlyphQueue(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M12 2.6 2.8 7.3a.6.6 0 0 0 0 1.07L12 13l9.2-4.63a.6.6 0 0 0 0-1.07L12 2.6Z" />
      <Line d="m3 12.3 9 4.5 9-4.5" width={2.2} />
      <Line d="m3 16.6 9 4.5 9-4.5" width={2.2} />
    </Glyph>
  );
}

export function GlyphSignal(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <Line d="M2.5 9.2a13.5 13.5 0 0 1 19 0" />
      <Line d="M5.8 12.6a8.8 8.8 0 0 1 12.4 0" />
      <Line d="M9.1 16a4.1 4.1 0 0 1 5.8 0" />
      <circle cx="12" cy="19.4" r="1.9" />
    </Glyph>
  );
}

export function GlyphDevice(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <rect x="3.5" y="3.5" width="17" height="12" rx="2.2" />
      <path d="M1.5 17.5h21v.8a2.2 2.2 0 0 1-2.2 2.2H3.7a2.2 2.2 0 0 1-2.2-2.2v-.8Z" />
      <Cut d="M7.5 8h5M7.5 11h8" />
    </Glyph>
  );
}

export function GlyphShield(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M12 2.2 19.6 5a1 1 0 0 1 .65.94V11c0 4.9-3.3 9.2-7.95 10.8a1 1 0 0 1-.6 0C7.05 20.2 3.75 15.9 3.75 11V5.94A1 1 0 0 1 4.4 5L12 2.2Z" />
      <Cut d="m8.6 11.8 2.4 2.4 4.6-4.8" width={2} />
    </Glyph>
  );
}

export function GlyphLock(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <Line d="M7.8 10.5V7.6a4.2 4.2 0 0 1 8.4 0v2.9" />
      <rect x="4" y="9.6" width="16" height="12.4" rx="3" />
      <Cut d="M12 14.6v2.6" width={2.2} />
    </Glyph>
  );
}

export function GlyphKey(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <Line d="M11.5 12.5 20.5 3.5M17 7l2.6 2.6M14.6 9.4l1.8 1.8" />
      <circle cx="8" cy="16" r="5.6" />
      <circle cx="7" cy="17" r="1.7" fill={CUT} />
    </Glyph>
  );
}

export function GlyphChat(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M5.5 3h13A3.5 3.5 0 0 1 22 6.5v7.5a3.5 3.5 0 0 1-3.5 3.5h-6.2l-5 3.8a.6.6 0 0 1-.96-.48V17.5h-.84A3.5 3.5 0 0 1 2 14V6.5A3.5 3.5 0 0 1 5.5 3Z" />
      <Cut d="M7 8.4h10M7 12h6" />
    </Glyph>
  );
}

export function GlyphAt(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="10" />
      <Cut d="M15 12a3 3 0 1 1-1-2.24M15 9.5V13a1.8 1.8 0 0 0 3.5.6" width={1.8} />
    </Glyph>
  );
}

export function GlyphHistory(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="10" />
      <Cut d="M12 6.8V12l3.4 2.1" width={2} />
    </Glyph>
  );
}

export function GlyphCompare(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <rect x="2" y="3.5" width="9" height="17" rx="2.2" opacity="0.45" />
      <rect x="13" y="3.5" width="9" height="17" rx="2.2" />
      <Cut d="M15.6 8h3.8M15.6 11.5h3.8M15.6 15h2.4" width={1.6} />
    </Glyph>
  );
}

export function GlyphRestore(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <Line d="M4.6 13a7.6 7.6 0 1 0 2.2-6.1" />
      <path d="M3.4 3.6v5.9a.8.8 0 0 0 .8.8h5.9a.6.6 0 0 0 .42-1.02L4.42 3.18a.6.6 0 0 0-1.02.42Z" />
    </Glyph>
  );
}

export function GlyphSparkle(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M10 4.2c.75 5.1 3.8 8.15 8.9 8.9-5.1.75-8.15 3.8-8.9 8.9-.75-5.1-3.8-8.15-8.9-8.9 5.1-.75 8.15-3.8 8.9-8.9Z" />
      <path d="M19 1.6c.32 1.95 1.45 3.08 3.4 3.4-1.95.32-3.08 1.45-3.4 3.4-.32-1.95-1.45-3.08-3.4-3.4 1.95-.32 3.08-1.45 3.4-3.4Z" />
    </Glyph>
  );
}

export function GlyphSearch(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <Line d="m16.2 16.2 5.2 5.2" width={3} />
      <circle cx="10.5" cy="10.5" r="8" />
      <Cut d="M7.2 9.6a3.6 3.6 0 0 1 3-3" width={1.8} />
    </Glyph>
  );
}

export function GlyphDocument(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M6.2 2h7.3c.53 0 1.04.21 1.41.59l4.5 4.5c.38.37.59.88.59 1.41V19.8A2.2 2.2 0 0 1 17.8 22H6.2A2.2 2.2 0 0 1 4 19.8V4.2A2.2 2.2 0 0 1 6.2 2Z" />
      <Cut d="M8 12.6h8M8 16.4h5.5" />
      <Cut d="M13.8 2.6v4.1c0 .6.5 1.1 1.1 1.1h4.1" width={1.4} />
    </Glyph>
  );
}

export function GlyphExport(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M3.5 13.2a1.2 1.2 0 0 1 2.4 0v4.6c0 .17.13.3.3.3h11.6a.3.3 0 0 0 .3-.3v-4.6a1.2 1.2 0 0 1 2.4 0v4.6a2.7 2.7 0 0 1-2.7 2.7H6.2a2.7 2.7 0 0 1-2.7-2.7v-4.6Z" />
      <Line d="M12 15V4.5" />
      <path d="M12 2.4a1 1 0 0 1 .72.3l3.9 4.1a.7.7 0 0 1-.5 1.2H7.88a.7.7 0 0 1-.5-1.2l3.9-4.1a1 1 0 0 1 .72-.3Z" />
    </Glyph>
  );
}

export function GlyphFolder(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M2 6.2A2.2 2.2 0 0 1 4.2 4h4.5c.6 0 1.16.27 1.54.73L11.6 6.4h8.2A2.2 2.2 0 0 1 22 8.6v9.2a2.2 2.2 0 0 1-2.2 2.2H4.2A2.2 2.2 0 0 1 2 17.8V6.2Z" />
      <Cut d="M2.6 9.6h18.8" width={1.5} />
    </Glyph>
  );
}

export function GlyphCommand(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <rect x="2" y="3" width="20" height="18" rx="4.5" />
      <Cut d="m7 9 3 3-3 3M12.5 15H17" width={2} />
    </Glyph>
  );
}

export function GlyphBell(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M12 2.5a6.5 6.5 0 0 0-6.5 6.5v3.6l-1.7 3a1 1 0 0 0 .87 1.5h14.66a1 1 0 0 0 .87-1.5l-1.7-3V9A6.5 6.5 0 0 0 12 2.5Z" />
      <path d="M9.2 18.6h5.6a2.8 2.8 0 0 1-5.6 0Z" />
    </Glyph>
  );
}

export function GlyphUsers(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="16.6" cy="7.6" r="3.2" opacity="0.45" />
      <path d="M12.6 20.5a5 5 0 0 1 9.4-2.4v1.2a1.2 1.2 0 0 1-1.2 1.2h-8.2Z" opacity="0.45" />
      <circle cx="9" cy="7.8" r="4" />
      <path d="M1.6 20.2a7.4 7.4 0 0 1 14.8 0 1 1 0 0 1-1 1.1H2.6a1 1 0 0 1-1-1.1Z" />
    </Glyph>
  );
}

export function GlyphBolt(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M13.6 1.9a.6.6 0 0 1 1.07.47l-1.3 7.3h6.03a.6.6 0 0 1 .47.97L10.4 22.1a.6.6 0 0 1-1.07-.47l1.3-7.3H4.6a.6.6 0 0 1-.47-.97L13.6 1.9Z" />
    </Glyph>
  );
}

export function GlyphCheck(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="10" />
      <Cut d="m7.6 12.2 3 3 5.8-6" width={2.2} />
    </Glyph>
  );
}

export function GlyphPlay(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="10.5" />
      <path
        d="M10.1 8.1a.6.6 0 0 0-.9.52v6.76a.6.6 0 0 0 .9.52l5.8-3.38a.6.6 0 0 0 0-1.04l-5.8-3.38Z"
        fill={CUT}
      />
    </Glyph>
  );
}
