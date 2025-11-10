# PLAN DE INTEGRACIÓN QUIRÚRGICO - DÍA 2: CASOS Y ARTEFACTOS + STORAGE

**Versión**: 1.0  
**Fecha**: 2 de Febrero, 2025  
**Rol**: Developer FullStack Senior  
**Enfoque**: Implementación quirúrgica, metodológica y rigurosa  
**Objetivo**: Robustecer tablas `cases` y `artifacts` + implementar políticas de storage con validación por `org_id` en metadata

---

## 📋 PRINCIPIOS DE TRABAJO

1. **Reutilización máxima del código existente**
2. **Mantenimiento de la arquitectura dual del proyecto**
3. **Consistencia de estado unidireccional**
4. **Separación clara de responsabilidades**
5. **Enfoque quirúrgico**: Una fase = Una tabla/componente
6. **Validación humana entre fases**: Esperar confirmación antes de continuar

---

## 🎯 OBJETIVO GENERAL DEL DÍA 2

Implementar completamente:
- ✅ Tablas `cases` y `artifacts` con estructura completa
- ✅ Buckets `artifacts/` y `proposals/`
- ✅ Reglas de acceso a buckets por `org_id` en metadata
- ✅ Aceptación: Subir un PDF de prueba y registrar fila en artifacts con provenance

---

## 📊 ESTRUCTURA DEL PLAN POR FASES

El plan está dividido en **4 FASES QUIRÚRGICAS**, cada una enfocada en un componente específico:

1. **FASE 1**: Robustecimiento de la tabla `cases` y validación de `orgId`
2. **FASE 2**: Robustecimiento de la tabla `artifacts` y validación de `fileId`
3. **FASE 3**: Implementación de políticas de storage con validación por `org_id` en metadata
4. **FASE 4**: Actualización de código de subida de archivos para incluir `org_id` en metadata

**IMPORTANTE**: Después de cada fase, se debe esperar confirmación del desarrollador antes de continuar con la siguiente.

---

# FASE 1: ROBUSTECIMIENTO DE LA TABLA `cases` Y VALIDACIÓN DE `orgId`

## 🎯 OBJETIVO DE LA FASE 1

Asegurar que la tabla `cases` tenga validación robusta de `orgId` en todos los puntos de creación y actualización, garantizando que nunca sea `null` cuando se crea un caso nuevo.

---

## 📊 ANÁLISIS EXHAUSTIVO DE ARCHIVOS AFECTADOS

### 1.1. Archivos que CREAN casos (INSERT)

#### 1.1.1. `src/app/api/cases/create/route.ts`
**Estado actual**:
- ✅ Ya tiene lógica para obtener `orgId` si no se proporciona (líneas 79-99)
- ⚠️ **PROBLEMA**: No valida explícitamente que `orgId` no sea `null` antes de llamar a `createCaseWithOrg`
- ⚠️ **RIESGO**: Si `orgId` es `null`, `createCaseWithOrg` podría fallar o crear casos sin organización

**Líneas críticas**:
```typescript:79:99:src/app/api/cases/create/route.ts
// ✅ CORRECCIÓN FASE 1: Obtener orgId del usuario si no se proporciona
let orgId = providedOrgId;

if (!orgId) {
  // Obtener orgId del usuario desde la BD
  const { prisma } = await import('@/lib/prisma');
  const member = await prisma.org_members.findFirst({
    where: { user_id: user.id },
    select: { org_id: true }
  });
  
  if (!member) {
    return NextResponse.json(
      { error: 'User is not a member of any organization' },
      { status: 403 }
    );
  }
  
  orgId = member.org_id;
  console.log('✅ [API] Resolved orgId from user membership:', orgId);
}
```

**Análisis de riesgo**:
- Si `member.org_id` es `null` (caso edge), `orgId` será `null`
- No hay validación explícita de `orgId !== null` antes de crear el caso
- `createCaseWithOrg` podría recibir `null` y fallar silenciosamente

---

#### 1.1.2. `src/app/api/chat/start/route.ts`
**Estado actual**:
- ✅ Obtiene `orgId` de la membresía del usuario (líneas 47-59)
- ⚠️ **PROBLEMA**: No valida explícitamente que `orgId` no sea `null` antes de crear el caso
- ⚠️ **RIESGO**: Similar al anterior, podría crear casos sin organización

**Líneas críticas**:
```typescript:47:70:src/app/api/chat/start/route.ts
let orgId = orgIdFromBody;
if (!orgId) {
  const { data: memberships, error } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error || !memberships || memberships.length === 0) {
    return NextResponse.json({ error: 'No organization found for user' }, { status: 400 });
  }
  orgId = memberships[0]?.org_id as string;
}

// Crear Case
const newCase = await prisma.case.create({
  data: {
    orgId,
    // ...
  },
});
```

**Análisis de riesgo**:
- Si `memberships[0]?.org_id` es `null`, `orgId` será `null`
- No hay validación explícita antes de `prisma.case.create`
- Podría crear casos con `orgId: null`, violando la integridad de datos

---

#### 1.1.3. `src/lib/database.ts` - Función `createCaseWithOrg`
**Estado actual**:
- ✅ Valida que `orgId` no sea vacío (línea 455)
- ⚠️ **PROBLEMA**: La validación solo verifica `!orgId`, pero no verifica explícitamente `null`
- ⚠️ **RIESGO**: Si `orgId` es `null`, la validación podría pasar (dependiendo de cómo TypeScript maneje `null`)

**Líneas críticas**:
```typescript:435:456:src/lib/database.ts
export async function createCaseWithOrg(
  orgId: string,
  briefData: any,
  userId: string,
  additionalData: {
    // ...
  } = {}
) {
  if (!orgId) throw new DatabaseError("Organization ID is required.");
  // ...
}
```

**Análisis de riesgo**:
- La validación `if (!orgId)` debería capturar `null`, pero es mejor ser explícito
- Si `orgId` es `null`, Prisma podría crear el caso con `orgId: null` (si el schema lo permite)

---

### 1.2. Archivos que ACTUALIZAN casos (UPDATE)

#### 1.2.1. `src/app/api/cases/update/route.ts`
**Estado actual**:
- ⚠️ **PROBLEMA**: No se revisó completamente en el análisis inicial
- ⚠️ **RIESGO**: Podría permitir actualizar `orgId` a `null` si no hay validación

**Acción requerida**: Revisar el archivo completo para asegurar que no permita actualizar `orgId` a `null`.

---

