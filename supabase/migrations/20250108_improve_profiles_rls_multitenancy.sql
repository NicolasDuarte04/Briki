-- =====================================================
-- MIGRACIÓN: MEJORAR RLS DE profiles PARA MULTI-TENANCY
-- Objetivo: Agregar políticas RLS que consideren organizaciones
-- Fecha: 2025-01-08
-- Prioridad: MEDIA-ALTA
-- Compatibilidad: ✅ No destructiva - Mantiene políticas actuales
-- =====================================================
-- 
-- ANÁLISIS DE COMPATIBILIDAD:
-- ✅ Las políticas actuales se mantienen (auth.uid() = id)
-- ✅ Las nuevas políticas son PERMISIVAS (se combinan con OR)
-- ✅ PostgreSQL usa OR entre políticas permisivas (no AND)
-- ✅ Resultado: Usuario puede ver su propio perfil (actual) O perfiles de compañeros (nuevo)
-- ✅ NO rompe funcionalidades existentes
-- =====================================================

-- =====================================================
-- PASO 1: VERIFICAR RLS HABILITADO
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND rowsecurity = true
    ) THEN
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✅ RLS habilitado en tabla profiles';
    ELSE
        RAISE NOTICE 'ℹ️  RLS ya está habilitado en tabla profiles';
    END IF;
END $$;

-- =====================================================
-- PASO 2: VERIFICAR POLÍTICAS ACTUALES
-- =====================================================
-- Las políticas actuales se mantienen (no se eliminan)
-- Se agregan políticas adicionales que se combinan con OR

-- =====================================================
-- PASO 3: POLÍTICA RLS ADICIONAL - SELECT
-- Permitir a miembros ver perfiles de compañeros de su organización
-- =====================================================
-- NOTA: Esta política es PERMISIVA y se combina con OR con la política actual
-- Resultado: Usuario puede ver su propio perfil (política actual) 
--            O perfiles de miembros de su organización (nueva política)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND policyname = 'org_members_can_view_colleague_profiles'
    ) THEN
        CREATE POLICY "org_members_can_view_colleague_profiles" 
            ON public.profiles FOR SELECT 
            USING (
                -- El perfil pertenece a un usuario que es miembro de alguna organización
                -- donde el usuario actual también es miembro
                id IN (
                    SELECT user_id FROM public.org_members
                    WHERE org_id IN (
                        SELECT org_id FROM public.org_members
                        WHERE user_id = auth.uid()
                    )
                )
            );
        
        RAISE NOTICE '✅ Política org_members_can_view_colleague_profiles creada';
    ELSE
        RAISE NOTICE 'ℹ️  Política org_members_can_view_colleague_profiles ya existe';
    END IF;
END $$;

-- Política: Members can view profiles of colleagues in their organizations. 
-- Combines with OR to existing policy (auth.uid() = id)

-- =====================================================
-- PASO 4: POLÍTICA RLS ADICIONAL - UPDATE
-- Permitir a admins/owners actualizar perfiles de miembros
-- =====================================================
-- NOTA: Esta política permite actualizar propio perfil (ya cubierto por política actual)
--       O actualizar perfiles de miembros si es admin/owner

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND policyname = 'org_admins_can_update_member_profiles'
    ) THEN
        CREATE POLICY "org_admins_can_update_member_profiles" 
            ON public.profiles FOR UPDATE 
            USING (
                -- Puede actualizar su propio perfil (ya cubierto por política actual)
                auth.uid() = id
                OR
                -- O es admin/owner y el perfil es de un miembro de su organización
                (
                    id IN (
                        SELECT user_id FROM public.org_members
                        WHERE org_id IN (
                            SELECT org_id FROM public.org_members
                            WHERE user_id = auth.uid()
                            AND role IN ('admin', 'owner')
                        )
                    )
                )
            )
            WITH CHECK (
                -- Misma validación en WITH CHECK
                auth.uid() = id
                OR
                (
                    id IN (
                        SELECT user_id FROM public.org_members
                        WHERE org_id IN (
                            SELECT org_id FROM public.org_members
                            WHERE user_id = auth.uid()
                            AND role IN ('admin', 'owner')
                        )
                    )
                )
            );
        
        RAISE NOTICE '✅ Política org_admins_can_update_member_profiles creada';
    ELSE
        RAISE NOTICE 'ℹ️  Política org_admins_can_update_member_profiles ya existe';
    END IF;
