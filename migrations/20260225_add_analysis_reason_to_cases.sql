-- ============================================================================
-- Migración: Añadir columna analysis_reason a la tabla cases
-- Fecha: 2026-02-25
-- Descripción: Campo para el motivo del análisis del caso.
--   Valores esperados: 'primera_vez', 'renovacion', 'benchmarking', 
--                       'reclamo', 'auditoria'
--   Nullable para backwards compatibility con casos existentes.
--   Obligatorio en la UI para nuevos casos.
-- ============================================================================

-- 1. Añadir columna analysis_reason
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS analysis_reason VARCHAR(30);

-- 2. Comentario descriptivo
COMMENT ON COLUMN public.cases.analysis_reason IS 
  'Motivo del análisis: primera_vez, renovacion, benchmarking, reclamo, auditoria';

-- 3. Índice para filtrado por motivo de análisis (útil para dashboards y reportes)
CREATE INDEX IF NOT EXISTS idx_cases_analysis_reason 
ON public.cases (analysis_reason) 
WHERE analysis_reason IS NOT NULL;
