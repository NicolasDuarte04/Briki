# PLAN DE CORRECCIÓN DE PROBLEMAS CRÍTICOS - BRIKI
**Fecha**: 2025-10-12  
**Rol**: Developer FullStack Senior  
**Objetivo**: Resolver 4 problemas críticos de forma integral y ordenada

---

## 📋 ANÁLISIS DE PROBLEMAS IDENTIFICADOS

### 🔴 PROBLEMA #1: Error al Crear Casos Nuevos
**Síntoma**: Formulario de nuevo caso falla al enviar  
**Archivos Afectados**:
- `src/components/Cases/CaseForm.tsx` (línea 38)
- `src/app/api/cases/create/route.ts` (línea 63)
- `src/lib/database.ts` (función `createCaseWithOrg`)

**Causa Raíz**: 
- La función `createCaseWithOrg` en `database.ts` tiene parámetros incorrectos
- El API espera `orgId` pero la función espera `orgId` como primer parámetro
- Desalineación entre la interfaz `CreateCaseInput` y la implementación real

**Impacto**: Usuarios no pueden crear casos manualmente desde workspace

---

### 🔴 PROBLEMA #2: Error al Crear Clientes Nuevos
**Síntoma**: Formulario de nuevo cliente falla al enviar  
**Archivos Afectados**:
- `src/components/Clients/ClientForm.tsx` (línea 52)
- `src/app/api/clients/create/route.ts` (línea 52)
- `src/lib/clientsDb.ts` (función `createClient`)

**Causa Raíz**:
- La función `createClient` en `clientsDb.ts` tiene firma incorrecta
- El API llama `createClient({ orgId, name, ... })` pero la función espera `(clientData: CreateClientInput)`
- Error de tipos en la interfaz `CreateClientInput`

**Impacto**: Usuarios no pueden crear clientes con datos cifrados

---

### 🔴 PROBLEMA #3: Dashboard Redirige a Configuración de Cuenta
**Síntoma**: Click en "Dashboard" lleva a `/profile` en lugar de estadísticas  
**Archivos Afectados**:
- `src/config/navigation.ts` (línea 2)
- `src/components/SidebarNav.tsx` (línea 8)
- `src/components/BrikiSidebar.tsx` (línea 19)

**Causa Raíz**:
- El link "Dashboard" apunta a `/dashboard` pero no existe ruta
- La página `src/app/[locale]/(app)/dashboard/page.tsx` existe pero no está en el routing correcto
- Posible conflicto con rutas de Next.js

**Impacto**: Usuarios no pueden acceder a estadísticas de la organización

---

### 🔴 PROBLEMA #4: Botones del Panel Derecho Deshabilitados
**Síntoma**: Botones "Aprobar", "Editar", "Re-ejecutar" no funcionan en respuestas del agente  
**Archivos Afectados**:
- `src/components/Chat/MessageAgent.tsx` (líneas 98-127)
- `src/components/Chat/Message.tsx` (línea 77-89)
- `src/components/Chat/ConversationPane.tsx` (línea 412-420)

**Causa Raíz**:
- Los botones `onApprove`, `onEdit`, `onRerun` no tienen handlers implementados
- El componente `MessageAgent` se renderiza sin callbacks funcionales
- No hay lógica para cambiar estado de "Borrador" a "Aprobado"

**Impacto**: Usuarios no pueden aprobar consultas para formalizar casos

---

## 🎯 PLAN DE CORRECCIÓN INTEGRAL

### FASE 1: CORRECCIÓN DE APIs Y BACKEND (Prioridad Crítica)

#### TAREA 1.1: Corregir Función createCaseWithOrg
**Archivo**: `src/lib/database.ts`  
**Problema**: Parámetros incorrectos en la función  
**Solución**: Alinear la firma con el uso en el API

**Cambios Requeridos**:
```typescript
// ANTES (línea 385)
export async function createCaseWithOrg(
  orgId: string, 
  briefData: any, 
  userId: string,
  additionalData?: { ... }
)

// DESPUÉS
export async function createCaseWithOrg(
  orgId: string,
  briefData: any,
  userId: string,
  additionalData?: {
    clientRef?: string;
    clientName?: string;
    businessType?: string;
    employees?: number;
    status?: 'draft' | 'active' | 'completed' | 'archived';
    stage?: 'initial' | 'sourcing' | 'analysis' | 'proposal' | 'negotiation' | 'closed';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
  }
)
```

