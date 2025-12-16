-- ============================================================================
-- MIGRATION: ADD RENEWALS FUNCTIONALITY - FASE 1
-- Created: 2025-12-11
-- Description: Adds Renewal, RenewalHistory, RenewalAlert tables and enums
--              to support broker renewal workflow
-- ============================================================================

-- 1. CREATE ENUMS
-- ============================================================================

-- Renewal Status
CREATE TYPE public.renewal_status_enum AS ENUM (
  'pending',
  'in_review',
  'approved',
  'renewed',
  'expired'
);

-- Renewal Window Status (urgency tracking)
CREATE TYPE public.renewal_window_status_enum AS ENUM (
  'ok',
  'dueSoon',
  'overdue'
);

-- Renewal Alert Types
CREATE TYPE public.renewal_alert_type_enum AS ENUM (
  'reminder',
  'premium_increase',
  'coverage_change',
  'expiry_warning',
  'document_required'
);

-- Alert Severity Levels
CREATE TYPE public.alert_severity_enum AS ENUM (
  'info',
  'warning',
  'critical'
);

-- 2. CREATE TABLES
-- ============================================================================

-- Main Renewals Table
CREATE TABLE public.renewals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  policy_analysis_id UUID REFERENCES public.policy_analyses(id) ON DELETE SET NULL,
  org_id UUID NOT NULL,
  
  -- Policy identification
  carrier VARCHAR(255) NOT NULL,
  policy_number VARCHAR(100),
  plan_name VARCHAR(255) NOT NULL,
  
  -- Validity dates
  current_start_date TIMESTAMPTZ(6) NOT NULL,
  current_end_date TIMESTAMPTZ(6) NOT NULL,
  renewal_date TIMESTAMPTZ(6) NOT NULL,
  
  -- Financial data (amounts in minor units - centavos)
  current_premium_minor INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'COP',
  proposed_premium_minor INTEGER,
  premium_change_pct DECIMAL(5, 2),
  
  -- Status tracking
  status public.renewal_status_enum NOT NULL DEFAULT 'pending',
  renewal_window_status public.renewal_window_status_enum NOT NULL DEFAULT 'ok',
  
  -- Reminders
  reminder_set BOOLEAN NOT NULL DEFAULT false,
  reminder_date TIMESTAMPTZ(6),
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Renewal History Table (historical records)
CREATE TABLE public.renewal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id UUID NOT NULL REFERENCES public.renewals(id) ON DELETE CASCADE,
  
  -- Period information
  period_start TIMESTAMPTZ(6) NOT NULL,
  period_end TIMESTAMPTZ(6) NOT NULL,
  premium_minor INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'COP',
  
  -- Changes detected compared to previous period
  changes JSONB,
  
  -- Link to source documents
  policy_analysis_id UUID,
  artifact_id UUID,
  
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- Renewal Alerts Table
CREATE TABLE public.renewal_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id UUID NOT NULL REFERENCES public.renewals(id) ON DELETE CASCADE,
  
  -- Alert details
  alert_type public.renewal_alert_type_enum NOT NULL,
  severity public.alert_severity_enum NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  
  -- Tracking
  sent_at TIMESTAMPTZ(6),
  acknowledged_at TIMESTAMPTZ(6),
  dismissed_at TIMESTAMPTZ(6),
  
  -- Target user
  user_id UUID,
  
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Renewals indexes
CREATE INDEX idx_renewals_case_id ON public.renewals(case_id);
CREATE INDEX idx_renewals_org_id ON public.renewals(org_id);
CREATE INDEX idx_renewals_renewal_date ON public.renewals(renewal_date);
CREATE INDEX idx_renewals_status ON public.renewals(status);
CREATE INDEX idx_renewals_window_status ON public.renewals(renewal_window_status);

-- Renewal History indexes
CREATE INDEX idx_renewal_history_renewal_id ON public.renewal_history(renewal_id);
CREATE INDEX idx_renewal_history_period ON public.renewal_history(period_start, period_end);

-- Renewal Alerts indexes
CREATE INDEX idx_renewal_alerts_renewal_id ON public.renewal_alerts(renewal_id);
CREATE INDEX idx_renewal_alerts_sent_at ON public.renewal_alerts(sent_at);
CREATE INDEX idx_renewal_alerts_type ON public.renewal_alerts(alert_type);

-- 4. ADD RLS (Row Level Security) POLICIES
-- ============================================================================
-- IMPORTANTE: Estas políticas deben ajustarse según tu implementación RLS existente
-- Revisa las políticas de 'cases' y 'policy_analyses' para mantener consistencia

-- Enable RLS on new tables
ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view renewals in their organization
CREATE POLICY "Users can view renewals in their org"
  ON public.renewals
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert renewals in their organization
CREATE POLICY "Users can insert renewals in their org"
  ON public.renewals
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update renewals in their organization
CREATE POLICY "Users can update renewals in their org"
  ON public.renewals
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete renewals in their organization
CREATE POLICY "Users can delete renewals in their org"
  ON public.renewals
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- RLS for renewal_history (view only via renewal relationship)
CREATE POLICY "Users can view renewal history via renewal"
  ON public.renewal_history
  FOR SELECT
  USING (
    renewal_id IN (
      SELECT id FROM public.renewals
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert renewal history via renewal"
  ON public.renewal_history
  FOR INSERT
  WITH CHECK (
    renewal_id IN (
      SELECT id FROM public.renewals
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS for renewal_alerts (view and manage)
CREATE POLICY "Users can view renewal alerts via renewal"
  ON public.renewal_alerts
  FOR SELECT
  USING (
    renewal_id IN (
      SELECT id FROM public.renewals
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert renewal alerts via renewal"
  ON public.renewal_alerts
  FOR INSERT
  WITH CHECK (
    renewal_id IN (
      SELECT id FROM public.renewals
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update renewal alerts via renewal"
  ON public.renewal_alerts
  FOR UPDATE
  USING (
    renewal_id IN (
      SELECT id FROM public.renewals
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- 5. ADD TRIGGERS FOR UPDATED_AT TIMESTAMP
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for renewals table
CREATE TRIGGER update_renewals_updated_at
  BEFORE UPDATE ON public.renewals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.renewals IS 'Tracks policy renewals for the broker workflow. Links to cases and optional policy analysis.';
COMMENT ON TABLE public.renewal_history IS 'Historical records of past renewal periods for trend analysis and premium tracking.';
COMMENT ON TABLE public.renewal_alerts IS 'Alerts and notifications for renewal deadlines, changes, and requirements.';

COMMENT ON COLUMN public.renewals.current_premium_minor IS 'Premium amount in minor units (centavos). Divide by 100 for display.';
COMMENT ON COLUMN public.renewals.renewal_window_status IS 'Auto-calculated urgency: ok (>30d), dueSoon (<=30d), overdue (past due)';
COMMENT ON COLUMN public.renewal_history.changes IS 'JSON object tracking changes from previous period: {premiumChange: %, coveragesAdded: [], coveragesRemoved: []}';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify tables created: SELECT * FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'renewal%';
-- 3. Verify enums created: SELECT * FROM pg_type WHERE typname LIKE '%renewal%';
-- 4. Test RLS policies with a test user
-- 5. Confirm to proceed with FASE 2 (API Endpoints)
-- ============================================================================