### 1.3. Schema de Prisma

#### 1.3.1. `prisma/schema.prisma`
**Estado actual**:
```prisma:373:397:prisma/schema.prisma
model Case {
  id                 String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orgId              String?    @map("org_id") @db.Uuid
  // ...
}
```

**Análisis de riesgo**:
- `orgId` es opcional (`String?`), lo que permite `null`
- Para el Día 2, según el plan, `org_id` debería ser `NOT NULL`
- **DECISIÓN ARQUITECTÓNICA**: No cambiar el schema ahora (sería una migración mayor), pero validar en código que nunca sea `null`

---

## 🔧 PLAN DE IMPLEMENTACIÓN QUIRÚRGICO - FASE 1

### Paso 1.1: Validación explícita en `src/app/api/cases/create/route.ts`

**Ubicación**: Después de la línea 99 (después de obtener `orgId`)

**Código a añadir**:
```typescript
// ✅ VALIDACIÓN EXPLÍCITA: Asegurar que orgId nunca sea null
if (!orgId || orgId === null) {
  console.error('❌ [API/cases/create] orgId is null or undefined after resolution');
  return NextResponse.json(
    { error: 'Organization ID is required and could not be resolved from user membership' },
    { status: 400 }
  );
}
```

**Justificación**:
- Validación explícita de `null` además de falsy values
- Mensaje de error descriptivo para debugging
- Previene creación de casos sin organización

**Riesgo de romper funcionalidades**: **BAJO**
- Solo añade validación, no modifica lógica existente
- Si hay casos edge donde `orgId` es `null`, se detectarán y se corregirán

---

### Paso 1.2: Validación explícita en `src/app/api/chat/start/route.ts`

**Ubicación**: Después de la línea 59 (después de obtener `orgId`)

**Código a añadir**:
```typescript
// ✅ VALIDACIÓN EXPLÍCITA: Asegurar que orgId nunca sea null
if (!orgId || orgId === null) {
  console.error('❌ [API/chat/start] orgId is null after resolution');
  return NextResponse.json(
    { error: 'Organization ID is required and could not be resolved from user membership' },
    { status: 400 }
  );
}
```

**Justificación**: Similar al paso anterior, pero para el endpoint de chat.

**Riesgo de romper funcionalidades**: **BAJO**
- Mismo análisis que el paso anterior

---

### Paso 1.3: Robustecer validación en `src/lib/database.ts` - `createCaseWithOrg`

**Ubicación**: Línea 455 (reemplazar validación existente)

**Código actual**:
```typescript
if (!orgId) throw new DatabaseError("Organization ID is required.");
```

**Código nuevo**:
```typescript
// ✅ VALIDACIÓN ROBUSTA: Verificar que orgId no sea null, undefined, o string vacío
if (!orgId || orgId === null || orgId === undefined || orgId.trim() === '') {
  throw new DatabaseError("Organization ID is required and cannot be null, undefined, or empty.");
}
```

**Justificación**:
- Validación más explícita y robusta
- Captura todos los casos edge (`null`, `undefined`, string vacío)
- Mensaje de error más descriptivo

**Riesgo de romper funcionalidades**: **BAJO**
- Solo mejora la validación existente
- Si hay código que pasa `orgId` inválido, ahora fallará explícitamente (comportamiento deseado)

---

### Paso 1.4: Revisar y validar `src/app/api/cases/update/route.ts`

**Acción**: Leer el archivo completo y asegurar que no permita actualizar `orgId` a `null`.

**Código a verificar**:
- Si hay lógica que actualiza `orgId`, añadir validación similar
- Si no hay lógica que actualice `orgId`, documentar que está protegido

**Riesgo de romper funcionalidades**: **NULO**
- Solo revisión, no cambios si no es necesario

---

## ✅ CRITERIOS DE ACEPTACIÓN - FASE 1

1. ✅ Todos los endpoints que crean casos validan explícitamente que `orgId` no sea `null`
2. ✅ Si `orgId` es `null`, se retorna error 400 con mensaje descriptivo
3. ✅ No se pueden crear casos sin `orgId` válido
4. ✅ Los logs muestran claramente cuando `orgId` es `null` para debugging

---

## 🧪 PLAN DE PRUEBAS - FASE 1

### Prueba 1.1: Crear caso con `orgId` válido
**Acción**: Crear caso desde `/api/cases/create` con `orgId` válido  
**Resultado esperado**: Caso creado exitosamente con `orgId` no nulo

### Prueba 1.2: Crear caso sin `orgId` (usuario con membresía)
**Acción**: Crear caso sin proporcionar `orgId`, pero usuario tiene membresía  
**Resultado esperado**: `orgId` se resuelve automáticamente, caso creado exitosamente

### Prueba 1.3: Crear caso sin `orgId` (usuario sin membresía)
**Acción**: Intentar crear caso sin `orgId` y usuario sin membresía  
**Resultado esperado**: Error 403 "User is not a member of any organization"

### Prueba 1.4: Crear caso con `orgId: null` explícito
**Acción**: Intentar crear caso con `orgId: null` explícitamente  
**Resultado esperado**: Error 400 "Organization ID is required and cannot be null"

---

## ⚠️ RIESGOS IDENTIFICADOS Y MITIGACIÓN - FASE 1

### Riesgo 1.1: Casos existentes con `orgId: null`
**Probabilidad**: Media  
**Impacto**: Alto  
**Mitigación**: 
- Validar en BD si hay casos con `orgId: null`
- Si existen, crear migración para asignar `orgId` basado en `created_at` y otros datos
- Documentar casos edge encontrados

### Riesgo 1.2: Usuarios sin membresía intentando crear casos
**Probabilidad**: Baja  
**Impacto**: Medio  
**Mitigación**: 
- Ya hay validación en código (retorna 403)
- Asegurar que el mensaje de error sea claro para el usuario

---

# FASE 2: ROBUSTECIMIENTO DE LA TABLA `artifacts` Y VALIDACIÓN DE `fileId`

## 🎯 OBJETIVO DE LA FASE 2

Asegurar que la tabla `artifacts` tenga validación robusta de `fileId` cuando se crean artifacts con archivos, garantizando que siempre haya un `fileId` válido cuando corresponde.

---

## 📊 ANÁLISIS EXHAUSTIVO DE ARCHIVOS AFECTADOS

### 2.1. Archivos que CREAN artifacts (INSERT)

