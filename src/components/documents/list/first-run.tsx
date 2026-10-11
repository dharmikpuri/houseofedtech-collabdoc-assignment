import { History, Users, WifiOff } from "lucide-react";

/**
 * First-run state for a brand-new workspace: the three things worth knowing
 * before the first keystroke, and one clear action.
 */
export function FirstRun({ createAction }: { createAction: React.ReactNode }) {
  const tips = [
    {
      icon: WifiOff,
      title: "Works offline",
      body: "Documents save to this device first and sync when you reconnect.",
    },
    {
      icon: Users,
      title: "Invite collaborators",
      body: "Share as Editor or Viewer and see each other's cursors live.",
    },
    {
      icon: History,
      title: "Snapshot anytime",
      body: "Name a version and restore it later — nothing gets overwritten.",
    },
  ];

  return (
    <div className="card overflow-hidden rounded-xl">
      <div className="flex flex-col items-center px-6 pt-14 pb-12 text-center">
        <FirstDocumentArt />
        <h2 className="font-display mt-5 text-xl">Create your first document</h2>
        <p className="text-muted-foreground mt-1.5 max-w-md text-sm text-balance">
          Write from scratch or import a Markdown file. You can start typing immediately — even
          without a connection.
        </p>
        <div className="mt-6 flex items-center gap-2">{createAction}</div>
      </div>
      <ul className="border-border bg-subtle divide-border grid divide-y border-t sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {tips.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3 px-6 py-5">
            <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A fresh page with a waiting cursor and a "new" badge, for the first-run state. */
function FirstDocumentArt() {
  return (
    <svg viewBox="0 0 220 140" className="h-32 w-auto" fill="none" aria-hidden>
      <ellipse cx="110" cy="130" rx="78" ry="7" className="fill-muted" />
      <rect
        x="56"
        y="22"
        width="80"
        height="100"
        rx="10"
        className="fill-surface stroke-border"
        strokeWidth="1.5"
        transform="rotate(-8 96 72)"
      />
      <rect
        x="72"
        y="12"
        width="84"
        height="106"
        rx="10"
        className="fill-surface stroke-border-strong"
        strokeWidth="1.5"
      />
      <rect x="85" y="28" width="38" height="6" rx="3" className="fill-foreground" />
      <rect x="85" y="44" width="58" height="4" rx="2" className="fill-muted" />
      <rect x="85" y="54" width="50" height="4" rx="2" className="fill-muted" />
      <rect x="85" y="64" width="30" height="4" rx="2" className="fill-muted" />
      {/* The cursor, ready to type */}
      <rect x="118" y="60" width="2.5" height="12" rx="1.25" className="fill-primary" />
      <rect x="118" y="50" width="24" height="11" rx="3" className="fill-primary" />
      <rect x="122" y="54" width="16" height="3" rx="1.5" fill="#fff" opacity="0.9" />
      {/* New */}
      <circle cx="160" cy="24" r="14" className="fill-primary" />
      <path d="M154 24h12M160 18v12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
