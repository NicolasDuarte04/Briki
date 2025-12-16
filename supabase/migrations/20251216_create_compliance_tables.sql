-- ============================================================================
-- Migration: Create Compliance Tables
-- Created: 2025-12-16
-- Purpose: Create compliance_records and compliance_audit_events tables
--          to enable persistence of compliance checklist state
-- 
-- Context: Compliance tab was broken because tables didn't exist in database.
--          Code was calling prisma.complianceRecord.create() but model was missing.
--
-- Dependencies:
--   - public.cases (FK constraint)
--   - public.policy_analyses (FK constraint)
--   - auth.users (FK constraint)
--   - public.org_members (RLS policies)
-- ============================================================================

-- ============================================================================
-- PART 0: CLEANUP - DROP EXISTING TABLES IF THEY EXIST (PARTIAL STATE)
-- ============================================================================
-- Note: Tables may exist in partial state from previous failed migrations
-- CASCADE handles triggers automatically

-- Drop function first (may exist independently)
DROP FUNCTION IF EXISTS public.update_compliance_updated_at() CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.compliance_audit_events CASCADE;
DROP TABLE IF EXISTS public.compliance_records CASCADE;

-- ============================================================================
-- PART 1: CREATE compliance_records TABLE
-- ============================================================================

CREATE TABLE public.compliance_records (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    policy_analysis_id UUID REFERENCES public.policy_analyses(id) ON DELETE SET NULL,
    org_id UUID NOT NULL,  -- Multi-tenancy: links to organizations
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Compliance Data
    jurisdiction VARCHAR(2) NOT NULL,  -- 'co', 'mx', 'cl', 'br'
    insurance_type VARCHAR(50),        -- Optional: 'health', 'life', 'auto', etc.
    checklist_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- KYC Status
    kyc_status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'verified', 'failed'
    kyc_verified_at TIMESTAMPTZ,
    
    -- Validated Dates (with traceability to policy)
    validated_dates JSONB,  -- { startDate, endDate, extractedFromPolicyId, confidence }
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_case_policy_jurisdiction UNIQUE(case_id, policy_analysis_id, jurisdiction),
    CONSTRAINT valid_jurisdiction CHECK (jurisdiction IN ('co', 'mx', 'cl', 'br')),
    CONSTRAINT valid_kyc_status CHECK (kyc_status IN ('pending', 'verified', 'failed'))
);

-- Add comment for documentation
COMMENT ON TABLE public.compliance_records IS 'Stores compliance checklist state per case/policy/jurisdiction. Created 2025-12-16 to fix broken compliance tab.';
COMMENT ON COLUMN public.compliance_records.policy_analysis_id IS 'Links to specific policy being validated. NULL allowed for cases without policy analyses yet.';
COMMENT ON COLUMN public.compliance_records.checklist_data IS 'JSONB storing { itemId: { checked: boolean, verifiedBy: string, updatedAt: ISO8601 } }';
COMMENT ON COLUMN public.compliance_records.validated_dates IS 'JSONB storing { startDate, endDate, extractedFromPolicyId, confidence }';

-- ============================================================================
-- PART 2: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Primary query patterns:
--   1. Load compliance for specific case: WHERE case_id = ?
--   2. Filter by org for RLS: WHERE org_id IN (...)
--   3. Find by policy: WHERE policy_analysis_id = ?
--   4. Filter by jurisdiction: WHERE jurisdiction = ?

CREATE INDEX idx_compliance_records_case_id ON public.compliance_records(case_id);
CREATE INDEX idx_compliance_records_org_id ON public.compliance_records(org_id);
CREATE INDEX idx_compliance_records_policy_analysis_id ON public.compliance_records(policy_analysis_id) WHERE policy_analysis_id IS NOT NULL;
CREATE INDEX idx_compliance_records_jurisdiction ON public.compliance_records(jurisdiction);
CREATE INDEX idx_compliance_records_created_at ON public.compliance_records(created_at DESC);

-- Composite index for common query: case + jurisdiction
CREATE INDEX idx_compliance_records_case_jurisdiction ON public.compliance_records(case_id, jurisdiction);

-- ============================================================================
-- PART 3: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.compliance_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT compliance records from their organizations
CREATE POLICY "compliance_records_org_isolation_select"
ON public.compliance_records
FOR SELECT
USING (
    org_id IN (
        SELECT org_id 
        FROM public.org_members
        WHERE user_id = auth.uid()
    )
);

-- Policy: Users can only INSERT compliance records into their organizations
CREATE POLICY "compliance_records_org_isolation_insert"
ON public.compliance_records
FOR INSERT
WITH CHECK (
    org_id IN (
        SELECT org_id 
        FROM public.org_members
        WHERE user_id = auth.uid()
    )
);

-- Policy: Users can only UPDATE compliance records from their organizations
CREATE POLICY "compliance_records_org_isolation_update"
ON public.compliance_records
FOR UPDATE
USING (
    org_id IN (
        SELECT org_id 
        FROM public.org_members
        WHERE user_id = auth.uid()
    )
);