#### 2.1.1. `src/app/api/upload/pdf/route.ts`
**Estado actual**:
- ✅ Crea artifacts con `fileId: storagePath` (línea 252)
- ⚠️ **PROBLEMA**: No valida explícitamente que `storagePath` no sea `null` o vacío antes de crear el artifact
- ⚠️ **RIESGO**: Si `storagePath` es `null` o vacío, se crearía un artifact sin `fileId`, violando la integridad de datos

**Líneas críticas**:
```typescript:205:265:src/app/api/upload/pdf/route.ts
// Generar path seguro para el archivo en Storage
const timestamp = Date.now();
const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
const storagePath = `${orgId}/${caseId}/${timestamp}_${sanitizedFileName}`;

console.log('☁️ Subiendo a Storage:', storagePath);

// Subir archivo a Supabase Storage
const { error: uploadError } = await supabase.storage
  .from('artifacts')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false
  });

if (uploadError) {
  console.error('❌ Error subiendo a Storage:', uploadError);
  return NextResponse.json(
    { error: 'Failed to upload file to storage: ' + uploadError.message },
    { status: 500 }
  );
}

// ...

// Crear registro en la tabla artifacts
const artifact = await prisma.artifact.create({
  data: {
    caseId: caseId,
    sourceType: 'pdf',
    fileId: storagePath, // ✅ Ya se asigna
    // ...
  }
});
```

**Análisis de riesgo**:
- Si `orgId` o `caseId` son `null` o `undefined`, `storagePath` sería inválido (ej: `null/null/...`)
- Si la subida a Storage falla pero no se retorna error, `storagePath` podría ser inválido
- No hay validación explícita de `storagePath` antes de crear el artifact

---

#### 2.1.2. `src/app/api/cases/create/route.ts` - Procesamiento de tempUploads
**Estado actual**:
- ✅ Crea artifacts desde `tempUploads` (líneas 212-230)
- ⚠️ **PROBLEMA**: No valida explícitamente que `tempUpload.storagePath` no sea `null` o vacío
- ⚠️ **RIESGO**: Si `tempUpload.storagePath` es inválido, se crearía artifact sin `fileId`

**Líneas críticas**:
```typescript:212:230:src/app/api/cases/create/route.ts
for (const tempUpload of tempUploads) {
  console.log('📎 [API] Creating artifact:', tempUpload.fileName);
  await prisma.artifact.create({
    data: {
      caseId: newCase.id,
      sourceType: 'pdf',
      fileId: tempUpload.storagePath, // ⚠️ No validado
      fileName: tempUpload.fileName,
      contentType: 'application/pdf',
      contentText: tempUpload.extractedText || null,
      provenance: {
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString(),
        fileSize: tempUpload.fileSize,
        fileHash: tempUpload.fileHash,
        pageCount: tempUpload.pageCount,
      },
    },
  });
}
```

**Análisis de riesgo**:
- Si `tempUpload.storagePath` es `null`, `undefined`, o string vacío, se crearía artifact inválido
- No hay validación antes del loop ni dentro del loop

---

#### 2.1.3. `src/app/api/cases/update/route.ts` - Procesamiento de tempUploads
**Estado actual**:
- Similar a `cases/create`, procesa `tempUploads` y crea artifacts
- ⚠️ **PROBLEMA**: Mismo riesgo que el anterior

---

#### 2.1.4. `src/app/api/chat/start/route.ts` - Registrar artifacts desde temp
**Estado actual**:
- ✅ Crea artifacts desde `tempUploads` (líneas 73-92)
- ⚠️ **PROBLEMA**: No valida explícitamente que `t.storagePath` no sea `null` o vacío

**Líneas críticas**:
```typescript:73:92:src/app/api/chat/start/route.ts
// Mover/registrar artifacts desde temp
for (const t of tempUploads) {
  await prisma.artifact.create({
    data: {
      caseId: newCase.id,
      sourceType: 'pdf',
      fileId: t.storagePath, // ⚠️ No validado
      fileName: t.fileName,
      contentType: 'application/pdf',
      contentText: t.extractedText || null,
      provenance: {
        uploadedBy: user.id,
        origin: 'landing_temp',
        fileHash: t.fileHash,
        fileSize: t.fileSize,
        pageCount: t.pageCount || null,
        charactersExtracted: t.charactersExtracted || 0,
      },
    },
  });
}
```

**Análisis de riesgo**: Similar a los anteriores.

---

#### 2.1.5. `src/lib/database.ts` - Función `createArtifact`
**Estado actual**:
- ✅ Función genérica para crear artifacts
- ⚠️ **PROBLEMA**: No valida que `fileId` sea requerido cuando `sourceType` es 'pdf' o 'api'
- ⚠️ **RIESGO**: Podría crear artifacts sin `fileId` cuando debería tenerlo

**Líneas críticas**:
```typescript:135:154:src/lib/database.ts
export async function createArtifact(input: CreateArtifactInput) {
  try {
    const newArtifact = await prisma.artifact.create({
      data: {
        caseId: input.caseId,
        sourceType: input.sourceType,
        fileId: input.fileId || null, // ⚠️ Permite null sin validación
        // ...
      }
    });

    return newArtifact;
  } catch (error) {
    console.error('Error creating artifact:', error);
    throw new DatabaseError('Failed to create artifact');
  }
}
```

**Análisis de riesgo**:
- Si `sourceType` es 'pdf' o 'api', `fileId` debería ser requerido
- Actualmente permite `null` sin validación

---

### 2.2. Schema de Prisma

#### 2.2.1. `prisma/schema.prisma`
**Estado actual**:
```prisma:399:413:prisma/schema.prisma
model Artifact {
  id          String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  caseId      String     @map("case_id") @db.Uuid
  sourceType  SourceType @map("source_type")
  fileId      String?    @map("file_id") @db.VarChar(255)
  // ...
}
```

**Análisis de riesgo**:
- `fileId` es opcional (`String?`), lo que permite `null`
- Para artifacts con `sourceType: 'pdf'`, `fileId` debería ser requerido
- **DECISIÓN ARQUITECTÓNICA**: No cambiar el schema ahora (sería una migración mayor), pero validar en código que `fileId` no sea `null` cuando `sourceType` es 'pdf' o 'api'

---

## 🔧 PLAN DE IMPLEMENTACIÓN QUIRÚRGICO - FASE 2

### Paso 2.1: Validación explícita en `src/app/api/upload/pdf/route.ts`

**Ubicación**: Después de la línea 226 (después de subir a Storage, antes de crear artifact)

