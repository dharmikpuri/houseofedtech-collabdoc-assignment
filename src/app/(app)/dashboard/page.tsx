import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/auth";
import { listDocuments } from "@/lib/authz/documents";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/documents/role-badge";
import { DeleteDocumentButton } from "@/components/documents/delete-document-button";
import { createDocumentAction } from "./actions";

export const metadata: Metadata = { title: "Dashboard" };

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function DashboardPage() {
  const session = await auth();
  // The layout already guards this, but TS needs the narrowing.
  if (!session?.user) return null;

  const documents = await listDocuments(session.user.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Your documents</h1>
        <form action={createDocumentAction}>
          <Button type="submit">New document</Button>
        </form>
      </div>

      {documents.length === 0 ? (
        <div className="border-border text-muted-foreground mt-8 rounded-lg border border-dashed p-12 text-center">
          <p>No documents yet.</p>
          <p className="mt-1 text-sm">Create your first one to get started.</p>
        </div>
      ) : (
        <ul className="border-border mt-8 divide-y overflow-hidden rounded-lg border">
          {documents.map((doc) => (
            <li key={doc.id} className="hover:bg-muted/50 flex items-center gap-4 px-4 py-3">
              <Link href={`/documents/${doc.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium">{doc.title}</p>
                <p className="text-muted-foreground text-xs">
                  Updated {dateFormatter.format(doc.updatedAt)}
                </p>
              </Link>
              <RoleBadge role={doc.role} />
              {doc.role === "OWNER" && (
                <DeleteDocumentButton documentId={doc.id} title={doc.title} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
