# 📊 ANÁLISIS EXHAUSTIVO: POLÍTICAS RLS DUPLICADAS

**Fecha**: 2025-01-08  
**Prioridad**: ALTA  
**Objetivo**: Identificar y consolidar políticas RLS duplicadas en `cases` y `artifacts`

---

## 🎯 PROBLEMA IDENTIFICADO

Existen **políticas RLS duplicadas** para las tablas `cases` y `artifacts` creadas en diferentes migraciones, lo que puede causar:
- Conflictos al ejecutar migraciones
- Comportamiento impredecible (múltiples políticas para la misma operación)
- Dificultad para mantener y depurar
- Posibles problemas de performance

---

## 1️⃣ ANÁLISIS DE MIGRACIONES

### **Migración 1: `20250107_complete_rls_implementation.sql`**

**Fecha**: 2025-10-11  
**Estado**: ⚠️ PROBLEMÁTICA - Crea políticas y luego las reemplaza

#### Políticas creadas para `cases`:
1. `org_members_can_view_cases` (SELECT)
2. `org_members_can_insert_cases` (INSERT)
3. `org_members_can_update_cases` (UPDATE)
4. `org_admins_can_delete_cases` (DELETE)

**Lógica inicial** (líneas 25-55):
```sql
USING (org_id IN (
    SELECT org_id FROM public.org_members 
    WHERE user_id = auth.uid()
))
```

**Luego reemplazadas** (líneas 173-191) con versiones que usan funciones helper:
```sql
USING (public.is_org_member(org_id))
```

**Problema**: Esta migración **elimina y recrea** las políticas, pero si otra migración crea políticas con nombres diferentes después, habrá duplicados.

---

#### Políticas creadas para `artifacts`:
1. `org_members_can_view_artifacts` (SELECT)
2. `org_members_can_insert_artifacts` (INSERT)
3. `org_members_can_update_artifacts` (UPDATE)
4. `org_admins_can_delete_artifacts` (DELETE)

**Lógica** (líneas 62-92):
```sql
USING (org_id IN (
    SELECT org_id FROM public.org_members 
    WHERE user_id = auth.uid()
))
```

**⚠️ PROBLEMA CRÍTICO**: Esta política asume que `artifacts` tiene columna `org_id`, pero según el schema de Prisma, **NO existe**. Los artifacts solo tienen `case_id` y se relacionan con `cases` a través de una foreign key.

**Conclusión**: Estas políticas para `artifacts` **NO FUNCIONAN** porque `artifacts.org_id` no existe.

---

### **Migración 2: `20251026_add_rls_to_cases.sql`**

**Fecha**: 2025-10-26  
**Estado**: ✅ CORRECTA - Usa subconsultas directas

#### Políticas creadas para `cases`:
1. `cases_org_isolation_select` (SELECT)
2. `cases_org_isolation_insert` (INSERT)
3. `cases_org_isolation_update` (UPDATE)
4. `cases_org_isolation_delete` (DELETE)

**Lógica**:
```sql
USING (
    org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
    )
)
```

**Evaluación**: ✅ Correcta - Usa subconsultas directas, más explícita y fácil de entender.

---

### **Migración 3: `20251026_add_rls_to_artifacts.sql`**

**Fecha**: 2025-10-26  
**Estado**: ✅ CORRECTA - Verifica a través de `cases`

#### Políticas creadas para `artifacts`:
1. `artifacts_org_isolation_select` (SELECT)
2. `artifacts_org_isolation_insert` (INSERT)
3. `artifacts_org_isolation_update` (UPDATE)
4. `artifacts_org_isolation_delete` (DELETE)

**Lógica**:
```sql
USING (
    case_id IN (
        SELECT id FROM public.cases
        WHERE org_id IN (
            SELECT org_id FROM public.org_members
            WHERE user_id = auth.uid()
        )
    )
)
```

**Evaluación**: ✅ Correcta - Verifica a través de `cases`, que es la relación correcta.

---

## 2️⃣ COMPARACIÓN DE POLÍTICAS

### **Tabla: `cases`**

| Operación | Migración 1 (20250107) | Migración 2 (20251026) | Estado |
|-----------|------------------------|------------------------|--------|
| SELECT | `org_members_can_view_cases` (usa `is_org_member()`) | `cases_org_isolation_select` (subconsulta directa) | ⚠️ DUPLICADAS |
| INSERT | `org_members_can_insert_cases` (usa `is_org_member()`) | `cases_org_isolation_insert` (subconsulta directa) | ⚠️ DUPLICADAS |
| UPDATE | `org_members_can_update_cases` (usa `is_org_member()`) | `cases_org_isolation_update` (subconsulta directa) | ⚠️ DUPLICADAS |
| DELETE | `org_admins_can_delete_cases` (usa `is_org_admin()`) | `cases_org_isolation_delete` (subconsulta directa) | ⚠️ DUPLICADAS |

