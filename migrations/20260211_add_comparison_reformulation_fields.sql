-- ============================================================
-- Migration: Add reformulation fields to comparisons table
-- Date: 2026-02-11
-- Purpose: Support comparison accumulation and AI-guided reformulation
-- 
-- CHANGES:
--   1. label (VARCHAR 100) — Etiqueta visible para identificar comparaciones
--   2. focus_aspects (TEXT[]) — Categorías que la IA debe priorizar
--   3. user_prompt (VARCHAR 500) — Instrucciones del usuario (sanitizadas)
--   4. parent_comparison_ids (TEXT[]) — Lineage: IDs de comparaciones de referencia
--
-- BACKWARD COMPATIBILITY:
--   - Todos los campos son opcionales o tienen DEFAULT
--   - Registros existentes recibirán NULL (label, user_prompt) o '{}' (arrays)
--   - No se eliminan campos ni índices existentes
--   - RLS policies existentes cubren los nuevos campos sin modificación
-- ============================================================

-- 1. Add label column (nullable) — User-visible comparison name
ALTER TABLE public.comparisons 
  ADD COLUMN IF NOT EXISTS label VARCHAR(100);

-- 2. Add focus_aspects column (non-null array with empty default)
-- Categories the AI should prioritize: 'coverage', 'deductible', 'exclusion', 'benefit', 'requirement'
ALTER TABLE public.comparisons 
  ADD COLUMN IF NOT EXISTS focus_aspects TEXT[] NOT NULL DEFAULT '{}';

-- 3. Add user_prompt column (nullable, max 500 chars)
-- User-provided instructions for refining the comparison (sanitized at API level)
ALTER TABLE public.comparisons 
  ADD COLUMN IF NOT EXISTS user_prompt VARCHAR(500);

-- 4. Add parent_comparison_ids column (non-null array with empty default)
-- IDs of previous comparisons used as reference for this reformulation (lineage tracking)
ALTER TABLE public.comparisons 
  ADD COLUMN IF NOT EXISTS parent_comparison_ids TEXT[] NOT NULL DEFAULT '{}';

-- ============================================================
-- DOCUMENTATION COMMENTS (using dollar-quoting to avoid Supabase dashboard escaping issues)
-- ============================================================
COMMENT ON COLUMN public.comparisons.label IS 
  $comment$User-visible label for the comparison$comment$;
COMMENT ON COLUMN public.comparisons.focus_aspects IS 
  $comment$Array of ComparisonRow category strings that the AI should prioritize$comment$;
COMMENT ON COLUMN public.comparisons.user_prompt IS 
  $comment$User-provided instructions for refining the comparison, max 500 chars$comment$;
COMMENT ON COLUMN public.comparisons.parent_comparison_ids IS 
  $comment$UUIDs of previous comparisons used as reference for AI reformulation$comment$;

-- ============================================================
-- VERIFICATION
-- ============================================================
DO $$
BEGIN
  -- Verify all columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'comparisons' 
      AND column_name = 'label'
  ) THEN
    RAISE EXCEPTION 'Migration failed: column "label" not found in comparisons';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'comparisons' 
      AND column_name = 'focus_aspects'
  ) THEN
    RAISE EXCEPTION 'Migration failed: column "focus_aspects" not found in comparisons';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'comparisons' 
      AND column_name = 'user_prompt'
  ) THEN
    RAISE EXCEPTION 'Migration failed: column "user_prompt" not found in comparisons';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'comparisons' 
      AND column_name = 'parent_comparison_ids'
  ) THEN
    RAISE EXCEPTION 'Migration failed: column "parent_comparison_ids" not found in comparisons';
  END IF;

  RAISE NOTICE '✅ Migration 20260211_add_comparison_reformulation_fields: ALL COLUMNS VERIFIED';
END $$;
