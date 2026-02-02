-- ============================================================================
-- Migración: Agregar campo contextualized_at a case_policy_links
-- Fecha: 2026-02-02
-- Descripción: Permite persistir el estado de contextualización de pólizas
--              vinculadas de organización en casos específicos.
--
-- CONTEXTO:
-- Las pólizas de organización (pre-analizadas) se vinculan a casos mediante
-- CasePolicyLink. Este campo registra CUÁNDO el usuario "cargó el análisis"
-- (contextualizó la póliza con los datos del cliente/caso).
--
-- REGLA DE NEGOCIO:
-- - NULL = póliza vinculada pero NO contextualizada → mostrar "Cargar Análisis"
-- - NOT NULL = póliza ya contextualizada → mostrar "Ver en PDF"
--
-- SEGURIDAD: Los registros existentes quedarán con NULL (pendientes),
-- lo cual es correcto para casos históricos que necesitan re-contextualización.
-- ============================================================================

-- 1. Agregar columna contextualized_at (nullable)
ALTER TABLE public.case_policy_links
ADD COLUMN IF NOT EXISTS contextualized_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Agregar comentario descriptivo
COMMENT ON COLUMN public.case_policy_links.contextualized_at IS 
'Timestamp de cuando la póliza fue contextualizada con el caso. NULL = pendiente de contextualización.';

-- 3. Crear índice para consultas de pólizas pendientes de contextualización
CREATE INDEX IF NOT EXISTS idx_case_policy_links_contextualized_at 
ON public.case_policy_links(contextualized_at) 
WHERE contextualized_at IS NULL;

-- 4. Log de migración
DO $$
BEGIN
  RAISE NOTICE '[MIGRACIÓN 20260202] Campo contextualized_at agregado a case_policy_links';
END $$;
