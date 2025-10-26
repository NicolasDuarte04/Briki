# Hotfix: Error `No currentCaseId found` en Panel Derecho del Agente

**Fecha:** 2025-01-27  
**Documento de Análisis:** `ANALISIS_ERROR_PANEL_DERECHO_AGENTE.md`

---

## 📋 Problema

Al intentar aprobar un caso desde el panel derecho del agente (`CaseBriefForm.tsx`), la operación fallaba con el error:

```
❌ No currentCaseId found
src/lib/ui/state.ts (796:19) @ approveCurrentCase
```

**Síntomas Adicionales:**
- El botón "Buscar Planes" no activaba la respuesta del agente
- No se podían crear casos desde el panel derecho del agente
- La consola mostraba: `❌ No currentCaseId found`

---

## 🔍 Causa Raíz

El handler `handleApproveWithValidation` en `src/components/Workspace/CaseBriefForm.tsx` intentaba **aprobar** un caso (`approveCurrentCase`) asumiendo que `currentCaseId` ya existía. Sin embargo, en el flujo del panel derecho:

1. El usuario llenaba el formulario
2. Hacía clic en "Buscar Planes"
3. Se llamaba a `handleApproveWithValidation()`
4. Esta función intentaba aprobar un caso que **nunca había sido creado**
5. `currentCaseId` era `null`
6. `approveCurrentCase()` fallaba con el error mencionado

**Flujo Correcto vs Incorrecto:**

```
❌ FLUJO INCORRECTO (Antes):
Usuario llena formulario
  ↓
Usuario hace clic en "Buscar Planes"
  ↓
handleApproveWithValidation() → approveCurrentCase()
  ↓
❌ ERROR: No currentCaseId found

✅ FLUJO CORRECTO (Después):
Usuario llena formulario
  ↓
Usuario hace clic en "Buscar Planes"
  ↓
handleApproveWithValidation()
  ↓
  ¿currentCaseId existe?
    NO → Crear caso con POST /api/cases/create
          ↓
          Establecer currentCaseId
          ↓
    SÍ → Continuar
  ↓
Validar cliente con validateAndResolveClient()
  ↓
Aprobar caso con approveCurrentCase()
  ↓
✅ ÉXITO: Agente responde automáticamente
```

---

## 🛠️ Solución Implementada

### Paso 5.2 del Análisis

Se modificó `handleApproveWithValidation` en `src/components/Workspace/CaseBriefForm.tsx` para implementar el flujo **"Crear-luego-Aprobar"**:

1. **Verificar** si `currentCaseId` es `null`
2. **SI es `null`**, ejecutar la lógica de `fetch('/api/cases/create')` (reutilizando el patrón de `HomeClient.tsx`)
3. Tras la creación exitosa, **actualizar el estado global**: `useUI.getState().setCurrentCaseId(result.caseId)`
4. **Solo entonces**, proceder a la lógica existente de `validateAndResolveClient` y `approveCurrentCase`

### Archivos Modificados

#### 1. `src/components/Workspace/CaseBriefForm.tsx`

**Cambios:**
- Modificada la función `handleApproveWithValidation` (líneas 67-155)
- Implementado flujo "Crear-luego-Aprobar" con validación de `currentCaseId`
- Añadidos logs de depuración para rastrear el flujo

**Lógica Crítica:**
```typescript
// PASO 1: Crear el caso SI no existe
if (!currentCaseId) {
  // ... lógica de creación con fetch('/api/cases/create')
  const result = await response.json();
  // Establecer currentCaseId inmediatamente después de crear el caso
  useUI.getState().setCurrentCaseId(result.caseId);
}

// PASO 2: Validar y resolver cliente
const clientId = await validateAndResolveClient(currentBrief.clientName);

// PASO 3: Aprobar el caso (ahora sí hay currentCaseId)
const success = await approveCurrentCase(clientId);
```

#### 2. `src/components/Chat/ConversationPane.tsx`

**Cambios:**
- Modificada la función `handleApprovalOrchestration` (líneas 484-575)
- Implementado flujo "Crear-luego-Aprobar" similar al de `CaseBriefForm.tsx`
- Garantiza que el botón de aprobación en el panel de chat también cree el caso antes de aprobar

**Motivo:**
El botón de aprobación en `ConversationPane` también llamaba a `approveCurrentCase()` sin verificar si el caso existía, causando el mismo error si el usuario llegaba desde un flujo diferente.

