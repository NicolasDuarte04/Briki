-- ============================================================================
-- MIGRATION: Create Comparisons Table
-- Date: 2025-11-30
-- Purpose: Add support for policy comparison feature (Phase 30)
-- ============================================================================

-- Description:
-- This migration creates the 'comparisons' table to store the results of
-- comparing multiple policy analyses. It includes:
--   - Table structure matching Prisma schema
--   - Performance indexes
--   - Row Level Security (RLS) policies
--   - Auto-update trigger for updated_at column

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.comparisons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    analysis_ids TEXT[] NOT NULL, -- Array of policy analysis IDs being compared
    result JSONB NOT NULL,         -- Serialized PolicyComparison object
    filters JSONB NOT NULL,        -- ComparisonFilters applied
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL -- For audit trail
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

-- Index for querying comparisons by case (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_comparisons_case_id 
ON public.comparisons(case_id);

-- Index for querying by user (for audit/history features)
CREATE INDEX IF NOT EXISTS idx_comparisons_user_id 
ON public.comparisons(user_id) 
WHERE user_id IS NOT NULL;

-- Index for querying recent comparisons (for caching/history)
CREATE INDEX IF NOT EXISTS idx_comparisons_created_at 
ON public.comparisons(created_at DESC);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- Policy: Allow users to view comparisons for cases they have access to
-- Logic: User must be a member of the case's organization
CREATE POLICY "Users can view comparisons for accessible cases" 
ON public.comparisons 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        WHERE c.id = comparisons.case_id
        AND c.org_id IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Allow users to create comparisons for cases they have access to
-- Logic: User must be a member of the case's organization
CREATE POLICY "Users can create comparisons for accessible cases" 
ON public.comparisons 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.cases c
        WHERE c.id = comparisons.case_id
        AND c.org_id IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Allow users to update comparisons for cases they have access to
-- Note: Updates might be used for filtering or adding notes in future versions
CREATE POLICY "Users can update comparisons for accessible cases" 
ON public.comparisons 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        WHERE c.id = comparisons.case_id
        AND c.org_id IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Allow users to delete comparisons for cases they have access to
-- Logic: User must be a member of the case's organization
CREATE POLICY "Users can delete comparisons for accessible cases" 
ON public.comparisons 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        WHERE c.id = comparisons.case_id
        AND c.org_id IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    )
);

-- ============================================================================
-- 5. CREATE TRIGGER FOR AUTO-UPDATE OF updated_at
-- ============================================================================

-- Note: This uses the existing update_updated_at_column() function
-- which should already exist from previous migrations

CREATE TRIGGER update_comparisons_updated_at
    BEFORE UPDATE ON public.comparisons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. ADD HELPFUL COMMENTS
-- ============================================================================

COMMENT ON TABLE public.comparisons IS 
'Stores results of comparing multiple policy analyses using AI-powered semantic alignment';

COMMENT ON COLUMN public.comparisons.id IS 
'Unique identifier for the comparison';

COMMENT ON COLUMN public.comparisons.case_id IS 
'FK to cases table - the case these policies belong to';

COMMENT ON COLUMN public.comparisons.analysis_ids IS 
'Array of policy_analyses.id values that were compared';

COMMENT ON COLUMN public.comparisons.result IS 
'Serialized PolicyComparison object containing aligned coverage rows';

COMMENT ON COLUMN public.comparisons.filters IS 
'ComparisonFilters object - categories, onlyDifferences, onlyMandatory, searchQuery';

COMMENT ON COLUMN public.comparisons.user_id IS 
'Optional FK to auth.users - tracks who created the comparison for audit purposes';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify table was created successfully
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'comparisons'
    ) THEN
        RAISE NOTICE '✅ Migration successful: comparisons table created';
    ELSE
        RAISE EXCEPTION '❌ Migration failed: comparisons table not found';
    END IF;
END $$;
