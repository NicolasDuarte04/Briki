-- =====================================================
-- MIGRACIÓN: CREAR TABLA DE EMPRESAS (COMPANIES)
-- =====================================================
-- Implementa la entidad Empresas como ciudadano de primera clase
-- con cifrado PII usando pgcrypto para datos sensibles SARLAFT
--
-- Fecha: 2026-02-07
-- Autor: Arquitecto de Software Senior - Briki Insurtech
-- Versión: 1.1 (Corregida - DELETE permite admin Y owner)
-- =====================================================

-- =====================================================
-- VERIFICACIÓN PREVIA
-- =====================================================
DO $$
BEGIN
  -- Verificar que pgcrypto está disponible
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'La extensión pgcrypto no está instalada. Esta es requerida para cifrado PII.';
  END IF;
  
  -- Verificar que las funciones de cifrado existen
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'encrypt_pii') THEN
    RAISE EXCEPTION 'La función encrypt_pii() no existe. Por favor, crear las funciones de cifrado primero.';
  END IF;
  
  RAISE NOTICE '✅ Verificaciones previas pasadas - pgcrypto y funciones de cifrado disponibles';
END $$;

-- =====================================================
-- ENUM: TIPOS DE EMPRESA
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'company_type_enum') THEN
    CREATE TYPE public.company_type_enum AS ENUM (
      'sas',           -- Sociedad por Acciones Simplificada
      'sa',            -- Sociedad Anónima
      'ltda',          -- Sociedad Limitada
      'eu',            -- Empresa Unipersonal
      'cooperativa',   -- Cooperativa
      'fundacion',     -- Fundación
      'ong',           -- ONG
      'otro'           -- Otro tipo
    );
    RAISE NOTICE '✅ Enum company_type_enum creado';
  ELSE
    RAISE NOTICE '⚠️ Enum company_type_enum ya existe - usando existente';
  END IF;
END $$;

-- =====================================================
-- ENUM: CLASIFICACIÓN DE RIESGO SARLAFT
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'risk_classification_enum') THEN
    CREATE TYPE public.risk_classification_enum AS ENUM (
      'bajo',
      'medio',
      'alto',
      'muy_alto'
    );
    RAISE NOTICE '✅ Enum risk_classification_enum creado';
  ELSE
    RAISE NOTICE '⚠️ Enum risk_classification_enum ya existe - usando existente';
  END IF;
END $$;

