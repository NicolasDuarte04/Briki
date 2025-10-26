# Análisis Crítico: Errores en Flujos de Subida de PDFs (Panel Derecho y Landing)
**Fecha:** 2025-01-27  
**Rol:** Senior FullStack Developer

---

## RESUMEN EJECUTIVO

Se han identificado **4 problemas críticos** en los flujos de subida de PDFs que impiden el funcionamiento correcto de la aplicación:

1. **PDFs no se guardan en el caso** desde el panel derecho del agente
2. **Landing Page** ahora muestra el formulario como "ya diligenciado" (modo edición) cuando debería estar en modo creación
3. **Error "Case is not in draft status"** al intentar aprobar un caso desde el panel derecho
4. **Complejidad innecesaria** con botones redundantes en el formulario de PDFs

---

## ANÁLISIS DETALLADO DE PROBLEMAS

### PROBLEMA 1: PDFs No Se Guardan en el Caso (Panel Derecho)

**Síntoma:** Al subir PDFs desde el panel derecho del agente (`BriefForm.tsx`), estos no quedan guardados en el caso final.

**Ubicación del error:**
- `src/components/Cases/BriefForm.tsx` (líneas 225-270)
- `src/components/Workspace/CaseBriefForm.tsx` (orquestación)

**Causa raíz:**
1. El `handleFileUpload` actual crea `tempUploads` en memoria, pero estos NO se están subiendo realmente al storage ni al backend.
2. Los `tempUploads` se guardan en Zustand global, pero cuando se crea el caso, estos no están llegando correctamente al endpoint `/api/cases/create`.

**Flujo actual (ROTO):**
```
Usuario arrastra PDF 
  → PdfUploader llama handleFileUpload 
    → Crea tempUpload en memoria (con hash) 
      → Lo agrega a tempUploads local 
        → Sincroniza con Zustand 
          → Al dar "Buscar Planes" 
            → ConversationPane crea caso 
              → ❌ Los PDFs NO se envían al endpoint
```

**Flujo esperado (FUNCIONAL):**
```
Usuario arrastra PDF 
  → PdfUploader llama handleFileUpload 
    → Sube PDF a /api/upload/pdf (modo 'temp') 
      → Recibe tempUpload con storagePath real 
        → Lo agrega a tempUploads local + Zustand 
          → Al dar "Buscar Planes" 
            → ConversationPane crea caso CON tempUploads 
              → ✅ Backend procesa los PDFs y crea artifacts
```

**Conclusión:** La solución actual de "crear tempUpload en memoria" NO funciona porque el backend necesita un `storagePath` real. Necesitamos volver a subir a `/api/upload/pdf` pero corregir el error de "No se puede subir sin caseId".

---

### PROBLEMA 2: Landing Page en Modo Edición

**Síntoma:** Al enviar un mensaje desde el Landing con PDFs, el formulario aparece en "modo edición" cuando debería estar en modo creación.

**Ubicación del error:**
- `src/components/Landing/LandingChatInput.tsx` (línea 147-181)
- `src/lib/ui/state.ts` (gestión de brief)

**Causa raíz:**
El `handleSubmit` del Landing está guardando el `brief` en Zustand con `insurance_category: 'Por definir'`, pero el componente `CaseBriefForm` (panel derecho) probablemente está interpretando esto como que ya existe un caso (modo edición).

**Flujo actual (ROTO):**
```
Landing: Usuario envía mensaje + PDFs
  → setBrief({ insurance_category: 'Por definir', tempUploads })
    → Navega a /agent 
      → CaseBriefForm detecta brief.insurance_category 
        → ❌ Interpreta como "modo edición" 
          → Formulario aparece pre-llenado
```

**Flujo esperado (FUNCIONAL):**
```
Landing: Usuario envía mensaje + PDFs
  → setBrief({ insurance_category: 'Por definir', tempUploads })
    → Navega a /agent 
      → CaseBriefForm detecta que NO hay currentCaseId 
        → ✅ Interpreta como "modo creación" 
          → Formulario aparece vacío esperando datos
```

**Conclusión:** Necesitamos revisar cómo `CaseBriefForm` determina el modo (creación vs edición). Probablemente está verificando `brief.insurance_category` en lugar de `currentCaseId`.

---

### PROBLEMA 3: Error "Case is not in draft status"

**Síntoma:** Al intentar aprobar un caso desde el panel derecho, la API responde con error "Case is not in draft status".

**Ubicación del error:**
- `src/lib/ui/state.ts` (función `approveCurrentCase`, línea 820-821)
- `src/app/api/cases/approve/route.ts` (validación de estado)

**Causa raíz:**
El caso está siendo creado con un `status` que NO es `'draft'`, por lo que el endpoint `/api/cases/approve` rechaza la aprobación.

**Análisis del flujo:**
1. `CaseBriefForm.tsx` llama a `handleApproveWithValidation`
2. Este crea el caso con `status: 'draft'` (debería ser correcto)
3. Luego llama a `approveCurrentCase(clientId)`
4. El endpoint valida que el caso esté en estado `'draft'`
5. ❌ **FALLO**: El caso NO está en `'draft'`

**Posibles causas:**
- El caso ya fue aprobado previamente (el estado es `'active'` o similar)
- Hay un bug en la creación del caso que no establece correctamente el estado
- El `currentCaseId` está apuntando a un caso incorrecto

