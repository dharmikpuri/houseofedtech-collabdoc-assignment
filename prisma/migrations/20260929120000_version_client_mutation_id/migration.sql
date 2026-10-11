-- Idempotency key for snapshots created through the client's offline mutation
-- queue. Additive and nullable: existing rows are untouched, and because
-- Postgres unique indexes treat NULLs as distinct, legacy rows never collide.
--
-- RLS is unaffected: the existing versions_select / versions_insert policies
-- apply to the new column like any other.

ALTER TABLE "versions" ADD COLUMN "clientMutationId" TEXT;

CREATE UNIQUE INDEX "versions_documentId_clientMutationId_key"
  ON "versions"("documentId", "clientMutationId");
