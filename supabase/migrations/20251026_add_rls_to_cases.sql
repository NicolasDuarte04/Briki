-- Migration: Add RLS to cases table
-- Created: 2025-10-26
-- Purpose: Enable Row Level Security for cases to ensure organization isolation

-- Enable RLS on cases table
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Policy: Members can select cases from their organizations
CREATE POLICY "cases_org_isolation_select" ON public.cases
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Members can insert cases into their organizations
CREATE POLICY "cases_org_isolation_insert" ON public.cases
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Members can update cases from their organizations
CREATE POLICY "cases_org_isolation_update" ON public.cases
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only admins and owners can delete cases
CREATE POLICY "cases_org_isolation_delete" ON public.cases
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Add comments
COMMENT ON POLICY "cases_org_isolation_select" ON public.cases IS 'Members can view cases from their organizations';
COMMENT ON POLICY "cases_org_isolation_insert" ON public.cases IS 'Members can create cases in their organizations';
COMMENT ON POLICY "cases_org_isolation_update" ON public.cases IS 'Members can update cases in their organizations';
COMMENT ON POLICY "cases_org_isolation_delete" ON public.cases IS 'Only admins and owners can delete cases';
