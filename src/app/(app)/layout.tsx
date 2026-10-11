import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { signOutAction } from "./actions";
import { ROUTES } from "@/config/routes";

/**
 * Guard for every authenticated route. The proxy (edge) already blocks
 * unauthenticated requests, but we re-check on the server here too — the proxy
 * is a convenience, never the sole security boundary.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect(ROUTES.signIn);

  const email = session.user.email ?? "";

  return (
    <AppShell
      user={{
        id: session.user.id,
        name: session.user.name ?? email.split("@")[0] ?? "Account",
        email,
      }}
      signOutAction={signOutAction}
    >
      {children}
    </AppShell>
  );
}
