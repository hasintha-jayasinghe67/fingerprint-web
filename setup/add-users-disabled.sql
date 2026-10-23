-- Add account disable flag to an existing House Prefect Affairs project.
-- Run once in the Supabase SQL editor. Fresh installs get this from
-- setup/auth-schema.sql as well.
--
-- disabled = true: the user cannot sign in, and any remaining session is
-- dropped on the next server auth check (proxy.ts).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;
