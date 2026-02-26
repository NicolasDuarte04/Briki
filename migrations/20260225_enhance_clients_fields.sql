-- ============================================================================
-- MIGRACIÓN: Enriquecimiento de campos de clientes
-- Fecha: 2026-02-25
-- Descripción: Agrega campos complementarios a la tabla clients para
--              soportar la distinción Persona Natural / Persona Jurídica
--              y datos actuariales críticos para cotización de seguros
--              de personas (Vida, Salud, Autos, Accidentes Personales).
--
-- Campos nuevos:
--   Discriminador: person_type (VARCHAR, no sensible, DEFAULT 'natural')
--   Persona Natural:
--     last_name_enc (BYTEA, PII encriptado) — Apellidos
--     birth_date (DATE, no sensible) — Fecha de nacimiento (cálculo actuarial)
--     gender (VARCHAR, no sensible) — Factor actuarial
--     occupation_enc (BYTEA, PII encriptado) — Define riesgo en Vida/AP
--     marital_status (VARCHAR, no sensible) — Relevante para pólizas familiares
--
-- Seguridad:
--   - RLS existente opera a nivel de fila (org_id) → cubre columnas nuevas automáticamente
--   - Triggers de auditoría existentes aplican sobre la tabla completa
--   - Todos los ALTER ADD COLUMN con DEFAULT NULL son non-blocking en PostgreSQL
--   - person_type DEFAULT 'natural' garantiza retrocompatibilidad con datos existentes
-- ============================================================================

-- ============================================================================
-- DISCRIMINADOR: TIPO DE PERSONA
-- ============================================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS person_type VARCHAR(20) DEFAULT 'natural';
  -- 'natural' = Persona Natural, 'juridica' = Persona Jurídica
  -- DEFAULT 'natural' asigna automáticamente a clientes existentes

COMMENT ON COLUMN public.clients.person_type IS 'Tipo de persona: natural (persona natural) o juridica (persona jurídica). DEFAULT natural para retrocompatibilidad.';

-- ============================================================================
-- DATOS DE PERSONA NATURAL — Campos actuariales
-- ============================================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS last_name_enc BYTEA;
  -- Apellidos completos (cifrado PII). Solo aplica para persona natural.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS birth_date DATE;
  -- Fecha de nacimiento. Crítico para cotización de Salud y Vida.
  -- Se mantiene como DATE plano (no encriptado) por necesidad de cálculos
  -- actuariales. Convención del proyecto: constitution_date, financial_cut_date,
  -- legal_rep_start_date son todas DATE plano. Protegido por RLS a nivel de fila.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
  -- Factor actuarial para salud y autos.
  -- Valores: 'masculino', 'femenino', 'otro', 'no_especifica'

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS occupation_enc BYTEA;
  -- Profesión/Ocupación (cifrado PII). Define riesgo en Vida y Accidentes Personales.
  -- Encriptado porque combinado con otros campos puede ser identificante.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20);
  -- Estado civil. Relevante para pólizas familiares.
  -- Valores: 'soltero', 'casado', 'union_libre', 'divorciado', 'viudo'

COMMENT ON COLUMN public.clients.last_name_enc IS 'Apellidos completos (cifrado PII). Solo para persona natural.';
COMMENT ON COLUMN public.clients.birth_date IS 'Fecha de nacimiento. Crítico para cotización actuarial (Salud, Vida). Protegido por RLS.';
COMMENT ON COLUMN public.clients.gender IS 'Género: masculino, femenino, otro, no_especifica. Factor actuarial.';
COMMENT ON COLUMN public.clients.occupation_enc IS 'Profesión/Ocupación (cifrado PII). Define nivel de riesgo en Vida/AP.';
COMMENT ON COLUMN public.clients.marital_status IS 'Estado civil: soltero, casado, union_libre, divorciado, viudo. Para pólizas familiares.';

-- ============================================================================
-- ÍNDICE PARA FILTRADO POR TIPO DE PERSONA
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_clients_person_type
ON public.clients(person_type);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migración 20260225_enhance_clients_fields completada exitosamente.';
  RAISE NOTICE '   6 columnas nuevas agregadas a public.clients';
  RAISE NOTICE '   2 encriptadas (PII): last_name_enc, occupation_enc';
  RAISE NOTICE '   4 no encriptadas: person_type, birth_date, gender, marital_status';
  RAISE NOTICE '   1 índice creado: idx_clients_person_type';
  RAISE NOTICE '   RLS y triggers de auditoría cubren automáticamente las nuevas columnas.';
  RAISE NOTICE '   Clientes existentes asignados como person_type=natural por DEFAULT.';
END $$;
