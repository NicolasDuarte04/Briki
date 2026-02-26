-- ============================================================================
-- Migration: Add insurance_category to policy_analyses and quote_analyses
-- Date: 2026-02-26
-- Purpose: Store the user-selected insurance category for traceability
--          and strategy-driven analysis.
-- Impact: Nullable VARCHAR(30) — zero impact on existing records (NULL = generic)
-- ============================================================================

-- 1. Add column to policy_analyses
ALTER TABLE public.policy_analyses
  ADD COLUMN IF NOT EXISTS insurance_category VARCHAR(30) DEFAULT NULL;

COMMENT ON COLUMN public.policy_analyses.insurance_category IS
  'Insurance category selected by user at upload (e.g. trdm, flota, vida). NULL = generic analysis.';

-- 2. Add column to quote_analyses
ALTER TABLE public.quote_analyses
  ADD COLUMN IF NOT EXISTS insurance_category VARCHAR(30) DEFAULT NULL;

COMMENT ON COLUMN public.quote_analyses.insurance_category IS
  'Insurance category selected by user at upload (e.g. trdm, flota, vida). NULL = generic analysis.';

-- 3. Indexes for filtering by category (optional but useful for dashboards)
CREATE INDEX IF NOT EXISTS idx_policy_analyses_insurance_category
  ON public.policy_analyses (insurance_category)
  WHERE insurance_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quote_analyses_insurance_category
  ON public.quote_analyses (insurance_category)
  WHERE insurance_category IS NOT NULL;
