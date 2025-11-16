# ✅ FASE 1: PREPARACIÓN DE INFRAESTRUCTURA - COMPLETADA

**Fecha de Implementación**: 16 de Noviembre, 2025  
**Estado**: ✅ **IMPLEMENTADO - PENDIENTE DE VALIDACIÓN**  
**Fuente**: `PLAN_ANALISIS_POLIZAS_PDF.md` - Sección 7.2

---

## 📋 RESUMEN DE IMPLEMENTACIÓN

La Fase 1 del Plan de Análisis de Pólizas en PDF ha sido implementada completamente siguiendo estrictamente las especificaciones del documento de planificación.

### ✅ Archivos Creados

1. **Migración SQL**: `supabase/migrations/20251116_add_policy_analyses_tables.sql`
2. **Schema Prisma**: Actualización de `prisma/schema.prisma`
3. **Tests**: `tests/db/policy-analyses-migrations.test.ts`
4. **Documentación**: Este archivo

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### Tabla: `policy_analyses`

Almacena datos estructurados extraídos de artefactos PDF de pólizas.

**Columnas**:
- `id` (UUID, PK): Identificador único
- `artifact_id` (UUID, FK → artifacts): Referencia al PDF original
- `case_id` (UUID, FK → cases): Caso al que pertenece
- `org_id` (UUID, FK → organizations): Organización propietaria
- `extracted_data` (JSONB): Datos estructurados de la póliza
- `extraction_method` (TEXT): 'manual', 'ocr', o 'hybrid'
- `overall_confidence` (DECIMAL(3,2)): Score de confianza 0-1
- `extracted_at` (TIMESTAMPTZ): Fecha/hora de extracción
- `created_at` (TIMESTAMPTZ): Fecha/hora de creación
- `updated_at` (TIMESTAMPTZ): Fecha/hora de última actualización

**Constraints**:
- CHECK: `overall_confidence >= 0 AND overall_confidence <= 1`
- CHECK: `extraction_method IN ('manual', 'ocr', 'hybrid')`
- FK CASCADE DELETE hacia `artifacts`, `cases`, `organizations`

**Indices**:
- `idx_policy_analyses_artifact_id` (artifact_id)
- `idx_policy_analyses_case_id` (case_id)
- `idx_policy_analyses_org_id` (org_id)
- `idx_policy_analyses_extracted_at` (extracted_at DESC)
- `idx_policy_analyses_confidence` (overall_confidence)
- `idx_policy_analyses_extracted_data` (GIN en extracted_data para búsqueda JSONB)

**RLS Policies**:
- ✅ SELECT: Usuarios pueden ver análisis de su organización
- ✅ INSERT: Usuarios pueden crear análisis en su organización
- ✅ UPDATE: Usuarios pueden actualizar análisis de su organización
- ✅ DELETE: Solo admins/owners pueden eliminar análisis

### Tabla: `policy_page_references`

Mapea campos extraídos a ubicaciones exactas en el PDF fuente.

**Columnas**:
- `id` (UUID, PK): Identificador único
- `policy_analysis_id` (UUID, FK → policy_analyses): Análisis padre
- `field_name` (TEXT): Identificador del campo (ej: 'premium', 'deductible')
- `field_value` (TEXT, nullable): Valor extraído
- `page_number` (INTEGER): Número de página en el PDF
- `bounding_box` (JSONB, nullable): Coordenadas {x, y, width, height}
- `confidence` (DECIMAL(3,2)): Score de confianza 0-1 para este campo
- `created_at` (TIMESTAMPTZ): Fecha/hora de creación

**Constraints**:
- CHECK: `page_number > 0`
- CHECK: `confidence >= 0 AND confidence <= 1`
- FK CASCADE DELETE hacia `policy_analyses`

**Indices**:
- `idx_policy_page_refs_analysis_id` (policy_analysis_id)
- `idx_policy_page_refs_field_name` (field_name)
- `idx_policy_page_refs_page_number` (page_number)
- `idx_policy_page_refs_confidence` (confidence)

