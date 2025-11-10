# RESUMEN EJECUTIVO - FASE 3: IMPLEMENTACIÓN DE POLÍTICAS DE STORAGE CON VALIDACIÓN POR `org_id` EN METADATA

**Fecha de Implementación**: 2 de Febrero, 2025  
**Estado**: ✅ MIGRACIÓN CREADA - PENDIENTE DE EJECUCIÓN  
**Archivo de Migración**: `supabase/migrations/20250202_storage_policies_org_metadata.sql`

---

## 1. ¿CUÁL ES LA UTILIDAD DE LAS IMPLEMENTACIONES SUGERIDAS?

Las políticas de storage con validación por `org_id` en metadata proporcionan:

### 1.1. Aislamiento Multi-Tenant Robusto
- **Seguridad por organización**: Los archivos solo son accesibles por miembros de la organización propietaria
- **Prevención de acceso cruzado**: Usuarios de una organización NO pueden acceder a archivos de otra organización
- **Cumplimiento de requisitos**: Implementa el requisito explícito del Día 2: "Reglas de acceso a buckets por org_id en metadata"

### 1.2. Seguridad Basada en Metadata
- **Validación centralizada**: El `org_id` se valida desde metadata del objeto, no desde el path
- **Resistente a cambios de path**: Si un archivo se mueve o renombra, la validación sigue funcionando
- **Auditoría mejorada**: Metadata incluye `org_id`, `case_id`, `uploaded_by`, `uploaded_at`, etc.

### 1.3. Control Granular de Permisos
- **SELECT/INSERT/UPDATE**: Solo miembros de la organización
- **DELETE**: Solo admins y owners de la organización
- **Archivos temporales**: Mantienen acceso por path para compatibilidad

### 1.4. Trazabilidad y Compliance
- **Metadata estructurada**: Cada archivo tiene información completa de origen
- **Auditoría**: Fácil rastrear quién subió qué archivo y cuándo
- **Cumplimiento normativo**: Mejora la capacidad de cumplir con regulaciones de privacidad de datos

---

## 2. ¿QUÉ OCURRE AHORA MISMO EN MI CÓDIGO SIN CONSIDERAR ESTAS IMPLEMENTACIONES?

### 2.1. Estado Actual de las Políticas

**Problema Crítico**: Las políticas actuales NO validan `org_id` en metadata:

#### Políticas Públicas o Solo con Autenticación
- `public_artifacts_select`: Permite acceso público a TODOS los archivos
- `authenticated_users_can_upload_artifacts`: Cualquier usuario autenticado puede subir archivos
- `authenticated_users_can_update_artifacts`: Cualquier usuario autenticado puede actualizar archivos
- `authenticated_users_can_delete_artifacts`: Cualquier usuario autenticado puede eliminar archivos

**Riesgo**: Cualquier usuario autenticado puede acceder, modificar o eliminar archivos de CUALQUIER organización.

#### Políticas que Validan por Path (No por Metadata)
- `artifacts_org_select`: Valida `org_id` desde el path (`{orgId}/{caseId}/...`)
- `artifacts_org_insert`: Valida `org_id` desde el path
- `artifacts_org_delete`: Valida `org_id` desde el path

**Riesgo**: Si un archivo se mueve o renombra, la validación falla. Además, NO cumple con el requisito del Día 2 de validar por metadata.

### 2.2. Archivos Afectados Actualmente

1. **`supabase/migrations/20250127_fix_storage_buckets_and_policies.sql`**
   - Crea políticas públicas o solo con autenticación
   - NO valida `org_id` en metadata

2. **`supabase/migrations/20251012T120000_storage_artifacts_policies.sql`**
   - Crea políticas que validan por path
   - NO valida `org_id` en metadata

3. **`src/app/api/upload/pdf/route.ts`**
   - NO incluye `org_id` en metadata al subir archivos (esto se corrige en Fase 4)

### 2.3. Comportamiento Actual

```
Usuario de Org A intenta acceder a archivo de Org B
  ↓
Política actual: ¿Usuario autenticado? → SÍ
  ↓
Acceso PERMITIDO ❌ (INCORRECTO)
```

