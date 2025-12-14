-- ============================================================================
-- MIGRACIÓN: Corregir función get_pending_invitations para multitenancy
-- ============================================================================
-- Fecha: 2025-12-14
-- Objetivo: 
--   1. Corregir columna p.name -> p.name_enc para desencriptación
--   2. Agregar filtro por email además de user_id (crítico para invitaciones)
--   3. SECURITY DEFINER permite bypass seguro de RLS en organizations
-- ============================================================================

-- Actualizar función get_pending_invitations
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
) AS $$
DECLARE
    current_user_email TEXT;
BEGIN
    -- Obtener email del usuario actual desde auth.users
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
            THEN decrypt_pii(p.name_enc)
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
        -- Filtrar por user_id O por email (crítico para robustez)
        i.invitee_user_id = auth.uid() 
        OR i.invitee_email = current_user_email
    )
    AND i.status = 'pending'
    AND i.expires_at > NOW()
    ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Función get_pending_invitations actualizada:';
    RAISE NOTICE '   - Usa columna name_enc para desencriptación';
    RAISE NOTICE '   - Filtra por user_id O email (robustez)';
    RAISE NOTICE '   - SECURITY DEFINER bypass RLS de organizations';
    RAISE NOTICE '========================================';
END $$;
