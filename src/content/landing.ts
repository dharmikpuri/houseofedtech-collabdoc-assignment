import type { ComponentType } from "react";

import {
  GlyphAt,
  GlyphBell,
  GlyphChat,
  GlyphCommand,
  GlyphCompare,
  GlyphCursor,
  GlyphDevice,
  GlyphDocument,
  GlyphExport,
  GlyphFolder,
  GlyphHistory,
  GlyphKey,
  GlyphLock,
  GlyphMerge,
  GlyphOffline,
  GlyphQueue,
  GlyphRestore,
  GlyphSearch,
  GlyphShield,
  GlyphSignal,
  GlyphSparkle,
  GlyphUsers,
} from "@/components/brand/glyphs";
import { LANDING_IDS, type LandingSection } from "@/config/routes";
import { SITE } from "@/config/site";

/**
 * Every word on the landing page. The section components only lay this out,
 * so copy changes happen here without touching markup.
 */

export type Glyph = ComponentType<{ className?: string }>;

/** A call to action whose label depends on whether the visitor is signed in. */
export type AuthAwareLabel = { signedIn: string; signedOut: string };

export const pickLabel = (label: AuthAwareLabel, signedIn: boolean) =>
  signedIn ? label.signedIn : label.signedOut;

// ── Hero ─────────────────────────────────────────────────────────────────────

export const HERO = {
  /** One array per line (lines break on large screens); `accent` is emphasised. */
  headline: [
    [{ text: "Write together " }, { text: "in real time", accent: true }, { text: ", " }],
    [{ text: "keep writing " }, { text: "when you're offline", accent: true }, { text: ", " }],
    [{ text: "and merge without conflicts." }],
  ] as { text: string; accent?: boolean }[][],
  presence: { title: "3 people editing", detail: "Launch plan · one of them offline" },
  description: `${SITE.name} saves every keystroke on your device first, syncs live when there's a connection, and merges everyone's work automatically — no frozen pages, no lost paragraphs.`,
  demoCta: "Watch it merge",
  primaryCta: { signedIn: "Open your workspace", signedOut: "Start writing — it's free" },
  demoHint: { before: "Try it: switch", emphasis: "Marco's network", after: "off and back on." },
  highlights: [
    { section: "features", label: "Offline editing", icon: GlyphOffline },
    { section: "howItWorks", label: "Conflict-free merge", icon: GlyphMerge },
    { section: "history", label: "Version history", icon: GlyphHistory },
    { section: "ai", label: "AI assistant", icon: GlyphSparkle },
    { section: "security", label: "Privacy", icon: GlyphShield },
  ] as { section: LandingSection; label: string; icon: Glyph }[],
  /** Cards floating beside the demo on wide screens. */
  queueCard: {
    title: "Marco · offline",
    detail: "2 edits on his phone",
    items: ["Edited “Launch plan”", "Added tag “launch”"],
  },
  versionCard: {
    title: "Version saved",
    detail: "“Before review” · v12",
    compare: "Compare",
    restore: "Restore",
  },
} as const;

// ── Feature rows ─────────────────────────────────────────────────────────────

export type FeatureVisualKey = "offline" | "merge" | "history" | "ask" | "security";

export type Feature = {
  id: string;
  label: string;
  title: string;
  accent: string;
  body: string;
  points: { icon: Glyph; label: string }[];
  visual: FeatureVisualKey;
  /** Visual on the left instead of the right. */
  reverse?: boolean;
};

