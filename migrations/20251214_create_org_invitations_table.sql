-- ============================================================================
-- MIGRACIÓN: CREAR TABLA org_invitations
-- ============================================================================
-- Fecha: 2025-12-14
-- Objetivo: Sistema de invitaciones a organizaciones por email
-- Prioridad: ALTA
-- Tipo: NON-DESTRUCTIVE (No modifica tablas existentes)
-- ============================================================================
--
-- RESUMEN DE CAMBIOS:
-- 1. Tabla org_invitations - Almacena invitaciones pendientes/respondidas
-- 2. Índices optimizados para queries frecuentes
-- 3. RLS Policies completas (invitado ve sus invitaciones, admins ven las de su org)
-- 4. Función helper para obtener invitaciones pendientes
--
-- FLUJO DE INVITACIÓN:
-- 1. Admin/Owner invita por email → Se crea registro con status='pending'
-- 2. Si el email existe en auth.users → Se asigna invitee_user_id
-- 3. Usuario invitado ve notificación en tab "Notifications"
-- 4. Usuario acepta/rechaza → Se actualiza status y responded_at
-- 5. Si acepta → Se crea registro en org_members (lógica en backend)
--
-- COMPATIBILIDAD:
-- ✅ Compatible con migraciones existentes
-- ✅ No modifica tablas existentes
-- ✅ Idempotente (puede ejecutarse múltiples veces)
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR ENUM PARA ESTADO DE INVITACIÓN (si no existe)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status_enum') THEN
        CREATE TYPE public.invitation_status_enum AS ENUM (
            'pending',    -- Esperando respuesta
            'accepted',   -- Aceptada (usuario se unió a la org)
            'rejected',   -- Rechazada por el invitado
            'expired',    -- Expiró sin respuesta
            'cancelled'   -- Cancelada por el invitante
        );
        RAISE NOTICE '✅ Enum invitation_status_enum creado';
    ELSE
        RAISE NOTICE 'ℹ️  Enum invitation_status_enum ya existe';
    END IF;
END $$;

-- ============================================================================
-- PASO 2: CREAR TABLA org_invitations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.org_invitations (
    -- Identificador único
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organización destino
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Usuario que envía la invitación (admin/owner)
    inviter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Email del invitado (siempre requerido)
    invitee_email TEXT NOT NULL,
    
    -- Usuario invitado (NULL si no está registrado en Briki)
    -- Se llena automáticamente si el email existe en auth.users
    invitee_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Rol que tendrá el invitado al aceptar
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    -- NOTA: 'owner' no se puede asignar por invitación, solo el owner actual puede transferir
    
    -- Estado de la invitación
    status public.invitation_status_enum NOT NULL DEFAULT 'pending',
    
    -- Mensaje opcional del invitante
    message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    responded_at TIMESTAMPTZ,
    
    -- Constraint: No duplicar invitaciones pendientes al mismo email para la misma org
    CONSTRAINT unique_pending_invitation_per_org_email 
        UNIQUE NULLS NOT DISTINCT (org_id, invitee_email, status) 
        -- PostgreSQL 15+ syntax, si falla usar trigger alternativo
);

-- Comentarios descriptivos
COMMENT ON TABLE public.org_invitations IS 
'Invitaciones a organizaciones. Los usuarios pueden ser invitados por email y aceptar/rechazar.';

COMMENT ON COLUMN public.org_invitations.invitee_email IS 
'Email del invitado. Siempre requerido, incluso si el usuario ya existe.';

COMMENT ON COLUMN public.org_invitations.invitee_user_id IS 
'UUID del usuario invitado si ya existe en Briki. NULL si es usuario externo.';

COMMENT ON COLUMN public.org_invitations.role IS 
'Rol que se asignará al usuario al aceptar. Solo member o admin (owner no se puede asignar).';

COMMENT ON COLUMN public.org_invitations.expires_at IS 
'Las invitaciones expiran automáticamente después de 7 días.';

