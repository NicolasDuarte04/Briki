-- =====================================================
-- MIGRACIÓN: MEJORAS A TABLA messages
-- Objetivo: Agregar constraints, triggers y validaciones
-- Fecha: 2025-01-08
-- Prioridad: MEDIA
-- Compatibilidad: ✅ No destructiva - Usa IF NOT EXISTS y verificaciones
-- =====================================================
-- 
-- ANÁLISIS DE COMPATIBILIDAD:
-- ✅ Constraint de role: Valida valores que ya usa el código ('user', 'assistant', 'system')
-- ✅ Trigger updated_at: Complementa @updatedAt de Prisma, no lo reemplaza
-- ✅ Todas las operaciones son idempotentes (IF NOT EXISTS)
-- =====================================================

-- =====================================================
-- PASO 1: CONSTRAINT - Validar valores de role
-- =====================================================
-- Verificar si el constraint ya existe antes de crearlo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
          AND table_name = 'messages' 
          AND constraint_name = 'messages_role_check'
    ) THEN
        ALTER TABLE public.messages
          ADD CONSTRAINT messages_role_check 
          CHECK (role IN ('user', 'assistant', 'system'));
        
        RAISE NOTICE '✅ Constraint messages_role_check creado';
    ELSE
        RAISE NOTICE 'ℹ️  Constraint messages_role_check ya existe';
    END IF;
END $$;

COMMENT ON CONSTRAINT messages_role_check ON public.messages IS 
  'Valida que role sea uno de: user, assistant, system. Valores usados por el código actual';

-- =====================================================
-- PASO 2: FUNCIÓN - Actualizar updated_at automáticamente
-- =====================================================
-- Crear función si no existe (idempotente)
CREATE OR REPLACE FUNCTION public.update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_messages_updated_at() IS 
  'Actualiza updated_at automáticamente en cada UPDATE. Complementa @updatedAt de Prisma';

-- =====================================================
-- PASO 3: TRIGGER - Actualizar updated_at automáticamente
-- =====================================================
-- Eliminar trigger si existe (para evitar duplicados)
DROP TRIGGER IF EXISTS update_messages_updated_at_trigger ON public.messages;

-- Crear trigger
CREATE TRIGGER update_messages_updated_at_trigger
    BEFORE UPDATE ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_messages_updated_at();

COMMENT ON TRIGGER update_messages_updated_at_trigger ON public.messages IS 
  'Actualiza updated_at automáticamente en cada UPDATE. Funciona junto con @updatedAt de Prisma';

-- =====================================================
-- PASO 4: VERIFICACIÓN DE DATOS EXISTENTES
-- =====================================================
-- Verificar que no haya valores inválidos de role antes de aplicar constraint
DO $$
DECLARE
    invalid_roles_count integer;
BEGIN
    -- Contar roles inválidos (si los hay)
    SELECT COUNT(*) INTO invalid_roles_count
    FROM public.messages
    WHERE role NOT IN ('user', 'assistant', 'system');
    
    IF invalid_roles_count > 0 THEN
        RAISE WARNING '⚠️  Se encontraron % mensajes con roles inválidos. Revisar antes de aplicar constraint.', invalid_roles_count;
        -- NO fallar la migración, solo advertir
        -- El constraint se aplicará pero podría fallar si hay datos inválidos
    ELSE
        RAISE NOTICE '✅ Todos los roles existentes son válidos';
    END IF;
END $$;

-- =====================================================
-- PASO 5: VERIFICACIÓN FINAL
-- =====================================================
DO $$
DECLARE
    constraint_exists boolean;
    trigger_exists boolean;
    function_exists boolean;
BEGIN
    -- Verificar constraint
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
          AND table_name = 'messages' 
          AND constraint_name = 'messages_role_check'
    ) INTO constraint_exists;
    
    -- Verificar trigger
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'public' 
          AND event_object_table = 'messages' 
          AND trigger_name = 'update_messages_updated_at_trigger'
    ) INTO trigger_exists;
    
    -- Verificar función
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
          AND routine_name = 'update_messages_updated_at'
    ) INTO function_exists;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN DE MEJORAS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Constraint role: %', CASE WHEN constraint_exists THEN '✅ Creado' ELSE '❌ No creado' END;
    RAISE NOTICE 'Trigger updated_at: %', CASE WHEN trigger_exists THEN '✅ Creado' ELSE '❌ No creado' END;
    RAISE NOTICE 'Función updated_at: %', CASE WHEN function_exists THEN '✅ Creada' ELSE '❌ No creada' END;
    RAISE NOTICE '========================================';
END $$;

