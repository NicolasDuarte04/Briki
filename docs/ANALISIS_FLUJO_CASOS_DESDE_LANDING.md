# ANÁLISIS INTEGRAL: FLUJO DE CASOS DESDE LANDING

**Fecha:** 2025-01-28  
**Contexto:** Implementación de flujo completo de casos históricos desde Landing Page  
**Autor:** Equipo de Desarrollo Briki  
**Versión:** 1.0

---

## RESUMEN EJECUTIVO

Este documento analiza la implementación del flujo propuesto donde:
1. Usuario manda mensaje desde Landing → se crea case en modo borrador con case-id
2. Navegación a `/agent/[caseId]` con mensaje inicial y solicitud de llenar formulario
3. Usuario llena formulario → se actualiza case con información completa
4. Mensajes se persisten en tabla `messages` relacionada con el case
5. Usuario puede volver al chat histórico desde panel izquierdo

**Estado Actual:** ✅ Estructura base implementada, pendiente integración completa  
**Prioridad:** 🔴 CRÍTICA (funcionalidad core de la aplicación)

---

## 1️⃣ RELACIÓN CON LA ESTRUCTURA ACTUAL

### **1.1. COHERENCIA Y PERTINENCIA DEL FLUJO PROPUESTO**

✅ **COHERENTE Y PERTINENTE** — El flujo propuesto está perfectamente alineado con la arquitectura actual:

#### **Estructura de Base de Datos**
- ✅ Tabla `cases` con soporte para status "draft" (línea 380 schema.prisma)
- ✅ Tabla `messages` con relación a `cases` (línea 393)
- ✅ Campos necesarios: `insurance_category`, `max_budget`, `required_coverages`, etc. (líneas 386-390)

#### **API Endpoints Existentes**
- ✅ `POST /api/cases/create` — Crear casos nuevos
- ✅ `GET/POST /api/cases/[id]/messages` — Manejo de mensajes
- ✅ `GET /api/cases/[id]` — Obtener case específico
- ✅ `PUT /api/cases/update` — Actualizar case

#### **Componentes Frontend**
- ✅ `LandingChatInput.tsx` — Manejo de mensaje inicial
- ✅ `ConversationPane.tsx` — Visualización de mensajes
- ✅ `SidebarChatPanel.tsx` — Lista de casos históricos
- ✅ `BriefForm.tsx` — Formulario de detalles del caso

### **1.2. ASPECTOS A COMPLEMENTAR**

⚠️ **CRÍTICO:** La creación de casos desde Landing NO está implementada. Actualmente:
```typescript
// LandingChatInput.tsx línea 164-171
setInitialMessage(message);
setBrief({ 
  freeText: message,
  // NO se crea un case en la BD
  // Solo se guarda en Zustand state
});
```

**PROBLEMA:** Sin case-id, no se puede:
- Navegar a `/agent/[caseId]`
- Persistir mensajes históricos
- Recuperar contexto al volver

**SOLUCIÓN REQUERIDA:**
```typescript
// Crear case en BD con status "draft"
const newCase = await fetch('/api/cases/create', {
  method: 'POST',
  body: JSON.stringify({
    orgId,
    briefData: { freeText: message },
    insurance_category: '', // Vacío inicialmente
    status: 'draft' // ← CRÍTICO
  })
});

// Redirigir con case-id
router.push(`/agent/${newCase.caseId}`);
```

### **1.3. DESESTIMAR ASPECTOS**

❌ **NO implementar:**
1. Creación de casos "temporales" sin ID — ya hay soporte completo para draft cases
2. Sistema de almacenamiento alternativo — `messages` table ya existe y funciona
3. Refactorización de Zustand store — la estructura actual es coherente

---

## 2️⃣ ASPECTOS FALTANTES

### **2.1. CREACIÓN DE CASO DESDE LANDING**

**Ubicación:** `src/components/Landing/LandingChatInput.tsx`

