-- Migration: Add policy_analyses and policy_page_references tables
-- Created: 2025-11-16
-- Purpose: Enable structured policy analysis with PDF coordinate references
-- Phase: 1 - Infrastructure Preparation
-- Source: PLAN_ANALISIS_POLIZAS_PDF.md (Section 6.1.1)

-- ============================================================================
-- TABLE: policy_analyses
-- ============================================================================
-- Stores structured data extracted from policy PDF artifacts
CREATE TABLE IF NOT EXISTS public.policy_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL,
  case_id UUID NOT NULL,
  org_id UUID NOT NULL,
  
  -- Extracted structured data
  extracted_data JSONB NOT NULL,
  
  -- Extraction metadata
  extraction_method TEXT NOT NULL DEFAULT 'hybrid' CHECK (extraction_method IN ('manual', 'ocr', 'hybrid')),
  overall_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (overall_confidence >= 0 AND overall_confidence <= 1),
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_policy_analyses_artifact FOREIGN KEY (artifact_id) 
    REFERENCES public.artifacts(id) ON DELETE CASCADE,
  CONSTRAINT fk_policy_analyses_case FOREIGN KEY (case_id) 
    REFERENCES public.cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_policy_analyses_org FOREIGN KEY (org_id) 
    REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- Indices for fast querying
CREATE INDEX IF NOT EXISTS idx_policy_analyses_artifact_id ON public.policy_analyses(artifact_id);
CREATE INDEX IF NOT EXISTS idx_policy_analyses_case_id ON public.policy_analyses(case_id);
CREATE INDEX IF NOT EXISTS idx_policy_analyses_org_id ON public.policy_analyses(org_id);
CREATE INDEX IF NOT EXISTS idx_policy_analyses_extracted_at ON public.policy_analyses(extracted_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_analyses_confidence ON public.policy_analyses(overall_confidence);

-- GIN index for JSONB search
CREATE INDEX IF NOT EXISTS idx_policy_analyses_extracted_data ON public.policy_analyses USING gin(extracted_data);

-- Comment for documentation
COMMENT ON TABLE public.policy_analyses IS 'Stores structured policy data extracted from PDF artifacts with AI analysis';
COMMENT ON COLUMN public.policy_analyses.extracted_data IS 'JSONB structure containing insurer, policy details, coverages, exclusions, deductibles, etc.';
COMMENT ON COLUMN public.policy_analyses.extraction_method IS 'Method used: manual (user input), ocr (optical character recognition), hybrid (OCR + AI)';
COMMENT ON COLUMN public.policy_analyses.overall_confidence IS 'Confidence score from 0 to 1 for the entire analysis';

-- ============================================================================
-- TABLE: policy_page_references
-- ============================================================================
-- Stores references to specific locations in the PDF where data was found
CREATE TABLE IF NOT EXISTS public.policy_page_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_analysis_id UUID NOT NULL,
  
  -- Referenced field
  field_name TEXT NOT NULL,
  field_value TEXT,
  
  -- Location in PDF
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  bounding_box JSONB,
  
  -- Field-specific confidence
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT fk_policy_page_refs_analysis FOREIGN KEY (policy_analysis_id) 
    REFERENCES public.policy_analyses(id) ON DELETE CASCADE
);

-- Indices for fast querying
CREATE INDEX IF NOT EXISTS idx_policy_page_refs_analysis_id ON public.policy_page_references(policy_analysis_id);
CREATE INDEX IF NOT EXISTS idx_policy_page_refs_field_name ON public.policy_page_references(field_name);
CREATE INDEX IF NOT EXISTS idx_policy_page_refs_page_number ON public.policy_page_references(page_number);
CREATE INDEX IF NOT EXISTS idx_policy_page_refs_confidence ON public.policy_page_references(confidence);

-- Comment for documentation
COMMENT ON TABLE public.policy_page_references IS 'Maps extracted policy fields to their exact locations in the source PDF';
COMMENT ON COLUMN public.policy_page_references.field_name IS 'Field identifier (e.g., premium, deductible, coverage_medical)';
COMMENT ON COLUMN public.policy_page_references.bounding_box IS 'JSONB with {x, y, width, height} coordinates in PDF units';
COMMENT ON COLUMN public.policy_page_references.confidence IS 'Confidence score from 0 to 1 for this specific field extraction';

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on policy_analyses
ALTER TABLE public.policy_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view policy_analyses from their organization
CREATE POLICY "policy_analyses_org_isolation_select" 
  ON public.policy_analyses 
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert policy_analyses in their organization
CREATE POLICY "policy_analyses_org_isolation_insert" 
  ON public.policy_analyses 
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update policy_analyses in their organization
CREATE POLICY "policy_analyses_org_isolation_update" 
  ON public.policy_analyses 
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only admins and owners can delete policy_analyses
CREATE POLICY "policy_analyses_org_isolation_delete" 
  ON public.policy_analyses 
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Enable RLS on policy_page_references (inherits through policy_analyses)
ALTER TABLE public.policy_page_references ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view page_references via policy_analyses
CREATE POLICY "policy_page_refs_org_isolation_select" 
  ON public.policy_page_references 
  FOR SELECT
  USING (
    policy_analysis_id IN (
      SELECT id FROM public.policy_analyses
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can insert page_references via policy_analyses
CREATE POLICY "policy_page_refs_org_isolation_insert" 
  ON public.policy_page_references 
  FOR INSERT
  WITH CHECK (
    policy_analysis_id IN (
      SELECT id FROM public.policy_analyses
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update page_references via policy_analyses
CREATE POLICY "policy_page_refs_org_isolation_update" 
  ON public.policy_page_references 
  FOR UPDATE
  USING (
    policy_analysis_id IN (
      SELECT id FROM public.policy_analyses
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: Only admins and owners can delete page_references
CREATE POLICY "policy_page_refs_org_isolation_delete" 
  ON public.policy_page_references 
  FOR DELETE
  USING (
    policy_analysis_id IN (
      SELECT id FROM public.policy_analyses
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
      )
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run: supabase db push (if using local dev)
-- 2. Update Prisma schema (see PLAN_ANALISIS_POLIZAS_PDF.md Section 6.1.2)
-- 3. Run: npx prisma generate
-- 4. Test migration integrity (see tests/db/policy-analyses-migrations.test.ts)

