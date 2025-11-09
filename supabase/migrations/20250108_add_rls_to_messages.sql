-- =====================================================
-- MIGRACIÓN: ROW LEVEL SECURITY PARA TABLA messages
-- Objetivo: Implementar aislamiento multi-tenant para mensajes
-- Fecha: 2025-01-08
-- Prioridad: CRÍTICA
-- Compatibilidad: ✅ No destructiva - Compatible con código existente
-- =====================================================
-- 
-- ANÁLISIS DE COMPATIBILIDAD:
-- ✅ El código actual siempre verifica orgId antes de acceder a mensajes
-- ✅ Las políticas RLS complementan (no reemplazan) la validación en aplicación
-- ✅ No hay operaciones UPDATE/DELETE en el código actual, pero las políticas están listas
-- ✅ Las políticas usan el mismo patrón que cases y artifacts (comprobado funcional)
-- =====================================================

-- =====================================================
-- PASO 1: HABILITAR RLS (IDEMPOTENTE)
-- =====================================================
-- Verificar si RLS ya está habilitado antes de intentar habilitarlo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename = 'messages' 
          AND rowsecurity = true
    ) THEN
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS habilitado en tabla messages';
    ELSE
        RAISE NOTICE 'ℹ️  RLS ya está habilitado en tabla messages';
    END IF;
END $$;

-- =====================================================
-- PASO 2: ELIMINAR POLÍTICAS EXISTENTES (SI HAY ALGUNA)
-- =====================================================
-- Esto asegura que no haya conflictos con políticas anteriores
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', policy_record.policyname);
        RAISE NOTICE '🗑️  Política eliminada: %', policy_record.policyname;
    END LOOP;
END $$;

-- =====================================================
-- PASO 3: POLÍTICA RLS - SELECT
-- Solo miembros de la organización pueden ver mensajes
-- =====================================================
-- Patrón: messages → cases → organizations (igual que artifacts)
CREATE POLICY "messages_org_isolation_select" ON public.messages
  FOR SELECT
  USING (
    case_id IN (
      SELECT id FROM public.cases
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "messages_org_isolation_select" ON public.messages IS 
  'Members can view messages from cases in their organizations. Pattern: messages → cases → organizations';

-- =====================================================
-- PASO 4: POLÍTICA RLS - INSERT
-- Solo miembros pueden crear mensajes en casos de su organización
-- =====================================================
CREATE POLICY "messages_org_isolation_insert" ON public.messages
  FOR INSERT
  WITH CHECK (
    case_id IN (
      SELECT id FROM public.cases
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "messages_org_isolation_insert" ON public.messages IS 
  'Members can create messages in cases from their organizations. Validates case belongs to user organization';

-- =====================================================
-- PASO 5: POLÍTICA RLS - UPDATE
-- Solo miembros pueden actualizar mensajes de su organización
-- =====================================================
-- NOTA: El código actual NO usa UPDATE, pero la política está lista para futuras funcionalidades
CREATE POLICY "messages_org_isolation_update" ON public.messages
  FOR UPDATE
  USING (
    case_id IN (
      SELECT id FROM public.cases
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    case_id IN (
      SELECT id FROM public.cases
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON POLICY "messages_org_isolation_update" ON public.messages IS 
  'Members can update messages from cases in their organizations. Ready for future functionality';

-- =====================================================
-- PASO 6: POLÍTICA RLS - DELETE
-- Solo admins y owners pueden eliminar mensajes
-- =====================================================
-- NOTA: El código actual NO usa DELETE, pero la política está lista para futuras funcionalidades
CREATE POLICY "messages_org_isolation_delete" ON public.messages
  FOR DELETE
  USING (
    case_id IN (
      SELECT id FROM public.cases
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
      )
    )
  );

COMMENT ON POLICY "messages_org_isolation_delete" ON public.messages IS 
  'Only admins and owners can delete messages. Ready for future functionality';

-- =====================================================
-- PASO 7: VERIFICACIÓN FINAL
-- =====================================================
DO $$
DECLARE
    rls_enabled boolean;
    policy_count integer;
BEGIN
    -- Verificar RLS
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'messages';
    
    -- Contar políticas
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN DE MIGRACIÓN';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS habilitado: %', CASE WHEN rls_enabled THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE 'Políticas creadas: %', policy_count;
    RAISE NOTICE '========================================';
    
    IF NOT rls_enabled THEN
        RAISE EXCEPTION 'RLS no está habilitado después de la migración';
    END IF;
    
    IF policy_count < 4 THEN
        RAISE EXCEPTION 'No se crearon todas las políticas esperadas (esperado: 4, encontrado: %)', policy_count;
    END IF;
END $$;

-- =====================================================
-- COMENTARIO FINAL DE TABLA
-- =====================================================
COMMENT ON TABLE public.messages IS 
  'Tabla de mensajes con contenido encriptado y RLS por organización. 
   Patrón de acceso: messages → cases → organizations.
   Solo miembros de la organización pueden acceder a mensajes de sus casos.';

