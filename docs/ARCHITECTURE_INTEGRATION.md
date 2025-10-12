# INTEGRACIÓN DE ARQUITECTURAS - BRIKI
**Fecha**: 2025-10-12  
**Desarrollador**: FullStack Senior AI Assistant  
**Objetivo**: Documentar cómo se conectan las dos arquitecturas principales del proyecto

---

## 📋 RESUMEN

Briki integra dos arquitecturas complementarias que trabajan juntas:

1. **Flujo del Agente** (Single Page Application con Zustand)
2. **Workspace Multi-tenant** (Server Components con Next.js Router)

Este documento explica el "puente" que las conecta.

---

## 🏗️ ARQUITECTURA #1: FLUJO DEL AGENTE

### Tecnologías
- **Estado Global**: Zustand (`src/lib/ui/state.ts`)
- **Navegación**: `setStep()` entre pasos del flujo
- **Renderizado**: Client Components con transiciones
- **Layout**: `HomeClient.tsx` → `BrikiSidebarLayout`

### Flujo de Pasos
```
landing → conversation → sourcing → comparison → proposal → compliance → followups
```

### Características
- SPA (Single Page Application)
- Estado en memoria del navegador
- Transiciones suaves con Framer Motion
- Panel lateral siempre visible

---

## 🏗️ ARQUITECTURA #2: WORKSPACE MULTI-TENANT

### Tecnologías
- **Estado**: Server Components + Server Actions
- **Navegación**: Next.js Router (rutas tradicionales)
- **Renderizado**: React Server Components
- **Base de Datos**: Prisma + PostgreSQL

### Rutas Implementadas
```
/dashboard              - Estadísticas y métricas
/workspace/cases        - Gestión de casos
/workspace/clients      - Gestión de clientes (PII cifrada)
/profile                - Perfil de usuario
```

### Características
- Páginas tradicionales con SSR
- Datos desde base de datos
- Multi-tenant con RLS
- Seguridad por organización

---

## 🌉 EL PUENTE: INTEGRACIÓN ENTRE ARQUITECTURAS