**Código a añadir**:
```typescript
// ✅ VALIDACIÓN EXPLÍCITA: Asegurar que storagePath sea válido antes de crear artifact
if (!storagePath || storagePath.trim() === '' || storagePath.includes('null') || storagePath.includes('undefined')) {
  console.error('❌ [API/upload/pdf] Invalid storagePath:', storagePath);
  return NextResponse.json(
    { error: 'Invalid storage path generated. Please try again.' },
    { status: 500 }
  );
}
```

**Justificación**:
- Valida que `storagePath` no sea `null`, vacío, o contenga strings inválidos
- Previene creación de artifacts con `fileId` inválido
- Mensaje de error descriptivo

**Riesgo de romper funcionalidades**: **BAJO**
- Solo añade validación, no modifica lógica existente
- Si hay casos edge donde `storagePath` es inválido, se detectarán

---

### Paso 2.2: Validación explícita en `src/app/api/cases/create/route.ts` - tempUploads

**Ubicación**: Dentro del loop de `tempUploads`, antes de crear artifact (línea 213)

**Código a añadir**:
```typescript
for (const tempUpload of tempUploads) {
  // ✅ VALIDACIÓN EXPLÍCITA: Asegurar que storagePath sea válido
  if (!tempUpload.storagePath || tempUpload.storagePath.trim() === '' || 
      tempUpload.storagePath.includes('null') || tempUpload.storagePath.includes('undefined')) {
    console.error('❌ [API/cases/create] Invalid tempUpload.storagePath:', tempUpload);
    return NextResponse.json(
      { error: `Invalid storage path for file ${tempUpload.fileName}. Please re-upload the file.` },
      { status: 400 }
    );
  }
  
  console.log('📎 [API] Creating artifact:', tempUpload.fileName);
  await prisma.artifact.create({
    // ...
  });
}
```

**Justificación**: Similar al paso anterior, pero para tempUploads.

**Riesgo de romper funcionalidades**: **BAJO**
- Solo añade validación en el loop
- Si hay tempUploads inválidos, se detectarán antes de crear artifacts

---

### Paso 2.3: Validación explícita en `src/app/api/cases/update/route.ts` - tempUploads

**Acción**: Aplicar la misma validación que en `cases/create`.

**Riesgo de romper funcionalidades**: **BAJO**
- Mismo análisis que el paso anterior

---

### Paso 2.4: Validación explícita en `src/app/api/chat/start/route.ts` - tempUploads

**Ubicación**: Dentro del loop de `tempUploads`, antes de crear artifact (línea 74)

**Código a añadir**:
```typescript
// Mover/registrar artifacts desde temp
for (const t of tempUploads) {
  // ✅ VALIDACIÓN EXPLÍCITA: Asegurar que storagePath sea válido
  if (!t.storagePath || t.storagePath.trim() === '' || 
      t.storagePath.includes('null') || t.storagePath.includes('undefined')) {
    console.error('❌ [API/chat/start] Invalid tempUpload.storagePath:', t);
    return NextResponse.json(
      { error: `Invalid storage path for file ${t.fileName}. Please re-upload the file.` },
      { status: 400 }
    );
  }
  
  await prisma.artifact.create({
    // ...
  });
}
```

**Justificación**: Similar a los pasos anteriores.

**Riesgo de romper funcionalidades**: **BAJO**
- Mismo análisis

---

### Paso 2.5: Robustecer validación en `src/lib/database.ts` - `createArtifact`

**Ubicación**: Línea 136 (después de `try`, antes de `prisma.artifact.create`)

**Código a añadir**:
```typescript
export async function createArtifact(input: CreateArtifactInput) {
  try {
    // ✅ VALIDACIÓN ROBUSTA: fileId es requerido para sourceType 'pdf' o 'api'
    if ((input.sourceType === 'pdf' || input.sourceType === 'api') && 
        (!input.fileId || input.fileId.trim() === '')) {
      throw new DatabaseError(
        `fileId is required for artifacts with sourceType '${input.sourceType}'`
      );
    }
    
    const newArtifact = await prisma.artifact.create({
      // ...
    });

    return newArtifact;
  } catch (error) {
    // ...
  }
}
```

**Justificación**:
- Valida que `fileId` sea requerido para `sourceType: 'pdf'` o `'api'`
- Previene creación de artifacts inválidos a nivel de función helper
- Centraliza la validación en un solo lugar

**Riesgo de romper funcionalidades**: **MEDIO**
- Si hay código que crea artifacts con `sourceType: 'pdf'` sin `fileId`, ahora fallará
- **MITIGACIÓN**: Revisar todos los usos de `createArtifact` antes de implementar
- Si hay casos legítimos donde `fileId` puede ser opcional, ajustar la validación

---

## ✅ CRITERIOS DE ACEPTACIÓN - FASE 2

1. ✅ Todos los endpoints que crean artifacts validan explícitamente que `fileId` no sea `null` o vacío cuando corresponde
2. ✅ Si `fileId` es inválido, se retorna error 400 con mensaje descriptivo
3. ✅ No se pueden crear artifacts con `sourceType: 'pdf'` sin `fileId` válido
4. ✅ Los logs muestran claramente cuando `fileId` es inválido para debugging

---

## 🧪 PLAN DE PRUEBAS - FASE 2

### Prueba 2.1: Crear artifact con `fileId` válido
**Acción**: Subir PDF y crear artifact con `fileId` válido  
**Resultado esperado**: Artifact creado exitosamente con `fileId` no nulo

### Prueba 2.2: Crear artifact sin `fileId` (sourceType: 'pdf')
**Acción**: Intentar crear artifact con `sourceType: 'pdf'` pero `fileId: null`  
**Resultado esperado**: Error 400 "fileId is required for artifacts with sourceType 'pdf'"

### Prueba 2.3: Crear artifact con `fileId` inválido (string vacío)
**Acción**: Intentar crear artifact con `fileId: ''`  
**Resultado esperado**: Error 400 "Invalid storage path"

### Prueba 2.4: Crear artifact desde tempUpload con `storagePath` inválido
**Acción**: Intentar crear artifact desde tempUpload con `storagePath: null`  
**Resultado esperado**: Error 400 "Invalid storage path for file..."

---

## ⚠️ RIESGOS IDENTIFICADOS Y MITIGACIÓN - FASE 2