**FALTA:**
```typescript
// 1. Crear case en BD (actualmente solo guarda en Zustand)
const handleSubmit = async () => {
  const response = await fetch('/api/cases/create', {
    method: 'POST',
    body: JSON.stringify({
      orgId: await getCurrentOrg().id,
      briefData: { freeText: message },
      tempUploads,
      status: 'draft', // ← CRÍTICO
      insurance_category: '', // Vacío hasta que se llene formulario
    })
  });
  
  const { caseId } = await response.json();
  
  // 2. Guardar case-id en Zustand para navegación
  setCurrentCaseId(caseId);
  
  // 3. Redirigir a /agent/[caseId]
  router.push(`/agent/${caseId}`);
};
```

**IMPACTO:** 🔴 Sin esto, el flujo completo no funciona

### **2.2. PERSISTENCIA DE MENSAJES EN BD**

**Ubicación:** `src/components/Chat/ConversationPane.tsx`

**FALTA:**
```typescript
// Después de addMessage(), también guardar en BD
const saveMessageToDB = async (message: ChatMessage) => {
  const currentCaseId = useUI.getState().currentCaseId;
  if (!currentCaseId) return; // No hay case asociado
  
  await fetch(`/api/cases/${currentCaseId}/messages`, {
    method: 'POST',
    body: JSON.stringify({
      role: message.role,
      content: message.content,
      metadata: { 
        agent: message.agent?.label,
        id: message.id 
      }
    })
  });
};
```

**IMPACTO:** 🟡 Los mensajes no se recuperan al volver al chat

### **2.3. CARGA DE MENSAJES HISTÓRICOS**

**Ubicación:** `src/components/Chat/ConversationPane.tsx` y `src/components/SidebarChatPanel.tsx`

**FALTA:**
```typescript
// Cargar mensajes al montar ConversationPane
useEffect(() => {
  const currentCaseId = useUI.getState().currentCaseId;
  if (!currentCaseId) return;
  
  fetch(`/api/cases/${currentCaseId}/messages`)
    .then(res => res.json())
    .then(data => setMessages(data.messages));
}, [currentCaseId]);
```

**IMPACTO:** 🟡 Los mensajes históricos no aparecen

### **2.4. SINCRONIZACIÓN DE BRIEF CON CASO**

**Ubicación:** `src/components/Cases/BriefForm.tsx`

**FALTA:**
```typescript
// Actualizar brief en BD cuando se envía formulario
const updateCaseBrief = async (briefData: CaseBriefData) => {
  const currentCaseId = useUI.getState().currentCaseId;
  if (!currentCaseId) return;
  
  await fetch('/api/cases/update', {
    method: 'PUT',
    body: JSON.stringify({
      caseId: currentCaseId,
      ...briefData,
      status: 'active' // Cambiar de draft a active
    })
  });
};
```

**IMPACTO:** 🟡 El formulario no se guarda en BD

---

## 3️⃣ ASPECTOS YA IMPLEMENTADOS

### **3.1. ESTRUCTURA DE BASE DE DATOS** ✅

**Pertinencia:** 🟢 CORRECTA Y COMPLETA

#### Tabla `cases`
- ✅ Campo `status` con valor por defecto "draft"
- ✅ Campo `insurance_category` (línea 388)
- ✅ Relación con `messages` (línea 393)
- ✅ Campo `briefData` JSON para datos adicionales

#### Tabla `messages`
- ✅ Relación con `cases` vía `caseId`
- ✅ Campos: `role`, `content`, `metadata`, `createdAt`
- ✅ Índices para búsqueda eficiente

### **3.2. API ENDPOINTS** ✅

**Pertinencia:** 🟢 IMPLEMENTADOS CORRECTAMENTE

#### `/api/cases/create`
- ✅ Validación de orgId
- ✅ Validación de insurance_category
- ✅ Creación con campos opcionales
- ✅ Soporte para `tempUploads` (PDFs)
- ✅ Auditoría automática

