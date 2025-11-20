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

**Ubicación**: Línea 223 (modificar la llamada a `upload`)

**Código actual**:
```typescript:221:236:src/app/api/upload/pdf/route.ts
// ✅ FASE 4: Incluir org_id en metadata para validación de políticas de storage
// Esto asegura que las políticas de Fase 3 funcionen correctamente
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

**Código corregido**:
```typescript
// ✅ FASE 4 CORREGIDA: Incluir org_id en metadata con conversión explícita a strings
// CRÍTICO: Supabase Storage requiere que TODOS los valores de metadata sean strings
// Los UUIDs deben convertirse explícitamente usando String() para evitar valores null
const { error: uploadError } = await supabase.storage
  .from('artifacts')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    metadata: {
      org_id: String(orgId),        // ✅ CRÍTICO: Conversión explícita a string
      case_id: String(caseId),      // ✅ CRÍTICO: Conversión explícita a string
      uploaded_by: String(user.id), // ✅ CRÍTICO: Conversión explícita a string
      file_name: String(file.name), // ✅ Ya es string, pero explícito para consistencia
      content_type: String(file.type), // ✅ Ya es string, pero explícito para consistencia
      uploaded_at: new Date().toISOString(), // ✅ Ya es string (ISO format)
    }
  });
```

**Justificación técnica**:
- **CRÍTICO**: Supabase Storage almacena metadata como JSONB en PostgreSQL
- Los UUIDs pasados directamente pueden no convertirse correctamente, resultando en `null`
- La conversión explícita con `String()` garantiza que los valores se almacenen como strings
- Las políticas de Fase 3 dependen de `metadata->>'org_id'` siendo un UUID válido en formato string
- Sin esta conversión, las políticas fallarán porque `org_id` será `null` en metadata

**Análisis de riesgo de romper funcionalidades**: **BAJO**
- Solo mejora la conversión de tipos, no modifica lógica existente
- Si hay código que lee metadata, ahora tendrá valores garantizados como strings
- Previene errores silenciosos donde metadata se guarda como `null`

**Archivos afectados**:
- `src/app/api/upload/pdf/route.ts` (líneas 228-235)

---

### Paso 4.2: Actualizar `src/app/api/upload/pdf/route.ts` - Modo temporal

**Ubicación**: Línea 90 (modificar la llamada a `upload`)

**Código actual**:
```typescript:88:102:src/app/api/upload/pdf/route.ts
// ✅ FASE 4: Incluir metadata incluso para archivos temporales (mejor práctica)
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

**Código corregido**:
```typescript
// ✅ FASE 4 CORREGIDA: Incluir metadata incluso para archivos temporales con conversión explícita
// CRÍTICO: Todos los valores de metadata deben ser strings explícitos
// Nota: org_id no se incluye en modo temporal (no está disponible), pero user_id sí
const { error: uploadError } = await supabase.storage
  .from('artifacts')
  .upload(storagePath, file, {
    cacheControl: '3600',
    upsert: false,
    metadata: {
      uploaded_by: String(user.id), // ✅ CRÍTICO: Conversión explícita a string
      file_name: String(file.name), // ✅ Ya es string, pero explícito para consistencia
      content_type: String(file.type), // ✅ Ya es string, pero explícito para consistencia
      uploaded_at: new Date().toISOString(), // ✅ Ya es string (ISO format)
      is_temporary: 'true', // ✅ Ya es string literal
    }
  });
```

**Justificación técnica**:
- Similar al Paso 4.1: conversión explícita de UUIDs a strings
- `user.id` es un UUID que debe convertirse explícitamente
- Los demás valores ya son strings, pero la conversión explícita garantiza consistencia
- Las políticas de Fase 3 permiten acceso a `temp/{userId}/...` por path, pero metadata correcta es mejor práctica

**Análisis de riesgo de romper funcionalidades**: **BAJO**
- Similar al paso anterior
- Previene errores silenciosos en metadata

**Archivos afectados**:
- `src/app/api/upload/pdf/route.ts` (líneas 95-101)

---

### Paso 4.3: Buscar y actualizar otros lugares donde se suban archivos

**Acción**: Buscar en el codebase otros usos de `supabase.storage.from().upload()`

