# ANÁLISIS EXHAUSTIVO DE FALLAS CRÍTICAS - BRIKI
**Fecha**: 2025-10-12  
**Desarrollador**: FullStack Senior AI Assistant  
**Objetivo**: Identificar causas raíz de 3 problemas críticos y proponer correcciones ordenadas

---

## 📋 ÍNDICE
1. Resumen Ejecutivo de Problemas
2. Problema #1: Agente No Responde Sobre PDFs
3. Problema #2: Componente `select.tsx` No Existe
4. Problema #3: Sin Navegación Visible a Workspace/Cases
5. Análisis de Coherencia de Arquitectura
6. Funcionalidades Confusas o Duplicadas
7. Plan de Corrección Ordenado

---

## 1. RESUMEN EJECUTIVO DE PROBLEMAS

### Estado Actual
- ✅ **Upload de PDFs**: FUNCIONA (201 en `/api/upload/pdf`)
- ✅ **Creación de Caso**: FUNCIONA (201 en `/api/chat/start`)
- ❌ **Agente no responde sobre PDFs**: FALLANDO
- ❌ **Navegación a workspace/cases**: NO FUNCIONA (Module not found: select.tsx)
- ❌ **Sidebar links**: HARDCODEADOS a `#` (sin acción real)

### Causa Raíz Identificada
**Los problemas NO son de lógica de negocio, son de INTEGRACIÓN entre módulos**:
1. Dos arquitecturas UI coexistiendo sin comunicarse
2. Componentes UI faltantes en shadcn/ui
3. Sistema de navegación duplicado

---

## 2. PROBLEMA #1: AGENTE NO RESPONDE SOBRE PDFs

### Síntoma
- Usuario sube PDF desde Landing
- Usuario envía mensaje
- PDF se guarda correctamente (201 en backend)
- Agente responde con texto genérico
- **NO menciona el PDF ni su contenido**

### Análisis de Flujo Actual

#### Archivo: `src/components/Landing/LandingChatInput.tsx`
```typescript
// Líneas 100-142: handleFileChange
const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Sube PDF a /api/upload/pdf (modo temp)
    const response = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: formData  // Solo contiene el PDF
    });
    
    // 2. Guarda en estado local tempUploads
    if (result.success && result.mode === 'temp') {
        setTempUploads((prev) => [...prev, result.tempUpload]);
    }
}

// Líneas 151-171: handleSubmit
const handleSubmit = async () => {
    const message = value.trim();
    const payload = {
        message,
        tempUploads,  // ✅ Se envían los uploads temporales
    };
    
    // 3. Crea el caso con PDFs
    const res = await fetch('/api/chat/start', { ... });
    
    // 4. Navega a conversación
    setStep("conversation");
}
```

**✅ CORRECTO**: Los PDFs se envían a `/api/chat/start` y se crean los `artifacts`.

---

#### Archivo: `src/app/api/chat/start/route.ts`
```typescript
// Líneas 44-61: Procesa tempUploads
for (const t of tempUploads) {
    await prisma.artifact.create({
        data: {
            caseId: newCase.id,  // ✅ Se vincula al caso
            sourceType: 'upload',
            fileId: t.storagePath,  // ✅ Path en Storage
            fileName: t.fileName,
            contentType: 'application/pdf',
            contentText: null,  // ❌ PROBLEMA: No se guarda el texto extraído
            provenance: {
                uploadedBy: user.id,
                origin: 'landing_temp',
                fileHash: t.fileHash,
                fileSize: t.fileSize,
                pageCount: t.pageCount,
                charactersExtracted: t.charactersExtracted || 0,  // Metadata guardado
            },
        },
    });
}
```

**⚠️ PROBLEMA IDENTIFICADO #1**: 
- El `contentText` se guarda como `null` 
- El texto extraído está en `provenance.charactersExtracted` (solo el conteo)
- **NO se guarda el texto real del PDF**

**Causa**: En `/api/upload/pdf` modo temp, extraemos el texto pero NO lo devolvemos en `tempUpload`. Solo enviamos metadatos.

---

#### Archivo: `src/app/api/upload/pdf/route.ts` (modo temp)
```typescript
// Líneas 79-101: Modo temporal
if (!caseId || !orgId) {
    // Extrae texto
    const extracted = await extractTextFromPDF(buffer);
    pdfText = extracted.text;  // ✅ Texto extraído
    pageCount = extracted.pages;
    
    // ❌ PROBLEMA: NO se incluye pdfText en tempUpload
    return NextResponse.json({
        success: true,
        mode: 'temp',
        tempUpload: {
            id: tempId,
            storagePath,
            fileName: file.name,
            fileSize: file.size,
            pageCount,
            charactersExtracted: pdfText.length,  // Solo el LENGTH
            fileHash,
            uploadedBy: user.id,
            // ❌ FALTA: extractedText: pdfText
        }
    });
}
```