**RLS Policies**:
- ✅ SELECT: Usuarios pueden ver referencias a través de policy_analyses
- ✅ INSERT: Usuarios pueden crear referencias en análisis de su org
- ✅ UPDATE: Usuarios pueden actualizar referencias de su org
- ✅ DELETE: Solo admins/owners pueden eliminar referencias

---

## 📦 MODELOS PRISMA

### PolicyAnalysis

```prisma
model PolicyAnalysis {
  id                String                @id @default(dbgenerated("gen_random_uuid()"))
  artifactId        String                @map("artifact_id")
  caseId            String                @map("case_id")
  orgId             String                @map("org_id")
  extractedData     Json                  @map("extracted_data")
  extractionMethod  String                @default("hybrid")
  overallConfidence Decimal               @default(0.00) @db.Decimal(3, 2)
  extractedAt       DateTime              @map("extracted_at")
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @default(now()) @updatedAt
  
  artifact          Artifact              @relation(fields: [artifactId], references: [id], onDelete: Cascade)
  case              Case                  @relation(fields: [caseId], references: [id], onDelete: Cascade)
  pageReferences    PolicyPageReference[]
  
  @@map("policy_analyses")
  @@schema("public")
}
```

### PolicyPageReference

```prisma
model PolicyPageReference {
  id               String         @id @default(dbgenerated("gen_random_uuid()"))
  policyAnalysisId String         @map("policy_analysis_id")
  fieldName        String         @map("field_name")
  fieldValue       String?        @map("field_value")
  pageNumber       Int            @map("page_number")
  boundingBox      Json?          @map("bounding_box")
  confidence       Decimal        @default(0.00) @db.Decimal(3, 2)
  createdAt        DateTime       @default(now())
  
  policyAnalysis   PolicyAnalysis @relation(fields: [policyAnalysisId], references: [id], onDelete: Cascade)
  
  @@map("policy_page_references")
  @@schema("public")
}
```

### Actualizaciones a Modelos Existentes

**Artifact**:
```prisma
model Artifact {
  // ... campos existentes ...
  policyAnalyses PolicyAnalysis[] // ✅ NUEVO
}
```

**Case**:
```prisma
model Case {
  // ... campos existentes ...
  policyAnalyses PolicyAnalysis[] // ✅ NUEVO
}
```

---

## 🧪 TESTS IMPLEMENTADOS

El archivo `tests/db/policy-analyses-migrations.test.ts` contiene tests exhaustivos para verificar:

### ✅ Creación de Tablas
- Existencia de `policy_analyses`
- Existencia de `policy_page_references`

### ✅ Columnas y Tipos de Datos
- Todas las columnas presentes
- Tipos correctos (UUID, JSONB, DECIMAL, TIMESTAMPTZ, etc.)
- Precisión de DECIMAL(3,2) para confidence

### ✅ Foreign Keys
- FK de `policy_analyses` a `artifacts`
- FK de `policy_analyses` a `cases`
- FK de `policy_analyses` a `organizations`
- FK de `policy_page_references` a `policy_analyses`
- Reglas CASCADE DELETE

### ✅ Índices
- Todos los índices especificados
- Índice GIN en JSONB para búsqueda

### ✅ Check Constraints
- `extraction_method` enum
- `overall_confidence` entre 0 y 1
- `confidence` entre 0 y 1
- `page_number` > 0

### ✅ Row Level Security
- RLS habilitado en ambas tablas
- Políticas SELECT, INSERT, UPDATE, DELETE
- Aislamiento por organización
- Restricción de DELETE a admins/owners

### ✅ Valores Predeterminados
- UUID generado automáticamente
- Timestamps con NOW()
- `extraction_method` = 'hybrid'
- `confidence` = 0.00

### ✅ Comentarios de Documentación
- Comentarios en tablas
- Comentarios en columnas clave

---

## 🚀 PASOS PARA APLICAR LA MIGRACIÓN

### 1. Validar Prisma Schema

```bash
cd /home/liones_messi/Documentos/trabajo/Briki
npx prisma validate
```

**Resultado Esperado**: 
```
✔ Prisma schema loaded from prisma/schema.prisma
✔ Prisma schema is valid
```

### 2. Aplicar Migración a Base de Datos

#### Opción A: Usando Supabase CLI (Recomendado para desarrollo local)

