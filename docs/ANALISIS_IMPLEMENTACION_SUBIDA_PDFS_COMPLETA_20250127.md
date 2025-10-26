# Análisis Integral: Implementación Completa de Subida de PDFs (Fecha: 2025-01-27)
## Problemas Identificados y Soluciones para 3 Flujos de Subida de PDFs

---

## 📋 RESUMEN EJECUTIVO

**Estado Actual**: 
- ✅ **Landing Page**: Funciona correctamente (PDFs se suben, se guardan en cache, se asocian al caso al aprobar)
- ❌ **Edit desde /workspace/cases/[id]/edit**: Error en sourceType ('upload' en lugar de 'pdf')
- ❌ **Panel derecho del agente (edición)**: No existe opción de subir PDFs (solo formulario de texto)

**Objetivo**: Implementar completamente la subida de PDFs en los 3 flujos, manteniendo la funcionalidad existente de Landing sin modificarla.

---

## 1️⃣ FLUJO 1: LANDING PAGE (✅ FUNCIONAL)

### Estado Actual
**Archivos Involucrados**:
- `src/components/Landing/LandingChatInput.tsx` (Subida de PDFs)
- `src/lib/types.ts` (Tipo `CaseBrief` con `tempUploads`)
- `src/components/Chat/ConversationPane.tsx` (Creación de caso con PDFs)
- `src/app/api/cases/create/route.ts` (Procesamiento de artifacts)

**Flujo Implementado**:
1. Usuario sube PDF desde Landing
2. PDF se sube a Supabase Storage como temp
3. PDF se guarda en `brief.tempUploads` en Zustand
4. Usuario completa formulario y presiona "Aprobar"
5. `ConversationPane.tsx` crea el caso con `tempUploads`
6. `/api/cases/create` procesa `tempUploads` y crea artifacts
7. PDFs aparecen en la pestaña "Artefactos"

**Valoración**: ✅ **NO TOCAR** - Funciona correctamente

---

## 2️⃣ FLUJO 2: EDITAR CASO DESDE /workspace/cases/[id]/edit (❌ ERROR)

### Problema Identificado

**Archivo**: `src/app/api/cases/update/route.ts`
**Línea 44**: `sourceType: 'upload'` ❌

**Error**:
```typescript
sourceType: 'upload', // ❌ Este valor no existe en el ENUM
```

**ENUM Correcto** (en `prisma/schema.prisma` y `src/lib/types.ts`):
```prisma
enum SourceType {
  api
  portal
  pdf
  link
}
```

**Consecuencia**: Error de base de datos al intentar crear artifact con `sourceType: 'upload'` en lugar de `sourceType: 'pdf'`

---

### Análisis del Flujo

**Archivos Involucrados**:
- `src/app/[locale]/(app)/workspace/cases/[id]/edit/CaseEditContent.tsx` (Página de edición)
- `src/components/Cases/BriefForm.tsx` (Formulario - ya tiene `PdfUploader` implementado)
- `src/app/api/cases/update/route.ts` (Endpoint que procesa PDFs)

**Flujo Esperado**:
1. Usuario abre caso existente para editar
2. `BriefForm` muestra `PdfUploader` (líneas 501-506)
3. Usuario sube PDF → `handleFileUpload` se ejecuta
4. PDF se sube a `/api/upload/pdf` → retorna `tempUpload`
5. PDF se añade a `tempUploads` state local
6. Usuario guarda cambios
7. `CaseEditContent` llama a `handleUpdateCase` con `formData` que incluye `tempUploads`
8. Fetch a `/api/cases/update` con `tempUploads`
9. Endpoint procesa `tempUploads` y crea artifacts

**Estado Actual**:
- ✅ `BriefForm` ya tiene `PdfUploader` y `handleFileUpload` implementados
- ✅ `CaseEditContent.tsx` pasa `formData` (que incluye `tempUploads`) al endpoint
- ❌ **ERROR**: Endpoint usa `sourceType: 'upload'` en lugar de `sourceType: 'pdf'`
- ❌ `CaseEditContent.tsx` no pasa `tempUploads` explícitamente al body

---

### Solución Propuesta

**A. Corregir sourceType en el endpoint** (CRÍTICO)
**Archivo**: `src/app/api/cases/update/route.ts`

**Cambio** (línea 44):
```typescript
// DE:
sourceType: 'upload',

// A:
sourceType: 'pdf',
```

**B. Pasar tempUploads explícitamente**
**Archivo**: `src/app/[locale]/(app)/workspace/cases/[id]/edit/CaseEditContent.tsx`