#### `/api/cases/[id]/messages`
- ✅ GET para cargar mensajes históricos
- ✅ POST para guardar nuevos mensajes
- ✅ Validación de pertenencia a organización
- ✅ Ordenamiento cronológico

### **3.3. COMPONENTES FRONTEND** ✅

**Pertinencia:** 🟢 ARQUITECTURA COHERENTE

#### Zustand Store (`src/lib/ui/state.ts`)
- ✅ `currentCaseId` para tracking (línea 534)
- ✅ `setCurrentCaseId()` para actualización
- ✅ `initialMessage` para mensajes desde Landing
- ✅ `messages` array para estado global

#### LandingChatInput
- ✅ Manejo de `initialMessage`
- ✅ Upload de PDFs temporales
- ✅ Seteo de brief en Zustand

#### ConversationPane
- ✅ Manejo de mensaje inicial (líneas 400-434)
- ✅ Mensaje de bienvenida automático (líneas 422-434)
- ✅ Estado global de mensajes

#### BriefForm
- ✅ Validación de campos requeridos
- ✅ Sincronización con brief global
- ✅ Botones sincronizados

### **3.4. VALORACIÓN DE IMPLEMENTACIÓN**

| Aspecto | Estado | Coherencia | Pertinencia |
|---------|--------|------------|-------------|
| Base de datos | ✅ Completa | 🟢 Alta | 🟢 Alta |
| API Endpoints | ✅ Funcionales | 🟢 Alta | 🟢 Alta |
| Componentes UI | ✅ Implementados | 🟢 Alta | 🟢 Alta |
| Integración | ⚠️ Parcial | 🟡 Media | 🟢 Alta |

---

## 4️⃣ PLAN DE INTEGRACIÓN DETALLADO

### **FASE 1: CREACIÓN DE CASO DESDE LANDING** 🔴 CRÍTICA

**Archivo:** `src/components/Landing/LandingChatInput.tsx`  
**Tiempo estimado:** 2-3 horas

#### Paso 1.1: Obtener orgId
```typescript
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

const handleSubmit = async () => {
  const { currentOrg } = await getCurrentOrg();
  // ... resto de código
};
```

#### Paso 1.2: Crear case en BD
```typescript
const createDraftCase = async (message: string, tempUploads: any[]) => {
  const response = await fetch('/api/cases/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orgId: currentOrg.id,
      userId: user.id,
      briefData: { 
        freeText: message,
        initialMessage: message 
      },
      tempUploads,
      status: 'draft', // ← CRÍTICO
      insurance_category: '', // Vacío hasta llenar formulario
      stage: 'initial',
      priority: 'medium'
    })
  });
  
  return await response.json();
};
```

#### Paso 1.3: Guardar case-id y redirigir
```typescript
const { caseId } = await createDraftCase(message, tempUploads);

setCurrentCaseId(caseId);
setInitialMessage(message);
setBrief({ 
  freeText: message,
  ...(tempUploads.length > 0 && { tempUploads })
});

router.push(`/agent/${caseId}`);
```

**Validación:**
- ✅ Case se crea con status "draft"
- ✅ Case-id se guarda en Zustand
- ✅ Redirección a `/agent/[caseId]`
- ✅ Mensaje inicial se guarda en initialMessage

---

### **FASE 2: PERSISTENCIA DE MENSAJES** 🟡 IMPORTANTE

**Archivo:** `src/components/Chat/ConversationPane.tsx`  
**Tiempo estimado:** 3-4 horas