**Problema**: No hay aislamiento multi-tenant real.

---

## 3. ¿DE QUÉ MANERA EL NO TENER ESTAS IMPLEMENTACIONES VULNERABILIZA/DENIGRA MI PROYECTO?

### 3.1. Vulnerabilidades de Seguridad

#### 🔴 CRÍTICO: Violación de Multi-Tenancy
- **Descripción**: Usuarios de una organización pueden acceder a archivos de otra organización
- **Impacto**: ALTO - Violación de privacidad y seguridad de datos
- **Escenario**: Usuario de "Empresa A" puede ver documentos confidenciales de "Empresa B"

#### 🔴 CRÍTICO: Falta de Control de Acceso
- **Descripción**: Cualquier usuario autenticado puede eliminar archivos de cualquier organización
- **Impacto**: ALTO - Pérdida de datos, falta de integridad
- **Escenario**: Usuario malintencionado puede eliminar todos los archivos del sistema

#### 🟡 MEDIO: Falta de Trazabilidad
- **Descripción**: No hay metadata estructurada que permita auditar accesos
- **Impacto**: MEDIO - Dificulta cumplimiento normativo y debugging
- **Escenario**: No se puede rastrear quién accedió a qué archivo y cuándo

### 3.2. Incumplimiento de Requisitos

#### 🔴 CRÍTICO: No Cumple con Día 2
- **Requisito**: "Reglas de acceso a buckets por org_id en metadata"
- **Estado Actual**: Las políticas validan por path, NO por metadata
- **Impacto**: ALTO - El proyecto no cumple con el plan de integración

### 3.3. Problemas de Escalabilidad

#### 🟡 MEDIO: Validación Frágil por Path
- **Descripción**: Si un archivo se mueve o renombra, la validación falla
- **Impacto**: MEDIO - Problemas de mantenimiento y escalabilidad
- **Escenario**: Refactorización de estructura de paths rompe todas las políticas

### 3.4. Problemas de Compliance

#### 🟡 MEDIO: Falta de Auditoría
- **Descripción**: No hay metadata que permita auditar accesos y cambios
- **Impacto**: MEDIO - Dificulta cumplimiento con regulaciones (GDPR, etc.)
- **Escenario**: Auditoría requiere análisis manual de logs, no metadata estructurada

---

## 4. ¿QUÉ HARÁ DIFERENTE MI CÓDIGO DESPUÉS DE ESTAS IMPLEMENTACIONES?

### 4.1. Nuevo Flujo de Acceso

**ANTES** (Políticas Actuales):
```
Usuario intenta acceder a archivo
  ↓
Política: ¿Usuario autenticado? → SÍ
  ↓
Acceso PERMITIDO ❌ (Sin validación de org)
```

**DESPUÉS** (Nuevas Políticas):
```
Usuario intenta acceder a archivo
  ↓
Política: ¿metadata->>'org_id' está en org_members del usuario?
  ↓
SÍ → Acceso PERMITIDO ✅
NO → Acceso DENEGADO (403) ✅
```

### 4.2. Políticas Implementadas

#### Bucket `artifacts`:

1. **`artifacts_org_metadata_select`** (SELECT)
   - Valida `org_id` en metadata
   - O permite acceso a archivos temporales (`temp/{userId}/...`)
   - Solo miembros de la organización pueden ver archivos

2. **`artifacts_org_metadata_insert`** (INSERT)
   - Valida `org_id` en metadata
   - O permite subida a `temp/{userId}/...`
   - Solo miembros de la organización pueden subir archivos

3. **`artifacts_org_metadata_update`** (UPDATE)
   - Valida `org_id` en metadata
   - Solo miembros de la organización pueden actualizar archivos

4. **`artifacts_org_metadata_delete`** (DELETE)
   - Valida `org_id` en metadata
   - Solo admins/owners pueden eliminar archivos de la organización
   - O usuarios pueden eliminar sus archivos temporales

#### Bucket `proposals`:

