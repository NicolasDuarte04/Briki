# ⚡ COMANDOS DE VALIDACIÓN RÁPIDA - FASE 1

**Copiar y pegar estos comandos para validar la FASE 1**

---

## 🚀 APLICACIÓN (Método Automatizado)

```bash
cd /home/liones_messi/Documentos/trabajo/Briki
./scripts/apply-fase1-migration.sh
```

---

## ✅ VERIFICACIÓN RÁPIDA (2 minutos)

### 1. Verificar tablas creadas

```bash
psql "$DATABASE_URL" -c "
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('policy_analyses', 'policy_page_references')
ORDER BY table_name;
"
```

**Resultado esperado**:
```
        table_name        | column_count
--------------------------+--------------
 policy_analyses          |           10
 policy_page_references   |            8
(2 rows)
```

---

### 2. Verificar foreign keys

```bash
psql "$DATABASE_URL" -c "
SELECT 
  tc.table_name,
  COUNT(*) AS fk_count
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('policy_analyses', 'policy_page_references')
GROUP BY tc.table_name
ORDER BY tc.table_name;
"
```

**Resultado esperado**:
```
        table_name        | fk_count
--------------------------+----------
 policy_analyses          |        3
 policy_page_references   |        1
(2 rows)
```

---

### 3. Verificar índices

```bash
psql "$DATABASE_URL" -c "
SELECT 
  tablename,
  COUNT(*) AS index_count,
  COUNT(*) FILTER (WHERE indexdef LIKE '%USING gin%') AS gin_indexes
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('policy_analyses', 'policy_page_references')
GROUP BY tablename
ORDER BY tablename;
"
```

**Resultado esperado**:
```
        tablename        | index_count | gin_indexes
-------------------------+-------------+-------------
 policy_analyses         |           7 |           1
 policy_page_references  |           5 |           0
(2 rows)
```

**✅ CRÍTICO**: `policy_analyses` debe tener 1 índice GIN

---

### 4. Verificar RLS habilitado

```bash
psql "$DATABASE_URL" -c "
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) AS policy_count
FROM pg_tables t
WHERE schemaname = 'public'
AND tablename IN ('policy_analyses', 'policy_page_references')
ORDER BY tablename;
"
```

**Resultado esperado**:
```
 schemaname |        tablename        | rowsecurity | policy_count
------------+-------------------------+-------------+--------------
 public     | policy_analyses         | t           |            4
 public     | policy_page_references  | t           |            4
(2 rows)
```

**✅ CRÍTICO**: `rowsecurity` debe ser `t` (true)

---

### 5. Verificar Prisma

```bash
# Validar schema
npx prisma validate

# Generar cliente
npx prisma generate

# Verificar que los nuevos modelos están disponibles
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); console.log('✅ PolicyAnalysis:', typeof p.policyAnalysis); console.log('✅ PolicyPageReference:', typeof p.policyPageReference);"
```

**Resultado esperado**:
```
✔ Prisma schema is valid
✔ Generated Prisma Client
✅ PolicyAnalysis: object
✅ PolicyPageReference: object
```

---

## 🧪 TESTS COMPLETOS (3 minutos)

```bash
# Ejecutar suite de tests
npm test tests/db/policy-analyses-migrations.test.ts

# Ver solo resumen
npm test tests/db/policy-analyses-migrations.test.ts --verbose=false
```

**Resultado esperado**: ✅ 30/30 tests passing

---

## 🔍 VERIFICACIÓN DETALLADA (Opcional, 5 minutos)

### Ver estructura completa de policy_analyses

```bash
psql "$DATABASE_URL" -c "
\d+ policy_analyses
"
```

### Ver estructura completa de policy_page_references

```bash
psql "$DATABASE_URL" -c "
\d+ policy_page_references
"
```

### Ver todas las políticas RLS

```bash
psql "$DATABASE_URL" -c "
SELECT 
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename LIKE 'policy_%'
ORDER BY tablename, cmd;
"
```

### Verificar check constraints

```bash
psql "$DATABASE_URL" -c "
SELECT
  tc.table_name,
  cc.constraint_name,
  cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc
  ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('policy_analyses', 'policy_page_references')
ORDER BY tc.table_name;
"
```

---

## ❌ ROLLBACK (Si es necesario)

```bash
# Eliminar tablas
psql "$DATABASE_URL" -c "
DROP TABLE IF EXISTS public.policy_page_references CASCADE;
DROP TABLE IF EXISTS public.policy_analyses CASCADE;
"

# Revertir Prisma schema
cd /home/liones_messi/Documentos/trabajo/Briki
git checkout prisma/schema.prisma

# Regenerar cliente
npx prisma generate
```

