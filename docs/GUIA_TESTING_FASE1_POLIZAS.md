# 🧪 GUÍA COMPLETA DE TESTING - FASE 1: INFRAESTRUCTURA DE ANÁLISIS DE PÓLIZAS

**Fecha**: 16 de Noviembre, 2025  
**Fase**: 1 - Preparación de Infraestructura  
**Fuente**: `PLAN_ANALISIS_POLIZAS_PDF.md`

---

## 📋 ÍNDICE

1. [Pre-requisitos](#pre-requisitos)
2. [Método 1: Script Automatizado (Recomendado)](#método-1-script-automatizado)
3. [Método 2: Pasos Manuales](#método-2-pasos-manuales)
4. [Verificación Exhaustiva](#verificación-exhaustiva)
5. [Tests Unitarios](#tests-unitarios)
6. [Resolución de Problemas](#resolución-de-problemas)
7. [Rollback](#rollback)

---

## PRE-REQUISITOS

### 1. Variables de Entorno

Asegurar que tienes configurado:

```bash
# Verificar DATABASE_URL
echo $DATABASE_URL

# Si no está configurado, exportarlo o añadirlo a .env
export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[HOST]:[PORT]/[DATABASE]"
```

### 2. Acceso a Base de Datos

```bash
# Probar conexión
psql "$DATABASE_URL" -c "SELECT version();"
```

**Resultado esperado**: Versión de PostgreSQL

### 3. Dependencias Instaladas

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

# Verificar instalación
node --version   # debe ser >= 18
npm --version    # debe ser >= 9
pnpm --version   # debe ser >= 8

# Instalar dependencias si es necesario
pnpm install
```

---

## MÉTODO 1: SCRIPT AUTOMATIZADO

**Recomendado para desarrollo rápido y seguro**

### Paso 1: Ejecutar Script

```bash
cd /home/liones_messi/Documentos/trabajo/Briki
./scripts/apply-fase1-migration.sh
```

### Paso 2: Seguir Prompts Interactivos

El script te guiará a través de:

1. ✅ Validación de Prisma Schema
2. ✅ Aplicación de migración SQL
3. ✅ Generación de Prisma Client
4. ✅ Verificación de tipos TypeScript
5. ✅ Verificación de tablas creadas
6. ✅ (Opcional) Ejecución de tests

### Paso 3: Revisar Output

**Output esperado**:

```
========================================
FASE 1: Policy Analysis Infrastructure
========================================

ℹ Step 1: Validating Prisma Schema...
✓ Prisma schema is valid

ℹ Step 2: Applying database migration...
⚠ This will create the following tables:
  - policy_analyses
  - policy_page_references

Continue? (y/n) y
ℹ Applying migration to database...
✓ Migration applied successfully

ℹ Step 3: Generating Prisma Client...
✓ Prisma Client generated

ℹ Step 4: Verifying TypeScript types...
✓ TypeScript types are valid

ℹ Step 5: Verifying tables in database...
✓ Both tables created successfully

========================================
MIGRATION SUMMARY
========================================

✓ FASE 1 Migration Completed Successfully!

Tables created:
  ✓ policy_analyses
  ✓ policy_page_references

Foreign keys:
  ✓ policy_analyses → artifacts (CASCADE)
  ✓ policy_analyses → cases (CASCADE)
  ✓ policy_analyses → organizations (CASCADE)
  ✓ policy_page_references → policy_analyses (CASCADE)

RLS Policies:
  ✓ SELECT, INSERT, UPDATE, DELETE on both tables

Indices:
  ✓ 6 indices on policy_analyses (including GIN on JSONB)
  ✓ 4 indices on policy_page_references

✓ Done!
```

---

## MÉTODO 2: PASOS MANUALES

**Para mayor control o debugging**

### Paso 1: Validar Schema de Prisma

```bash
cd /home/liones_messi/Documentos/trabajo/Briki
npx prisma validate
```

**Resultado esperado**:
```
✔ Prisma schema loaded from prisma/schema.prisma
✔ Prisma schema is valid
```

❌ **Si falla**: Revisar `prisma/schema.prisma` para errores de sintaxis

---

### Paso 2: Aplicar Migración SQL

#### Opción A: Via psql (Línea de comandos)

```bash
psql "$DATABASE_URL" -f supabase/migrations/20251116_add_policy_analyses_tables.sql
```

**Output esperado**:
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
...
ALTER TABLE
CREATE POLICY
CREATE POLICY
...
```

#### Opción B: Via Supabase Dashboard

1. Ir a: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/sql
2. Abrir archivo: `supabase/migrations/20251116_add_policy_analyses_tables.sql`
3. Copiar todo el contenido
4. Pegar en el editor SQL de Supabase
5. Click en "Run" (abajo a la derecha)
6. Verificar mensaje: "Success. No rows returned"

#### Opción C: Via Supabase CLI Local

```bash
# Si tienes Supabase corriendo localmente
supabase db push

# O específicamente esta migración
supabase migration up
```

---

### Paso 3: Generar Cliente Prisma

```bash
npx prisma generate
```

**Output esperado**:
```
Prisma schema loaded from prisma/schema.prisma
✔ Generated Prisma Client (5.x.x) to ./node_modules/@prisma/client in 342ms

Start by importing it: import { PrismaClient } from '@prisma/client'
Follow: https://pris.ly/d/getting-started
```

---

### Paso 4: Verificar Tipos TypeScript

```bash
npx tsc --noEmit
```

**Output esperado**: Sin errores (o errores no relacionados con Prisma)

---

## VERIFICACIÓN EXHAUSTIVA

### 1. Verificar Existencia de Tablas

```sql
-- Conectar a la base de datos
psql "$DATABASE_URL"

-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('policy_analyses', 'policy_page_references');
```

**Resultado esperado**:
```
      table_name       
-----------------------
 policy_analyses
 policy_page_references
(2 rows)
```

---

### 2. Verificar Columnas de `policy_analyses`

```sql
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'policy_analyses'
ORDER BY ordinal_position;
```

**Resultado esperado** (10 columnas):
```
    column_name     |     data_type      | is_nullable |       column_default
--------------------+--------------------+-------------+----------------------------
 id                 | uuid               | NO          | gen_random_uuid()
 artifact_id        | uuid               | NO          | 
 case_id            | uuid               | NO          | 
 org_id             | uuid               | NO          | 
 extracted_data     | jsonb              | NO          | 
 extraction_method  | text               | NO          | 'hybrid'::text
 overall_confidence | numeric            | NO          | 0.00
 extracted_at       | timestamp with...  | NO          | now()
 created_at         | timestamp with...  | NO          | now()
 updated_at         | timestamp with...  | NO          | now()
```

---

### 3. Verificar Columnas de `policy_page_references`

```sql
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'policy_page_references'
ORDER BY ordinal_position;
```

**Resultado esperado** (8 columnas):
```
    column_name      |     data_type      | is_nullable |   column_default
---------------------+--------------------+-------------+--------------------
 id                  | uuid               | NO          | gen_random_uuid()
 policy_analysis_id  | uuid               | NO          | 
 field_name          | text               | NO          | 
 field_value         | text               | YES         | 
 page_number         | integer            | NO          | 
 bounding_box        | jsonb              | YES         | 
 confidence          | numeric            | NO          | 0.00
 created_at          | timestamp with...  | NO          | now()
```

---

### 4. Verificar Foreign Keys

```sql
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'policy_analyses'
ORDER BY tc.constraint_name;
```

**Resultado esperado** (3 foreign keys):
```
         constraint_name          | column_name |  foreign_table  | foreign_column | delete_rule
----------------------------------+-------------+-----------------+----------------+-------------
 fk_policy_analyses_artifact      | artifact_id | artifacts       | id             | CASCADE
 fk_policy_analyses_case          | case_id     | cases           | id             | CASCADE
 fk_policy_analyses_org           | org_id      | organizations   | id             | CASCADE
```

```sql
-- Para policy_page_references
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'policy_page_references';
```

**Resultado esperado** (1 foreign key):
```
       constraint_name        |    column_name     |  foreign_table  | foreign_column | delete_rule
------------------------------+--------------------+-----------------+----------------+-------------
 fk_policy_page_refs_analysis | policy_analysis_id | policy_analyses | id             | CASCADE
```

---

### 5. Verificar Índices

```sql
-- Índices de policy_analyses
SELECT indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'policy_analyses'
ORDER BY indexname;
```

**Resultado esperado** (7 índices incluyendo PK):
```
               indexname               |                          indexdef
---------------------------------------+------------------------------------------------------------
 idx_policy_analyses_artifact_id       | CREATE INDEX ... ON policy_analyses USING btree (artifact_id)
 idx_policy_analyses_case_id           | CREATE INDEX ... ON policy_analyses USING btree (case_id)
 idx_policy_analyses_confidence        | CREATE INDEX ... ON policy_analyses USING btree (overall_confidence)
 idx_policy_analyses_extracted_at      | CREATE INDEX ... ON policy_analyses USING btree (extracted_at DESC)
 idx_policy_analyses_extracted_data    | CREATE INDEX ... ON policy_analyses USING gin (extracted_data)
 idx_policy_analyses_org_id            | CREATE INDEX ... ON policy_analyses USING btree (org_id)
 policy_analyses_pkey                  | CREATE UNIQUE INDEX ... ON policy_analyses USING btree (id)
```

**✅ CRÍTICO**: Verificar que `idx_policy_analyses_extracted_data` usa **GIN** (no btree)

```sql
-- Índices de policy_page_references
SELECT indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'policy_page_references'
ORDER BY indexname;
```

**Resultado esperado** (5 índices incluyendo PK):
```
               indexname                |                             indexdef
----------------------------------------+-------------------------------------------------------------------
 idx_policy_page_refs_analysis_id       | CREATE INDEX ... ON policy_page_references USING btree (policy_analysis_id)
 idx_policy_page_refs_confidence        | CREATE INDEX ... ON policy_page_references USING btree (confidence)
 idx_policy_page_refs_field_name        | CREATE INDEX ... ON policy_page_references USING btree (field_name)
 idx_policy_page_refs_page_number       | CREATE INDEX ... ON policy_page_references USING btree (page_number)
 policy_page_references_pkey            | CREATE UNIQUE INDEX ... ON policy_page_references USING btree (id)
```

---

### 6. Verificar Check Constraints

```sql
SELECT
  tc.table_name,
  cc.constraint_name,
  cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc
  ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('policy_analyses', 'policy_page_references')
ORDER BY tc.table_name, cc.constraint_name;
```

**Resultado esperado** (4 check constraints):
```
      table_name       |     constraint_name      |                     check_clause
-----------------------+--------------------------+------------------------------------------------------
 policy_analyses       | policy_analyses_...      | (overall_confidence >= 0 AND overall_confidence <= 1)
 policy_analyses       | policy_analyses_...      | (extraction_method IN ('manual', 'ocr', 'hybrid'))
 policy_page_references| policy_page_references...| (confidence >= 0 AND confidence <= 1)
 policy_page_references| policy_page_references...| (page_number > 0)
```

---

### 7. Verificar RLS (Row Level Security)

```sql
-- Verificar que RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('policy_analyses', 'policy_page_references');
```

**Resultado esperado**:
```
 schemaname |        tablename        | rowsecurity
------------+-------------------------+-------------
 public     | policy_analyses         | t
 public     | policy_page_references  | t
```

**✅ CRÍTICO**: `rowsecurity` debe ser **t** (true)

```sql
-- Verificar políticas RLS de policy_analyses
SELECT 
  policyname,
  cmd,
  qual IS NOT NULL AS has_using,
  with_check IS NOT NULL AS has_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'policy_analyses'
ORDER BY cmd;
```

**Resultado esperado** (4 políticas):
```
            policyname            | cmd  | has_using | has_check
----------------------------------+------+-----------+-----------
 policy_analyses_org_...delete    | DELETE | t       | f
 policy_analyses_org_...insert    | INSERT | f       | t
 policy_analyses_org_...select    | SELECT | t       | f
 policy_analyses_org_...update    | UPDATE | t       | f
```

**✅ Debe haber 1 política por operación: SELECT, INSERT, UPDATE, DELETE**

```sql
-- Verificar políticas RLS de policy_page_references
SELECT 
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'policy_page_references'
ORDER BY cmd;
```

**Resultado esperado** (4 políticas):
```
            policyname             | cmd
-----------------------------------+--------
 policy_page_refs_org_...delete    | DELETE
 policy_page_refs_org_...insert    | INSERT
 policy_page_refs_org_...select    | SELECT
 policy_page_refs_org_...update    | UPDATE
```

---

### 8. Verificar Comentarios de Documentación

```sql
-- Comentarios de tablas
SELECT 
  tablename,
  obj_description(('public.' || tablename)::regclass) AS description
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('policy_analyses', 'policy_page_references');
```

**Resultado esperado**:
```
        tablename        |                    description
-------------------------+----------------------------------------------------
 policy_analyses         | Stores structured policy data extracted from PDF...
 policy_page_references  | Maps extracted policy fields to their exact...
```

---

## TESTS UNITARIOS

### Ejecutar Suite Completa de Tests

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

# Ejecutar tests de migración
npm test tests/db/policy-analyses-migrations.test.ts
```

**Output esperado**:

```
PASS  tests/db/policy-analyses-migrations.test.ts
  Policy Analysis Migrations
    Table Creation
      ✓ should create policy_analyses table (45ms)
      ✓ should create policy_page_references table (12ms)
    Table Columns
      ✓ should have correct columns in policy_analyses (23ms)
      ✓ should have correct columns in policy_page_references (18ms)
      ✓ should have JSONB type for extracted_data (15ms)
      ✓ should have DECIMAL(3,2) type for confidence fields (19ms)
    Foreign Key Constraints
      ✓ should have foreign key from policy_analyses to artifacts (21ms)
      ✓ should have foreign key from policy_analyses to cases (16ms)
      ✓ should have foreign key from policy_analyses to organizations (17ms)
      ✓ should have foreign key from policy_page_references to policy_analyses (14ms)
      ✓ should cascade delete from artifacts to policy_analyses (20ms)
    Indices
      ✓ should have indices on policy_analyses (25ms)
      ✓ should have GIN index on extracted_data for JSONB search (22ms)
      ✓ should have indices on policy_page_references (18ms)
    Check Constraints
      ✓ should enforce extraction_method enum values (19ms)
      ✓ should enforce overall_confidence between 0 and 1 (17ms)
      ✓ should enforce page_number > 0 (16ms)
    Row Level Security
      ✓ should have RLS enabled on policy_analyses (14ms)
      ✓ should have RLS enabled on policy_page_references (13ms)
      ✓ should have SELECT policy on policy_analyses (18ms)
      ✓ should have INSERT policy on policy_analyses (16ms)
      ✓ should have UPDATE policy on policy_analyses (15ms)
      ✓ should have DELETE policy on policy_analyses for admins only (24ms)
      ✓ should have policies on policy_page_references (17ms)
    Table Comments
      ✓ should have comment on policy_analyses table (15ms)
      ✓ should have comment on policy_page_references table (14ms)
    Default Values
      ✓ should have default UUID for id columns (18ms)
      ✓ should have default NOW() for timestamp columns (19ms)
      ✓ should have default "hybrid" for extraction_method (14ms)
      ✓ should have default 0.00 for confidence columns (16ms)

Test Suites: 1 passed, 1 total
Tests:       30 passed, 30 total
Snapshots:   0 total
Time:        3.452 s
```

**✅ CRÍTICO**: Todos los 30 tests deben pasar

---

## RESOLUCIÓN DE PROBLEMAS

### Problema 1: "Prisma schema validation failed"

**Síntomas**:
```
Error: schema validation failed
```

**Solución**:
```bash
# Verificar sintaxis
npx prisma format

# Ver errores específicos
npx prisma validate
```

---

### Problema 2: "Migration failed - table already exists"

**Síntomas**:
```
ERROR: relation "policy_analyses" already exists
```

**Solución A** (Migración ya aplicada):
```sql
-- Verificar si las tablas existen
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'policy_%';
```

Si existen, la migración ya fue aplicada. Continuar con Paso 3.

**Solución B** (Tablas incompletas):
```sql
-- Eliminar y reaplicar
DROP TABLE IF EXISTS public.policy_page_references CASCADE;
DROP TABLE IF EXISTS public.policy_analyses CASCADE;
```

Luego re-ejecutar la migración.

---

### Problema 3: "Foreign key constraint fails"

**Síntomas**:
```
ERROR: insert or update on table "policy_analyses" violates foreign key constraint
```

**Causa**: Tablas `artifacts`, `cases`, o `organizations` no existen.

**Solución**:
```sql
-- Verificar que las tablas padre existen
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('artifacts', 'cases', 'organizations');
```

Deben existir las 3 tablas. Si no:
```bash
# Aplicar migraciones anteriores
supabase db push
```

---

### Problema 4: "RLS policies not working"

**Síntomas**: No se pueden insertar/leer datos.

**Verificación**:
```sql
-- Verificar RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'policy_analyses';
```

Si `rowsecurity` es `f`:
```sql
ALTER TABLE public.policy_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_page_references ENABLE ROW LEVEL SECURITY;
```

---

### Problema 5: "Tests failing"

**Test específico falla**:
1. Ejecutar solo ese test:
```bash
npm test tests/db/policy-analyses-migrations.test.ts -t "nombre del test"
```

2. Ver query SQL en el test
3. Ejecutar manualmente en psql
4. Comparar resultado esperado vs. actual

**Todos los tests fallan**:
- Verificar `DATABASE_URL` en `.env`
- Verificar conexión a BD
- Verificar que migración se aplicó

---

## ROLLBACK

### Si necesitas revertir la migración:

```sql
-- Conectar a la base de datos
psql "$DATABASE_URL"

-- Eliminar tablas (CASCADE elimina foreign keys)
DROP TABLE IF EXISTS public.policy_page_references CASCADE;
DROP TABLE IF EXISTS public.policy_analyses CASCADE;

-- Salir
\q
```

### Revertir cambios en Prisma:

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

# Deshacer cambios al schema
git checkout prisma/schema.prisma

# Regenerar cliente
npx prisma generate
```

---

## CHECKLIST FINAL DE VALIDACIÓN

Antes de aprobar la Fase 1 y proceder a Fase 2:

### Base de Datos

- [ ] Tabla `policy_analyses` creada
- [ ] Tabla `policy_page_references` creada
- [ ] 10 columnas en `policy_analyses`
- [ ] 8 columnas en `policy_page_references`
- [ ] 3 foreign keys en `policy_analyses`
- [ ] 1 foreign key en `policy_page_references`
- [ ] Todas las foreign keys con CASCADE DELETE
- [ ] 6 índices en `policy_analyses` (incluyendo GIN en JSONB)
- [ ] 4 índices en `policy_page_references`
- [ ] 4 check constraints totales
- [ ] RLS habilitado en ambas tablas
- [ ] 4 políticas RLS por tabla (SELECT, INSERT, UPDATE, DELETE)
- [ ] Comentarios de documentación presentes

### Prisma

- [ ] `npx prisma validate` sin errores
- [ ] Modelo `PolicyAnalysis` en schema
- [ ] Modelo `PolicyPageReference` en schema
- [ ] Relación `policyAnalyses` en modelo `Artifact`
- [ ] Relación `policyAnalyses` en modelo `Case`
- [ ] `npx prisma generate` sin errores
- [ ] Cliente Prisma actualizado

### TypeScript

- [ ] `npx tsc --noEmit` sin errores (o errores no relacionados)
- [ ] Imports de Prisma funcionan
- [ ] Tipos `PolicyAnalysis` y `PolicyPageReference` disponibles

### Tests (Opcional pero recomendado)

- [ ] 30/30 tests pasando
- [ ] Sin warnings críticos
- [ ] Tiempo de ejecución < 5 segundos

---

## APROBACIÓN PARA FASE 2

Una vez completados todos los items del checklist:

✅ **FASE 1 VALIDADA Y APROBADA**

Puedes proceder a:
- **FASE 2**: Mejora de Extracción de PDFs
- Ver: `PLAN_ANALISIS_POLIZAS_PDF.md` Sección 7.2 (Días 4-6)

---

## SOPORTE

Si encuentras problemas:

1. Revisar sección [Resolución de Problemas](#resolución-de-problemas)
2. Verificar logs de PostgreSQL
3. Revisar documentación: `docs/FASE1_INFRAESTRUCTURA_COMPLETADA.md`
4. Consultar plan original: `docs/PLAN_ANALISIS_POLIZAS_PDF.md`

---

**Fin de la Guía de Testing - Fase 1**

**Última actualización**: 16 de Noviembre, 2025

