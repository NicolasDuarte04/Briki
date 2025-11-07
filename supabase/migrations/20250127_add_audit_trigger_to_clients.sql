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

-- ✅ NOTA: La función audit_trigger_function() se actualiza en la migración
-- 20250131_fix_audit_log_org_id_for_clients.sql para manejar correctamente
-- clients, cases y artifacts. Esta migración solo crea el trigger para clients.

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

