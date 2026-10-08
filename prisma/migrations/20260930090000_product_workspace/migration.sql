-- Product phase: folders & favourites, comments & mentions, notifications,
-- activity feed and share links.
--
-- Purely additive: new tables only. Existing tables, data and the original
-- row-level-security migration are untouched. The new tables get RLS policies
-- in the same style (see the end of this file).

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_document_meta" (
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "folderId" TEXT,
    "lastOpenedAt" TIMESTAMP(3),

    CONSTRAINT "user_document_meta_pkey" PRIMARY KEY ("userId","documentId")
);

-- CreateTable
CREATE TABLE "comment_threads" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comment_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "mentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "threadId" TEXT,
    "preview" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_activity" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "folders_userId_idx" ON "folders"("userId");

-- CreateIndex
CREATE INDEX "user_document_meta_userId_lastOpenedAt_idx" ON "user_document_meta"("userId", "lastOpenedAt");

-- CreateIndex
CREATE INDEX "user_document_meta_folderId_idx" ON "user_document_meta"("folderId");

-- CreateIndex
CREATE INDEX "comment_threads_documentId_createdAt_idx" ON "comment_threads"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "comments_threadId_createdAt_idx" ON "comments"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "document_activity_documentId_createdAt_idx" ON "document_activity"("documentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_tokenHash_key" ON "share_links"("tokenHash");

-- CreateIndex
CREATE INDEX "share_links_documentId_idx" ON "share_links"("documentId");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_document_meta" ADD CONSTRAINT "user_document_meta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_document_meta" ADD CONSTRAINT "user_document_meta_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_document_meta" ADD CONSTRAINT "user_document_meta_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_threads" ADD CONSTRAINT "comment_threads_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_threads" ADD CONSTRAINT "comment_threads_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_threads" ADD CONSTRAINT "comment_threads_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "comment_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_activity" ADD CONSTRAINT "document_activity_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_activity" ADD CONSTRAINT "document_activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Row-level security ───────────────────────────────────────────────────────
-- Same model as 20260722120000_row_level_security: the app connects as the
-- table owner (which bypasses RLS) and scopes every request with
-- app.user_id, so these policies are a backstop that enforces tenant
-- isolation for any non-owner access path, including the provisioned
-- `app_user` role. They reuse the existing SECURITY DEFINER helpers.

GRANT SELECT, INSERT, UPDATE, DELETE
  ON folders, user_document_meta, comment_threads, comments,
     notifications, document_activity, share_links
  TO app_user;

-- folders: strictly private to their owner.
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY folders_own ON folders FOR ALL
  USING ("userId" = app_current_user())
  WITH CHECK ("userId" = app_current_user());

-- user_document_meta: your own rows, and only for documents you can access.
ALTER TABLE user_document_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY udm_own ON user_document_meta FOR ALL
  USING ("userId" = app_current_user() AND app_has_access("documentId"))
  WITH CHECK ("userId" = app_current_user() AND app_has_access("documentId"));

-- comment_threads: visible to anyone with access; authored as yourself;
-- deletable by the author or the document owner.
ALTER TABLE comment_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY ct_select ON comment_threads FOR SELECT USING (app_has_access("documentId"));
CREATE POLICY ct_insert ON comment_threads FOR INSERT
  WITH CHECK (app_has_access("documentId") AND "authorId" = app_current_user());
CREATE POLICY ct_update ON comment_threads FOR UPDATE
  USING (app_has_access("documentId")) WITH CHECK (app_has_access("documentId"));
CREATE POLICY ct_delete ON comment_threads FOR DELETE
  USING ("authorId" = app_current_user() OR app_is_owner("documentId"));

-- comments: scoped through their thread's document.
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY c_select ON comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM comment_threads t WHERE t.id = "threadId"));
CREATE POLICY c_insert ON comments FOR INSERT
  WITH CHECK ("authorId" = app_current_user()
              AND EXISTS (SELECT 1 FROM comment_threads t WHERE t.id = "threadId"));
CREATE POLICY c_delete ON comments FOR DELETE
  USING ("authorId" = app_current_user());

-- notifications: only the recipient reads or updates them; they can only be
-- created by the acting user, about a document that user can access.
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY n_select ON notifications FOR SELECT USING ("userId" = app_current_user());
CREATE POLICY n_update ON notifications FOR UPDATE
  USING ("userId" = app_current_user()) WITH CHECK ("userId" = app_current_user());
CREATE POLICY n_insert ON notifications FOR INSERT
  WITH CHECK ("actorId" = app_current_user() AND app_has_access("documentId"));

-- document_activity: append-only; readable by anyone with access.
ALTER TABLE document_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY da_select ON document_activity FOR SELECT USING (app_has_access("documentId"));
CREATE POLICY da_insert ON document_activity FOR INSERT
  WITH CHECK ("actorId" = app_current_user() AND app_has_access("documentId"));

-- share_links: managed only by the document owner. Redeeming a link is done by
-- someone who has no access yet, so that path runs on the owner connection
-- with explicit application checks (token hash, expiry, revocation).
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY sl_owner ON share_links FOR ALL
  USING (app_is_owner("documentId")) WITH CHECK (app_is_owner("documentId"));
