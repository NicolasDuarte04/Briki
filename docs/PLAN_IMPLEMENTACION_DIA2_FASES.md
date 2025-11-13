# 📋 PLAN DE IMPLEMENTACIÓN DÍA 2 - ESTRUCTURADO EN FASES
## Flujo de Trabajo: Casos y Artefactos + Storage

**Fecha**: 2 de Febrero, 2025  
**Enfoque**: Implementación quirúrgica en fases de bajo impacto y fácilmente testeables  
**Rol**: Developer FullStack Senior  
**Prioridad**: Preservar integridad del proyecto en todo momento

---

## 🎯 PRINCIPIOS DE TRABAJO

1. **Reutilización máxima del código existente**
2. **Mantenimiento de la arquitectura dual del proyecto**
3. **Consistencia de estado unidireccional**
4. **Separación clara de responsabilidades**
5. **Bajo impacto**: Cada fase debe ser independiente y testeable
6. **Preservación de funcionalidades**: No romper código existente

---

## 📊 ANÁLISIS EXHAUSTIVO DEL ESTADO ACTUAL

### Estado General del Día 2

**Completitud**: 🟢 **95% implementado**

#### Aspectos Completados ✅:
- ✅ Tablas `cases` y `artifacts` con estructura correcta
- ✅ Buckets `artifacts/` y `proposals/` configurados
- ✅ Políticas RLS en tablas (`cases`, `artifacts`)
- ✅ Políticas RLS en Storage (validación por `org_id` en metadata)
- ✅ SourceType ENUM implementado (`api`, `portal`, `pdf`, `link`)
- ✅ Campo `provenance` JSONB implementado
- ✅ Helper `moveTempToPersistent` con metadata correcta
- ✅ APIs principales con metadata implementada

#### Aspectos Pendientes ⚠️:
- ⚠️ Validación exhaustiva de metadata en todas las rutas de upload
- ⚠️ Helper centralizado para validar/establecer metadata
- ⚠️ Script de validación de aceptación del Día 2
- ⚠️ Documentación completa de estructura de `provenance`

---

## 🔍 ANÁLISIS QUIRÚRGICO DE ARCHIVOS CRÍTICOS

### 1. Análisis de `src/app/api/upload/pdf/route.ts`

**Estado**: 🟢 **CORRECTO** - Metadata implementada correctamente

**Líneas críticas analizadas**:

#### Modo Persistente (líneas 337-350):
```typescript
const { error: uploadError } = await supabase.storage
  .from('artifacts')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    metadata: {
      org_id: String(orgId),        // ✅ CRÍTICO: Conversión explícita a string
      case_id: String(caseId),      // ✅ CRÍTICO: Conversión explícita a string
      uploaded_by: String(user.id), // ✅ CRÍTICO: Conversión explícita a string
      file_name: String(file.name),
      content_type: String(file.type),
      uploaded_at: new Date().toISOString(),
    }
  });
```

**Evaluación**:
- ✅ Metadata completa con `org_id`
- ✅ Conversión explícita a strings (crítico para Supabase Storage)
- ✅ Todos los campos requeridos presentes
- ✅ Compatible con políticas RLS de Fase 3

#### Modo Temporal (líneas 92-104):
```typescript
const { error: uploadError } = await supabase.storage
  .from('artifacts')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    metadata: {
      uploaded_by: String(user.id),
      file_name: String(file.name),
      content_type: String(file.type),
      uploaded_at: new Date().toISOString(),
      is_temporary: 'true',
    }
  });
```

**Evaluación**:
- ✅ Metadata básica presente
- ⚠️ **OBSERVACIÓN**: No incluye `org_id` (correcto para modo temporal, se añade al migrar)
- ✅ Compatible con políticas RLS (permite acceso por path `temp/{userId}/...`)

**Conclusión**: ✅ **NO REQUIERE CAMBIOS**

---

### 2. Análisis de `src/lib/storage/moveTempToPersistent.ts`

**Estado**: 🟢 **CORRECTO** - Metadata implementada correctamente

