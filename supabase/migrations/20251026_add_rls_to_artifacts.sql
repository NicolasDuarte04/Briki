-- Migration: Add RLS to artifacts table
-- Created: 2025-10-26
-- Purpose: Enable Row Level Security for artifacts to ensure organization isolation through cases

-- Enable RLS on artifacts table
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

-- Policy: Members can select artifacts from cases in their organizations
CREATE POLICY "artifacts_org_isolation_select" ON public.artifacts
  FOR SELECT
  USING (
    case_id IN (
      SELECT id FROM public.cases
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Members can insert artifacts for cases in their organizations
CREATE POLICY "artifacts_org_isolation_insert" ON public.artifacts
  FOR INSERT
  WITH CHECK (
    case_id IN (
      SELECT id FROM public.cases
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Members can update artifacts for cases in their organizations
CREATE POLICY "artifacts_org_isolation_update" ON public.artifacts
  FOR UPDATE
  USING (
    case_id IN (
      SELECT id FROM public.cases
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Only admins and owners can delete artifacts
CREATE POLICY "artifacts_org_isolation_delete" ON public.artifacts
  FOR DELETE
  USING (
    case_id IN (
      SELECT id FROM public.cases
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
      )
    )
  );

-- Add comments
COMMENT ON POLICY "artifacts_org_isolation_select" ON public.artifacts IS 'Members can view artifacts from cases in their organizations';
COMMENT ON POLICY "artifacts_org_isolation_insert" ON public.artifacts IS 'Members can create artifacts for cases in their organizations';
COMMENT ON POLICY "artifacts_org_isolation_update" ON public.artifacts IS 'Members can update artifacts for cases in their organizations';
COMMENT ON POLICY "artifacts_org_isolation_delete" ON public.artifacts IS 'Only admins and owners can delete artifacts';
