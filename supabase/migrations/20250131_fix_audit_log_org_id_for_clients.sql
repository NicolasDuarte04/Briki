-- =====================================================
-- MIGRACIÓN: CORREGIR audit_log PARA SOPORTAR CLIENTS
-- Objetivo: Asegurar que audit_log tiene org_id para que el trigger de clients funcione
-- Fecha: 2025-01-31
-- =====================================================

-- =====================================================
-- AGREGAR org_id A audit_log SI NO EXISTE
-- =====================================================

-- Verificar y agregar org_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log' 
        AND column_name = 'org_id'
    ) THEN
        ALTER TABLE public.audit_log
        ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
        
        COMMENT ON COLUMN public.audit_log.org_id IS 'ID de la organización donde ocurrió la acción';
    END IF;
END $$;

-- =====================================================
-- AGREGAR OTRAS COLUMNAS SI NO EXISTEN
-- =====================================================

-- Agregar user_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.audit_log
        ADD COLUMN user_id uuid REFERENCES auth.users(id);
        
        COMMENT ON COLUMN public.audit_log.user_id IS 'ID del usuario que realizó la acción';
    END IF;
END $$;

-- Agregar resource_type si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log' 
        AND column_name = 'resource_type'
    ) THEN
        ALTER TABLE public.audit_log
        ADD COLUMN resource_type text;
        
        COMMENT ON COLUMN public.audit_log.resource_type IS 'Tipo de recurso afectado: case, artifact, client, organization';
    END IF;
END $$;

-- Agregar resource_id si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log' 
        AND column_name = 'resource_id'
    ) THEN
        ALTER TABLE public.audit_log
        ADD COLUMN resource_id uuid;
        
        COMMENT ON COLUMN public.audit_log.resource_id IS 'ID del recurso específico afectado';
    END IF;
END $$;

-- Agregar severity si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log' 
        AND column_name = 'severity'
    ) THEN
        ALTER TABLE public.audit_log
        ADD COLUMN severity text DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical'));
        
        COMMENT ON COLUMN public.audit_log.severity IS 'Severidad del evento: debug, info, warning, error, critical';
    END IF;
END $$;

-- Agregar ip_address si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log' 
        AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE public.audit_log
        ADD COLUMN ip_address inet;
        
        COMMENT ON COLUMN public.audit_log.ip_address IS 'Dirección IP del usuario';
    END IF;
END $$;

-- Agregar user_agent si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log' 
        AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE public.audit_log
        ADD COLUMN user_agent text;
        
        COMMENT ON COLUMN public.audit_log.user_agent IS 'User agent del navegador';
    END IF;
END $$;

-- =====================================================
-- ACTUALIZAR FUNCIÓN DE TRIGGER
-- =====================================================

-- ✅ CORRECCIÓN: Función unificada que maneja cases, artifacts y clients correctamente
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
            case_id_val := NULL; -- Clients no tienen case_id
            org_id_val := COALESCE(NEW.org_id, OLD.org_id);
            resource_id_val := COALESCE(NEW.id, OLD.id);
        ELSE
            case_id_val := NULL;
            org_id_val := COALESCE(NEW.org_id, OLD.org_id);
            resource_id_val := COALESCE(NEW.id, OLD.id);
    END CASE;

    -- Insertar en audit_log con todos los campos disponibles
    INSERT INTO public.audit_log (
        case_id,
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
        case_id_val,
        org_id_val,
        auth.uid(),
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
    'Función de auditoría unificada que registra cambios en audit_log para cases, artifacts y clients. Maneja correctamente org_id y case_id según el tipo de tabla.';

-- =====================================================
-- CREAR ÍNDICES (USANDO EXECUTE DINÁMICO)
-- =====================================================

-- Nota: Los índices se crearán automáticamente si las columnas existen
-- Si los índices ya existen, estos comandos no fallarán gracias a IF NOT EXISTS
-- Si las columnas no existen, estos comandos fallarán silenciosamente (esperado)

-- Intentar crear índice para org_id (fallará silenciosamente si la columna no existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log' 
        AND column_name = 'org_id'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'audit_log' 
        AND indexname = 'idx_audit_log_org_id'
    ) THEN
        EXECUTE 'CREATE INDEX idx_audit_log_org_id ON public.audit_log(org_id)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignorar errores al crear índice
        NULL;
END $$;

-- Intentar crear índice para user_id (fallará silenciosamente si la columna no existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_log' 
        AND column_name = 'user_id'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'audit_log' 
        AND indexname = 'idx_audit_log_user_id'
    ) THEN
        EXECUTE 'CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignorar errores al crear índice
        NULL;
END $$;