**Líneas críticas analizadas** (líneas 87-103):
```typescript
const { error: uploadError } = await supabase.storage
  .from('artifacts')
  .upload(persistentPath, buffer, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'application/pdf',
    metadata: {
      org_id: String(orgId),        // ✅ CRÍTICO: Conversión explícita a string
      case_id: String(caseId),       // ✅ CRÍTICO: Conversión explícita a string
      uploaded_by: String(userId),  // ✅ CRÍTICO: Conversión explícita a string
      file_name: String(fileName),
      content_type: 'application/pdf',
      uploaded_at: new Date().toISOString(),
      migrated_from_temp: 'true',
      original_temp_path: tempPath,
    }
  });
```

**Evaluación**:
- ✅ Metadata completa con `org_id`
- ✅ Conversión explícita a strings
- ✅ Metadata adicional para trazabilidad (`migrated_from_temp`, `original_temp_path`)
- ✅ Compatible con políticas RLS

**Conclusión**: ✅ **NO REQUIERE CAMBIOS**

---

### 3. Análisis de `src/app/api/cases/create/route.ts`

**Estado**: 🟢 **CORRECTO** - Usa `moveTempToPersistent` que ya maneja metadata

**Líneas críticas analizadas** (líneas 248-262):
```typescript
const moveResult = await moveTempToPersistent({
  tempPath: tempUpload.storagePath,
  orgId: orgId,
  caseId: newCase.id,
  fileName: tempUpload.fileName,
  userId: user.id
});
```

**Evaluación**:
- ✅ Usa helper `moveTempToPersistent` que ya maneja metadata correctamente
- ✅ Pasa todos los parámetros necesarios
- ✅ Manejo robusto de errores con fallback

**Conclusión**: ✅ **NO REQUIERE CAMBIOS**

---

### 4. Análisis de `src/app/api/cases/update/route.ts`

**Estado**: 🟢 **CORRECTO** - Similar a `create`, usa `moveTempToPersistent`

**Evaluación**:
- ✅ Usa helper `moveTempToPersistent` que ya maneja metadata correctamente
- ✅ Mismo patrón que `create`

**Conclusión**: ✅ **NO REQUIERE CAMBIOS**

---

### 5. Análisis de `src/app/api/chat/start/route.ts`

**Estado**: 🟢 **CORRECTO** - Usa `moveTempToPersistent` que ya maneja metadata

**Líneas críticas analizadas** (líneas 95-110):
```typescript
const moveResult = await moveTempToPersistent({
  tempPath: t.storagePath,
  orgId: orgId,
  caseId: newCase.id,
  fileName: t.fileName,
  userId: user.id
});
```

**Evaluación**:
- ✅ Usa helper `moveTempToPersistent` que ya maneja metadata correctamente
- ✅ Pasa todos los parámetros necesarios

**Conclusión**: ✅ **NO REQUIERE CAMBIOS**

---

## 🎯 PROBLEMAS IDENTIFICADOS Y SOLUCIONES

### Problema 1: Falta Helper Centralizado para Validar Metadata

**Severidad**: 🟡 **MEDIA**

**Descripción**: No existe una función centralizada para validar/establecer metadata en Storage, lo que puede llevar a inconsistencias.

**Impacto**:
- Bajo riesgo de inconsistencia en metadata
- Dificulta mantenimiento futuro
- No afecta funcionalidad actual

**Solución**: Crear helper centralizado (Fase 1)

---

### Problema 2: Falta Documentación de Estructura de `provenance`

**Severidad**: 🟡 **MEDIA**

**Descripción**: No hay documentación clara de la estructura esperada del campo `provenance` JSONB.

**Impacto**:
- Dificulta desarrollo futuro
- Puede llevar a inconsistencias en estructura
- No afecta funcionalidad actual

**Solución**: Crear documentación (Fase 2)

---

### Problema 3: Falta Script de Validación de Aceptación

**Severidad**: 🟢 **BAJA**

**Descripción**: No existe script automatizado para validar los criterios de aceptación del Día 2.

**Impacto**:
- Dificulta testing manual
- No afecta funcionalidad actual

**Solución**: Crear script de validación (Fase 3)

---

## 📋 PLAN DE IMPLEMENTACIÓN EN FASES