**Resultado de búsqueda**:
- ✅ **Único lugar encontrado**: `src/app/api/upload/pdf/route.ts`
- ✅ No hay otros lugares donde se suban archivos a Storage

**Conclusión**: Solo se requiere actualizar `upload/pdf/route.ts` (ya cubierto en Pasos 4.1 y 4.2).

**Riesgo de romper funcionalidades**: **NULO**
- No hay otros archivos que actualizar

---

### Paso 4.5: Análisis exhaustivo de correspondencia artifacts ↔ Storage (NUEVO - REQUERIDO)

**Propósito**: Identificar TODOS los archivos que requieren migración de metadata

**Estado actual**:
- ⚠️ **DISCREPANCIA**: 23 artifacts en BD vs 8 archivos sin metadata en Storage
- ⚠️ **ACCIÓN CRÍTICA**: Ejecutar queries de análisis antes de migrar

**Queries de análisis** (ver `docs/ANALISIS_DISCREPANCIA_ARTIFACTS_STORAGE.md`):

#### Query A: Análisis de artifacts por sourceType
```sql
SELECT 
    source_type,
    COUNT(*) FILTER (WHERE file_id IS NOT NULL AND file_id != '') as con_file_id,
    COUNT(*) FILTER (WHERE file_id IS NULL OR file_id = '') as sin_file_id,
    COUNT(*) as total
FROM public.artifacts
GROUP BY source_type
ORDER BY source_type;
```

#### Query B: Artifacts persistentes que requieren migración
```sql
SELECT 
    a.id as artifact_id,
    a.source_type,
    a.file_id,
    a.file_name,
    a.created_at,
    split_part(a.file_id, '/', 1) as org_id_del_path,
    split_part(a.file_id, '/', 2) as case_id_del_path
FROM public.artifacts a
INNER JOIN storage.objects o ON o.bucket_id = 'artifacts' AND o.name = a.file_id
WHERE a.file_id IS NOT NULL 
AND a.file_id != ''
AND a.file_id NOT LIKE 'temp/%'
AND (o.metadata->>'org_id' IS NULL OR o.metadata->>'org_id' = '')
ORDER BY a.created_at DESC;
```

**Resultado esperado**: Lista completa de artifacts cuyos archivos requieren migración

---

### Paso 4.6: Script de migración de metadata para archivos existentes (REQUERIDO)

**Archivo**: `supabase/migrations/20250202_update_existing_storage_metadata.sql`

**Propósito**: Actualizar metadata de TODOS los archivos persistentes que no tienen `org_id`

**Estado actual**:
- ⚠️ **ACCIÓN REQUERIDA**: Ejecutar queries de análisis primero (Paso 4.5)
- ⚠️ **ACCIÓN REQUERIDA**: Verificar cantidad exacta de archivos a migrar
- ✅ Script listo para ejecutar

**Estrategia**:
1. Ejecutar queries de análisis (Paso 4.5) para identificar todos los archivos
2. Verificar que el script migrará TODOS los archivos persistentes sin metadata
3. Extraer `org_id` del path del archivo (formato: `{orgId}/{caseId}/...`)
4. Actualizar metadata con `org_id` (convertido a string)
5. Verificar que la migración fue exitosa

**Código**:
```sql
-- =====================================================
-- MIGRACIÓN: ACTUALIZAR METADATA DE ARCHIVOS EXISTENTES
-- Objetivo: Añadir org_id a metadata de archivos existentes que no lo tienen
-- Fecha: 2025-02-02
-- Prioridad: ALTA - Requerido antes de aplicar FASE 3
-- Estado: 8 archivos identificados sin metadata
-- =====================================================

-- Función helper para actualizar metadata de archivos existentes
DO $$
DECLARE
    file_record RECORD;
    org_id_from_path TEXT;
    case_id_from_path TEXT;
    updated_count INTEGER := 0;
    skipped_count INTEGER := 0;
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
            -- Actualizar metadata con org_id (CRÍTICO: convertir a string explícitamente)
            UPDATE storage.objects
            SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'org_id', org_id_from_path::text,  -- ✅ CRÍTICO: Asegurar que sea string
                'case_id', case_id_from_path::text, -- ✅ CRÍTICO: Asegurar que sea string
                'migrated_at', now()::text
            )
            WHERE id = file_record.id;
            
            updated_count := updated_count + 1;
            RAISE NOTICE '✅ Archivo actualizado: % (org_id: %)', file_record.name, org_id_from_path;
        ELSE
            skipped_count := skipped_count + 1;
            RAISE NOTICE '⚠️ Archivo con path inválido (no UUID): %', file_record.name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Migración completada:';
    RAISE NOTICE '   - Archivos actualizados: %', updated_count;
    RAISE NOTICE '   - Archivos omitidos (path inválido): %', skipped_count;
END $$;
```

