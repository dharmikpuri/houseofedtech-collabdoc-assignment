"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

/**
 * Deterministic colour from a stable id.
 *
 * Shared with the collaboration caret so a person's presence colour in the
 * editor matches their avatar in the header — the same hash lives in
 * `colorFromId` in the editor. Hue only, with fixed S/L, so every generated
 * colour stays legible against white text in both themes.
 */
function avatarHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function avatarColor(id: string): string {
  return `hsl(${avatarHue(id)} 65% 45%)`;
}

/** First letters of the first and last word — "Ada Lovelace" → "AL". */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase();
}

const SIZES = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-xs",
  lg: "size-10 text-sm",
} as const;

export function Avatar({
  name,
  id,
  size = "md",
  src,
  className,
  ...props
}: {
  name: string;
  /** Stable identifier used to pick the colour; falls back to the name. */
  id?: string;
  size?: keyof typeof SIZES;
  src?: string;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>, "children">) {
  const seed = id ?? name;

  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full select-none",
        SIZES[size],
        className,
      )}
      {...props}
    >
      {src && (
        <AvatarPrimitive.Image src={src} alt="" className="aspect-square size-full object-cover" />
      )}
      <AvatarPrimitive.Fallback
        className="flex size-full items-center justify-center font-semibold text-white"
        style={{ backgroundColor: avatarColor(seed) }}
        // The name is conveyed by adjacent text or a tooltip; the glyph itself
        // is decorative, so keep it out of the accessibility tree.
        aria-hidden
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

/**
 * Overlapping avatars for presence. Shows up to `max`, then a "+N" chip.
 */
export function AvatarStack({
  people,
  max = 3,
  size = "sm",
  className,
}: {
  people: { id: string; name: string }[];
  max?: number;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex -space-x-1.5">
        {shown.map((person) => (
          <Avatar
            key={person.id}
            id={person.id}
            name={person.name}
            size={size}
            className="ring-surface ring-2"
            title={person.name}
          />
        ))}
      </div>
      {overflow > 0 && (
        <span className="text-muted-foreground ml-2 text-xs font-medium">+{overflow}</span>
      )}
    </div>
  );
}