**Problema**: Ambas migraciones crean políticas para las mismas operaciones. PostgreSQL permite múltiples políticas permisivas (se combinan con OR), pero esto es confuso y puede causar problemas de mantenimiento.

---

### **Tabla: `artifacts`**

| Operación | Migración 1 (20250107) | Migración 3 (20251026) | Estado |
|-----------|------------------------|------------------------|--------|
| SELECT | `org_members_can_view_artifacts` (❌ usa `org_id` que NO existe) | `artifacts_org_isolation_select` (✅ verifica a través de `cases`) | ⚠️ DUPLICADAS + ERROR |
| INSERT | `org_members_can_insert_artifacts` (❌ usa `org_id` que NO existe) | `artifacts_org_isolation_insert` (✅ verifica a través de `cases`) | ⚠️ DUPLICADAS + ERROR |
| UPDATE | `org_members_can_update_artifacts` (❌ usa `org_id` que NO existe) | `artifacts_org_isolation_update` (✅ verifica a través de `cases`) | ⚠️ DUPLICADAS + ERROR |
| DELETE | `org_admins_can_delete_artifacts` (❌ usa `org_id` que NO existe) | `artifacts_org_isolation_delete` (✅ verifica a través de `cases`) | ⚠️ DUPLICADAS + ERROR |

**Problema CRÍTICO**: Las políticas de la migración 1 **NO FUNCIONAN** porque `artifacts.org_id` no existe. Solo las políticas de la migración 3 son correctas.

---

## 3️⃣ ANÁLISIS DE CÓDIGO RELACIONADO

### **Archivos que usan `cases`**:

1. **`src/lib/database.ts`**:
   - `getCasesByOrg(orgId)`: Usa `prisma.case.findMany({ where: { orgId } })`
   - `getCaseById(caseId, orgId)`: Usa `prisma.case.findFirst({ where: { id: caseId, orgId } })`
   - `createCaseWithOrg(...)`: Usa `prisma.case.create({ data: { orgId, ... } })`
   - `updateCaseById(...)`: Usa `prisma.case.update({ where: { id: caseId }, data: ... })`
   - `deleteCaseById(...)`: Usa `prisma.case.delete({ where: { id: caseId } })`

   **Evaluación**: ✅ El código siempre incluye `orgId` en las consultas, lo que es compatible con RLS.

2. **`src/app/api/cases/create/route.ts`**:
   - Crea casos con `orgId` explícito
   - Verifica membresía antes de crear

   **Evaluación**: ✅ Correcto

3. **`src/app/api/cases/[id]/route.ts`**:
   - Usa `prisma.case.findUnique({ where: { id: caseId, orgId: currentOrg.id } })`

   **Evaluación**: ✅ Correcto - Verifica `orgId` a nivel de aplicación

4. **`src/app/api/cases/delete/route.ts`**:
   - Verifica `orgId` antes de eliminar
   - Usa `prisma.case.delete({ where: { id: caseId } })`

   **Evaluación**: ✅ Correcto - RLS protege, pero también verifica a nivel de aplicación

---

### **Archivos que usan `artifacts`**:

1. **`src/lib/database.ts`**:
   - `createArtifact(...)`: Usa `prisma.artifact.create({ data: { caseId, ... } })`

   **Evaluación**: ✅ Correcto - Solo necesita `caseId`

2. **`src/app/api/cases/create/route.ts`**:
   - Crea artifacts con `caseId` después de crear el case

   **Evaluación**: ✅ Correcto

3. **`src/app/api/cases/update/route.ts`**:
   - Crea artifacts con `caseId`

   **Evaluación**: ✅ Correcto

4. **`src/app/api/upload/pdf/route.ts`**:
   - Crea artifacts con `caseId`

   **Evaluación**: ✅ Correcto

**Conclusión del análisis de código**: ✅ El código está bien estructurado y no se verá afectado por la consolidación de políticas RLS.

---

## 4️⃣ PROBLEMAS ESPECÍFICOS IDENTIFICADOS

### 🔴 **CRÍTICO: Políticas de artifacts en migración 1 NO funcionan**

**Problema**: Las políticas en `20250107_complete_rls_implementation.sql` para `artifacts` usan `org_id`, pero esta columna **NO EXISTE** en la tabla `artifacts`.

**Evidencia**:
- Schema Prisma: `Artifact` solo tiene `caseId`, no `orgId`
- Las políticas intentan usar `artifacts.org_id IN (...)`, lo cual fallará