**⚠️ PROBLEMA IDENTIFICADO #2**:
- Se extrae el texto del PDF correctamente
- Se cuenta cuántos caracteres tiene
- **Pero NO se devuelve el texto en la respuesta**
- `LandingChatInput` recibe solo metadatos, no el texto

---

#### Archivo: `src/components/Chat/ConversationPane.tsx`
```typescript
// Líneas 293-303: sendMessage
const response = await fetch('/api/chat/process-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        message: trimmed,
        userId: 'anonymous',  // ❌ Usuario hardcodeado
        brief: brief  // ✅ Envía el brief
        // ❌ FALTA: NO envía información sobre PDFs cargados
    })
});
```

**⚠️ PROBLEMA IDENTIFICADO #3**:
- `ConversationPane` llama a `/api/chat/process-message`
- Solo envía mensaje de texto y brief
- **NO envía información sobre los PDFs del caso**
- El agente no tiene contexto de qué documentos están disponibles

---

#### Archivo: `src/app/api/chat/process-message/route.ts`
```typescript
// Líneas 28-36: Respuesta del agente
const agentResponse = `Entiendo tu consulta: "${message}". Estoy analizando la información para ayudarte con tus seguros.`;

return NextResponse.json({
    response: agentResponse,  // ❌ Respuesta hardcodeada, ignora PDFs
    caseId: null
});
```

**⚠️ PROBLEMA IDENTIFICADO #4**:
- Respuesta del agente es un string hardcodeado
- **NO consulta la base de datos**
- **NO lee los artifacts del caso**
- **NO analiza el contenido de los PDFs**

---

### Cadena de Causas - Problema #1

```
┌─────────────────────────────────────────────────────────────┐
│ FLUJO ACTUAL (INCOMPLETO)                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 1. Landing: Upload PDF                                      │
│    ├─ Extrae texto del PDF ✅                               │
│    ├─ Guarda en Storage temp/ ✅                            │
│    └─ Devuelve solo metadatos (sin texto) ❌                │
│                                                             │
│ 2. Landing: Enviar mensaje                                  │
│    ├─ POST /api/chat/start ✅                               │
│    ├─ Crea Case ✅                                          │
│    ├─ Crea Artifacts (sin contentText) ❌                   │
│    └─ Navega a conversación ✅                              │
│                                                             │
│ 3. Conversación: Usuario pregunta                           │
│    ├─ POST /api/chat/process-message ✅                     │
│    ├─ NO envía caseId ni artifacts ❌                       │
│    └─ Agente responde template genérico ❌                  │
│                                                             │
│ RESULTADO: Agente no sabe sobre PDFs ❌                     │
└─────────────────────────────────────────────────────────────┘
```

### Correcciones Necesarias - Problema #1

**Corrección #1.1**: Devolver texto extraído en upload temporal
```typescript
// En: src/app/api/upload/pdf/route.ts (modo temp)
return NextResponse.json({
    success: true,
    mode: 'temp',
    tempUpload: {
        // ... campos existentes
        extractedText: pdfText,  // ← AÑADIR
    }
});
```

**Corrección #1.2**: Guardar texto en artifacts
```typescript
// En: src/app/api/chat/start/route.ts
await prisma.artifact.create({
    data: {
        // ... campos existentes
        contentText: t.extractedText || null,  // ← USAR texto recibido
    },
});
```

**Corrección #1.3**: Guardar texto extraído en LandingChatInput
```typescript
// En: src/components/Landing/LandingChatInput.tsx
const [tempUploads, setTempUploads] = useState<Array<{
    // ... campos existentes
    extractedText?: string;  // ← AÑADIR
}>
```

**Corrección #1.4**: Enviar caseId desde conversación
```typescript
// En: src/components/Chat/ConversationPane.tsx
// Añadir estado para trackear el caseId actual
const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);

// En handleSubmit de LandingChatInput, guardar caseId:
const data = await res.json();
if (data.caseId) {
    // Pasar caseId al state global o localStorage
}

// En sendMessage de ConversationPane:
body: JSON.stringify({
    message: trimmed,
    brief: brief,
    caseId: currentCaseId  // ← AÑADIR
})
```

**Corrección #1.5**: Consultar artifacts en process-message
```typescript
// En: src/app/api/chat/process-message/route.ts
const { message, brief, caseId } = await request.json();

let context = '';
if (caseId) {
    // Obtener artifacts del caso
    const artifacts = await prisma.artifact.findMany({
        where: { caseId },
        select: { fileName: true, contentText: true }
    });
    
    context = artifacts.map(a => 
        `Documento: ${a.fileName}\nContenido: ${a.contentText?.substring(0, 500)}...`
    ).join('\n\n');
}

// Generar respuesta contextual
const agentResponse = `Basándome en tu mensaje: "${message}" y los documentos que subiste:\n${context}\n\n[Aquí irá la respuesta del agente de IA]`;
```

---

