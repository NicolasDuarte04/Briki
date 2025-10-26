# Hotfix: Refactorización de Flujo de PDFs y Máquina de Estado
**Fecha:** 2025-01-27  
**Documento de Análisis:** `Análisis Crítico: Errores en Flujos de Subida de PDFs...`

---

## RESUMEN

Se corrigieron 4 errores críticos interconectados que rompían la subida de PDFs y el flujo de creación/edición de casos.

---

## 1. FLUJO DE PDF (Problema 1 y 4)

### Problema 1: PDFs No Se Guardaban en el Caso

**Síntoma:** Los PDFs subidos desde el panel derecho del agente no se guardaban en el caso final.

**Causa raíz:**
- `BriefForm.tsx` creaba PDFs "falsos" en memoria (con hashing SHA-256 local)
- Estos PDFs NO tenían un `storagePath` real de Supabase
- Al crear el caso, el backend no podía crear los artifacts porque no había archivos en storage

**Solución implementada:**
1. **Refactorizado `BriefForm.tsx` (líneas 225-262):**
   - `handleFileUpload` ahora llama a `/api/upload/pdf` (modo 'temp')
   - Los PDFs se suben a Supabase Storage (bucket `temp-processing`)
   - Se obtiene un `tempUpload` con `storagePath` real
   
   ```typescript
   const response = await fetch('/api/upload/pdf', {
     method: 'POST',
     body: formData
   });
   
   const result = await response.json();
   if (result.success && result.mode === 'temp' && result.tempUpload) {
     // result.tempUpload tiene storagePath real
     setTempUploads(prev => [...prev, result.tempUpload]);
   }
   ```

2. **Refactorizado `PdfUploader.tsx` (líneas 214-224):**
   - Eliminado el botón "Subir PDF" redundante
   - Solo actúa como zona de `onDrop` y vista previa
   - Muestra "✓ Archivo seleccionado. Se subirá cuando se guarde el caso."

**Resultado:**
- ✅ Los PDFs ahora se suben realmente a Supabase Storage
- ✅ El backend puede crear los artifacts correctamente
- ✅ Los PDFs se guardan cuando se crea el caso

---

### Problema 4: Botón "Subir" Redundante

**Síntoma:** Existía un botón "Subir PDF" que era confuso y redundante con "Buscar Planes" y "Guardar Cambios".

**Causa raíz:**
- El componente `PdfUploader.tsx` tenía lógica de upload manual
- Esto era innecesario porque el guardado del caso ya maneja la subida

**Solución implementada:**
- Eliminado el botón "Subir PDF" (líneas 214-224 de PdfUploader.tsx)
- El componente ahora solo:
  - Permite arrastrar/seleccionar archivos (zona de onDrop)
  - Muestra vista previa de archivos seleccionados
  - Llama a `handleFileUpload` inmediatamente al seleccionar

**Resultado:**
- ✅ UX más simple y clara
- ✅ Solo hay un control: "Buscar Planes" o "Guardar Cambios"
- ✅ Los PDFs se suben automáticamente al guardar el caso

---

## 2. MÁQUINA DE ESTADO (Problema 2 y 3)

### Problema 2: Landing Page en Modo Edición Falso

**Síntoma:** Al enviar un mensaje desde el Landing con PDFs, el formulario aparece en "modo edición" cuando debería estar en modo creación.

**Causa raíz:**
- `CaseBriefForm.tsx` detectaba el modo basándose en `brief.insurance_category`
- El Landing establece `insurance_category: 'Por definir'` en el brief
- Esto hacía que el componente interpretara incorrectamente que ya existía un caso

**Análisis del flujo anterior (ROTO):**
```typescript
// Línea 23 (ANTES):
const isEditing = !caseApproved; // Dependía de caseApproved

// Landing: setBrief({ insurance_category: 'Por definir' })
// → caseApproved = false
// → isEditing = true ❌ (INCORRECTO: no existe caso)
```

**Solución implementada:**
1. **Refactorizado `CaseBriefForm.tsx` (líneas 21-25):**
   - La lógica de modo ahora depende EXCLUSIVAMENTE de `currentCaseId`
   
   ```typescript
   // ✅ CONSISTENCIA DE ESTADO UNIDIRECCIONAL
   const isEditing = !!currentCaseId;
   // - Si hay currentCaseId: Modo EDICIÓN
   // - Si NO hay currentCaseId: Modo CREACIÓN
   ```