**Query de verificación post-migración**:
```sql
-- Verificar que todos los archivos ahora tienen org_id en metadata
SELECT 
    COUNT(*) FILTER (
        WHERE metadata->>'org_id' IS NOT NULL 
        AND metadata->>'org_id' != '' 
        AND name NOT LIKE 'temp/%'
    ) as con_metadata_despues,
    COUNT(*) FILTER (
        WHERE (metadata->>'org_id' IS NULL OR metadata->>'org_id' = '') 
        AND name NOT LIKE 'temp/%'
    ) as sin_metadata_despues
FROM storage.objects
WHERE bucket_id = 'artifacts';
```

**Resultado esperado después de migración**:
- `con_metadata_despues`: 8 (todos los archivos migrados)
- `sin_metadata_despues`: 0 (ningún archivo sin metadata)

**Justificación**:
- Actualiza archivos existentes para que tengan `org_id` en metadata
- Permite que las políticas de Fase 3 funcionen con archivos existentes
- Solo se ejecuta si hay archivos sin metadata

**Riesgo de romper funcionalidades**: **BAJO**
- Solo afecta 8 archivos (volumen pequeño)
- Modifica metadata de archivos existentes
- **MITIGACIÓN**: 
  - ✅ Solo 8 archivos afectados (fácil de verificar)
  - Hacer backup de metadata antes de actualizar (opcional, pero recomendado)
  - Verificar que la migración fue exitosa con query de verificación
  - **CRÍTICO**: Asegurar que los valores extraídos del path también se conviertan a strings en el script SQL (ya corregido)

**Pasos de ejecución**:
1. Ejecutar script de migración en Supabase Dashboard (SQL Editor)
2. Verificar resultado con query de verificación post-migración
3. Confirmar que `con_metadata_despues = 8` y `sin_metadata_despues = 0`
4. Proceder con FASE 3

---

### Paso 4.4: Validación post-upload de metadata (NUEVO)

**Ubicación**: Después de la línea 244 (después de subir a Storage, antes de crear artifact)

**Código a añadir**:
```typescript
// ✅ VALIDACIÓN POST-UPLOAD: Verificar que metadata se guardó correctamente
// Esto asegura que las políticas de Fase 3 funcionen correctamente
if (uploadError === null) {
  try {
    const { data: fileData, error: metadataError } = await supabase.storage
      .from('artifacts')
      .list(storagePath.split('/').slice(0, -1).join('/'), {
        limit: 1,
        search: storagePath.split('/').pop()
      });
    
    if (metadataError) {
      console.warn('⚠️ [API/upload/pdf] No se pudo verificar metadata después de upload:', metadataError);
      // No fallar la operación, pero registrar advertencia
    } else if (fileData && fileData.length > 0) {
      const uploadedFile = fileData[0];
      const metadataOrgId = uploadedFile.metadata?.org_id;
      
      if (!metadataOrgId || metadataOrgId === 'null' || metadataOrgId === 'undefined') {
        console.error('❌ [API/upload/pdf] CRÍTICO: org_id en metadata es null o inválido después de upload');
        console.error('   Metadata completa:', uploadedFile.metadata);
        // Esto indica un problema crítico que debe investigarse
        // Las políticas de Fase 3 no funcionarán para este archivo
      } else {
        console.log('✅ [API/upload/pdf] Metadata verificada correctamente, org_id:', metadataOrgId);
      }
    }
  } catch (verifyError) {
    console.warn('⚠️ [API/upload/pdf] Error al verificar metadata (no crítico):', verifyError);
    // No fallar la operación completa si la verificación falla
  }
}
```