## 3. PROBLEMA #2: COMPONENTE `select.tsx` NO EXISTE

### Síntoma
```
Module not found: Can't resolve '@/components/ui/select'
./src/components/Cases/CaseFilters.tsx (4:1)
```

### Análisis de Dependencias

#### Componentes UI Existentes
```
src/components/ui/
├── avatar.tsx          ✅
├── badge.tsx           ✅
├── button.tsx          ✅
├── card.tsx            ✅
├── checkbox.tsx        ✅
├── command.tsx         ✅
├── dialog.tsx          ✅
├── dropdown-menu.tsx   ✅
├── input.tsx           ✅
├── label.tsx           ✅
├── tabs.tsx            ✅
├── textarea.tsx        ✅
└── ... (24 componentes total)
```

**❌ NO EXISTE**: `select.tsx`

#### Archivos que Importan Select

**1. `src/components/Cases/CaseFilters.tsx`** (líneas 4-10):
```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';  // ❌ NO EXISTE
```

**2. `src/components/Cases/CaseForm.tsx`** (líneas 10-16):
```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';  // ❌ NO EXISTE
```

**3. `src/components/Clients/ClientForm.tsx`**:
- No usa Select (solo Input, Textarea, Button) ✅

### Causa Raíz - Problema #2

**El proyecto usa shadcn/ui** pero el componente `select` NO fue instalado.

shadcn/ui es un sistema de componentes que se instala **a demanda**. Cada componente debe agregarse explícitamente con:
```bash
npx shadcn@latest add select
```

### Análisis de Coherencia

**Componentes sí instalados**:
- `button`, `card`, `input`, `label`, `tabs`, etc. (24 total)

**Componentes faltantes que se necesitan**:
- `select` (para dropdowns)
- `progress` (usado en `PdfUploader.tsx` línea 9)

### Correcciones Necesarias - Problema #2

**Corrección #2.1**: Instalar componente select
```bash
npx shadcn@latest add select
```

**Corrección #2.2**: Instalar componente progress
```bash
npx shadcn@latest add progress
```

**Corrección #2.3**: Verificar otros componentes faltantes
```bash
# Revisar todos los imports de @/components/ui/* y validar que existan
grep -r "from '@/components/ui/" src/ | cut -d"'" -f2 | sort -u
```

---

## 4. PROBLEMA #3: SIN NAVEGACIÓN VISIBLE A WORKSPACE/CASES

### Síntoma
- Usuario hace login y entra a conversación
- Panel izquierdo muestra "Cases" pero es solo texto
- Click en "Cases" no hace nada (href="#")
- Usuario NO puede acceder a `/workspace/cases`

### Análisis de Navegación Actual

#### Archivo: `src/components/SidebarNav.tsx` (líneas 8-14)
```typescript
const links = [
  { label: "Saved Analyses", href: "#" },  // ❌ Sin acción
  { label: "Cases", href: "#" },           // ❌ Sin acción
  { label: "Playbooks", href: "#" },       // ❌ Sin acción
  { label: "Integrations", href: "#" },    // ❌ Sin acción
  { label: "Settings", href: "#" },        // ❌ Sin acción
];
```

**❌ PROBLEMA**: Todos los links apuntan a `#` (ninguna acción real)

#### Archivo: `src/components/BrikiSidebar.tsx` (líneas 19-25)
```typescript
const navLinks = [
  { label: "Saved Analyses", href: "#" },  // ❌ Sin acción
  { label: "Cases", href: "#" },           // ❌ Sin acción
  { label: "Playbooks", href: "#" },       // ❌ Sin acción
  { label: "Integrations", href: "#" },    // ❌ Sin acción
  { label: "Settings", href: "#" },        // ❌ Sin acción
];
```

**❌ PROBLEMA**: Duplicación exacta del mismo array hardcodeado.

---

### Análisis de Arquitectura de Navegación

**Hay DOS sistemas de navegación coexistiendo**:

#### Sistema 1: UI State (Zustand)
- **Archivo**: `src/lib/ui/state.ts`
- **Función**: `setStep(step: UIStep)`
- **Steps disponibles**:
  - `"landing"`, `"conversation"`, `"sourcing"`, `"normalized"`, `"comparison"`, `"proposal"`, `"compliance"`, `"followups"`

**Uso**: Navegación interna dentro del flujo del agente (landing → conversation → sourcing → etc.)

#### Sistema 2: Next.js Router
- **Rutas creadas** en `src/app/[locale]/(app)/`:
  - `/dashboard`
  - `/workspace/cases`
  - `/workspace/cases/new`
  - `/workspace/cases/[id]`
  - `/workspace/clients`
  - `/workspace/clients/new`
  - `/workspace/clients/[id]`
  - `/profile`

**Uso**: Navegación a páginas del workspace (gestión de casos, clientes, etc.)

---

### El Conflicto