END $$;

-- Política: Admins and owners can update profiles of members in their organizations. 
-- Combines with OR to existing policy

-- =====================================================
-- PASO 5: POLÍTICA RLS - DELETE
-- Solo admins/owners pueden eliminar perfiles de miembros
-- =====================================================
-- NOTA: El código actual NO usa DELETE, pero la política está lista para futuro
-- IMPORTANTE: Un usuario NO puede eliminar su propio perfil (solo admins/owners)
-- Esto es intencional para prevenir pérdida accidental de datos

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'profiles' 
          AND policyname = 'org_admins_can_delete_member_profiles'
    ) THEN
        CREATE POLICY "org_admins_can_delete_member_profiles" 
            ON public.profiles FOR DELETE 
            USING (
                -- Solo admins/owners pueden eliminar perfiles
                -- El perfil debe ser de un miembro de su organización
                id IN (
                    SELECT user_id FROM public.org_members
                    WHERE org_id IN (
                        SELECT org_id FROM public.org_members
                        WHERE user_id = auth.uid()
                        AND role IN ('admin', 'owner')
                    )
                )
            );
        
        RAISE NOTICE '✅ Política org_admins_can_delete_member_profiles creada';
    ELSE
        RAISE NOTICE 'ℹ️  Política org_admins_can_delete_member_profiles ya existe';
    END IF;
END $$;

-- Política: Only admins and owners can delete profiles of members in their organizations. 
-- Ready for future functionality. Users cannot delete their own profile (only admins/owners can).

-- =====================================================
-- PASO 6: ÍNDICES DE PERFORMANCE
-- =====================================================
-- Índice compuesto para optimizar búsquedas de miembros por organización
-- Ya existe en org_members, pero verificamos que esté presente

CREATE INDEX IF NOT EXISTS idx_org_members_org_user 
    ON public.org_members(org_id, user_id);

-- Índice: Índice compuesto para optimizar búsquedas de miembros por organización y usuario. Usado por políticas RLS de profiles

-- =====================================================
-- PASO 7: VERIFICACIÓN FINAL
-- =====================================================
DO $$
DECLARE
    rls_enabled boolean;
    policy_count integer;
    select_policies integer;
    update_policies integer;
    delete_policies integer;
BEGIN
    -- Verificar RLS
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'profiles';
    
    -- Contar políticas
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles';
    
    -- Contar políticas por tipo
    SELECT COUNT(*) INTO select_policies
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND cmd = 'SELECT';
    
    SELECT COUNT(*) INTO update_policies
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND cmd = 'UPDATE';
    
    SELECT COUNT(*) INTO delete_policies
    FROM pg_policies
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND cmd = 'DELETE';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN DE MIGRACIÓN';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS habilitado: %', CASE WHEN rls_enabled THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE 'Total políticas: %', policy_count;
    RAISE NOTICE 'Políticas SELECT: %', select_policies;
    RAISE NOTICE 'Políticas UPDATE: %', update_policies;
    RAISE NOTICE 'Políticas DELETE: %', delete_policies;
    RAISE NOTICE '========================================';
    
    IF NOT rls_enabled THEN
        RAISE EXCEPTION 'RLS no está habilitado después de la migración';
    END IF;
    
    -- Verificar que hay al menos 2 políticas SELECT (actual + nueva)
    IF select_policies < 2 THEN
        RAISE WARNING 'Solo hay % políticas SELECT (esperado: al menos 2)', select_policies;
    END IF;
    
    -- Verificar que hay al menos 2 políticas UPDATE (actual + nueva)
    IF update_policies < 2 THEN
        RAISE WARNING 'Solo hay % políticas UPDATE (esperado: al menos 2)', update_policies;
    END IF;
    
    -- Verificar que hay al menos 1 política DELETE
    IF delete_policies < 1 THEN
        RAISE WARNING 'No hay políticas DELETE (esperado: al menos 1)';
    END IF;
END $$;

-- =====================================================
-- COMENTARIO FINAL DE TABLA
-- =====================================================
-- Tabla de perfiles de usuario con cifrado PII y RLS multi-tenant. 
-- Políticas: Usuario puede ver/actualizar su propio perfil O perfiles de miembros de su organización.
-- Admins/owners pueden actualizar/eliminar perfiles de miembros de su organización.

