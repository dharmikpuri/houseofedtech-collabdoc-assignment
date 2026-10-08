import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";

import { auth } from "@/auth";
import { getDocumentAccess, touchDocument } from "@/lib/authz/documents";
import { listVersions } from "@/lib/authz/versions";
import { listCollaborators } from "@/lib/authz/sharing";
import { can } from "@/lib/authz/roles";
import { isAiEnabled } from "@/lib/ai/gemini";
import { idSchema } from "@/lib/validation/workspace";
import { RoleBadge } from "@/components/documents/role-badge";
import { ShareDialog } from "@/components/documents/share-dialog";
import { DocumentTitle } from "@/components/documents/document-title";
import { DocumentEditor } from "@/components/editor/document-editor";
import { TagEditor } from "@/components/documents/tag-editor";
import { listTags } from "@/lib/authz/tags";
import { DocumentSkeleton } from "./document-skeleton";

export const metadata: Metadata = { title: "Document" };

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ thread?: string }>;
}) {
  const { id } = await params;
  const { thread } = await searchParams;
  const session = await auth();
  if (!session?.user) return null;

  const doc = await getDocumentAccess(session.user.id, id);
  // 404 rather than 403 so we never reveal that a document exists to someone
  // who isn't allowed to see it. The access check runs *before* anything
  // streams (no route-level loading.tsx), so the response is a real HTTP 404;
  // the skeleton below only covers the data fetched after access is granted.
  if (!doc) notFound();

  return (
    <Suspense fallback={<DocumentSkeleton />}>
      <DocumentWorkspace
        doc={doc}
        user={{
          id: session.user.id,
          name: session.user.name ?? session.user.email ?? "Anonymous",
        }}
        thread={thread}
      />
    </Suspense>
  );
}

async function DocumentWorkspace({
  doc,
  user,
  thread,
}: {
  doc: NonNullable<Awaited<ReturnType<typeof getDocumentAccess>>>;
  user: { id: string; name: string };
  thread?: string;
}) {
  const canEdit = can(doc.role, "edit");
  const canManage = can(doc.role, "manageSharing");

  const aiEnabled = isAiEnabled();
  const [versionRows, collaborators, tags] = await Promise.all([
    listVersions(user.id, doc.id),
    canManage ? listCollaborators(user.id, doc.id) : Promise.resolve([]),
    listTags(user.id, doc.id),
    // "Recent" is a convenience: failing to record it must never block opening
    // the document.
    touchDocument(user.id, doc.id).catch(() => undefined),
  ]);
  const versions = versionRows.map((version) => ({
    ...version,
    createdAt: version.createdAt.toISOString(),
  }));

  // A deep link from a notification. Validated like any other id; the panel
  // simply opens empty-handed if the thread no longer exists.
  const initialThreadId = thread && idSchema.safeParse(thread).success ? thread : undefined;

  return (
    // Fills the viewport below the 3.5rem app header so the editor body owns
    // its own scroll rather than the page scrolling as a whole.
    <div className="animate-page-in flex h-[calc(100dvh-3.5rem)] flex-col print:block print:h-auto">
      <header className="border-border bg-surface/60 shrink-0 border-b px-4 py-3 sm:px-6 print:border-0 print:bg-transparent print:px-0">
        <nav aria-label="Breadcrumb" className="print:hidden">
          <ol className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <li>
              <Link
                href="/dashboard"
                className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                Documents
              </Link>
            </li>
            <li aria-hidden className="opacity-50">
              /
            </li>
            <li className="text-foreground/80 max-w-[40ch] truncate" aria-current="page">
              {doc.title}
            </li>
          </ol>
        </nav>

        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <DocumentTitle
              documentId={doc.id}
              initialTitle={doc.title}
              canEdit={canEdit}
              aiEnabled={aiEnabled && canEdit}
            />
            <TagEditor
              documentId={doc.id}
              initialTags={tags}
              canEdit={canEdit}
              aiEnabled={aiEnabled}
            />

            {!canEdit && (
              <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs print:hidden">
                <Eye className="size-3.5" aria-hidden />
                View-only access — your changes won&apos;t be saved.
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 print:hidden">
            {canManage && <ShareDialog documentId={doc.id} initialCollaborators={collaborators} />}
            <RoleBadge role={doc.role} />
          </div>
        </div>
      </header>

      <DocumentEditor
        documentId={doc.id}
        title={doc.title}
        editable={canEdit}
        isOwner={doc.role === "OWNER"}
        user={user}
        initialVersions={versions}
        aiEnabled={aiEnabled}
        initialThreadId={initialThreadId}
      />
    </div>
  );
}