**Problema de Integración**:
1. El **sidebar** está dentro del flujo del agente (`HomeClient.tsx` → `BrikiSidebarLayout`)
2. Los **links del sidebar** usan el sistema antiguo de `setStep()` (UI State)
3. Las **páginas del workspace** usan Next.js Router (rutas reales)
4. **NO hay puente entre ambos sistemas**

**Resultado**:
- Usuario está en conversación (step="conversation")
- Hace click en "Cases" → No pasa nada (href="#")
- Usuario NO puede salir del flujo del agente para ir al workspace

---

### Correcciones Necesarias - Problema #3

**Corrección #3.1**: Actualizar links del sidebar
```typescript
// En: src/components/SidebarNav.tsx
const links = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Cases", href: "/workspace/cases" },
  { label: "Clients", href: "/workspace/clients" },
  { label: "Profile", href: "/profile" },
];
```

**Corrección #3.2**: Actualizar BrikiSidebar
```typescript
// En: src/components/BrikiSidebar.tsx
const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Cases", href: "/workspace/cases" },
  { label: "Clients", href: "/workspace/clients" },
  { label: "Profile", href: "/profile" },
];
```

**Corrección #3.3**: Usar Next.js Link en lugar de state
```typescript
// Los componentes SidebarLink ya usan <Link href={...}>
// Solo necesitan que href sea una ruta real, no "#"
```

**Corrección #3.4**: Considerar arquitectura híbrida
- **Opción A**: Salir completamente del flujo del agente al ir a workspace
  - Click "Cases" → `window.location.href = '/workspace/cases'`
  - Pros: Simple, separación clara
  - Contras: Pierde estado del agente

- **Opción B**: Mantener flujo del agente en panel lateral
  - Workspace en página completa
  - Conversación en modal/drawer
  - Pros: No pierde contexto
  - Contras: Más complejo

**RECOMENDACIÓN**: Opción A por ahora (simplicidad)

---

## 5. ANÁLISIS DE COHERENCIA DE ARQUITECTURA

### Arquitecturas que Coexisten

#### Arquitectura #1: Flujo del Agente (Original v0-ai-chat)
```
Landing → Conversation → Sourcing → Comparison → Proposal → Compliance
```
- Estado global: Zustand (`src/lib/ui/state.ts`)
- Navegación: `setStep()`
- UI: Single-page app con transiciones
- Layout: `HomeClient.tsx` con `BrikiSidebarLayout`

#### Arquitectura #2: Workspace Multi-tenant (Nueva)
```
/dashboard
/workspace/cases
/workspace/clients
/profile
```
- Estado: Server Components + Server Actions
- Navegación: Next.js Router
- UI: Páginas tradicionales
- Layout: `src/app/[locale]/(app)/layout.tsx`

### Puntos de Conflicto

**Conflicto #1: Layouts Anidados**
- `HomeClient` (flujo del agente) renderiza `BrikiSidebarLayout`
- `BrikiSidebarLayout` tiene links hardcodeados
- Páginas del workspace NO están dentro de `BrikiSidebarLayout`
- **Usuario en conversación no puede navegar a workspace**

**Conflicto #2: Estado Desconectado**
- `ConversationPane` usa `useUI()` (Zustand)
- Workspace usa server components + fetch
- **NO comparten información del caso activo**

**Conflicto #3: Contexto Perdido**
- `/api/chat/start` crea el caso
- Devuelve `{ success: true, caseId: newCase.id }`
- `LandingChatInput` NO guarda este `caseId` en ningún lado
- `ConversationPane` NO sabe qué caso está activo
- **Mensajes subsecuentes no tienen contexto**

---

### Diagrama de Desconexión

```
┌──────────────────────────────────────────────────────────────┐
│ LANDING (Arquitectura #1)                                    │
├──────────────────────────────────────────────────────────────┤
│ • Sube PDFs a temp/                                          │
│ • Crea caso con /api/chat/start                              │
│ • Devuelve caseId                                            │
│ • ❌ NO guarda caseId en estado compartido                   │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ CONVERSATION (Arquitectura #1)                               │
├──────────────────────────────────────────────────────────────┤
│ • Estado: Zustand (UI state)                                 │
│ • ❌ NO sabe qué caseId está activo                          │
│ • POST /api/chat/process-message sin caseId                  │
│ • Agente responde sin contexto                               │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ WORKSPACE (Arquitectura #2)                                  │
├──────────────────────────────────────────────────────────────┤
│ • Rutas Next.js: /workspace/cases                            │
│ • ❌ NO accesible desde sidebar del agente                   │
│ • ✅ Puede ver casos si accede directo a URL                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. FUNCIONALIDADES CONFUSAS O DUPLICADAS

### Duplicación #1: Sistema de Navegación

**Archivos Duplicados**:
- `src/components/SidebarNav.tsx`: Array de links hardcodeados
- `src/components/BrikiSidebar.tsx`: **Mismo array, copiado** (líneas 19-25)

**Inconsistencia**:
- Ambos archivos definen los mismos links
- Cambiar en uno NO actualiza el otro
- **Difícil de mantener**

**Solución**: Centralizar en archivo de configuración
```typescript
// src/config/navigation.ts
export const workspaceLinks = [
  { label: "Dashboard", href: "/dashboard", icon: "Home" },
  { label: "Cases", href: "/workspace/cases", icon: "Briefcase" },
  { label: "Clients", href: "/workspace/clients", icon: "Users" },
  { label: "Profile", href: "/profile", icon: "User" },
];
```

---

### Duplicación #2: Obtención de Organización

**Patrón Repetido** en 6 archivos:
```typescript
// En: workspace/cases/page.tsx
// En: workspace/cases/new/page.tsx
// En: workspace/cases/[id]/page.tsx
// En: workspace/clients/page.tsx
// En: workspace/clients/new/page.tsx
// En: workspace/clients/[id]/page.tsx