```bash
# Si estás usando Supabase localmente
supabase db push

# O aplicar migración específica
supabase migration up
```

#### Opción B: Directamente en PostgreSQL

```bash
# Conectar a tu base de datos
psql $DATABASE_URL

# Ejecutar migración
\i supabase/migrations/20251116_add_policy_analyses_tables.sql

# Salir
\q
```

#### Opción C: Via Supabase Dashboard

1. Ir a: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/sql
2. Copiar contenido de `supabase/migrations/20251116_add_policy_analyses_tables.sql`
3. Pegar en el editor SQL
4. Click en "Run"

### 3. Generar Cliente Prisma

```bash
npx prisma generate
```

**Resultado Esperado**:
```
✔ Generated Prisma Client to ./node_modules/@prisma/client
```

### 4. Verificar Tipos TypeScript

```bash
# Verificar que no hay errores de tipos
npx tsc --noEmit
```

### 5. Ejecutar Tests de Migración

```bash
# Asegurarte de tener las variables de entorno configuradas
# DATABASE_URL debe apuntar a tu base de datos de desarrollo/test

# Ejecutar tests
npm test tests/db/policy-analyses-migrations.test.ts
```

**Resultado Esperado**: ✅ Todos los tests pasan

---

## 🔍 VERIFICACIÓN MANUAL

### Verificar Tablas Creadas

```sql
-- Conectar a la base de datos
psql $DATABASE_URL

-- Verificar policy_analyses
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'policy_analyses'
ORDER BY ordinal_position;

-- Verificar policy_page_references
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

### Verificar Foreign Keys

```sql
-- Ver todas las foreign keys de policy_analyses
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'policy_analyses';
```

### Verificar Índices

```sql
-- Ver índices de policy_analyses
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'policy_analyses';

-- Ver índices de policy_page_references
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'policy_page_references';
```

### Verificar RLS Policies

```sql
-- Ver políticas RLS de policy_analyses
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'policy_analyses';

-- Ver políticas RLS de policy_page_references
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'policy_page_references';
```

### Verificar Check Constraints

```sql
-- Ver check constraints
SELECT
  tc.table_name,
  cc.constraint_name,
  cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc
  ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('policy_analyses', 'policy_page_references');
