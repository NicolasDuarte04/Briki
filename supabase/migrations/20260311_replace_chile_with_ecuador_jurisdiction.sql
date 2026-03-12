-- ============================================================================
-- Migration: Replace Chile (cl) with Ecuador (ec) in compliance jurisdictions
-- Date: 2026-03-11
-- Description:
--   1. Drops the existing CHECK constraint on compliance_records.jurisdiction
--   2. Migrates checklist_data JSONB keys from cl_item_* → ec_item_*
--   3. Updates jurisdiction column from 'cl' to 'ec'
--   4. Re-creates CHECK constraint with new enum (co, mx, ec, br)
--
-- NOTE: compliance_audit_events.item_id is NOT migrated intentionally.
--       Audit trail entries are immutable records of historical actions.
--       Entries with cl_item_* represent truthful past events under Chile.
-- ============================================================================

BEGIN;

-- ─── Step 1: Drop existing CHECK constraint ─────────────────────────────────
ALTER TABLE public.compliance_records
  DROP CONSTRAINT IF EXISTS valid_jurisdiction;

-- ─── Step 2: Migrate checklist_data JSONB keys (cl_item_* → ec_item_*) ──────
-- Only affects records currently under jurisdiction = 'cl'
UPDATE public.compliance_records
SET checklist_data = (
  SELECT COALESCE(
    jsonb_object_agg(
      CASE
        WHEN key LIKE 'cl_item_%' THEN 'ec_item_' || substring(key FROM 9)
        ELSE key
      END,
      value
    ),
    '{}'::jsonb
  )
  FROM jsonb_each(checklist_data)
)
WHERE jurisdiction = 'cl'
  AND checklist_data != '{}'::jsonb;

-- ─── Step 3: Update jurisdiction column ──────────────────────────────────────
UPDATE public.compliance_records
SET jurisdiction = 'ec'
WHERE jurisdiction = 'cl';

-- ─── Step 4: Re-create CHECK constraint with Ecuador ─────────────────────────
ALTER TABLE public.compliance_records
  ADD CONSTRAINT valid_jurisdiction
  CHECK (jurisdiction IN ('co', 'mx', 'ec', 'br'));

-- ─── Step 5: Update table comment ───────────────────────────────────────────
COMMENT ON COLUMN public.compliance_records.jurisdiction
  IS 'Jurisdiction code: co (Colombia), mx (México), ec (Ecuador), br (Brasil)';

COMMIT;