1. **`proposals_org_metadata_select`** (SELECT)
2. **`proposals_org_metadata_insert`** (INSERT)
3. **`proposals_org_metadata_update`** (UPDATE)
4. **`proposals_org_metadata_delete`** (DELETE)

Todas validan `org_id` en metadata y solo permiten acceso a miembros de la organización.

### 4.3. Compatibilidad con Archivos Temporales

Las políticas mantienen compatibilidad con archivos temporales:
- Path: `temp/{userId}/...`
- Acceso: Por path, sin requerir metadata
- Razón: No romper funcionalidades existentes de upload temporal

### 4.4. Estructura de Metadata (Después de Fase 4)

Cuando se implemente Fase 4, los archivos tendrán metadata estructurada:
```json
{
  "org_id": "uuid-de-organizacion",
  "case_id": "uuid-de-caso",
  "uploaded_by": "uuid-de-usuario",
  "file_name": "documento.pdf",
  "content_type": "application/pdf",
  "uploaded_at": "2025-02-02T12:00:00Z"
}
```

---

## 5. ¿DE QUÉ MANERA SE PRETENDEN IMPLEMENTAR, CON INDICENCIA EN QUÉ ARCHIVOS?

### 5.1. Archivo de Migración Creado

**Archivo**: `supabase/migrations/20250202_storage_policies_org_metadata.sql`

**Contenido**:
1. **Paso 1**: Eliminar políticas antiguas que no validan `org_id` en metadata
2. **Paso 2**: Crear políticas para bucket `artifacts` con validación por metadata
3. **Paso 3**: Crear políticas para bucket `proposals` con validación por metadata
4. **Paso 4**: Añadir comentarios de documentación

### 5.2. Políticas Eliminadas

Las siguientes políticas se eliminan (si existen):
- `public_artifacts_select`
- `authenticated_users_can_upload_artifacts`
- `authenticated_users_can_update_artifacts`
- `authenticated_users_can_delete_artifacts`
- `public_proposals_select`
- `authenticated_users_can_upload_proposals`
- `authenticated_users_can_update_proposals`
- `authenticated_users_can_delete_proposals`
- `public_temp_select`
- `authenticated_users_can_upload_temp`
- `authenticated_users_can_delete_temp`
- `org_members_can_upload_artifacts`
- `org_members_can_view_artifacts`
- `org_members_can_update_artifacts`
- `org_admins_can_delete_artifacts`
- `artifacts_temp_insert`
- `artifacts_temp_select`
- `artifacts_temp_delete`
- `artifacts_org_insert`
- `artifacts_org_select`
- `artifacts_org_delete`

### 5.3. Políticas Creadas

#### Bucket `artifacts`:
- `artifacts_org_metadata_select`
- `artifacts_org_metadata_insert`
- `artifacts_org_metadata_update`
- `artifacts_org_metadata_delete`

#### Bucket `proposals`:
- `proposals_org_metadata_select`
- `proposals_org_metadata_insert`
- `proposals_org_metadata_update`
- `proposals_org_metadata_delete`

### 5.4. Estructura de las Políticas

**Ejemplo de política SELECT**:
```sql
CREATE POLICY "artifacts_org_metadata_select" 
ON storage.objects FOR SELECT 
USING (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated' AND
    (
        -- Validar org_id en metadata
        (metadata->>'org_id')::uuid IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid()
        )
        OR
        -- Permitir acceso a archivos temporales del usuario
        (split_part(name, '/', 1) = 'temp' AND split_part(name, '/', 2) = auth.uid()::text)
    )
);
```

**Características**:
- Valida `org_id` desde metadata del objeto
- Usa subquery para verificar membresía en `org_members`
- Mantiene compatibilidad con archivos temporales por path
- Solo usuarios autenticados pueden acceder

### 5.5. Dependencias

**Tablas requeridas**:
- `public.org_members` (debe existir con índices en `org_id` y `user_id`)
- `storage.objects` (tabla de Supabase Storage)

**Funciones requeridas**:
- `auth.uid()` (función de Supabase Auth)
- `auth.role()` (función de Supabase Auth)