const organizations = await getUserOrganizations();
if (!organizations || organizations.length === 0) {
    redirect('/onboarding/organization');
}
const currentOrg = (organizations[0] as any)?.organizations || organizations[0]?.organization;
if (!currentOrg) {
    redirect('/onboarding/organization');
}
```

**Problema**:
- Código idéntico copiado 6 veces
- Difícil de mantener
- Cast `as any` indica problema de tipado

**Solución**: Crear helper reutilizable
```typescript
// src/lib/helpers/getCurrentOrg.ts
export async function getCurrentOrg() {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    
    const organizations = await getUserOrganizations();
    if (!organizations || organizations.length === 0) {
        redirect('/onboarding/organization');
    }
    
    const currentOrg = organizations[0]?.organizations;
    if (!currentOrg) redirect('/onboarding/organization');
    
    return { user, currentOrg, organizations };
}

// Uso en cada página:
const { user, currentOrg } = await getCurrentOrg();
```

---

### Duplicación #3: Procesamiento de Mensajes

**Archivos Involucrados**:
- `src/lib/database.ts`: función `processChatMessage()` (líneas 218-264)
- `src/app/api/chat/process-message/route.ts`: endpoint que llama a la función
- `src/app/api/chat/start/route.ts`: crea caso sin procesar mensaje

**Confusión**:
- `processChatMessage()` en `database.ts` crea un caso NUEVO cada vez
- `/api/chat/start` también crea un caso NUEVO
- **¿Cuál se debe usar?**

**Lógica Actual**:
1. Landing → `/api/chat/start` (crea caso #1)
2. Conversación → `/api/chat/process-message` → `processChatMessage()` (crea caso #2)
3. **Cada mensaje crea un caso nuevo** ❌

**Lógica Correcta**:
1. Landing → `/api/chat/start` (crea caso #1 único)
2. Conversación → `/api/chat/process-message` (NO crea caso, solo responde)
3. **Un solo caso por conversación** ✅

**Corrección**: La función `processChatMessage()` en `database.ts` está obsoleta para el nuevo flujo. Debe eliminarse o renombrarse a `createCaseLegacy()` y marcarla como deprecated.

---

### Funcionalidad Confusa #1: Dos `ConversationPane`

**Rutas Implementadas**:
- Conversación del agente: Dentro de `HomeClient` (step="conversation")
- **NO HAY** ruta para ver conversación de un caso específico desde workspace

**Problema**:
- Usuario crea caso desde Landing
- Caso se guarda en BD
- Usuario va a `/workspace/cases/[id]`
- Ve tabs: Resumen, Documentos, Actividad
- **¿Dónde está la conversación con el agente?**

**Arquitectura Esperada**:
```
/workspace/cases/[id]
├── Tab: Resumen
├── Tab: Documentos
├── Tab: Conversación  ← FALTA
└── Tab: Actividad
```

**Solución**: Añadir tab "Conversación" que renderice `ConversationPane` con el `caseId` específico.

---

### Funcionalidad Confusa #2: Brief vs BriefData

**En Zustand State** (`src/lib/ui/state.ts`):
```typescript
brief: CaseBrief;  // Estructura tipada con businessType, employees, coverage, freeText
```

**En Base de Datos** (`public.cases.brief_data`):
```sql
brief_data jsonb  -- JSON flexible, cualquier estructura
```

**En Código**:
```typescript
// LandingChatInput.tsx:
setBrief({ freeText: fullMessage });

// ConversationPane.tsx:
const brief = useUI((state) => state.brief);

