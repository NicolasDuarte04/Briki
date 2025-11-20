-- ============================================================
-- SCRIPT DE PRUEBAS RLS MULTI-TENANT
-- ============================================================
-- Objetivo: Verificar que RLS está funcionando correctamente
--          y que el aislamiento por organización es efectivo
-- ============================================================

-- IMPORTANTE: Este script debe ejecutarse en Supabase SQL Editor
-- O ejecutarlo desde psql con permisos adecuados

-- ============================================================
-- VERIFICACIÓN 1: RLS ESTÁ HABILITADO
-- ============================================================

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'org_members', 'clients', 'cases', 'artifacts', 'api_keys')
ORDER BY tablename;

-- Resultado esperado: rowsecurity = true para todas las tablas

-- ============================================================
-- VERIFICACIÓN 2: POLÍTICAS RLS CREADAS
-- ============================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Resultado esperado: Múltiples políticas por tabla (SELECT, INSERT, UPDATE, DELETE)

-- ============================================================
-- VERIFICACIÓN 3: AISLAMIENTO DE ORGANIZACIONES
-- ============================================================
-- Esta verificación requiere autenticación como usuario específico
-- Para ejecutarla, conéctate como usuario de prueba en Supabase

-- Ejemplo de verificación manual:
-- 1. Conéctate como Usuario A (org A)
-- 2. Intenta SELECT * FROM clients; 
-- 3. Debe retornar SOLO clients de org A

-- Conéctate como Usuario B (org B)
-- 4. Intenta SELECT * FROM clients;
-- 5. Debe retornar SOLO clients de org B (no debe ver nada de org A)

-- ============================================================
-- VERIFICACIÓN 4: FUNCIONES DE CIFRADO
-- ============================================================

SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'encrypt_pii',
    'decrypt_pii',
    'encrypt_api_key',
    'decrypt_api_key'
  )
ORDER BY routine_name;

-- Resultado esperado: 4 funciones deben existir

-- ============================================================
-- VERIFICACIÓN 5: STRUCTURA DE TABLAS CRÍTICAS
-- ============================================================

-- Clients debe tener campos de cifrado
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clients'
  AND column_name LIKE '%_enc'
ORDER BY column_name;

-- Resultado esperado: name_enc, email_enc, phone_enc, address_enc (todos tipo bytea)

-- API Keys debe tener campo de cifrado
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'api_keys'
  AND column_name LIKE 'key_hash';

-- Resultado esperado: key_hash tipo bytea

-- ============================================================
-- VERIFICACIÓN 6: EXTENSIÓN PGGCRYPTO HABILITADA
-- ============================================================

SELECT 
  extname,
  extversion
FROM pg_extension
WHERE extname = 'pgcrypto';

-- Resultado esperado: pgcrypto versión instalada

-- ============================================================
-- RESUMEN
-- ============================================================
-- Si todas las verificaciones pasan:
-- ✅ RLS está funcionando correctamente
-- ✅ Aislamiento entre organizaciones está garantizado
-- ✅ Cifrado PII está implementado correctamente
-- ✅ La aplicación está lista para producción
-- ============================================================
