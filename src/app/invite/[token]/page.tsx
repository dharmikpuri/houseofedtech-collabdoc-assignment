import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Link2Off } from "lucide-react";

import { auth } from "@/auth";
import { previewShareLink } from "@/lib/authz/share-links";
import { shareTokenSchema } from "@/lib/validation/workspace";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SiteFooter } from "@/components/layout/site-footer";
import { Logo } from "@/components/brand/logo";
import { JoinButton } from "./join-button";
import { ROUTES, documentPath, invitePath, signInPath } from "@/config/routes";

export const metadata: Metadata = { title: "Invitation", robots: { index: false } };

const ROLE_COPY = { OWNER: "own", EDITOR: "edit", VIEWER: "view" } as const;
const RANK = { VIEWER: 0, EDITOR: 1, OWNER: 2 } as const;

/**
 * Invite landing page. Shows what the link grants and asks the visitor to
 * confirm; the grant itself happens only when they press "Join".
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect(signInPath(invitePath(token)));
  }

  const preview = shareTokenSchema.safeParse(token).success
    ? await previewShareLink(token, session.user.id)
    : ({ status: "invalid" } as const);

  return (
    <div className="bg-subtle relative flex min-h-dvh flex-col">
      <main
        id="main-content"
        className="relative flex flex-1 items-center justify-center px-4 py-12"
      >
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>

          {preview.status !== "valid" ? (
            <EmptyState
              tone="danger"
              icon={<Link2Off />}
              title={
                preview.status === "expired"
                  ? "This invite has expired"
                  : preview.status === "revoked"
                    ? "This invite was revoked"
                    : "This invite link isn't valid"
              }
              description="Ask the document owner to send you a new link."
              action={
                <Button asChild variant="secondary">
                  <Link href={ROUTES.dashboard}>Go to your documents</Link>
                </Button>
              }
            />
          ) : (
            <div className="card rounded-xl p-7 shadow-sm">
              <span className="bg-primary-subtle text-primary flex size-11 items-center justify-center rounded-xl">
                <FileText className="size-5" aria-hidden />
              </span>
              <p className="text-muted-foreground mt-5 text-sm">
                <span className="text-foreground font-medium">{preview.inviterName}</span> invited
                you to {ROLE_COPY[preview.role]}
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight break-words">
                {preview.documentTitle}
              </h1>

              {preview.currentRole && RANK[preview.currentRole] >= RANK[preview.role] ? (
                <>
                  <p className="text-muted-foreground mt-4 text-sm">
                    You already have {ROLE_COPY[preview.currentRole]} access to this document.
                  </p>
                  <Button asChild className="mt-5 w-full">
                    <Link href={documentPath(preview.documentId)}>Open document</Link>
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mt-4 text-sm">
                    {preview.currentRole
                      ? `Joining will upgrade your access from ${preview.currentRole.toLowerCase()} to ${preview.role.toLowerCase()}.`
                      : "You'll be able to open it on any device and keep working offline."}
                  </p>
                  <JoinButton token={token} />
                </>
              )}
            </div>
          )}
        </div>
      </main>
      <SiteFooter variant="compact" />
    </div>
  );
}
