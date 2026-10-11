import { Suspense } from "react";
import type { Metadata } from "next";
import { FileText, Star, Users, UserRound } from "lucide-react";

import { auth } from "@/auth";
import { listDocuments } from "@/lib/authz/documents";
import { listFolders } from "@/lib/authz/folders";
import { DocumentList } from "@/components/documents/document-list";
import { ImportButton } from "@/components/documents/import-button";
import { PageHeader } from "@/components/ui/page-header";
import { CreateDocumentButton } from "@/components/documents/create-document-button";

export const metadata: Metadata = { title: "Documents" };

export default async function DashboardPage() {
  const session = await auth();
  // The layout already guards this, but TS needs the narrowing.
  if (!session?.user) return null;

  const [documents, folders] = await Promise.all([
    listDocuments(session.user.id),
    listFolders(session.user.id),
  ]);

  // Dates cross the server→client boundary as ISO strings so the client can
  // format them relative to the viewer's own clock and locale.
  const items = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    updatedAt: doc.updatedAt.toISOString(),
    lastOpenedAt: doc.lastOpenedAt?.toISOString() ?? null,
    role: doc.role,
    favorite: doc.favorite,
    folderId: doc.folderId,
    tags: doc.tags,
  }));

  const firstName = (session.user.name ?? session.user.email ?? "there").split(/[\s@]/)[0];

  const stats = [
    { label: "Documents", value: documents.length, note: "in your workspace", icon: FileText },
    {
      label: "Owned by you",
      value: documents.filter((doc) => doc.role === "OWNER").length,
      note: "you control sharing",
      icon: UserRound,
    },
    {
      label: "Shared with you",
      value: documents.filter((doc) => doc.role !== "OWNER").length,
      note: "from collaborators",
      icon: Users,
    },
    {
      label: "Favourites",
      value: documents.filter((doc) => doc.favorite).length,
      note: "pinned for quick access",
      icon: Star,
    },
  ];

  const createButton = <CreateDocumentButton />;

  return (
    <div className="animate-page-in container-app py-[clamp(1.75rem,3vw,2.5rem)]">
      <PageHeader
        title={<>Welcome back, {firstName}</>}
        description="Everything here is saved on this device first, so it stays editable offline."
        actions={
          <>
            <ImportButton />
            {createButton}
          </>
        }
      />

      {documents.length > 0 && (
        <dl className="mt-[clamp(1.25rem,2.5vw,1.75rem)] grid grid-cols-2 gap-[clamp(0.75rem,1.5vw,1rem)] lg:grid-cols-4">
          {stats.map(({ label, value, note, icon: Icon }) => (
            <div key={label} className="card flex flex-col rounded-xl p-4 sm:p-5">
              <dt className="text-muted-foreground flex items-center justify-between gap-2 text-[13px] font-medium">
                {label}
                <Icon className="text-muted-foreground/70 size-4" aria-hidden />
              </dt>
              <dd className="page-title mt-2 leading-none tabular-nums">{value}</dd>
              <dd className="text-muted-foreground mt-2 truncate text-xs">{note}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-[clamp(1.25rem,2.5vw,1.75rem)]">
        {/* The list reads the active view from the URL (useSearchParams). */}
        <Suspense fallback={null}>
          <DocumentList documents={items} folders={folders} createAction={createButton} />
        </Suspense>
      </div>
    </div>
  );
}
