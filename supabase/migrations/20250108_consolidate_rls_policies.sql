-- =====================================================
-- MIGRACIÓN: CONSOLIDACIÓN DE POLÍTICAS RLS
-- Objetivo: Eliminar políticas duplicadas e incorrectas en cases y artifacts
-- Fecha: 2025-01-08
-- Prioridad: ALTA
-- Compatibilidad: ✅ No destructiva - Solo elimina duplicados, mantiene políticas correctas
-- =====================================================
-- 
-- ANÁLISIS DE COMPATIBILIDAD:
-- ✅ Elimina políticas duplicadas de cases (migración 20250107)
-- ✅ Elimina políticas incorrectas de artifacts (migración 20250107 - usan org_id que no existe)
-- ✅ Mantiene políticas correctas de cases (migración 20251026)
-- ✅ Mantiene políticas correctas de artifacts (migración 20251026)
-- ✅ NO afecta funcionalidades existentes
-- =====================================================

-- =====================================================
-- PASO 1: VERIFICAR RLS HABILITADO
-- =====================================================
DO $$
BEGIN
    -- Verificar cases
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename = 'cases' 
          AND rowsecurity = true
    ) THEN
        ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS habilitado en tabla cases';
    ELSE
        RAISE NOTICE 'ℹ️  RLS ya está habilitado en tabla cases';
    END IF;

    -- Verificar artifacts
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename = 'artifacts' 
          AND rowsecurity = true
    ) THEN
        ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS habilitado en tabla artifacts';
    ELSE
        RAISE NOTICE 'ℹ️  RLS ya está habilitado en tabla artifacts';
    END IF;
END $$;

-- =====================================================
-- PASO 2: ELIMINAR POLÍTICAS DUPLICADAS DE CASES
-- =====================================================
-- Eliminar políticas de migración 20250107 (duplicadas)
-- Mantener políticas de migración 20251026 (correctas)

DO $$
DECLARE
    policy_name text;
    policies_to_drop text[] := ARRAY[
        'org_members_can_view_cases',
        'org_members_can_insert_cases',
        'org_members_can_update_cases',
        'org_admins_can_delete_cases'
    ];
BEGIN
    FOREACH policy_name IN ARRAY policies_to_drop
    LOOP
        IF EXISTS (
            SELECT 1 
            FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = 'cases' 
              AND policyname = policy_name
        ) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.cases', policy_name);
            RAISE NOTICE '✅ Política eliminada: %', policy_name;
        ELSE
            RAISE NOTICE 'ℹ️  Política no existe (ya eliminada): %', policy_name;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- PASO 3: ELIMINAR POLÍTICAS INCORRECTAS DE ARTIFACTS
-- =====================================================
-- Eliminar políticas de migración 20250107 (incorrectas - usan org_id que no existe)
-- Mantener políticas de migración 20251026 (correctas - verifican a través de cases)

DO $$
DECLARE
    policy_name text;
    policies_to_drop text[] := ARRAY[
        'org_members_can_view_artifacts',
        'org_members_can_insert_artifacts',
        'org_members_can_update_artifacts',
        'org_admins_can_delete_artifacts'
    ];
BEGIN
    FOREACH policy_name IN ARRAY policies_to_drop
    LOOP
        IF EXISTS (
            SELECT 1 
            FROM pg_policies 
            WHERE schemaname = 'public' 
              AND tablename = 'artifacts' 
              AND policyname = policy_name
        ) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.artifacts', policy_name);
            RAISE NOTICE '✅ Política eliminada: %', policy_name;
        ELSE
            RAISE NOTICE 'ℹ️  Política no existe (ya eliminada): %', policy_name;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- PASO 4: VERIFICAR POLÍTICAS CORRECTAS EXISTEN
-- =====================================================
DO $$
DECLARE
    cases_select_count integer;
    cases_insert_count integer;
    cases_update_count integer;
    cases_delete_count integer;
    artifacts_select_count integer;
    artifacts_insert_count integer;
    artifacts_update_count integer;
    artifacts_delete_count integer;
