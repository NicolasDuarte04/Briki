# Análisis Crítico: PDFs No Se Guardan en Casos (Fecha: 2025-01-27)
## Problema: PDFs subidos desde LandingPage no se asocian al caso creado

---

## 📋 RESUMEN EJECUTIVO

**Problema Crítico**: Los PDFs subidos desde el `LandingChatInput` se guardan temporalmente en Supabase Storage, pero **no se están asociando al caso creado** cuando el usuario envía el mensaje desde la Landing Page.

**Impacto**: El agente **NO puede leer ni interpretar los PDFs** porque no están vinculados al caso en la base de datos (tabla `artifacts`).

**Causa Raíz**: El componente `LandingChatInput.tsx` **NO está enviando** el array `tempUploads` al endpoint `/api/cases/create` (líneas 181-190).

---

## 1️⃣ ANÁLISIS DETALLADO DEL FLUJO ACTUAL

### A. Flujo de Upload de PDFs (✅ FUNCIONAL)

**Archivo**: `src/components/Landing/LandingChatInput.tsx`

**Líneas 105-140** (`handleFileChange`):

```tsx
const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  console.log('📄 Frontend: Archivo seleccionado:', file.name, file.type, file.size);
  setIsUploading(true);

  try {
    const formData = new FormData();
    formData.append('pdf', file);
    
    const response = await fetch('/api/upload/pdf', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (result.success && result.mode === 'temp' && result.tempUpload) {
      setTempUploads((prev) => [...prev, result.tempUpload]);
      console.log('✅ Upload temporal listo:', result.tempUpload);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error de conexión');
  } finally {
    setIsUploading(false);
    event.target.value = '';
  }
};
```

**¿Qué hace?**
1. Usuario selecciona PDF → `fileInputRef.current?.click()` (línea 102)
2. Se envía a `/api/upload/pdf` (línea 118)
3. Se recibe `tempUpload` con: `storagePath`, `fileName`, `fileSize`, `extractedText`, etc.
4. Se añade a `tempUploads` state (línea 127) ✅

**Estado después**: `tempUploads` contiene los PDFs listos para enviar.

---

### B. Flujo de Submit del Mensaje (❌ PROBLEMA)

**Archivo**: `src/components/Landing/LandingChatInput.tsx`

**Líneas 147-218** (`handleSubmit`):

```tsx
const handleSubmit = async () => {
  if (!user) {
    window.location.href = '/login';
    return;
  }

  const message = value.trim();
  if (!message && tempUploads.length === 0) return;

  setValue('');
  setTempUploads([]); // ❌ LIMPIA los tempUploads ANTES de enviarlos
  
  // ... código de creación de caso ...
  
  const response = await fetch('/api/cases/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orgId,
      userId,
      briefData: { freeText: message },
      clientName: 'Cliente desde Landing',
      businessType: 'Por definir',
      employees: 0,
      status: 'draft',
      stage: 'initial'
      // ❌ FALTA: tempUploads NO se incluyen en el body
    })
  });
  
  // ... resto del código ...
};
```

**Problema 1**: `tempUploads` se limpian en la línea 162 **ANTES de enviarlos**:
```tsx
setTempUploads([]); // Limpia los PDFs antes de enviarlos al servidor
```

**Problema 2**: `tempUploads` **NO se incluyen** en el body del fetch (líneas 181-190).

**Consecuencia**: Los PDFs se pierden porque:
1. Se limpian del estado local
2. No se envían al servidor
3. El caso se crea sin artifacts

---

### C. Endpoint `/api/cases/create` (✅ LISTO PARA PROCESAR PDFs)

**Archivo**: `src/app/api/cases/create/route.ts`

**Líneas 31-38** (Extrae `tempUploads` del body):
```tsx
const body = await request.json();
const {
  orgId,
  userId,
  clientName,
  // ...
  tempUploads = [], // ✅ Lee tempUploads del body
  insurance_category,
  // ...
} = body;
```

**Líneas 117-139** (Procesa `tempUploads`):
```tsx
// Procesar PDFs temporales si existen
if (tempUploads && tempUploads.length > 0) {
  const { prisma } = await import('@/lib/prisma');
  
  for (const tempUpload of tempUploads) {
    await prisma.artifact.create({
      data: {
        caseId: newCase.id,
        sourceType: 'pdf',
        fileId: tempUpload.storagePath,
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
}
```

**¿Qué hace?**
1. Lee `tempUploads` del body (línea 31) ✅
2. Si hay PDFs, los itera (línea 120) ✅
3. Crea `artifacts` en la DB (línea 121-138) ✅
4. Asocia cada artifact al `caseId` (línea 123) ✅