```

---

## 📊 EJEMPLO DE DATOS

### Estructura de `extracted_data` (JSONB)

```json
{
  "insurer": {
    "name": "AXA Seguros",
    "code": "AXA-MX",
    "contact": {
      "phone": "+52 55 1234 5678",
      "email": "atencion@axa.mx"
    }
  },
  "policy_number": "POL-2025-001234",
  "insured_name": "Juan Pérez García",
  "effective_from": "2025-01-01T00:00:00Z",
  "effective_to": "2025-12-31T23:59:59Z",
  "jurisdiction": "mx",
  "currency": "MXN",
  "financials": {
    "premium_net": 12500.00,
    "taxes": 2000.00,
    "fees": 500.00,
    "premium_total": 15000.00
  },
  "coverages": [
    {
      "name": "Gastos Médicos Mayores",
      "description": "Cobertura de gastos médicos por enfermedad o accidente",
      "limit_amount": 10000000.00,
      "limit_unit": "MXN",
      "deductible_amount": 50000.00,
      "deductible_unit": "MXN",
      "confidence": 0.95
    }
  ],
  "exclusions": [
    {
      "name": "Enfermedades preexistentes",
      "description": "No cubre condiciones médicas previas",
      "confidence": 0.92
    }
  ],
  "deductibles": [
    {
      "type": "general",
      "amount": 50000.00,
      "unit": "MXN",
      "applies_to": "all_coverages"
    }
  ]
}
```

### Estructura de `bounding_box` (JSONB)

```json
{
  "x": 120.5,
  "y": 350.2,
  "width": 200.8,
  "height": 25.4
}
```

---

## ⚠️ VERIFICACIONES CRÍTICAS

Antes de proceder a la Fase 2, asegurar que:

- [ ] ✅ Migración SQL aplicada sin errores
- [ ] ✅ Ambas tablas creadas (`policy_analyses`, `policy_page_references`)
- [ ] ✅ Todas las columnas presentes con tipos correctos
- [ ] ✅ Foreign keys configuradas con CASCADE DELETE
- [ ] ✅ Índices creados (incluyendo GIN en JSONB)
- [ ] ✅ Check constraints funcionando
- [ ] ✅ RLS habilitado en ambas tablas
- [ ] ✅ Políticas RLS configuradas para cada operación (SELECT, INSERT, UPDATE, DELETE)
- [ ] ✅ Prisma schema actualizado
- [ ] ✅ Cliente Prisma generado
- [ ] ✅ TypeScript sin errores de tipos
- [ ] ✅ Tests de migración pasando (opcional pero recomendado)
- [ ] ✅ Relaciones `policyAnalyses` añadidas a modelos `Artifact` y `Case`

---

## 🔄 ROLLBACK (Si es necesario)

Si algo sale mal, ejecutar:

```sql
-- Deshacer migración
DROP TABLE IF EXISTS public.policy_page_references CASCADE;
DROP TABLE IF EXISTS public.policy_analyses CASCADE;
```

Luego revertir cambios en `prisma/schema.prisma`:

```bash
git checkout prisma/schema.prisma
npx prisma generate
```

---

## 📝 NOTAS TÉCNICAS

### Decisiones de Diseño

1. **Uso de JSONB para `extracted_data`**:
   - Permite estructura flexible sin cambios de schema
   - Índice GIN para búsquedas eficientes
   - Compatible con evolución del formato

2. **DECIMAL(3,2) para confidence**:
   - Rango: 0.00 a 9.99 (pero constraint limita a 0-1)
   - Precisión adecuada para porcentajes
   - Evita problemas de redondeo de FLOAT

3. **Cascade Delete**:
   - Si se elimina un `artifact`, se eliminan sus `policy_analyses`
   - Si se elimina un `case`, se eliminan sus `policy_analyses`
   - Si se elimina una `organization`, se eliminan todos sus análisis
   - Si se elimina un `policy_analysis`, se eliminan sus `page_references`

4. **RLS Policies**:
   - Aislamiento estricto por organización
   - Solo admins/owners pueden eliminar
   - Herencia de permisos a través de relaciones

### Rendimiento

- **Índices**: Todas las columnas de consulta frecuente indexadas
- **JSONB GIN**: Permite búsquedas eficientes en datos estructurados
- **Particionamiento**: Considerar si se esperan millones de registros

### Seguridad

- **RLS**: Garantiza que usuarios solo vean datos de su organización
- **Encriptación**: `extracted_data` NO está encriptado (puede contener info sensible)
  - ⚠️ **ADVERTENCIA**: Si los datos de pólizas son PII, considerar encriptar el campo
  - Alternativa: Encriptar a nivel de aplicación antes de guardar

---

## 📚 REFERENCIAS

- **Plan Original**: `docs/PLAN_ANALISIS_POLIZAS_PDF.md`
- **Sección de Diseño**: Sección 6.1 (Arquitectura Propuesta)
- **Sección de Implementación**: Sección 7.2 (Orden de Implementación Detallado)
- **Prisma Docs**: https://www.prisma.io/docs
- **PostgreSQL JSONB**: https://www.postgresql.org/docs/current/datatype-json.html
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security

---

## ✅ ESTADO FINAL

**FASE 1 COMPLETADA**: ✅

**Archivos Modificados**:
1. ✅ `supabase/migrations/20251116_add_policy_analyses_tables.sql` (creado)
2. ✅ `prisma/schema.prisma` (actualizado)
3. ✅ `tests/db/policy-analyses-migrations.test.ts` (creado)
4. ✅ `docs/FASE1_INFRAESTRUCTURA_COMPLETADA.md` (este archivo)

**Próximo Paso**: 
- **FASE 2**: Mejora de Extracción de PDFs (ver `PLAN_ANALISIS_POLIZAS_PDF.md` Sección 7.2, Días 4-6)

**Pendiente de Validación del Usuario**: ⏳
- Ejecutar migraciones
- Ejecutar tests
- Confirmar que todo funciona correctamente
- Aprobar para proceder a Fase 2

---

**Fin del Documento - Fase 1**