### Problema Inicial
Dos sistemas independientes sin comunicación:
- Usuario en conversación del agente (Arquitectura #1)
- No podía acceder a workspace (Arquitectura #2)
- Agente no sabía qué caso estaba activo en BD

### Solución Implementada: Estado Compartido

#### 1. `currentCaseId` en Zustand State

**Archivo**: `src/lib/ui/state.ts`

```typescript
export interface UIState {
  // ... otros campos
  currentCaseId: string | null;  // ← ID del caso activo en BD
  setCurrentCaseId: (id: string | null) => void;
}
```

**Propósito**: Mantener referencia al caso de base de datos dentro del flujo del agente.

---

#### 2. Captura del Case ID al Iniciar Chat

**Archivo**: `src/components/Landing/LandingChatInput.tsx`

```typescript
const handleSubmit = async () => {
    // Crear caso en BD
    const res = await fetch('/api/chat/start', { ... });
    const data = await res.json();
    
    // Guardar caseId en estado global
    if (data.caseId) {
        useUI.getState().setCurrentCaseId(data.caseId);
    }
    
    // Navegar a conversación
    setStep("conversation");
};
```

**Flujo**:
1. Usuario sube PDFs (temporales en Storage)
2. Usuario envía mensaje
3. POST `/api/chat/start` crea Case y Artifacts en BD
4. Respuesta incluye `caseId`
5. Se guarda en `currentCaseId` (Zustand)
6. Conversación tiene referencia al caso en BD

---

#### 3. Uso del Case ID en Mensajes Subsecuentes

**Archivo**: `src/components/Chat/ConversationPane.tsx`

```typescript
const sendMessage = async (messageText?: string) => {
    const currentCaseId = useUI.getState().currentCaseId;
    
    const response = await fetch('/api/chat/process-message', {
        body: JSON.stringify({
            message: trimmed,
            brief,
            caseId: currentCaseId  // ← Envía referencia al caso
        })
    });
};
```

**Beneficio**: Cada mensaje del usuario incluye el `caseId`, permitiendo:
- Consultar artifacts del caso
- Actualizar el caso en BD
- Mantener continuidad de contexto

---

#### 4. Consulta de Contexto en Backend

**Archivo**: `src/app/api/chat/process-message/route.ts`

```typescript
const { message, brief, caseId } = await request.json();

if (caseId) {
    const artifacts = await prisma.artifact.findMany({
        where: { caseId },
        select: { fileName: true, contentText: true }
    });
    
    // Construir contexto con contenido de PDFs
    const context = artifacts.map(a => 
        `--- Documento: ${a.fileName} ---\n${a.contentText?.substring(0, 1000)}...`
    ).join('\n\n');
}

// Respuesta del agente con contexto
const agentResponse = `${message}\n\n${context}\n\n[Análisis...]`;
```

**Beneficio**: El agente tiene acceso al contenido completo de los PDFs subidos.

---

## 🔄 FLUJO COMPLETO END-TO-END

### Escenario: Usuario Sube PDF y Conversa

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LANDING (Arquitectura #1)                                │
├─────────────────────────────────────────────────────────────┤
│ • Usuario sube PDF                                          │
│ • POST /api/upload/pdf (modo temp)                          │
│   - Sube a Storage: temp/<userId>/...                       │
│   - Extrae texto del PDF                                    │
│   - Devuelve: { tempUpload: { extractedText, ... } }        │
│ • Estado local: tempUploads[] (Arq #1)                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ENVÍO DE MENSAJE (Puente #1 → BD)                        │
├─────────────────────────────────────────────────────────────┤
│ • Usuario escribe mensaje y envía                           │
│ • POST /api/chat/start                                      │
│   - Crea Case en public.cases                               │
│   - Crea Artifacts en public.artifacts                      │
│     └─ contentText: tempUpload.extractedText ✅             │
│   - Devuelve: { caseId }                                    │
│ • Zustand: setCurrentCaseId(caseId) ✅ PUENTE               │
│ • Navegación: setStep("conversation")                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CONVERSACIÓN (Arquitectura #1 con BD)                    │
├─────────────────────────────────────────────────────────────┤
│ • Usuario hace más preguntas                                │
│ • POST /api/chat/process-message                            │
│   - Body: { message, brief, caseId } ✅ PUENTE              │
│   - Lee artifacts del caso en BD                            │
│   - Construye contexto con PDFs                             │
│   - Responde con información contextual                     │
│ • UI: Muestra respuesta del agente                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. NAVEGACIÓN A WORKSPACE (Puente #1 → #2)                  │
├─────────────────────────────────────────────────────────────┤
│ • Usuario hace click en "Cases" en sidebar                  │
│ • Next.js Router: /workspace/cases ✅ PUENTE                │
│ • Arquitectura #2 toma control                              │
│ • Lista todos los casos de la organización                  │
│ • Usuario puede ver el caso creado desde Landing            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. DETALLE DEL CASO (Arquitectura #2)                       │
├─────────────────────────────────────────────────────────────┤
│ • /workspace/cases/[id]                                     │
│ • Tabs:                                                     │
│   - Resumen: Información del cliente                        │
│   - Documentos: PDFs subidos ✅ contentText persistido      │
│   - Actividad: Timeline de auditoría                        │
│ • Usuario puede subir más PDFs (modo persistente)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 COMPONENTES CLAVE DEL PUENTE

### 1. Estado Global Compartido (`currentCaseId`)
**Ubicación**: `src/lib/ui/state.ts`  
**Tipo**: `string | null`  
**Propósito**: Mantener referencia al caso activo de BD dentro del flujo del agente

### 2. Navegación Híbrida
**Sidebar Links**: `src/config/navigation.ts`  
**Componentes**: `SidebarNav.tsx`, `BrikiSidebar.tsx`  
**Propósito**: Permitir navegar de Arquitectura #1 → #2

### 3. Persistencia de Contenido
**Upload Temporal**: `extractedText` en respuesta de `/api/upload/pdf`  
**Persistencia**: `contentText` en tabla `artifacts`  
**Propósito**: Texto de PDFs disponible para el agente

### 4. Contexto en Mensajes
**Envío**: `caseId` en body de `/api/chat/process-message`  
**Lectura**: Consulta de `artifacts` por `caseId`  
**Propósito**: Agente tiene acceso al contenido de los documentos

---

## 📊 DIAGRAMA DE INTEGRACIÓN

```
┌──────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA #1                           │
│                  (Flujo del Agente)                          │
│                                                              │
│  ┌─────────────┐                                             │
│  │   Zustand   │  currentCaseId ←────────┐                  │
│  │   State     │                          │                  │
│  └─────────────┘                          │                  │
│         ↑                                  │                  │
│         │ setCurrentCaseId()               │                  │
│         │                                  │                  │
│  ┌──────────────┐         ┌──────────────────┐              │
│  │   Landing    │────────>│ /api/chat/start  │              │
│  │  ChatInput   │  POST   │  (crea caso)     │              │
│  └──────────────┘         └──────────────────┘              │
│         │                          │                         │
│         │ setStep("conversation")  │ return { caseId }       │
│         ↓                          ↓                         │
│  ┌──────────────┐         ┌──────────────────┐              │
│  │Conversation  │────────>│/api/chat/process │              │
│  │   Pane       │  caseId │  (lee artifacts) │              │
│  └──────────────┘         └──────────────────┘              │
│         │                          │                         │
│         │                          ↓                         │
│         │                  ┌──────────────┐                  │
│         │                  │   Prisma     │                  │
│         │                  │  (BD Query)  │                  │
│         │                  └──────────────┘                  │
└─────────┼──────────────────────────────────────────────────┘
          │
          │ Click "Cases" (workspaceLinks)
          │
          ↓
┌──────────────────────────────────────────────────────────────┐
│                    ARQUITECTURA #2                           │
│                     (Workspace)                              │
│                                                              │
│  ┌──────────────┐                                            │
│  │ Next.js      │                                            │
│  │ Router       │                                            │
│  └──────────────┘                                            │
│         ↓                                                    │
│  /workspace/cases                                            │
│         ↓                                                    │
│  ┌──────────────────┐                                        │
│  │ getCurrentOrg()  │                                        │
│  │ getCasesByOrg()  │                                        │
│  └──────────────────┘                                        │
│         ↓                                                    │
│  ┌──────────────┐                                            │
│  │  CaseList    │  ← Muestra caso creado desde Landing      │
│  └──────────────┘                                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔐 SEGURIDAD Y MULTI-TENANCY

### Aislamiento por Organización

**En Arquitectura #1** (Agente):
- `currentCaseId` apunta a un caso específico
- Caso tiene `orgId` en BD
- Solo miembros de la org pueden leerlo (RLS)

**En Arquitectura #2** (Workspace):
- `getCurrentOrg()` obtiene org del usuario
- Todas las queries filtran por `orgId`
- RLS aplica automáticamente

**Puente Seguro**:
- Usuario solo ve sus propios casos
- `caseId` validado contra membresía en org
- No hay fugas entre organizaciones

---

## 📝 FLUJO DE DATOS: PDFs

### Upload Temporal (Antes de Crear Caso)

```typescript
// 1. Landing: Usuario selecciona PDF
LandingChatInput.handleFileChange()
  ↓
// 2. Upload a Storage temporal
POST /api/upload/pdf (sin caseId/orgId)
  ├─ Sube a: temp/<userId>/timestamp_filename.pdf
  ├─ Extrae texto con pdf2json
  └─ Devuelve: { tempUpload: { extractedText, storagePath, ... } }
  ↓
// 3. Guarda en estado local (memoria del navegador)
setTempUploads([{ extractedText, storagePath, ... }])
```

**Nota**: En este punto, NO hay escritura en BD. Solo en Storage (temp/).

---

### Persistencia (Al Crear Caso)

```typescript
// 4. Usuario envía mensaje
LandingChatInput.handleSubmit()
  ↓
// 5. Crear caso y vincular PDFs
POST /api/chat/start
  ├─ Crea: public.cases (nuevo registro)
  ├─ Para cada tempUpload:
  │   └─ Crea: public.artifacts
  │       ├─ caseId: (del caso recién creado)
  │       ├─ fileId: tempUpload.storagePath
  │       └─ contentText: tempUpload.extractedText ✅
  └─ Devuelve: { caseId }
  ↓
// 6. Guardar en estado global
useUI.getState().setCurrentCaseId(caseId)
```

**Ahora**: El caso y sus PDFs están en BD, referencia en memoria.

---

### Uso en Conversación

```typescript
// 7. Usuario hace pregunta en chat
ConversationPane.sendMessage()
  ↓
// 8. Enviar con contexto
POST /api/chat/process-message
  ├─ Body: { message, brief, caseId }
  ↓
// 9. Consultar artifacts en BD
const artifacts = await prisma.artifact.findMany({
    where: { caseId },
    select: { fileName: true, contentText: true }
});
  ↓
// 10. Construir respuesta con contexto
const context = artifacts.map(a => 
    `Documento: ${a.fileName}\n${a.contentText}`
).join('\n\n');

const response = `Basándome en: ${context}\n\n[Análisis del agente]`;
```

**Resultado**: Agente responde usando contenido real de los PDFs.

---

## 🧭 NAVEGACIÓN ENTRE ARQUITECTURAS

### De Agente → Workspace

**Usuario en**: Conversación del agente (step="conversation")  
**Acción**: Click "Cases" en sidebar  
**Resultado**: `<Link href="/workspace/cases">`

```typescript
// Componente: SidebarNav.tsx o BrikiSidebar.tsx
import { workspaceLinks } from "@/config/navigation";

// workspaceLinks = [
//   { label: "Cases", href: "/workspace/cases" }, ← Ruta real
// ]

<SidebarLink link={link} />
  ↓
<Link href="/workspace/cases">Cases</Link>
  ↓
Next.js Router navega a página del workspace
```

**Estado**:
- `currentCaseId` se mantiene en Zustand
- Usuario puede volver a conversación más tarde
- Datos en BD persisten

---

### De Workspace → Agente

**Usuario en**: `/workspace/cases/[id]`  
**Acción**: (Futuro) Click "Abrir en Chat"  
**Resultado**: Navega a conversación con el caso cargado

```typescript
// Implementación futura en workspace/cases/[id]/page.tsx
<Button onClick={() => {
    useUI.getState().setCurrentCaseId(params.id);
    useUI.getState().setStep("conversation");
    router.push('/');  // Vuelve a HomeClient
}}>
    Abrir en Chat
</Button>
```

---

## 🎯 PUNTOS DE INTEGRACIÓN CRÍTICOS

### 1. Estado Global Compartido
**Archivo**: `src/lib/ui/state.ts`  
**Campos que conectan**:
- `currentCaseId`: Referencia a BD desde UI
- `brief`: Sincronizado con `cases.briefData`

### 2. Navegación Centralizada
**Archivo**: `src/config/navigation.ts`  
**Uso**: Links del sidebar funcionan en ambas arquitecturas

### 3. Helper de Organización
**Archivo**: `src/lib/helpers/getCurrentOrg.ts`  
**Uso**: Todas las páginas del workspace obtienen org consistentemente

### 4. APIs Duales
**Temporal**: `/api/upload/pdf` (sin caseId)  
**Persistente**: `/api/upload/pdf` (con caseId)  
**Ambos** conviven en el mismo endpoint

---

## 🚀 PREPARACIÓN PARA IA

### Contratos Listos

**Entrada al Agente**:
```typescript
{
    message: string,
    brief: CaseBrief,
    caseId: string,  // ← Referencia a caso en BD
}
```

**Consulta de Contexto**:
```typescript
const artifacts = await prisma.artifact.findMany({
    where: { caseId },
    select: { contentText: true }
});
```

**Salida del Agente**:
```typescript
// Opción 1: Texto simple
return { response: "..." };

// Opción 2: Crear nuevo artifact con análisis
await prisma.artifact.create({
    data: {
        caseId,
        sourceType: 'ai',
        fileName: 'Análisis del Agente.md',
        contentText: analysisText,
    }
});
```

### Punto de Integración para LLM

**Archivo**: `src/app/api/chat/process-message/route.ts`  
**Línea**: 55 (placeholder actual)

```typescript
// ACTUAL (placeholder):
const agentResponse = `He recibido tu mensaje...`;

// FUTURO (con LLM):
import { generateResponse } from '@/lib/ai/agent';

const agentResponse = await generateResponse({
    message,
    context: artifactsText,
    brief,
    userId: user.id,
});
```

---

## 📚 PARA NUEVOS DESARROLLADORES

### Pregunta: ¿Dónde está el caso del usuario?

**Respuesta**: En dos lugares conectados:
1. **En memoria** (Zustand): `useUI().currentCaseId`
2. **En BD** (PostgreSQL): `public.cases` table

### Pregunta: ¿Cómo navego entre flujos?

**Respuesta**:
- **Agente → Workspace**: Click links del sidebar (Next.js Router)
- **Workspace → Agente**: (Futuro) Botón "Abrir en Chat"

### Pregunta: ¿Dónde se guardan los mensajes del chat?

**Respuesta Actual**: Solo en memoria (estado local de `ConversationPane`)  
**Futuro**: Crear tabla `messages` para persistir conversaciones

### Pregunta: ¿Cómo accede el agente a los PDFs?

**Respuesta**:
1. PDFs en Storage: `artifacts` bucket
2. Metadatos en BD: `public.artifacts.contentText`
3. Query por `caseId`: `prisma.artifact.findMany({ where: { caseId } })`
4. Texto disponible para el agente

---

## ✅ VERIFICACIÓN DE INTEGRACIÓN

### Checklist para Desarrolladores

- [ ] Usuario puede navegar de Landing → Conversación → Workspace
- [ ] Sidebar links funcionan (no apuntan a `#`)
- [ ] `currentCaseId` se guarda al crear caso desde Landing
- [ ] Mensajes en conversación incluyen `caseId`
- [ ] Agente responde mencionando contenido de PDFs
- [ ] Workspace muestra casos creados desde Landing
- [ ] No hay duplicación de código (helper `getCurrentOrg`)
- [ ] Configuración de navegación centralizada

---

## 🔮 FUTURAS MEJORAS

### 1. Persistir Mensajes del Chat
```sql
CREATE TABLE public.messages (
    id uuid PRIMARY KEY,
    case_id uuid REFERENCES public.cases(id),
    role text CHECK (role IN ('user', 'assistant')),
    content text,
    created_at timestamptz DEFAULT now()
);
```

### 2. Tab "Conversación" en Workspace
```tsx
// En /workspace/cases/[id]/page.tsx
<TabsTrigger value="conversation">Conversación</TabsTrigger>
<TabsContent value="conversation">
    <ConversationPane caseId={params.id} />
</TabsContent>
```

### 3. Selector de Organización
```tsx
// Header global con dropdown
<OrgSwitcher orgs={organizations} current={currentOrg} />
```

---

**FIN DEL DOCUMENTO**

Este documento debe actualizarse cuando se añadan nuevos puntos de integración entre las arquitecturas.

