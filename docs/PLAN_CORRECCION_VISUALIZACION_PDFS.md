P# PLAN QUIRÚRGICO: CORRECCIÓN DE VISUALIZACIÓN DE PDFs EN MODO EDICIÓN

## 📋 CONTEXTO DEL PROBLEMA

**Síntoma reportado:**
Cuando se abre un caso histórico en modo edición, se está mostrando la visualización completa de artifacts con:
- Título "Artefactos del Caso" con contador
- Vista previa completa del PDF (iframe)
- Botones "Ver PDF" y "Descargar"
- Sección "Ver Metadata" expandible
- Texto "Documentos existentes:" (si existe)

**Comportamiento esperado:**
Los PDFs históricos deben mostrarse como una lista simple de "Auto-llenados", similar a cuando se envían desde LandingPage, mostrando solo:
- Nombre del archivo
- Número de páginas
- Tamaño en KB
- Botón para eliminar (X)

---

## 🔍 ANÁLISIS EXHAUSTIVO DE COMPONENTES

### 1. **Componente: `BriefForm.tsx`**
**Ubicación:** `src/components/Cases/BriefForm.tsx`

**Estado actual:**
- ✅ Ya tiene lógica para convertir `artifacts` a `tempUploads` usando `useMemo` y `useState`
- ✅ Ya tiene renderizado de `tempUploads` en formato simple (líneas 940-972)
- ❌ **PROBLEMA POTENCIAL:** Puede haber un renderizado condicional que muestre artifacts directamente antes de la conversión

**Líneas críticas a revisar:**
- Líneas 220-256: Inicialización de `tempUploads` desde `artifacts`
- Líneas 258-310: `useEffect` para conversión de artifacts
- Líneas 920-974: Sección de renderizado de PDFs
- **VERIFICAR:** Si hay algún renderizado condicional de `initialData?.artifacts` que no esté siendo filtrado

**Riesgos identificados:**
1. **Race condition:** Si `initialData.artifacts` se pasa pero `useMemo` no se ejecuta a tiempo, puede haber un render intermedio mostrando artifacts
2. **Dependencias de `useMemo`:** Si `initialData?.artifacts` cambia después del primer render, `useMemo` puede no recalcular
3. **Renderizado condicional faltante:** Puede haber código que renderice artifacts directamente sin verificar si ya fueron convertidos

---

### 2. **Componente: `CaseBriefForm.tsx`**
**Ubicación:** `src/components/Workspace/CaseBriefForm.tsx`

**Estado actual:**
- ✅ Pasa `activeCaseData` con `artifacts` a `BriefForm` (líneas 437-445)
- ✅ No renderiza `ArtifactsList` directamente
- ❌ **VERIFICAR:** Si hay algún renderizado condicional adicional que muestre artifacts

**Líneas críticas a revisar:**
- Líneas 437-445: Paso de `initialData` con `artifacts` a `BriefForm`
- **VERIFICAR:** Si hay algún renderizado condicional de `activeCaseData.artifacts` fuera de `BriefForm`

---

### 3. **Componente: `ArtifactsList.tsx`**
**Ubicación:** `src/components/Workspace/ArtifactsList.tsx`

**Estado actual:**
- ✅ Componente que renderiza la visualización completa (vista previa, descarga, metadata)
- ✅ NO está siendo importado en `BriefForm.tsx` (verificado)
- ❌ **VERIFICAR:** Si está siendo importado y usado en algún componente padre o hermano

**Líneas críticas:**
- Línea 249: Renderiza "Artefactos del Caso" (texto que el usuario ve)
- Líneas 254-269: Renderiza `ArtifactCard` con vista previa completa

**Búsqueda necesaria:**
- Verificar si `ArtifactsList` está siendo importado en algún componente que se renderice junto con `BriefForm`
- Verificar si hay algún componente que renderice `ArtifactsList` condicionalmente cuando `mode === 'edit'`

---

### 4. **Componente: `CaseSummary.tsx`**
**Ubicación:** `src/components/Workspace/CaseSummary.tsx`

