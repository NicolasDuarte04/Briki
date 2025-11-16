# 📋 PLAN INTEGRAL: ANÁLISIS DE PÓLIZAS EN PDF

**Fecha**: 16 de Noviembre, 2025  
**Versión**: 1.0  
**Objetivo**: Implementación del sistema de análisis de pólizas en PDF con visualización especializada, indicadores de referencia y funcionalidad "Ver en PDF"  
**Estado**: 🔍 **ANÁLISIS PREVIO - SIN CÓDIGO**

---

## 📚 ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Análisis de Situación Actual](#2-análisis-de-situación-actual)
3. [Análisis de Componentes Existentes](#3-análisis-de-componentes-existentes)
4. [Análisis de Flujos de Datos](#4-análisis-de-flujos-de-datos)
5. [Impacto y Riesgos](#5-impacto-y-riesgos)
6. [Diseño de la Solución](#6-diseño-de-la-solución)
7. [Plan de Implementación](#7-plan-de-implementación)
8. [Checklist de Verificación](#8-checklist-de-verificación)

---

## 1. RESUMEN EJECUTIVO

### 1.1 Contexto del Proyecto

La aplicación Briki actualmente tiene una **estructura frontend preparada** para la gestión de pólizas de seguros, pero necesita ser adaptada para trabajar con PDFs reales que los clientes suban. El objetivo es implementar un sistema completo de análisis de pólizas que incluya:

- **Tab "Análisis"** (nuevo): Visualización del PDF con resaltados, mini mapa, lista de hallazgos y anotaciones
- **Tab "Pólizas"** (adaptación): Tabla de datos estructurados con referencias al PDF, chips de confianza y botón "Ver en PDF"
- **Integración con agente IA**: Chat contextual que reference puntos exactos del PDF

### 1.2 Principios de Trabajo

✅ **Reutilización máxima del código existente**  
✅ **Mantenimiento de arquitectura dual del proyecto** (Workspace + Agent)  
✅ **Consistencia de estado unidireccional** (Zustand)  
✅ **Separación clara de responsabilidades** (UI/API/Data)

### 1.3 Alcance del Documento

Este documento proporciona:
- ✅ Análisis exhaustivo de la arquitectura actual
- ✅ Identificación de componentes susceptibles de romperse
- ✅ Diseño detallado de la solución propuesta
- ✅ Plan de implementación paso a paso
- ❌ NO incluye código implementado (solo análisis y plan)

---

## 2. ANÁLISIS DE SITUACIÓN ACTUAL

### 2.1 Arquitectura del Proyecto

#### 2.1.1 Stack Tecnológico

| Capa | Tecnología | Estado |
|------|------------|--------|
| **Frontend** | Next.js 15 + React 19 | ✅ Estable |
| **UI** | Tailwind CSS + shadcn/ui | ✅ Estable |
| **Estado** | Zustand | ✅ Estable |
| **Backend** | Next.js API Routes | ✅ Estable |
| **Base de Datos** | PostgreSQL + Prisma | ✅ Estable |
| **Storage** | Supabase Storage | ✅ Estable |
| **IA** | OpenAI API | ✅ Configurado |
| **PDF Processing** | pdf2json | ✅ Funcional |

#### 2.1.2 Estructura de Datos Actual

**Tabla `cases`** (Prisma Schema):
```prisma
model Case {
  id                 String     @id @default(dbgenerated("gen_random_uuid()"))
  orgId              String?    @map("org_id") @db.Uuid
  clientName         String?    @map("client_name")
  status             String     @default("draft")
  stage              String     @default("initial")
  briefData          Json?      @map("brief_data")
  priority           String     @default("medium")
  budget_currency    String?    @default("COP")
  insurance_category String?
  max_budget         Decimal?   @map("max_budget")
  required_coverages String[]   @default([])
  artifacts          Artifact[]
  auditLogs          AuditLog[]
  messages           Message[]
}
```

**Tabla `artifacts`** (Prisma Schema):
```prisma
model Artifact {
  id          String     @id @default(dbgenerated("gen_random_uuid()"))
  caseId      String     @map("case_id") @db.Uuid
  sourceType  SourceType @map("source_type") // 'pdf', 'api', 'link', etc.
  fileId      String?    @map("file_id") // Path en Supabase Storage
  fileName    String?    @map("file_name")
  contentType String?    @map("content_type")
  contentText String?    @map("content_text") // Texto extraído con OCR
  provenance  Json?      // Metadata: uploadedBy, fileHash, pageCount, etc.
  createdAt   DateTime   @default(now())
  case        Case       @relation(fields: [caseId], references: [id], onDelete: Cascade)
}
```

**Estado Global (Zustand)**:
```typescript
interface UIState {
  currentCaseId: string | null;
  brief: CaseBrief;
  policies: Policy[];           // ✅ Datos de pólizas mock actualmente
  policiesLoading: boolean;
  policiesLoaded: boolean;
  messages: ChatMessage[];
  // ... otros estados
}
```

### 2.2 Flujo Actual de PDFs

#### 2.2.1 Flujo de Upload (Modo Persistente)

```
┌──────────────────────────────────────────────────────────────┐
│ FLUJO ACTUAL: Upload de PDF desde Workspace                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Usuario → PdfUploader Component                            │
│     ↓                                                        │
│  POST /api/upload/pdf                                       │
│     ├─ Validación (tamaño, tipo, duplicados)               │
│     ├─ Upload a Supabase Storage:                           │
│     │   artifacts/<orgId>/<caseId>/<timestamp>_<filename>   │
│     ├─ Extracción de texto con pdf2json                     │
│     ├─ Cálculo de hash SHA-256                              │
│     └─ Creación de registro en tabla `artifacts`:          │
│         • sourceType: 'pdf'                                 │
│         • fileId: storagePath                               │
│         • fileName: nombre original                         │
│         • contentText: texto extraído                       │
│         • provenance: { fileHash, pageCount, etc. }         │
│     ↓                                                        │
│  Respuesta: { success: true, artifact: {...} }              │
│     ↓                                                        │
│  Frontend: Actualiza UI (lista de documentos)               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 2.2.2 Flujo de Visualización Actual

```
┌──────────────────────────────────────────────────────────────┐
│ VISUALIZACIÓN ACTUAL: CaseDetailContent + iframe            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  /workspace/cases/[id]                                      │
│     ↓                                                        │
│  CaseDetailContent Component                                 │
│     ├─ Tab "Documentos"                                      │
│     │   └─ Lista de artifacts con iframe básico:            │
│     │       <iframe src="/api/storage/[fileId]" />          │
│     │       • No hay resaltados                             │
│     │       • No hay mini mapa                              │
│     │       • No hay anotaciones                            │
│     │       • Solo visualización básica                     │
│     │                                                        │
│     └─ Tab "Resumen": Muestra briefData                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 Componentes Relevantes Actuales

#### 2.3.1 Componente `WorkspaceTabs`

**Ubicación**: `src/components/Workspace/Tabs.tsx`

**Función**: Sistema de tabs para gestión de casos dentro del workspace

**Tabs Actuales**:
- ✅ `case-brief`: Formulario/resumen del caso
- ✅ `policies`: Visualización de pólizas (tabla mock)
- ✅ `comparisons`: Comparación de pólizas con pesos ajustables
- ✅ `proposal`: Generación de propuestas
- ✅ `compliance`: Verificación de cumplimiento
- ✅ `renewals`: Gestión de renovaciones

**Estado**: ✅ Funcional pero necesita adaptación

#### 2.3.2 Componente `Policies`

**Ubicación**: `src/components/Workspace/Policies.tsx`

**Función**: Muestra tabla de pólizas con filtros

**Características Actuales**:
- ✅ Tabla con TanStack Table (sorting, filtering, pinning)
- ✅ Columnas: plan, premium, deductible, riders, actions
- ✅ Filtros por rango de precio, riders, etc.
- ✅ Botones de acción: "Shortlist", "Evidence", "Notes"
- ✅ Datos provienen de `useUI` state (mock data)

**Problemas Identificados**:
- ❌ Datos son mock, no vienen de PDFs reales
- ❌ No hay conexión con artifacts
- ❌ No hay referencias a páginas del PDF
- ❌ No hay chips de confianza
- ❌ No hay botón "Ver en PDF"

#### 2.3.3 Componente `HomeClient`

**Ubicación**: `src/components/HomeClient.tsx`

**Función**: Orquestador principal que coordina todos los componentes

**Características**:
- ✅ Maneja navegación entre steps
- ✅ Sincroniza estado con Zustand
- ✅ Renderiza Canvas con panel izquierdo (chat) y derecho (tabs)
- ✅ Muestra `WorkspaceTabs` cuando step === "conversation"

**Código Relevante**:
```typescript
// Líneas 404-422
right={(() => {
  if (currentStep === "conversation" || isSourcing) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {isSourcing && (
          <div className="flex-shrink-0 border-b border-border/50 p-2">
            <SourcingProgressWidget compact onStop={stopSourcing} />
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <WorkspaceTabs /> {/* ✅ Aquí se muestra el panel derecho */}
        </div>
      </div>
    );
  }
  // ... otros casos
})()}
```

#### 2.3.4 Componente `ConversationPane`

**Ubicación**: `src/components/Chat/ConversationPane.tsx`

**Función**: Panel de chat con el agente IA

**Características**:
- ✅ Envío de mensajes
- ✅ Guardado en BD (encriptado)
- ✅ Integración con OpenAI API
- ✅ Consulta artifacts por caseId
- ✅ Muestra texto extraído de PDFs en respuestas

**Flujo Actual**:
```typescript
// Envío de mensaje → API /api/chat/process-message
// Backend:
//   1. Consulta artifacts por caseId
//   2. Obtiene contentText de cada PDF
//   3. Construye prompt para OpenAI
//   4. Retorna respuesta del agente
```

---

## 3. ANÁLISIS DE COMPONENTES EXISTENTES

### 3.1 Sistema de Estado Global (Zustand)

**Archivo**: `src/lib/ui/state.ts`

#### 3.1.1 Estado de Pólizas Actual

```typescript
// Líneas 553-556
policies: Policy[];
policiesLoading: boolean;
policiesLoaded: boolean;
```

**Función `setPolicies`** (Líneas 1286-1293):
```typescript
setPolicies: (policies) =>
  set((state) => ({
    policies,
    policiesLoaded: true,
    policiesLoading: false,
    comparisonScores: computeComparisonScores(policies, state.comparisonWeights),
    _cachedPoliciesView: policies.map(policyToView),
  }))
```

**Función `fetchPolicies`** (Líneas 1294-1307):
```typescript
fetchPolicies: async () => {
  const { policiesLoading, policiesLoaded } = get();
  if (policiesLoading || policiesLoaded) {
    return;
  }
  set(() => ({ policiesLoading: true }));
  try {
    const policies = await loadPolicies(); // ✅ MOCK DATA
    get().setPolicies(policies);
  } catch (error) {
    set(() => ({ policiesLoading: false }));
    throw error;
  }
}
```

**Función `loadPolicies`** (archivo `src/lib/data/workspace.ts`):
- ✅ Actualmente retorna datos mock hardcodeados
- ❌ NO consulta la base de datos
- ❌ NO procesa artifacts

#### 3.1.2 Impacto de Cambios en Estado

**⚠️ RIESGO ALTO**: El componente `Policies` depende directamente de:
- `selectPoliciesView()`: Selector que transforma `policies` a `PolicyView[]`
- `policiesLoading`: Loading state
- `policiesLoaded`: Loaded state

**Componentes Afectados**:
1. `Policies.tsx` → Usa `selectPoliciesView()`
2. `Comparison.tsx` → Usa `policies` para comparación
3. `Proposal.tsx` → Usa `proposalSelectedPlans` (derivado de `policies`)

**⚠️ PRECAUCIÓN**: Cualquier cambio en la estructura de `Policy` tipo puede romper:
- `policyToView()` function
- `computeComparisonScores()` function
- Filtros y sorting en `Policies` component

### 3.2 Tipos de Datos (TypeScript)

**Archivo**: `src/lib/types.ts`

#### 3.2.1 Tipo `Policy` Actual

```typescript
// Línea 290
export type Policy = PolicyParsed;
```

**PolicyParsed** viene de `src/lib/validation.ts` (Zod schema):
```typescript
export const PolicySchema = z.object({
  id: z.string(),
  plan: z.string(),
  premium: MoneySchema,
  deductible: MoneySchema,
  riders: z.array(z.string()),
  network: NetworkLevelSchema,
  service: ServiceLevelSchema,
  // ... otros campos
});
```

#### 3.2.2 Tipo `PolicyView` (Vista Simplificada)

```typescript
// Líneas 401-405
export type PolicyView = Pick<Policy, "id" | "plan" | "riders" | "network" | "service"> & {
  premium: number;      // ✅ En major units (dólares, no centavos)
  deductible: number;   // ✅ En major units
  currency: CurrencyCode;
};
```

**⚠️ OBSERVACIÓN CRÍTICA**: La vista simplifica `Money` a `number` para facilitar el rendering

#### 3.2.3 Nuevos Campos Necesarios

Para implementar el sistema de análisis de pólizas, necesitamos agregar:

```typescript
// ✅ PROPUESTA: Extensión de PolicySchema
export const PolicyAnalysisSchema = z.object({
  // ... campos existentes de Policy
  
  // ✅ NUEVOS CAMPOS PARA ANÁLISIS
  sourceArtifactId: z.string().uuid(),           // ID del artifact (PDF)
  extractionConfidence: z.number().min(0).max(1), // 0-1 confidence score
  pageReferences: z.array(z.object({              // Referencias a páginas
    field: z.string(),                             // Campo referenciado
    page: z.number(),                              // Número de página
    boundingBox: z.object({                        // Coordenadas en la página
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }).optional(),
    confidence: z.number().min(0).max(1),          // Confianza específica
  })),
  extractedAt: z.string().datetime(),             // Timestamp de extracción
  extractionMethod: z.enum(['manual', 'ocr', 'hybrid']),
});
```

**⚠️ RIESGO**: Agregar campos al tipo `Policy` puede romper:
- Funciones existentes que crean objetos `Policy`
- Componentes que esperan cierta estructura
- Funciones de transformación (`policyToView`, etc.)

### 3.3 Componente `PdfUploader`

**Ubicación**: `src/components/Upload/PdfUploader.tsx`

**Función**: UI para subir PDFs

**Props Actuales**:
```typescript
interface PdfUploaderProps {
  caseId?: string;  // Modo persistente
  orgId?: string;   // Requerido si hay caseId
  onUploadComplete?: (result: any) => void;
}
```

**Flujo**:
1. Usuario selecciona archivo
2. Validación client-side (tipo, tamaño)
3. Upload a `/api/upload/pdf`
4. Muestra progreso
5. Callback `onUploadComplete` con resultado

**⚠️ NECESITA ADAPTACIÓN**: Actualmente solo sube, no analiza estructura de póliza

### 3.4 API `/api/upload/pdf`

**Ubicación**: `src/app/api/upload/pdf/route.ts`

**Función**: Procesa upload de PDFs

**Pasos Actuales**:
1. ✅ Validación de usuario autenticado
2. ✅ Validación de tipo de archivo (PDF)
3. ✅ Validación de tamaño (máx 10MB)
4. ✅ Cálculo de hash SHA-256 (deduplicación)
5. ✅ Upload a Supabase Storage
6. ✅ Extracción de texto con `pdf2json`
7. ✅ Creación de artifact en BD
8. ✅ Auditoría

**Función `extractTextFromPDF`** (Líneas 16-44):
```typescript
async function extractTextFromPDF(buffer: Buffer): Promise<{text: string, pages: number}> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as any)(null, true);
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      let fullText = '';
      pdfData.Pages.forEach((page: any) => {
        page.Texts.forEach((textBlock: any) => {
          textBlock.R.forEach((run: any) => {
            const decodedText = decodeURIComponent(run.T);
            fullText += decodedText + ' ';
          });
        });
        fullText += '\n';
      });
      
      resolve({
        text: fullText.trim(),
        pages: pdfData.Meta.Pages
      });
    });
    
    pdfParser.parseBuffer(buffer);
  });
}
```

**⚠️ LIMITACIÓN ACTUAL**: 
- ✅ Extrae texto plano
- ❌ NO extrae coordenadas de texto (necesario para resaltados)
- ❌ NO detecta estructura de tabla
- ❌ NO identifica campos específicos de pólizas

### 3.5 API `/api/chat/process-message`

**Ubicación**: `src/app/api/chat/process-message/route.ts`

**Función**: Procesa mensajes del usuario con IA

**Pasos**:
1. ✅ Autenticación
2. ✅ Consulta artifacts por caseId
3. ✅ Construye prompt con `contentText` de artifacts
4. ✅ Llama a OpenAI API
5. ✅ Guarda mensaje del usuario (encriptado)
6. ✅ Guarda respuesta del agente (encriptado)
7. ✅ Retorna respuesta

**⚠️ NECESITA EXTENSIÓN**: Para referencias profundas a PDF, necesita:
- ❌ Metadata de coordenadas en artifacts
- ❌ Sistema de "anchor" para referenciar posiciones exactas
- ❌ Formato de respuesta que incluya referencias

---

## 4. ANÁLISIS DE FLUJOS DE DATOS

### 4.1 Flujo Propuesto: Upload → Análisis → Visualización

```
┌──────────────────────────────────────────────────────────────┐
│ FLUJO COMPLETO PROPUESTO                                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1️⃣ UPLOAD                                                   │
│     Usuario → PdfUploader → POST /api/upload/pdf            │
│     ✅ Subir a Storage                                       │
│     ✅ Extracción de texto + coordenadas                     │
│     ✅ Crear artifact en BD                                  │
│                                                              │
│  2️⃣ ANÁLISIS (NUEVO)                                         │
│     POST /api/policies/analyze                              │
│     ✅ Detectar tipo de documento (póliza/propuesta/etc.)   │
│     ✅ Extraer campos estructurados:                         │
│        • Aseguradora                                         │
│        • Número de póliza                                    │
│        • Vigencia (from/to)                                  │
│        • Prima total                                         │
│        • Coberturas (con límites)                           │
│        • Exclusiones                                         │
│        • Deducibles                                          │
│     ✅ Asignar confianza a cada campo                        │
│     ✅ Guardar coordenadas de referencia                     │
│     ✅ Crear registro en nueva tabla `policy_analyses`      │
│                                                              │
│  3️⃣ VISUALIZACIÓN EN TAB "ANÁLISIS"                         │
│     WorkspaceTabs → Tab "analysis" (nuevo)                  │
│     ✅ Visor PDF con capas de resaltado                      │
│     ✅ Mini mapa de navegación                               │
│     ✅ Lista de hallazgos (coberturas, exclusiones, etc.)   │
│     ✅ Panel de anotaciones                                  │
│     ✅ Botón "Ver en PDF" → scroll to anchor                │
│                                                              │
│  4️⃣ VISUALIZACIÓN EN TAB "PÓLIZAS"                          │
│     WorkspaceTabs → Tab "policies" (adaptado)               │
│     ✅ Tabla de datos estructurados                          │
│     ✅ Chip de confianza por fila (Alto/Medio/Bajo)        │
│     ✅ Botón "Ver en PDF" por fila → abre tab analysis +    │
│        scroll to anchor                                      │
│     ✅ Indicador de página de referencia                     │
│                                                              │
│  5️⃣ CHAT CONTEXTUAL                                          │
│     ConversationPane → proceso mensaje →                    │
│     POST /api/chat/process-message                          │
│     ✅ Incluir datos estructurados de policy_analyses       │
│     ✅ Incluir coordenadas de referencia                     │
│     ✅ Respuesta con "Ver en PDF" links                      │
│     ✅ Click en link → abre tab analysis + scroll           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Flujo de Datos Detallado

#### 4.2.1 Upload y Almacenamiento

```
Usuario Upload
    ↓
PdfUploader Component
    ↓
POST /api/upload/pdf
    ├─ FormData: { pdf: File }
    └─ Headers: { Cookie: session }
    ↓
Backend Processing
    ├─ 1. Autenticación (Supabase Auth)
    ├─ 2. Validación (tipo, tamaño, duplicados)
    ├─ 3. Upload a Supabase Storage
    │     artifacts/<orgId>/<caseId>/<timestamp>_<filename>
    ├─ 4. Extracción con pdf2json (mejorado)
    │     ├─ Texto plano
    │     ├─ Coordenadas de texto (x, y, width, height, page)
    │     ├─ Detección de tablas
    │     └─ Estructura de documento
    ├─ 5. Crear Artifact en BD
    │     INSERT INTO artifacts (
    │       caseId, sourceType='pdf', fileId=path,
    │       fileName, contentType, contentText,
    │       provenance={ fileHash, pageCount, coordinates }
    │     )
    └─ 6. Trigger Análisis Automático (opcional)
          POST /api/policies/analyze (async)
    ↓
Response: { 
  success: true, 
  artifact: { id, fileName, contentText, ... },
  analysisQueued: true 
}
    ↓
Frontend Update
    ├─ Actualizar lista de documentos
    ├─ Mostrar toast "Análisis en curso..."
    └─ Poll o WebSocket para estado de análisis
```

#### 4.2.2 Análisis de Póliza

```
POST /api/policies/analyze
    ├─ Body: { artifactId: "uuid" }
    └─ Headers: { Cookie: session }
    ↓
Backend Processing
    ├─ 1. Obtener artifact de BD
    ├─ 2. Cargar PDF desde Storage
    ├─ 3. Análisis con IA (OpenAI + prompting específico)
    │     ├─ Prompt: "Extraer datos estructurados de póliza..."
    │     ├─ Input: contentText + coordinates
    │     └─ Output: JSON estructurado
    ├─ 4. Validación y normalización
    │     ├─ Fechas → ISO 8601
    │     ├─ Montos → Money type (amountMinor, currency)
    │     ├─ Confianza → 0-1 float
    │     └─ Referencias → { field, page, box, confidence }
    ├─ 5. Guardar en tabla `policy_analyses`
    │     INSERT INTO policy_analyses (
    │       artifactId, caseId, extractedData,
    │       confidence, pageReferences, extractedAt
    │     )
    └─ 6. Actualizar estado global (Zustand)
          useUI.getState().addPolicyAnalysis(analysis)
    ↓
Response: {
  success: true,
  analysis: {
    id, artifactId, extractedData, confidence,
    pageReferences: [
      { field: "premium", page: 2, box: {...}, confidence: 0.95 },
      { field: "deductible", page: 3, box: {...}, confidence: 0.88 },
      ...
    ]
  }
}
    ↓
Frontend Update
    ├─ Actualizar policies state
    ├─ Actualizar vista de tabla (Policies component)
    ├─ Habilitar tab "analysis"
    └─ Mostrar toast "Análisis completado"
```

#### 4.2.3 Visualización en Tab "Análisis"

```
Usuario Click en Tab "Análisis"
    ↓
WorkspaceTabs → activeTab = "analysis"
    ↓
AnalysisTab Component (NUEVO)
    ├─ Props: { caseId, activePolicyAnalysisId }
    ├─ State: { selectedArtifact, highlightLayer, selectedHighlight }
    └─ UI Structure:
        ├─ Left: PDF Viewer
        │   ├─ react-pdf o pdf.js wrapper
        │   ├─ Canvas overlay para resaltados
        │   │   ├─ Coberturas → color verde
        │   │   ├─ Exclusiones → color rojo
        │   │   ├─ Límites → color azul
        │   │   └─ Deducibles → color amarillo
        │   ├─ Mini mapa (thumbnails de páginas)
        │   └─ Controles (zoom, página, etc.)
        ├─ Right: Panel de Hallazgos
        │   ├─ Selector de capa (coberturas/exclusiones/etc.)
        │   ├─ Lista de hallazgos:
        │   │   ├─ Cada item: { label, page, confidence }
        │   │   └─ Click → scroll to + highlight
        │   └─ Panel de anotaciones (usuarios pueden añadir)
        └─ Bottom: Toolbar
            ├─ Botón "Guardar en Caso"
            ├─ Botón "Añadir a Set" (para comparación)
            └─ Botón "Exportar Anotaciones"
    ↓
Interacción: Click en hallazgo
    ├─ Obtener pageReference del análisis
    ├─ Navegar a página específica
    ├─ Scroll to boundingBox
    ├─ Resaltar área con animación
    └─ Mostrar tooltip con metadatos
```

#### 4.2.4 Visualización en Tab "Pólizas"

```
Usuario Click en Tab "Pólizas"
    ↓
WorkspaceTabs → activeTab = "policies"
    ↓
Policies Component (ADAPTADO)
    ├─ State: policies[] (ahora desde policy_analyses)
    └─ UI Structure:
        ├─ Filters (plan, premium range, etc.)
        ├─ Table (TanStack Table):
        │   ├─ Columna "Plan"
        │   │   └─ Cell: <div>{plan} <ConfidenceChip /></div>
        │   ├─ Columna "Prima"
        │   │   └─ Cell: <div>{formatMoney(premium)} 
        │   │              <PageRefChip page={pageRef} /></div>
        │   ├─ Columna "Deducible"
        │   │   └─ Cell: <div>{formatMoney(deductible)} 
        │   │              <PageRefChip page={pageRef} /></div>
        │   ├─ Columna "Coberturas"
        │   │   └─ Cell: <CoveragesList items={coverages} />
        │   └─ Columna "Acciones"
        │       └─ Cell: <Button onClick={handleViewInPdf}>
        │                  Ver en PDF
        │                </Button>
        └─ Loading/Empty States
    ↓
Interacción: Click en "Ver en PDF"
    ├─ Obtener pageReference de la fila
    ├─ Cambiar activeTab a "analysis"
    ├─ Pasar selectedHighlight prop
    └─ Trigger scroll to anchor en AnalysisTab
```

### 4.3 Integración con Chat

```
Usuario Pregunta: "¿Cuál es el deducible?"
    ↓
ConversationPane → handleSend()
    ↓
POST /api/chat/process-message
    ├─ Body: { message, caseId, brief }
    └─ Headers: { Cookie: session }
    ↓
Backend Processing
    ├─ 1. Obtener artifacts del caso
    ├─ 2. Obtener policy_analyses del caso
    ├─ 3. Construir prompt enriquecido:
    │     "Usuario: ¿Cuál es el deducible?
    │      
    │      Datos estructurados disponibles:
    │      - Póliza: [nombre]
    │      - Deducible: $5,000 MXN (página 3, confianza: 0.92)
    │      - Coberturas: [lista]
    │      
    │      Texto completo del PDF:
    │      [contentText]
    │      
    │      Responde mencionando la página donde está el dato."
    ├─ 4. Llamar a OpenAI API
    ├─ 5. Procesar respuesta para extraer referencias
    │     Ejemplo output:
    │     "El deducible es de $5,000 MXN. [Ver en PDF](#ref:deducible:page3)"
    ├─ 6. Guardar mensajes (encriptados)
    └─ 7. Retornar respuesta con metadatos
          {
            response: "El deducible es de $5,000 MXN...",
            references: [
              { field: "deducible", page: 3, anchor: "#ref:deducible:page3" }
            ]
          }
    ↓
Frontend Processing
    ├─ Renderizar mensaje con links clicables
    └─ Click en "[Ver en PDF]" → abrir tab analysis + scroll
```

---

## 5. IMPACTO Y RIESGOS

### 5.1 Componentes Susceptibles de Romperse

#### 5.1.1 🔴 RIESGO ALTO

**1. `Policies.tsx` Component**
- **Por qué**: Cambio en la fuente de datos (mock → DB)
- **Impacto**: Tabla vacía, errores de rendering, filtros rotos
- **Mitigación**:
  - Mantener interface `PolicyView` sin cambios
  - Adaptar `loadPolicies()` gradualmente
  - Tests de regresión antes y después

**2. `src/lib/ui/state.ts` (Zustand Store)**
- **Por qué**: Nuevos estados y acciones
- **Impacto**: Re-renders innecesarios, bugs de sincronización
- **Mitigación**:
  - Usar selectores específicos
  - Evitar cambios en acciones existentes
  - Documentar nuevas acciones claramente

**3. `loadPolicies()` Function**
- **Por qué**: Cambio de mock data a consulta DB
- **Impacto**: Queries lentas, errores de transformación
- **Mitigación**:
  - Implementar timeout
  - Añadir fallback a datos vacíos
  - Logging exhaustivo

#### 5.1.2 🟡 RIESGO MEDIO

**4. `Comparison.tsx` Component**
- **Por qué**: Dependencia en estructura de `Policy`
- **Impacto**: Comparación rota si cambian tipos
- **Mitigación**:
  - Tests de integración
  - Validación de tipos con Zod

**5. `Proposal.tsx` Component**
- **Por qué**: Usa `proposalSelectedPlans` derivado de `policies`
- **Impacto**: Propuestas incorrectas o vacías
- **Mitigación**:
  - Verificar transformaciones
  - Mantener backward compatibility

**6. API `/api/upload/pdf`**
- **Por qué**: Añadir extracción de coordenadas
- **Impacto**: Timeouts, memoria alta, errores de parsing
- **Mitigación**:
  - Procesar en background (queue)
  - Limitar tamaño de archivo
  - Retry logic robusto

#### 5.1.3 🟢 RIESGO BAJO

**7. `ConversationPane.tsx`**
- **Por qué**: Solo se añade funcionalidad (referencias PDF)
- **Impacto**: Mínimo, cambios aditivos
- **Mitigación**:
  - Feature flag para activar/desactivar

**8. Tabla `artifacts`**
- **Por qué**: Campo `provenance` ya es JSON, extensible
- **Impacto**: Ninguno si se añaden campos opcionales
- **Mitigación**:
  - Validación de JSON en backend

### 5.2 Tabla de Riesgos Consolidada

| Componente | Riesgo | Probabilidad | Impacto | Mitigación |
|------------|--------|--------------|---------|------------|
| `Policies.tsx` | 🔴 Alto | 90% | Alto | Tests + gradual rollout |
| `state.ts` (Zustand) | 🔴 Alto | 80% | Alto | Selectores + docs |
| `loadPolicies()` | 🔴 Alto | 85% | Alto | Timeout + fallback |
| `Comparison.tsx` | 🟡 Medio | 60% | Medio | Tests de integración |
| `Proposal.tsx` | 🟡 Medio | 50% | Medio | Backward compatibility |
| API `/api/upload/pdf` | 🟡 Medio | 70% | Medio | Background queue |
| `ConversationPane.tsx` | 🟢 Bajo | 30% | Bajo | Feature flag |
| Tabla `artifacts` | 🟢 Bajo | 20% | Bajo | Validación JSON |

### 5.3 Estrategia de Mitigación General

#### 5.3.1 Principios de Implementación Segura

1. **Gradualidad**: Implementar en fases pequeñas e incrementales
2. **Backward Compatibility**: Mantener compatibilidad con código existente
3. **Feature Flags**: Usar flags para activar/desactivar nuevas funcionalidades
4. **Tests Exhaustivos**: Tests antes, durante y después de cada fase
5. **Rollback Plan**: Plan claro para revertir cambios si algo falla

#### 5.3.2 Checklist de Seguridad Pre-Implementación

Antes de cada fase de implementación:

- [ ] Backup completo de base de datos
- [ ] Tests de regresión passing
- [ ] Documentación de cambios actualizada
- [ ] Feature flag configurado
- [ ] Rollback script preparado
- [ ] Logging y monitoring configurado
- [ ] Error handling robusto implementado

#### 5.3.3 Plan de Rollback

En caso de que algo falle:

**Fase 1 - Rollback de BD**:
```sql
-- Revertir migraciones de tablas nuevas
DROP TABLE IF EXISTS policy_analyses;
DROP TABLE IF EXISTS policy_page_references;
```

**Fase 2 - Rollback de Código**:
```bash
# Revertir a commit anterior
git revert <commit-hash>
git push origin main
```

**Fase 3 - Rollback de Estado**:
```typescript
// Desactivar feature flag
const ENABLE_POLICY_ANALYSIS = false;

// Restaurar loadPolicies() a mock data
export async function loadPolicies(): Promise<Policy[]> {
  return MOCK_POLICIES; // Restaurar datos mock
}
```

---

## 6. DISEÑO DE LA SOLUCIÓN

### 6.1 Arquitectura Propuesta

#### 6.1.1 Nuevas Tablas de Base de Datos

**Tabla `policy_analyses`**:
```sql
CREATE TABLE IF NOT EXISTS public.policy_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Datos extraídos estructurados
  extracted_data JSONB NOT NULL, -- Estructura completa de la póliza
  
  -- Metadatos de extracción
  extraction_method TEXT NOT NULL DEFAULT 'hybrid', -- 'manual', 'ocr', 'hybrid'
  overall_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (overall_confidence >= 0 AND overall_confidence <= 1),
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Índices
  CONSTRAINT fk_artifact FOREIGN KEY (artifact_id) REFERENCES public.artifacts(id) ON DELETE CASCADE,
  CONSTRAINT fk_case FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- Índices para búsqueda rápida
CREATE INDEX idx_policy_analyses_artifact_id ON public.policy_analyses(artifact_id);
CREATE INDEX idx_policy_analyses_case_id ON public.policy_analyses(case_id);
CREATE INDEX idx_policy_analyses_org_id ON public.policy_analyses(org_id);
CREATE INDEX idx_policy_analyses_extracted_at ON public.policy_analyses(extracted_at DESC);
CREATE INDEX idx_policy_analyses_confidence ON public.policy_analyses(overall_confidence);

-- GIN index para búsqueda en JSONB
CREATE INDEX idx_policy_analyses_extracted_data ON public.policy_analyses USING gin(extracted_data);

-- Políticas RLS
ALTER TABLE public.policy_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view policy_analyses from their organization"
  ON public.policy_analyses FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert policy_analyses in their organization"
  ON public.policy_analyses FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );
```

**Tabla `policy_page_references`**:
```sql
CREATE TABLE IF NOT EXISTS public.policy_page_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_analysis_id UUID NOT NULL REFERENCES public.policy_analyses(id) ON DELETE CASCADE,
  
  -- Campo referenciado
  field_name TEXT NOT NULL, -- 'premium', 'deductible', 'coverage_medical', etc.
  field_value TEXT, -- Valor extraído (opcional, puede estar en extracted_data)
  
  -- Ubicación en el PDF
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  bounding_box JSONB, -- { x, y, width, height } en unidades del PDF
  
  -- Confianza específica de este campo
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_policy_analysis FOREIGN KEY (policy_analysis_id) 
    REFERENCES public.policy_analyses(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_policy_page_refs_analysis_id ON public.policy_page_references(policy_analysis_id);
CREATE INDEX idx_policy_page_refs_field_name ON public.policy_page_references(field_name);
CREATE INDEX idx_policy_page_refs_page_number ON public.policy_page_references(page_number);
CREATE INDEX idx_policy_page_refs_confidence ON public.policy_page_references(confidence);

-- Políticas RLS (heredan de policy_analyses)
ALTER TABLE public.policy_page_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view page_references via policy_analyses"
  ON public.policy_page_references FOR SELECT
  USING (
    policy_analysis_id IN (
      SELECT id FROM public.policy_analyses
      WHERE org_id IN (
        SELECT org_id FROM public.org_members
        WHERE user_id = auth.uid()
      )
    )
  );
```

**Estructura de `extracted_data` (JSONB)**:
```json
{
  "insurer": {
    "name": "AXA Seguros",
    "code": "AXA-MX",
    "contact": {
      "phone": "+52 55 1234 5678",
      "email": "atencion@axa.mx"
    }
  },
  "policy_number": "POL-2025-001234",
  "insured_name": "Juan Pérez García",
  "effective_from": "2025-01-01T00:00:00Z",
  "effective_to": "2025-12-31T23:59:59Z",
  "jurisdiction": "mx",
  "currency": "MXN",
  "financials": {
    "premium_net": 12500.00,
    "taxes": 2000.00,
    "fees": 500.00,
    "premium_total": 15000.00
  },
  "coverages": [
    {
      "name": "Gastos Médicos Mayores",
      "description": "Cobertura de gastos médicos por enfermedad o accidente",
      "limit_amount": 10000000.00,
      "limit_unit": "MXN",
      "sublimits": [
        {
          "name": "Maternidad",
          "amount": 500000.00,
          "unit": "MXN"
        }
      ],
      "deductible_amount": 50000.00,
      "deductible_unit": "MXN",
      "waiting_period": 30,
      "confidence": 0.95
    }
  ],
  "exclusions": [
    {
      "name": "Enfermedades preexistentes",
      "description": "No cubre condiciones médicas previas al inicio de la póliza",
      "confidence": 0.92
    }
  ],
  "deductibles": [
    {
      "type": "general",
      "amount": 50000.00,
      "unit": "MXN",
      "applies_to": "all_coverages"
    }
  ],
  "endorsements": [
    {
      "code": "END-001",
      "title": "Extensión de cobertura territorial",
      "effect": "add",
      "description": "Cobertura válida en EE.UU. y Canadá"
    }
  ],
  "claims_process": {
    "emergency_phones": ["+52 55 8888 8888"],
    "steps": [
      "Llamar al teléfono de emergencia",
      "Acudir a hospital de la red",
      "Presentar identificación y póliza"
    ],
    "documents_required": [
      "Identificación oficial",
      "Póliza vigente",
      "Reporte médico"
    ]
  },
  "network": {
    "hospitals": ["Hospital ABC", "Hospital XYZ"],
    "level": "preferred"
  }
}
```

#### 6.1.2 Actualización de Prisma Schema

```prisma
// Añadir a prisma/schema.prisma

model PolicyAnalysis {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  artifactId       String   @map("artifact_id") @db.Uuid
  caseId           String   @map("case_id") @db.Uuid
  orgId            String   @map("org_id") @db.Uuid
  extractedData    Json     @map("extracted_data")
  extractionMethod String   @default("hybrid") @map("extraction_method")
  overallConfidence Decimal @map("overall_confidence") @db.Decimal(3, 2)
  extractedAt      DateTime @map("extracted_at") @db.Timestamptz(6)
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt        DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  
  artifact         Artifact @relation(fields: [artifactId], references: [id], onDelete: Cascade)
  case             Case     @relation(fields: [caseId], references: [id], onDelete: Cascade)
  pageReferences   PolicyPageReference[]
  
  @@index([artifactId])
  @@index([caseId])
  @@index([orgId])
  @@index([extractedAt(sort: Desc)])
  @@index([overallConfidence])
  @@map("policy_analyses")
  @@schema("public")
}

model PolicyPageReference {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  policyAnalysisId String   @map("policy_analysis_id") @db.Uuid
  fieldName        String   @map("field_name")
  fieldValue       String?  @map("field_value")
  pageNumber       Int      @map("page_number")
  boundingBox      Json?    @map("bounding_box")
  confidence       Decimal  @db.Decimal(3, 2)
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  
  policyAnalysis   PolicyAnalysis @relation(fields: [policyAnalysisId], references: [id], onDelete: Cascade)
  
  @@index([policyAnalysisId])
  @@index([fieldName])
  @@index([pageNumber])
  @@index([confidence])
  @@map("policy_page_references")
  @@schema("public")
}

// Actualizar modelo Artifact
model Artifact {
  // ... campos existentes ...
  policyAnalyses PolicyAnalysis[]
}

// Actualizar modelo Case
model Case {
  // ... campos existentes ...
  policyAnalyses PolicyAnalysis[]
}
```

### 6.2 Nuevos Componentes Frontend

#### 6.2.1 Tab "Análisis" (`AnalysisTab.tsx`)

**Props**:
```typescript
interface AnalysisTabProps {
  caseId: string;
  selectedPolicyAnalysisId?: string;
  selectedFieldName?: string; // Para scroll automático
}
```

**Estructura**:
```
<AnalysisTab>
  <div className="flex h-full">
    {/* Panel Izquierdo: Visor PDF */}
    <div className="flex-1 relative">
      <PdfViewer
        artifactId={selectedArtifact.id}
        highlightLayers={highlightLayers}
        selectedHighlight={selectedHighlight}
        onHighlightClick={handleHighlightClick}
        annotations={annotations}
        onAnnotationAdd={handleAnnotationAdd}
      />
      <PdfMinimap
        currentPage={currentPage}
        totalPages={totalPages}
        onPageClick={handlePageClick}
      />
    </div>
    
    {/* Panel Derecho: Hallazgos y Anotaciones */}
    <div className="w-80 border-l overflow-y-auto">
      <FindingsList
        analysis={policyAnalysis}
        selectedLayer={selectedLayer}
        onFindingClick={handleFindingClick}
      />
      <AnnotationsPanel
        annotations={annotations}
        onAnnotationClick={handleAnnotationClick}
      />
    </div>
  </div>
</AnalysisTab>
```

**Subcomponentes Necesarios**:

1. **`PdfViewer.tsx`**: Visor de PDF con overlay de resaltados
   - Librería: `react-pdf` o `pdf.js` wrapper custom
   - Canvas overlay para dibujar boundingBox
   - Zoom, navegación de páginas
   - Tooltips con metadatos

2. **`PdfMinimap.tsx`**: Mini mapa de navegación
   - Thumbnails de páginas
   - Indicador de página actual
   - Click para navegar

3. **`FindingsList.tsx`**: Lista de hallazgos
   - Agrupados por tipo (coberturas, exclusiones, etc.)
   - Chip de confianza
   - Click para scroll to + highlight

4. **`AnnotationsPanel.tsx`**: Panel de anotaciones
   - Anotaciones de usuario
   - Menciones a otros miembros del equipo
   - Timestamps

#### 6.2.2 Adaptación de `Policies.tsx`

**Cambios Mínimos**:
```typescript
// ANTES: Datos mock
const rows = React.useMemo(() => selectPoliciesView(), [selectPoliciesView]);

// DESPUÉS: Datos de análisis de pólizas
const rows = React.useMemo(() => {
  const analyses = useUI((s) => s.policyAnalyses); // Nuevo estado
  return analyses.map(analysisToView); // Nueva función de transformación
}, []);
```

**Nueva Columna "Referencia"**:
```typescript
{
  accessorKey: "pageReference",
  header: ({ column }) => (
    <HeaderWithPinMenu column={column} title={t("columns.reference")} />
  ),
  cell: ({ row }) => (
    <div className="flex items-center gap-2">
      <PageRefChip page={row.original.pageReference} />
      <ConfidenceChip confidence={row.original.confidence} />
    </div>
  ),
}
```

**Columna "Acciones" Extendida**:
```typescript
{
  id: "actions",
  cell: ({ row }) => (
    <div className="flex items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleViewInPdf(row.original.id, 'premium')}
      >
        {t("actions.viewInPdf")}
      </Button>
      <Button variant="ghost" size="sm">
        {t("actions.shortlist")}
      </Button>
      <Button variant="ghost" size="sm">
        {t("actions.notes")}
      </Button>
    </div>
  ),
}
```

**Función `handleViewInPdf`**:
```typescript
const handleViewInPdf = (policyAnalysisId: string, fieldName: string) => {
  // 1. Cambiar tab activo a "analysis"
  setActiveTab("analysis");
  
  // 2. Establecer análisis seleccionado
  useUI.getState().setSelectedPolicyAnalysis(policyAnalysisId);
  
  // 3. Establecer campo seleccionado para scroll automático
  useUI.getState().setSelectedField(fieldName);
  
  // 4. Trigger scroll en AnalysisTab (via efecto)
  // El componente AnalysisTab escucha estos cambios y hace scroll
};
```

#### 6.2.3 Componentes UI Auxiliares

**`ConfidenceChip.tsx`**:
```typescript
interface ConfidenceChipProps {
  confidence: number; // 0-1
}

export function ConfidenceChip({ confidence }: ConfidenceChipProps) {
  const level = confidence >= 0.9 ? 'high' : confidence >= 0.7 ? 'medium' : 'low';
  const label = {
    high: 'Alto',
    medium: 'Medio',
    low: 'Bajo'
  }[level];
  
  const variant = {
    high: 'success',
    medium: 'warning',
    low: 'destructive'
  }[level] as BadgeProps['variant'];
  
  return (
    <Badge variant={variant} className="text-xs">
      {label} ({(confidence * 100).toFixed(0)}%)
    </Badge>
  );
}
```

**`PageRefChip.tsx`**:
```typescript
interface PageRefChipProps {
  page: number;
}

export function PageRefChip({ page }: PageRefChipProps) {
  return (
    <Badge variant="outline" className="text-xs">
      <FileTextIcon className="w-3 h-3 mr-1" />
      Pág. {page}
    </Badge>
  );
}
```

### 6.3 Nuevas APIs

#### 6.3.1 POST `/api/policies/analyze`

**Propósito**: Analizar un PDF de póliza y extraer datos estructurados

**Request**:
```typescript
POST /api/policies/analyze
Content-Type: application/json

{
  "artifactId": "uuid",
  "extractionMethod": "hybrid" // 'manual' | 'ocr' | 'hybrid'
}
```

**Response**:
```typescript
{
  "success": true,
  "analysis": {
    "id": "uuid",
    "artifactId": "uuid",
    "caseId": "uuid",
    "extractedData": { /* JSON estructurado */ },
    "overallConfidence": 0.89,
    "pageReferences": [
      {
        "id": "uuid",
        "fieldName": "premium",
        "fieldValue": "15000.00",
        "pageNumber": 2,
        "boundingBox": { "x": 100, "y": 200, "width": 150, "height": 20 },
        "confidence": 0.95
      }
      // ... más referencias
    ],
    "extractedAt": "2025-01-01T00:00:00Z"
  }
}
```

**Implementación**:
```typescript
// src/app/api/policies/analyze/route.ts

export async function POST(request: NextRequest) {
  // 1. Autenticación y validación
  const { user, currentOrg } = await getCurrentOrg();
  const { artifactId, extractionMethod = 'hybrid' } = await request.json();
  
  // 2. Obtener artifact
  const artifact = await prisma.artifact.findFirst({
    where: { 
      id: artifactId,
      case: { orgId: currentOrg.id } // RLS
    },
    include: { case: true }
  });
  
  if (!artifact) {
    return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
  }
  
  // 3. Cargar PDF desde Storage
  const pdfBuffer = await downloadFromStorage(artifact.fileId);
  
  // 4. Extraer con coordinadas (mejorado)
  const extractionResult = await extractWithCoordinates(pdfBuffer);
  
  // 5. Análisis con IA
  const analysisResult = await analyzeWithAI({
    text: extractionResult.text,
    coordinates: extractionResult.coordinates,
    extractionMethod
  });
  
  // 6. Guardar en BD
  const policyAnalysis = await prisma.policyAnalysis.create({
    data: {
      artifactId: artifact.id,
      caseId: artifact.caseId,
      orgId: currentOrg.id,
      extractedData: analysisResult.data,
      extractionMethod,
      overallConfidence: analysisResult.confidence,
      extractedAt: new Date(),
      pageReferences: {
        create: analysisResult.pageReferences.map(ref => ({
          fieldName: ref.field,
          fieldValue: ref.value,
          pageNumber: ref.page,
          boundingBox: ref.box,
          confidence: ref.confidence
        }))
      }
    },
    include: { pageReferences: true }
  });
  
  // 7. Auditoría
  await tryRecordAuditLog({
    caseId: artifact.caseId,
    actor: user.id,
    action: 'policy_analyzed',
    tool: 'analyze_api',
    payload: {
      policyAnalysisId: policyAnalysis.id,
      artifactId: artifact.id,
      confidence: policyAnalysis.overallConfidence
    }
  });
  
  return NextResponse.json({
    success: true,
    analysis: policyAnalysis
  });
}
```

#### 6.3.2 GET `/api/policies/analyses`

**Propósito**: Obtener análisis de pólizas de un caso

**Request**:
```typescript
GET /api/policies/analyses?caseId=uuid
```

**Response**:
```typescript
{
  "analyses": [
    {
      "id": "uuid",
      "artifact": {
        "id": "uuid",
        "fileName": "poliza_axa.pdf",
        "contentType": "application/pdf"
      },
      "extractedData": { /* JSON */ },
      "overallConfidence": 0.89,
      "extractedAt": "2025-01-01T00:00:00Z",
      "pageReferences": [ /* array */ ]
    }
    // ... más análisis
  ]
}
```

#### 6.3.3 Función `extractWithCoordinates`

**Ubicación**: `src/lib/pdf/extraction.ts`

**Propósito**: Extraer texto con coordenadas de bounding boxes

```typescript
interface ExtractionResult {
  text: string;
  pages: number;
  coordinates: Array<{
    text: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

export async function extractWithCoordinates(
  buffer: Buffer
): Promise<ExtractionResult> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as any)(null, true);
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      let fullText = '';
      const coordinates: ExtractionResult['coordinates'] = [];
      
      pdfData.Pages.forEach((page: any, pageIndex: number) => {
        page.Texts.forEach((textBlock: any) => {
          textBlock.R.forEach((run: any) => {
            const decodedText = decodeURIComponent(run.T);
            fullText += decodedText + ' ';
            
            // ✅ NUEVO: Guardar coordenadas
            coordinates.push({
              text: decodedText,
              page: pageIndex + 1,
              x: textBlock.x,
              y: textBlock.y,
              width: textBlock.w,
              height: textBlock.h
            });
          });
        });
        fullText += '\n';
      });
      
      resolve({
        text: fullText.trim(),
        pages: pdfData.Meta.Pages,
        coordinates
      });
    });
    
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error('Failed to parse PDF'));
    });
    
    pdfParser.parseBuffer(buffer);
  });
}
```

#### 6.3.4 Función `analyzeWithAI`

**Ubicación**: `src/lib/openai/policyAnalysis.ts`

**Propósito**: Analizar texto y coordenadas con IA para extraer datos estructurados

```typescript
interface AnalysisInput {
  text: string;
  coordinates: Array<{ text: string; page: number; x: number; y: number; width: number; height: number }>;
  extractionMethod: 'manual' | 'ocr' | 'hybrid';
}