-- ============================================================================
-- PASO 3: ÍNDICES OPTIMIZADOS
-- ============================================================================

-- Índice: Buscar invitaciones por usuario invitado (para mostrar en Notifications)
CREATE INDEX IF NOT EXISTS idx_org_invitations_invitee_user_id 
    ON public.org_invitations(invitee_user_id) 
    WHERE invitee_user_id IS NOT NULL;

-- Índice: Buscar invitaciones por email (para verificar duplicados)
CREATE INDEX IF NOT EXISTS idx_org_invitations_invitee_email 
    ON public.org_invitations(invitee_email);

-- Índice: Buscar invitaciones pendientes por organización (para admins)
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_pending 
    ON public.org_invitations(org_id, status) 
    WHERE status = 'pending';

-- Índice: Buscar invitaciones pendientes del usuario (para tab Notifications)
CREATE INDEX IF NOT EXISTS idx_org_invitations_user_pending 
    ON public.org_invitations(invitee_user_id, status) 
    WHERE status = 'pending';

-- Índice: Limpieza de invitaciones expiradas
CREATE INDEX IF NOT EXISTS idx_org_invitations_expires_at 
    ON public.org_invitations(expires_at) 
    WHERE status = 'pending';

-- Índice: Usuario que invitó (para historial)
CREATE INDEX IF NOT EXISTS idx_org_invitations_inviter 
    ON public.org_invitations(inviter_user_id);

-- ============================================================================
-- PASO 4: HABILITAR RLS
-- ============================================================================

ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 5: POLÍTICAS RLS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- SELECT: Usuario invitado puede ver sus propias invitaciones
-- -----------------------------------------------------------------------------
CREATE POLICY "invitee_can_view_own_invitations"
    ON public.org_invitations FOR SELECT
    USING (
        -- El usuario es el invitado (por user_id)
        invitee_user_id = auth.uid()
    );

-- -----------------------------------------------------------------------------
-- SELECT: Admins/Owners pueden ver invitaciones de su organización
-- -----------------------------------------------------------------------------
CREATE POLICY "org_admins_can_view_org_invitations"
    ON public.org_invitations FOR SELECT
    USING (
        -- El usuario es admin u owner de la organización
        org_id IN (
            SELECT om.org_id 
            FROM public.org_members om
            WHERE om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
        )
    );

-- -----------------------------------------------------------------------------
-- INSERT: Solo Admins/Owners pueden crear invitaciones para su organización
-- -----------------------------------------------------------------------------
CREATE POLICY "org_admins_can_create_invitations"
    ON public.org_invitations FOR INSERT
    WITH CHECK (
        -- El usuario es admin u owner de la organización destino
        org_id IN (
            SELECT om.org_id 
            FROM public.org_members om
            WHERE om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
        )
        -- Y se está registrando como el invitante
        AND inviter_user_id = auth.uid()
    );

-- -----------------------------------------------------------------------------
-- UPDATE: Usuario invitado puede responder (aceptar/rechazar)
-- -----------------------------------------------------------------------------
CREATE POLICY "invitee_can_respond_to_invitation"
    ON public.org_invitations FOR UPDATE
    USING (
        -- Solo el usuario invitado puede responder
        invitee_user_id = auth.uid()
        -- Y la invitación está pendiente
        AND status = 'pending'
    )
    WITH CHECK (
        -- Solo puede cambiar a accepted o rejected
        status IN ('accepted', 'rejected')
        -- Y debe establecer responded_at
        AND responded_at IS NOT NULL
    );