**Estado actual:**
- ✅ NO renderiza artifacts (verificado)
- ✅ Solo muestra resumen de datos del caso
- ✅ No es relevante para el problema

---

### 5. **Componente: `WorkspaceTabs.tsx`**
**Ubicación:** `src/components/Workspace/Tabs.tsx`

**Estado actual:**
- ✅ Controla la visualización de `CaseBriefForm` vs `CaseSummary`
- ✅ Pasa `isEditingMode` a `CaseBriefForm`
- ❌ **VERIFICAR:** Si hay algún renderizado adicional de artifacts o `ArtifactsList` en este componente

**Líneas críticas:**
- Líneas 263-273: Renderizado condicional de `CaseBriefForm` o `CaseSummary`
- **VERIFICAR:** Si hay algún `TabsContent` adicional que renderice `ArtifactsList`

---

## 🎯 HIPÓTESIS DEL PROBLEMA

### Hipótesis 1: Renderizado condicional de artifacts en `BriefForm`
**Probabilidad:** ALTA
**Descripción:** Puede haber un bloque de código que renderice `initialData?.artifacts` directamente antes de que se conviertan a `tempUploads`, o que se renderice cuando `tempUploads` está vacío pero `artifacts` no.

**Verificación necesaria:**
- Buscar cualquier `initialData?.artifacts?.map` o renderizado condicional de artifacts
- Verificar si hay un `useEffect` que renderice artifacts antes de la conversión

### Hipótesis 2: `ArtifactsList` renderizado en componente padre
**Probabilidad:** MEDIA
**Descripción:** `ArtifactsList` puede estar siendo renderizado en `CaseBriefForm` o `WorkspaceTabs` cuando `mode === 'edit'`, mostrándose junto con `BriefForm`.

**Verificación necesaria:**
- Buscar imports de `ArtifactsList` en componentes padre
- Verificar si hay renderizado condicional de `ArtifactsList` basado en `mode` o `isEditing`

### Hipótesis 3: Race condition en conversión
**Probabilidad:** MEDIA
**Descripción:** `useMemo` puede no estar recalculando cuando `initialData.artifacts` cambia, o puede haber un render intermedio donde `tempUploads` está vacío pero `artifacts` está presente.

**Verificación necesaria:**
- Revisar dependencias de `useMemo` para `initialTempUploads`
- Verificar si hay un render intermedio donde `tempUploads.length === 0` pero `initialData?.artifacts?.length > 0`

### Hipótesis 4: Texto "Documentos existentes:" de código legacy
**Probabilidad:** BAJA
**Descripción:** Puede haber código legacy que renderice un label "Documentos existentes:" seguido de `ArtifactsList` o artifacts directamente.

**Verificación necesaria:**
- Buscar el texto "Documentos existentes:" en todo el código
- Verificar si hay código condicional que renderice este texto

---

## 📝 PLAN DE IMPLEMENTACIÓN QUIRÚRGICA

### FASE 1: VERIFICACIÓN Y DIAGNÓSTICO

#### Paso 1.1: Búsqueda exhaustiva de renderizado de artifacts
**Objetivo:** Identificar TODOS los lugares donde se renderizan artifacts o `ArtifactsList`

**Acciones:**
1. Buscar todos los imports de `ArtifactsList` en el proyecto
2. Buscar todos los `initialData?.artifacts?.map` o `artifacts.map` en componentes relacionados
3. Buscar renderizado condicional de artifacts basado en `mode === 'edit'`
4. Buscar el texto "Documentos existentes:" o "Artefactos del Caso" en componentes relacionados

**Archivos a revisar:**
- `src/components/Cases/BriefForm.tsx` (completo)
- `src/components/Workspace/CaseBriefForm.tsx` (completo)
- `src/components/Workspace/Tabs.tsx` (completo)
- `src/components/Workspace/ArtifactsList.tsx` (verificar dónde se usa)
- Cualquier componente que importe `ArtifactsList`

**Resultado esperado:**
- Lista completa de todos los lugares donde se renderizan artifacts
- Identificación del componente exacto que está causando el problema

---

