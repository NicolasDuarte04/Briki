-- ============================================================================
-- Migration: Create generated_proposals table with RLS
-- Created: 2025-12-01
-- Purpose: Store generated proposals for cases with full organization isolation
-- Phase: 31.5 - Proposals Tab Implementation
-- ============================================================================

-- ============================================================================
-- STEP 1: Create the generated_proposals table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.generated_proposals (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    comparison_id UUID REFERENCES public.comparisons(id) ON DELETE SET NULL,
    
    -- Proposal metadata
    version VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (version IN ('client', 'technical')),
    
    -- Content stored as JSONB for flexibility
    -- Structure: {
    --   brokerProfile: { agency, phone, email, ... },
    --   selectedPlans: [{ planId, rationaleKey }, ...],
    --   disclosuresKeys: ["key1", "key2", ...],
    --   mathCheck: { passed: boolean, messageKey: string },
    --   shareUrl: string,
    --   generatedOn: ISO timestamp,
    --   comparisonSummary?: any,
    --   customNotes?: string
    -- }
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Audit fields
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    
    -- User who generated this proposal
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Organization for RLS (denormalized for performance)
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

-- Index for finding proposals by case (most common query)
CREATE INDEX IF NOT EXISTS idx_generated_proposals_case_id 
    ON public.generated_proposals(case_id);

-- Index for finding proposals by case ordered by date
CREATE INDEX IF NOT EXISTS idx_generated_proposals_case_created 
    ON public.generated_proposals(case_id, created_at DESC);

-- Index for RLS org filtering
CREATE INDEX IF NOT EXISTS idx_generated_proposals_org_id 
    ON public.generated_proposals(org_id);

-- Index for user's proposals
CREATE INDEX IF NOT EXISTS idx_generated_proposals_user_id 
    ON public.generated_proposals(user_id);

-- Composite index for org + version queries
CREATE INDEX IF NOT EXISTS idx_generated_proposals_org_version 
    ON public.generated_proposals(org_id, version);

-- ============================================================================
-- STEP 3: Create trigger for updated_at
-- ============================================================================

-- Function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_generated_proposals_updated_at ON public.generated_proposals;
CREATE TRIGGER update_generated_proposals_updated_at
    BEFORE UPDATE ON public.generated_proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STEP 4: Enable Row Level Security
-- ============================================================================

ALTER TABLE public.generated_proposals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS Policies
-- ============================================================================

-- Policy: Members can SELECT proposals from their organization
-- Uses org_id directly for better performance (denormalized)
CREATE POLICY "generated_proposals_org_select" ON public.generated_proposals
    FOR SELECT
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can INSERT proposals for cases in their organization
CREATE POLICY "generated_proposals_org_insert" ON public.generated_proposals
    FOR INSERT
    WITH CHECK (
        -- Verify the case belongs to user's org
        case_id IN (
            SELECT id FROM public.cases
            WHERE org_id IN (
                SELECT org_id FROM public.org_members
                WHERE user_id = auth.uid()
            )
        )
        AND
        -- Verify org_id matches user's org
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Members can UPDATE their own proposals or any in their org (if admin/owner)
CREATE POLICY "generated_proposals_org_update" ON public.generated_proposals
    FOR UPDATE
    USING (
        -- User created this proposal
        user_id = auth.uid()
        OR
        -- User is admin/owner in the org
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    );

-- Policy: Only admins and owners can DELETE proposals
CREATE POLICY "generated_proposals_org_delete" ON public.generated_proposals
    FOR DELETE
    USING (
        org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    );

-- ============================================================================
-- STEP 6: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE public.generated_proposals IS 
    'Stores generated proposals for insurance cases. Each proposal is tied to a case and optionally a comparison.';

COMMENT ON COLUMN public.generated_proposals.id IS 'Unique identifier for the proposal';
COMMENT ON COLUMN public.generated_proposals.case_id IS 'Reference to the case this proposal belongs to';
COMMENT ON COLUMN public.generated_proposals.comparison_id IS 'Optional reference to the comparison used to generate this proposal';
COMMENT ON COLUMN public.generated_proposals.version IS 'Proposal version type: client (simplified) or technical (detailed)';
COMMENT ON COLUMN public.generated_proposals.content IS 'JSONB content with broker profile, selected plans, disclosures, etc.';
COMMENT ON COLUMN public.generated_proposals.user_id IS 'User who generated this proposal';
COMMENT ON COLUMN public.generated_proposals.org_id IS 'Organization ID for RLS (denormalized from case)';

COMMENT ON POLICY "generated_proposals_org_select" ON public.generated_proposals IS 
    'Members can view proposals from their organization';
COMMENT ON POLICY "generated_proposals_org_insert" ON public.generated_proposals IS 
    'Members can create proposals for cases in their organization';
COMMENT ON POLICY "generated_proposals_org_update" ON public.generated_proposals IS 
    'Members can update their own proposals, admins/owners can update any';
COMMENT ON POLICY "generated_proposals_org_delete" ON public.generated_proposals IS 
    'Only admins and owners can delete proposals';

-- ============================================================================
-- STEP 7: Grant permissions
-- ============================================================================

-- Grant usage to authenticated users (RLS will handle row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_proposals TO authenticated;

-- Grant usage to service role (bypasses RLS for admin operations)
GRANT ALL ON public.generated_proposals TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify the migration)
-- ============================================================================

-- Verify table exists:
-- SELECT * FROM information_schema.tables WHERE table_name = 'generated_proposals';

-- Verify RLS is enabled:
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'generated_proposals';

-- Verify policies:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'generated_proposals';

-- Verify indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename = 'generated_proposals';