-- -----------------------------------------------------------------------------
-- UPDATE: Admins/Owners pueden cancelar invitaciones pendientes
-- -----------------------------------------------------------------------------
CREATE POLICY "org_admins_can_cancel_invitations"
    ON public.org_invitations FOR UPDATE
    USING (
        -- El usuario es admin u owner de la organización
        org_id IN (
            SELECT om.org_id 
            FROM public.org_members om
            WHERE om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
        )
        -- Y la invitación está pendiente
        AND status = 'pending'
    )
    WITH CHECK (
        -- Solo puede cambiar a cancelled
        status = 'cancelled'
    );

-- -----------------------------------------------------------------------------
-- DELETE: Solo Admins/Owners pueden eliminar invitaciones (historial)
-- -----------------------------------------------------------------------------
CREATE POLICY "org_admins_can_delete_invitations"
    ON public.org_invitations FOR DELETE
    USING (
        -- El usuario es admin u owner de la organización
        org_id IN (
            SELECT om.org_id 
            FROM public.org_members om
            WHERE om.user_id = auth.uid()
            AND om.role IN ('admin', 'owner')
        )
    );

-- ============================================================================
-- PASO 6: FUNCIÓN PARA AUTO-ASIGNAR invitee_user_id
-- ============================================================================
-- Si el email ya existe en auth.users, asignar automáticamente el user_id

CREATE OR REPLACE FUNCTION public.auto_assign_invitee_user_id()
RETURNS TRIGGER AS $$
DECLARE
    found_user_id UUID;
BEGIN
    -- Buscar si el email existe en auth.users
    SELECT id INTO found_user_id
    FROM auth.users
    WHERE email = NEW.invitee_email
    LIMIT 1;
    
    -- Si existe, asignar el user_id
    IF found_user_id IS NOT NULL THEN
        NEW.invitee_user_id := found_user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Ejecutar antes de INSERT
DROP TRIGGER IF EXISTS trigger_auto_assign_invitee_user_id ON public.org_invitations;
CREATE TRIGGER trigger_auto_assign_invitee_user_id
    BEFORE INSERT ON public.org_invitations
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_invitee_user_id();

COMMENT ON FUNCTION public.auto_assign_invitee_user_id() IS 
'Auto-asigna invitee_user_id si el email existe en auth.users';

-- ============================================================================
-- PASO 7: FUNCIÓN PARA OBTENER INVITACIONES PENDIENTES DEL USUARIO
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
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id AS invitation_id,
        i.org_id,
        o.name AS org_name,
        o.slug AS org_slug,
        COALESCE(
            convert_from(decrypt_pii(p.name), 'UTF8'),
            'Usuario'
        ) AS inviter_name,
        u.email AS inviter_email,
        i.role,
        i.message,
        i.created_at,
        i.expires_at
    FROM public.org_invitations i
    INNER JOIN public.organizations o ON o.id = i.org_id
    INNER JOIN auth.users u ON u.id = i.inviter_user_id
    LEFT JOIN public.profiles p ON p.id = i.inviter_user_id
    WHERE i.invitee_user_id = auth.uid()
    AND i.status = 'pending'
    AND i.expires_at > NOW()
    ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_pending_invitations() IS 
'Obtiene las invitaciones pendientes del usuario actual con datos de la organización e invitante';

-- ============================================================================
-- PASO 8: FUNCIÓN PARA RESPONDER A UNA INVITACIÓN
-- ============================================================================

