-- ============================================================================
-- MIGRACIÓN CORRECTIVA: Resolver recursión infinita y función decrypt_pii
-- Fecha: 2026-01-15
-- 
-- PROBLEMA RESUELTO:
--   1. Políticas de org_members tenían autoreferencia circular (error 42P17)
--   2. get_pending_invitations() llamaba a decrypt_pii() sin calificar schema
--
-- SOLUCIÓN:
--   1. Crear función helper get_user_org_ids() con SECURITY DEFINER
--   2. Reemplazar políticas problemáticas usando el helper
--   3. Reconstruir get_pending_invitations() con search_path='public'
-- ============================================================================

-- ============================================================================
-- PARTE 1: CREAR FUNCIÓN HELPER PARA EVITAR RECURSIÓN EN org_members
-- Esta función es SECURITY DEFINER y no activa RLS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
    SELECT org_id FROM public.org_members WHERE user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_org_ids() IS 
'Helper para obtener org_ids del usuario sin activar RLS recursivamente';

-- ============================================================================
-- PARTE 2: REEMPLAZAR POLÍTICAS PROBLEMÁTICAS DE org_members
-- ============================================================================

-- Eliminar políticas con recursión
DROP POLICY IF EXISTS "org_members_own_select" ON public.org_members;
DROP POLICY IF EXISTS "org_members_owner_update" ON public.org_members;

-- Política SELECT: Ver propias membresías Y colegas (usando helper)
CREATE POLICY "org_members_select" ON public.org_members
FOR SELECT TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR org_id IN (SELECT public.get_user_org_ids())
);

-- Política UPDATE: Solo owners pueden actualizar roles
CREATE POLICY "org_members_owner_update" ON public.org_members
FOR UPDATE TO authenticated
USING (
    org_id IN (SELECT public.get_user_org_ids())
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.get_user_org_ids() AS user_orgs
        WHERE user_orgs = org_members.org_id
    )
    AND (
        -- Verificar que el usuario actual es owner de esta org
        (SELECT role FROM public.org_members 
         WHERE user_id = (SELECT auth.uid()) 
         AND org_id = org_members.org_id
         LIMIT 1) = 'owner'
    )
);

-- ============================================================================
-- PARTE 3: RECONSTRUIR get_pending_invitations CON CALIFICACIÓN COMPLETA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_pending_invitations()
RETURNS TABLE (
    invitation_id UUID,
    org_id UUID,
    org_name TEXT,
    org_slug TEXT,
    inviter_name TEXT,
    inviter_email TEXT,
    role TEXT,
    message TEXT,
    created_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
    current_user_email TEXT;
BEGIN
    -- Obtener email del usuario actual
    SELECT email INTO current_user_email
    FROM auth.users
    WHERE id = auth.uid();

    RETURN QUERY
    SELECT 
        i.id AS invitation_id,
        i.org_id,
        o.name::TEXT AS org_name,
        o.slug::TEXT AS org_slug,
        CASE
            WHEN p.name_enc IS NOT NULL AND current_setting('app.encryption_key', true) IS NOT NULL 
            THEN public.decrypt_pii(p.name_enc)
            ELSE 'Usuario'::TEXT
        END AS inviter_name,
        u.email::TEXT AS inviter_email,
        i.role::TEXT,
        i.message::TEXT,
        i.created_at,
        i.expires_at
    FROM public.org_invitations i
    INNER JOIN public.organizations o ON o.id = i.org_id
    INNER JOIN auth.users u ON u.id = i.inviter_user_id
    LEFT JOIN public.profiles p ON p.id = i.inviter_user_id
    WHERE (
        i.invitee_user_id = auth.uid() 
        OR i.invitee_email = current_user_email
    )
    AND i.status = 'pending'
    AND i.expires_at > NOW()
    ORDER BY i.created_at DESC;
END;
$$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
    policy_count INTEGER;
    helper_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_user_org_ids'
    ) INTO helper_exists;
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'org_members' AND schemaname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ MIGRACIÓN CORRECTIVA COMPLETADA';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Helper get_user_org_ids() creado: %', helper_exists;
    RAISE NOTICE 'Políticas en org_members: %', policy_count;
    RAISE NOTICE 'get_pending_invitations() reconstruida';
    RAISE NOTICE '============================================';
END $$;