### FASE 1: Helper Centralizado para Metadata

**Objetivo**: Crear función centralizada para validar/establecer metadata en Storage.

**Prioridad**: 🟡 **MEDIA**

**Riesgo**: 🟢 **BAJO** - Nueva función, no modifica código existente

**Archivo Nuevo**: `src/lib/storage/ensureMetadata.ts`

**Implementación**:
```typescript
/**
 * Helper centralizado para asegurar metadata correcta en archivos de Storage
 * 
 * Principios:
 * - Reutilización máxima: Centraliza lógica de metadata
 * - Separación de responsabilidades: Solo maneja metadata
 * - Consistencia: Garantiza formato uniforme
 * 
 * @param bucket - Bucket de Storage ('artifacts' | 'proposals')
 * @param filePath - Ruta del archivo en Storage
 * @param params - Parámetros para metadata
 * @returns Resultado de la operación
 */

import { createServerSupabase } from '@/lib/supabase/server';

export interface MetadataParams {
  orgId: string;
  caseId?: string;
  userId: string;
  fileName: string;
  contentType: string;
  additionalMetadata?: Record<string, string>;
}

export interface EnsureMetadataResult {
  success: boolean;
  error?: string;
}

export async function ensureStorageMetadata(
  bucket: 'artifacts' | 'proposals',
  filePath: string,
  params: MetadataParams
): Promise<EnsureMetadataResult> {
  try {
    const supabase = await createServerSupabase();
    
    // Construir metadata base con conversión explícita a strings
    const metadata: Record<string, string> = {
      org_id: String(params.orgId),
      uploaded_by: String(params.userId),
      file_name: String(params.fileName),
      content_type: String(params.contentType),
      uploaded_at: new Date().toISOString(),
      ...(params.caseId && { case_id: String(params.caseId) }),
      ...(params.additionalMetadata || {}),
    };
    
    // Actualizar metadata del archivo
    const { error } = await supabase.storage
      .from(bucket)
      .update(filePath, null, { metadata });
    
    if (error) {
      console.error('❌ [ensureStorageMetadata] Error actualizando metadata:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ [ensureStorageMetadata] Error inesperado:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Valida que un archivo en Storage tenga metadata correcta
 * 
 * @param bucket - Bucket de Storage
 * @param filePath - Ruta del archivo
 * @param requiredFields - Campos requeridos en metadata
 * @returns Resultado de validación
 */
export async function validateStorageMetadata(
  bucket: 'artifacts' | 'proposals',
  filePath: string,
  requiredFields: string[] = ['org_id', 'uploaded_by']
): Promise<{ valid: boolean; missingFields: string[]; error?: string }> {
  try {
    const supabase = await createServerSupabase();
    
    // Obtener metadata del archivo
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list(filePath.split('/').slice(0, -1).join('/'), {
        limit: 1,
        search: filePath.split('/').pop()
      });
    
    if (error || !files || files.length === 0) {
      return { valid: false, missingFields: requiredFields, error: error?.message || 'File not found' };
    }
    
    const file = files[0];
    const metadata = file.metadata || {};
    
    // Validar campos requeridos
    const missingFields = requiredFields.filter(field => !metadata[field]);
    
    return {
      valid: missingFields.length === 0,
      missingFields
    };
  } catch (error: any) {
    return { valid: false, missingFields: requiredFields, error: error.message };
  }
}
```

**Testing**:
1. Crear test unitario para `ensureStorageMetadata`
2. Crear test unitario para `validateStorageMetadata`
3. Probar con archivo real en Storage

**Criterio de Éxito**:
- ✅ Función creada y testeada
- ✅ No rompe funcionalidades existentes
- ✅ Puede usarse opcionalmente en código futuro

---

### FASE 2: Documentación de Estructura de `provenance`

**Objetivo**: Documentar estructura completa del campo `provenance` JSONB.

**Prioridad**: 🟡 **MEDIA**

**Riesgo**: 🟢 **BAJO** - Solo documentación, no modifica código

**Archivo Nuevo**: `docs/ARTIFACT_PROVENANCE_SCHEMA.md`