**Justificación**:
- Detecta problemas de metadata inmediatamente después del upload
- Permite identificar si la conversión a strings funcionó correctamente
- Proporciona logs útiles para debugging
- No bloquea la operación si la verificación falla (no crítico)

**Riesgo de romper funcionalidades**: **BAJO**
- Solo añade verificación, no modifica lógica existente
- Si la verificación falla, solo registra advertencia, no bloquea

---

## ✅ CRITERIOS DE ACEPTACIÓN - FASE 4 (ACTUALIZADOS)

1. ✅ Todos los archivos nuevos subidos a Storage incluyen `org_id` en metadata (cuando está disponible)
2. ✅ **CRÍTICO**: Todos los valores UUID en metadata se convierten explícitamente a strings usando `String()`
3. ✅ Los archivos temporales incluyen metadata útil con valores convertidos explícitamente a strings
4. ✅ **NUEVO**: Se valida post-upload que metadata se guardó correctamente (opcional, no bloquea)
5. ✅ Las políticas de Fase 3 funcionan correctamente con archivos nuevos
6. ✅ (Opcional) Los archivos existentes tienen `org_id` en metadata después de la migración

---

## 🧪 PLAN DE PRUEBAS - FASE 4

### Prueba 4.1: Subir archivo y verificar metadata
**Acción**: Subir archivo y verificar que tiene `org_id` en metadata  
**Resultado esperado**: Archivo tiene `org_id` en metadata, accesible según políticas de Fase 3

### Prueba 4.2: Subir archivo temporal y verificar metadata
**Acción**: Subir archivo temporal y verificar metadata  
**Resultado esperado**: Archivo tiene metadata útil (aunque no `org_id`), accesible por path

### Prueba 4.3: Verificar que metadata se guarda correctamente
**Acción**: Subir archivo y verificar en Supabase Dashboard que `org_id` en metadata NO es `null`  
**Resultado esperado**: `org_id`, `case_id`, `uploaded_by` en metadata son strings válidos (no `null`)

### Prueba 4.4: Verificar que políticas funcionan con archivos nuevos
**Acción**: Subir archivo con `org_id` en metadata y verificar acceso  
**Resultado esperado**: Acceso permitido solo para miembros de la organización

### Prueba 4.5: Verificar conversión de UUIDs a strings
**Acción**: Subir archivo y verificar en Supabase Dashboard que todos los valores UUID en metadata son strings  
**Resultado esperado**: `org_id`, `case_id`, `uploaded_by` son strings (no objetos o null)

---

## ⚠️ RIESGOS IDENTIFICADOS Y MITIGACIÓN - FASE 4

### Riesgo 4.1: UUIDs no convertidos correctamente a strings
**Probabilidad**: ALTA (si no se corrige)  
**Impacto**: **CRÍTICO** - Las políticas de Fase 3 no funcionarán  
**Mitigación**: 
- ✅ **IMPLEMENTADO**: Conversión explícita usando `String()` para todos los UUIDs
- Validación post-upload para detectar problemas inmediatamente
- Logs detallados para debugging

### Riesgo 4.2: Archivos existentes sin `org_id` en metadata
**Probabilidad**: ALTA  
**Impacto**: ALTO  
**Mitigación**: 
- Aplicar script de migración de metadata (Paso 4.5)
- O aplicar Fase 3 después de Fase 4 (solo archivos nuevos tendrán metadata)

### Riesgo 4.3: Performance de actualización de metadata
**Probabilidad**: Baja  
**Impacto**: Bajo  
**Mitigación**: 
- La actualización de metadata es eficiente en PostgreSQL
- Si hay muchos archivos, ejecutar en batches

### Riesgo 4.4: Metadata no se guarda correctamente (valores null)
**Probabilidad**: Media (sin corrección)  
**Impacto**: **CRÍTICO** - Políticas de Fase 3 fallarán  
**Mitigación**: 
- ✅ **IMPLEMENTADO**: Conversión explícita a strings
- ✅ **IMPLEMENTADO**: Validación post-upload (opcional)
- Logs detallados para identificar problemas

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

---

# 📊 ANÁLISIS EXHAUSTIVO POST-IMPLEMENTACIÓN