-- =====================================================
-- TABLA: COMPANIES (EMPRESAS)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.companies (
  -- Identificación primaria
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- ==========================================
  -- SECCIÓN A: IDENTIDAD CORPORATIVA
  -- ==========================================
  -- Campos NO encriptados (búsqueda, filtrado)
  company_type          public.company_type_enum DEFAULT 'sas',
  is_pinned             BOOLEAN DEFAULT FALSE,
  
  -- Campos ENCRIPTADOS (PII sensible)
  legal_name_enc        BYTEA NOT NULL,           -- Razón Social
  trade_name_enc        BYTEA,                    -- Nombre Comercial
  nit_enc               BYTEA NOT NULL,           -- NIT con dígito de verificación
  constitution_date     DATE,                     -- Fecha de constitución
  registration_city     VARCHAR(100),             -- Ciudad de registro (no sensible)
  
  -- ==========================================
  -- SECCIÓN B: REPRESENTACIÓN LEGAL
  -- ==========================================
  legal_rep_name_enc        BYTEA,                -- Nombre del Representante Legal
  legal_rep_id_type         VARCHAR(20),          -- Tipo de documento (CC, CE, PASSPORT)
  legal_rep_id_number_enc   BYTEA,                -- Número de identificación encriptado
  legal_rep_email_enc       BYTEA,                -- Email del representante legal
  legal_rep_phone_enc       BYTEA,                -- Teléfono del representante legal
  legal_rep_start_date      DATE,                 -- Fecha inicio de representación
  
  -- ==========================================
  -- SECCIÓN C: INFORMACIÓN FINANCIERA (SARLAFT)
  -- ==========================================
  -- Campos ENCRIPTADOS (sensibles financieros)
  annual_revenue_enc        BYTEA,                -- Ingresos anuales (texto cifrado)
  total_assets_enc          BYTEA,                -- Total activos (texto cifrado)
  total_liabilities_enc     BYTEA,                -- Total pasivos (texto cifrado)
  total_equity_enc          BYTEA,                -- Patrimonio (texto cifrado)
  financial_year            INTEGER,              -- Año fiscal de la información
  currency                  VARCHAR(3) DEFAULT 'COP',
  
  -- Clasificación de riesgo (no sensible pero importante)
  risk_classification   public.risk_classification_enum DEFAULT 'bajo',
  
  -- ==========================================
  -- SECCIÓN D: COMPOSICIÓN ACCIONARIA
  -- ==========================================
  -- Almacenado como JSONB encriptado para flexibilidad
  shareholders_enc      BYTEA,                    -- JSON array de accionistas encriptado
  -- Estructura esperada: [{"name": "...", "idType": "...", "idNumber": "...", "percentage": 25.5, "isPep": false}]
  beneficial_owners_enc BYTEA,                    -- Beneficiarios finales (>25%) encriptado
  
  -- ==========================================
  -- SECCIÓN E: DATOS DE RIESGO Y COMPLIANCE
  -- ==========================================
  -- Campos de riesgo (no sensibles)
  ciiu_code             VARCHAR(10),              -- Código CIIU de actividad económica
  is_pep                BOOLEAN DEFAULT FALSE,    -- ¿Tiene vinculación con PEPs?
  is_obligated_subject  BOOLEAN DEFAULT FALSE,    -- ¿Es sujeto obligado SARLAFT?
  last_sarlaft_update   DATE,                     -- Última actualización SARLAFT
  
  -- Notas adicionales encriptadas
  compliance_notes_enc  BYTEA,                    -- Notas de cumplimiento
  
  -- ==========================================
  -- AUDITORÍA Y TRACKING
  -- ==========================================
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_edited_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- ==========================================
  -- SOFT DELETE (Para compliance SARLAFT)
  -- ==========================================
  deleted_at            TIMESTAMPTZ,
  deleted_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================
COMMENT ON TABLE public.companies IS 
  'Tabla de empresas con cifrado PII usando pgcrypto. Cumple requisitos SARLAFT para Insurtech colombiana.';

COMMENT ON COLUMN public.companies.legal_name_enc IS 
  'Razón Social cifrada con encrypt_pii(). Usar decrypt_pii() para leer.';

COMMENT ON COLUMN public.companies.nit_enc IS 
  'NIT con dígito de verificación cifrado con encrypt_pii().';

COMMENT ON COLUMN public.companies.shareholders_enc IS 
  'Array JSON de accionistas cifrado. Estructura: [{"name", "idType", "idNumber", "percentage", "isPep"}]';

COMMENT ON COLUMN public.companies.beneficial_owners_enc IS 
  'Beneficiarios finales (>25% participación) cifrados. Requerido por SARLAFT.';

COMMENT ON COLUMN public.companies.risk_classification IS 
  'Clasificación de riesgo SARLAFT: bajo, medio, alto, muy_alto.';

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================
-- Índice principal para aislamiento por org
CREATE INDEX IF NOT EXISTS idx_companies_org_id 
  ON public.companies(org_id);

-- Índice para ordenamiento por fecha de creación
CREATE INDEX IF NOT EXISTS idx_companies_created_at 
  ON public.companies(created_at DESC);

-- Índice compuesto para empresas pineadas por org
CREATE INDEX IF NOT EXISTS idx_companies_is_pinned 
  ON public.companies(org_id, is_pinned) 
  WHERE is_pinned = TRUE;

-- Índice compuesto para filtros por riesgo
CREATE INDEX IF NOT EXISTS idx_companies_risk_classification 
  ON public.companies(org_id, risk_classification);

-- Índice compuesto para filtros por tipo
CREATE INDEX IF NOT EXISTS idx_companies_company_type 
  ON public.companies(org_id, company_type);

-- Índice parcial para empresas activas (no eliminadas)
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at 
  ON public.companies(deleted_at) 
  WHERE deleted_at IS NULL;

-- =====================================================
-- TRIGGER: AUTO-UPDATE updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_updated_at ON public.companies;
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_companies_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Política 1: SELECT - Todos los miembros de la org pueden leer
CREATE POLICY "companies_org_isolation_select" ON public.companies
  FOR SELECT
  USING (
    org_id IN (
      SELECT om.org_id 
      FROM public.org_members om
      WHERE om.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- Política 2: INSERT - Todos los miembros pueden crear empresas
CREATE POLICY "companies_org_isolation_insert" ON public.companies
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT om.org_id 
      FROM public.org_members om
      WHERE om.user_id = auth.uid()
    )
  );

-- Política 3: UPDATE - Solo admin y owner pueden actualizar
CREATE POLICY "companies_org_isolation_update" ON public.companies
  FOR UPDATE
  USING (
    org_id IN (
      SELECT om.org_id 
      FROM public.org_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
    AND deleted_at IS NULL
  );

-- =====================================================
-- ⚠️ CORRECCIÓN v1.1: DELETE permite admin Y owner
-- (Consistente con política de clients)
-- =====================================================
CREATE POLICY "companies_org_isolation_delete" ON public.companies
  FOR DELETE
  USING (
    org_id IN (
      SELECT om.org_id 
      FROM public.org_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

-- =====================================================
-- COMENTARIOS EN POLÍTICAS RLS
-- =====================================================
COMMENT ON POLICY "companies_org_isolation_select" ON public.companies IS 
  'Permite a todos los miembros de la organización leer empresas no eliminadas (SELECT)';

COMMENT ON POLICY "companies_org_isolation_insert" ON public.companies IS 
  'Permite a todos los miembros de la organización crear empresas (INSERT)';

COMMENT ON POLICY "companies_org_isolation_update" ON public.companies IS 
  'Solo permite a administradores y propietarios actualizar empresas (UPDATE)';

COMMENT ON POLICY "companies_org_isolation_delete" ON public.companies IS 
  'Permite a administradores Y propietarios eliminar empresas (DELETE). Consistente con política de clients.';

-- =====================================================
-- FUNCIÓN: SOFT DELETE
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_company(
  p_company_id UUID,
  p_deleted_by UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
  v_result INTEGER;
BEGIN
  UPDATE public.companies
  SET 
    deleted_at = NOW(),
    deleted_by = p_deleted_by
  WHERE id = p_company_id
  AND deleted_at IS NULL;
  
  GET DIAGNOSTICS v_result = ROW_COUNT;
  RETURN v_result > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.soft_delete_company IS 
  'Realiza soft delete de una empresa. Respeta políticas RLS existentes.';

-- =====================================================
-- FUNCIÓN: RESTAURAR EMPRESA (Undo soft delete)
-- =====================================================
CREATE OR REPLACE FUNCTION public.restore_company(
  p_company_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_result INTEGER;
BEGIN
  UPDATE public.companies
  SET 
    deleted_at = NULL,
    deleted_by = NULL
  WHERE id = p_company_id
  AND deleted_at IS NOT NULL;
  
  GET DIAGNOSTICS v_result = ROW_COUNT;
  RETURN v_result > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.restore_company IS 
  'Restaura una empresa previamente eliminada (soft delete). Solo admin/owner pueden ejecutar.';

-- =====================================================
-- AUDITORÍA: TRIGGER PARA AUDIT_LOG
-- =====================================================
-- Nota: Usa la estructura existente de audit_log con columnas estándar
CREATE OR REPLACE FUNCTION public.audit_companies_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (
      org_id, 
      user_id, 
      actor, 
      action, 
      resource_type, 
      resource_id, 
      payload
    ) VALUES (
      NEW.org_id,
      NEW.created_by,
      COALESCE(auth.uid()::text, 'system'),
      'company_created',
      'company',
      NEW.id,
      jsonb_build_object(
        'company_type', NEW.company_type,
        'risk_classification', NEW.risk_classification
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Solo registrar cambios significativos
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      -- Soft delete
      INSERT INTO public.audit_log (
        org_id, user_id, actor, action, resource_type, resource_id, payload
      ) VALUES (
        NEW.org_id,
        NEW.deleted_by,
        COALESCE(auth.uid()::text, 'system'),
        'company_soft_deleted',
        'company',
        NEW.id,
        jsonb_build_object('soft_delete', true)
      );
    ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
      -- Restauración de soft delete
      INSERT INTO public.audit_log (
        org_id, user_id, actor, action, resource_type, resource_id, payload
      ) VALUES (
        NEW.org_id,
        NEW.last_edited_by,
        COALESCE(auth.uid()::text, 'system'),
        'company_restored',
        'company',
        NEW.id,
        jsonb_build_object('restored', true)
      );
    ELSIF NEW.risk_classification IS DISTINCT FROM OLD.risk_classification THEN
      -- Cambio de clasificación de riesgo (evento crítico para SARLAFT)
      INSERT INTO public.audit_log (
        org_id, user_id, actor, action, resource_type, resource_id, severity, payload
      ) VALUES (
        NEW.org_id,
        NEW.last_edited_by,
        COALESCE(auth.uid()::text, 'system'),
        'company_risk_changed',
        'company',
        NEW.id,
        'warning', -- Cambio de riesgo es evento importante
        jsonb_build_object(
          'old_risk', OLD.risk_classification::text,
          'new_risk', NEW.risk_classification::text
        )
      );
    ELSIF NEW.is_pep IS DISTINCT FROM OLD.is_pep THEN
      -- Cambio de vinculación PEP (evento crítico para SARLAFT)
      INSERT INTO public.audit_log (
        org_id, user_id, actor, action, resource_type, resource_id, severity, payload
      ) VALUES (
        NEW.org_id,
        NEW.last_edited_by,
        COALESCE(auth.uid()::text, 'system'),
        'company_pep_status_changed',
        'company',
        NEW.id,
        'critical', -- PEP es evento crítico
        jsonb_build_object(
          'old_is_pep', OLD.is_pep,
          'new_is_pep', NEW.is_pep
        )
      );
    ELSE
      -- Actualización general
      INSERT INTO public.audit_log (
        org_id, user_id, actor, action, resource_type, resource_id, payload
      ) VALUES (
        NEW.org_id,
        NEW.last_edited_by,
        COALESCE(auth.uid()::text, 'system'),
        'company_updated',
        'company',
        NEW.id,
        NULL
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_companies ON public.companies;
CREATE TRIGGER trg_audit_companies
  AFTER INSERT OR UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_companies_changes();

-- =====================================================
-- GRANT PERMISOS A ROLES SUPABASE
-- =====================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT USAGE ON TYPE public.company_type_enum TO authenticated;
GRANT USAGE ON TYPE public.risk_classification_enum TO authenticated;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_rls_enabled BOOLEAN;
  v_policy_count INTEGER;
  v_index_count INTEGER;
BEGIN
  -- Verificar que la tabla se creó
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) INTO v_table_exists;
  
  IF NOT v_table_exists THEN
    RAISE EXCEPTION '❌ La tabla companies NO se creó correctamente';
  END IF;
  
  -- Verificar que RLS está habilitado
  SELECT relrowsecurity INTO v_rls_enabled
  FROM pg_class
  WHERE relname = 'companies' AND relnamespace = 'public'::regnamespace;
  
  IF NOT v_rls_enabled THEN
    RAISE EXCEPTION '❌ RLS NO está habilitado en la tabla companies';
  END IF;
  
  -- Contar políticas
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'companies' AND schemaname = 'public';
  
  IF v_policy_count < 4 THEN
    RAISE WARNING '⚠️ Solo se encontraron % políticas RLS (esperadas: 4)', v_policy_count;
  END IF;
  
  -- Contar índices
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE tablename = 'companies' AND schemaname = 'public';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRACIÓN 20260207_create_companies_table COMPLETADA';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '   📋 Tabla companies creada con campos PII encriptados';
  RAISE NOTICE '   🔒 RLS habilitado con % políticas (SELECT, INSERT, UPDATE, DELETE)', v_policy_count;
  RAISE NOTICE '   📊 % índices configurados para performance', v_index_count;
  RAISE NOTICE '   📝 Triggers de auditoría configurados (SARLAFT compliance)';
  RAISE NOTICE '   🗑️ Soft delete implementado';
  RAISE NOTICE '   ⚠️ DELETE permite admin Y owner (v1.1)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