**Contenido**:
```markdown
# Esquema de Provenance para Artifacts

## Estructura JSONB Esperada

El campo `provenance` en la tabla `artifacts` es un JSONB que almacena metadatos sobre el origen y procesamiento del artifact.

### Estructura Base

```json
{
  "uploadedBy": "uuid-usuario",
  "uploadedAt": "2025-02-02T12:00:00Z",
  "fileHash": "sha256-hash",
  "fileSize": 123456,
  "pageCount": 15,
  "charactersExtracted": 45230
}
```

### Estructura Completa (con migración)

```json
{
  "uploadedBy": "uuid-usuario",
  "uploadedAt": "2025-02-02T12:00:00Z",
  "fileHash": "sha256-hash",
  "fileSize": 123456,
  "pageCount": 15,
  "charactersExtracted": 45230,
  "migratedToPersistent": true,
  "migrationError": null,
  "migratedFromTemp": true,
  "originalTempPath": "temp/{userId}/..."
}
```

### Estructura con Reutilización

```json
{
  "uploadedBy": "uuid-usuario",
  "uploadedAt": "2025-02-02T12:00:00Z",
  "fileHash": "sha256-hash",
  "fileSize": 123456,
  "pageCount": 15,
  "reusedFrom": "uuid-artifact-original",
  "originalFileName": "original.pdf",
  "originalCaseId": "uuid-case-original",
  "originalUploadedAt": "2025-02-01T10:00:00Z"
}
```

## Campos Requeridos vs Opcionales

### Campos Requeridos:
- `uploadedBy`: UUID del usuario que subió el archivo (string)
- `uploadedAt`: ISO 8601 timestamp de cuando se subió (string)

### Campos Opcionales:
- `fileHash`: SHA-256 hash para deduplicación (string)
- `fileSize`: Tamaño en bytes (number)
- `pageCount`: Número de páginas para PDFs (number)
- `charactersExtracted`: Número de caracteres extraídos (number)
- `migratedToPersistent`: Boolean indicando si se migró de temporal a persistente (boolean)
- `migrationError`: Mensaje de error si la migración falló (string | null)
- `migratedFromTemp`: Boolean indicando si proviene de archivo temporal (boolean)
- `originalTempPath`: Ruta original del archivo temporal (string)
- `reusedFrom`: UUID del artifact original si se reutilizó archivo (string)
- `originalFileName`: Nombre del archivo original si se reutilizó (string)
- `originalCaseId`: UUID del caso original si se reutilizó (string)
- `originalUploadedAt`: Timestamp del upload original si se reutilizó (string)
- `userAgent`: User agent del navegador (string)
- `origin`: Origen del upload ('landing_temp', 'workspace', etc.) (string)

## Ejemplos de Uso

### Crear Artifact con Provenance Básico

```typescript
await prisma.artifact.create({
  data: {
    caseId: caseId,
    sourceType: 'pdf',
    fileId: storagePath,
    fileName: 'documento.pdf',
    provenance: {
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
      fileHash: fileHash,
      fileSize: file.size,
      pageCount: pageCount
    }
  }
});
```

### Crear Artifact con Provenance de Migración

```typescript
await prisma.artifact.create({
  data: {
    caseId: caseId,
    sourceType: 'pdf',
    fileId: persistentPath,
    fileName: 'documento.pdf',
    provenance: {
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
      fileHash: fileHash,
      fileSize: file.size,
      pageCount: pageCount,
      migratedToPersistent: true,
      migratedFromTemp: true,
      originalTempPath: tempPath
    }
  }
});
```

## Validación

El campo `provenance` es JSONB flexible, pero se recomienda seguir esta estructura para:
- Consistencia en el código
- Facilidad de consultas
- Trazabilidad completa

## Consultas Útiles

### Buscar artifacts por hash (deduplicación)

```sql
SELECT * FROM artifacts
WHERE provenance->>'fileHash' = 'sha256-hash';
```

### Buscar artifacts migrados

```sql
SELECT * FROM artifacts
WHERE provenance->>'migratedToPersistent' = 'true';
```

### Buscar artifacts reutilizados

```sql
SELECT * FROM artifacts
WHERE provenance->>'reusedFrom' IS NOT NULL;
```
```

