import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Check,
  Command,
  FileDown,
  FileSearch,
  Folders,
  GitCompareArrows,
  MessageSquareText,
  PenLine,
  ScrollText,
  Sparkles,
  SquareSlash,
  Tags,
} from "lucide-react";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/layout/site-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { HeroSyncDemo } from "@/components/marketing/hero-sync-demo";
import { DiffComparison } from "@/components/marketing/diff-comparison";
import { FeatureOutline } from "@/components/marketing/feature-outline";
import { DashboardMock } from "@/components/marketing/dashboard-mock";
import { BrowserFrame, Caret, SectionLabel } from "@/components/marketing/parts";
import { AiArt, SecurityArt } from "@/components/marketing/feature-art";

const WORKSPACE_NOTES = [
  {
    title: "Everything in one table",
    body: "Search, filter by role or tag, sort, and switch between table and grid.",
  },
  {
    title: "Organised your way",
    body: "Personal folders, favourites and tags never change what collaborators see.",
  },
  {
    title: "Always tells you the truth",
    body: "A quiet status line says whether changes are syncing live or saved locally.",
  },
];

const AI_FEATURES = [
  {
    icon: ScrollText,
    title: "Summaries and action items",
    body: "A TL;DR and owners for every to-do.",
  },
  {
    icon: MessageSquareText,
    title: "Ask your workspace",
    body: "Grounded answers, with numbered sources.",
  },
  { icon: FileSearch, title: "Semantic search", body: "Find a document by what it means." },
  { icon: PenLine, title: "Rewrite and autocomplete", body: "Applied as normal, mergeable edits." },
  {
    icon: GitCompareArrows,
    title: "What changed",
    body: "The diff between versions, in plain English.",
  },
  { icon: Tags, title: "Suggested titles and tags", body: "A tidy workspace without the effort." },
];

const NUMBERS = [
  { value: "3", label: "independent authorization layers" },
  { value: "0", label: "conflict dialogs, by construction" },
  { value: "1 MB", label: "request cap, checked before buffering" },
  { value: "60 s", label: "maximum lifetime of a real-time token" },
];

const MORE = [
  {
    icon: MessageSquareText,
    title: "Comments and mentions",
    body: "Threaded comments anchored to the text, with @mentions and notifications.",
  },
  {
    icon: SquareSlash,
    title: "Slash commands",
    body: "Type / for headings, checklists, tables, quotes and dividers.",
  },
  {
    icon: FileDown,
    title: "Import and export",
    body: "Bring in Markdown. Export to Markdown, HTML or PDF.",
  },
  {
    icon: Folders,
    title: "Folders and favourites",
    body: "Personal folders and stars that never change what others see.",
  },
  {
    icon: Command,
    title: "Command palette",
    body: "Press Ctrl K to jump to any document or run any action.",
  },
  {
    icon: Bell,
    title: "Activity and notifications",
    body: "A per-document activity feed, and a bell for what needs you.",
  },
];

