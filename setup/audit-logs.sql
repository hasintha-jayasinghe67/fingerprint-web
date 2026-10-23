-- Audit trail for House Prefect Affairs.
-- Run once in the Supabase SQL editor. Fresh installs also get this from
-- setup/auth-schema.sql.
--
-- Rows are written by the Next.js server (service role) on every database
-- write that goes through the web app. Superusers can SELECT; nobody else
-- can read or write this table from the client.

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_username TEXT,
  actor_role TEXT,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  method TEXT,
  path TEXT,
  status_code INT,
  success BOOLEAN NOT NULL DEFAULT true,
  ip TEXT,
  user_agent TEXT,
  request_body JSONB,
  response_body JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs (category);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_superuser" ON audit_logs;
CREATE POLICY "audit_logs_select_superuser" ON audit_logs FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'superuser');

REVOKE ALL ON TABLE public.audit_logs FROM anon;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;
