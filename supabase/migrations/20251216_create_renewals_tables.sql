-- ============================================================================
-- Migration: Create Renewals Tables
-- Created: 2025-12-16
-- Purpose: Create renewals, renewal_history, renewal_alerts tables
--          with enums, indexes, RLS policies, and triggers
-- 
-- IDEMPOTENT: Safe to re-run - uses IF NOT EXISTS and DO blocks
-- EJECUTAR EN: Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- ============================================================================
-- PART 0: CREATE ENUMS (with existence check)
-- ============================================================================

-- Renewal Status Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'renewal_status_enum') THEN
    CREATE TYPE public.renewal_status_enum AS ENUM (
      'pending',
      'in_review',
      'approved',
      'renewed',
      'expired'
    );
    RAISE NOTICE '✅ Creado: renewal_status_enum';
  ELSE
    RAISE NOTICE '⏭️ Ya existe: renewal_status_enum';
  END IF;
END$$;

-- Renewal Window Status Enum (urgency tracking)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'renewal_window_status_enum') THEN
    CREATE TYPE public.renewal_window_status_enum AS ENUM (
      'ok',
      'dueSoon',
      'overdue'
    );
    RAISE NOTICE '✅ Creado: renewal_window_status_enum';
  ELSE
    RAISE NOTICE '⏭️ Ya existe: renewal_window_status_enum';
  END IF;
END$$;

-- Renewal Alert Type Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'renewal_alert_type_enum') THEN
    CREATE TYPE public.renewal_alert_type_enum AS ENUM (
      'reminder',
      'premium_increase',
      'coverage_change',
      'expiry_warning',
      'document_required'
    );
    RAISE NOTICE '✅ Creado: renewal_alert_type_enum';
  ELSE
    RAISE NOTICE '⏭️ Ya existe: renewal_alert_type_enum';
  END IF;
END$$;

-- Alert Severity Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity_enum') THEN
    CREATE TYPE public.alert_severity_enum AS ENUM (
      'info',
      'warning',
      'critical'
    );
    RAISE NOTICE '✅ Creado: alert_severity_enum';
  ELSE
    RAISE NOTICE '⏭️ Ya existe: alert_severity_enum';
  END IF;
END$$;