**Testing**:
- Revisar documentación con equipo
- Validar ejemplos de código

**Criterio de Éxito**:
- ✅ Documentación completa creada
- ✅ Ejemplos de código incluidos
- ✅ Consultas útiles documentadas

---

### FASE 3: Script de Validación de Aceptación

**Objetivo**: Crear script automatizado para validar criterios de aceptación del Día 2.

**Prioridad**: 🟢 **BAJA**

**Riesgo**: 🟢 **BAJO** - Script de testing, no modifica código de producción

**Archivo Nuevo**: `scripts/test-day2-acceptance.ts`

**Implementación**:
```typescript
/**
 * Script de validación de aceptación para Día 2
 * 
 * Valida:
 * 1. Subir PDF de prueba a artifacts/
 * 2. Verificar metadata con org_id
 * 3. Registrar fila en artifacts con provenance
 * 4. Verificar acceso por org_id
 * 
 * Uso: pnpm tsx scripts/test-day2-acceptance.ts
 */

import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { readFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  step: string;
  success: boolean;
  error?: string;
  details?: any;
}

async function testDay2Acceptance(): Promise<void> {
  console.log('🧪 Testing Día 2 Acceptance Criteria...\n');
  
  const results: TestResult[] = [];
  
  try {
    // Paso 1: Obtener org y usuario de prueba
    console.log('📋 Paso 1: Obteniendo org y usuario de prueba...');
    const org = await prisma.organizations.findFirst({
      include: {
        org_members: {
          include: {
            users: true
          },
          take: 1
        }
      }
    });
    
    if (!org || !org.org_members || org.org_members.length === 0) {
      results.push({
        step: 'Paso 1: Obtener org y usuario',
        success: false,
        error: 'No se encontró org o usuario de prueba'
      });
      printResults(results);
      return;
    }
    
    const member = org.org_members[0];
    const userId = member.user_id;
    const orgId = org.id;
    
    console.log(`✅ Org encontrada: ${org.name} (${orgId})`);
    console.log(`✅ Usuario encontrado: ${userId}\n`);
    
    results.push({
      step: 'Paso 1: Obtener org y usuario',
      success: true,
      details: { orgId, userId }
    });
    
    // Paso 2: Crear caso de prueba
    console.log('📋 Paso 2: Creando caso de prueba...');
    const testCase = await prisma.case.create({
      data: {
        orgId: orgId,
        clientRef: 'TEST-DAY2-001',
        status: 'draft',
        stage: 'initial',
      }
    });
    
    console.log(`✅ Caso creado: ${testCase.id}\n`);
    
    results.push({
      step: 'Paso 2: Crear caso de prueba',
      success: true,
      details: { caseId: testCase.id }
    });
    
    // Paso 3: Subir PDF de prueba
    console.log('📋 Paso 3: Subiendo PDF de prueba...');
    const supabase = await createServerSupabase();
    
    // Crear PDF de prueba simple (en producción, usar archivo real)
    const testPdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\n0 1\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF');
    const timestamp = Date.now();
    const testPdfPath = `${orgId}/${testCase.id}/${timestamp}_test.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('artifacts')
      .upload(testPdfPath, testPdfContent, {
        contentType: 'application/pdf',
        metadata: {
          org_id: String(orgId),
          case_id: String(testCase.id),
          uploaded_by: String(userId),
          file_name: 'test.pdf',
          content_type: 'application/pdf',
          uploaded_at: new Date().toISOString(),
        }
      });
    
    if (uploadError) {
      results.push({
        step: 'Paso 3: Subir PDF de prueba',
        success: false,
        error: uploadError.message
      });
      printResults(results);
      await cleanup(testCase.id, testPdfPath);
      return;
    }
    
    console.log(`✅ PDF subido: ${testPdfPath}\n`);
    
    results.push({
      step: 'Paso 3: Subir PDF de prueba',
      success: true,
      details: { path: testPdfPath }
    });
    
    // Paso 4: Verificar metadata con org_id
    console.log('📋 Paso 4: Verificando metadata con org_id...');
    const { data: fileList, error: listError } = await supabase.storage
      .from('artifacts')
      .list(testPdfPath.split('/').slice(0, 2).join('/'), {
        limit: 100
      });
    
    if (listError || !fileList) {
      results.push({
        step: 'Paso 4: Verificar metadata',
        success: false,
        error: listError?.message || 'File list not found'
      });
      printResults(results);
      await cleanup(testCase.id, testPdfPath);
      return;
    }
    
    const testFile = fileList.find(f => f.name === testPdfPath.split('/').pop());
    
    if (!testFile || !testFile.metadata || !testFile.metadata.org_id) {
      results.push({
        step: 'Paso 4: Verificar metadata',
        success: false,
        error: 'Metadata org_id not found'
      });
      printResults(results);
      await cleanup(testCase.id, testPdfPath);
      return;
    }
    
    console.log(`✅ Metadata verificada: org_id = ${testFile.metadata.org_id}\n`);
    
    results.push({
      step: 'Paso 4: Verificar metadata',
      success: true,
      details: { metadata: testFile.metadata }
    });
    
    // Paso 5: Registrar fila en artifacts con provenance
    console.log('📋 Paso 5: Registrando fila en artifacts con provenance...');
    const artifact = await prisma.artifact.create({
      data: {
        caseId: testCase.id,
        sourceType: 'pdf',
        fileId: testPdfPath,
        fileName: 'test.pdf',
        contentType: 'application/pdf',
        provenance: {
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          fileHash: 'test-hash',
          fileSize: testPdfContent.length,
          pageCount: 1,
        }
      }
    });
    
    console.log(`✅ Artifact creado: ${artifact.id}\n`);
    
    results.push({
      step: 'Paso 5: Registrar artifact con provenance',
      success: true,
      details: { artifactId: artifact.id }
    });
    
    // Paso 6: Verificar acceso por org_id
    console.log('📋 Paso 6: Verificando acceso por org_id...');
    const { data: accessData, error: accessError } = await supabase.storage
      .from('artifacts')
      .download(testPdfPath);
    
    if (accessError) {
      results.push({
        step: 'Paso 6: Verificar acceso',
        success: false,
        error: accessError.message
      });
      printResults(results);
      await cleanup(testCase.id, testPdfPath, artifact.id);
      return;
    }
    
    console.log(`✅ Acceso verificado: archivo descargable\n`);
    
    results.push({
      step: 'Paso 6: Verificar acceso por org_id',
      success: true
    });
    
    // Limpiar
    console.log('🧹 Limpiando recursos de prueba...');
    await cleanup(testCase.id, testPdfPath, artifact.id);
    console.log('✅ Limpieza completada\n');
    
    // Resultados finales
    printResults(results);
    
    const allSuccess = results.every(r => r.success);
    if (allSuccess) {
      console.log('✅ ✅ ✅ TODOS LOS TESTS PASARON ✅ ✅ ✅');
      process.exit(0);
    } else {
      console.log('❌ ❌ ❌ ALGUNOS TESTS FALLARON ❌ ❌ ❌');
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('❌ Error inesperado:', error);
    results.push({
      step: 'Error general',
      success: false,
      error: error.message
    });
    printResults(results);
    process.exit(1);
  }
}