### Riesgo 2.1: Artifacts existentes con `fileId: null` y `sourceType: 'pdf'`
**Probabilidad**: Media  
**Impacto**: Medio  
**Mitigación**: 
- Validar en BD si hay artifacts con `fileId: null` y `sourceType: 'pdf'`
- Si existen, documentar y considerar migración para corregirlos
- No bloquear funcionalidad existente, solo prevenir nuevos casos

### Riesgo 2.2: Código legacy que crea artifacts sin `fileId`
**Probabilidad**: Baja  
**Impacto**: Alto  
**Mitigación**: 
- Revisar todos los usos de `createArtifact` antes de implementar
- Si hay casos legítimos, ajustar la validación para permitirlos
- Documentar casos edge encontrados

---

# FASE 3: IMPLEMENTACIÓN DE POLÍTICAS DE STORAGE CON VALIDACIÓN POR `org_id` EN METADATA

## 🎯 OBJETIVO DE LA FASE 3

Implementar políticas de storage que validen `org_id` en metadata de los objetos almacenados, asegurando que solo miembros de la organización puedan acceder a los archivos de su organización.

---

## 📊 ANÁLISIS EXHAUSTIVO DE ARCHIVOS AFECTADOS

### 3.1. Migraciones de Storage

#### 3.1.1. `supabase/migrations/20250107_storage_buckets_configuration.sql`
**Estado actual**:
- ✅ Crea buckets `artifacts` y `proposals`
- ⚠️ **PROBLEMA**: Políticas usan `storage.foldername(name)[1]` para validar `org_id` desde el path, NO desde metadata
- ⚠️ **RIESGO**: No cumple con el requisito del Día 2: "Reglas de acceso a buckets por org_id en metadata"

**Líneas críticas**:
```sql:45:54:supabase/migrations/20250107_storage_buckets_configuration.sql
-- Política para subir archivos: Solo miembros de la organización
CREATE POLICY "org_members_can_upload_artifacts" 
    ON storage.objects FOR INSERT 
    WITH CHECK (
        bucket_id = 'artifacts' AND
        (storage.foldername(name))[1] IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid()
        )
    );
```

**Análisis de riesgo**:
- Las políticas actuales validan `org_id` desde el path del archivo, no desde metadata
- Si un archivo se mueve o renombra, la validación podría fallar
- No cumple con el requisito explícito del Día 2

---

#### 3.1.2. `supabase/migrations/20251012T120000_storage_artifacts_policies.sql`
**Estado actual**:
- ✅ Crea políticas para `artifacts` con validación por path
- ⚠️ **PROBLEMA**: Similar al anterior, valida por path, no por metadata

---

#### 3.1.3. `supabase/migrations/20250127_fix_storage_buckets_and_policies.sql`
**Estado actual**:
- ⚠️ **PROBLEMA CRÍTICO**: Elimina políticas anteriores y crea políticas públicas o solo con autenticación
- ⚠️ **RIESGO ALTO**: Las políticas actuales NO validan `org_id` en absoluto, solo verifican autenticación

**Líneas críticas**:
```sql:66:77:supabase/migrations/20250127_fix_storage_buckets_and_policies.sql
-- ✅ Política para lectura pública de artifacts
CREATE POLICY "public_artifacts_select" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'artifacts');

-- ✅ Política para inserción: Solo usuarios autenticados dentro de su org
CREATE POLICY "authenticated_users_can_upload_artifacts" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated'
);
```

**Análisis de riesgo**:
- **CRÍTICO**: Las políticas actuales permiten acceso público o solo verifican autenticación
- **NO** validan `org_id` en metadata como requiere el Día 2
- Cualquier usuario autenticado puede acceder a cualquier archivo

---

### 3.2. Código que sube archivos a Storage

#### 3.2.1. `src/app/api/upload/pdf/route.ts`
**Estado actual**:
- ⚠️ **PROBLEMA**: No incluye `org_id` en metadata al subir archivos
- ⚠️ **RIESGO**: Aunque se implementen políticas que validen metadata, los archivos existentes no tendrán `org_id` en metadata

**Líneas críticas**:
```typescript:213:218:src/app/api/upload/pdf/route.ts
// Subir archivo a Supabase Storage
const { error: uploadError } = await supabase.storage
  .from('artifacts')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false
  });
```

**Análisis de riesgo**:
- No se pasa `metadata` con `org_id` al subir archivos
- Las políticas que validen metadata no funcionarán para archivos subidos sin metadata

---

## 🔧 PLAN DE IMPLEMENTACIÓN QUIRÚRGICO - FASE 3

### Paso 3.1: Crear nueva migración para políticas de storage con validación por `org_id` en metadata

**Archivo nuevo**: `supabase/migrations/20250202_storage_policies_org_metadata.sql`

**Estrategia**:
1. Eliminar políticas actuales que no validan `org_id` en metadata
2. Crear nuevas políticas que validen `org_id` en metadata
3. Mantener compatibilidad con archivos temporales (path `temp/{userId}/...`)