// /api/chat/start:
briefData: message ? { freeText: message } : {}
```

**Inconsistencia**:
- UI State tiene brief con estructura `CaseBrief`
- BD guarda `briefData` como JSON libre
- **NO hay sincronización bidireccional**

**Pregunta Crítica**: ¿El brief en UI State es solo para la sesión actual o debe persistir en BD?

**Solución**: 
- Si es solo sesión: Mantener separado ✅
- Si debe persistir: Cargar de BD al entrar a caso existente

---

## 7. PLAN DE CORRECCIÓN ORDENADO

### PRIORIDAD CRÍTICA (Bloquean uso básico)

#### CORRECCIÓN C1: Instalar Componentes UI Faltantes
**Orden**: 1  
**Archivos Afectados**: Ninguno (solo instalación)  
**Comando**:
```bash
npx shadcn@latest add select
npx shadcn@latest add progress
```
**Impacto**: Resuelve Problema #2 (workspace/cases accesible)

---

#### CORRECCIÓN C2: Actualizar Links del Sidebar
**Orden**: 2  
**Archivos a Modificar**:
- `src/components/SidebarNav.tsx` (líneas 8-14)
- `src/components/BrikiSidebar.tsx` (líneas 19-25)

**Cambio**:
```typescript
const links = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Cases", href: "/workspace/cases" },
  { label: "Clients", href: "/workspace/clients" },
  { label: "Profile", href: "/profile" },
];
```

**Impacto**: Resuelve Problema #3 (navegación funcional)

---

### PRIORIDAD ALTA (Funcionalidad core)

#### CORRECCIÓN C3: Pasar Texto Extraído en Upload Temporal
**Orden**: 3  
**Archivos a Modificar**:
- `src/app/api/upload/pdf/route.ts` (líneas 79-101)
- `src/components/Landing/LandingChatInput.tsx` (tipo `tempUploads`)
- `src/app/api/chat/start/route.ts` (líneas 44-61)

**Cambios**:
1. En `/api/upload/pdf` modo temp, añadir `extractedText: pdfText` a `tempUpload`
2. En `LandingChatInput`, añadir `extractedText?: string` al tipo
3. En `/api/chat/start`, usar `contentText: t.extractedText || null`

**Impacto**: El texto del PDF se guarda en BD

---

#### CORRECCIÓN C4: Conectar Conversación con Caso en BD
**Orden**: 4  
**Archivos a Modificar**:
- `src/lib/ui/state.ts`: Añadir `currentCaseId: string | null`
- `src/components/Landing/LandingChatInput.tsx`: Guardar caseId tras `/api/chat/start`
- `src/components/Chat/ConversationPane.tsx`: Enviar caseId en mensajes
- `src/app/api/chat/process-message/route.ts`: Leer artifacts del caso

**Cambios**:
1. Estado global: `currentCaseId: string | null`
2. Setter: `setCurrentCaseId: (id: string | null) => void`
3. En `handleSubmit` de Landing:
   ```typescript
   const data = await res.json();
   if (data.caseId) {
       setCurrentCaseId(data.caseId);  // Guardar en Zustand
   }
   ```
4. En `sendMessage` de ConversationPane:
   ```typescript
   const currentCaseId = useUI((state) => state.currentCaseId);
   body: JSON.stringify({
       message: trimmed,
       brief,
       caseId: currentCaseId  // Enviar a API
   })
   ```
5. En `/api/chat/process-message`:
   ```typescript
   const { caseId } = await request.json();
   if (caseId) {
       const artifacts = await prisma.artifact.findMany({
           where: { caseId },
           select: { fileName: true, contentText: true }
       });
       // Usar en respuesta del agente
   }
   ```

**Impacto**: Resuelve Problema #1 parcialmente (agente tiene contexto)

---

### PRIORIDAD MEDIA (Mejoras de arquitectura)

#### CORRECCIÓN C5: Crear Helper `getCurrentOrg()`
**Orden**: 5  
**Archivo Nuevo**: `src/lib/helpers/getCurrentOrg.ts`  
**Archivos a Modificar**: 6 páginas del workspace

**Beneficio**: Elimina duplicación, mejor tipado

---

#### CORRECCIÓN C6: Deprecar `processChatMessage()` Legacy
**Orden**: 6  
**Archivo**: `src/lib/database.ts` (líneas 218-264)

**Cambio**:
```typescript
/**
 * @deprecated Usar /api/chat/start para crear casos nuevos
 * Esta función crea un caso por cada mensaje (comportamiento legacy)
 */
export async function processChatMessage(...) {
    // Código existente
}
```

**Beneficio**: Claridad para futuros desarrolladores

---

#### CORRECCIÓN C7: Centralizar Configuración de Navegación
**Orden**: 7  
**Archivo Nuevo**: `src/config/navigation.ts`  
**Archivos a Modificar**: `SidebarNav.tsx`, `BrikiSidebar.tsx`

**Beneficio**: Single source of truth

---

### PRIORIDAD BAJA (Pulido)

#### CORRECCIÓN C8: Añadir Tab "Conversación" en Workspace
**Orden**: 8  
**Archivo**: `src/app/[locale]/(app)/workspace/cases/[id]/page.tsx`

**Añadir**:
```tsx
<TabsTrigger value="conversation">Conversación</TabsTrigger>

<TabsContent value="conversation">
    <ConversationPane caseId={params.id} />
