-- AI phase: semantic search (pgvector) and document tags.
--
-- Purely additive: one extension, three new tables. Nothing existing changes.

-- pgvector. On Supabase it is available on every project; IF NOT EXISTS keeps
-- this safe if it was already enabled (in any schema on the search path).
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(768),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_index" (
    "documentId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "chunkCount" INTEGER NOT NULL,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_index_pkey" PRIMARY KEY ("documentId")
);

-- CreateTable
CREATE TABLE "document_tags" (
    "documentId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_tags_pkey" PRIMARY KEY ("documentId","tag")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_chunks_documentId_chunkIndex_key" ON "document_chunks"("documentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "document_tags_tag_idx" ON "document_tags"("tag");

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_index" ADD CONSTRAINT "document_index_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Approximate nearest-neighbour index for cosine similarity. HNSW gives good
-- recall without a training step, so it works from the first row inserted.
-- (Prisma doesn't model vector indexes; it lives only in this migration.)
CREATE INDEX "document_chunks_embedding_idx"
  ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);

-- ── Row-level security (same model as the earlier migrations) ────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON document_chunks, document_index, document_tags TO app_user;

-- Search results can never include a passage from a document you can't access.
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY dc_access ON document_chunks FOR ALL
  USING (app_has_access("documentId")) WITH CHECK (app_has_access("documentId"));

ALTER TABLE document_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY di_access ON document_index FOR ALL
  USING (app_has_access("documentId")) WITH CHECK (app_has_access("documentId"));

-- Tags: readable by members; writes need access (edit is enforced in the app).
ALTER TABLE document_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY dt_access ON document_tags FOR ALL
  USING (app_has_access("documentId")) WITH CHECK (app_has_access("documentId"));