**Código completo de la migración**:
```sql
-- =====================================================
-- MIGRACIÓN: POLÍTICAS DE STORAGE CON VALIDACIÓN POR ORG_ID EN METADATA
-- Objetivo: Implementar reglas de acceso a buckets por org_id en metadata (Día 2)
-- Fecha: 2025-02-02
-- Prioridad: ALTA - Requisito crítico del Día 2
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR POLÍTICAS ACTUALES QUE NO VALIDAN ORG_ID EN METADATA
-- =====================================================

-- Eliminar políticas públicas o que solo validan autenticación
DROP POLICY IF EXISTS "public_artifacts_select" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_upload_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_update_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_delete_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "public_proposals_select" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_upload_proposals" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_update_proposals" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_delete_proposals" ON storage.objects;
DROP POLICY IF EXISTS "public_temp_select" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_upload_temp" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_users_can_delete_temp" ON storage.objects;

-- Eliminar políticas antiguas que validan por path (si existen)
DROP POLICY IF EXISTS "org_members_can_upload_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "org_members_can_view_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "org_members_can_update_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "org_admins_can_delete_artifacts" ON storage.objects;
DROP POLICY IF EXISTS "artifacts_temp_insert" ON storage.objects;
DROP POLICY IF EXISTS "artifacts_temp_select" ON storage.objects;
DROP POLICY IF EXISTS "artifacts_temp_delete" ON storage.objects;
DROP POLICY IF EXISTS "artifacts_org_insert" ON storage.objects;
DROP POLICY IF EXISTS "artifacts_org_select" ON storage.objects;
DROP POLICY IF EXISTS "artifacts_org_delete" ON storage.objects;

-- =====================================================
-- PASO 2: POLÍTICAS PARA BUCKET ARTIFACTS CON VALIDACIÓN POR ORG_ID EN METADATA
-- =====================================================

-- SELECT: Usuarios pueden ver archivos de su organización (validado por org_id en metadata)
-- O archivos temporales del usuario (path temp/{userId}/...)
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

-- INSERT: Usuarios pueden subir archivos con org_id en metadata
-- O archivos temporales del usuario (path temp/{userId}/...)
CREATE POLICY "artifacts_org_metadata_insert" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated' AND
    (
        -- Validar org_id en metadata
        (metadata->>'org_id')::uuid IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid()
        )
        OR
        -- Permitir subida a temp del usuario
        (split_part(name, '/', 1) = 'temp' AND split_part(name, '/', 2) = auth.uid()::text)
    )
);

-- UPDATE: Usuarios pueden actualizar archivos de su organización (validado por org_id en metadata)
CREATE POLICY "artifacts_org_metadata_update" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated' AND
    (metadata->>'org_id')::uuid IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    )
);

-- DELETE: Solo admins y owners pueden eliminar archivos de su organización
-- O usuarios pueden eliminar sus archivos temporales
CREATE POLICY "artifacts_org_metadata_delete" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated' AND
    (
        -- Admins/owners de la org en metadata
        (metadata->>'org_id')::uuid IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
        OR
        -- Usuario puede eliminar sus archivos temporales
        (split_part(name, '/', 1) = 'temp' AND split_part(name, '/', 2) = auth.uid()::text)
    )
);

-- =====================================================
-- PASO 3: POLÍTICAS PARA BUCKET PROPOSALS CON VALIDACIÓN POR ORG_ID EN METADATA
-- =====================================================

-- SELECT: Usuarios pueden ver propuestas de su organización (validado por org_id en metadata)
CREATE POLICY "proposals_org_metadata_select" 
ON storage.objects FOR SELECT 
USING (
    bucket_id = 'proposals' AND
    auth.role() = 'authenticated' AND
    (metadata->>'org_id')::uuid IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    )
);

-- INSERT: Usuarios pueden subir propuestas con org_id en metadata
CREATE POLICY "proposals_org_metadata_insert" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'proposals' AND
    auth.role() = 'authenticated' AND
    (metadata->>'org_id')::uuid IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    )
);

-- UPDATE: Usuarios pueden actualizar propuestas de su organización (validado por org_id en metadata)
CREATE POLICY "proposals_org_metadata_update" 
ON storage.objects FOR UPDATE 
USING (
    bucket_id = 'proposals' AND
    auth.role() = 'authenticated' AND
    (metadata->>'org_id')::uuid IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    )
);

-- DELETE: Solo admins y owners pueden eliminar propuestas
CREATE POLICY "proposals_org_metadata_delete" 
ON storage.objects FOR DELETE 
USING (
    bucket_id = 'proposals' AND
    auth.role() = 'authenticated' AND
    (metadata->>'org_id')::uuid IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    )
);

-- =====================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON POLICY "artifacts_org_metadata_select" ON storage.objects IS 
'Usuarios pueden ver artifacts de su organización (validado por org_id en metadata) o archivos temporales propios';

COMMENT ON POLICY "artifacts_org_metadata_insert" ON storage.objects IS 
'Usuarios pueden subir artifacts con org_id en metadata o archivos temporales propios';

COMMENT ON POLICY "proposals_org_metadata_select" ON storage.objects IS 
'Usuarios pueden ver propuestas de su organización (validado por org_id en metadata)';

COMMENT ON POLICY "proposals_org_metadata_insert" ON storage.objects IS 
'Usuarios pueden subir propuestas con org_id en metadata';
```

**Justificación**:
- Elimina políticas antiguas que no cumplen el requisito
- Crea nuevas políticas que validan `org_id` en metadata
- Mantiene compatibilidad con archivos temporales (path-based)
- Cumple con el requisito explícito del Día 2

**Riesgo de romper funcionalidades**: **ALTO**
- **CRÍTICO**: Los archivos existentes que NO tienen `org_id` en metadata NO serán accesibles
- **MITIGACIÓN**: 
  1. Antes de aplicar esta migración, actualizar metadata de archivos existentes (ver Fase 4)
  2. O crear política temporal que permita acceso a archivos sin metadata durante transición
  3. Documentar archivos afectados

---

## ✅ CRITERIOS DE ACEPTACIÓN - FASE 3

1. ✅ Las políticas de storage validan `org_id` en metadata de los objetos
2. ✅ Solo miembros de la organización pueden acceder a archivos de su organización
3. ✅ Los archivos temporales (path `temp/{userId}/...`) siguen siendo accesibles
4. ✅ Las políticas se aplican a buckets `artifacts` y `proposals`

---

## 🧪 PLAN DE PRUEBAS - FASE 3

### Prueba 3.1: Subir archivo con `org_id` en metadata
**Acción**: Subir archivo con `org_id` válido en metadata  
**Resultado esperado**: Archivo subido exitosamente, accesible solo por miembros de la organización

### Prueba 3.2: Intentar acceder a archivo de otra organización
**Acción**: Usuario de Org A intenta acceder a archivo de Org B  
**Resultado esperado**: Acceso denegado (error 403 o similar)

### Prueba 3.3: Subir archivo sin `org_id` en metadata
**Acción**: Subir archivo sin incluir `org_id` en metadata  
**Resultado esperado**: Acceso denegado o error (dependiendo de la política)

### Prueba 3.4: Acceder a archivo temporal propio
**Acción**: Usuario accede a archivo en `temp/{userId}/...`  
**Resultado esperado**: Acceso permitido (compatibilidad con archivos temporales)

---

## ⚠️ RIESGOS IDENTIFICADOS Y MITIGACIÓN - FASE 3

### Riesgo 3.1: Archivos existentes sin `org_id` en metadata
**Probabilidad**: ALTA  
**Impacto**: ALTO  
**Mitigación**: 
- **CRÍTICO**: Antes de aplicar esta migración, actualizar metadata de archivos existentes
- Crear script de migración de metadata (ver Fase 4)
- O crear política temporal que permita acceso durante transición

### Riesgo 3.2: Archivos subidos antes de Fase 4 (sin metadata)
**Probabilidad**: ALTA  
**Impacto**: ALTO  
**Mitigación**: 
- Aplicar Fase 4 ANTES de Fase 3 (actualizar código de subida primero)
- O aplicar ambas fases en el mismo deployment