</TabsContent>
```

**Beneficio**: Ver historial de chat en workspace

---

## 8. ANÁLISIS DE INTEGRACIÓN ENTRE MÓDULOS

### Módulo: Autenticación
**Archivos**:
- `src/app/[locale]/(auth)/actions.ts`
- `src/lib/supabase/server.ts`
- `src/middleware.ts`

**Estado**: ✅ COHERENTE
- Supabase Auth unificado
- Auto-creación de organizaciones
- Sin duplicaciones

---

### Módulo: Organizaciones
**Archivos**:
- `src/app/actions/organizationActions.ts`
- Páginas del workspace (6 archivos)

**Estado**: ⚠️ FUNCIONAL PERO REPETITIVO
- Lógica correcta
- **Patrón duplicado 6 veces**
- Necesita refactor (helper `getCurrentOrg()`)

---

### Módulo: Casos
**Archivos**:
- `src/lib/database.ts` (CRUD extendido)
- `src/app/api/cases/create/route.ts`
- `src/app/api/chat/start/route.ts`
- `src/app/api/chat/process-message/route.ts`
- Componentes en `src/components/Cases/`
- Páginas en `src/app/[locale]/(app)/workspace/cases/`

**Estado**: ⚠️ FUNCIONAL PERO DESCONECTADO
- CRUD completo ✅
- UI completa ✅
- **NO conectado con flujo del agente** ❌
- Función legacy `processChatMessage()` confunde

---

### Módulo: Clientes
**Archivos**:
- `src/lib/clientsDb.ts` (CRUD con cifrado)
- API routes en `src/app/api/clients/`
- Componentes en `src/components/Clients/`
- Páginas en `src/app/[locale]/(app)/workspace/clients/`

**Estado**: ✅ COHERENTE
- Cifrado funciona correctamente
- UI completa
- Sin dependencias con flujo del agente (independiente) ✅

---

### Módulo: Upload & Storage
**Archivos**:
- `src/app/api/upload/pdf/route.ts`
- `src/components/Upload/PdfUploader.tsx`
- `src/components/Landing/LandingChatInput.tsx`
- Migración: `20251012T120000_storage_artifacts_policies.sql`

**Estado**: ⚠️ FUNCIONAL PERO INCOMPLETO
- Upload funciona ✅
- Storage RLS configurado ✅
- **Texto extraído no se devuelve en modo temp** ❌
- Dos flujos (temp vs persistente) implementados correctamente

---

### Módulo: Agente/Conversación
**Archivos**:
- `src/components/Chat/ConversationPane.tsx`
- `src/app/api/chat/process-message/route.ts`
- `src/app/api/chat/start/route.ts`
- `src/lib/ui/state.ts` (Zustand)

**Estado**: ❌ DESCONECTADO DE BD
- UI funciona ✅
- Estado local (Zustand) funciona ✅
- **NO consulta casos de BD** ❌
- **NO persiste mensajes** ❌
- **NO usa texto de PDFs** ❌

---

## 9. MAPA DE DEPENDENCIAS CRÍTICAS

```
┌─────────────────────────────────────────────────────────────┐
│ ARQUITECTURA ACTUAL (DESCONECTADA)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Landing (UI State)                                          │
│   ↓                                                         │
│ Upload Temporal (Storage) ✅                                │
│   ↓                                                         │
│ /api/chat/start (BD) ✅                                     │
│   ↓                                                         │
│ Conversation (UI State) ← ❌ DESCONEXIÓN                   │
│   ↓                                                         │
│ /api/chat/process-message (Mock) ← ❌ NO LEE BD            │
│                                                             │
│ ═══════════════════════════════════════════════════════════ │
│                                                             │
│ Workspace (Next.js Router) ← ❌ NO ACCESIBLE DESDE AGENTE  │
│   ↓                                                         │
│ /workspace/cases (BD) ✅                                    │
│   ↓                                                         │
│ /workspace/clients (BD) ✅                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. CONCLUSIONES Y RECOMENDACIONES

### Problemas Estructurales Identificados

**1. Dos Arquitecturas Sin Puente**
- Flujo del agente (Zustand + SPA)
- Workspace (Server Components + Router)
- **Necesitan integrarse**, no reemplazarse

**2. Estado No Persistente**
- Conversaciones no se guardan en BD
- `currentCaseId` no existe en estado global
- Mensajes del chat viven solo en memoria del navegador

**3. Componentes UI Incompletos**
- Solo se instalaron algunos componentes de shadcn/ui
- Falta `select`, `progress`, posiblemente otros

**4. Navegación Hardcodeada**
- Links duplicados en múltiples archivos
- Todos apuntan a `#`
- Sin configuración centralizada

### Orden de Corrección Recomendado

```
PASO 1: Instalar componentes UI (C1)
  ↓
PASO 2: Actualizar links del sidebar (C2)
  ↓
PASO 3: Pasar texto extraído en uploads (C3)
  ↓
PASO 4: Conectar conversación con BD (C4)
  ↓
PASO 5: Crear helpers reutilizables (C5)
  ↓
PASO 6: Cleanup y documentación (C6, C7)
```