-- ============================================================================
-- PART 1: CREATE MAIN RENEWALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.renewals (
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

COMMENT ON TABLE public.renewals IS 'Tracks policy renewals for broker workflow. Links to cases and optional policy analysis.';
COMMENT ON COLUMN public.renewals.current_premium_minor IS 'Premium amount in minor units (centavos). Divide by 100 for display.';
COMMENT ON COLUMN public.renewals.renewal_window_status IS 'Auto-calculated urgency: ok (>30d), dueSoon (<=30d), overdue (past due)';

-- ============================================================================
-- PART 2: CREATE RENEWAL HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.renewal_history (
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

COMMENT ON TABLE public.renewal_history IS 'Historical records of past renewal periods for trend analysis and premium tracking.';
COMMENT ON COLUMN public.renewal_history.changes IS 'JSON object: {premiumChange: %, coveragesAdded: [], coveragesRemoved: []}';

-- ============================================================================
-- PART 3: CREATE RENEWAL ALERTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.renewal_alerts (
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

COMMENT ON TABLE public.renewal_alerts IS 'Alerts and notifications for renewal deadlines, changes, and requirements.';

-- ============================================================================
-- PART 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Renewals indexes
CREATE INDEX IF NOT EXISTS idx_renewals_case_id ON public.renewals(case_id);
CREATE INDEX IF NOT EXISTS idx_renewals_org_id ON public.renewals(org_id);
CREATE INDEX IF NOT EXISTS idx_renewals_renewal_date ON public.renewals(renewal_date);
CREATE INDEX IF NOT EXISTS idx_renewals_status ON public.renewals(status);
CREATE INDEX IF NOT EXISTS idx_renewals_window_status ON public.renewals(renewal_window_status);
CREATE INDEX IF NOT EXISTS idx_renewals_policy_analysis ON public.renewals(policy_analysis_id) WHERE policy_analysis_id IS NOT NULL;

-- Renewal History indexes
CREATE INDEX IF NOT EXISTS idx_renewal_history_renewal_id ON public.renewal_history(renewal_id);
CREATE INDEX IF NOT EXISTS idx_renewal_history_period ON public.renewal_history(period_start, period_end);

-- Renewal Alerts indexes
CREATE INDEX IF NOT EXISTS idx_renewal_alerts_renewal_id ON public.renewal_alerts(renewal_id);
CREATE INDEX IF NOT EXISTS idx_renewal_alerts_sent_at ON public.renewal_alerts(sent_at);
CREATE INDEX IF NOT EXISTS idx_renewal_alerts_type ON public.renewal_alerts(alert_type);

-- ============================================================================
-- PART 5: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 6: RLS POLICIES FOR RENEWALS TABLE
-- ============================================================================

-- SELECT: Users can view renewals in their organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'renewals' 
    AND policyname = 'renewals_org_isolation_select'
  ) THEN
    CREATE POLICY "renewals_org_isolation_select" ON public.renewals
      FOR SELECT USING (
        org_id IN (
          SELECT org_id FROM public.org_members
          WHERE user_id = auth.uid()
        )
      );
    RAISE NOTICE '✅ Creada: renewals_org_isolation_select';
  END IF;
END$$;

-- INSERT: Users can insert renewals in their organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'renewals' 
    AND policyname = 'renewals_org_isolation_insert'
  ) THEN
    CREATE POLICY "renewals_org_isolation_insert" ON public.renewals
      FOR INSERT WITH CHECK (
        org_id IN (
          SELECT org_id FROM public.org_members
          WHERE user_id = auth.uid()
        )
      );
    RAISE NOTICE '✅ Creada: renewals_org_isolation_insert';
  END IF;
END$$;

-- UPDATE: Users can update renewals in their organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'renewals' 
    AND policyname = 'renewals_org_isolation_update'
  ) THEN
    CREATE POLICY "renewals_org_isolation_update" ON public.renewals
      FOR UPDATE USING (
        org_id IN (
          SELECT org_id FROM public.org_members
          WHERE user_id = auth.uid()
        )
      );
    RAISE NOTICE '✅ Creada: renewals_org_isolation_update';
  END IF;
END$$;

-- DELETE: Users can delete renewals in their organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'renewals' 
    AND policyname = 'renewals_org_isolation_delete'
  ) THEN
    CREATE POLICY "renewals_org_isolation_delete" ON public.renewals
      FOR DELETE USING (
        org_id IN (
          SELECT org_id FROM public.org_members
          WHERE user_id = auth.uid()
        )
      );
    RAISE NOTICE '✅ Creada: renewals_org_isolation_delete';
  END IF;
END$$;

-- ============================================================================
-- PART 7: RLS POLICIES FOR RENEWAL_HISTORY TABLE
-- ============================================================================

-- SELECT: Users can view history via renewal relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'renewal_history' 
    AND policyname = 'renewal_history_org_isolation_select'
  ) THEN
    CREATE POLICY "renewal_history_org_isolation_select" ON public.renewal_history
      FOR SELECT USING (
        renewal_id IN (
          SELECT id FROM public.renewals
          WHERE org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid()
          )
        )
      );
    RAISE NOTICE '✅ Creada: renewal_history_org_isolation_select';
  END IF;
END$$;

-- INSERT: Users can insert history via renewal relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'renewal_history' 
    AND policyname = 'renewal_history_org_isolation_insert'
  ) THEN
    CREATE POLICY "renewal_history_org_isolation_insert" ON public.renewal_history
      FOR INSERT WITH CHECK (
        renewal_id IN (
          SELECT id FROM public.renewals
          WHERE org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid()
          )
        )
      );
    RAISE NOTICE '✅ Creada: renewal_history_org_isolation_insert';
  END IF;
