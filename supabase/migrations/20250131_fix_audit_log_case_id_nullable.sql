-- =====================================================
-- MIGRACIÓN: HACER case_id OPCIONAL EN audit_log
-- Objetivo: Permitir que audit_log registre eventos de clients que no tienen case_id
-- Fecha: 2025-01-31
-- =====================================================

-- =====================================================
-- HACER case_id OPCIONAL (NULLABLE)
-- =====================================================

-- Verificar si case_id es NOT NULL y hacerlo opcional
DO $$
BEGIN
    -- Verificar si case_id tiene restricción NOT NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log' 
        AND column_name = 'case_id'
        AND is_nullable = 'NO'
    ) THEN
        -- Hacer case_id opcional (permitir NULL)
        ALTER TABLE public.audit_log
        ALTER COLUMN case_id DROP NOT NULL;
        
        COMMENT ON COLUMN public.audit_log.case_id IS 'ID del caso relacionado (NULL para eventos de clients u otros recursos sin caso)';
    END IF;
END $$;

-- =====================================================
-- ACTUALIZAR FUNCIÓN DE TRIGGER PARA MANEJAR case_id NULL
-- =====================================================

-- ✅ CORRECCIÓN: Función unificada que maneja cases, artifacts y clients correctamente
-- Ahora case_id puede ser NULL para clients
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data jsonb;
    new_data jsonb;
    operation text;
    case_id_val uuid;
    org_id_val uuid;
    resource_id_val uuid;
BEGIN
    -- Determinar la operación
    IF TG_OP = 'DELETE' THEN
        operation := 'DELETE';
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        operation := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        operation := 'INSERT';
        old_data := NULL;
        new_data := to_jsonb(NEW);
    END IF;

    -- Determinar valores según la tabla
    CASE TG_TABLE_NAME
        WHEN 'cases' THEN
            case_id_val := COALESCE(NEW.id, OLD.id);
            org_id_val := COALESCE(NEW.org_id, OLD.org_id);
            resource_id_val := COALESCE(NEW.id, OLD.id);
        WHEN 'artifacts' THEN
            case_id_val := COALESCE(NEW.case_id, OLD.case_id);
            org_id_val := COALESCE(NEW.org_id, OLD.org_id);
            resource_id_val := COALESCE(NEW.id, OLD.id);
        WHEN 'clients' THEN
            case_id_val := NULL; -- ✅ Clients no tienen case_id, esto es correcto ahora
            org_id_val := COALESCE(NEW.org_id, OLD.org_id);
            resource_id_val := COALESCE(NEW.id, OLD.id);
        ELSE
            case_id_val := NULL;
            org_id_val := COALESCE(NEW.org_id, OLD.org_id);
            resource_id_val := COALESCE(NEW.id, OLD.id);
    END CASE;

    -- Insertar en audit_log con todos los campos disponibles
    -- ✅ case_id puede ser NULL para clients
    -- ✅ actor es requerido y se obtiene de auth.uid() o 'system' como fallback
    INSERT INTO public.audit_log (
        case_id,
        actor,  -- ✅ CAMPO REQUERIDO: Identificador del usuario que realizó la acción
        org_id,
        user_id,
        action,
        tool,
        payload,
        resource_type,
        resource_id,
        severity,
        ip_address,
        user_agent
    ) VALUES (
        case_id_val,  -- ✅ Puede ser NULL para clients
        COALESCE(auth.uid()::text, 'system'),  -- ✅ Actor: user_id como texto o 'system' como fallback
        org_id_val,
        auth.uid(),  -- ✅ user_id: UUID del usuario
        operation,
        TG_TABLE_NAME,
        jsonb_build_object(
            'old', old_data,
            'new', new_data
        ),
        TG_TABLE_NAME,
        resource_id_val,
        'info',
        inet_client_addr(),
        current_setting('request.headers', true)::jsonb->>'user-agent'
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION public.audit_trigger_function() IS 
    'Función de auditoría unificada que registra cambios en audit_log para cases, artifacts y clients. case_id puede ser NULL para eventos de clients u otros recursos sin caso.';