### Riesgo 3.3: Performance de validación de metadata
**Probabilidad**: Media  
**Impacto**: Bajo  
**Mitigación**: 
- Las políticas usan índices en `org_members` (ya existen)
- Validación de metadata es eficiente en PostgreSQL

---

# FASE 4: ACTUALIZACIÓN DE CÓDIGO DE SUBIDA DE ARCHIVOS PARA INCLUIR `org_id` EN METADATA

## 🎯 OBJETIVO DE LA FASE 4

Actualizar todo el código que sube archivos a Storage para incluir `org_id` en metadata, asegurando que todos los archivos nuevos tengan `org_id` en metadata desde el momento de la subida.

---

## 📊 ANÁLISIS EXHAUSTIVO DE ARCHIVOS AFECTADOS

### 4.1. Archivos que suben archivos a Storage

#### 4.1.1. `src/app/api/upload/pdf/route.ts` - Modo persistente
**Estado actual**:
- ⚠️ **PROBLEMA**: No incluye `org_id` en metadata al subir archivos (líneas 213-218)
- ⚠️ **RIESGO**: Los archivos subidos no tendrán `org_id` en metadata, las políticas de Fase 3 no funcionarán

**Líneas críticas**:
```typescript:213:218:src/app/api/upload/pdf/route.ts
// Subir archivo a Supabase Storage
const { error: uploadError } = await supabase.storage
  .from('artifacts')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false
  });
```

**Análisis de riesgo**:
- `orgId` está disponible en el scope (línea 63, 148)
- No se pasa en metadata al subir archivo
- Las políticas de Fase 3 no funcionarán para estos archivos

---

#### 4.1.2. `src/app/api/upload/pdf/route.ts` - Modo temporal
**Estado actual**:
- ⚠️ **PROBLEMA**: No incluye metadata al subir archivos temporales (líneas 88-93)
- ⚠️ **RIESGO**: Similar al anterior, pero para archivos temporales

**Líneas críticas**:
```typescript:88:93:src/app/api/upload/pdf/route.ts
const { error: uploadError } = await supabase.storage
  .from('artifacts')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false
  });
```

**Análisis de riesgo**:
- Archivos temporales no tienen `org_id` en metadata
- Las políticas de Fase 3 permiten acceso a `temp/{userId}/...` por path, pero es mejor incluir metadata también

---

### 4.2. Otros archivos que podrían subir archivos

**Acción requerida**: Buscar en el codebase otros lugares donde se suban archivos a Storage.

**Archivos a revisar**:
- Cualquier componente que use `supabase.storage.from().upload()`
- Cualquier API que maneje uploads

---

## 🔧 PLAN DE IMPLEMENTACIÓN QUIRÚRGICO - FASE 4

### Paso 4.1: Actualizar `src/app/api/upload/pdf/route.ts` - Modo persistente

**Ubicación**: Línea 213 (modificar la llamada a `upload`)

**Código actual**:
```typescript
const { error: uploadError } = await supabase.storage
  .from('artifacts')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false
  });
```

**Código nuevo**:
```typescript
// ✅ AÑADIR: Incluir org_id en metadata para validación de políticas
const { error: uploadError } = await supabase.storage
  .from('artifacts')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    metadata: {
      org_id: orgId, // ✅ REQUERIDO: Para validación de políticas de storage
      case_id: caseId,
      uploaded_by: user.id,
      file_name: file.name,
      content_type: file.type,
      uploaded_at: new Date().toISOString(),
    }
  });
```

**Justificación**:
- Incluye `org_id` en metadata como requiere el Día 2
- Incluye metadata adicional útil para auditoría y debugging
- Las políticas de Fase 3 funcionarán correctamente

**Riesgo de romper funcionalidades**: **BAJO**
- Solo añade metadata, no modifica lógica existente
- Si hay código que lee metadata, ahora tendrá más información disponible

---

### Paso 4.2: Actualizar `src/app/api/upload/pdf/route.ts` - Modo temporal

**Ubicación**: Línea 88 (modificar la llamada a `upload`)

**Código actual**:
```typescript
const { error: uploadError } = await supabase.storage
  .from('artifacts')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false
  });
```

**Código nuevo**:
```typescript
// ✅ AÑADIR: Incluir metadata incluso para archivos temporales (mejor práctica)
// Nota: org_id puede ser null en modo temporal, pero incluimos user_id para tracking
const { error: uploadError } = await supabase.storage
  .from('artifacts')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    metadata: {
      uploaded_by: user.id,
      file_name: file.name,
      content_type: file.type,
      uploaded_at: new Date().toISOString(),
      is_temporary: 'true', // Flag para identificar archivos temporales
    }
  });
```

**Justificación**:
- Incluye metadata útil incluso para archivos temporales
- No incluye `org_id` porque puede no estar disponible en modo temporal
- Las políticas de Fase 3 permiten acceso a `temp/{userId}/...` por path, así que esto es compatible

**Riesgo de romper funcionalidades**: **BAJO**
- Similar al paso anterior

---

### Paso 4.3: Buscar y actualizar otros lugares donde se suban archivos

**Acción**: Buscar en el codebase otros usos de `supabase.storage.from().upload()`

**Comando de búsqueda**:
```bash
grep -r "storage\.from.*upload" src/
```

**Si se encuentran otros lugares**:
- Aplicar el mismo patrón: incluir `org_id` en metadata cuando esté disponible
- Documentar los archivos actualizados

**Riesgo de romper funcionalidades**: **BAJO**
- Solo añade metadata, no modifica lógica

---

### Paso 4.4: (OPCIONAL) Script de migración de metadata para archivos existentes

**Archivo nuevo**: `supabase/migrations/20250202_update_existing_storage_metadata.sql`

**Propósito**: Actualizar metadata de archivos existentes que no tienen `org_id`

**Estrategia**:
1. Identificar archivos sin `org_id` en metadata
2. Extraer `org_id` del path del archivo (formato: `{orgId}/{caseId}/...`)
3. Actualizar metadata con `org_id`

