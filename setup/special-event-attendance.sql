-- Copy of fingerprint-server/migrations/special-event-attendance.sql
-- Run once in the Supabase SQL editor.

ALTER TABLE special_events
    ADD COLUMN IF NOT EXISTS attendance_saved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS excuses_applied_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS special_event_entries (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id      BIGINT NOT NULL REFERENCES special_events(id) ON DELETE CASCADE,
    prefect_id    BIGINT NOT NULL REFERENCES prefects(id) ON DELETE CASCADE,
    status        TEXT NOT NULL CHECK (status IN ('Present', 'EG', 'ES', 'Traitor')),
    signed_in_at  TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, prefect_id)
);

CREATE INDEX IF NOT EXISTS idx_special_event_entries_event
    ON special_event_entries (event_id);

ALTER TABLE special_event_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'special_event_entries'
          AND policyname = 'Allow all for service_role'
    ) THEN
        CREATE POLICY "Allow all for service_role" ON special_event_entries
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;