#### Paso 1.2: Análisis de flujo de datos
**Objetivo:** Entender el flujo completo de `artifacts` desde `activeCaseData` hasta el renderizado

**Acciones:**
1. Trazar el flujo: `activeCaseData.artifacts` → `CaseBriefForm.initialData` → `BriefForm.initialData` → `tempUploads`
2. Verificar si hay algún punto donde `artifacts` se renderiza directamente sin pasar por `tempUploads`
3. Verificar si hay renderizado condicional que muestre artifacts cuando `tempUploads.length === 0`

**Puntos críticos:**
- `CaseBriefForm.tsx` línea 437-445: Paso de `artifacts` a `BriefForm`
- `BriefForm.tsx` línea 244-253: `useMemo` para conversión
- `BriefForm.tsx` línea 256: Inicialización de `tempUploads`
- `BriefForm.tsx` línea 941-972: Renderizado de `tempUploads`

**Resultado esperado:**
- Diagrama de flujo de datos
- Identificación de puntos donde puede haber renderizado intermedio

---

### FASE 2: CORRECCIONES QUIRÚRGICAS

#### Paso 2.1: Eliminar renderizado directo de artifacts (si existe)
**Objetivo:** Asegurar que NUNCA se rendericen artifacts directamente, solo `tempUploads`

**Acciones:**
1. **Si se encuentra renderizado de `ArtifactsList`:**
   - Eliminar el import de `ArtifactsList`
   - Eliminar el renderizado condicional de `ArtifactsList`
   - Asegurar que solo se renderice la lista simple de `tempUploads`

2. **Si se encuentra renderizado directo de `initialData?.artifacts`:**
   - Eliminar cualquier `initialData?.artifacts?.map` o renderizado condicional
   - Asegurar que solo se use `tempUploads` para renderizar

3. **Si se encuentra texto "Documentos existentes:" o similar:**
   - Eliminar el label o sección que lo contiene
   - Asegurar que solo se muestre "Documentos asociados:" con la lista simple

**Archivos a modificar:**
- `src/components/Cases/BriefForm.tsx` (si se encuentra renderizado)
- `src/components/Workspace/CaseBriefForm.tsx` (si se encuentra renderizado)
- `src/components/Workspace/Tabs.tsx` (si se encuentra renderizado)

**Validación:**
- No debe haber ningún `ArtifactsList` importado o renderizado
- No debe haber ningún `initialData?.artifacts?.map` o renderizado directo
- Solo debe haber renderizado de `tempUploads` en formato simple

---

#### Paso 2.2: Fortalecer conversión de artifacts a tempUploads
**Objetivo:** Asegurar que la conversión ocurra SIEMPRE antes del primer render y en todos los casos

**Acciones:**
1. **Mejorar `useMemo` de `initialTempUploads`:**
   - Asegurar que se recalcule cuando `initialData.artifacts` cambie
   - Agregar validación para asegurar que siempre convierta si hay artifacts
   - Agregar logging para debugging

2. **Mejorar `useEffect` de conversión:**
   - Asegurar que se ejecute inmediatamente cuando `mode === 'edit'` y hay artifacts
   - Agregar validación para evitar renderizado intermedio
   - Sincronizar con `brief` global de manera más robusta

3. **Agregar guard clause en renderizado:**
   - Verificar que `tempUploads.length > 0` antes de renderizar
   - NO renderizar artifacts directamente bajo ninguna circunstancia
   - Agregar fallback si `tempUploads` está vacío pero `artifacts` no (forzar conversión)

**Archivos a modificar:**
- `src/components/Cases/BriefForm.tsx` (líneas 220-310)