interface AnalysisOutput {
  data: PolicyExtractedData; // JSON estructurado
  confidence: number;
  pageReferences: Array<{
    field: string;
    value: string;
    page: number;
    box: { x: number; y: number; width: number; height: number };
    confidence: number;
  }>;
}

export async function analyzeWithAI(input: AnalysisInput): Promise<AnalysisOutput> {
  const openai = getOpenAIClient();
  
  // 1. Construir prompt especializado
  const prompt = `
Eres un experto en análisis de pólizas de seguros. Analiza el siguiente texto extraído de un PDF de póliza y extrae los datos estructurados.

TEXTO DEL PDF:
${input.text}

COORDENADAS DE TEXTO (para referencias):
${JSON.stringify(input.coordinates.slice(0, 100), null, 2)}

INSTRUCCIONES:
1. Identifica y extrae los siguientes datos:
   - Información de aseguradora (nombre, código, contacto)
   - Número de póliza
   - Nombre del asegurado
   - Vigencia (fecha inicio y fin)
   - Moneda y jurisdicción
   - Financials (prima neta, impuestos, prima total)
   - Coberturas (con límites, sublímites, deducibles)
   - Exclusiones principales
   - Deducibles generales
   - Endosos o anexos
   - Proceso de reclamación (teléfonos, pasos)

2. Para cada dato extraído, asigna un nivel de confianza (0-1):
   - 0.9-1.0: Dato claramente identificado con label explícito
   - 0.7-0.89: Dato inferido con contexto claro
   - 0.5-0.69: Dato inferido con contexto ambiguo
   - 0-0.49: Dato no confiable

3. Para cada dato, identifica la página donde aparece usando las coordenadas.

4. Responde ÚNICAMENTE con JSON válido en el siguiente formato:
{
  "data": { /* estructura PolicyExtractedData */ },
  "confidence": 0.89,
  "pageReferences": [
    {
      "field": "premium_total",
      "value": "15000.00",
      "page": 2,
      "box": { "x": 100, "y": 200, "width": 150, "height": 20 },
      "confidence": 0.95
    }
  ]
}
`;
  
  // 2. Llamar a OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4o', // Modelo más potente para análisis estructurado
    messages: [
      { role: 'system', content: 'Eres un asistente experto en análisis de pólizas de seguros.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 4000,
    temperature: 0.3, // Baja temperatura para mayor precisión
    response_format: { type: 'json_object' } // Forzar respuesta JSON
  });
  
  // 3. Parsear respuesta
  const resultText = response.choices[0]?.message?.content || '{}';
  const result = JSON.parse(resultText) as AnalysisOutput;
  
  // 4. Validar estructura con Zod
  const validated = PolicyAnalysisOutputSchema.parse(result);
  
  return validated;
}
```

### 6.4 Actualización de Estado Global (Zustand)

**Archivo**: `src/lib/ui/state.ts`

**Nuevos Estados**:
```typescript
interface UIState {
  // ... estados existentes ...
  
