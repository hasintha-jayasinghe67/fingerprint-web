-- ==========================================================================
-- Auth schema for House Prefect Affairs (fingerprint-web)
-- Run in the Supabase SQL editor against a fresh project (or once on an
-- existing project that does not yet have public.users).
--
-- After this: npm run create-superuser -- <username> <password>
-- ==========================================================================

-- 1. users — app accounts, linked to Supabase Auth
CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'view-only'
    CHECK (role IN ('superuser', 'admin', 'view-only')),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ALTER COLUMN auth_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users (auth_id);

-- 2. RLS helpers (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE auth_id = auth.uid();
$$;

-- Leak-proof "is this row mine?" — avoid direct auth_id = auth.uid() in
-- policies (enumeration tricks via filter errors).
CREATE OR REPLACE FUNCTION public.is_current_user(uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_id = $1 AND auth_id = auth.uid()
  );
$$;

-- 3. RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users FOR SELECT
  TO authenticated
  USING (
    public.is_current_user(auth_id)
    OR public.current_user_role() = 'superuser'
    OR (public.current_user_role() = 'admin' AND role <> 'superuser')
  );

DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_role() = 'superuser');

DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users FOR UPDATE
  TO authenticated
  USING (public.current_user_role() = 'superuser')
  WITH CHECK (public.current_user_role() = 'superuser');

DROP POLICY IF EXISTS "users_delete" ON users;
CREATE POLICY "users_delete" ON users FOR DELETE
  TO authenticated
  USING (public.current_user_role() = 'superuser');

-- 4. Harden helpers + revoke anon table access
REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

REVOKE ALL ON FUNCTION public.is_current_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user(uuid) TO authenticated;

REVOKE ALL ON TABLE public.users FROM anon;

-- Optional dashboard bootstrap (instead of the CLI):
--   1. Authentication → Users → Add user (email = you@hpa.local, confirm)
--   2. Copy the new user's UUID, then:
-- INSERT INTO users (username, auth_id, email, role)
-- VALUES ('you', '<auth-uuid>', 'you@hpa.local', 'superuser');