**Conclusión:** Necesitamos verificar:
1. Qué `status` tiene el caso cuando intentamos aprobarlo
2. Por qué se está creando con un estado incorrecto
3. Si existe un caso previo que está interfiriendo

---

### PROBLEMA 4: Complejidad Innecesaria con Botones

**Síntoma:** El usuario quiere eliminar el botón "Subir" del formulario de PDFs porque es redundante.

**Ubicación:**
- `src/components/Upload/PdfUploader.tsx` (renderiza el botón "Subir")

**Causa raíz:**
El componente `PdfUploader` tiene un botón "Subir" que llama a `/api/upload/pdf`, pero esto es redundante porque:
1. Los PDFs deberían subirse automáticamente al guardar el caso
2. El botón "Buscar Planes" o "Guardar Cambios" debe ser el único control

**Solución requerida:**
- Eliminar el botón "Subir" de `PdfUploader`
- Mostrar los PDFs seleccionados en una lista (solo vista previa)
- Los PDFs se subirán cuando se guarde el caso

---

## PLAN DE SOLUCIÓN

### FASE 1: CORREGIR SUBIDA DE PDFs EN MEMORIA → STORAGE

**Objetivo:** Hacer que los PDFs se suban realmente a Supabase Storage (bucket `temp-processing`) antes de crear el caso.

**Archivo a modificar:** `src/components/Cases/BriefForm.tsx`

**Cambio específico:**
- MODIFICAR `handleFileUpload` (línea 225-270)
- Volver a la llamada a `/api/upload/pdf` pero SIN `caseId`
- El endpoint debe aceptar uploads temporales sin `caseId` (SOLO para el panel derecho)

**Implementación:**
```typescript
const handleFileUpload = async (file: File) => {
  // Subir a /api/upload/pdf con metadata de "temp" sin caseId
  const formData = new FormData();
  formData.append('pdf', file);
  // NO incluir caseId
  
  const response = await fetch('/api/upload/pdf', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  
  if (result.success && result.mode === 'temp' && result.tempUpload) {
    setTempUploads(prev => [...prev, result.tempUpload]);
    // Sincronizar con Zustand...
  }
};
```

**Verificación en `/api/upload/pdf`:**
- Si NO hay `caseId`, crear upload temporal en bucket `temp-processing`
- Retornar `tempUpload` con `storagePath` real

---

### FASE 2: AJUSTAR PdfUploader PARA MOSTRAR VISTA PREVIA

**Objetivo:** Eliminar el botón "Subir" y mostrar los PDFs seleccionados como "Preparados para subir".

**Archivo a modificar:** `src/components/Upload/PdfUploader.tsx`

**Cambio específico:**
- MODIFICAR render (línea 169-220)
- Eliminar el botón "Subir" cuando no hay `caseId`
- Mostrar lista de PDFs con estado "Preparado"

---

### FASE 3: CORREGIR DETECCIÓN DE MODO EN CaseBriefForm

**Objetivo:** Asegurar que el Landing siempre abra el formulario en modo creación, no edición.

**Archivo a modificar:** `src/components/Workspace/CaseBriefForm.tsx`

**Cambio específico:**
- MODIFICAR lógica de `isEditing` (línea 23)
- Verificar que el modo depende ÚNICAMENTE de `currentCaseId`, no de `brief.insurance_category`

**Implementación:**
```typescript
const isEditing = !caseApproved && !currentCaseId; // Solo depende de caseApproved
```

---

### FASE 4: CORREGIR ESTADO DEL CASO EN APROBACIÓN

**Objetivo:** Asegurar que el caso se crea con `status: 'draft'` y se puede aprobar correctamente.

**Archivo a modificar:** `src/components/Workspace/CaseBriefForm.tsx`

**Cambio específico:**
- MODIFICAR `handleApproveWithValidation` (línea 67-155)
- Verificar que el caso se crea con `status: 'draft'`
- Agregar logs para debuggear el flujo

---

## RECOMENDACIONES ADICIONALES

1. **Testing exhaustivo:** Probar cada flujo (Landing, Panel Derecho, Edición) con PDFs y sin PDFs
2. **Logs de depuración:** Agregar console.logs en puntos clave del flujo para rastrear el estado
3. **Validación de estado:** Verificar en cada paso que el estado del caso es el esperado

---

## PRINCIPIOS APLICADOS

✅ **Reutilización Máxima:** Aprovechar `/api/upload/pdf` existente para uploads temporales  
✅ **Arquitectura Dual:** No modificar el flujo del Landing  
✅ **Consistencia de Estado:** `tempUploads` debe fluir desde UI → Zustand → API  
✅ **Separación de Responsabilidades:** BriefForm maneja UI, CaseBriefForm orquesta, APIs procesan

---

## CHECKLIST DE VALIDACIÓN

- [ ] Los PDFs del panel derecho se guardan correctamente en el caso
- [ ] El Landing abre el formulario en modo creación
- [ ] Se puede aprobar el caso sin error "Case is not in draft status"
- [ ] El botón "Subir" ya no aparece en el formulario
- [ ] Los PDFs se muestran como "Preparados para subir" antes de guardar