export const FEATURES = {
  offline: {
    id: LANDING_IDS.features,
    label: "Works offline",
    title: "Keep writing when the",
    accent: "network drops out",
    body: "Every keystroke is written to your device before anything else happens. Lose the connection mid-sentence and nothing changes — edits and actions queue up and replay in order the moment you're back.",
    points: [
      { icon: GlyphDevice, label: "Saved on your device first" },
      { icon: GlyphOffline, label: "Opens with no connection" },
      { icon: GlyphQueue, label: "Actions replay in order" },
      { icon: GlyphSignal, label: "Sync status you can trust" },
    ],
    visual: "offline",
  },
  merge: {
    id: LANDING_IDS.howItWorks,
    label: "Conflict-free merge",
    title: "Two people, one paragraph,",
    accent: "zero conflicts",
    body: "Two people can change the same sentence at the same moment — even with one of them offline — and both changes are kept. Nobody's work gets overwritten, and there are no “keep yours or theirs?” dialogs.",
    points: [
      { icon: GlyphMerge, label: "Automatic merging" },
      { icon: GlyphCursor, label: "Live cursors and presence" },
      { icon: GlyphChat, label: "Comments survive edits" },
      { icon: GlyphUsers, label: "Any number of editors" },
    ],
    visual: "merge",
    reverse: true,
  },
  history: {
    id: LANDING_IDS.history,
    label: "Version history",
    title: "Every version,",
    accent: "one click away",
    body: "Name a snapshot, compare any two versions word by word, and restore without fear: your current draft is saved first and the old content returns as a new edit, so live collaborators lose nothing.",
    points: [
      { icon: GlyphHistory, label: "Named snapshots" },
      { icon: GlyphCompare, label: "Word-level compare" },
      { icon: GlyphRestore, label: "Non-destructive restore" },
      { icon: GlyphSparkle, label: "“What changed” summaries" },
    ],
    visual: "history",
  },
  ai: {
    id: LANDING_IDS.ai,
    label: "AI assistant",
    title: "Ask your documents",
    accent: "anything",
    body: "Summaries, action items and answers with numbered sources. The assistant only reads documents you can open, so an answer never cites something you shouldn't see.",
    points: [
      { icon: GlyphSparkle, label: "Summaries and action items" },
      { icon: GlyphSearch, label: "Semantic search" },
      { icon: GlyphChat, label: "Answers with sources" },
      { icon: GlyphDocument, label: "Rewrite and autocomplete" },
    ],
    visual: "ask",
    reverse: true,
  },
  security: {
    id: LANDING_IDS.security,
    label: "Privacy & sharing",
    title: "Private by default,",
    accent: "shared on your terms",
    body: "Only the people you invite can open a document, and their role decides what they can do. Every action is checked on our servers too, so what you see is only ever what you're allowed to see.",
    points: [
      { icon: GlyphLock, label: "Invite-only documents" },
      { icon: GlyphUsers, label: "Owner, Editor, Viewer roles" },
      { icon: GlyphKey, label: "Links you can expire or revoke" },
      { icon: GlyphShield, label: "Checked on every action" },
    ],
    visual: "security",
  },
} satisfies Record<string, Feature>;

// ── At a glance ──────────────────────────────────────────────────────────────

export const GLANCE = {
  heading: `${SITE.name} at a glance`,
  stats: [
    { value: "0", label: "conflict dialogs to deal with" },
    { value: "3", label: "roles: Owner, Editor and Viewer" },
    { value: "500", label: "versions kept per document" },
    { value: "1 click", label: "to restore any version" },
  ],
  cta: {
    title: "Start your next document",
    accent: "the local-first way",
    button: { signedIn: "Open your workspace", signedOut: "Try it free" },
  },
} as const;

// ── Workspace showcase ───────────────────────────────────────────────────────

export const WORKSPACE = {
  label: "Workspace",
  title: "A home for every document",
  accent: "you own or share",
  description:
    "Folders, favourites and tags that are yours alone, a table you can search and sort, and a status line that always tells you the truth about sync.",
  frameUrl: "collabdoc.app/dashboard",
  tiles: [
    {
      icon: GlyphUsers,
      title: "Shared with you",
      detail: "5 documents",
      position: "top-24 -left-[11rem]",
    },
    {
      icon: GlyphFolder,
      title: "Launch",
      detail: "Folder · 3 documents",
      position: "-right-[11.5rem] bottom-24",
    },
  ] as { icon: Glyph; title: string; detail: string; position: string }[],
} as const;

// ── Bento ────────────────────────────────────────────────────────────────────

export type BentoArtKey = "cursors" | "comments" | "sharing" | "export";