**Código sugerido:**
```typescript
// ✅ CORRECCIÓN CRÍTICA: Asegurar conversión ANTES del render
const initialTempUploads = useMemo(() => {
  if (mode === 'edit' && initialData?.artifacts) {
    const artifacts = Array.isArray(initialData.artifacts) ? initialData.artifacts : [];
    if (artifacts.length > 0) {
      const converted = convertArtifactsToTempUploads(artifacts);
      if (converted.length > 0) {
        console.log('✅ [BriefForm] Inicializando tempUploads desde artifacts:', converted.length);
        return converted;
      }
    }
  }
  return [];
}, [mode, initialData?.artifacts, convertArtifactsToTempUploads]);

// ✅ CORRECCIÓN CRÍTICA: Estado inicializado con artifacts convertidos
const [tempUploads, setTempUploads] = useState<TempUpload[]>(initialTempUploads);

// ✅ CORRECCIÓN CRÍTICA: useEffect para sincronizar cuando artifacts cambian
useEffect(() => {
  if (mode === 'edit' && initialData?.artifacts) {
    const artifacts = Array.isArray(initialData.artifacts) ? initialData.artifacts : [];
    if (artifacts.length > 0) {
      const converted = convertArtifactsToTempUploads(artifacts);
      // ✅ FORZAR conversión si tempUploads está vacío o diferente
      const currentPaths = tempUploads.map(u => u.storagePath).sort().join(',');
      const convertedPaths = converted.map(u => u.storagePath).sort().join(',');
      
      if (currentPaths !== convertedPaths) {
        console.log('✅ [BriefForm] Sincronizando tempUploads desde artifacts:', converted.length);
        setTempUploads(converted);
        // Sincronizar con brief global
        const currentBrief = useUI.getState().brief;
        setBrief({
          ...currentBrief,
          tempUploads: converted
        } as any);
      }
    }
  }
}, [mode, initialData?.artifacts, convertArtifactsToTempUploads, tempUploads, setBrief]);
```

**Validación:**
- `tempUploads` debe estar siempre sincronizado con `initialData.artifacts` cuando `mode === 'edit'`
- No debe haber renderizado intermedio donde `artifacts` se muestre directamente
- Logs deben confirmar la conversión antes del render

---

#### Paso 2.3: Asegurar renderizado único de tempUploads
**Objetivo:** Asegurar que SOLO se renderice la lista simple de `tempUploads`, nunca artifacts

**Acciones:**
1. **Verificar sección de renderizado de PDFs:**
   - Asegurar que solo se renderice `tempUploads` (líneas 940-972)
   - Eliminar cualquier renderizado condicional de `initialData?.artifacts`
   - Asegurar que el label sea "Documentos asociados:" (no "Documentos existentes:")

2. **Agregar guard clause:**
   - Verificar que `tempUploads.length > 0` antes de renderizar
   - NO renderizar si `tempUploads` está vacío (incluso si hay artifacts)
   - Forzar conversión si `tempUploads` está vacío pero `artifacts` no

3. **Eliminar cualquier import o uso de `ArtifactsList`:**
   - Verificar que no haya imports de `ArtifactsList` en `BriefForm.tsx`
   - Verificar que no haya renderizado de `ArtifactsList` en ningún componente relacionado

**Archivos a modificar:**
- `src/components/Cases/BriefForm.tsx` (líneas 920-974)

**Código sugerido:**
```typescript
{/* Sección de Carga de PDFs */}
{orgId && (
  <div className="space-y-4 pt-4 border-t">
    <div className="space-y-2">
      <Label className="text-base font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Documentos Adjuntos
      </Label>
      <p className="text-sm text-muted-foreground">
        Sube documentos PDF que contengan información relevante para el caso
      </p>
    </div>
    
    <PdfUploader
      caseId={undefined}
      orgId={orgId}
      onFileSelected={handleFileUpload}
      onUploadComplete={handleUploadComplete}
    />
    
    {/* ✅ CORRECCIÓN CRÍTICA: SOLO renderizar tempUploads, NUNCA artifacts directamente */}
    {tempUploads.length > 0 && (
      <div className="space-y-2 mt-4">
        <Label className="text-sm font-medium">Documentos asociados:</Label>
        <div className="space-y-2">
          {tempUploads.map((upload) => (
            <div key={upload.storagePath} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{upload.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {upload.pageCount ? `${upload.pageCount} páginas` : ''}
                    {upload.pageCount && upload.fileSize ? ' • ' : ''}
                    {upload.fileSize ? `${Math.round(upload.fileSize / 1024)} KB` : ''}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveUpload(upload.storagePath)}
                className="flex-shrink-0"
                aria-label="Eliminar archivo"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    )}
    
    {/* ✅ CORRECCIÓN CRÍTICA: NO renderizar artifacts directamente bajo ninguna circunstancia */}
    {/* ❌ ELIMINAR CUALQUIER CÓDIGO QUE RENDERICE initialData?.artifacts O ArtifactsList */}
  </div>
)}
```