END$$;

-- ============================================================================
-- PART 8: RLS POLICIES FOR RENEWAL_ALERTS TABLE
-- ============================================================================

-- SELECT: Users can view alerts via renewal relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'renewal_alerts' 
    AND policyname = 'renewal_alerts_org_isolation_select'
  ) THEN
    CREATE POLICY "renewal_alerts_org_isolation_select" ON public.renewal_alerts
      FOR SELECT USING (
        renewal_id IN (
          SELECT id FROM public.renewals
          WHERE org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid()
          )
        )
      );
    RAISE NOTICE '✅ Creada: renewal_alerts_org_isolation_select';
  END IF;
END$$;

-- INSERT: Users can insert alerts via renewal relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'renewal_alerts' 
    AND policyname = 'renewal_alerts_org_isolation_insert'
  ) THEN
    CREATE POLICY "renewal_alerts_org_isolation_insert" ON public.renewal_alerts
      FOR INSERT WITH CHECK (
        renewal_id IN (
          SELECT id FROM public.renewals
          WHERE org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid()
          )
        )
      );
    RAISE NOTICE '✅ Creada: renewal_alerts_org_isolation_insert';
  END IF;
END$$;

-- UPDATE: Users can update alerts via renewal relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'renewal_alerts' 
    AND policyname = 'renewal_alerts_org_isolation_update'
  ) THEN
    CREATE POLICY "renewal_alerts_org_isolation_update" ON public.renewal_alerts
      FOR UPDATE USING (
        renewal_id IN (
          SELECT id FROM public.renewals
          WHERE org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid()
          )
        )
      );
    RAISE NOTICE '✅ Creada: renewal_alerts_org_isolation_update';
  END IF;
END$$;

-- ============================================================================
-- PART 9: CREATE TRIGGER FOR updated_at
-- ============================================================================

-- Function to update updated_at timestamp (may already exist from other migrations)
CREATE OR REPLACE FUNCTION public.update_renewals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_renewals_updated_at ON public.renewals;

-- Create trigger
CREATE TRIGGER trigger_renewals_updated_at
  BEFORE UPDATE ON public.renewals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_renewals_updated_at();

-- ============================================================================
-- PART 10: GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewals TO authenticated;
GRANT SELECT, INSERT ON public.renewal_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.renewal_alerts TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- PART 11: VERIFICATION QUERIES
-- ============================================================================

-- Verify tables created
SELECT 
  '📊 TABLAS CREADAS' as seccion,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('renewals', 'renewal_history', 'renewal_alerts')
ORDER BY table_name;

-- Verify enums created
SELECT 
  '🏷️ ENUMS CREADOS' as seccion,
  typname as enum_name
FROM pg_type 
WHERE typname IN (
  'renewal_status_enum', 
  'renewal_window_status_enum', 
  'renewal_alert_type_enum', 
  'alert_severity_enum'
);

-- Verify indexes created
SELECT 
  '📇 ÍNDICES CREADOS' as seccion,
  COUNT(*) as total_indexes
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('renewals', 'renewal_history', 'renewal_alerts');

-- Verify RLS policies
SELECT 
  '🔒 POLÍTICAS RLS' as seccion,
  tablename,
  COUNT(*) as policies_count
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('renewals', 'renewal_history', 'renewal_alerts')
GROUP BY tablename
ORDER BY tablename;

-- Final result
SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('renewals', 'renewal_history', 'renewal_alerts')
    ) = 3 THEN '✅ MIGRACIÓN COMPLETADA: 3/3 tablas creadas'
    ELSE '⚠️ MIGRACIÓN INCOMPLETA: Revisar errores arriba'
  END as resultado_final;