## 🔍 VERIFICACIÓN DE ESTADO ACTUAL DE IMPLEMENTACIÓN

### ✅ FASE 1: Validación de `orgId` en `cases` - **COMPLETA**

**Archivos verificados y estado**:
- ✅ `src/app/api/cases/create/route.ts` (líneas 115-122): Validación explícita implementada
- ✅ `src/app/api/chat/start/route.ts` (líneas 61-68): Validación explícita implementada
- ✅ `src/lib/database.ts` - `createCaseWithOrg` (líneas 474-477): Validación robusta implementada
- ✅ `src/app/api/cases/update/route.ts`: No actualiza `orgId` (solo verifica pertenencia) - **PROTEGIDO**

**Conclusión**: FASE 1 completamente implementada y funcional.

---

### ✅ FASE 2: Validación de `fileId` en `artifacts` - **COMPLETA**

**Archivos verificados y estado**:
- ✅ `src/app/api/upload/pdf/route.ts` (líneas 248-255): Validación de `storagePath` implementada
- ✅ `src/app/api/cases/create/route.ts` (líneas 236-244): Validación de `tempUpload.storagePath` implementada
- ✅ `src/app/api/cases/update/route.ts` (líneas 91-99): Validación de `tempUpload.storagePath` implementada
- ✅ `src/app/api/chat/start/route.ts` (líneas 83-91): Validación de `tempUpload.storagePath` implementada
- ✅ `src/lib/database.ts` - `createArtifact` (líneas 148-154): Validación centralizada implementada

**Conclusión**: FASE 2 completamente implementada y funcional.

---

### ⚠️ FASE 3: Políticas de Storage - **MIGRACIÓN CREADA, AUDITORÍA COMPLETA, LISTA PARA APLICAR**

**Estado actual**:
- ✅ Migración SQL creada: `supabase/migrations/20250202_storage_policies_org_metadata.sql`
- ✅ Auditoría de archivos completada (Fase 0)
- ✅ Estado de archivos identificado y documentado
- ⚠️ **ACCIÓN REQUERIDA**: Aplicar migración desde Supabase Dashboard

**Resultados de auditoría (Fase 0)**:
```
Total archivos en bucket 'artifacts': 283
├── Archivos con metadata (listos para FASE 3): 0
├── Archivos sin metadata (necesitan migración): 8
└── Archivos temporales (temp/{userId}/...): 275

Total registros en tabla 'artifacts': 23
```

**⚠️ DISCREPANCIA IDENTIFICADA**:
- **23 registros** en tabla `artifacts` (Base de Datos)
- **8 archivos** sin `org_id` en metadata en Storage (excluyendo temporales)
- **Diferencia**: 15 artifacts no corresponden directamente a los 8 archivos sin metadata

**Causas posibles de la discrepancia**:
1. **Artifacts sin `fileId`** (sourceType 'link' o 'api')
   - No tienen archivo en Storage
   - No requieren metadata
   - Ejemplo: artifacts de tipo 'link' que solo tienen URL

2. **Artifacts con `fileId` apuntando a archivos temporales**
   - Path: `temp/{userId}/...`
   - No requieren `org_id` en metadata (validados por path en políticas)
   - Ejemplo: archivos subidos desde landing page antes de crear caso

3. **Artifacts con `fileId` apuntando a archivos persistentes sin metadata**
   - Path: `{orgId}/{caseId}/...`
   - Requieren migración de metadata
   - Estos son los 8 identificados

4. **Artifacts huérfanos** (artifact existe pero archivo no)
   - Archivo eliminado manualmente de Storage
   - Artifact sigue existiendo en BD
   - Requiere limpieza o recreación

5. **Archivos huérfanos** (archivo existe pero artifact no)
   - Archivo subido pero no registrado en BD
   - Requiere creación de artifact o eliminación

**Interpretación de resultados**:
1. **0 archivos con metadata**: 
   - FASE 4 está implementada en código, pero NO se han subido archivos nuevos después de la implementación
   - Esto es normal si no se han hecho uploads desde que se implementó FASE 4
   - Los archivos nuevos (después de FASE 4) tendrán metadata automáticamente