**Cambio** (línea 33-37):
```typescript
// DE:
body: JSON.stringify({ 
  caseId, 
  orgId,
  ...formData  // ❌ tempUploads podría no estar incluido
})

// A:
body: JSON.stringify({ 
  caseId, 
  orgId,
  ...formData,
  tempUploads: formData.tempUploads || [] // ✅ Pasar explícitamente
})
```

**Criterios de Aceptación**:
- [ ] Subir PDF desde `/workspace/cases/[id]/edit`
- [ ] Guardar cambios
- [ ] Verificar que no hay error de "source_type_enum"
- [ ] Verificar que artifact se crea en DB con `sourceType: 'pdf'`
- [ ] Verificar que PDF aparece en pestaña "Artefactos"

---

## 3️⃣ FLUJO 3: PANEL DERECHO DEL AGENTE (❌ NO IMPLEMENTADO)

### Problema Identificado

**Archivos Involucrados**:
- `src/components/Workspace/CaseBriefForm.tsx` (Panel derecho del agente)
- `src/components/Cases/BriefForm.tsx` (Formulario - ya tiene `PdfUploader`)
- `src/components/Chat/ConversationPane.tsx` (Creación de caso al aprobar)

**Estado Actual**:
- `CaseBriefForm.tsx` renderiza `BriefForm` (línea 182-187)
- `BriefForm` ya tiene `PdfUploader` implementado
- **PROBLEMA**: `BriefForm` en el panel derecho **NO puede subir PDFs** porque:
  1. El `handleFileUpload` (líneas 210-235) ya está implementado y funciona
  2. Pero el `PdfUploader` NO se está renderizando porque falta pasar `orgId` como prop

---

### Análisis del Flujo Esperado

**Escenario A: Entrar al agente desde Landing (con PDF ya subido en Landing)**
1. Usuario sube PDF desde Landing → se guarda en `brief.tempUploads`
2. Usuario va al agente
3. Panel derecho muestra formulario para completar brief
4. Usuario completa formulario y presiona "Aprobar"
5. `ConversationPane.tsx` crea caso con `brief.tempUploads` (ya implementado ✅)
6. PDFs se guardan como artifacts

**Escenario B: Entrar al agente desde panel izquierdo (sin PDF)**
1. Usuario inicia conversación sin PDF
2. Agente saluda y sugiere completar formulario
3. Panel derecho muestra formulario vacío
4. **AHORA**: Usuario puede subir PDFs directamente desde el formulario
5. PDFs se guardan en cache local (`tempUploads`)
6. Usuario completa formulario y presiona "Aprobar"
7. `ConversationPane.tsx` crea caso con PDFs (si se añaden en `brief.tempUploads`)

**Escenario C: Editar un caso ya aprobado desde el panel derecho**
1. Usuario está en conversación con caso aprobado
2. Presiona "Editar Brief" (línea 175-177 de `CaseBriefForm.tsx`)
3. `BriefForm` se muestra en modo edición
4. **AHORA**: Usuario puede subir nuevos PDFs
5. PDFs se suben a `/api/cases/update` para asociar al caso existente
6. PDFs nuevos aparecen en "Artefactos"

---

### Solución Propuesta

**Problema**: `BriefForm` en el panel derecho no recibe `orgId` como prop

**Archivo**: `src/components/Workspace/CaseBriefForm.tsx`

**Cambio** (línea 182-187):
```typescript
// DE:
<BriefForm
  onSubmit={handleFormSubmit}
  onApprove={handleApproveWithValidation}
  isSubmitting={isSubmitting || caseApproving || isClientValidationLoading}
  initialNotes={brief.freeText || ''}
/>

// A:
<BriefForm
  onSubmit={handleFormSubmit}
  onApprove={handleApproveWithValidation}
  isSubmitting={isSubmitting || caseApproving || isClientValidationLoading}
  initialNotes={brief.freeText || ''}
  orgId={currentOrg?.id || ''} // ✅ Añadir orgId para que PdfUploader funcione
/>
```

**Problema Adicional**: `CaseBriefForm` no tiene acceso a `currentOrg`

**Solución**: Obtener `currentOrg` del estado global o del contexto

```typescript
// Opción 1: Obtener del estado global
const currentCaseId = useUI((state) => state.currentCaseId);

// Opción 2: Fetch a /api/auth/me
const getOrgId = async () => {
  const response = await fetch('/api/auth/me');
  const { orgId } = await response.json();
  return orgId;
};
```

**Además**: Para Escenario C (Editar caso existente), necesitamos:
1. Al presionar "Editar", si hay `currentCaseId`, el formulario debe poder subir PDFs
2. Los PDFs subidos deben enviarse a `/api/cases/update` en lugar de `/api/cases/create`