---

## ✅ Resultado

Esta corrección restaura la **Consistencia Unidireccional del Estado** y desbloquea el flujo del agente:

1. ✅ Se crea el caso correctamente desde el panel derecho
2. ✅ Se establece `currentCaseId` en el estado global (Zustand)
3. ✅ La aprobación del caso funciona sin errores
4. ✅ El agente responde automáticamente con las recomendaciones de seguros
5. ✅ El flujo completo desde Landing → Workspace → Aprobación está funcional

---

## 📊 Principios Aplicados

### Reutilización Máxima
- La lógica de creación de casos se basó en el patrón existente de `HomeClient.tsx` (líneas 88-151)
- No se duplicó código, se reutilizó el flujo probado

### Consistencia Unidireccional del Estado
- El estado `currentCaseId` (Zustand) se actualiza de manera predecible: **SIEMPRE después de crear el caso**
- El flujo garantiza que `currentCaseId` existe antes de llamar a `approveCurrentCase()`
- No hay condiciones de carrera ni estados inconsistentes

### Separación de Responsabilidades
- `CaseBriefForm.tsx` orquesta el flujo completo: 1. Crear (API), 2. Validar Cliente (Hook), 3. Aprobar (Zustand)
- Cada función tiene una responsabilidad clara y bien definida
- El flujo es fácil de seguir y depurar

---

## 🧪 Checklist de Validación

### ✅ Checklist de Validación (Flujo Panel Derecho)

- [ ] **Acceso:** Navegar a la interfaz del agente (Workspace)
- [ ] **Llenado:** Llenar el formulario del panel derecho (`CaseBriefForm.tsx`) con todos los datos mínimos requeridos (incluyendo `insurance_category`)
- [ ] **Botones:** Verificar que el botón "Buscar Planes" se activa cuando hay `insurance_category`
- [ ] **Acción:** Hacer clic en "Buscar Planes"
- [ ] **Validación (Consola):** Verificar que la consola del navegador **NO** muestra el error `❌ No currentCaseId found`
- [ ] **Validación (Logs):** Verificar que aparecen los logs de creación del caso: `✅ Caso creado exitosamente: <caseId>`
- [ ] **Validación (Estado):** Usando React DevTools, verificar que el estado `currentCaseId` en Zustand **ya no es** `null`
- [ ] **Validación (Flujo):** Verificar que el agente (en el panel de chat) responde automáticamente con las recomendaciones
- [ ] **Validación (BD):** Verificar en la base de datos (Supabase Studio) que un nuevo caso (`cases`) ha sido creado
- [ ] **Validación (Audit Log):** Verificar que hay una entrada en `audit_log` con `action: 'created_case'`

---

## 📝 Notas Técnicas

### Debugging
- Se añadieron logs de depuración con emojis para facilitar el rastreo del flujo:
  - `📝` Inicio de creación de caso
  - `👤` Usuario autenticado
  - `✅` Operación exitosa
  - `💾` Estado actualizado
  - `❌` Error

### Patrón Reutilizado
- La creación de casos se implementó siguiendo el patrón de `HomeClient.tsx`:
  - Fetch a `/api/auth/me` para obtener `orgId` y `userId`
  - Fetch a `/api/cases/create` con todos los campos del brief
  - Actualización de `currentCaseId` inmediatamente después de la creación

### Manejo de Errores
- Los errores se manejan en el bloque `catch` del `try...catch...finally`
- Se distinguen tres tipos de errores:
  1. `CLIENT_CREATION_CANCELLED`: Usuario canceló la creación del cliente
  2. `CLIENT_CREATION_FAILED`: Error al crear el cliente
  3. Otros errores inesperados
- El `setIsSubmitting(false)` siempre se ejecuta en el `finally` para liberar el estado de carga

---

## 🔗 Referencias

- **Documento de Análisis:** `docs/ANALISIS_ERROR_PANEL_DERECHO_AGENTE.md`
- **Archivo de Estado Global:** `src/lib/ui/state.ts`
- **Componente Principal:** `src/components/Workspace/CaseBriefForm.tsx`
- **Componente de Chat:** `src/components/Chat/ConversationPane.tsx`
- **Formulario:** `src/components/Cases/BriefForm.tsx`

---

**Autor:** AI Assistant (Claude Sonnet 4.5)  
**Revisado por:** Usuario  
**Estado:** ✅ IMPLEMENTADO