2. **8 archivos sin metadata**:
   - Son archivos persistentes subidos ANTES de implementar FASE 4
   - Requieren migración de metadata antes de aplicar FASE 3
   - Son pocos (8), lo que facilita la migración

3. **275 archivos temporales**:
   - Archivos en path `temp/{userId}/...`
   - NO requieren metadata (las políticas de FASE 3 permiten acceso por path)
   - Probablemente de pruebas o del flujo de landing page
   - Pueden limpiarse periódicamente si es necesario

4. **23 artifacts en BD**:
   - Pueden incluir artifacts sin `fileId` (sourceType 'link' o 'api')
   - Pueden incluir artifacts que apuntan a archivos temporales
   - Pueden incluir artifacts que apuntan a los 8 archivos persistentes sin metadata
   - Pueden incluir artifacts huérfanos (sin archivo en Storage)

**Resultados de queries de análisis**:
- ✅ **Query A**: Todos los 23 artifacts son 'pdf' y tienen `file_id`
- ✅ **Query B**: 0 artifacts persistentes que requieran migración
- ✅ **Query C**: 23 artifacts temporales, 0 artifacts persistentes

**CONCLUSIÓN**:
- Los 23 artifacts TODOS apuntan a archivos temporales (`temp/{userId}/...`)
- NO hay artifacts persistentes en BD
- Los 8 archivos sin metadata son archivos persistentes HUÉRFANOS (no tienen artifact asociado)

**Plan de acción específico**:
1. **Paso 0**: Ejecutar queries de análisis de los 8 archivos huérfanos (ver `docs/QUERIES_ANALISIS_8_ARCHIVOS_HUERFANOS.md`)
2. **Paso 1**: Migrar metadata de los 8 archivos persistentes (script de migración)
3. **Paso 2**: (Opcional) Crear artifacts para archivos con casos válidos
4. **Paso 3**: Aplicar FASE 3 (políticas de storage)
5. **Paso 4**: Verificar que todo funciona correctamente

**Riesgos identificados**:
1. **BAJO**: Solo 8 archivos sin metadata (fácil de migrar)
2. **BAJO**: Archivos temporales no requieren metadata (validados por path)
3. **BAJO**: Los 8 archivos son huérfanos (no tienen artifact), pero pueden migrarse metadata sin problema
4. **MEDIO**: Verificar que la migración de metadata fue exitosa antes de aplicar FASE 3

**Nota importante**:
- Los 8 archivos persistentes sin metadata NO tienen artifact asociado
- Esto es normal: pueden ser archivos subidos directamente sin crear artifact
- La migración de metadata es suficiente para que las políticas de FASE 3 funcionen
- No es crítico crear artifacts para estos archivos (opcional)

**⚠️ PROBLEMA CRÍTICO IDENTIFICADO**:
- Los 23 artifacts apuntan a archivos temporales (`temp/{userId}/...`)
- Los archivos temporales NUNCA se mueven a rutas persistentes
- Esto causa acumulación de archivos temporales (275 actualmente)
- Ver análisis completo en: `docs/ANALISIS_FLUJO_ARCHIVOS_TEMPORALES_PERSISTENTES.md`

**Recomendaciones**:
- ✅ Migrar metadata de los 8 archivos primero (script en Paso 4.5)
- ✅ Aplicar FASE 3 desde Supabase Dashboard
- ✅ Verificar que los 8 archivos migrados son accesibles después de aplicar políticas

---

### ✅ FASE 4: Metadata en uploads - **COMPLETA Y CORREGIDA**

**Estado actual**:
- ✅ Metadata incluida en modo persistente (líneas 230-237) con conversión explícita de UUIDs
- ✅ Metadata incluida en modo temporal (líneas 96-102) con conversión explícita de UUIDs
- ✅ **CORREGIDO**: Todos los valores UUID se convierten explícitamente a strings usando `String()`

**Problema identificado**:
Supabase Storage requiere que **TODOS** los valores de metadata sean strings explícitos. Los UUIDs (`orgId`, `caseId`, `user.id`) pueden no convertirse correctamente automáticamente, resultando en valores `null` en metadata.

**Código actual (INCORRECTO)**:
```typescript
metadata: {
  org_id: orgId,        // ❌ UUID, puede guardarse como null
  case_id: caseId,      // ❌ UUID, puede guardarse como null
  uploaded_by: user.id, // ❌ UUID, puede guardarse como null
  // ...
}
```

