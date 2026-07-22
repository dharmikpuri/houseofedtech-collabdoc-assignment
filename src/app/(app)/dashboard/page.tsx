import type { Metadata } from "next";
import { auth } from "@/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const displayName = session?.user.name ?? session?.user.email;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Your documents</h1>
      <p className="text-muted-foreground mt-2">Signed in as {displayName}.</p>

      <div className="border-border text-muted-foreground mt-8 rounded-lg border border-dashed p-10 text-center">
        Documents arrive in Phase 3. Authentication is working — you&apos;re inside a protected
        route.
      </div>
    </div>
  );
}
