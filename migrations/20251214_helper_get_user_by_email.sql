-- ============================================================================
-- MIGRACIÓN: Helper function para buscar usuario por email
-- ============================================================================
-- Fecha: 2025-12-14
-- Objetivo: Función auxiliar para invitaciones
-- ============================================================================

-- Función para obtener user_id por email (usado en invitaciones)
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(target_email TEXT)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM auth.users 
        WHERE email = lower(target_email)
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_id_by_email(TEXT) IS 
'Obtiene el UUID de un usuario por su email. Usado en sistema de invitaciones.';

-- Grant para usuarios autenticados
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO authenticated;