**Código requerido (CORRECTO)**:
```typescript
metadata: {
  org_id: String(orgId),        // ✅ Conversión explícita a string
  case_id: String(caseId),      // ✅ Conversión explícita a string
  uploaded_by: String(user.id), // ✅ Conversión explícita a string
  // ...
}
```

**Gaps adicionales identificados**:
1. **MEDIO**: No hay validación post-upload de que metadata se guardó correctamente
2. **MEDIO**: No hay manejo de errores específico si metadata falla al guardarse
3. **BAJO**: No hay logging para verificar valores de metadata guardados

---

## 🚨 GAPS CRÍTICOS Y RECOMENDACIONES

### Gap Crítico 1: Conversión de UUIDs a strings en metadata (FASE 4) - ✅ **RESUELTO**
**Severidad**: 🔴 **CRÍTICA** (ahora resuelto)  
**Impacto**: Las políticas de Fase 3 no funcionarán si `org_id` en metadata es `null`  
**Solución**: ✅ **IMPLEMENTADO**: Conversión explícita usando `String()` para todos los UUIDs en `src/app/api/upload/pdf/route.ts`

### Gap Crítico 2: Estrategia de aplicación de Fase 3
**Severidad**: 🟠 **ALTA**  
**Impacto**: No se pueden aplicar políticas desde terminal  
**Solución**: Documentar alternativas (Dashboard, Support, script con permisos)

### Gap Medio 1: Uso inconsistente de `createArtifact` helper
**Severidad**: 🟡 **MEDIA**  
**Impacto**: Validación duplicada, mantenimiento difícil  
**Solución**: Refactorizar para usar `createArtifact()` consistentemente

### Gap Medio 2: Validación de archivos existentes antes de Fase 3
**Severidad**: 🟡 **MEDIA**  
**Impacto**: Archivos sin metadata quedarán inaccesibles  
**Solución**: Crear script de análisis y migración de metadata

### Gap Medio 3: Verificación post-implementación
**Severidad**: 🟡 **MEDIA**  
**Impacto**: No hay forma de confirmar que todo funciona  
**Solución**: Agregar sección de verificación con tests específicos

---

## 🔧 CORRECCIONES REQUERIDAS - FASE 4 (ACTUALIZADA)

### Corrección Crítica: Conversión explícita de UUIDs a strings

**Justificación técnica**:
Supabase Storage almacena metadata como JSONB en PostgreSQL. Aunque TypeScript/JavaScript pueden pasar UUIDs directamente, Supabase Storage puede no convertirlos correctamente a strings, resultando en valores `null` en la base de datos. Esto es especialmente crítico porque las políticas de Fase 3 dependen de `metadata->>'org_id'` siendo un UUID válido.

**Solución**: Convertir explícitamente todos los valores UUID a strings usando `String()` antes de pasarlos a metadata.

---

**Última actualización**: 2 de Febrero, 2025  
**Estado**: ✅ PLAN COMPLETO CON ANÁLISIS EXHAUSTIVO Y AUDITORÍA - LISTO PARA IMPLEMENTACIÓN  
**Próximo paso**: 
1. Ejecutar migración de metadata (8 archivos) - Paso 4.5
2. Aplicar FASE 3 (políticas de storage) desde Supabase Dashboard

---

## 📄 DOCUMENTO RELACIONADO: ANÁLISIS DE IMPLICACIONES SIN FASE 3

**Ver**: `docs/ANALISIS_IMPLICACIONES_SIN_FASE3.md`

Este documento detalla:
- 🚨 Riesgos de seguridad actuales (acceso público, acceso cruzado entre organizaciones)
- ✅ Mitigaciones actuales en el código (y sus limitaciones)
- 🔧 Alternativas y soluciones disponibles
- 📋 Qué considerar según el estado del proyecto
- 🎯 Recomendaciones por escenario (producción, desarrollo, nuevo proyecto)
- 📝 Checklist de acciones

**IMPORTANTE**: Si no puedes aplicar FASE 3 inmediatamente, consulta este documento para entender las implicaciones y alternativas disponibles.