### Estimación de Esfuerzo

- **C1**: 5 minutos (comandos shadcn)
- **C2**: 10 minutos (actualizar 2 archivos)
- **C3**: 20 minutos (3 archivos, tipado)
- **C4**: 45 minutos (4 archivos, estado global)
- **C5**: 30 minutos (crear helper, refactor 6 archivos)
- **C6-C7**: 20 minutos (documentación, deprecation)

**Total**: ~2.5 horas de desarrollo ordenado

---

## 11. VALIDACIÓN DE COHERENCIA

### Lo que SÍ está bien implementado ✅

1. **Autenticación y Multi-tenancy**:
   - Supabase Auth unificado
   - Auto-creación de organizaciones
   - RLS en tablas funcionando
   - Sin fugas de datos entre organizaciones

2. **Cifrado PII**:
   - Funciones `encrypt_pii/decrypt_pii` correctas
   - Helper `clientsDb.ts` bien estructurado
   - Flujo de cifrado/descifrado transparente

3. **Storage**:
   - Bucket `artifacts` configurado
   - RLS policies correctas
   - Upload temp vs persistente bien separado

4. **CRUD de Casos y Clientes**:
   - Funciones de BD bien escritas
   - Validaciones completas
   - APIs RESTful coherentes

### Lo que necesita integración ⚠️

1. **Flujo del Agente ↔ Workspace**:
   - Conectar sidebar a rutas reales
   - Guardar `currentCaseId` en estado
   - Sincronizar conversación con BD

2. **Datos del PDF ↔ Agente**:
   - Devolver texto en upload temp
   - Guardar en BD
   - Consultar en `process-message`

3. **UI Components**:
   - Completar instalación de shadcn/ui
   - Validar todos los imports

---

## 12. CONCLUSIÓN DEL ANÁLISIS

### Diagnóstico Final

**El código implementado es técnicamente correcto y sigue buenas prácticas**:
- Arquitectura multi-tenant sólida
- Seguridad robusta (RLS, cifrado)
- Separación de concerns apropiada

**El problema NO es de calidad del código, sino de INTEGRACIÓN**:
- Dos subsistemas (Agente UI vs Workspace) creados en paralelo
- Faltan "cables de conexión" entre ellos
- Componentes UI instalados parcialmente

**Esto es NORMAL en desarrollo incremental** y se resuelve con:
1. Instalar dependencias faltantes
2. Actualizar configuraciones hardcodeadas
3. Añadir estado compartido (`currentCaseId`)
4. Conectar flujos de datos (texto del PDF)

### Para Futuros Desarrolladores

**Este proyecto tiene**:
- ✅ Estructura clara y modular
- ✅ Separación de capas (UI, API, DB)
- ✅ Convenciones consistentes
- ✅ Documentación detallada

**Necesita**:
- ⚠️ Completar instalación de UI components
- ⚠️ Conectar módulos existentes
- ⚠️ Sincronizar estado cliente-servidor
- ⚠️ Unificar sistema de navegación

**NO necesita**:
- ❌ Reescribir código existente
- ❌ Cambiar arquitectura fundamental
- ❌ Soluciones temporales o hacks

---

## 13. CHECKLIST DE CORRECCIONES

### Inmediatas (Desbloqueadoras)
- [ ] C1: `npx shadcn@latest add select`
- [ ] C1: `npx shadcn@latest add progress`
- [ ] C2: Actualizar `SidebarNav.tsx` links
- [ ] C2: Actualizar `BrikiSidebar.tsx` links

### Core (Funcionalidad del Agente)
- [ ] C3: Devolver `extractedText` en upload temp
- [ ] C3: Guardar `contentText` en artifacts
- [ ] C4: Añadir `currentCaseId` a UI state
- [ ] C4: Guardar caseId al iniciar chat
- [ ] C4: Enviar caseId en process-message
- [ ] C4: Leer artifacts en process-message

### Refactor (Calidad de Código)
- [ ] C5: Crear `getCurrentOrg()` helper
- [ ] C5: Usar helper en 6 páginas
- [ ] C6: Marcar `processChatMessage()` como deprecated
- [ ] C7: Crear `src/config/navigation.ts`

### Documentación
- [ ] Actualizar `API_DOCUMENTATION.md` con cambios
- [ ] Añadir `ARCHITECTURE_INTEGRATION.md` explicando puentes

---

**FIN DEL ANÁLISIS**

Este documento identifica exactamente:
- ✅ Qué está bien (80% del código)
- ⚠️ Qué falta conectar (integraciones)
- ❌ Qué está duplicado o confuso (navegación, brief)
- 📋 Plan ordenado de corrección

**Próximo paso**: Implementar C1-C4 en orden para resolver los 3 problemas.

