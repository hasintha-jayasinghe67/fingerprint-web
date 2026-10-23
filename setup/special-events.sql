-- Copy of fingerprint-server/migrations/special-events.sql
-- Run once in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS special_events (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL,
    start_at    TEXT NOT NULL,
    end_at      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT special_events_window_check CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_special_events_window
    ON special_events (start_at, end_at);

ALTER TABLE special_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'special_events'
          AND policyname = 'Allow all for service_role'
    ) THEN
        CREATE POLICY "Allow all for service_role" ON special_events
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;
