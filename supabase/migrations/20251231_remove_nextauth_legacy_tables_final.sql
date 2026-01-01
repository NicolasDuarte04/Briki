-- =====================================================
-- MIGRACIÓN: Eliminación Final de Tablas Legacy NextAuth
-- Fecha: 2025-12-31
-- Objetivo: Eliminar tablas legacy de NextAuth que ya no se usan
-- =====================================================
-- 
-- PRERREQUISITO: Verificar que las tablas NO tienen datos importantes
-- Ejecutar esta consulta ANTES de aplicar esta migración:
--
-- SELECT 
--     'Account' as tabla, COUNT(*) as registros FROM public."Account"
-- UNION ALL SELECT 'Session', COUNT(*) FROM public."Session"
-- UNION ALL SELECT 'VerificationToken', COUNT(*) FROM public."VerificationToken"
-- UNION ALL SELECT 'User', COUNT(*) FROM public."User"
-- UNION ALL SELECT 'Profile', COUNT(*) FROM public."Profile";
--
-- Si alguna tabla tiene registros > 0, NO ejecutar esta migración
-- sin antes analizar y migrar los datos necesarios.
--
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: Verificación de seguridad
-- =====================================================
-- Las siguientes tablas son reemplazadas por:
-- - Account → auth.identities (Supabase Auth nativo)
-- - Session → auth.sessions (Supabase Auth nativo)
-- - VerificationToken → Tokens de Supabase Auth
-- - User → auth.users (Supabase Auth nativo)
-- - Profile → public.profiles (nuevo modelo Supabase)

-- =====================================================
-- PASO 2: Eliminar tablas en orden de dependencias
-- =====================================================
-- Orden: Primero las que tienen FKs, luego las principales

-- 2.1 Account depende de User
DROP TABLE IF EXISTS public."Account" CASCADE;

-- 2.2 Session depende de User
DROP TABLE IF EXISTS public."Session" CASCADE;

-- 2.3 Profile depende de User
DROP TABLE IF EXISTS public."Profile" CASCADE;

-- 2.4 VerificationToken es independiente
DROP TABLE IF EXISTS public."VerificationToken" CASCADE;

-- 2.5 User es la tabla principal (eliminar al final)
DROP TABLE IF EXISTS public."User" CASCADE;

-- =====================================================
-- PASO 3: Limpieza de secuencias huérfanas (si existen)
-- =====================================================
DROP SEQUENCE IF EXISTS public."Account_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS public."Session_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS public."User_id_seq" CASCADE;

-- =====================================================
-- PASO 4: Verificación post-eliminación
-- =====================================================
-- Verificar que las tablas fueron eliminadas:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('Account', 'Session', 'VerificationToken', 'User', 'Profile');
-- Debe retornar 0 filas.

COMMIT;

-- =====================================================
-- NOTAS DE MIGRACIÓN
-- =====================================================
-- Esta migración es IDEMPOTENTE. Se puede ejecutar múltiples veces.
-- 
-- ARQUITECTURA DESPUÉS DE LA MIGRACIÓN:
-- 
-- ┌─────────────────────────────────────────┐
-- │           AUTENTICACIÓN                  │
-- ├─────────────────────────────────────────┤
-- │ auth.users (Supabase Auth)              │
-- │   └── public.profiles (PK = users.id)   │
-- │   └── public.org_members (FK user_id)   │
-- │   └── public.user_preferences (FK)      │
-- └─────────────────────────────────────────┘
-- 
-- TABLAS ELIMINADAS (Legacy NextAuth):
-- - public."Account" ❌
-- - public."Session" ❌
-- - public."VerificationToken" ❌
-- - public."User" ❌
-- - public."Profile" ❌
--
-- ACCIÓN REQUERIDA POST-MIGRACIÓN:
-- 1. Actualizar prisma/schema.prisma eliminando modelos:
--    - Account
--    - Session
--    - VerificationToken
--    - public_User
--    - public_Profile
-- 2. Ejecutar: pnpm prisma generate
-- =====================================================