#### Paso 2.1: Función para guardar mensajes
```typescript
const saveMessageToDB = useCallback(async (message: ChatMessage) => {
  const currentCaseId = useUI.getState().currentCaseId;
  if (!currentCaseId) {
    console.warn('No case ID, skipping DB save');
    return;
  }
  
  try {
    await fetch(`/api/cases/${currentCaseId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: message.role,
        content: typeof message.content === 'string' 
          ? message.content 
          : JSON.stringify(message.content),
        metadata: {
          agent: message.agent?.label,
          messageId: message.id,
          timestamp: message.createdAt
        }
      })
    });
  } catch (error) {
    console.error('Error saving message to DB:', error);
    // NO bloquear la UI si falla
  }
}, []);
```

#### Paso 2.2: Integrar en handleSendMessage
```typescript
const handleSendMessage = useCallback(async () => {
  // ... código existente
  
  const newUserMessage = { /* ... */ };
  addMessage(newUserMessage);
  await saveMessageToDB(newUserMessage); // ← AÑADIR
  
  // ... respuesta del agente
  
  addMessage(assistantResponse);
  await saveMessageToDB(assistantResponse); // ← AÑADIR
}, [saveMessageToDB]);
```

#### Paso 2.3: Guardar mensaje inicial
```typescript
useEffect(() => {
  if (initialMessage && initialMessage.trim() !== '') {
    const userMessage: ChatMessage = { /* ... */ };
    const agentResponse: ChatMessage = { /* ... */ };
    
    setMessages([userMessage, agentResponse]);
    saveMessageToDB(userMessage); // ← AÑADIR
    saveMessageToDB(agentResponse); // ← AÑADIR
    clearInitialMessage();
  }
}, [initialMessage, saveMessageToDB]);
```

**Validación:**
- ✅ Mensajes se guardan en BD después de `addMessage()`
- ✅ Metadata incluye agent, messageId, timestamp
- ✅ Errores de DB no bloquean la UI
- ✅ Mensajes iniciales también se persisten

---

### **FASE 3: CARGA DE MENSAJES HISTÓRICOS** 🟡 IMPORTANTE

**Archivo:** `src/components/Chat/ConversationPane.tsx`  
**Tiempo estimado:** 2-3 horas

#### Paso 3.1: Función para cargar mensajes
```typescript
const loadHistoricalMessages = useCallback(async () => {
  const currentCaseId = useUI.getState().currentCaseId;
  if (!currentCaseId) return;
  
  try {
    const response = await fetch(`/api/cases/${currentCaseId}/messages`);
    const { messages: historicalMessages } = await response.json();
    
    if (historicalMessages && historicalMessages.length > 0) {
      setMessages(historicalMessages);
    }
  } catch (error) {
    console.error('Error loading historical messages:', error);
  }
}, [setMessages]);
```

#### Paso 3.2: Cargar al montar componente
```typescript
useEffect(() => {
  const currentCaseId = useUI.getState().currentCaseId;
  
  // Si hay un case-id, cargar mensajes históricos
  if (currentCaseId) {
    loadHistoricalMessages();
  }
  
  // Si NO hay case-id pero hay initialMessage, mostrar mensaje inicial
  else if (initialMessage && initialMessage.trim() !== '') {
    // ... código existente
  }
  
  // Si NO hay case-id NI initialMessage, mostrar bienvenida
  else if (messages.length === 0) {
    // ... código existente
  }
}, [currentCaseId, initialMessage]);
```

**Validación:**
- ✅ Mensajes se cargan al montar componente
- ✅ Solo carga si hay `currentCaseId`
- ✅ No interfiere con flujo de mensaje inicial
- ✅ Respeta mensaje de bienvenida automático

---

### **FASE 4: ACTUALIZACIÓN DE BRIEF EN BD** 🟡 IMPORTANTE

**Archivo:** `src/components/Cases/BriefForm.tsx`  
**Tiempo estimado:** 2-3 horas

#### Paso 4.1: Función para actualizar case
```typescript
const updateCaseInDB = async (briefData: Partial<CaseBriefData>) => {
  const currentCaseId = useUI.getState().currentCaseId;
  if (!currentCaseId) {
    console.warn('No case ID, cannot update in DB');
    return;
  }
  
  try {
    const response = await fetch('/api/cases/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseId: currentCaseId,
        ...briefData,
        status: 'active', // Cambiar de draft a active
        updatedAt: new Date().toISOString()
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error updating case in DB:', error);
    throw error;
  }
};
```

#### Paso 4.2: Integrar en handleSubmit
```typescript
const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  
  // ... validación existente
  
  try {
    setIsSubmitting(true);
    
    // 1. Sincronizar brief con Zustand (ya implementado)
    // ...
    
    // 2. Guardar en BD
    await updateCaseInDB(formData);
    
    // 3. Continuar con aprobación
    await onApprove();
  } finally {
    setIsSubmitting(false);
  }
}, [formData, onApprove]);
```

**Validación:**
- ✅ Brief se actualiza en BD al enviar formulario
- ✅ Status cambia de "draft" a "active"
- ✅ Campos se sincronizan correctamente
- ✅ Errores se manejan sin bloquear UI

---

### **FASE 5: NAVEGACIÓN CON CASE-ID** 🟢 MEJORA

**Archivo:** `src/app/[locale]/(app)/agent/[threadId]/page.tsx`  
**Tiempo estimado:** 1-2 horas

#### Paso 5.1: Detectar si threadId es case-id
```typescript
export default async function AgentThreadPage({ 
  params 
}: { 
  params: Promise<{ threadId: string }> 
}) {
  const { threadId } = await params;
  
  // Si threadId no es "new-thread-placeholder", es un case-id
  const isHistoricalCase = threadId !== 'new-thread-placeholder';
  
  if (isHistoricalCase) {
    // Cargar case desde BD y establecerlo como current
    const caseData = await fetch(`/api/cases/${threadId}`);
    const { currentOrg } = await getCurrentOrg();
    
    // Establecer en Zustand
    // setCurrentCaseId(threadId);
    // setBrief(caseData.briefData);
    // setMessages(await loadMessages(threadId));
  }
  
  return <HomeClient initialStep="conversation" threadId={threadId} />;
}
```

**Validación:**
- ✅ Navegación a `/agent/[caseId]` carga case histórico
- ✅ Brief se restaura correctamente
- ✅ Mensajes se cargan automáticamente
- ✅ No interfiere con flujo de nuevo case

---

## 5️⃣ PRINCIPIOS DE TRABAJO APLICADOS

### **REUTILIZACIÓN MÁXIMA DEL CÓDIGO**

✅ **Cumplido:**
- API endpoints existentes se reutilizan
- Funciones de Zustand store se aprovechan
- Componentes existentes se extienden, no se duplican
- Validaciones existentes se mantienen

### **MANTENIMIENTO DE LA ARQUITECTURA DUAL**

✅ **Cumplido:**
- Zustand para estado temporal (UI, brief, messages)
- PostgreSQL para persistencia permanente (cases, messages)
- Separación clara: Zustand para UX, BD para datos históricos

### **CONSISTENCIA DE ESTADO UNIDIRECIONAL**

✅ **Cumplido:**
- Flujo: Landing → create case → navigate → load messages
- Single source of truth: BD para datos persistentes
- Zustand como cache de estado actual

### **SEPARACIÓN CLARA DE RESPONSABILIDADES**

✅ **Cumplido:**
- `LandingChatInput`: Crear case y navegar
- `ConversationPane`: Mostrar mensajes y enviar nuevos
- `BriefForm`: Llenar y guardar información del case
- `SidebarChatPanel`: Listar casos históricos
- API: Persistencia y recuperación de datos

---

## 6️⃣ RIESGOS Y MITIGACIONES

### **RIESGO 1: Case sin mensajes iniciales**

**Mitigación:**
- Validar que `initialMessage` se guarda como primer mensaje
- Si falla, usar mensaje de bienvenida como fallback

### **RIESGO 2: Desincronización brief ↔ case**

**Mitigación:**
- Guardar brief inmediatamente al actualizar formulario
- Validar que todos los campos se sincronizan
- Usar transaction para asegurar atomicidad

### **RIESGO 3: Performance con muchos mensajes**

**Mitigación:**
- Paginación en `/api/cases/[id]/messages`
- Límite de mensajes cargados inicialmente
- Scroll virtual para listas largas

---

## 7️⃣ CRONOGRAMA DE IMPLEMENTACIÓN

| Fase | Prioridad | Tiempo | Dependencias |
|------|-----------|--------|--------------|
| **1. Creación de case** | 🔴 Crítica | 2-3h | Ninguna |
| **2. Persistencia mensajes** | 🟡 Importante | 3-4h | Fase 1 |
| **3. Carga mensajes históricos** | 🟡 Importante | 2-3h | Fase 2 |
| **4. Actualización brief** | 🟡 Importante | 2-3h | Fase 1, 3 |
| **5. Navegación case-id** | 🟢 Mejora | 1-2h | Fase 1, 2, 3 |

**Tiempo total estimado:** 10-15 horas  
**Prioridad de implementación:** Secuencial (Fase 1 → 2 → 3 → 4 → 5)

---

## 8️⃣ CASOS DE PRUEBA

### **Caso 1: Flujo desde Landing**
1. ✅ Usuario manda mensaje desde Landing
2. ✅ Se crea case con status "draft"
3. ✅ Navegación a `/agent/[caseId]`
4. ✅ Mensaje inicial aparece
5. ✅ Respuesta del agente solicita llenar formulario

### **Caso 2: Llenado de formulario**
1. ✅ Usuario llena formulario
2. ✅ Hace clic en "Buscar Planes"
3. ✅ Brief se actualiza en BD
4. ✅ Status cambia a "active"
5. ✅ Agente responde con análisis

### **Caso 3: Persistencia de mensajes**
1. ✅ Mensajes se guardan en BD
2. ✅ Mensajes se muestran en conversación
3. ✅ Mensajes persisten al recargar página

### **Caso 4: Recuperación histórica**
1. ✅ Usuario se va a otra pestaña
2. ✅ Regresa desde panel izquierdo
3. ✅ Click en chat histórico
4. ✅ Navegación a `/agent/[caseId]`
5. ✅ Brief y mensajes se cargan correctamente

### **Caso 5: Nuevo case desde panel**
1. ✅ Click en "Agente" en panel izquierdo
2. ✅ Navegación a `/agent/new-thread-placeholder`
3. ✅ Mensaje de bienvenida aparece
4. ✅ Formulario vacío listo para llenar

---

## 9️⃣ CONCLUSIÓN

### **ESTADO ACTUAL**

✅ **Completamente implementado:**
- Estructura de BD (tables, relations, indexes)
- API endpoints funcionales
- Componentes UI base
- Zustand store con estado global

⚠️ **Parcialmente implementado:**
- Creación de case desde Landing (falta integración con BD)
- Persistencia de mensajes (falta llamada a API)
- Carga de mensajes históricos (falta useEffect)
- Actualización de brief (falta update en BD)

❌ **No implementado:**
- Navegación automática con case-id
- Carga de brief desde BD
- Sincronización bidireccional brief ↔ case

### **PRÓXIMOS PASOS**

1. **IMPLEMENTAR Fase 1** (Creación de case) — 2-3h
2. **IMPLEMENTAR Fase 2** (Persistencia mensajes) — 3-4h
3. **IMPLEMENTAR Fase 3** (Carga histórica) — 2-3h
4. **IMPLEMENTAR Fase 4** (Actualización brief) — 2-3h
5. **IMPLEMENTAR Fase 5** (Navegación case-id) — 1-2h
6. **TESTING COMPLETO** de todos los casos de uso
7. **DEPLOY** a staging para pruebas con usuarios

### **VALORACIÓN FINAL**

El flujo propuesto es **TÉCNICAMENTE VIABLE** y **ARQUITECTÓNICAMENTE COHERENTE** con la estructura actual. La implementación es **SECUENCIAL** y **NO REQUIERE REFACTORIZACIÓN MAYOR**. El timeline estimado de 10-15 horas es realista considerando la complejidad del flujo.

**Recomendación:** ✅ **PROCEDER CON LA IMPLEMENTACIÓN** siguiendo el plan detallado en orden secuencial.

---

**Fin del documento**