---

## 6. ¿CUÁL ES EL RIESGO QUE SE CORRE DE ROMPER OTROS COMPONENTES Y FUNCIONALIDADES CON ESTA IMPLEMENTACIÓN?

### 6.1. Riesgo 1: Archivos Existentes Sin `org_id` en Metadata

**Probabilidad**: 🔴 ALTA  
**Impacto**: 🔴 ALTO  
**Severidad**: 🔴 CRÍTICO

**Descripción**:
- Los archivos subidos ANTES de aplicar Fase 4 no tendrán `org_id` en metadata
- Después de aplicar esta migración, estos archivos NO serán accesibles
- Las políticas requieren `org_id` en metadata para permitir acceso

**Mitigación**:
1. **Aplicar Fase 4 ANTES de Fase 3** (recomendado):
   - Actualizar código de subida para incluir `org_id` en metadata
   - Los archivos nuevos tendrán metadata desde el inicio
   - Los archivos existentes pueden migrarse después (opcional)

2. **Aplicar ambas fases en el mismo deployment**:
   - Fase 4: Actualizar código de subida
   - Fase 3: Aplicar políticas
   - Minimiza ventana de incompatibilidad

3. **Script de migración de metadata** (opcional, Paso 4.4 del plan):
   - Actualizar metadata de archivos existentes
   - Extraer `org_id` del path del archivo
   - Añadir `org_id` a metadata

**Acción Requerida**:
- ⚠️ **CRÍTICO**: Aplicar Fase 4 antes de Fase 3, o aplicar ambas en el mismo deployment
- ⚠️ **RECOMENDADO**: Ejecutar script de migración de metadata para archivos existentes

### 6.2. Riesgo 2: Archivos Temporales

**Probabilidad**: 🟢 BAJA  
**Impacto**: 🟢 BAJO  
**Severidad**: 🟢 BAJO

**Descripción**:
- Los archivos temporales (`temp/{userId}/...`) no tienen `org_id` en metadata
- Las políticas incluyen compatibilidad por path para archivos temporales

**Mitigación**:
- ✅ Las políticas incluyen cláusula OR para archivos temporales:
  ```sql
  OR (split_part(name, '/', 1) = 'temp' AND split_part(name, '/', 2) = auth.uid()::text)
  ```
- ✅ Los archivos temporales siguen siendo accesibles por path
- ✅ No se rompe funcionalidad existente de upload temporal

**Acción Requerida**:
- ✅ Ninguna - Las políticas ya incluyen compatibilidad

### 6.3. Riesgo 3: Performance de Validación

**Probabilidad**: 🟡 MEDIA  
**Impacto**: 🟢 BAJO  
**Severidad**: 🟡 MEDIO

**Descripción**:
- Validación de metadata requiere subquery a `org_members`
- Podría ser más lento que validación por path

**Mitigación**:
- ✅ Índices existentes en `org_members`:
  - `idx_org_members_org_id` (índice en `org_id`)
  - `idx_org_members_user_id` (índice en `user_id`)
- ✅ Validación de metadata es eficiente en PostgreSQL
- ✅ Subquery usa índices para optimización

**Acción Requerida**:
- ✅ Ninguna - Los índices ya existen
- ⚠️ **MONITOREO**: Verificar performance después de aplicar migración

### 6.4. Riesgo 4: Políticas Conflictivas

**Probabilidad**: 🟢 BAJA  
**Impacto**: 🟡 MEDIO  
**Severidad**: 🟡 MEDIO

**Descripción**:
- Si hay políticas antiguas activas, podrían causar conflictos
- Múltiples políticas para el mismo bucket pueden causar comportamiento inesperado

**Mitigación**:
- ✅ La migración elimina TODAS las políticas antiguas antes de crear las nuevas
- ✅ Usa `DROP POLICY IF EXISTS` para evitar errores si la política no existe
- ✅ Orden de ejecución garantizado: DROP primero, CREATE después

**Acción Requerida**:
- ✅ Ninguna - La migración maneja esto automáticamente

### 6.5. Riesgo 5: Usuarios Sin Membresía