**Modificación en `BriefForm`**:
```typescript
// En handleSubmit (línea 237-265):
if (mode === 'edit' && initialData?.id) {
  // Enviar a /api/cases/update con PDFs
  await fetch('/api/cases/update', {
    method: 'PUT',
    body: JSON.stringify({
      caseId: initialData.id,
      orgId,
      ...formData,
      tempUploads
    })
  });
} else {
  // Flujo normal (crear nuevo caso o aprobar draft)
  if (onApprove) {
    await onApprove(); // Esto crea el caso con PDFs
  } else {
    await onSubmit({ ...formData, tempUploads });
  }
}
```

---

## 4️⃣ PLAN DE IMPLEMENTACIÓN ORDENADO

### FASE 1: Corregir Error en /api/cases/update (PRIORIDAD CRÍTICA)

**Archivo**: `src/app/api/cases/update/route.ts`

**Tarea 1.1**: Cambiar `sourceType: 'upload'` a `sourceType: 'pdf'`
- **Línea 44**: Cambiar valor del enum
- **Criterio de Aceptación**: No más errores de base de datos al editar casos

**Tarea 1.2**: Añadir logs de depuración
- **Líneas 38-59**: Añadir `console.log` para rastrear procesamiento de PDFs
- **Criterio de Aceptación**: Ver en terminal "📎 [API] Creating artifacts for caseId"

---

### FASE 2: Pasar tempUploads explícitamente en CaseEditContent (PRIORIDAD ALTA)

**Archivo**: `src/app/[locale]/(app)/workspace/cases/[id]/edit/CaseEditContent.tsx`

**Tarea 2.1**: Modificar `handleUpdateCase` para incluir `tempUploads` explícitamente
- **Línea 33-37**: Añadir `tempUploads: formData.tempUploads || []`
- **Criterio de Aceptación**: PDFs se envían al endpoint al guardar cambios

---

### FASE 3: Habilitar subida de PDFs en panel derecho (PRIORIDAD ALTA)

**Archivo**: `src/components/Workspace/CaseBriefForm.tsx`

**Tarea 3.1**: Obtener `orgId` para pasar a `BriefForm`
- **Opción A**: Fetch a `/api/auth/me` en `useEffect`
- **Opción B**: Obtener del estado global
- **Criterio de Aceptación**: `BriefForm` recibe `orgId` como prop

**Tarea 3.2**: Pasar `orgId` a `BriefForm`
- **Línea 182-187**: Añadir `orgId={orgId || ''}` a props de `BriefForm`
- **Criterio de Aceptación**: `PdfUploader` se renderiza en panel derecho

---

### FASE 4: Implementar flujo de edición de caso existente (PRIORIDAD MEDIA)

**Archivo**: `src/components/Cases/BriefForm.tsx`

**Tarea 4.1**: Detectar si estamos editando un caso existente
- **Línea 76**: Verificar si `mode === 'edit'` y `initialData?.id` existe
- **Criterio de Aceptación**: Logica diferenciada para crear vs editar

**Tarea 4.2**: Modificar `handleSubmit` para enviar a `/api/cases/update` en modo edición
- **Línea 230-266**: Añadir condicional para enviar a endpoint de update
- **Criterio de Aceptación**: PDFs se suben a caso existente en modo edición

---

### FASE 5: Sincronizar tempUploads entre brief y BriefForm (PRIORIDAD MEDIA)

**Problema**: Los PDFs subidos en el panel derecho NO se guardan en `brief.tempUploads` (Zustand global)

**Archivo**: `src/components/Cases/BriefForm.tsx`

**Tarea 5.1**: Cuando se sube un PDF, actualizar `brief.tempUploads`
- **Línea 226**: Después de `setTempUploads`, también hacer `setBrief({ tempUploads })`
- **Criterio de Aceptación**: PDFs en `brief` se pasan a `ConversationPane`

**Tarea 5.2**: Cuando se aprueba desde panel derecho, incluir `tempUploads` en el brief
- **Línea 237-265**: Asegurar que `brief.tempUploads` se incluye en el brief antes de aprobar
- **Criterio de Aceptación**: PDFs subidos desde panel derecho se crean en la DB

---

## 5️⃣ VALIDACIÓN COMPLETA DEL FLUJO

### Checklist de Validación

#### Flujo 1: Landing Page (✅ YA FUNCIONAL)
- [x] Subir PDF desde Landing
- [x] Ver PDF en cache antes de enviar
- [x] Completar formulario y aprobar
- [x] Verificar artifact en DB
- [x] Ver PDF en pestaña "Artefactos"