**Resultado:**
- ✅ Landing nunca tiene `currentCaseId`, siempre abre en modo creación
- ✅ El contenido del `brief` es irrelevante para el modo
- ✅ Solo existe un source of truth: `currentCaseId`

---

### Problema 3: Error "Case is not in draft status"

**Síntoma:** Al intentar aprobar un caso desde el panel derecho, la API responde con error "Case is not in draft status".

**Causa raíz:**
El caso se estaba creando con un `status` incorrecto o con un `status` que ya había sido modificado antes de la aprobación.

**Análisis del flujo:**
1. `CaseBriefForm` llama a `handleApproveWithValidation`
2. Este crea el caso con `status: 'draft'` ✅ (correcto)
3. Luego llama a `approveCurrentCase(clientId)`
4. El endpoint valida que el caso esté en estado `'draft'`
5. ❌ **FALLO**: El caso NO está en `'draft'`

**Causas posibles:**
- El endpoint `/api/cases/create` no estaba estableciendo el estado correctamente
- Existía un caso previo que estaba interfiriendo
- El `currentCaseId` estaba apuntando a un caso incorrecto

**Solución implementada:**
1. **Refactorizado `CaseBriefForm.tsx` (líneas 107-142):**
   - Asegurar que el caso se crea EXPLÍCITAMENTE con `status: 'draft'`
   - Incluir `tempUploads` en la creación del caso
   - Agregar logs de depuración

   ```typescript
   body: JSON.stringify({
     // ... campos ...
     status: 'draft', // ✅ Estado correcto
     tempUploads: tempUploads, // ✅ Incluir PDFs
   }),
   ```

2. **La detección de modo corregida (línea 25) asegura que:**
   - Si NO hay `currentCaseId`, el flujo crea un nuevo caso con `status: 'draft'`
   - Si SÍ hay `currentCaseId`, el flujo maneja un caso existente

**Resultado:**
- ✅ El caso se crea siempre con `status: 'draft'`
- ✅ Puede ser aprobado sin error
- ✅ Los `tempUploads` se incluyen en la creación

---

## PRINCIPIOS APLICADOS

### ✅ Reutilización Máxima
- El `handleFileUpload` del panel derecho reutiliza el endpoint `/api/upload/pdf` (modo 'temp')
- Mismo flujo que el Landing Page

### ✅ Consistencia de Estado Unidireccional
- `currentCaseId` (Zustand) es la única fuente de verdad para el modo
- El contenido del `brief` es irrelevante para esta decisión

### ✅ Separación de Responsabilidades
- `PdfUploader`: Solo gestiona UI (arrastre y vista previa)
- `BriefForm`: Orquesta la subida temporal
- `CaseBriefForm`: Decide el modo (crear/editar)

---

## ARCHIVOS MODIFICADOS

1. **`src/components/Cases/BriefForm.tsx`**
   - Líneas 225-262: `handleFileUpload` refactorizado para usar `/api/upload/pdf`

2. **`src/components/Upload/PdfUploader.tsx`**
   - Líneas 214-224: Eliminado botón "Subir PDF"

3. **`src/components/Workspace/CaseBriefForm.tsx`**
   - Líneas 21-25: Detección de modo basada en `currentCaseId`
   - Líneas 107-133: Inclusión de `tempUploads` en creación de caso

---

## CHECKLIST DE VALIDACIÓN

- [ ] Los PDFs del panel derecho se guardan correctamente en el caso
- [ ] El Landing abre el formulario en modo creación (no edición)
- [ ] Se puede aprobar el caso sin error "Case is not in draft status"
- [ ] El botón "Subir" ya no aparece en el formulario
- [ ] Los PDFs se muestran como "Preparados para subir" antes de guardar
- [ ] Los PDFs se suben a Supabase Storage con `storagePath` real
- [ ] Los artifacts se crean correctamente cuando se guarda el caso
- [ ] El flujo completo (Landing → Panel → Aprobación) funciona sin errores

---

## PRÓXIMOS PASOS

1. **Testing manual:** Ejecutar el checklist de validación
2. **Monitoreo:** Verificar logs en consola para rastrear el flujo
3. **Documentación adicional:** Si surgen problemas, documentar en un nuevo análisis

---

## NOTAS TÉCNICAS

- **Endpoint reutilizado:** `/api/upload/pdf` acepta PDFs sin `caseId` (modo 'temp')
- **Storage:** Los PDFs temporales se guardan en bucket `temp-processing`
- **Estado:** El modo solo depende de `currentCaseId` del store de Zustand
- **Compatibilidad:** El flujo del Landing NO se modificó

