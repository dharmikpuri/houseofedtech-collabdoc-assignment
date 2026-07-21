import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 text-lg font-semibold tracking-tight">
        CollabDoc
      </Link>
      <div className="border-border bg-background w-full max-w-sm rounded-lg border p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