#### TAREA 1.2: Corregir Función createClient
**Archivo**: `src/lib/clientsDb.ts`  
**Problema**: Firma de función incorrecta  
**Solución**: Alinear con el uso en el API

**Cambios Requeridos**:
```typescript
// ANTES (línea 74)
export async function createClient(clientData: CreateClientInput): Promise<string>

// DESPUÉS
export async function createClient(orgId: string, clientData: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}): Promise<string>
```

#### TAREA 1.3: Actualizar API de Clientes
**Archivo**: `src/app/api/clients/create/route.ts`  
**Problema**: Llamada incorrecta a createClient  
**Solución**: Pasar parámetros en el orden correcto

---

### FASE 2: CORRECCIÓN DE RUTAS Y NAVEGACIÓN (Prioridad Alta)

#### TAREA 2.1: Verificar Ruta de Dashboard
**Archivo**: `src/app/[locale]/(app)/dashboard/page.tsx`  
**Problema**: Ruta puede no estar registrada correctamente  
**Solución**: Verificar que esté en el grupo de rutas correcto

#### TAREA 2.2: Corregir Navegación
**Archivo**: `src/config/navigation.ts`  
**Problema**: Link puede estar mal configurado  
**Solución**: Verificar que `/dashboard` sea la ruta correcta

---

### FASE 3: IMPLEMENTAR FUNCIONALIDAD DE APROBACIÓN (Prioridad Media)

#### TAREA 3.1: Crear Handlers para Botones del Agente
**Archivo**: `src/components/Chat/ConversationPane.tsx`  
**Problema**: No hay lógica para los botones del agente  
**Solución**: Implementar handlers funcionales

**Funcionalidades Requeridas**:
- `onApprove`: Cambiar estado del caso de "draft" a "active"
- `onEdit`: Permitir editar la respuesta del agente
- `onRerun`: Re-ejecutar la consulta con el agente

#### TAREA 3.2: Conectar con Base de Datos
**Archivo**: `src/app/api/cases/approve/route.ts` (nuevo)  
**Problema**: No existe endpoint para aprobar casos  
**Solución**: Crear API para cambiar estado del caso

#### TAREA 3.3: Actualizar Estado Global
**Archivo**: `src/lib/ui/state.ts`  
**Problema**: No hay estado para manejar aprobación  
**Solución**: Añadir estado de aprobación al store

---

### FASE 4: VALIDACIÓN Y TESTING (Prioridad Baja)

#### TAREA 4.1: Testing de Flujos Completos
- Crear caso manual ✅
- Crear cliente manual ✅
- Navegar a dashboard ✅
- Aprobar consulta del agente ✅

#### TAREA 4.2: Verificar Consistencia de Datos
- Estados de casos se actualizan correctamente
- Clientes se crean con cifrado
- Dashboard muestra estadísticas reales

---

## 🔧 IMPLEMENTACIÓN DETALLADA

### CORRECCIÓN 1: createCaseWithOrg

**Problema Específico**:
```typescript
// En /api/cases/create/route.ts línea 63
const newCase = await createCaseWithOrg(
  orgId,           // ✅ Correcto
  briefData || {}, // ✅ Correcto  
  user.id,         // ✅ Correcto
  {                // ❌ PROBLEMA: additionalData no coincide con interfaz
    clientName,
    clientRef,
    businessType,
    employees,
    status,
    stage,
    priority,
  }
);
```

**Solución**:
1. Actualizar interfaz `CreateCaseInput` en `database.ts`
2. Ajustar implementación de `createCaseWithOrg`
3. Verificar que todos los campos se mapeen correctamente

### CORRECCIÓN 2: createClient

**Problema Específico**:
```typescript
// En /api/clients/create/route.ts línea 52
const clientId = await createClient({
  orgId,    // ❌ PROBLEMA: createClient espera (orgId, clientData)
  name: name.trim(),
  email: email?.trim() || undefined,
  phone: phone?.trim() || undefined,
  address: address?.trim() || undefined,
});
```