**Probabilidad**: 🟢 BAJA  
**Impacto**: 🟡 MEDIO  
**Severidad**: 🟡 MEDIO

**Descripción**:
- Usuarios sin membresía en ninguna organización no podrán acceder a archivos
- Esto es comportamiento esperado, pero podría romper funcionalidades si hay usuarios sin org

**Mitigación**:
- ✅ Validar que todos los usuarios tengan membresía antes de aplicar migración
- ✅ Crear organización personal para usuarios sin org (si aplica)

**Acción Requerida**:
- ⚠️ **VERIFICAR**: Asegurar que todos los usuarios tienen membresía en al menos una organización

---

## 7. GUÍA DE TESTING DESDE LA APLICACIÓN

### 7.1. Prerequisitos

1. ✅ **Aplicar la migración**:
   - Opción 1: Supabase Dashboard → SQL Editor → Ejecutar migración
   - Opción 2: CLI de Supabase → `supabase db push`

2. ✅ **Tener al menos 2 organizaciones**:
   - Org A: Con usuario `userA@example.com`
   - Org B: Con usuario `userB@example.com`

3. ✅ **Tener casos y archivos existentes** (opcional, para probar compatibilidad)

4. ⚠️ **Aplicar Fase 4** (recomendado antes de testing):
   - Actualizar código de subida para incluir `org_id` en metadata
   - Los archivos nuevos tendrán metadata desde el inicio

### 7.2. Prueba 1: Subir Archivo con `org_id` en Metadata (Requiere Fase 4)

**Objetivo**: Verificar que los archivos nuevos con `org_id` en metadata son accesibles.

**Pasos**:
1. Iniciar sesión como `userA@example.com` (miembro de Org A)
2. Navegar a `/agent/new-thread-placeholder`
3. Crear un caso nuevo
4. Subir un PDF al caso (usando el formulario de "Documentos Adjuntos")
5. Verificar en la consola del navegador (DevTools → Network):
   - Buscar request a `/api/upload/pdf`
   - Verificar que el request incluye `org_id` en metadata (después de Fase 4)
6. Verificar que el PDF se muestra correctamente en el caso
7. Verificar en Supabase Dashboard → Storage → artifacts:
   - Abrir el archivo subido
   - Verificar que el metadata incluye `org_id` con el UUID de Org A

**Resultado Esperado**:
- ✅ El archivo se sube exitosamente
- ✅ El archivo es accesible solo para miembros de Org A
- ✅ El archivo tiene `org_id` en metadata (después de Fase 4)
- ✅ El PDF se muestra correctamente en el caso

**Cómo Verificar en Código**:
```typescript
// En DevTools Console, después de subir archivo:
// Verificar que el request incluye metadata
fetch('/api/upload/pdf', { ... })
  .then(r => r.json())
  .then(data => console.log('Metadata:', data.metadata))
```

### 7.3. Prueba 2: Intentar Acceder a Archivo de Otra Organización

**Objetivo**: Verificar que el aislamiento multi-tenant funciona correctamente.

**Pasos**:
1. Iniciar sesión como `userA@example.com` (miembro de Org A)
2. Subir un PDF a un caso de Org A
3. Obtener la URL del archivo (desde la BD o logs):
   ```sql
   SELECT name, metadata FROM storage.objects 
   WHERE bucket_id = 'artifacts' 
   AND metadata->>'org_id' = 'uuid-de-org-a';
   ```
4. Cerrar sesión
5. Iniciar sesión como `userB@example.com` (miembro de Org B, NO de Org A)
6. Intentar acceder a la URL del archivo de Org A:
   - Abrir la URL en el navegador
   - O hacer fetch desde la aplicación
7. Verificar en la consola del navegador la respuesta

**Resultado Esperado**:
- ❌ Acceso denegado (403 Forbidden o similar)
- ❌ El archivo NO se muestra
- ✅ Mensaje de error claro en consola