**Validación:**
- Solo debe haber un bloque de renderizado de PDFs (lista simple de `tempUploads`)
- No debe haber renderizado de `ArtifactsList` o artifacts directamente
- El label debe ser "Documentos asociados:" (no "Documentos existentes:" o "Artefactos del Caso")

---

### FASE 3: VALIDACIÓN Y TESTING

#### Paso 3.1: Verificación de código
**Objetivo:** Asegurar que no haya código que renderice artifacts directamente

**Checklist:**
- [ ] No hay imports de `ArtifactsList` en `BriefForm.tsx`
- [ ] No hay imports de `ArtifactsList` en `CaseBriefForm.tsx`
- [ ] No hay renderizado de `ArtifactsList` en ningún componente relacionado
- [ ] No hay `initialData?.artifacts?.map` o renderizado directo de artifacts
- [ ] Solo hay renderizado de `tempUploads` en formato simple
- [ ] El label es "Documentos asociados:" (no "Documentos existentes:" o "Artefactos del Caso")
- [ ] `useMemo` y `useEffect` están correctamente configurados para conversión

---

#### Paso 3.2: Testing manual
**Objetivo:** Verificar que el comportamiento sea el esperado

**Escenarios a probar:**
1. **Caso histórico con artifacts:**
   - Abrir un caso histórico que tenga artifacts
   - Hacer clic en "Editar Brief"
   - **Verificar:** Debe mostrar solo la lista simple de PDFs (nombre, páginas, tamaño, botón X)
   - **Verificar:** NO debe mostrar "Artefactos del Caso", vista previa, botones de descarga, o metadata

2. **Caso histórico sin artifacts:**
   - Abrir un caso histórico sin artifacts
   - Hacer clic en "Editar Brief"
   - **Verificar:** No debe mostrar ninguna sección de artifacts
   - **Verificar:** Solo debe mostrar el `PdfUploader` para subir nuevos PDFs

3. **Caso histórico con artifacts + nuevos PDFs:**
   - Abrir un caso histórico con artifacts
   - Hacer clic en "Editar Brief"
   - Subir un nuevo PDF
   - **Verificar:** Debe mostrar todos los PDFs (históricos + nuevos) en la lista simple
   - **Verificar:** NO debe mostrar vista previa, descarga, o metadata

4. **Caso nuevo desde LandingPage:**
   - Enviar PDFs desde LandingPage
   - **Verificar:** Debe mostrar la lista simple de PDFs (comportamiento existente, no debe romperse)

---

#### Paso 3.3: Testing de regresión
**Objetivo:** Asegurar que no se rompió ninguna funcionalidad existente

**Funcionalidades a verificar:**
- [ ] Creación de casos nuevos funciona correctamente
- [ ] Subida de PDFs desde LandingPage funciona correctamente
- [ ] Edición de casos históricos funciona correctamente
- [ ] Actualización de casos con nuevos PDFs funciona correctamente
- [ ] Eliminación de PDFs de la lista funciona correctamente
- [ ] Guardado de formulario funciona correctamente

---

## 🛡️ PRINCIPIOS A CONSERVAR

1. **Reutilización máxima del código existente:**
   - Reutilizar la función `convertArtifactsToTempUploads` existente
   - Reutilizar el renderizado simple de `tempUploads` existente
   - NO crear nuevos componentes, solo modificar los existentes

2. **Mantenimiento de la arquitectura dual:**
   - Mantener la separación entre `BriefForm` (formulario) y `CaseBriefForm` (wrapper)
   - Mantener la lógica de conversión en `BriefForm`
   - Mantener el flujo de datos unidireccional