**Conclusión**: El endpoint está **completamente listo**, solo necesita que `LandingChatInput` envíe `tempUploads`.

---

## 2️⃣ FLUJO CORRECTO (Cómo DEBERÍA funcionar)

### Flujo Esperado:

```
Usuario selecciona PDF
  ↓
handleFileChange() → fetch('/api/upload/pdf')
  ↓
Recibe tempUpload → Se añade a tempUploads state
  ↓
Usuario hace click en "Enviar"
  ↓
handleSubmit() → fetch('/api/cases/create', {
  body: {
    orgId, userId, briefData, clientName,
    tempUploads  // ← PDFs incluidos aquí
  }
})
  ↓
Endpoint recibe tempUploads
  ↓
Crea Case
  ↓
Itera tempUploads → Crea artifacts en DB
  ↓
PDFs guardados como artifacts asociados al case
  ↓
Agente puede leer e interpretar PDFs
```

---

## 3️⃣ SOLUCIÓN PROPUESTA

### Objetivo 1: Arreglar `LandingChatInput.tsx` para enviar PDFs

**Archivo**: `src/components/Landing/LandingChatInput.tsx`

**Línea 147-218** (función `handleSubmit`):

**Cambio necesario**:
1. **NUNCA** limpiar `tempUploads` antes de enviarlos
2. Incluir `tempUploads` en el body del fetch

**Código corregido**:
```tsx
const handleSubmit = async () => {
  if (!user) {
    window.location.href = '/login';
    return;
  }

  const message = value.trim();
  if (!message && tempUploads.length === 0) return;

  // ❌ ELIMINAR: setTempUploads([]); // NO limpiar aquí
  
  const tempUploadsSnapshot = [...tempUploads]; // Crear snapshot
  
  // Limpiar SOLO el texto, NO los PDFs
  setValue('');
  setTempUploads([]);
  
  trackEvent("hero_chat_start", { hasText: Boolean(message), hasPDF: tempUploadsSnapshot.length > 0 });

  try {
    // Obtener datos del usuario autenticado
    const authResponse = await fetch('/api/auth/me');
    if (!authResponse.ok) {
      throw new Error('Failed to get user data');
    }
    const { userId, orgId } = await authResponse.json();
    
    const response = await fetch('/api/cases/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId,
        userId,
        briefData: { freeText: message },
        clientName: 'Cliente desde Landing',
        businessType: 'Por definir',
        employees: 0,
        status: 'draft',
        stage: 'initial',
        insurance_category: '', // Valor temporal para cumplir validación
        tempUploads: tempUploadsSnapshot, // ✅ AÑADIR: Enviar PDFs
      })
    });

    if (response.ok) {
      const result = await response.json();
      useUI.getState().setCurrentCaseId(result.caseId);
    } else {
      const errorData = await response.json();
      console.error('❌ Case creation failed:', errorData);
    }
  } catch (error) {
    console.error('❌ Error creating case:', error);
  }

  setInitialMessage(message);
  setBrief({ freeText: message });
  openChatPanel();
  setStep("conversation");
  router.push('/agent');
};
```

**¿Por qué este cambio?**
- `tempUploadsSnapshot` preserva los PDFs antes de limpiar el estado
- `tempUploads: tempUploadsSnapshot` envía los PDFs al servidor
- El endpoint `/api/cases/create` ya los procesa correctamente

---

### Objetivo 2: Agregar soporte de PDFs en formularios

#### A. BriefForm Component (Panel derecho del agente)

**Archivo**: `src/components/Cases/BriefForm.tsx`

**¿Qué hace falta?**
1. Importar `PdfUploader` (ya existe en el proyecto)
2. Añadir estado `tempUploads` local
3. Añadir lógica de `handleFileChange` y `handleRemoveFile`
4. Pasar `tempUploads` al `handleSubmit` y luego a `onApprove`

**Ubicación del código**: Ya existe `PdfUploader` en `src/components/Upload/PdfUploader.tsx`

**Flujo sugerido**:
```tsx
// 1. Importar PdfUploader
import { PdfUploader } from '@/components/Upload/PdfUploader';

// 2. En el componente BriefForm:
const [tempUploads, setTempUploads] = useState<Array<TempUpload>>([]);

// 3. Renderizar en el formulario
<PdfUploader
  onFileUploaded={(upload) => setTempUploads(prev => [...prev, upload])}
  onFileRemoved={(storagePath) => setTempUploads(prev => prev.filter(t => t.storagePath !== storagePath))}
/>

// 4. En handleSubmit, pasar tempUploads
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (onApprove) {
    await onApprove(); // Pasar tempUploads aquí si es necesario
  } else {
    await onSubmit({ ...formData, tempUploads });
  }
};
```

