-- Same migration as fingerprint-server/migrations/faster-reads.sql.
-- Run this in the Supabase SQL Editor after special-events.sql
-- and slot-attendance.sql. Safe to run more than once.

CREATE INDEX IF NOT EXISTS idx_attendance_date_pin
    ON attendance_records (date, pin);

CREATE INDEX IF NOT EXISTS idx_attendance_date_time
    ON attendance_records (date, time);

CREATE INDEX IF NOT EXISTS idx_gate_attendance_saved_date
    ON gate_attendance (date)
    WHERE saved;

CREATE INDEX IF NOT EXISTS idx_slot_attendance_saved_date
    ON slot_attendance (date)
    WHERE saved;

CREATE OR REPLACE FUNCTION attendance_day_summaries()
RETURNS TABLE (
    date text,
    prefect_count bigint,
    total_records bigint,
    has_gate boolean
)
LANGUAGE sql
STABLE
AS $$
    WITH people AS (
        SELECT ar.date, ar.pin, 1 AS is_scan
        FROM attendance_records ar
        JOIN prefects p ON p.pin = ar.pin
        WHERE NOT EXISTS (
            SELECT 1
            FROM special_events se
            WHERE ar.timestamp >= se.start_at
              AND ar.timestamp <= se.end_at
        )
        UNION ALL
        SELECT ga.date, p.pin, 0
        FROM gate_attendance ga
        JOIN prefects p ON p.id = ga.prefect_id
        WHERE ga.saved
        UNION ALL
        SELECT sa.date, p.pin, 0
        FROM slot_attendance sa
        JOIN prefects p ON p.id = sa.prefect_id
        WHERE sa.saved
    )
    SELECT
        people.date,
        COUNT(DISTINCT people.pin)::bigint AS prefect_count,
        SUM(people.is_scan)::bigint AS total_records,
        BOOL_OR(people.is_scan = 0) AS has_gate
    FROM people
    GROUP BY people.date
    HAVING COUNT(DISTINCT people.pin) > 0
    ORDER BY people.date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.attendance_day_summaries() TO service_role;