CREATE OR REPLACE FUNCTION public.respond_to_invitation(
    invitation_uuid UUID,
    accept BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    inv RECORD;
    result JSONB;
BEGIN
    -- Obtener la invitación y validar
    SELECT * INTO inv
    FROM public.org_invitations
    WHERE id = invitation_uuid
    AND invitee_user_id = auth.uid()
    AND status = 'pending'
    AND expires_at > NOW();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invitación no encontrada, expirada o ya respondida'
        );
    END IF;
    
    -- Actualizar la invitación
    UPDATE public.org_invitations
    SET 
        status = CASE WHEN accept THEN 'accepted'::invitation_status_enum ELSE 'rejected'::invitation_status_enum END,
        responded_at = NOW()
    WHERE id = invitation_uuid;
    
    -- Si acepta, crear la membresía
    IF accept THEN
        INSERT INTO public.org_members (org_id, user_id, role)
        VALUES (inv.org_id, auth.uid(), inv.role)
        ON CONFLICT (org_id, user_id) DO NOTHING; -- Por si ya es miembro
        
        RETURN jsonb_build_object(
            'success', true,
            'action', 'accepted',
            'org_id', inv.org_id,
            'role', inv.role
        );
    ELSE
        RETURN jsonb_build_object(
            'success', true,
            'action', 'rejected',
            'org_id', inv.org_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.respond_to_invitation(UUID, BOOLEAN) IS 
'Responde a una invitación. Si acepta, crea la membresía automáticamente.';

-- ============================================================================
-- PASO 9: FUNCIÓN PARA CONTAR INVITACIONES PENDIENTES
-- ============================================================================
-- Útil para mostrar badge en el tab Notifications

CREATE OR REPLACE FUNCTION public.count_pending_invitations()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.org_invitations
        WHERE invitee_user_id = auth.uid()
        AND status = 'pending'
        AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.count_pending_invitations() IS 
'Cuenta las invitaciones pendientes del usuario actual (para badge)';

-- ============================================================================
-- PASO 10: GRANTS DE SEGURIDAD
-- ============================================================================

-- Otorgar acceso a la tabla para usuarios autenticados (RLS protege los datos)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_invitations TO authenticated;

-- Otorgar acceso a las funciones
GRANT EXECUTE ON FUNCTION public.get_pending_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_invitation(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_pending_invitations() TO authenticated;

-- ============================================================================
-- PASO 11: VERIFICACIÓN FINAL
-- ============================================================================

DO $$
DECLARE
    table_exists boolean;
    rls_enabled boolean;
    policy_count integer;
    index_count integer;
BEGIN
    -- Verificar tabla
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'org_invitations'
    ) INTO table_exists;
    
    -- Verificar RLS
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'org_invitations';
    
    -- Contar políticas
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'org_invitations';
    
    -- Contar índices
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'org_invitations';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN DE MIGRACIÓN org_invitations';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Tabla existe: %', CASE WHEN table_exists THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE 'RLS habilitado: %', CASE WHEN rls_enabled THEN '✅ SÍ' ELSE '❌ NO' END;
    RAISE NOTICE 'Políticas RLS: % (esperado: 6)', policy_count;
    RAISE NOTICE 'Índices: % (esperado: 6)', index_count;
    RAISE NOTICE '========================================';
    
    IF NOT table_exists THEN
        RAISE EXCEPTION 'La tabla org_invitations no fue creada';
    END IF;
    
    IF NOT rls_enabled THEN
        RAISE EXCEPTION 'RLS no está habilitado en org_invitations';
    END IF;
END $$;

-- ============================================================================
-- MIGRACIÓN COMPLETADA
-- ============================================================================
-- 
-- PRÓXIMOS PASOS:
-- 1. Actualizar prisma/schema.prisma para reflejar la nueva tabla
-- 2. Ejecutar: npx prisma generate
-- 3. Crear Server Actions en src/app/actions/invitationActions.ts:
--    - inviteUserToOrg(email, orgId, role, message?)
--    - getPendingInvitations()
--    - respondToInvitation(invitationId, accept)
--    - countPendingInvitations()
-- 4. Actualizar AccountSettings.tsx para usar datos reales
--
-- QUERIES DE VERIFICACIÓN:
-- 
-- -- Ver estructura de la tabla:
-- \d public.org_invitations
--
-- -- Ver políticas RLS:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'org_invitations';
--
-- -- Probar obtener invitaciones pendientes:
-- SELECT * FROM public.get_pending_invitations();
--
-- -- Probar contar invitaciones:
-- SELECT public.count_pending_invitations();
--
-- ============================================================================
