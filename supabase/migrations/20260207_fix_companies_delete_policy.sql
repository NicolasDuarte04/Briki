-- =====================================================
-- MIGRACIÓN PARCHE: CORREGIR POLÍTICA DELETE DE COMPANIES
-- =====================================================
-- Problema: La política DELETE original solo permite 'admin'
-- Solución: Permitir 'admin' Y 'owner' (consistente con clients)
--
-- Fecha: 2026-02-07
-- Autor: Arquitecto de Software Senior - Briki Insurtech
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR POLÍTICA DELETE EXISTENTE
-- =====================================================
DROP POLICY IF EXISTS "companies_org_isolation_delete" ON public.companies;

-- =====================================================
-- PASO 2: CREAR POLÍTICA DELETE CORREGIDA
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
-- PASO 3: ACTUALIZAR COMENTARIO DE LA POLÍTICA
-- =====================================================
COMMENT ON POLICY "companies_org_isolation_delete" ON public.companies IS 
  'Permite a administradores Y propietarios eliminar empresas (DELETE). Corregido 2026-02-07 para consistencia con clients.';

-- =====================================================
-- PASO 4: ACTUALIZAR TRIGGER DE AUDITORÍA (MEJORAS)
-- =====================================================
-- Añade severity para eventos críticos SARLAFT
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
        'warning',
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
        'critical',
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

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
DO $$
DECLARE
  v_policy_expr TEXT;
BEGIN
  -- Verificar que la política DELETE tiene los roles correctos
  SELECT pg_get_expr(polqual, polrelid) INTO v_policy_expr
  FROM pg_policy
  WHERE polname = 'companies_org_isolation_delete'
    AND polrelid = 'public.companies'::regclass;
  
  IF v_policy_expr ILIKE '%admin%' AND v_policy_expr ILIKE '%owner%' THEN
    RAISE NOTICE '✅ Parche aplicado correctamente';
    RAISE NOTICE '   - Política DELETE ahora permite admin Y owner';
    RAISE NOTICE '   - Trigger de auditoría actualizado con severity';
  ELSE
    RAISE WARNING '⚠️ La política DELETE puede no estar configurada correctamente';
  END IF;
END $$;