**Cómo Verificar**:
```javascript
// En DevTools Console:
fetch('https://your-project.supabase.co/storage/v1/object/public/artifacts/path-to-file')
  .then(r => {
    console.log('Status:', r.status); // Debe ser 403
    return r.text();
  })
  .then(text => console.log('Response:', text));
```

### 7.4. Prueba 3: Subir Archivo Temporal

**Objetivo**: Verificar que los archivos temporales siguen siendo accesibles.

**Pasos**:
1. Iniciar sesión como usuario autenticado
2. Subir un PDF temporal (sin `caseId`, desde LandingPage o formulario)
3. Verificar que el archivo se sube a `temp/{userId}/...`
4. Verificar que el archivo es accesible:
   - Abrir la URL del archivo en el navegador
   - O verificar que se muestra en el formulario

**Resultado Esperado**:
- ✅ El archivo se sube exitosamente a `temp/{userId}/...`
- ✅ El archivo es accesible por el usuario que lo subió
- ✅ Las políticas permiten acceso por path temporal

**Cómo Verificar**:
```sql
-- En Supabase SQL Editor:
SELECT name, metadata FROM storage.objects 
WHERE bucket_id = 'artifacts' 
AND name LIKE 'temp/%';
-- Debe mostrar archivos temporales sin org_id en metadata
```

### 7.5. Prueba 4: Eliminar Archivo (Solo Admins/Owners)

**Objetivo**: Verificar que solo admins/owners pueden eliminar archivos.

**Pasos**:
1. Iniciar sesión como usuario con rol `member` de Org A
2. Subir un PDF a un caso de Org A
3. Intentar eliminar el archivo (desde la UI o API)
4. Verificar en la consola del navegador la respuesta
5. Cambiar el rol del usuario a `admin` o `owner` en la BD:
   ```sql
   UPDATE public.org_members 
   SET role = 'admin' 
   WHERE user_id = 'uuid-del-usuario' AND org_id = 'uuid-de-org-a';
   ```
6. Recargar la sesión (cerrar y abrir sesión)
7. Intentar eliminar el mismo archivo
8. Verificar que se elimina exitosamente

**Resultado Esperado**:
- ❌ Usuario `member`: Acceso denegado (403) al intentar eliminar
- ✅ Usuario `admin`/`owner`: Archivo eliminado exitosamente

**Cómo Verificar**:
```javascript
// En DevTools Console, como member:
fetch('/api/storage/delete', {
  method: 'DELETE',
  body: JSON.stringify({ path: 'path-to-file' })
})
  .then(r => {
    console.log('Status:', r.status); // Debe ser 403 para member
    return r.json();
  })
  .then(data => console.log('Response:', data));
```

### 7.6. Prueba 5: Verificar Políticas en Supabase Dashboard

**Objetivo**: Verificar que las políticas están activas y correctas.

**Pasos**:
1. Abrir Supabase Dashboard
2. Ir a **Storage** → **Policies**
3. Verificar que las políticas antiguas NO existen:
   - `public_artifacts_select` ❌
   - `authenticated_users_can_upload_artifacts` ❌
   - `artifacts_org_select` ❌ (si existía)
4. Verificar que las nuevas políticas SÍ existen:
   - `artifacts_org_metadata_select` ✅
   - `artifacts_org_metadata_insert` ✅
   - `artifacts_org_metadata_update` ✅
   - `artifacts_org_metadata_delete` ✅
   - `proposals_org_metadata_select` ✅
   - `proposals_org_metadata_insert` ✅
   - `proposals_org_metadata_update` ✅
   - `proposals_org_metadata_delete` ✅
5. Verificar que las políticas están activas (no deshabilitadas)

**Resultado Esperado**:
- ✅ Las políticas antiguas no existen
- ✅ Las nuevas políticas existen y están activas
- ✅ Las políticas tienen los comentarios de documentación

### 7.7. Prueba 6: Verificar Metadata de Archivos (Después de Fase 4)

**Objetivo**: Verificar que los archivos nuevos tienen `org_id` en metadata.