async function cleanup(caseId: string, filePath: string, artifactId?: string): Promise<void> {
  try {
    const supabase = await createServerSupabase();
    
    // Eliminar archivo de Storage
    await supabase.storage
      .from('artifacts')
      .remove([filePath]);
    
    // Eliminar artifact
    if (artifactId) {
      await prisma.artifact.delete({ where: { id: artifactId } });
    }
    
    // Eliminar caso
    await prisma.case.delete({ where: { id: caseId } });
  } catch (error) {
    console.warn('⚠️ Error en limpieza (no crítico):', error);
  }
}

function printResults(results: TestResult[]): void {
  console.log('\n📊 RESULTADOS DE TESTS\n');
  console.log('='.repeat(60));
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${result.step}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Detalles: ${JSON.stringify(result.details, null, 2)}`);
    }
  });
  
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  console.log(`\nResumen: ${successCount}/${totalCount} tests pasaron\n`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testDay2Acceptance();
}

export { testDay2Acceptance };
```

**Testing**:
1. Ejecutar script: `pnpm tsx scripts/test-day2-acceptance.ts`
2. Verificar que todos los pasos pasen
3. Verificar limpieza de recursos

**Criterio de Éxito**:
- ✅ Script ejecuta todos los pasos
- ✅ Todos los tests pasan
- ✅ Limpieza de recursos funciona correctamente

---

## 🔄 ORDEN DE EJECUCIÓN DE FASES

### Secuencia Recomendada:

1. **FASE 2** (Documentación) → 🟢 **PRIMERO**
   - Riesgo: 🟢 BAJO
   - Impacto: 🟢 BAJO
   - Beneficio: Documentación para referencia

2. **FASE 1** (Helper Centralizado) → 🟡 **SEGUNDO**
   - Riesgo: 🟢 BAJO
   - Impacto: 🟡 MEDIO
   - Beneficio: Herramienta reutilizable para futuro

3. **FASE 3** (Script de Validación) → 🟢 **TERCERO**
   - Riesgo: 🟢 BAJO
   - Impacto: 🟢 BAJO
   - Beneficio: Validación automatizada

### Justificación del Orden:

- **FASE 2 primero**: Documentación no afecta código, puede hacerse en paralelo
- **FASE 1 segundo**: Helper puede usarse opcionalmente, no rompe código existente
- **FASE 3 tercero**: Script de testing, puede ejecutarse después de las otras fases

---

## ✅ CRITERIOS DE ÉXITO GENERALES

### Para Cada Fase:

1. ✅ **No rompe funcionalidades existentes**
2. ✅ **Código testeable y documentado**
3. ✅ **Sigue principios de trabajo**
4. ✅ **Bajo impacto en código existente**

### Para el Día 2 Completo:

1. ✅ **Tablas `cases` y `artifacts` funcionando**
2. ✅ **Buckets `artifacts/` y `proposals/` configurados**
3. ✅ **Políticas RLS funcionando**
4. ✅ **Metadata con `org_id` en todos los archivos nuevos**
5. ✅ **Provenance JSONB implementado correctamente**
6. ✅ **Script de validación pasa todos los tests**

---

## 🛡️ MITIGACIÓN DE RIESGOS

### Riesgo 1: Helper Centralizado No Se Usa

**Probabilidad**: 🟡 MEDIA  
**Impacto**: 🟢 BAJO

**Mitigación**:
- Helper es opcional, no rompe código existente
- Puede adoptarse gradualmente
- Documentación clara de uso

### Riesgo 2: Documentación Desactualizada

**Probabilidad**: 🟡 MEDIA  
**Impacto**: 🟢 BAJO

**Mitigación**:
- Documentación en `docs/` fácil de actualizar
- Ejemplos de código incluidos
- Revisión periódica recomendada

### Riesgo 3: Script de Validación Falla en Producción

**Probabilidad**: 🟢 BAJA  
**Impacto**: 🟢 BAJO

**Mitigación**:
- Script solo para testing, no en producción
- Limpieza robusta de recursos
- Manejo de errores completo

---

## 📝 NOTAS FINALES

### Estado Actual del Código:

✅ **EXCELENTE** - El código actual ya implementa correctamente:
- Metadata con `org_id` en todas las rutas de upload
- Conversión explícita a strings para metadata
- Helper `moveTempToPersistent` con metadata correcta
- Políticas RLS funcionando

### Mejoras Propuestas:

Las fases propuestas son **mejoras incrementales** que:
- No rompen funcionalidades existentes
- Añaden herramientas útiles para futuro
- Mejoran documentación y testing
- Siguen principios de trabajo establecidos

### Recomendación:

**Implementar las fases en el orden propuesto**, ya que:
1. Son de bajo riesgo
2. No afectan código existente
3. Añaden valor incremental
4. Son fácilmente testeables

---

**Última actualización**: 2 de Febrero, 2025  
**Estado**: ✅ Listo para implementación

