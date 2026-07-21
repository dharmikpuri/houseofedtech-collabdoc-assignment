import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { getDocumentAccess } from "@/lib/authz/documents";
import { can } from "@/lib/authz/roles";
import { RoleBadge } from "@/components/documents/role-badge";
import { DocumentTitle } from "@/components/documents/document-title";
import { DocumentEditor } from "@/components/editor/document-editor";
import { renameDocumentAction } from "./actions";

export const metadata: Metadata = { title: "Document" };

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const doc = await getDocumentAccess(session.user.id, id);
  // 404 rather than 403 so we never reveal that a document exists to someone
  // who isn't allowed to see it.
  if (!doc) notFound();

  const canEdit = can(doc.role, "edit");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/dashboard" className="text-muted-foreground text-sm hover:underline">
        ← Back to documents
      </Link>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <DocumentTitle
            documentId={doc.id}
            initialTitle={doc.title}
            canEdit={canEdit}
            onRename={renameDocumentAction}
          />
        </div>
        <RoleBadge role={doc.role} className="mt-1 shrink-0" />
      </div>

      {!canEdit && (
        <p className="text-muted-foreground mt-2 text-sm">
          You have view-only access to this document.
        </p>
      )}

      <div className="mt-6">
        <DocumentEditor documentId={doc.id} editable={canEdit} />
      </div>
    </div>
  );
}