**Pasos**:
1. Aplicar Fase 4 (actualizar código de subida)
2. Subir un archivo nuevo (después de aplicar Fase 4)
3. En Supabase Dashboard, ir a **Storage** → **artifacts**
4. Abrir el archivo subido
5. Verificar que el metadata incluye:
   - `org_id`: UUID de la organización (debe ser válido)
   - `case_id`: UUID del caso (si aplica)
   - `uploaded_by`: UUID del usuario
   - `file_name`: Nombre del archivo
   - `content_type`: Tipo MIME (ej: "application/pdf")
   - `uploaded_at`: Timestamp ISO

**Resultado Esperado**:
- ✅ El metadata incluye todos los campos mencionados
- ✅ `org_id` es un UUID válido de una organización donde el usuario es miembro
- ✅ `uploaded_by` es el UUID del usuario que subió el archivo

**Cómo Verificar**:
```sql
-- En Supabase SQL Editor:
SELECT 
    name,
    metadata->>'org_id' as org_id,
    metadata->>'case_id' as case_id,
    metadata->>'uploaded_by' as uploaded_by,
    metadata->>'file_name' as file_name,
    metadata->>'content_type' as content_type,
    metadata->>'uploaded_at' as uploaded_at
FROM storage.objects 
WHERE bucket_id = 'artifacts' 
AND name NOT LIKE 'temp/%'
ORDER BY created_at DESC 
LIMIT 10;
```

### 7.8. Prueba 7: Verificar Performance

**Objetivo**: Verificar que las políticas no afectan significativamente el performance.

**Pasos**:
1. Subir 10 archivos nuevos
2. Medir tiempo de subida (antes y después de aplicar migración)
3. Medir tiempo de acceso (antes y después de aplicar migración)
4. Verificar en Supabase Dashboard → Database → Query Performance:
   - Buscar queries relacionadas con `org_members`
   - Verificar que usan índices

**Resultado Esperado**:
- ✅ Tiempo de subida similar (diferencia < 100ms)
- ✅ Tiempo de acceso similar (diferencia < 50ms)
- ✅ Queries usan índices en `org_members`

---

## 8. NOTAS IMPORTANTES

### 8.1. Orden de Ejecución Recomendado

1. **Fase 4 PRIMERO** (actualizar código de subida):
   - Actualizar `src/app/api/upload/pdf/route.ts` para incluir `org_id` en metadata
   - Los archivos nuevos tendrán metadata desde el inicio

2. **Fase 3 DESPUÉS** (aplicar políticas):
   - Aplicar migración `20250202_storage_policies_org_metadata.sql`
   - Las políticas funcionarán correctamente con archivos nuevos

3. **Script de Migración de Metadata** (opcional):
   - Actualizar metadata de archivos existentes
   - Solo necesario si hay archivos sin metadata

### 8.2. Archivos Existentes Sin Metadata

⚠️ **ADVERTENCIA**: Los archivos subidos ANTES de aplicar Fase 4 no tendrán `org_id` en metadata y NO serán accesibles después de aplicar esta migración.

**Solución**:
- Aplicar Fase 4 antes de Fase 3 (recomendado)
- O ejecutar script de migración de metadata para archivos existentes

### 8.3. Compatibilidad con Archivos Temporales

✅ Las políticas mantienen compatibilidad con archivos temporales (`temp/{userId}/...`) para no romper funcionalidades existentes.

### 8.4. Performance

✅ Las políticas usan índices existentes en `org_members`, por lo que el performance debería ser aceptable. Monitorear después de aplicar migración.

---

## 9. CONCLUSIÓN

La **FASE 3** está completamente implementada. La migración crea políticas de storage que validan `org_id` en metadata, cumpliendo con el requisito explícito del Día 2.

**Estado**: ✅ MIGRACIÓN CREADA - LISTA PARA EJECUTAR

**Próximos Pasos**:
1. Ejecutar la migración (Supabase Dashboard o CLI)
2. Aplicar Fase 4 (actualizar código de subida)
3. Ejecutar pruebas de validación
4. Monitorear performance y accesos

---

**Última actualización**: 2 de Febrero, 2025  
**Autor**: Developer FullStack Senior  
**Revisión**: Pendiente de validación humana