3. **Consistencia de estado unidireccional:**
   - `artifacts` → `tempUploads` (conversión unidireccional)
   - `tempUploads` → renderizado (renderizado unidireccional)
   - NO permitir renderizado directo de artifacts

4. **Separación clara de responsabilidades:**
   - `BriefForm`: Conversión de artifacts a tempUploads y renderizado simple
   - `CaseBriefForm`: Paso de datos y manejo de estado de edición
   - `ArtifactsList`: Solo para visualización completa (NO en modo edición)

---

## ⚠️ RIESGOS IDENTIFICADOS Y MITIGACIÓN

### Riesgo 1: Romper funcionalidad de creación de casos
**Probabilidad:** BAJA
**Impacto:** ALTO
**Mitigación:**
- Verificar que `mode === 'create'` no se vea afectado
- Mantener la lógica existente para casos nuevos
- Testing exhaustivo de creación de casos

### Riesgo 2: Romper funcionalidad de subida desde LandingPage
**Probabilidad:** BAJA
**Impacto:** ALTO
**Mitigación:**
- Verificar que `landingDataPending` y `brief.tempUploads` funcionen correctamente
- Mantener la lógica existente para auto-llenado desde LandingPage
- Testing exhaustivo de flujo desde LandingPage

### Riesgo 3: Race condition en conversión
**Probabilidad:** MEDIA
**Impacto:** MEDIO
**Mitigación:**
- Usar `useMemo` para conversión antes del render
- Usar `useEffect` para sincronización después del render
- Agregar logging para debugging
- Agregar guard clauses para evitar renderizado intermedio

### Riesgo 4: Renderizado duplicado
**Probabilidad:** BAJA
**Impacto:** BAJO
**Mitigación:**
- Verificar que solo haya un bloque de renderizado de PDFs
- Eliminar cualquier renderizado condicional duplicado
- Testing visual para verificar que no hay duplicación

---

## 📊 RESUMEN DE CAMBIOS ESPERADOS

### Archivos a modificar:
1. **`src/components/Cases/BriefForm.tsx`**
   - Fortalecer conversión de artifacts a tempUploads
   - Eliminar cualquier renderizado directo de artifacts
   - Asegurar que solo se renderice tempUploads en formato simple

2. **`src/components/Workspace/CaseBriefForm.tsx`** (si es necesario)
   - Eliminar cualquier renderizado de ArtifactsList
   - Asegurar que solo pase datos a BriefForm

3. **`src/components/Workspace/Tabs.tsx`** (si es necesario)
   - Eliminar cualquier renderizado de ArtifactsList
   - Asegurar que solo renderice CaseBriefForm

### Archivos a verificar (sin cambios esperados):
- `src/components/Workspace/ArtifactsList.tsx` (solo verificar dónde se usa)
- `src/components/Workspace/CaseSummary.tsx` (ya verificado, no renderiza artifacts)

---

## ✅ CRITERIOS DE ÉXITO

1. **Visualización correcta:**
   - Los PDFs históricos se muestran solo como lista simple (nombre, páginas, tamaño, botón X)
   - NO se muestra "Artefactos del Caso", vista previa, descarga, o metadata
   - El label es "Documentos asociados:" (no "Documentos existentes:")

2. **Funcionalidad preservada:**
   - Creación de casos nuevos funciona correctamente
   - Subida desde LandingPage funciona correctamente
   - Edición de casos históricos funciona correctamente
   - Actualización con nuevos PDFs funciona correctamente

3. **Código limpio:**
   - No hay imports innecesarios de `ArtifactsList`
   - No hay renderizado directo de artifacts
   - Solo hay un bloque de renderizado de PDFs (lista simple)
   - Conversión de artifacts a tempUploads es robusta y consistente

---

## 🎯 ORDEN DE IMPLEMENTACIÓN

1. **FASE 1:** Verificación y diagnóstico (identificar el problema exacto)
2. **FASE 2:** Correcciones quirúrgicas (implementar las correcciones)
3. **FASE 3:** Validación y testing (verificar que todo funciona)

**IMPORTANTE:** NO implementar código hasta completar FASE 1 y tener confirmación del diagnóstico.