export const BENTO = {
  label: "And more",
  title: "The details that make it",
  accent: "a daily driver",
  cards: [
    {
      icon: GlyphCursor,
      label: "Live presence",
      title: "See who's here, and where they're typing",
      body: "Named carets, selections and avatars for everyone in the document — on any device.",
      art: "cursors",
      tall: true,
    },
    {
      icon: GlyphAt,
      label: "Comments",
      title: "Discuss right on the text",
      body: "Threads anchored to a phrase, with @mentions and notifications.",
      art: "comments",
    },
    {
      icon: GlyphUsers,
      label: "Sharing",
      title: "Roles enforced everywhere",
      body: "Invite by email or link. Owner, Editor and Viewer mean the same thing in every layer.",
      art: "sharing",
      tall: true,
    },
    {
      icon: GlyphExport,
      label: "Import & export",
      title: "Markdown in, anything out",
      body: "Bring in Markdown; export to Markdown, HTML or PDF.",
      art: "export",
    },
  ] as {
    icon: Glyph;
    label: string;
    title: string;
    body: string;
    art: BentoArtKey;
    tall?: boolean;
  }[],
  extras: [
    {
      icon: GlyphCommand,
      title: "Command palette",
      body: "Ctrl K to jump to any document or run any action.",
    },
    {
      icon: GlyphFolder,
      title: "Folders, tags and favourites",
      body: "Organise your way without changing what others see.",
    },
    {
      icon: GlyphBell,
      title: "Activity and notifications",
      body: "A feed per document, and a bell for what needs you.",
    },
  ] as { icon: Glyph; title: string; body: string }[],
} as const;

// ── FAQ ──────────────────────────────────────────────────────────────────────

export const FAQ = {
  title: "Frequently asked questions",
  items: [
    {
      q: `What is ${SITE.name}?`,
      a: "A collaborative document editor that works offline. Each document lives on your device first and syncs in real time with everyone else whenever there's a connection.",
    },
    {
      q: "What happens if I lose my connection mid-sentence?",
      a: "Nothing you'd notice. Edits are saved locally as you type, a status line tells you you're offline, and everything — including saved versions and renames — syncs automatically when you reconnect.",
    },
    {
      q: "How are conflicting edits resolved?",
      a: "They merge automatically. Everyone's changes are kept, and every device ends up with exactly the same text, whatever order the edits arrive in. You'll never see a “keep yours or theirs?” prompt.",
    },
    {
      q: "Can restoring an old version lose someone's work?",
      a: "No. Restore saves your current draft as a version first, then applies the old content as a new edit, so anyone typing at that moment keeps their changes.",
    },
    {
      q: "Can the AI see documents I don't have access to?",
      a: "No. Search and answers only use documents you can open — the same rule that decides what appears in your workspace.",
    },
    {
      q: "Who can see or edit my documents?",
      a: "Only the people you share with, as Owner, Editor or Viewer. Viewers can read but not change anything, and anyone you haven't invited can't open the document at all.",
    },
    {
      q: "Is it free?",
      a: "Yes. Create an account and start writing — or try the sync lab first, no account needed.",
    },
  ],
  panel: {
    title: `See ${SITE.name} in action`,
    body: "The sync lab runs the real engine in your browser — no account needed.",
    steps: [
      { icon: GlyphOffline, text: "Take one device offline" },
      { icon: GlyphCursor, text: "Type on both at the same time" },
      { icon: GlyphMerge, text: "Reconnect and watch them converge" },
    ] as { icon: Glyph; text: string }[],
    labCta: "Open the sync lab",
    accountCta: { signedIn: "Your workspace", signedOut: "Create an account" },
  },
} as const;

// ── Closing band ─────────────────────────────────────────────────────────────

export const CLOSING = {
  title: "Your next draft shouldn't wait for Wi-Fi",
  body: "Create an account in seconds. Your first document is stored on this device before it ever reaches a server.",
  primaryCta: { signedIn: "Open your workspace", signedOut: "Create your workspace" },
  labCta: "Open the sync lab",
} as const;