  // ✅ NUEVOS ESTADOS PARA ANÁLISIS DE PÓLIZAS
  policyAnalyses: PolicyAnalysis[];
  policyAnalysesLoading: boolean;
  policyAnalysesLoaded: boolean;
  selectedPolicyAnalysisId: string | null;
  selectedFieldName: string | null; // Para scroll automático
  
  // Acciones
  fetchPolicyAnalyses: (caseId: string) => Promise<void>;
  setPolicyAnalyses: (analyses: PolicyAnalysis[]) => void;
  setSelectedPolicyAnalysis: (id: string | null) => void;
  setSelectedField: (fieldName: string | null) => void;
  analyzePolicyArtifact: (artifactId: string) => Promise<PolicyAnalysis>;
}
```

**Implementación**:
```typescript
export const useUI = create<UIState>()(
  devtools((set, get) => ({
    // ... estados existentes ...
    
    policyAnalyses: [],
    policyAnalysesLoading: false,
    policyAnalysesLoaded: false,
    selectedPolicyAnalysisId: null,
    selectedFieldName: null,
    
    fetchPolicyAnalyses: async (caseId: string) => {
      const { policyAnalysesLoading } = get();
      if (policyAnalysesLoading) return;
      
      set({ policyAnalysesLoading: true });
      
      try {
        const response = await fetch(`/api/policies/analyses?caseId=${caseId}`);
        const data = await response.json();
        
        set({
          policyAnalyses: data.analyses,
          policyAnalysesLoaded: true,
          policyAnalysesLoading: false
        });
      } catch (error) {
        console.error('Error fetching policy analyses:', error);
        set({ policyAnalysesLoading: false });
        throw error;
      }
    },
    
    setPolicyAnalyses: (analyses) => {
      set({ policyAnalyses: analyses, policyAnalysesLoaded: true });
    },
    
    setSelectedPolicyAnalysis: (id) => {
      set({ selectedPolicyAnalysisId: id });
    },
    
    setSelectedField: (fieldName) => {
      set({ selectedFieldName: fieldName });
    },
    
    analyzePolicyArtifact: async (artifactId: string) => {
      try {
        const response = await fetch('/api/policies/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ artifactId, extractionMethod: 'hybrid' })
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Analysis failed');
        }
        
        // Añadir a la lista
        const { policyAnalyses } = get();
        set({ policyAnalyses: [...policyAnalyses, data.analysis] });
        
        return data.analysis;
      } catch (error) {
        console.error('Error analyzing policy:', error);
        throw error;
      }
    }
  }))
);
```

### 6.5 Integración con Chat

**Actualización de `/api/chat/process-message`**:

```typescript
// Añadir al procesamiento
export async function POST(request: NextRequest) {
  // ... autenticación y validación existente ...
  
  // ✅ NUEVO: Consultar análisis de pólizas además de artifacts
  const policyAnalyses = await prisma.policyAnalysis.findMany({
    where: {
      caseId: caseId,
      case: { orgId: currentOrg.id }
    },
    include: {
      artifact: true,
      pageReferences: true
    }
  });
  
  // ✅ NUEVO: Construir prompt enriquecido
  const enhancedPrompt = buildEnhancedPrompt({
    message: userMessage,
    brief,
    artifacts,
    policyAnalyses // ✅ Incluir datos estructurados
  });
  
  // Llamar a OpenAI con prompt mejorado
  const aiResponse = await analyzeWithReferences(enhancedPrompt);
  
  // ✅ NUEVO: Procesar respuesta para extraer referencias
  const processedResponse = processAIResponse(aiResponse, policyAnalyses);
  
  return NextResponse.json({
    response: processedResponse.text,
    references: processedResponse.references // ✅ Referencias a PDF
  });
}
```

**Función `buildEnhancedPrompt`**:
```typescript
function buildEnhancedPrompt({
  message,
  brief,
  artifacts,
  policyAnalyses
}: {
  message: string;
  brief: CaseBrief;
  artifacts: Artifact[];
  policyAnalyses: PolicyAnalysis[];
}): string {
  const policyDataSummary = policyAnalyses.map(analysis => {
    const data = analysis.extractedData as any;
    return `
Póliza: ${data.insurer?.name || 'N/A'} - ${data.policy_number || 'N/A'}
- Prima Total: ${formatMoney({ amountMinor: data.financials?.premium_total * 100, currency: data.currency })}
- Vigencia: ${data.effective_from} a ${data.effective_to}
- Coberturas principales: ${data.coverages?.map((c: any) => c.name).join(', ')}
- Deducible general: ${data.deductibles?.[0]?.amount || 'N/A'}
- Confianza del análisis: ${(analysis.overallConfidence * 100).toFixed(0)}%
`;
  }).join('\n\n');
  
  return `
Usuario: ${message}

Contexto del caso:
- Cliente: ${brief.clientName || 'N/A'}
- Tipo de negocio: ${brief.businessType || 'N/A'}
- Empleados: ${brief.employees || 'N/A'}
- Presupuesto máximo: ${brief.max_budget ? formatMoney({ amountMinor: brief.max_budget * 100, currency: brief.budget_currency || 'COP' }) : 'N/A'}

Datos estructurados de pólizas analizadas:
${policyDataSummary}

Documentos cargados:
${artifacts.map(a => `- ${a.fileName}`).join('\n')}

INSTRUCCIONES:
1. Responde la pregunta del usuario basándote en los datos estructurados primero
2. Si mencionas un dato específico (prima, deducible, cobertura), incluye una referencia en formato: [Ver en PDF](#ref:FIELD_NAME:pageN)
3. Sé preciso y menciona el nivel de confianza si es relevante
4. Si el dato no está disponible en los análisis, indícalo claramente

Responde en español.
`;
}
```

**Función `processAIResponse`**:
```typescript
function processAIResponse(
  aiResponse: string,
  policyAnalyses: PolicyAnalysis[]
): { text: string; references: Array<{ field: string; page: number; anchor: string }> } {
  const references: Array<{ field: string; page: number; anchor: string }> = [];
  
  // Regex para detectar referencias: [Ver en PDF](#ref:FIELD_NAME:pageN)
  const refRegex = /\[Ver en PDF\]\(#ref:([^:]+):page(\d+)\)/g;
  
  let match;
  while ((match = refRegex.exec(aiResponse)) !== null) {
    const fieldName = match[1];
    const pageNumber = parseInt(match[2], 10);
    
    references.push({
      field: fieldName,
      page: pageNumber,
      anchor: `#ref:${fieldName}:page${pageNumber}`
    });
  }
  
  return {
    text: aiResponse,
    references
  };
}
```

**Actualización de `ConversationPane.tsx`**:
```typescript
// Renderizar mensaje con referencias clicables
function MessageContent({ content, references }: { content: string; references?: Array<any> }) {
  // Convertir links markdown a botones clicables
  const parts = content.split(/(\[Ver en PDF\]\(#ref:[^)]+\))/g);
  
  return (
    <div>
      {parts.map((part, index) => {
        const refMatch = part.match(/\[Ver en PDF\]\(#ref:([^:]+):page(\d+)\)/);
        
        if (refMatch) {
          const fieldName = refMatch[1];
          const pageNumber = parseInt(refMatch[2], 10);
          
          return (
            <Button
              key={index}
              variant="link"
              size="sm"
              onClick={() => handleViewInPdf(fieldName, pageNumber)}
              className="inline-flex items-center"
            >
              <ExternalLinkIcon className="w-3 h-3 mr-1" />
              Ver en PDF (pág. {pageNumber})
            </Button>
          );
        }
        
        return <span key={index}>{part}</span>;
      })}
    </div>
  );
}

function handleViewInPdf(fieldName: string, pageNumber: number) {
  // 1. Cambiar al tab "analysis"
  useUI.getState().setStep('conversation'); // Asegurar que estamos en conversación
  
  // 2. En WorkspaceTabs, cambiar a tab "analysis"
  // (esto requiere prop drilling o evento global)
  
  // 3. Establecer campo seleccionado
  useUI.getState().setSelectedField(fieldName);
  
  // 4. El componente AnalysisTab escucha y hace scroll
}
```

---

## 7. PLAN DE IMPLEMENTACIÓN

### 7.1 Fases de Implementación

```
FASE 1: Preparación de Infraestructura (2-3 días)
  ├─ Crear migraciones de BD (policy_analyses, policy_page_references)
  ├─ Actualizar Prisma schema
  ├─ Generar cliente Prisma
  ├─ Tests de migraciones
  └─ Commit + PR

FASE 2: Mejora de Extracción de PDFs (2-3 días)
  ├─ Implementar extractWithCoordinates()
  ├─ Actualizar API /api/upload/pdf
  ├─ Tests de extracción con PDFs reales
  ├─ Validar metadata de coordenadas
  └─ Commit + PR

FASE 3: API de Análisis de Pólizas (3-4 días)
  ├─ Implementar /api/policies/analyze
  ├─ Implementar analyzeWithAI()
  ├─ Implementar buildEnhancedPrompt()
  ├─ Tests con PDFs de muestra
  ├─ Validación de confidence scores
  └─ Commit + PR

FASE 4: Estado Global y Transformaciones (2 días)
  ├─ Añadir estados a Zustand
  ├─ Implementar fetchPolicyAnalyses()
  ├─ Implementar analyzePolicyArtifact()
  ├─ Función analysisToView()
  ├─ Tests de estado
  └─ Commit + PR

FASE 5: Componente AnalysisTab (4-5 días)
  ├─ Crear estructura base del componente
  ├─ Implementar PdfViewer con react-pdf
  ├─ Implementar overlay de resaltados
  ├─ Implementar PdfMinimap
  ├─ Implementar FindingsList
  ├─ Implementar AnnotationsPanel
  ├─ Tests de UI
  └─ Commit + PR

FASE 6: Adaptación de Policies Component (2-3 días)
  ├─ Cambiar fuente de datos (mock → analyses)
  ├─ Añadir columna de referencias
  ├─ Añadir chips de confianza
  ├─ Implementar botón "Ver en PDF"
  ├─ Tests de regresión
  └─ Commit + PR

FASE 7: Integración con WorkspaceTabs (1-2 días)
  ├─ Añadir tab "analysis" a WorkspaceTabs
  ├─ Integrar AnalysisTab en flujo
  ├─ Tests de navegación entre tabs
  └─ Commit + PR

FASE 8: Integración con Chat (2-3 días)
  ├─ Actualizar /api/chat/process-message
  ├─ Implementar buildEnhancedPrompt()
  ├─ Implementar processAIResponse()
  ├─ Actualizar ConversationPane para referencias clicables
  ├─ Tests de integración chat ↔ PDF
  └─ Commit + PR

FASE 9: Testing y Refinamiento (3-4 días)
  ├─ Tests end-to-end completos
  ├─ Tests de regresión de funcionalidades existentes
  ├─ Performance testing (carga de PDFs grandes)
  ├─ UX/UI refinamiento
  ├─ Documentación de usuario
  └─ Commit + PR

FASE 10: Deploy y Monitoreo (1-2 días)
  ├─ Feature flag activación gradual
  ├─ Monitoreo de errores
  ├─ Feedback de usuarios
  └─ Ajustes finales
```

**TIEMPO TOTAL ESTIMADO**: 22-32 días (~4-6 semanas)

### 7.2 Orden de Implementación Detallado

#### FASE 1: Preparación de Infraestructura

**Día 1: Migraciones de BD**

```bash
# Crear archivo de migración
cd supabase/migrations
touch $(date +%Y%m%d)_add_policy_analyses_tables.sql
```

**Contenido de migración**:
```sql
-- Ver sección 6.1.1 para SQL completo
```

**Comandos**:
```bash
# Aplicar migración en development
supabase db push

# Generar tipos TypeScript
npx supabase gen types typescript --local > src/types/database.types.ts
```

**Día 2: Actualización de Prisma**

```bash
# Editar prisma/schema.prisma
# Añadir modelos PolicyAnalysis y PolicyPageReference

# Generar cliente
npx prisma generate

# Validar schema
npx prisma validate
```

**Día 3: Tests de migraciones**

```typescript
// tests/db/migrations.test.ts
describe('Policy Analysis Migrations', () => {
  it('should create policy_analyses table', async () => {
    // Test de existencia de tabla
  });
  
  it('should create policy_page_references table', async () => {
    // Test de existencia de tabla
  });
  
  it('should enforce RLS policies', async () => {
    // Test de políticas RLS
  });
});
```

#### FASE 2: Mejora de Extracción

**Día 4-5: Implementar extractWithCoordinates()**

```typescript
// src/lib/pdf/extraction.ts
// Ver sección 6.3.3 para implementación completa
```

**Tests**:
```typescript
// tests/lib/pdf/extraction.test.ts
describe('extractWithCoordinates', () => {
  it('should extract text with coordinates', async () => {
    const buffer = fs.readFileSync('test-fixtures/sample-policy.pdf');
    const result = await extractWithCoordinates(buffer);
    
    expect(result.text).toBeTruthy();
    expect(result.pages).toBeGreaterThan(0);
    expect(result.coordinates).toBeInstanceOf(Array);
    expect(result.coordinates[0]).toHaveProperty('x');
    expect(result.coordinates[0]).toHaveProperty('y');
  });
});
```

**Día 6: Actualizar API /api/upload/pdf**

```typescript
// Cambios mínimos en src/app/api/upload/pdf/route.ts

// ANTES:
const extracted = await extractTextFromPDF(buffer);

// DESPUÉS:
const extracted = await extractWithCoordinates(buffer);

// Guardar coordinates en provenance
provenance: {
  uploadedBy: user.id,
  uploadedAt: new Date().toISOString(),
  fileHash: fileHash,
  fileSize: file.size,
  pageCount: extracted.pages,
  coordinates: extracted.coordinates // ✅ NUEVO
}
```

#### FASE 3: API de Análisis

**Día 7-8: Implementar /api/policies/analyze**

```bash
# Crear archivo
mkdir -p src/app/api/policies/analyze
touch src/app/api/policies/analyze/route.ts
```

```typescript
// Ver sección 6.3.1 para implementación completa
```

**Día 9: Implementar analyzeWithAI()**

```bash
# Crear archivo
mkdir -p src/lib/openai
touch src/lib/openai/policyAnalysis.ts
```

```typescript
// Ver sección 6.3.4 para implementación completa
```

**Día 10: Tests con PDFs reales**

```typescript
// tests/api/policies/analyze.test.ts
describe('POST /api/policies/analyze', () => {
  it('should analyze a policy PDF', async () => {
    // Upload PDF
    const uploadRes = await fetch('/api/upload/pdf', { /* ... */ });
    const { artifact } = await uploadRes.json();
    
    // Analyze
    const analyzeRes = await fetch('/api/policies/analyze', {
      method: 'POST',
      body: JSON.stringify({ artifactId: artifact.id })
    });
    
    const { success, analysis } = await analyzeRes.json();
    
    expect(success).toBe(true);
    expect(analysis).toHaveProperty('extractedData');
    expect(analysis).toHaveProperty('overallConfidence');
    expect(analysis.pageReferences).toBeInstanceOf(Array);
  });
});
```

#### FASE 4: Estado Global

**Día 11-12: Actualizar Zustand**

```typescript
// src/lib/ui/state.ts
// Ver sección 6.4 para implementación completa
```

**Tests**:
```typescript
// tests/lib/ui/state.test.ts
describe('Policy Analysis State', () => {
  it('should fetch policy analyses', async () => {
    const { result } = renderHook(() => useUI());
    
    await act(async () => {
      await result.current.fetchPolicyAnalyses('case-id');
    });
    
    expect(result.current.policyAnalysesLoaded).toBe(true);
    expect(result.current.policyAnalyses).toBeInstanceOf(Array);
  });
  
  it('should set selected policy analysis', () => {
    const { result } = renderHook(() => useUI());
    
    act(() => {
      result.current.setSelectedPolicyAnalysis('analysis-id');
    });
    
    expect(result.current.selectedPolicyAnalysisId).toBe('analysis-id');
  });
});
```

#### FASE 5: Componente AnalysisTab

**Día 13: Estructura base**

```bash
# Crear archivos
mkdir -p src/components/Analysis
touch src/components/Analysis/AnalysisTab.tsx
touch src/components/Analysis/PdfViewer.tsx
touch src/components/Analysis/PdfMinimap.tsx
touch src/components/Analysis/FindingsList.tsx
touch src/components/Analysis/AnnotationsPanel.tsx
```

```typescript
// src/components/Analysis/AnalysisTab.tsx
"use client";

import React from 'react';
import { PdfViewer } from './PdfViewer';
import { PdfMinimap } from './PdfMinimap';
import { FindingsList } from './FindingsList';
import { AnnotationsPanel } from './AnnotationsPanel';
import { useUI } from '@/lib/ui/state';

export function AnalysisTab() {
  const selectedAnalysisId = useUI(s => s.selectedPolicyAnalysisId);
  const analyses = useUI(s => s.policyAnalyses);
  
  const selectedAnalysis = analyses.find(a => a.id === selectedAnalysisId);
  
  if (!selectedAnalysis) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">
          Selecciona una póliza para ver su análisis
        </p>
      </div>
    );
  }
  
  return (
    <div className="flex h-full">
      {/* Visor PDF */}
      <div className="flex-1 relative">
        <PdfViewer analysis={selectedAnalysis} />
        <PdfMinimap />
      </div>
      
      {/* Panel lateral */}
      <div className="w-80 border-l overflow-y-auto">
        <FindingsList analysis={selectedAnalysis} />
        <AnnotationsPanel analysisId={selectedAnalysis.id} />
      </div>
    </div>
  );
}
```

**Día 14-16: Implementar subcomponentes**

Cada subcomponente requiere implementación detallada. Ver estructura en sección 6.2.1.

**Día 17: Tests de UI**

```typescript
// tests/components/Analysis/AnalysisTab.test.tsx
describe('AnalysisTab', () => {
  it('should render PDF viewer', () => {
    render(<AnalysisTab />);
    expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument();
  });
  
  it('should highlight on finding click', async () => {
    render(<AnalysisTab />);
    
    const finding = screen.getByText('Prima Total');
    fireEvent.click(finding);
    
    await waitFor(() => {
      expect(screen.getByTestId('highlighted-area')).toBeInTheDocument();
    });
  });
});
```

#### FASE 6: Adaptación de Policies

**Día 18-19: Cambiar fuente de datos**

```typescript
// src/components/Workspace/Policies.tsx

// ANTES:
const rows = React.useMemo(() => selectPoliciesView(), [selectPoliciesView]);

// DESPUÉS:
const currentCaseId = useUI(s => s.currentCaseId);
const analyses = useUI(s => s.policyAnalyses);
const analysesLoading = useUI(s => s.policyAnalysesLoading);

React.useEffect(() => {
  if (currentCaseId) {
    void fetchPolicyAnalyses(currentCaseId);
  }
}, [currentCaseId]);

const rows = React.useMemo(() => {
  return analyses.map(analysis => ({
    id: analysis.id,
    plan: analysis.extractedData.insurer?.name || 'N/A',
    premium: analysis.extractedData.financials?.premium_total || 0,
    deductible: analysis.extractedData.deductibles?.[0]?.amount || 0,
    currency: analysis.extractedData.currency as CurrencyCode,
    riders: analysis.extractedData.coverages?.map(c => c.name) || [],
    confidence: analysis.overallConfidence,
    pageReference: analysis.pageReferences.find(ref => ref.fieldName === 'premium')?.pageNumber || 1
  }));
}, [analyses]);
```

**Día 20: Tests de regresión**

```typescript
// tests/components/Workspace/Policies.test.tsx
describe('Policies Component', () => {
  it('should render table with policy analyses', async () => {
    // Setup mock data
    const mockAnalyses = [/* ... */];
    useUI.setState({ policyAnalyses: mockAnalyses });
    
    render(<Policies />);
    
    await waitFor(() => {
      expect(screen.getByText('AXA Seguros')).toBeInTheDocument();
    });
  });
  
  it('should navigate to analysis tab on "Ver en PDF" click', async () => {
    render(<Policies />);
    
    const viewButton = screen.getByText('Ver en PDF');
    fireEvent.click(viewButton);
    
    await waitFor(() => {
      expect(useUI.getState().selectedPolicyAnalysisId).toBeTruthy();
    });
  });
});
```

#### FASE 7: Integración con WorkspaceTabs

**Día 21: Añadir tab "analysis"**

```typescript
// src/components/Workspace/Tabs.tsx

// Actualizar tipo
export type WorkspaceTab = 
  | "case-brief" 
  | "analysis" // ✅ NUEVO
  | "policies" 
  | "comparisons" 
  | "proposal" 
  | "compliance" 
  | "renewals";

// Actualizar labels
const tabLabels: Record<WorkspaceTab, string> = {
  "case-brief": t("caseBrief"),
  "analysis": t("analysis"), // ✅ NUEVO
  "policies": t("policies"),
  // ... resto
};

// Añadir TabsContent
<TabsContent value="analysis" className="py-6">
  <AnalysisTab />
</TabsContent>
```

**Día 22: Tests de navegación**

```typescript
// tests/components/Workspace/Tabs.test.tsx
describe('WorkspaceTabs', () => {
  it('should switch to analysis tab', () => {
    render(<WorkspaceTabs />);
    
    const analysisTab = screen.getByText('Análisis');
    fireEvent.click(analysisTab);
    
    expect(screen.getByTestId('analysis-tab')).toBeVisible();
  });
});
```

#### FASE 8: Integración con Chat

**Día 23-24: Actualizar API**

```typescript
// src/app/api/chat/process-message/route.ts
// Ver sección 6.5 para implementación completa
```

**Día 25: Actualizar ConversationPane**

```typescript
// src/components/Chat/ConversationPane.tsx
// Añadir renderizado de referencias clicables
// Ver sección 6.5 para implementación completa
```

#### FASE 9: Testing y Refinamiento

**Día 26-28: Tests end-to-end**

```typescript
// tests/e2e/policy-analysis-flow.spec.ts
describe('Policy Analysis Flow', () => {
  it('should complete full flow: upload → analyze → view → chat reference', async () => {
    // 1. Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 2. Navigate to case
    await page.goto('/workspace/cases/test-case-id');
    
    // 3. Upload PDF
    await page.setInputFiles('input[type="file"]', 'test-fixtures/sample-policy.pdf');
    await page.waitForSelector('.upload-success');
    
    // 4. Trigger analysis
    await page.click('button:has-text("Analizar")');
    await page.waitForSelector('.analysis-complete');
    
    // 5. View in Policies tab
    await page.click('button:has-text("Pólizas")');
    await page.waitForSelector('.policies-table');
    await page.click('button:has-text("Ver en PDF"):first');
    
    // 6. Verify navigation to Analysis tab
    await page.waitForSelector('.pdf-viewer');
    expect(await page.locator('.analysis-tab').isVisible()).toBe(true);
    
    // 7. Ask question in chat
    await page.click('button:has-text("Chat")');
    await page.fill('.chat-input', '¿Cuál es la prima?');
    await page.click('button:has-text("Enviar")');
    
    // 8. Wait for response with reference
    await page.waitForSelector('a:has-text("Ver en PDF")');
    
    // 9. Click reference
    await page.click('a:has-text("Ver en PDF"):first');
    
    // 10. Verify scroll to reference
    await page.waitForSelector('.highlighted-area');
    expect(await page.locator('.highlighted-area').isVisible()).toBe(true);
  });
});
```

**Día 29: Performance testing**

```typescript
// tests/performance/pdf-loading.test.ts
describe('PDF Loading Performance', () => {
  it('should load large PDF in < 5 seconds', async () => {
    const start = Date.now();
    
    // Upload 10MB PDF
    await uploadPDF('large-policy.pdf');
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });
  
  it('should handle concurrent analyses', async () => {
    // Upload 5 PDFs simultaneously
    const uploads = Array.from({ length: 5 }, () => uploadPDF('sample.pdf'));
    
    const results = await Promise.all(uploads);
    
    expect(results.every(r => r.success)).toBe(true);
  });
});
```

**Día 30: UX/UI refinamiento**

- Ajustes de estilos
- Animaciones smooth
- Feedback de loading
- Error handling UX
- Tooltips y hints

#### FASE 10: Deploy y Monitoreo

**Día 31: Feature flag y deploy**

```typescript
// src/config/features.ts
export const FEATURE_FLAGS = {
  POLICY_ANALYSIS: process.env.NEXT_PUBLIC_ENABLE_POLICY_ANALYSIS === 'true'
};

// Uso en componentes
if (FEATURE_FLAGS.POLICY_ANALYSIS) {
  // Mostrar nuevo tab
}
```

```bash
# Deploy staging
git push origin staging

# Verificar
curl https://staging.briki.app/api/health

# Activar feature flag
# Configurar en Vercel o .env
NEXT_PUBLIC_ENABLE_POLICY_ANALYSIS=true

# Deploy production
git push origin main
```

**Día 32: Monitoreo**

```typescript
// src/lib/monitoring/policyAnalysis.ts
export function trackPolicyAnalysis(event: 'started' | 'completed' | 'failed', data: any) {
  // Integración con servicio de analytics (Posthog, Mixpanel, etc.)
  analytics.track('policy_analysis', {
    event,
    ...data,
    timestamp: new Date().toISOString()
  });
}

// Uso en API
await trackPolicyAnalysis('started', { artifactId });
try {
  const result = await analyzeWithAI(input);
  await trackPolicyAnalysis('completed', { artifactId, confidence: result.confidence });
  return result;
} catch (error) {
  await trackPolicyAnalysis('failed', { artifactId, error: error.message });
  throw error;
}
```

---

## 8. CHECKLIST DE VERIFICACIÓN

### 8.1 Pre-Implementación

Antes de comenzar cualquier fase:

- [ ] Backup completo de base de datos
- [ ] Branch nuevo creado desde `main`
- [ ] Dependencies actualizadas (`pnpm install`)
- [ ] Tests actuales passing (`pnpm test`)
- [ ] Linter sin errores (`pnpm lint`)
- [ ] Variables de entorno configuradas
- [ ] Documentación leída y comprendida
- [ ] Equipo notificado del plan

### 8.2 Durante Implementación

Para cada fase completada:

- [ ] Código implementado según especificación
- [ ] Tests unitarios escritos y passing
- [ ] Tests de integración escritos y passing
- [ ] Linter sin errores
- [ ] TypeScript sin errores de tipo
- [ ] Documentación de código añadida (JSDoc)
- [ ] Comentarios explicativos en lógica compleja
- [ ] Error handling robusto implementado
- [ ] Logging apropiado añadido
- [ ] Performance verificado (no regressions)

### 8.3 Post-Implementación

Después de completar cada fase:

- [ ] PR creado con descripción detallada
- [ ] Tests automáticos (CI) passing
- [ ] Code review completado
- [ ] Feedback incorporado
- [ ] Merge a branch principal
- [ ] Deploy a staging
- [ ] Tests de regresión en staging
- [ ] Verificación de funcionalidad existente intacta
- [ ] Documentación de usuario actualizada
- [ ] Changelog actualizado

### 8.4 Verificación de Funcionalidades Existentes

Asegurar que NO se rompieron:

#### Flujo de Casos
- [ ] Crear caso manual desde `/workspace/cases`
- [ ] Crear caso desde chat (Landing)
- [ ] Ver lista de casos
- [ ] Ver detalle de caso
- [ ] Actualizar caso
- [ ] Eliminar caso
- [ ] Filtrar casos por estado
- [ ] Buscar casos

#### Flujo de Clientes
- [ ] Crear cliente
- [ ] Ver lista de clientes
- [ ] Ver detalle de cliente
- [ ] Actualizar cliente
- [ ] Eliminar cliente
- [ ] Datos PII siguen encriptados

#### Flujo de PDFs
- [ ] Subir PDF desde Workspace
- [ ] Subir PDF desde Landing
- [ ] Ver PDF en iframe
- [ ] Descargar PDF
- [ ] Extracción de texto funcional
- [ ] Deduplicación de PDFs funcional

#### Flujo de Chat
- [ ] Enviar mensaje
- [ ] Recibir respuesta del agente
- [ ] Ver mensajes históricos
- [ ] Encriptación de mensajes funcional
- [ ] Carga de caso histórico
- [ ] Navegación entre conversaciones

#### Flujo de Dashboard
- [ ] Ver estadísticas
- [ ] Gráficas renderizando
- [ ] Casos recientes visibles
- [ ] Clientes recientes visibles

#### Flujo de Autenticación
- [ ] Login
- [ ] Logout
- [ ] Registro
- [ ] Recuperación de contraseña
- [ ] RLS funcional
- [ ] Aislamiento de organizaciones funcional

### 8.5 Verificación de Nueva Funcionalidad

Verificar que SÍ funciona:

#### Análisis de Pólizas
- [ ] Subir PDF de póliza
- [ ] Trigger análisis automático/manual
- [ ] Ver progreso de análisis
- [ ] Ver análisis completado
- [ ] Confidence scores visibles y correctos
- [ ] Datos extraídos correctamente
- [ ] Referencias a páginas correctas

#### Tab "Análisis"
- [ ] Navegar al tab
- [ ] Visor PDF carga correctamente
- [ ] Resaltados visibles por tipo
- [ ] Mini mapa funcional
- [ ] Lista de hallazgos visible
- [ ] Click en hallazgo → scroll to
- [ ] Anotaciones funcionan
- [ ] Guardado de anotaciones

#### Tab "Pólizas"
- [ ] Tabla muestra datos de análisis
- [ ] Filtros funcionan
- [ ] Sorting funciona
- [ ] Pinning de columnas funciona
- [ ] Chips de confianza visibles
- [ ] Chips de página visibles
- [ ] Botón "Ver en PDF" funciona
- [ ] Navegación a tab "análisis" correcta

#### Chat con Referencias
- [ ] Preguntar sobre dato específico
- [ ] Respuesta incluye referencias
- [ ] Links "Ver en PDF" clicables
- [ ] Click → abre tab análisis
- [ ] Click → scroll to campo correcto
- [ ] Resaltado del campo visible

### 8.6 Verificación de Performance

- [ ] Carga de PDFs < 3 segundos (< 5MB)
- [ ] Análisis de póliza < 30 segundos
- [ ] Renderizado de tabla < 1 segundo
- [ ] Navegación entre tabs instantánea
- [ ] Scroll to anchor < 500ms
- [ ] Resaltado de campos < 200ms

### 8.7 Verificación de Seguridad

- [ ] RLS activo en nuevas tablas
- [ ] Solo se accede a datos de propia organización
- [ ] Inputs sanitizados
- [ ] Queries parametrizadas (no SQL injection)
- [ ] Rate limiting en APIs críticas
- [ ] Error messages no exponen datos sensibles
- [ ] Logs no contienen PII

### 8.8 Verificación de Escalabilidad

- [ ] 10 PDFs simultáneos → sin errores
- [ ] 100 pólizas en tabla → renderizado fluido
- [ ] 1000 mensajes en chat → carga paginada
- [ ] Múltiples usuarios concurrentes → sin conflictos

---

## RESUMEN FINAL

### Estado Actual
✅ **Arquitectura sólida**: Next.js 15 + Supabase + Prisma  
✅ **Flujos básicos funcionando**: Casos, Clientes, PDFs, Chat  
✅ **Estructura frontend preparada**: WorkspaceTabs, Policies component  
❌ **Falta**: Análisis estructurado de pólizas y visualización especializada

### Cambios Propuestos
1. **2 nuevas tablas**: `policy_analyses`, `policy_page_references`
2. **Mejora de extracción PDF**: Añadir coordenadas de texto
3. **Nueva API**: `/api/policies/analyze` con IA
4. **Nuevo componente**: `AnalysisTab` con visor PDF especializado
5. **Adaptación**: `Policies` component para usar datos reales
6. **Extensión**: Chat con referencias clicables a PDF

### Riesgos Principales
🔴 **Alto**: Cambio en fuente de datos de Policies (mock → DB)  
🔴 **Alto**: Actualización de estado global (Zustand)  
🟡 **Medio**: Performance de análisis con IA  
🟡 **Medio**: Compatibilidad con PDFs de diferentes formatos

### Mitigación
- Implementación gradual en fases pequeñas
- Tests exhaustivos antes y después
- Feature flags para activación controlada
- Rollback plan preparado
- Monitoring activo

### Tiempo Estimado
**22-32 días** (4-6 semanas) de desarrollo

### Siguiente Paso
**FASE 1**: Crear migraciones de base de datos y actualizar Prisma schema

---

**Fin del Documento**

**Autor**: Agente Asistente IA  
**Fecha**: 16 de Noviembre, 2025  
**Versión**: 1.0  
**Estado**: ✅ **COMPLETO Y LISTO PARA REVISIÓN**