**Impacto**: 
- Las políticas de la migración 1 para `artifacts` **NO SE APLICAN** (error silencioso)
- Solo las políticas de la migración 3 funcionan

---

### 🟡 **MEDIO: Políticas duplicadas en cases**

**Problema**: Hay dos conjuntos de políticas para `cases`:
- Migración 1: `org_members_can_*` (usa funciones helper)
- Migración 2: `cases_org_isolation_*` (usa subconsultas directas)

**Impacto**:
- Ambas políticas están activas (PostgreSQL combina con OR)
- Confusión al mantener
- Posible degradación de performance (múltiples evaluaciones)

---

### 🟡 **MEDIO: Funciones helper no se usan consistentemente**

**Problema**: La migración 1 crea funciones helper (`is_org_member()`, `is_org_admin()`), pero:
- Solo se usan en las políticas de `cases` (después de reemplazarlas)
- No se usan en las políticas de `artifacts` (que además no funcionan)
- Las migraciones 2 y 3 no usan estas funciones

**Impacto**:
- Inconsistencia en el código
- Funciones helper creadas pero no utilizadas completamente

---

## 5️⃣ PLAN DE CONSOLIDACIÓN

### **Objetivo**: Eliminar políticas duplicadas y mantener solo las correctas

### **Estrategia**:

1. **Para `cases`**: Mantener políticas de migración 2 (`cases_org_isolation_*`)
   - ✅ Más explícitas y fáciles de entender
   - ✅ No dependen de funciones helper
   - ✅ Consistente con el patrón de otras tablas

2. **Para `artifacts`**: Mantener políticas de migración 3 (`artifacts_org_isolation_*`)
   - ✅ Únicas que funcionan correctamente
   - ✅ Verifican a través de `cases` (relación correcta)

3. **Eliminar**: Políticas de migración 1
   - ❌ Políticas de `cases` duplicadas
   - ❌ Políticas de `artifacts` que no funcionan

4. **Opcional**: Mantener funciones helper si se planean usar en el futuro, o eliminarlas si no se usan

---

## 6️⃣ MIGRACIÓN DE CONSOLIDACIÓN

### **Archivo**: `supabase/migrations/20250108_consolidate_rls_policies.sql`

**Contenido**:

1. **Eliminar políticas duplicadas de `cases`**:
   - `org_members_can_view_cases`
   - `org_members_can_insert_cases`
   - `org_members_can_update_cases`
   - `org_admins_can_delete_cases`

2. **Eliminar políticas incorrectas de `artifacts`**:
   - `org_members_can_view_artifacts`
   - `org_members_can_insert_artifacts`
   - `org_members_can_update_artifacts`
   - `org_admins_can_delete_artifacts`

3. **Verificar que las políticas correctas existen**:
   - `cases_org_isolation_*` (4 políticas)
   - `artifacts_org_isolation_*` (4 políticas)

4. **Opcional**: Eliminar funciones helper si no se usan en otras partes

---

## 7️⃣ ANÁLISIS DE COMPATIBILIDAD

### ✅ **Código NO se verá afectado**

**Razón**: 
- El código siempre incluye `orgId` en consultas de `cases`
- El código siempre incluye `caseId` en consultas de `artifacts`
- RLS actúa como capa adicional de seguridad
- Las políticas correctas tienen la misma lógica que las duplicadas

**Resultado**: 
- ✅ Funcionalidades existentes siguen funcionando
- ✅ Seguridad mejorada (sin políticas incorrectas)
- ✅ Código más limpio y mantenible

---

## 8️⃣ VERIFICACIÓN POST-CONSOLIDACIÓN

### **Script de verificación**: `scripts/verify-rls-consolidation.sql`

**Verifica**:
1. Solo existen políticas correctas (8 total: 4 para cases + 4 para artifacts)
2. No existen políticas duplicadas
3. RLS está habilitado en ambas tablas
4. Las políticas tienen la lógica correcta

---

## 9️⃣ RESUMEN EJECUTIVO

### ✅ **Lo que está bien**:
- Políticas de migración 2 para `cases`: ✅ Correctas
- Políticas de migración 3 para `artifacts`: ✅ Correctas
- Código de aplicación: ✅ Compatible

### ❌ **Lo que está mal**:
- Políticas de migración 1 para `cases`: ⚠️ Duplicadas
- Políticas de migración 1 para `artifacts`: ❌ No funcionan (usan `org_id` que no existe)

### 🎯 **Acción requerida**:
1. Crear migración de consolidación
2. Eliminar políticas duplicadas e incorrectas
3. Verificar que solo quedan las políticas correctas
4. Probar funcionalidades existentes

---

**Última actualización**: 2025-01-08  
**Estado**: Listo para implementación de consolidación

