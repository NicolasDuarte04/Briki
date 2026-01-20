-- ============================================================================
-- MIGRACIÓN: Corrección de 26 Issues Restantes de Supabase
-- Fecha: 2026-01-15
-- 
-- Issues corregidos:
--   - 23 funciones sin SET search_path (WARN - seguridad)
--   - 1 política duplicada en profiles (WARN - rendimiento)
--   - 1 índice duplicado en messages (WARN - rendimiento)
--   - 1 leaked password protection (requiere config manual en Dashboard)
--
-- METODOLOGÍA:
--   - Usamos ALTER FUNCTION con firmas EXACTAS verificadas en pg_proc
--   - Preservamos SECURITY DEFINER/INVOKER original de cada función
--   - Verificaciones previas con IF EXISTS donde aplique
-- ============================================================================

-- ============================================================================
-- PARTE 1: AGREGAR search_path A 23 FUNCIONES
-- Firmas verificadas contra pg_proc el 2026-01-15
-- ============================================================================

-- 1. audit_trigger_function() - TRIGGER, SECURITY DEFINER
ALTER FUNCTION public.audit_trigger_function()
SET search_path = '';

-- 2. auto_assign_invitee_user_id() - TRIGGER, SECURITY DEFINER
ALTER FUNCTION public.auto_assign_invitee_user_id()
SET search_path = '';

-- 3. cleanup_orphan_temp_files() - SECURITY DEFINER
ALTER FUNCTION public.cleanup_orphan_temp_files()
SET search_path = '';

-- 4. cleanup_temp_files() - SECURITY DEFINER
ALTER FUNCTION public.cleanup_temp_files()
SET search_path = '';

-- 5. count_client_cases(uuid, uuid) - SECURITY DEFINER
ALTER FUNCTION public.count_client_cases(p_client_id uuid, p_org_id uuid)
SET search_path = '';

-- 6. count_pending_invitations() - SECURITY DEFINER
ALTER FUNCTION public.count_pending_invitations()
SET search_path = '';

-- 7. generate_storage_path(uuid, text, text) - SECURITY DEFINER
ALTER FUNCTION public.generate_storage_path(org_uuid uuid, file_name text, bucket_name text)
SET search_path = '';

-- 8. get_current_org_id() - SECURITY DEFINER
ALTER FUNCTION public.get_current_org_id()
SET search_path = '';

-- 9. get_next_case_number(uuid, uuid) - SECURITY DEFINER
ALTER FUNCTION public.get_next_case_number(p_client_id uuid, p_org_id uuid)
SET search_path = '';

-- 10. get_or_create_org_policies_container(uuid) - SECURITY DEFINER
ALTER FUNCTION public.get_or_create_org_policies_container(p_org_id uuid)
SET search_path = '';

-- 11. get_pending_invitations() - SECURITY DEFINER
ALTER FUNCTION public.get_pending_invitations()
SET search_path = '';

-- 12. get_secure_download_url(text, text, integer) - SECURITY DEFINER
ALTER FUNCTION public.get_secure_download_url(file_path text, bucket_name text, expires_in integer)
SET search_path = '';

-- 13. get_user_id_by_email(text) - SECURITY DEFINER
ALTER FUNCTION public.get_user_id_by_email(target_email text)
SET search_path = '';

-- 14. get_user_organizations(uuid) - SECURITY DEFINER
ALTER FUNCTION public.get_user_organizations(target_user_id uuid)
SET search_path = '';

-- 15. has_org_access(uuid) - SECURITY DEFINER
ALTER FUNCTION public.has_org_access(org_id uuid)
SET search_path = '';

-- 16. initialize_user_preferences() - SECURITY DEFINER
ALTER FUNCTION public.initialize_user_preferences()
SET search_path = '';

-- 17. is_org_policies_container(uuid) - SECURITY INVOKER (preservar)
ALTER FUNCTION public.is_org_policies_container(p_case_id uuid)
SET search_path = '';

-- 18. respond_to_invitation(uuid, boolean) - SECURITY DEFINER
ALTER FUNCTION public.respond_to_invitation(invitation_uuid uuid, accept boolean)
SET search_path = '';

-- 19. set_org_context(uuid) - SECURITY DEFINER
ALTER FUNCTION public.set_org_context(org_uuid uuid)
SET search_path = '';

-- 20. switch_organization(uuid) - SECURITY DEFINER
ALTER FUNCTION public.switch_organization(new_org_id uuid)
SET search_path = '';

-- 21. validate_org_access(uuid, text) - SECURITY DEFINER
ALTER FUNCTION public.validate_org_access(target_org_id uuid, required_role text)
SET search_path = '';

-- 22. validate_org_admin_access(uuid) - SECURITY DEFINER
ALTER FUNCTION public.validate_org_admin_access(target_org_id uuid)
SET search_path = '';

-- 23. verify_orphan_temp_files() - SECURITY DEFINER
ALTER FUNCTION public.verify_orphan_temp_files()
SET search_path = '';