**Solución**:
1. Cambiar firma de `createClient` a `(orgId, clientData)`
2. Actualizar llamada en el API
3. Mantener funcionalidad de cifrado intacta

### CORRECCIÓN 3: Dashboard

**Problema Específico**:
- La página existe en `src/app/[locale]/(app)/dashboard/page.tsx`
- Pero el link en navegación puede estar mal configurado
- Posible conflicto con rutas de Next.js

**Solución**:
1. Verificar que la ruta esté en el grupo `(app)` correcto
2. Verificar que no haya conflictos con otras rutas
3. Probar navegación directa a `/dashboard`

### CORRECCIÓN 4: Botones del Agente

**Problema Específico**:
```typescript
// En MessageAgent.tsx líneas 98-127
<Button onClick={onApprove} />  // ❌ onApprove es undefined
<Button onClick={onEdit} />     // ❌ onEdit es undefined  
<Button onClick={onRerun} />    // ❌ onRerun es undefined
```

**Solución**:
1. Implementar handlers en `ConversationPane.tsx`
2. Crear API endpoint para aprobar casos
3. Conectar con estado global para actualizar UI

---

## 📊 ORDEN DE IMPLEMENTACIÓN

### PASO 1: Backend APIs (30 min)
1. Corregir `createCaseWithOrg` en `database.ts`
2. Corregir `createClient` en `clientsDb.ts`
3. Actualizar llamadas en APIs correspondientes
4. Probar creación de casos y clientes

### PASO 2: Navegación (15 min)
1. Verificar ruta de dashboard
2. Probar navegación desde sidebar
3. Verificar que estadísticas se muestren

### PASO 3: Funcionalidad de Aprobación (45 min)
1. Crear API `/api/cases/approve`
2. Implementar handlers en `ConversationPane`
3. Conectar botones con funcionalidad real
4. Probar flujo completo de aprobación

### PASO 4: Validación (15 min)
1. Probar todos los flujos end-to-end
2. Verificar que no se rompan funcionalidades existentes
3. Confirmar que datos se guarden correctamente

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidades que DEBEN funcionar:
- [ ] Crear caso manual desde workspace
- [ ] Crear cliente con datos cifrados
- [ ] Navegar a dashboard y ver estadísticas
- [ ] Aprobar consulta del agente (cambiar de "Borrador" a "Activo")
- [ ] Editar respuesta del agente
- [ ] Re-ejecutar consulta del agente

### Datos que DEBEN persistir:
- [ ] Casos creados aparecen en lista
- [ ] Clientes creados aparecen en lista (datos cifrados en BD)
- [ ] Estados de casos se actualizan correctamente
- [ ] Estadísticas del dashboard reflejan datos reales

### UX que DEBEN ser fluidos:
- [ ] Formularios muestran errores claros
- [ ] Navegación funciona sin errores
- [ ] Botones del agente responden inmediatamente
- [ ] Estados se actualizan en tiempo real

---

## 🚨 RIESGOS Y MITIGACIONES

### RIESGO 1: Romper funcionalidad existente
**Mitigación**: Hacer cambios incrementales y probar cada uno

### RIESGO 2: Problemas de tipos TypeScript
**Mitigación**: Actualizar interfaces gradualmente y verificar compilación

### RIESGO 3: Errores de base de datos
**Mitigación**: Probar con datos de prueba antes de producción

### RIESGO 4: Conflictos de estado
**Mitigación**: Mantener estado global simple y predecible

---

## 📝 NOTAS TÉCNICAS

### Consideraciones de Seguridad:
- Mantener cifrado PII en clientes
- Verificar permisos de organización en todas las operaciones
- Validar datos de entrada en APIs

### Consideraciones de Performance:
- Usar índices de BD para consultas frecuentes
- Implementar paginación en listas largas
- Cachear estadísticas del dashboard

### Consideraciones de UX:
- Mostrar loading states durante operaciones
- Proporcionar feedback claro de éxito/error
- Mantener consistencia visual en toda la app

---

**ESTADO**: Listo para implementación  
**TIEMPO ESTIMADO**: 1.5 horas  
**COMPLEJIDAD**: Media  
**PRIORIDAD**: Crítica
