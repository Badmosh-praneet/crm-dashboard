-- =====================================================================
-- Change notification.
--
-- Every write to a fact or target table announces itself on the `dsr_change`
-- channel. The API holds one connection LISTENing on that channel and fans the
-- events out to every open dashboard over server-sent events.
--
-- The point of doing it in the database rather than in the API is that the
-- database sees ALL writes. A row inserted by the dashboard, by the bulk loader,
-- by tools/sql.py, or by some future agent writing directly all reach the same
-- trigger, so no dashboard can drift out of date because a write took a
-- different path in.
--
-- Re-runnable: every trigger is dropped and recreated.
-- =====================================================================

SET search_path = dsr, public;

CREATE OR REPLACE FUNCTION notify_change() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    payload json;
    row_id  text;
BEGIN
    -- TRUNCATE is statement-level: there is no NEW/OLD row to report.
    IF TG_OP = 'TRUNCATE' THEN
        payload := json_build_object('table', TG_TABLE_NAME, 'op', TG_OP);
    ELSE
        -- to_jsonb(...)->>0 pulls the primary key out without the function
        -- needing to know each table's key column name.
        BEGIN
            row_id := CASE WHEN TG_OP = 'DELETE'
                           THEN to_jsonb(OLD) ->> (TG_ARGV[0])
                           ELSE to_jsonb(NEW) ->> (TG_ARGV[0]) END;
        EXCEPTION WHEN others THEN
            row_id := NULL;
        END;
        payload := json_build_object('table', TG_TABLE_NAME,
                                     'op', TG_OP,
                                     'id', row_id);
    END IF;

    -- pg_notify payloads are capped at 8000 bytes; this one is a few dozen.
    -- Notifications are delivered on COMMIT, so a listener never sees a change
    -- that later rolled back.
    PERFORM pg_notify('dsr_change', payload::text);
    RETURN NULL;                      -- AFTER trigger: return value is ignored
END $$;

COMMENT ON FUNCTION notify_change() IS
  'Announces a row change on the dsr_change channel. Takes the table''s primary
   key column name as its single trigger argument.';

-- Watched tables and their primary key column.
DO $$
DECLARE
    spec record;
BEGIN
    FOR spec IN
        SELECT * FROM (VALUES
            ('vehicle',                     'vehicle_id'),
            ('lead',                        'lead_id'),
            ('test_drive',                  'test_drive_id'),
            ('booking',                     'booking_id'),
            ('allotment',                   'allotment_id'),
            ('registration',                'registration_id'),
            ('target_consultant_scorecard', 'scorecard_id'),
            ('target_channel_funnel',       'id'),
            ('target_booking_commitment',   'id'),
            ('target_daily_tracker',        'id')
        ) AS t(tbl, pk)
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON dsr.%I',
                       spec.tbl || '_notify', spec.tbl);
        EXECUTE format(
            'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON dsr.%I '
            'FOR EACH ROW EXECUTE FUNCTION dsr.notify_change(%L)',
            spec.tbl || '_notify', spec.tbl, spec.pk);

        -- One extra statement-level trigger so a workbook reload, which
        -- truncates, also tells the dashboards to refetch.
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON dsr.%I',
                       spec.tbl || '_notify_truncate', spec.tbl);
        EXECUTE format(
            'CREATE TRIGGER %I AFTER TRUNCATE ON dsr.%I '
            'FOR EACH STATEMENT EXECUTE FUNCTION dsr.notify_change(%L)',
            spec.tbl || '_notify_truncate', spec.tbl, spec.pk);
    END LOOP;
END $$;
