-- ============================================================================
-- MIGRACIÓN: Enriquecimiento de campos de empresas
-- Fecha: 2026-02-25
-- Descripción: Agrega campos complementarios a la tabla companies para
--              completar los módulos A (Identidad), B (Representación) y
--              C (Financieros/Operativos) del formulario de empresa.
--
-- Campos nuevos:
--   Módulo A: activity_description_enc (BYTEA, PII encriptado)
--   Módulo B: notification_email_enc (BYTEA, PII encriptado)
--             headquarters_address_enc (BYTEA, PII encriptado)
--             department (VARCHAR, no sensible)
--             website (VARCHAR, dato público)
--   Módulo C: financial_cut_date (DATE, no sensible)
--             annual_payroll_enc (BYTEA, PII encriptado)
--             employee_count (INTEGER, no sensible)
--
-- Seguridad:
--   - RLS existente opera a nivel de fila → cubre columnas nuevas automáticamente
--   - Triggers de auditoría existentes aplican sobre la tabla completa
--   - Todos los ALTER ADD COLUMN con DEFAULT NULL son no-blocking en PostgreSQL
-- ============================================================================

-- ============================================================================
-- SECCIÓN A: IDENTIDAD — Campo complementario
-- ============================================================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS activity_description_enc BYTEA;
  -- Descripción de la actividad económica real de la empresa (texto libre, cifrado PII)

COMMENT ON COLUMN public.companies.activity_description_enc IS 'Descripción de actividad económica (cifrado PII). Complementa el código CIIU con texto libre.';

-- ============================================================================
-- SECCIÓN B: REPRESENTACIÓN Y UBICACIÓN — Campos complementarios
-- ============================================================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS notification_email_enc BYTEA;
  -- Email de notificación judicial (distinto del email personal del RL, cifrado PII)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS headquarters_address_enc BYTEA;
  -- Dirección completa de la sede principal (cifrado PII)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS department VARCHAR(100);
  -- Departamento/Estado de la sede principal (no sensible, para filtrado)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS website VARCHAR(500);
  -- Website corporativo (dato público, útil para investigación del agente IA)

COMMENT ON COLUMN public.companies.notification_email_enc IS 'Email de notificación judicial (cifrado PII). Distinto del email del RL.';
COMMENT ON COLUMN public.companies.headquarters_address_enc IS 'Dirección sede principal completa (cifrado PII).';
COMMENT ON COLUMN public.companies.department IS 'Departamento/Estado de la sede principal.';
COMMENT ON COLUMN public.companies.website IS 'Website corporativo público.';

-- ============================================================================
-- SECCIÓN C: DATOS FINANCIEROS Y OPERATIVOS — Campos complementarios
-- ============================================================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS financial_cut_date DATE;
  -- Fecha de corte de la información financiera (ej: 2024-12-31)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS annual_payroll_enc BYTEA;
  -- Valor de nómina anual estimada (cifrado PII, crucial para RC Patronal y Vida Grupo)

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS employee_count INTEGER;
  -- Total de empleados directos (no sensible, para dimensionamiento del negocio)

COMMENT ON COLUMN public.companies.financial_cut_date IS 'Fecha de corte de la información financiera reportada.';
COMMENT ON COLUMN public.companies.annual_payroll_enc IS 'Nómina anual estimada (cifrado PII). Crucial para RC Patronal y Vida Grupo.';
COMMENT ON COLUMN public.companies.employee_count IS 'Total empleados directos. Para dimensionamiento del negocio.';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Migración 20260225_enhance_companies_fields completada exitosamente.';
  RAISE NOTICE '   8 columnas nuevas agregadas a public.companies';
  RAISE NOTICE '   4 encriptadas (PII): activity_description_enc, notification_email_enc, headquarters_address_enc, annual_payroll_enc';
  RAISE NOTICE '   4 no encriptadas: department, website, financial_cut_date, employee_count';
  RAISE NOTICE '   RLS y triggers de auditoría cubren automáticamente las nuevas columnas.';
END $$;
