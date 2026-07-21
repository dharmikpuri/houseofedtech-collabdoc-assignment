import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { getDocumentAccess } from "@/lib/authz/documents";
import { RoleBadge } from "@/components/documents/role-badge";

export const metadata: Metadata = { title: "Document" };

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const doc = await getDocumentAccess(session.user.id, id);
  // 404 rather than 403 so we never reveal that a document exists to someone
  // who isn't allowed to see it.
  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/dashboard" className="text-muted-foreground text-sm hover:underline">
        ← Back to documents
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
        <RoleBadge role={doc.role} />
      </div>

      <div className="border-border text-muted-foreground mt-8 rounded-lg border border-dashed p-12 text-center">
        The collaborative editor arrives in the next phase. Access control is working — you can only
        open this document because you have a role on it.
      </div>
    </div>
  );
}