BEGIN
    -- Contar políticas correctas en cases
    SELECT COUNT(*) INTO cases_select_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cases'
      AND cmd = 'SELECT'
      AND policyname = 'cases_org_isolation_select';
    
    SELECT COUNT(*) INTO cases_insert_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cases'
      AND cmd = 'INSERT'
      AND policyname = 'cases_org_isolation_insert';
    
    SELECT COUNT(*) INTO cases_update_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cases'
      AND cmd = 'UPDATE'
      AND policyname = 'cases_org_isolation_update';
    
    SELECT COUNT(*) INTO cases_delete_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cases'
      AND cmd = 'DELETE'
      AND policyname = 'cases_org_isolation_delete';
    
    -- Contar políticas correctas en artifacts
    SELECT COUNT(*) INTO artifacts_select_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND cmd = 'SELECT'
      AND policyname = 'artifacts_org_isolation_select';
    
    SELECT COUNT(*) INTO artifacts_insert_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND cmd = 'INSERT'
      AND policyname = 'artifacts_org_isolation_insert';
    
    SELECT COUNT(*) INTO artifacts_update_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND cmd = 'UPDATE'
      AND policyname = 'artifacts_org_isolation_update';
    
    SELECT COUNT(*) INTO artifacts_delete_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND cmd = 'DELETE'
      AND policyname = 'artifacts_org_isolation_delete';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN DE POLÍTICAS CORRECTAS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CASES:';
    RAISE NOTICE '  SELECT: %', CASE WHEN cases_select_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  INSERT: %', CASE WHEN cases_insert_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  UPDATE: %', CASE WHEN cases_update_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  DELETE: %', CASE WHEN cases_delete_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE 'ARTIFACTS:';
    RAISE NOTICE '  SELECT: %', CASE WHEN artifacts_select_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  INSERT: %', CASE WHEN artifacts_insert_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  UPDATE: %', CASE WHEN artifacts_update_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  DELETE: %', CASE WHEN artifacts_delete_count > 0 THEN '✅' ELSE '❌' END;
    RAISE NOTICE '========================================';
    
    -- Verificar que todas las políticas correctas existen
    IF cases_select_count = 0 OR cases_insert_count = 0 OR cases_update_count = 0 OR cases_delete_count = 0 THEN
        RAISE EXCEPTION 'Faltan políticas correctas en cases. Por favor, ejecutar migración 20251026_add_rls_to_cases.sql primero.';
    END IF;
    
    IF artifacts_select_count = 0 OR artifacts_insert_count = 0 OR artifacts_update_count = 0 OR artifacts_delete_count = 0 THEN
        RAISE EXCEPTION 'Faltan políticas correctas en artifacts. Por favor, ejecutar migración 20251026_add_rls_to_artifacts.sql primero.';
    END IF;
END $$;

-- =====================================================
-- PASO 5: VERIFICAR QUE NO HAY DUPLICADOS
-- =====================================================
DO $$
DECLARE
    cases_select_total integer;
    cases_insert_total integer;
    cases_update_total integer;
    cases_delete_total integer;
    artifacts_select_total integer;
    artifacts_insert_total integer;
    artifacts_update_total integer;
    artifacts_delete_total integer;
BEGIN
    -- Contar total de políticas por operación en cases
    SELECT COUNT(*) INTO cases_select_total
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cases'
      AND cmd = 'SELECT';
    
    SELECT COUNT(*) INTO cases_insert_total
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cases'
      AND cmd = 'INSERT';
    
    SELECT COUNT(*) INTO cases_update_total
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cases'
      AND cmd = 'UPDATE';
    
    SELECT COUNT(*) INTO cases_delete_total
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cases'
      AND cmd = 'DELETE';
    
    -- Contar total de políticas por operación en artifacts
    SELECT COUNT(*) INTO artifacts_select_total
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND cmd = 'SELECT';
    
    SELECT COUNT(*) INTO artifacts_insert_total
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND cmd = 'INSERT';
    
    SELECT COUNT(*) INTO artifacts_update_total
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND cmd = 'UPDATE';
    
    SELECT COUNT(*) INTO artifacts_delete_total
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND cmd = 'DELETE';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN DE DUPLICADOS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CASES:';
    RAISE NOTICE '  SELECT: % políticas (esperado: 1)', cases_select_total;
    RAISE NOTICE '  INSERT: % políticas (esperado: 1)', cases_insert_total;
    RAISE NOTICE '  UPDATE: % políticas (esperado: 1)', cases_update_total;
    RAISE NOTICE '  DELETE: % políticas (esperado: 1)', cases_delete_total;
    RAISE NOTICE 'ARTIFACTS:';
    RAISE NOTICE '  SELECT: % políticas (esperado: 1)', artifacts_select_total;
    RAISE NOTICE '  INSERT: % políticas (esperado: 1)', artifacts_insert_total;
    RAISE NOTICE '  UPDATE: % políticas (esperado: 1)', artifacts_update_total;
    RAISE NOTICE '  DELETE: % políticas (esperado: 1)', artifacts_delete_total;
    RAISE NOTICE '========================================';
    
    -- Verificar que no hay duplicados
    IF cases_select_total > 1 OR cases_insert_total > 1 OR cases_update_total > 1 OR cases_delete_total > 1 THEN
        RAISE WARNING '⚠️  Hay políticas duplicadas en cases. Revisar manualmente.';
    END IF;
    
    IF artifacts_select_total > 1 OR artifacts_insert_total > 1 OR artifacts_update_total > 1 OR artifacts_delete_total > 1 THEN
        RAISE WARNING '⚠️  Hay políticas duplicadas en artifacts. Revisar manualmente.';
    END IF;
END $$;

-- =====================================================
-- COMENTARIO FINAL
-- =====================================================
-- Consolidación completada:
-- ✅ Políticas duplicadas de cases eliminadas
-- ✅ Políticas incorrectas de artifacts eliminadas
-- ✅ Solo quedan políticas correctas (cases_org_isolation_* y artifacts_org_isolation_*)