-- Policy: Users can only DELETE compliance records from their organizations
CREATE POLICY "compliance_records_org_isolation_delete"
ON public.compliance_records
FOR DELETE
USING (
    org_id IN (
        SELECT org_id 
        FROM public.org_members
        WHERE user_id = auth.uid()
    )
);

-- ============================================================================
-- PART 4: CREATE compliance_audit_events TABLE
-- ============================================================================

CREATE TABLE public.compliance_audit_events (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    record_id UUID NOT NULL REFERENCES public.compliance_records(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    
    -- Event Data
    event_type VARCHAR(50) NOT NULL,  -- 'RecordCreated', 'RecordUpdated', 'ItemChecked', 'ItemUnchecked', 'KYCVerified', 'DatesValidated'
    item_id VARCHAR(100),  -- For ItemChecked/ItemUnchecked events: 'co_item_kyc', 'mx_item_rut', etc.
    document_id UUID,  -- For future document upload events
    
    -- Metadata (flexible JSON for additional context)
    metadata JSONB,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE public.compliance_audit_events IS 'Audit trail for all compliance record changes. Immutable log for regulatory compliance.';
COMMENT ON COLUMN public.compliance_audit_events.event_type IS 'Type of event. Common values: RecordCreated, ItemChecked, KYCVerified, DatesValidated';
COMMENT ON COLUMN public.compliance_audit_events.item_id IS 'Checklist item ID for ItemChecked/ItemUnchecked events';
COMMENT ON COLUMN public.compliance_audit_events.metadata IS 'Flexible JSONB for event-specific data';

-- ============================================================================
-- PART 5: CREATE INDEXES FOR AUDIT TABLE
-- ============================================================================

-- Common query patterns:
--   1. Get audit log for specific compliance record: WHERE record_id = ?
--   2. Filter by event type: WHERE event_type = ?
--   3. Recent events first: ORDER BY created_at DESC

CREATE INDEX idx_compliance_audit_record_id ON public.compliance_audit_events(record_id);
CREATE INDEX idx_compliance_audit_event_type ON public.compliance_audit_events(event_type);
CREATE INDEX idx_compliance_audit_created_at ON public.compliance_audit_events(created_at DESC);
CREATE INDEX idx_compliance_audit_user_id ON public.compliance_audit_events(user_id);

-- Composite index for common query: record + event type
CREATE INDEX idx_compliance_audit_record_event ON public.compliance_audit_events(record_id, event_type);

-- ============================================================================
-- PART 6: ENABLE RLS FOR AUDIT TABLE
-- ============================================================================

ALTER TABLE public.compliance_audit_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT audit events for compliance records they have access to
CREATE POLICY "compliance_audit_org_isolation_select"
ON public.compliance_audit_events
FOR SELECT
USING (
    record_id IN (
        SELECT id 
        FROM public.compliance_records
        WHERE org_id IN (
            SELECT org_id 
            FROM public.org_members
            WHERE user_id = auth.uid()
        )
    )
);

-- Policy: Users can only INSERT audit events for their own actions
-- Note: No UPDATE/DELETE policies - audit logs are immutable
CREATE POLICY "compliance_audit_insert_own_events"
ON public.compliance_audit_events
FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND
    record_id IN (
        SELECT id 
        FROM public.compliance_records
        WHERE org_id IN (
            SELECT org_id 
            FROM public.org_members
            WHERE user_id = auth.uid()
        )
    )
);

-- ============================================================================
-- PART 7: CREATE TRIGGER FOR updated_at
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at on every UPDATE
CREATE TRIGGER trigger_compliance_updated_at
    BEFORE UPDATE ON public.compliance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_compliance_updated_at();

-- ============================================================================
-- PART 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to authenticated users
-- Note: RLS policies will still enforce org isolation

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compliance_records TO authenticated;
GRANT SELECT, INSERT ON public.compliance_audit_events TO authenticated;

-- Grant sequence permissions (for id generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- PART 9: VERIFICATION QUERIES (Run these manually to verify)
-- ============================================================================

-- VERIFICATION STEP 1: Check tables exist
-- SELECT tablename, schemaname 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('compliance_records', 'compliance_audit_events');

-- VERIFICATION STEP 2: Check indexes
-- SELECT indexname, tablename 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('compliance_records', 'compliance_audit_events')
-- ORDER BY tablename, indexname;

-- VERIFICATION STEP 3: Check RLS policies
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('compliance_records', 'compliance_audit_events')
-- ORDER BY tablename, cmd, policyname;

-- VERIFICATION STEP 4: Check constraints
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.compliance_records'::regclass
-- ORDER BY contype, conname;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Next steps:
-- 1. Update prisma/schema.prisma with ComplianceRecord and ComplianceAuditEvent models
-- 2. Run: npx prisma generate
-- 3. Test API endpoints: /api/compliance/records and /api/compliance/records/[caseId]
-- 4. Verify RLS by creating records as different users in different orgs