**¿Dónde se reutiliza?**
- `src/components/Cases/BriefForm.tsx` (panel derecho del agente)
- `src/app/[locale]/(app)/workspace/cases/new/page.tsx` (página de nuevo caso)
- `src/app/[locale]/(app)/workspace/cases/[id]/edit/page.tsx` (página de edición)

---

#### B. CaseNewPage Component

**Archivo**: `src/app/[locale]/(app)/workspace/cases/new/page.tsx`

**¿Qué hace falta?**
1. Integrar `PdfUploader` en el layout del formulario
2. Pasar `tempUploads` al `handleCreateCase`

**Flujo sugerido**:
```tsx
const [tempUploads, setTempUploads] = useState<Array<TempUpload>>([]);

// En handleCreateCase:
const handleCreateCase = async (data: CaseBriefData) => {
  setIsSubmitting(true);
  setError(null);
  
  try {
    const authResponse = await fetch('/api/auth/me');
    if (!authResponse.ok) {
      throw new Error('No se pudo obtener la información del usuario');
    }
    const { orgId } = await authResponse.json();
    
    const response = await fetch('/api/cases/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId,
        ...data,
        tempUploads, // ✅ Añadir tempUploads
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear el caso');
    }

    const result = await response.json();
    router.push(`/workspace/cases/${result.caseId}`);
  } catch (err) {
    console.error('Error creating case:', err);
    setError(err instanceof Error ? err.message : 'Error desconocido');
  } finally {
    setIsSubmitting(false);
  }
};

// En el JSX:
<BriefForm
  onSubmit={handleCreateCase}
  initialData={null}
  mode="create"
  orgId={currentOrg.id}
  tempUploads={tempUploads}
  onTempUploadsChange={setTempUploads}
/>
```

---

## 4️⃣ PLAN DE IMPLEMENTACIÓN

### Fase 1: Arreglar LandingChatInput (PRIORIDAD CRÍTICA)

**Archivo**: `src/components/Landing/LandingChatInput.tsx`

**Tarea 1**: Eliminar limpieza prematura de `tempUploads` (línea 162)

**Antes**:
```tsx
setValue('');
setTempUploads([]); // ❌ Esto elimina los PDFs
```

**Después**:
```tsx
const tempUploadsSnapshot = [...tempUploads]; // Preservar
setValue('');
setTempUploads([]); // Limpiar después de guardar snapshot
```

**Tarea 2**: Incluir `tempUploads` en el body del fetch (línea 178-190)

**Antes**:
```tsx
body: JSON.stringify({
  orgId,
  userId,
  briefData: { freeText: message },
  clientName: 'Cliente desde Landing',
  // ... otros campos ...
  // ❌ Falta tempUploads
})
```

**Después**:
```tsx
body: JSON.stringify({
  orgId,
  userId,
  briefData: { freeText: message },
  clientName: 'Cliente desde Landing',
  // ... otros campos ...
  insurance_category: '', // Temporal para cumplir validación
  tempUploads: tempUploadsSnapshot, // ✅ Añadir
})
```

**Criterios de aceptación**:
- [ ] PDF subido desde Landing se muestra en la lista de tempUploads
- [ ] Al enviar el mensaje, el PDF se guarda como artifact en DB
- [ ] El artifact aparece en la pestaña "Artefactos" del caso
- [ ] El agente puede leer e interpretar el contenido del PDF

---

### Fase 2: Agregar PDFUploader a BriefForm

**Archivo**: `src/components/Cases/BriefForm.tsx`

**Tarea 1**: Importar `PdfUploader` y tipo `TempUpload`

**Tarea 2**: Añadir estado `tempUploads`

**Tarea 3**: Renderizar `PdfUploader` en el formulario (después de los campos de texto)

**Tarea 4**: Pasar `tempUploads` a `handleSubmit` y luego a `onApprove`

**Criterios de aceptación**:
- [ ] PdfUploader aparece en el formulario del panel derecho
- [ ] Usuario puede subir múltiples PDFs
- [ ] PDFs se muestran en la lista antes de enviar
- [ ] Al enviar, los PDFs se guardan como artifacts

---

### Fase 3: Agregar PDFUploader a CaseNewPage

**Archivo**: `src/app/[locale]/(app)/workspace/cases/new/page.tsx`

**Tarea 1**: Añadir estado `tempUploads`

**Tarea 2**: Pasar `tempUploads` a `handleCreateCase`

**Tarea 3**: Integrar `PdfUploader` en el layout

