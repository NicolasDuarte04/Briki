-- ============================================================================
-- Migration: Expand budget_currency CHECK constraint to support BRL
-- Date: 2026-03-11
-- Description: Adds BRL (Brazilian Real) to the allowed currencies in cases.budget_currency
--              Required for multi-country support (Colombia, USA, Brazil, Ecuador)
-- ============================================================================

-- Drop existing CHECK constraint (named automatically by Postgres)
ALTER TABLE public.cases
  DROP CONSTRAINT IF EXISTS cases_budget_currency_check;

-- Add new CHECK constraint with BRL included
ALTER TABLE public.cases
  ADD CONSTRAINT cases_budget_currency_check
  CHECK (budget_currency IN ('COP', 'USD', 'BRL'));

-- Update column comment
COMMENT ON COLUMN public.cases.budget_currency IS 'Moneda del caso (COP, USD o BRL). Aplica a presupuesto y todos los campos monetarios del ramo.';