#### Flujo 2: Editar desde /workspace/cases/[id]/edit (❌ ERROR ACTUAL)
- [ ] Abrir caso existente para editar
- [ ] Ver `PdfUploader` en el formulario
- [ ] Subir PDF (debe funcionar sin error)
- [ ] Guardar cambios
- [ ] Verificar que NO hay error de "source_type_enum"
- [ ] Verificar artifact creado en DB con `sourceType: 'pdf'`
- [ ] Ver PDF en pestaña "Artefactos"

#### Flujo 3: Panel derecho del agente - Escenario A (con PDF de Landing)
- [x] Subir PDF desde Landing
- [x] Ir al agente
- [x] Completar formulario
- [x] Aprobar
- [x] Ver PDF asociado al caso

#### Flujo 3: Panel derecho del agente - Escenario B (sin PDF)
- [ ] Ir al agente sin PDF
- [ ] Ver `PdfUploader` en panel derecho
- [ ] Subir PDF desde panel derecho
- [ ] Ver PDF en la lista de tempUploads
- [ ] Completar formulario
- [ ] Aprobar
- [ ] Verificar artifact en DB
- [ ] Ver PDF en pestaña "Artefactos"

#### Flujo 3: Panel derecho del agente - Escenario C (Editar caso existente)
- [ ] Aprobar un caso desde panel derecho
- [ ] Presionar "Editar Brief"
- [ ] Ver `PdfUploader` en modo edición
- [ ] Subir nuevo PDF
- [ ] Guardar cambios
- [ ] Verificar artifact en DB para caso existente
- [ ] Ver nuevo PDF en pestaña "Artefactos"

---

## 6️⃣ PRINCIPIOS DE DESARROLLO RESPETADOS

### ✅ Reutilización Máxima del Código
- `PdfUploader` se reutiliza en 3 contextos diferentes
- `handleFileUpload` en `BriefForm` se reutiliza para cualquier subida
- Endpoint `/api/cases/create` y `/api/cases/update` usan la misma lógica de procesamiento

### ✅ Mantenimiento de la Arquitectura Dual
- Landing → Workspace: PDFs se mantienen en `brief.tempUploads` global
- Next.js SSR → Client: PDFs se manejan en cliente y se envían al servidor

### ✅ Consistencia de Estado Unidireccional
- `BriefForm` → `tempUploads` local → `brief.tempUploads` global → API → DB artifacts

### ✅ Separación Clara de Responsabilidades
- `PdfUploader`: Maneja UI de selección y subida a Storage
- `BriefForm`: Maneja estado local de PDFs y datos del formulario
- `CaseBriefForm`: Coordina aprobación y creación de casos
- `ConversationPane`: Crea casos con PDFs del `brief`
- API endpoints: Procesan `tempUploads` y crean artifacts en DB

---

## 7️⃣ CONCLUSIÓN

**Problemas Identificados**:
1. ❌ **ERROR CRÍTICO**: `sourceType: 'upload'` en lugar de `sourceType: 'pdf'` en `/api/cases/update`
2. ❌ **FALTA**: `tempUploads` no se pasa explícitamente en `CaseEditContent`
3. ❌ **FALTA**: `BriefForm` en panel derecho no recibe `orgId`, por lo que `PdfUploader` no se renderiza
4. ❌ **FALTA**: `BriefForm` no detecta modo edición para enviar PDFs a `/api/cases/update`
5. ❌ **FALTA**: PDFs subidos en panel derecho no se sincronizan con `brief.tempUploads`

**Archivos a Modificar**:
1. `src/app/api/cases/update/route.ts` (Cambiar sourceType + logs)
2. `src/app/[locale]/(app)/workspace/cases/[id]/edit/CaseEditContent.tsx` (Pasar tempUploads)
3. `src/components/Workspace/CaseBriefForm.tsx` (Pasar orgId a BriefForm)
4. `src/components/Cases/BriefForm.tsx` (Sincronizar tempUploads con brief + detectar modo edición)

**Archivos que NO necesitan modificaciones**:
- `src/components/Landing/LandingChatInput.tsx` (✅ Ya funciona)
- `src/components/Chat/ConversationPane.tsx` (✅ Ya funciona)
- `src/app/api/cases/create/route.ts` (✅ Ya procesa PDFs correctamente)

**Orden de Implementación**:
1. **FASE 1**: Corregir `sourceType` (solución inmediata del error)
2. **FASE 2**: Pasar `tempUploads` explícitamente (completa flujo de edición)
3. **FASE 3**: Habilitar subida en panel derecho (nuevo flujo)
4. **FASE 4**: Implementar edición de casos existentes desde panel (completa funcionalidad)
5. **FASE 5**: Sincronizar `brief.tempUploads` global (asegura consistencia)

