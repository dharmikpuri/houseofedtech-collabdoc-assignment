-- Row-Level Security backstop.
--
-- These policies scope every row to the user in `app.user_id` (set per request
-- in withUser). The app connects as the database owner, which bypasses RLS, so
-- the policies sit behind the app-layer authz checks as defense in depth; they
-- enforce for any non-owner role that ever touches these tables. A restricted
-- `app_user` role is provisioned so the app path can be switched to enforced RLS
-- later without another migration.
--
-- Access checks use SECURITY DEFINER helper functions. They run as the function
-- owner (the table owner, which is not FORCEd), so they read the permission
-- tables without RLS — avoiding the classic policy-recursion problem.

-- Restricted role, provisioned for future enforcement. Roles are cluster-global,
-- and Prisma's shadow database shares the cluster, so guard creation to stay
-- idempotent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON documents, document_permissions, versions TO app_user;
GRANT SELECT ON users TO app_user;

CREATE OR REPLACE FUNCTION app_current_user() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT current_setting('app.user_id', true) $$;

CREATE OR REPLACE FUNCTION app_has_access(doc_id text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM document_permissions
      WHERE "documentId" = doc_id AND "userId" = app_current_user()
    )
  $$;

CREATE OR REPLACE FUNCTION app_is_owner(doc_id text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM document_permissions
      WHERE "documentId" = doc_id AND "userId" = app_current_user() AND role = 'OWNER'
    )
  $$;

-- documents: readable/writable only through a permission row; only the owner deletes.
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_select ON documents FOR SELECT USING (app_has_access(id));
CREATE POLICY documents_insert ON documents FOR INSERT WITH CHECK ("ownerId" = app_current_user());
CREATE POLICY documents_update ON documents FOR UPDATE USING (app_has_access(id)) WITH CHECK (app_has_access(id));
CREATE POLICY documents_delete ON documents FOR DELETE USING (app_is_owner(id));

-- document_permissions: you see your own grant; the owner sees and manages all.
ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY dp_select ON document_permissions FOR SELECT
  USING ("userId" = app_current_user() OR app_is_owner("documentId"));
CREATE POLICY dp_insert ON document_permissions FOR INSERT
  WITH CHECK ("userId" = app_current_user() OR app_is_owner("documentId"));
CREATE POLICY dp_update ON document_permissions FOR UPDATE
  USING (app_is_owner("documentId")) WITH CHECK (app_is_owner("documentId"));
CREATE POLICY dp_delete ON document_permissions FOR DELETE
  USING (app_is_owner("documentId"));

-- versions: readable by anyone with access; authored as yourself.
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY versions_select ON versions FOR SELECT USING (app_has_access("documentId"));
CREATE POLICY versions_insert ON versions FOR INSERT
  WITH CHECK (app_has_access("documentId") AND "authorId" = app_current_user());

-- document_states holds raw CRDT blobs and is touched only by the collab server
-- (owner connection). Enable RLS with no policy so the app role can never read it.
ALTER TABLE document_states ENABLE ROW LEVEL SECURITY;