-- ============================================================================
-- PARTE 2: CONSOLIDAR POLÍTICAS DUPLICADAS EN PROFILES
-- 
-- Problema: profiles tiene 2 políticas UPDATE para rol authenticated:
--   - profiles_own_update (usuario actualiza su propio perfil)
--   - profiles_admin_update (admin actualiza perfiles de su org)
-- 
-- Esto causa que PostgreSQL evalúe AMBAS políticas para cada UPDATE,
-- degradando el rendimiento.
--
-- Solución: Combinar en una única política con lógica OR
-- ============================================================================

-- Verificar que las políticas existen antes de eliminar
DO $$
BEGIN
    -- Eliminar políticas existentes si existen
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_own_update' AND tablename = 'profiles') THEN
        DROP POLICY "profiles_own_update" ON public.profiles;
        RAISE NOTICE '✓ Política profiles_own_update eliminada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'profiles_admin_update' AND tablename = 'profiles') THEN
        DROP POLICY "profiles_admin_update" ON public.profiles;
        RAISE NOTICE '✓ Política profiles_admin_update eliminada';
    END IF;
END $$;

-- Crear política consolidada
CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE TO authenticated
USING (
    -- Condición 1: Usuario actualiza su propio perfil
    id = (SELECT auth.uid())
    OR
    -- Condición 2: Admin/owner actualiza perfil de miembro de su org
    EXISTS (
        SELECT 1 FROM public.org_members om1
        JOIN public.org_members om2 ON om1.org_id = om2.org_id
        WHERE om1.user_id = (SELECT auth.uid())
        AND om1.role IN ('owner', 'admin')
        AND om2.user_id = public.profiles.id
    )
)
WITH CHECK (
    -- Misma lógica para WITH CHECK
    id = (SELECT auth.uid())
    OR
    EXISTS (
        SELECT 1 FROM public.org_members om1
        JOIN public.org_members om2 ON om1.org_id = om2.org_id
        WHERE om1.user_id = (SELECT auth.uid())
        AND om1.role IN ('owner', 'admin')
        AND om2.user_id = public.profiles.id
    )
);

-- ============================================================================
-- PARTE 3: ELIMINAR ÍNDICE DUPLICADO EN MESSAGES
--
-- Problema: messages tiene dos índices idénticos:
--   - idx_messages_case_id (creado por migración de optimización)
--   - messages_case_id_idx (nombre antiguo)
--
-- Ambos indexan la misma columna (case_id), desperdiciando espacio.
-- ============================================================================

-- Verificar y eliminar el índice duplicado (conservar idx_messages_case_id)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'messages_case_id_idx' AND tablename = 'messages') THEN
        DROP INDEX IF EXISTS public.messages_case_id_idx;
        RAISE NOTICE '✓ Índice duplicado messages_case_id_idx eliminado';
    ELSE
        RAISE NOTICE '⚠ Índice messages_case_id_idx no existe (ya eliminado o nombre diferente)';
    END IF;
END $$;

-- ============================================================================
-- PARTE 4: CREAR ÍNDICES FALTANTES PARA FOREIGN KEYS
--
-- Las FK sin índice causan table scans lentos en JOINs y DELETE CASCADE.
-- Sugerencias del linter (nivel INFO, pero importante para rendimiento).
-- ============================================================================

-- FK: audit_log.case_id -> cases.id
CREATE INDEX IF NOT EXISTS idx_audit_log_case_id 
ON public.audit_log(case_id)
WHERE case_id IS NOT NULL;

-- FK: compliance_records.user_id -> users.id
CREATE INDEX IF NOT EXISTS idx_compliance_records_user_id 
ON public.compliance_records(user_id);

-- FK: generated_proposals.comparison_id -> comparisons.id
CREATE INDEX IF NOT EXISTS idx_generated_proposals_comparison_id 
ON public.generated_proposals(comparison_id)
WHERE comparison_id IS NOT NULL;

-- ============================================================================
-- PARTE 5: VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
    func_count INTEGER;
    policy_exists BOOLEAN;
    idx_duplicate_exists BOOLEAN;
BEGIN
    -- Verificar funciones con search_path
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proconfig IS NOT NULL
    AND p.proconfig::text LIKE '%search_path%';
    
    -- Verificar política consolidada
    SELECT EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'profiles_update' AND tablename = 'profiles'
    ) INTO policy_exists;
    
    -- Verificar que el índice duplicado fue eliminado
    SELECT EXISTS(
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'messages_case_id_idx' AND tablename = 'messages'
    ) INTO idx_duplicate_exists;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ MIGRACIÓN COMPLETADA';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Funciones con search_path: %', func_count;
    RAISE NOTICE 'Política profiles_update creada: %', policy_exists;
    RAISE NOTICE 'Índice duplicado eliminado: %', NOT idx_duplicate_exists;
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  ACCIÓN MANUAL REQUERIDA:';
    RAISE NOTICE 'Habilitar "Leaked password protection" en:';
    RAISE NOTICE 'Dashboard → Authentication → Settings → Password Settings';
    RAISE NOTICE '============================================';
END $$;
