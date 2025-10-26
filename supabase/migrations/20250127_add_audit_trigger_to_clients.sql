-- =====================================================
-- MIGRACIÓN: AÑADIR TRIGGER DE AUDITORÍA PARA CLIENTS
-- Objetivo: Sincronizar triggers de auditoría entre clients, cases y artifacts
-- Fecha: 2025-01-27
-- =====================================================

-- =====================================================
-- VERIFICAR QUE LA FUNCIÓN DE TRIGGER EXISTE
-- =====================================================

-- La función `audit_trigger_function()` ya debe existir (creada en 20250107_complete_rls_implementation.sql)
-- Si no existe, se crea aquí (idempotencia)

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data jsonb;
    new_data jsonb;
    operation text;
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

    -- Insertar en audit_log
    INSERT INTO public.audit_log (
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
        COALESCE(NEW.org_id, OLD.org_id),
        auth.uid(),
        operation,
        TG_TABLE_NAME,
        jsonb_build_object(
            'old', old_data,
            'new', new_data
        ),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id)::text,
        'info',
        inet_client_addr(),
        current_setting('request.headers', true)::jsonb->>'user-agent'
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREAR TRIGGER PARA CLIENTS
-- =====================================================

-- Eliminar trigger existente si existe (idempotencia)
DROP TRIGGER IF EXISTS audit_clients_trigger ON public.clients;

-- Crear trigger para auditoría en clients
CREATE TRIGGER audit_clients_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TRIGGER audit_clients_trigger ON public.clients IS 
    'Registra automáticamente todas las operaciones (INSERT, UPDATE, DELETE) en audit_log para trazabilidad de PII';

COMMENT ON FUNCTION public.audit_trigger_function() IS 
    'Función de auditoría genérica que registra cambios en tabla audit_log para cualquier tabla (cases, artifacts, clients)';

