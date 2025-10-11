-- =====================================================
-- MIGRATION: Remove NextAuth Legacy Tables
-- Objetivo: Eliminar completamente las tablas obsoletas relacionadas con NextAuth
--           para unificar la autenticación bajo Supabase Auth.
-- Fecha: 2025-10-11
-- Ticket/Issue: Limpieza de arquitectura duplicada
-- =====================================================

BEGIN;

-- =====================================================
-- ELIMINACIÓN DE TABLAS LEGACY DE NEXTAUTH
-- =====================================================
-- Se eliminan las tablas en orden para respetar las posibles dependencias.
-- El uso de 'CASCADE' asegura que cualquier objeto dependiente (vistas, FKs, etc.) también sea eliminado.

-- 1. Account: Tabla de cuentas OAuth de NextAuth
DROP TABLE IF EXISTS public."Account" CASCADE;
COMMENT ON TABLE public."Account" IS NULL; -- Remove any comment if table existed

-- 2. Session: Tabla de sesiones de NextAuth
DROP TABLE IF EXISTS public."Session" CASCADE;

-- 3. VerificationToken: Tabla de tokens de verificación de NextAuth
DROP TABLE IF EXISTS public."VerificationToken" CASCADE;

-- 4. Profile: Tabla de perfiles de NextAuth (OBSOLETA, no confundir con 'profiles' de Supabase)
-- ⚠️ IMPORTANTE: Esta es la tabla 'Profile' que mapea a public."Profile", NO 'profiles'
DROP TABLE IF EXISTS public."Profile" CASCADE;

-- 5. User: Tabla de usuarios de NextAuth (OBSOLETA, no confundir con 'auth.users' de Supabase)
-- ⚠️ IMPORTANTE: Esta es la tabla 'User' que mapea a public."User", NO 'auth.users'
DROP TABLE IF EXISTS public."User" CASCADE;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON SCHEMA public IS 'Schema público limpiado de tablas legacy de NextAuth. Solo mantiene tablas de Supabase Auth.';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Las siguientes tablas DEBEN PERMANECER intactas:
-- - auth.users (Supabase Auth)
-- - public.profiles (Supabase Auth - vinculada a auth.users)
-- - public.organizations
-- - public.org_members
-- - public.clients
-- - public.cases
-- - public.artifacts
-- - public.audit_log

COMMIT;

-- =====================================================
-- NOTAS DE MIGRACIÓN
-- =====================================================
-- Esta migración es IDEMPOTENTE. Se puede ejecutar múltiples veces sin efectos adversos.
-- Si las tablas no existen, simplemente se salta la operación.
--
-- ANTES DE LA MIGRACIÓN:
-- - Sistema dual: NextAuth + Supabase Auth
-- - Tablas duplicadas causando confusión
--
-- DESPUÉS DE LA MIGRACIÓN:
-- - Sistema único: Supabase Auth solamente
-- - Arquitectura limpia y consolidada
-- =====================================================