**Código**:
```sql
-- =====================================================
-- MIGRACIÓN: ACTUALIZAR METADATA DE ARCHIVOS EXISTENTES
-- Objetivo: Añadir org_id a metadata de archivos existentes que no lo tienen
-- Fecha: 2025-02-02
-- Prioridad: MEDIA - Solo necesario si hay archivos existentes sin metadata
-- =====================================================

-- Función helper para actualizar metadata de archivos existentes
DO $$
DECLARE
    file_record RECORD;
    org_id_from_path TEXT;
    case_id_from_path TEXT;
    updated_count INTEGER := 0;
BEGIN
    -- Iterar sobre archivos en bucket 'artifacts' que no tienen org_id en metadata
    FOR file_record IN
        SELECT 
            id,
            name,
            metadata
        FROM storage.objects
        WHERE bucket_id = 'artifacts'
        AND (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '')
        AND name NOT LIKE 'temp/%' -- Excluir archivos temporales
    LOOP
        -- Extraer org_id del path (formato: {orgId}/{caseId}/...)
        org_id_from_path := split_part(file_record.name, '/', 1);
        case_id_from_path := split_part(file_record.name, '/', 2);
        
        -- Validar que org_id_from_path es un UUID válido
        IF org_id_from_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            -- Actualizar metadata con org_id
            UPDATE storage.objects
            SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'org_id', org_id_from_path,
                'case_id', case_id_from_path,
                'migrated_at', now()::text
            )
            WHERE id = file_record.id;
            
            updated_count := updated_count + 1;
        ELSE
            RAISE NOTICE '⚠️ Archivo con path inválido (no UUID): %', file_record.name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Archivos actualizados: %', updated_count;
END $$;
```

**Justificación**:
- Actualiza archivos existentes para que tengan `org_id` en metadata
- Permite que las políticas de Fase 3 funcionen con archivos existentes
- Solo se ejecuta si hay archivos sin metadata

**Riesgo de romper funcionalidades**: **MEDIO**
- Modifica metadata de archivos existentes
- **MITIGACIÓN**: 
  - Ejecutar en modo de solo lectura primero para ver qué archivos se actualizarían
  - Hacer backup de metadata antes de actualizar
  - Documentar archivos actualizados

---

## ✅ CRITERIOS DE ACEPTACIÓN - FASE 4

1. ✅ Todos los archivos nuevos subidos a Storage incluyen `org_id` en metadata (cuando está disponible)
2. ✅ Los archivos temporales incluyen metadata útil (aunque no `org_id`)
3. ✅ Las políticas de Fase 3 funcionan correctamente con archivos nuevos
4. ✅ (Opcional) Los archivos existentes tienen `org_id` en metadata después de la migración

---

## 🧪 PLAN DE PRUEBAS - FASE 4

### Prueba 4.1: Subir archivo y verificar metadata
**Acción**: Subir archivo y verificar que tiene `org_id` en metadata  
**Resultado esperado**: Archivo tiene `org_id` en metadata, accesible según políticas de Fase 3

### Prueba 4.2: Subir archivo temporal y verificar metadata
**Acción**: Subir archivo temporal y verificar metadata  
**Resultado esperado**: Archivo tiene metadata útil (aunque no `org_id`), accesible por path

### Prueba 4.3: Verificar que políticas funcionan con archivos nuevos
**Acción**: Subir archivo con `org_id` en metadata y verificar acceso  
**Resultado esperado**: Acceso permitido solo para miembros de la organización

---

## ⚠️ RIESGOS IDENTIFICADOS Y MITIGACIÓN - FASE 4

### Riesgo 4.1: Archivos existentes sin `org_id` en metadata
**Probabilidad**: ALTA  
**Impacto**: ALTO  
**Mitigación**: 
- Aplicar script de migración de metadata (Paso 4.4)
- O aplicar Fase 3 después de Fase 4 (solo archivos nuevos tendrán metadata)

### Riesgo 4.2: Performance de actualización de metadata
**Probabilidad**: Baja  
**Impacto**: Bajo  
**Mitigación**: 
- La actualización de metadata es eficiente en PostgreSQL
- Si hay muchos archivos, ejecutar en batches

---

# RESUMEN EJECUTIVO DEL PLAN

## 📊 FASES Y ORDEN DE EJECUCIÓN

1. **FASE 1**: Robustecimiento de la tabla `cases` y validación de `orgId`
2. **FASE 2**: Robustecimiento de la tabla `artifacts` y validación de `fileId`
3. **FASE 4**: Actualización de código de subida de archivos para incluir `org_id` en metadata
4. **FASE 3**: Implementación de políticas de storage con validación por `org_id` en metadata

**NOTA IMPORTANTE**: Fase 4 debe ejecutarse ANTES de Fase 3 para asegurar que los archivos nuevos tengan metadata desde el inicio.

---

## 🎯 OBJETIVOS CUMPLIDOS AL FINALIZAR TODAS LAS FASES

1. ✅ Tabla `cases` con validación robusta de `orgId`
2. ✅ Tabla `artifacts` con validación robusta de `fileId`
3. ✅ Buckets `artifacts/` y `proposals/` con políticas que validan `org_id` en metadata
4. ✅ Código de subida de archivos incluye `org_id` en metadata
5. ✅ Aceptación del Día 2: Subir PDF de prueba y registrar fila en artifacts con provenance

---

## ⚠️ RIESGOS GLOBALES Y MITIGACIÓN

### Riesgo Global 1: Romper funcionalidades existentes
**Probabilidad**: Media  
**Impacto**: Alto  
**Mitigación**: 
- Análisis exhaustivo de archivos afectados antes de cada fase
- Validación humana entre fases
- Plan de pruebas exhaustivo
- Rollback plan para cada fase

### Riesgo Global 2: Archivos existentes sin metadata
**Probabilidad**: Alta  
**Impacto**: Alto  
**Mitigación**: 
- Aplicar Fase 4 antes de Fase 3
- Script de migración de metadata para archivos existentes
- Políticas compatibles con archivos sin metadata durante transición

---

## 📝 NOTAS FINALES

- Este plan está diseñado para ser ejecutado **FASE POR FASE**, esperando confirmación del desarrollador después de cada fase.
- Cada fase incluye análisis exhaustivo, plan de implementación quirúrgico, criterios de aceptación, plan de pruebas, y análisis de riesgos.
- El enfoque es **quirúrgico y riguroso**, priorizando no romper funcionalidades existentes.
- Se mantienen los principios de trabajo: reutilización máxima, arquitectura dual, estado unidireccional, y separación de responsabilidades.

---

**Última actualización**: 2 de Febrero, 2025  
**Estado**: ✅ PLAN COMPLETO - LISTO PARA EJECUCIÓN FASE POR FASE  
**Próximo paso**: Ejecutar FASE 1 y esperar confirmación