export default async function HomePage() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const primaryHref = signedIn ? "/dashboard" : "/sign-up";

  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingHeader signedIn={signedIn} />

      <main id="main-content" className="flex-1 overflow-x-clip">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative">
          <div
            className="bg-wash pointer-events-none absolute inset-x-0 top-0 h-[640px]"
            aria-hidden
          />

          <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
            <div className="mx-auto max-w-4xl text-center">
              <p className="border-border bg-surface text-muted-foreground inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium shadow-xs">
                <span className="relative flex size-2" aria-hidden>
                  <span className="bg-success absolute inline-flex size-full animate-[pulse-ring_2.4s_ease-out_infinite] rounded-full" />
                  <span className="bg-success relative inline-flex size-2 rounded-full" />
                </span>
                Local-first · real-time · AI built in
              </p>

              <h1 className="font-display mt-7 text-[2.9rem] leading-[1.05] sm:text-7xl lg:text-[5.25rem]">
                Write together
                <Caret name="Aisha" color="#e5484d" className="hidden sm:inline-block" />.{" "}
                <span className="text-primary whitespace-nowrap">Even offline.</span>
              </h1>

              <p className="text-muted-foreground mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-balance sm:text-xl">
                CollabDoc is a document workspace that saves every keystroke on your device first,
                syncs in real time when it can, and merges everyone&apos;s work without a single
                conflict dialog.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href={primaryHref}>
                    {signedIn ? "Open your workspace" : "Start writing — it's free"}
                    <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                  <Link href="/lab">Open the sync lab</Link>
                </Button>
              </div>

              <ul className="text-muted-foreground mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
                {["Works with no connection", "Real-time cursors", "No conflict dialogs"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <Check className="text-primary size-4" strokeWidth={2.5} aria-hidden />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* The product's core behaviour, playable, on a dotted stage. */}
            <div className="border-border bg-subtle relative mx-auto mt-14 max-w-5xl overflow-hidden rounded-[28px] border p-3 sm:mt-16 sm:p-8">
              <div className="bg-dotgrid pointer-events-none absolute inset-0" aria-hidden />
              <p className="text-muted-foreground relative mb-4 text-center text-sm">
                Try it: switch{" "}
                <span className="text-foreground font-medium">Marco&apos;s network</span> off and
                back on.
              </p>
              <div className="relative">
                <HeroSyncDemo />
              </div>
            </div>
          </div>
        </section>

        {/* ── Built-with strip ─────────────────────────────────────────── */}
        <section className="border-border border-y" aria-label="Technology">
          <div className="text-muted-foreground mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-9 gap-y-2 px-4 py-5 text-sm font-medium sm:px-6">
            <span className="text-foreground">Built with</span>
            {[
              "Next.js 16",
              "React 19",
              "Yjs",
              "Hocuspocus",
              "TipTap",
              "Postgres + RLS",
              "pgvector",
              "Gemini",
            ].map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
        </section>

        {/* ── Why (as a diff) ──────────────────────────────────────────── */}
        <section id="how-it-works" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <div>
              <SectionLabel>Why CollabDoc</SectionLabel>
              <h2 className="font-display mt-5 text-4xl leading-[1.1] text-balance sm:text-5xl">
                Most editors break when the network does.{" "}
                <span className="text-primary">This one can&apos;t.</span>
              </h2>
              <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
                The difference is one decision: your device, not a server, is where the document
                lives. Everything on the right follows from that.
              </p>
              <Button asChild variant="secondary" className="mt-8">
                <Link href="/lab">
                  Prove it in the sync lab
                  <ArrowRight />
                </Link>
              </Button>
            </div>

            <DiffComparison />
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────────────── */}
        <section
          id="features"
          className="border-border bg-subtle scroll-mt-20 border-y py-20 sm:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <SectionLabel>Features</SectionLabel>
              <h2 className="font-display mt-5 text-4xl leading-[1.1] text-balance sm:text-5xl">
                Everything a team needs to <span className="text-primary">write as one</span>
              </h2>
              <p className="text-muted-foreground mt-4 text-lg leading-relaxed text-balance">
                The network is an optimisation, not a dependency. These four ideas are what make
                that true.
              </p>
            </div>
            <div className="mt-14">
              <FeatureOutline />
            </div>
          </div>
        </section>

        {/* ── The workspace ────────────────────────────────────────────── */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <SectionLabel>Workspace</SectionLabel>
              <h2 className="font-display mt-5 text-4xl leading-[1.1] text-balance sm:text-5xl">
                A home for every document you own or share
              </h2>
            </div>

            <BrowserFrame url="collabdoc.app/dashboard" className="mx-auto mt-12 max-w-5xl">
              <DashboardMock />
            </BrowserFrame>

            <ul className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
              {WORKSPACE_NOTES.map((note) => (
                <li key={note.title} className="flex gap-3">
                  <span className="bg-primary-subtle text-primary mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-lg">{note.title}</h3>
                    <p className="text-muted-foreground mt-1 text-[15px] leading-relaxed">
                      {note.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── AI ───────────────────────────────────────────────────────── */}
        <section id="ai" className="border-border bg-subtle scroll-mt-20 border-y py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionLabel>AI assistant</SectionLabel>
              <h2 className="font-display mt-5 text-4xl leading-[1.1] text-balance sm:text-5xl">
                AI that reads your documents —{" "}
                <span className="text-primary">only the ones you can open</span>
              </h2>
              <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
                Retrieval is joined against your permissions inside Postgres, so an answer can never
                cite a document you aren&apos;t allowed to see. Every AI edit lands as an ordinary,
                mergeable change.
              </p>
              <ul className="mt-9 grid gap-x-8 gap-y-6 sm:grid-cols-2">
                {AI_FEATURES.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex gap-3">
                    <span className="bg-surface border-border text-primary flex size-9 shrink-0 items-center justify-center rounded-lg border shadow-xs">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold">{title}</h3>
                      <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">{body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-border bg-surface overflow-hidden rounded-3xl border shadow-lg">
              <div className="border-border flex items-center justify-between border-b px-5 py-3.5">
                <p className="flex items-center gap-2.5 text-sm font-semibold">
                  <span className="bg-primary-subtle text-primary flex size-7 items-center justify-center rounded-lg">
                    <Sparkles className="size-4" aria-hidden />
                  </span>
                  Ask your workspace
                </p>
                <span className="bg-success-subtle text-success rounded-full px-2 py-0.5 text-xs font-medium">
                  Grounded
                </span>
              </div>
              <div className="h-80">
                <div className="h-full sm:[zoom:1.2]">
                  <AiArt />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Security ─────────────────────────────────────────────────── */}
        <section id="security" className="scroll-mt-20 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="border-border bg-subtle relative overflow-hidden rounded-3xl border lg:order-2">
                <div className="bg-dotgrid absolute inset-0" aria-hidden />
                <div className="relative h-80">
                  <div className="h-full sm:[zoom:1.2]">
                    <SecurityArt />
                  </div>
                </div>
              </div>

              <div>
                <SectionLabel>Security</SectionLabel>
                <h2 className="font-display mt-5 text-4xl leading-[1.1] text-balance sm:text-5xl">
                  Enforced in three places, <span className="text-primary">not one</span>
                </h2>
                <p className="text-muted-foreground mt-5 text-lg leading-relaxed">
                  Every request is checked by the API, every real-time connection by the collab
                  server, and every row by Postgres itself. Oversized payloads are refused before
                  they&apos;re buffered, and endpoints are rate limited — fail closed, never open.
                </p>
                <dl className="mt-9 grid grid-cols-2 gap-3">
                  {NUMBERS.map((item) => (
                    <div key={item.label} className="card flex flex-col rounded-2xl p-4">
                      <dt className="text-muted-foreground order-2 mt-1 text-sm leading-snug">
                        {item.label}
                      </dt>
                      <dd className="font-display text-3xl">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* The rest of the product, compactly. */}
            <div className="mt-24">
              <div className="mx-auto max-w-2xl text-center">
                <SectionLabel>And more</SectionLabel>
                <h2 className="font-display mt-5 text-3xl leading-[1.12] text-balance sm:text-4xl">
                  The details that make it a daily driver
                </h2>
              </div>
              <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {MORE.map(({ icon: Icon, title, body }) => (
                  <li
                    key={title}
                    className="card rounded-2xl p-6 transition-shadow hover:shadow-md"
                  >
                    <span className="bg-primary-subtle text-primary flex size-10 items-center justify-center rounded-xl">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="font-display mt-4 text-lg">{title}</h3>
                    <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────── */}
        <section className="pb-20 sm:pb-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="bg-primary-solid relative overflow-hidden rounded-[28px] px-6 py-14 text-center text-white sm:px-12 sm:py-20">
              <div
                className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_90%_at_50%_50%,#000_10%,transparent_80%)]"
                style={{
                  backgroundImage: "radial-gradient(rgb(255 255 255 / 0.28) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
                aria-hidden
              />
              <div className="relative">
                <SectionLabel inverted>Get started</SectionLabel>
                <h2 className="font-display mx-auto mt-5 max-w-3xl text-4xl leading-[1.08] text-balance sm:text-6xl">
                  Your next draft shouldn&apos;t wait for Wi-Fi
                </h2>
                <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/80 sm:text-lg">
                  Create an account in seconds. Your first document is stored on this device before
                  it ever reaches a server.
                </p>
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href={primaryHref}
                    className="text-primary-solid inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold shadow-sm transition-colors hover:bg-white/90 sm:w-auto"
                  >
                    {signedIn ? "Open your workspace" : "Create your workspace"}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                  <Link
                    href="/lab"
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/35 px-6 text-[15px] font-semibold transition-colors hover:bg-white/10 sm:w-auto"
                  >
                    Open the sync lab
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
