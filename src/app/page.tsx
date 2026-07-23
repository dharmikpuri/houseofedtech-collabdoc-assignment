import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center px-4 py-24 text-center">
      <span className="border-border bg-muted text-muted-foreground rounded-full border px-3 py-1 text-xs font-medium">
        Local-first · Real-time · Version-controlled
      </span>

      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        CollabDoc
      </h1>

      <p className="text-muted-foreground mt-4 max-w-xl text-lg text-balance">
        A local-first collaborative document editor. Edit offline with zero blocking network
        requests, sync automatically when you reconnect, and travel through version history — with
        deterministic, loss-free conflict resolution.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/sign-up"
          className="bg-primary text-primary-foreground inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          Get started
        </Link>
        <Link
          href="/sign-in"
          className="hover:bg-muted inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-medium transition-colors"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
