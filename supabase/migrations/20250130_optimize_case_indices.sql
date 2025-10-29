-- =====================================================
-- MIGRACIÓN: OPTIMIZACIÓN DE ÍNDICES PARA CASES Y ARTIFACTS
-- Objetivo: Mejorar performance de consultas frecuentes
-- Fecha: 2025-01-30
-- =====================================================

-- ✅ ÍNDICE 1: Búsqueda por org y status (muy frecuente en listados)
-- Uso: WHERE org_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_cases_org_status 
  ON public.cases(org_id, status)
  WHERE org_id IS NOT NULL;

COMMENT ON INDEX idx_cases_org_status IS 'Optimiza filtrado por organización y estado (usado en /api/cases)';

-- ✅ ÍNDICE 2: Ordenamiento por fecha (dashboards, listados)
-- Uso: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_cases_created_at_desc 
  ON public.cases(created_at DESC)
  WHERE org_id IS NOT NULL;

COMMENT ON INDEX idx_cases_created_at_desc IS 'Optimiza ordenamiento por fecha de creación (listados, dashboards)';

-- ✅ ÍNDICE 3: Artifacts por case y source (filtros comunes)
-- Uso: WHERE case_id = ? AND source_type = ?
CREATE INDEX IF NOT EXISTS idx_artifacts_case_source 
  ON public.artifacts(case_id, source_type)
  WHERE case_id IS NOT NULL;

COMMENT ON INDEX idx_artifacts_case_source IS 'Optimiza búsqueda de artifacts por caso y tipo de fuente';

-- ✅ ÍNDICE 4: Artifacts por fecha (ordenamiento)
-- Uso: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at_desc 
  ON public.artifacts(created_at DESC);

COMMENT ON INDEX idx_artifacts_created_at_desc IS 'Optimiza ordenamiento de artifacts por fecha';

-- =====================================================
-- VERIFICACIÓN DE ÍNDICES EXISTENTES
-- =====================================================

-- Verificar que no hay duplicados (log informativo)
DO $$
DECLARE
  existing_idx text;
BEGIN
  SELECT indexname INTO existing_idx
  FROM pg_indexes
  WHERE tablename = 'cases' AND indexname = 'idx_cases_org_status';
  
  IF existing_idx IS NOT NULL THEN
    RAISE NOTICE 'Índice idx_cases_org_status ya existe, omitiendo...';
  END IF;
END $$;


-- MIGRACIÓN: OPTIMIZACIÓN DE ÍNDICES PARA CASES Y ARTIFACTS
-- Objetivo: Mejorar performance de consultas frecuentes
-- Fecha: 2025-01-30
-- =====================================================

-- ✅ ÍNDICE 1: Búsqueda por org y status (muy frecuente en listados)
-- Uso: WHERE org_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_cases_org_status 
  ON public.cases(org_id, status)
  WHERE org_id IS NOT NULL;

COMMENT ON INDEX idx_cases_org_status IS 'Optimiza filtrado por organización y estado (usado en /api/cases)';

-- ✅ ÍNDICE 2: Ordenamiento por fecha (dashboards, listados)
-- Uso: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_cases_created_at_desc 
  ON public.cases(created_at DESC)
  WHERE org_id IS NOT NULL;

COMMENT ON INDEX idx_cases_created_at_desc IS 'Optimiza ordenamiento por fecha de creación (listados, dashboards)';

-- ✅ ÍNDICE 3: Artifacts por case y source (filtros comunes)
-- Uso: WHERE case_id = ? AND source_type = ?
CREATE INDEX IF NOT EXISTS idx_artifacts_case_source 
  ON public.artifacts(case_id, source_type)
  WHERE case_id IS NOT NULL;

COMMENT ON INDEX idx_artifacts_case_source IS 'Optimiza búsqueda de artifacts por caso y tipo de fuente';

-- ✅ ÍNDICE 4: Artifacts por fecha (ordenamiento)
-- Uso: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at_desc 
  ON public.artifacts(created_at DESC);

COMMENT ON INDEX idx_artifacts_created_at_desc IS 'Optimiza ordenamiento de artifacts por fecha';

-- =====================================================
-- VERIFICACIÓN DE ÍNDICES EXISTENTES
-- =====================================================

-- Verificar que no hay duplicados (log informativo)
DO $$
DECLARE
  existing_idx text;
BEGIN
  SELECT indexname INTO existing_idx
  FROM pg_indexes
  WHERE tablename = 'cases' AND indexname = 'idx_cases_org_status';
  
  IF existing_idx IS NOT NULL THEN
    RAISE NOTICE 'Índice idx_cases_org_status ya existe, omitiendo...';
  END IF;
END $$;