**Criterios de aceptación**:
- [ ] PdfUploader aparece en la página de nuevo caso
- [ ] Usuario puede subir PDFs antes de crear el caso
- [ ] PDFs se asocian al caso al crearlo

---

### Fase 4: Agregar PDFUploader a CaseEditPage (opcional)

**Archivo**: `src/app/[locale]/(app)/workspace/cases/[id]/edit/page.tsx`

**Tarea**: Similar a Fase 3, pero para casos existentes

**Criterios de aceptación**:
- [ ] Usuario puede agregar PDFs a casos existentes
- [ ] PDFs se asocian al caso y aparecen en la lista

---

## 5️⃣ REUTILIZACIÓN DE CÓDIGO

### A. Componente PdfUploader (Ya existe)

**Archivo**: `src/components/Upload/PdfUploader.tsx`

**¿Qué hace?**
- Maneja la subida de PDFs
- Llama a `/api/upload/pdf`
- Retorna `tempUpload` con metadata

**Propiedades**:
- `onFileUploaded: (upload: TempUpload) => void`
- `onFileRemoved: (storagePath: string) => void`

**Reutilización**:
- ✅ `LandingChatInput` (ya existe, solo necesita enviar `tempUploads`)
- ❌ `BriefForm` (Falta implementar)
- ❌ `CaseNewPage` (Falta implementar)
- ❌ `CaseEditPage` (Falta implementar, opcional)

---

### B. Endpoint `/api/cases/create` (Ya procesa PDFs)

**Archivo**: `src/app/api/cases/create/route.ts`

**¿Qué hace?**
- Lee `tempUploads` del body (línea 31)
- Crea artifacts en DB (líneas 117-139)

**Reutilización**:
- ✅ Ya procesa `tempUploads` correctamente
- ✅ No necesita modificaciones

---

## 6️⃣ VALIDACIÓN DEL FLUJO COMPLETO

### Checklist de Validación:

**Antes de implementar**:
- [ ] ¿Los PDFs se suben correctamente desde Landing? (Sí, línea 127)
- [ ] ¿Los PDFs se almacenan en tempUploads state? (Sí, línea 127)
- [ ] ¿El endpoint `/api/cases/create` puede procesar `tempUploads`? (Sí, líneas 117-139)
- [ ] ¿Los artifacts se crean en DB? (Sí, líneas 121-138)

**Después de implementar**:
- [ ] ¿Los PDFs se envían desde `LandingChatInput`? (Verificar en DevTools Network)
- [ ] ¿Los artifacts se crean en DB? (Verificar en Supabase Dashboard)
- [ ] ¿Los artifacts aparecen en la pestaña "Artefactos"? (Verificar en Case Detail)
- [ ] ¿El agente puede leer e interpretar los PDFs? (Verificar en la conversación con el agente)

---

## 7️⃣ PRINCIPIOS DE DESARROLLO RESPETADOS

### ✅ Reutilización Máxima del Código

- `PdfUploader` se reutiliza en múltiples componentes
- Endpoint `/api/cases/create` ya procesa `tempUploads` (no necesita modificaciones)

### ✅ Mantenimiento de la Arquitectura Dual

- Landing → Workspace: PDFs se persisten desde la landing
- Next.js SSR → Client Components: Estado local (`tempUploads`) se mantiene en cliente

### ✅ Consistencia de Estado Unidireccional

- `LandingChatInput` → `tempUploads` state → body fetch → `/api/cases/create` → DB artifacts

### ✅ Separación Clara de Responsabilidades

- `PdfUploader`: Maneja upload y retorna metadata
- `LandingChatInput`: Maneja UI y envía datos al servidor
- `/api/cases/create`: Crea caso y artifacts
- DB: Persiste artifacts con RLS

---

## 8️⃣ CONCLUSIÓN

**Problema identificado**: Los PDFs no se están enviando desde `LandingChatInput` al servidor, aunque el servidor está listo para procesarlos.

**Solución**: 
1. Preservar `tempUploads` antes de limpiar el estado
2. Incluir `tempUploads` en el body del fetch
3. Reutilizar `PdfUploader` en otros formularios

**Archivos a modificar**:
- `src/components/Landing/LandingChatInput.tsx` (CRÍTICO)
- `src/components/Cases/BriefForm.tsx` (Fase 2)
- `src/app/[locale]/(app)/workspace/cases/new/page.tsx` (Fase 3)
- `src/app/[locale]/(app)/workspace/cases/[id]/edit/page.tsx` (Fase 4, opcional)

**Archivos que NO necesitan modificaciones**:
- `src/app/api/cases/create/route.ts` (Ya procesa `tempUploads`)
- `src/components/Upload/PdfUploader.tsx` (Ya existe y funciona)