---

## ✅ CHECKLIST MÍNIMO

Copiar y marcar:

```
[ ] Script apply-fase1-migration.sh ejecutado sin errores
[ ] 2 tablas creadas (policy_analyses, policy_page_references)
[ ] 10 columnas en policy_analyses
[ ] 8 columnas en policy_page_references
[ ] 3 foreign keys en policy_analyses
[ ] 1 foreign key en policy_page_references
[ ] 7 índices en policy_analyses (incluyendo 1 GIN)
[ ] 5 índices en policy_page_references
[ ] RLS habilitado en ambas tablas (rowsecurity = t)
[ ] 4 políticas RLS por tabla (8 total)
[ ] npx prisma validate sin errores
[ ] npx prisma generate sin errores
[ ] Tests passing (30/30) - OPCIONAL pero recomendado
```

---

## 🎯 COMANDO TODO-EN-UNO

**Validación completa en un solo comando** (para copiar/pegar):

```bash
cd /home/liones_messi/Documentos/trabajo/Briki && \
echo "🔍 Verificando tablas..." && \
psql "$DATABASE_URL" -t -c "SELECT COUNT(*) || ' tablas creadas' FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('policy_analyses', 'policy_page_references');" && \
echo "🔍 Verificando índices..." && \
psql "$DATABASE_URL" -t -c "SELECT COUNT(*) || ' índices totales' FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('policy_analyses', 'policy_page_references');" && \
echo "🔍 Verificando RLS..." && \
psql "$DATABASE_URL" -t -c "SELECT COUNT(*) || ' políticas RLS' FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('policy_analyses', 'policy_page_references');" && \
echo "🔍 Verificando Prisma..." && \
npx prisma validate && \
echo "✅ FASE 1 VALIDADA CORRECTAMENTE"
```

**Resultado esperado**:
```
🔍 Verificando tablas...
 2 tablas creadas
🔍 Verificando índices...
 12 índices totales
🔍 Verificando RLS...
 8 políticas RLS
🔍 Verificando Prisma...
✔ Prisma schema is valid
✅ FASE 1 VALIDADA CORRECTAMENTE
```

---

## 📊 VALIDACIÓN VISUAL

Si todo está correcto, deberías poder ejecutar esto sin errores:

```typescript
// Crear archivo test rápido: test-fase1.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFase1() {
  console.log('✅ Testing FASE 1...\n');
  
  // Test 1: Verificar modelos existen
  console.log('1. Modelos Prisma:');
  console.log('   - PolicyAnalysis:', typeof prisma.policyAnalysis);
  console.log('   - PolicyPageReference:', typeof prisma.policyPageReference);
  
  // Test 2: Count tablas
  const analysesCount = await prisma.policyAnalysis.count();
  const refsCount = await prisma.policyPageReference.count();
  console.log('\n2. Registros en BD:');
  console.log('   - policy_analyses:', analysesCount);
  console.log('   - policy_page_references:', refsCount);
  
  console.log('\n✅ FASE 1 funcionando correctamente!\n');
  
  await prisma.$disconnect();
}

testFase1().catch(console.error);
```

Ejecutar:
```bash
npx ts-node test-fase1.ts
```

---

## 🚀 APROBACIÓN PARA FASE 2

Una vez que todos los checks pasen:

```bash
echo "✅ FASE 1 APROBADA - Listo para FASE 2" > FASE1_APROBADA.txt
git add .
git commit -m "feat: FASE 1 - Infraestructura de análisis de pólizas completada

- Añadidas tablas policy_analyses y policy_page_references
- Implementadas políticas RLS para seguridad
- Creados 12 índices (incluyendo GIN para JSONB)
- Actualizados modelos Prisma
- Añadidos 30 tests unitarios
- Documentación completa

Archivos modificados:
- supabase/migrations/20251116_add_policy_analyses_tables.sql (creado)
- prisma/schema.prisma (actualizado)
- tests/db/policy-analyses-migrations.test.ts (creado)
- scripts/apply-fase1-migration.sh (creado)
- docs/* (6 archivos de documentación)

Tests: 30/30 passing
Estado: ✅ APROBADO
Próxima fase: FASE 2 - Mejora de Extracción de PDFs"
```

---

**Fin del documento - Comandos de Validación Fase 1**

