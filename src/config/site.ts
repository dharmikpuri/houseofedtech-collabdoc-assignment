/**
 * Product identity: name, descriptions, author and brand colours.
 *
 * Interface colours live as CSS tokens in `src/app/globals.css`; the values
 * here are only for places CSS can't reach (metadata, the browser theme colour,
 * SVG brand marks). Keep the two in step when the brand changes.
 */

export const SITE = {
  name: "CollabDoc",
  tagline: "Write together. Even offline.",
  description:
    "A collaborative document workspace that keeps working without the internet. Real-time editing, safe version history, invite-only sharing and an AI assistant that reads your documents.",
  shortDescription:
    "Collaborative documents that keep working offline, with version history, invite-only sharing and an AI assistant.",
} as const;

export const AUTHOR = {
  name: "Dharmik Puri Goswami",
  github: "https://github.com/dharmikpuri",
  linkedin: "https://www.linkedin.com/in/dharmikpurigoswami/",
} as const;

/** Brand colours for non-CSS contexts. */
export const BRAND_COLORS = {
  primary: "#4f5ff5",
  backgroundLight: "#ffffff",
  backgroundDark: "#0a0c16",
} as const;

/**
 * The people in the product's demos and illustrations, so every visual
 * agrees on who is who.
 */
export const PERSONAS = {
  aisha: { name: "Aisha", initial: "A", color: "#e5484d" },
  marco: { name: "Marco", initial: "M", color: "#0e9f8e" },
  priya: { name: "Priya", initial: "P", color: "#d97706" },
} as const;

export type Persona = (typeof PERSONAS)[keyof typeof PERSONAS];
