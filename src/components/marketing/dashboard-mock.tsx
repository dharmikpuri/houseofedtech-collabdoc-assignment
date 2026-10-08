import {
  Bell,
  FileText,
  FlaskConical,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  Star,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { tagTint } from "@/lib/tags";
import { LogoMark } from "@/components/brand/logo";

/**
 * A static, coded rendering of the workspace dashboard for the landing page.
 * It mirrors the real screen (sidebar, stat cards, documents table), so what
 * the marketing page shows is what a visitor gets after signing in.
 */

const STATS = [
  { label: "Documents", value: "24", note: "in your workspace" },
  { label: "Owned by you", value: "15", note: "you control sharing" },
  { label: "Shared with you", value: "9", note: "from collaborators" },
  { label: "Favourites", value: "5", note: "pinned for quick access" },
];

const ROWS = [
  {
    title: "Q3 launch plan",
    tags: ["launch", "planning"],
    role: "Owner",
    edited: "2 minutes ago",
    star: true,
  },
  {
    title: "Offline sync — architecture notes",
    tags: ["engineering", "crdt"],
    role: "Owner",
    edited: "1 hour ago",
    star: true,
  },
  { title: "Pricing research", tags: ["research", "pricing"], role: "Editor", edited: "Yesterday" },
  { title: "Security review checklist", tags: ["security"], role: "Viewer", edited: "2 days ago" },
  { title: "Hiring loop v2", tags: ["people"], role: "Owner", edited: "Last week" },
];

const ROLE_STYLE: Record<string, string> = {
  Owner: "bg-primary-subtle text-primary",
  Editor: "bg-info-subtle text-info",
  Viewer: "bg-muted text-muted-foreground",
};

export function DashboardMock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "border-border bg-surface flex overflow-hidden rounded-xl border text-left shadow-lg",
        className,
      )}
      aria-hidden
    >
      {/* Sidebar */}
      <div className="border-border bg-subtle hidden w-48 shrink-0 flex-col border-r p-3 md:flex">
        <div className="flex items-center gap-2 px-1 py-0.5">
          <LogoMark className="size-5" />
          <span className="font-display truncate text-[13px]">CollabDoc</span>
        </div>
        <div className="bg-primary-solid mt-3 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-medium text-white">
          <Plus className="size-3" />
          New document
        </div>
        <p className="text-muted-foreground mt-4 px-2 text-[9px] font-semibold tracking-[0.08em] uppercase">
          Workspace
        </p>
        <ul className="mt-1.5 space-y-0.5 text-[11.5px]">
          <li className="bg-primary-subtle text-primary flex items-center gap-2 rounded-md px-2 py-1.5 font-medium">
            <FileText className="size-3.5" />
            Documents
          </li>
          <li className="text-muted-foreground flex items-center gap-2 px-2 py-1.5">
            <MessageSquareText className="size-3.5" />
            Search &amp; Ask
          </li>
        </ul>
        <p className="text-muted-foreground mt-4 px-2 text-[9px] font-semibold tracking-[0.08em] uppercase">
          More
        </p>
        <ul className="mt-1.5 space-y-0.5 text-[11.5px]">
          <li className="text-muted-foreground flex items-center gap-2 px-2 py-1.5">
            <FlaskConical className="size-3.5" />
            Sync lab
          </li>
          <li className="text-muted-foreground flex items-center gap-2 px-2 py-1.5">
            <Settings className="size-3.5" />
            Settings
          </li>
        </ul>
        <p className="text-muted-foreground mt-auto flex items-center gap-1.5 px-2 pt-6 text-[10px]">
          <span className="bg-success size-1.5 rounded-full" />
          Online — changes sync live
        </p>
      </div>

      {/* Main */}
      <div className="min-w-0 flex-1">
        <div className="border-border flex h-11 items-center gap-3 border-b px-4">
          <div className="border-border bg-subtle text-muted-foreground flex h-7 w-56 max-w-full items-center gap-2 rounded-md border px-2 text-[11px]">
            <Search className="size-3" />
            Search documents…
          </div>
          <div className="flex-1" />
          <Bell className="text-muted-foreground size-3.5" />
          <span className="flex size-6 items-center justify-center rounded-full bg-[#d6453d] text-[9px] font-semibold text-white">
            A
          </span>
        </div>

        <div className="bg-subtle/60 p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display truncate text-lg">Welcome back, Aisha</p>
              <p className="text-muted-foreground truncate text-[11px]">
                Here&apos;s what&apos;s in your workspace today.
              </p>
            </div>
            <span className="bg-primary-solid hidden shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white sm:flex">
              <Plus className="size-3" />
              New document
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="border-border bg-surface rounded-lg border p-3 shadow-xs"
              >
                <p className="text-muted-foreground text-[10px]">{stat.label}</p>
                <p className="font-display mt-0.5 text-xl">{stat.value}</p>
                <p className="text-muted-foreground mt-0.5 truncate text-[9.5px]">{stat.note}</p>
              </div>
            ))}
          </div>

          <div className="border-border bg-surface mt-3 overflow-hidden rounded-lg border shadow-xs">
            <div className="border-border flex items-center justify-between border-b px-3.5 py-2.5">
              <p className="text-xs font-semibold">All documents</p>
              <p className="text-primary text-[10.5px] font-medium">View all</p>
            </div>
            <div className="border-border text-muted-foreground flex items-center gap-3 border-b px-3.5 py-1.5 text-[9px] font-semibold tracking-[0.08em] uppercase">
              <span className="flex-1">Name</span>
              <span className="hidden w-40 sm:block">Tags</span>
              <span className="w-14">Access</span>
              <span className="hidden w-24 lg:block">Last edited</span>
            </div>
            <ul className="divide-border divide-y">
              {ROWS.map((row) => (
                <li key={row.title} className="flex items-center gap-3 px-3.5 py-2">
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="bg-primary-subtle text-primary flex size-6 shrink-0 items-center justify-center rounded-md">
                      <FileText className="size-3" />
                    </span>
                    <span className="truncate text-[11.5px] font-medium">{row.title}</span>
                    {row.star && <Star className="size-3 shrink-0 fill-current text-amber-500" />}
                  </span>
                  <span className="hidden w-40 flex-wrap gap-1 sm:flex">
                    {row.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "rounded px-1.5 py-px text-[9.5px] font-medium",
                          tagTint(tag),
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </span>
                  <span className="w-14">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9.5px] font-medium",
                        ROLE_STYLE[row.role],
                      )}
                    >
                      {row.role}
                    </span>
                  </span>
                  <span className="text-muted-foreground hidden w-24 text-[10.5px] lg:block">
                    {row.edited}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
