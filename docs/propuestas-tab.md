# 🔬 ANÁLISIS ARQUITECTÓNICO EXHAUSTIVO: Tab de Propuestas

**Fecha**: 1 de Diciembre, 2025  
**Analista**: Developer FullStack Senior  
**Objetivo**: Evaluar la implementación del Tab de Propuestas según especificaciones y plan de integración

---

## 1. ANÁLISIS DEL ESTADO ACTUAL

### 1.1 Componente Actual: [Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx)

**Datos "Muertos" Identificados** (Hardcodeados en State):

```typescript
// Estado actual en UIState:
proposalBrokerProfile: BrokerProfile;       // ✅ Existe
proposalSelectedPlans: ProposalSelectedPlan[]; // ✅ Existe  
proposalDisclosuresKeys: string[];          // ✅ Existe
proposalMathCheck: ProposalMathCheck;       // ✅ Existe
proposalShareUrl: string;                   // ✅ Existe
proposalGeneratedOn: string | null;         // ✅ Existe
```

**Tipo [ProposalSelectedPlan](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts#306-307) Actual**:
```typescript
interface ProposalSelectedPlan {
  planId: string;
  rationaleKey: string;
}
```

**Funcionalidad Actual del Tab**:
1. ✅ Muestra información del Brief (businessType, employees, coverage)
2. ✅ Muestra información del Broker (agency, phone, email)
3. ✅ Renderiza planes seleccionados con:
   - Nombre del plan
   - Score de comparación
   - Premium y Deductible
   - Riders
   - Benefits
   - Rationale (texto justificativo)
4. ✅ Genera resumen agregado (premium range, avg deductible, riders comunes)
5. ✅ Muestra disclosures (términos y condiciones)
6. ✅ Math check visual (badge de validación)
7. ✅ Share URL con botón copiar
8. ✅ Exportar a PDF (usando `window.print()`)

**Limitaciones Críticas**:
- ❌ **No hay persistencia** → Los datos solo viven en el estado global de Zustand
- ❌ **No hay generación dinámica** → No se puede "crear" una propuesta, solo visualizar datos precargados
- ❌ **No hay templates** → El layout es fijo
- ❌ **No hay versioning** → No hay "versión cliente" vs "versión técnica"
- ❌ **No hay referencias a PDF** → No se linka a las pólizas fuente
- ❌ **No hay integración con Comparaciones** → Los datos no fluyen automáticamente del tab de Comparaciones

---

## 2. ESPECIFICACIONES FUNCIONALES (De los Textos Provistos)

### 2.1 Funcionalidad Esperada del Tab "Propuesta"

Según el documento, el tab de Propuestas debe:

1. **Generación Automática desde Comparaciones**:
   - Insertar cuadro comparativo generado en el tab de Comparación
   - Referencias automáticas a páginas del PDF original en pie de página
   - Campos de supuestos y exclusiones a resaltar

2. **Templates y Versioning**:
   - Plantillas de propuesta con identidad del broker
   - Inserción automática de datos del cliente
   - **Versión para cliente**: Lenguaje claro, no técnico
   - **Versión para aseguradora**: Lenguaje técnico

3. **Edición y Personalización**:
   - Editor con slots dinámicos (Resumen, Cuadro comparativo, Notas del asesor, Advertencias)
   - Campo de notas personalizables

4. **Exportación y Compartir**:
   - Generar PDF
   - Generar versión Excel (con referencias)
   - Compartir enlace controlado

5. **Trazabilidad**:
   - Referencias en pie de página hacia páginas del PDF original
   - Historial de versiones

---

## 3. GAP ANALYSIS: Actual vs Esperado

| Funcionalidad | Estado Actual | Estado Esperado | Gap |
|---|---|---|---|
| **Persistencia** | ❌ Solo en memoria (Zustand) | ✅ Base de datos con historial | ⚠️ **CRÍTICO** |
| **Generación Dinámica** | ❌ No existe | ✅ Generación desde Comparación + IA | ⚠️ **CRÍTICO** |
| **Templates** | ❌ Layout fijo | ✅ Plantillas personalizables | ⚠️ **ALTO** |
| **Versioning** | ❌ No existe | ✅ Cliente vs Técnica | ⚠️ **ALTO** |
| **Referencias PDF** | ❌ No existe | ✅ Deep links a páginas exactas | ⚠️ **MEDIO** |
| **Integración Comparación** | ❌ Desconectado | ✅ Flujo automático | ⚠️ **CRÍTICO** |
| **Exportación** | ✅ PDF básico (print) | ✅ PDF + Excel + JSON | ⚠️ **MEDIO** |
| **Broker Profile** | ✅ Renderiza | ✅ Renderiza + Editable | ⚠️ **BAJO** |
| **Math Check** | ✅ Visual básico | ✅ Validación real | ⚠️ **MEDIO** |
| **Share URL** | ✅ Copia clipboard | ✅ Con permisos controlados | ⚠️ **BAJO** |

---

## 4. ARQUITECTURA PROPUESTA

### 4.1 Modelo de Datos

**Nueva interfaz `GeneratedProposal`** (extiende [Proposal](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx#24-424) existente):

```typescript
interface GeneratedProposal {
  id: string;
  caseId: string;
  comparisonId: string;  // ← Vinculado a Comparación
  
  // Metadata
  version: 'client' | 'technical';
  generatedAt: string;
  generatedBy: string;  // userId
  
  // Content Sections
  brokerProfile: BrokerProfile;
  selectedPlans: ProposalSelectedPlan[];  // Reutilizar tipo existente
  disclosures: string[];
  customNotes?: string;  // Notas del asesor
  
  // Referencias
  pdfReferences: Array<{
    policyId: string;
    page: number;
    coords: { x: number; y: number; width: number; height: number };
  }>;
  
  // Export
  shareUrl: string;
  expiresAt?: string;
}
```

**Nueva tabla en Prisma** (`generated_proposals`):
```prisma
model GeneratedProposal {
  id            String   @id @default(uuid())
  caseId        String
  comparisonId  String
  version       String   // 'client' | 'technical'
  content       Json     // GeneratedProposal serializado
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  userId        String
  orgId         String
  
  case Case @relation(fields: [caseId], references: [id])
  @@index([caseId, createdAt])
  @@index([orgId])
}
```

### 4.2 Flujo de Trabajo

```
1. Usuario genera Comparación (Tab Comparación) 
   → Guardada en tabla `comparisons`

2. Usuario hace clic en "Generar Propuesta" (en Tab Comparación)
   → `POST /api/proposals/generate`
      - Parámetros: caseId, comparisonId, version ('client' | 'technical')
      - Backend:
        a. Lee la Comparación de la BD
        b. Lee los análisis de pólizas vinculados
        c. Genera estructura de propuesta
        d. Llama a OpenAI para generar notas en lenguaje apropiado
        e. Persiste en tabla `generated_proposals`
      - Retorna: GeneratedProposal

3. Frontend actualiza estado global
   → `setActiveProposal(proposal)`
   → Navega automáticamente al Tab de Propuestas

4. Tab de Propuestas renderiza desde `activeProposal`
   → Botones de Exportar, Compartir, Editar Notas

5. Usuario puede:
   a. Exportar a PDF/Excel
   b. Generar versión alternativa (cliente ↔ técnica)
   c. Compartir con enlace temporal
```

### 4.3 Endpoints Necesarios

| Endpoint | Método | Responsabilidad |
|---|---|---|
| `/api/proposals/generate` | POST | Generar propuesta desde comparación |
| `/api/proposals/:id` | GET | Obtener propuesta guardada |
| `/api/proposals/:id` | PATCH | Actualizar notas personalizadas |
| `/api/proposals/:id/export` | POST | Exportar a PDF/Excel |
| `/api/proposals/:id/share` | POST | Generar enlace compartible con TTL |

---

## 5. REUTILIZACIÓN DE CÓDIGO EXISTENTE

### 5.1 Componentes a Reutilizar

1. **[Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx) (actual)**:
   - ✅ Layout de cards es excelente
   - ✅ Funciones [formatMoneyRange](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx#440-477), [formatMoneyAverage](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx#478-498) → Mover a [lib/format.ts](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/format.ts)
   - ✅ Componente [SummaryTile](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx#508-516) → Reutilizable
   - **Refactorización necesaria**: Separar lógica de renderizado de lógica de datos

2. **[ComparisonTable.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Comparison/ComparisonTable.tsx)**:
   - ✅ Puede ser embebido en la propuesta
   - **Adaptación**: Modo "readonly" sin filtros

3. **[state.ts](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/ui/state.ts)**:
   - ✅ Mantener `proposalBrokerProfile`, `proposalSelectedPlans`, etc.
   - **Añadir**: `activeProposal: GeneratedProposal | null`
   - **Añadir**: `generateProposal(caseId, comparisonId, version)`

### 5.2 Tipos a Extender

- ✅ [ProposalSelectedPlan](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts#306-307) → Ya existe, mantener
- ✅ [BrokerProfile](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts#316-317) → Ya existe, mantener
- ❌ `GeneratedProposal` → **NUEVO**
- ❌ `ProposalExportFormat` → **NUEVO** (`'pdf' | 'excel' | 'json'`)

---

## 6. IMPACTO EN EL CÓDIGO EXISTENTE

### 6.1 Archivos a Modificar

| Archivo | Cambios | Riesgo de Rotura |
|---|---|---|
| [src/lib/types.ts](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts) | Añadir `GeneratedProposal`, `ProposalExportFormat` | ⚠️ **BAJO** (Solo añadir, no modificar) |
| [prisma/schema.prisma](file:///home/liones_messi/Documentos/trabajo/Briki/prisma/schema.prisma) | Añadir modelo `GeneratedProposal` | ⚠️ **BAJO** (Nueva tabla, no afecta existentes) |
| [src/lib/ui/state.ts](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/ui/state.ts) | Añadir `activeProposal`, `generateProposal()` | ⚠️ **BAJO** (Solo añadir, no modificar existentes) |
| [src/components/Workspace/Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx) | Refactorizar para leer `activeProposal` en lugar de state disperso | ⚠️ **MEDIO** (Cambio estructural, pero sin cambiar API pública) |
| [src/components/Workspace/Comparison.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Comparison.tsx) | Añadir botón "Generar Propuesta" | ⚠️ **BAJO** (Solo añadir componente) |

### 6.2 Preservación de Funcionalidad

Para NO romper el código existente:

1. **Backward Compatibility**:
   - Mantener `proposalSelectedPlans`, `proposalBrokerProfile`, etc. en el state global
   - El componente [Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx) puede leer de `activeProposal` SI existe, o fallback a los campos existentes

2. **Migración Gradual**:
   - Fase 1: Añadir `activeProposal` al state sin eliminar campos viejos
   - Fase 2: Refactorizar [Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx) para usar ambos
   - Fase 3: Deprecar campos viejos (solo si ya no se usan)

3. **Testing**:
   - Mantener test de que el componente renderiza correctamente con datos mock
   - Añadir tests para el nuevo flujo

---

## 7. PLAN DE CORRECCIÓN (5 Fases)

### **Fase 1: Preparación de la Arquitectura** (Sin Código)
**Objetivo**: Definir contratos y tipos sin romper nada.

1. ✅ Crear `analisis_propuestas_tab.md` (este documento)
2. ✅ Actualizar [task.md](file:///home/liones_messi/.gemini/antigravity/brain/6859348c-b159-4bca-ac10-b6044eb3145c/task.md) con fases detalladas
3. ✅ Crear `implementation_plan_propuestas.md`

---

### **Fase 2: Modelo de Datos y Backend**
**Objetivo**: Crear persistencia y endpoints.

**Archivos a Modificar**:
- [prisma/schema.prisma](file:///home/liones_messi/Documentos/trabajo/Briki/prisma/schema.prisma) → Añadir modelo `GeneratedProposal`
- [src/lib/types.ts](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts) → Añadir interfaces `GeneratedProposal`, `ProposalExportFormat`
- `src/app/api/proposals/generate/route.ts` → **NUEVO** endpoint POST
- `src/app/api/proposals/[id]/route.ts` → **NUEVO** endpoint GET/PATCH
- `src/app/api/proposals/[id]/export/route.ts` → **NUEVO** endpoint POST

**Validaciones Rigurosas**:
- ✅ Crear migración SQL y aplicarla
- ✅ Verificar que no rompe tablas existentes (`npm run build` debe pasar)
- ✅ Crear función `generateProposal` en backend con prompts OpenAI
- ✅ Implementar RLS en la nueva tabla (por `orgId`)

**Riesgo**: ⚠️ **BAJO** (No afecta funcionalidad existente, solo añade)

---

### **Fase 3: Integración en State**
**Objetivo**: Añadir nuevo estado global sin romper existente.

**Archivos a Modificar**:
- [src/lib/ui/state.ts](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/ui/state.ts):
  - Añadir `activeProposal: GeneratedProposal | null`
  - Añadir `generateProposal(caseId, comparisonId, version)`
  - Añadir `loadActiveProposal(proposalId)`
  - **Mantener** `proposalBrokerProfile`, etc. (backward compatibility)

**Validaciones Rigurosas**:
- ✅ Verificar que `npm run build` pasa
- ✅ Verificar que el componente [Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx) sigue funcionando (sin usar nuevo estado aún)
- ✅ Añadir tests unitarios para `generateProposal`

**Riesgo**: ⚠️ **BAJO** (Solo añadir, no modificar)

---

### **Fase 4: Refactorización de [Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx)**
**Objetivo**: Adaptar componente para usar `activeProposal` con fallback a datos viejos.

**Archivos a Modificar**:
- [src/components/Workspace/Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx):
  - Añadir lógica: `const proposal = activeProposal || fallbackToOldState()`
  - Renderizar desde `proposal`
  - Mantener toda la UI existente INTACTA

**Validaciones Rigurosas**:
- ✅ Verificar que el componente renderiza correctamente con:
  a. `activeProposal` poblado
  b. `activeProposal` null (fallback a estado viejo)
- ✅ Verificar que `window.print()` sigue funcionando
- ✅ Verificar que el share URL se copia correctamente

**Riesgo**: ⚠️ **MEDIO** (Cambio estructural, requiere testing exhaustivo)

---

### **Fase 5: Integración con Tab de Comparaciones**
**Objetivo**: Añadir botón "Generar Propuesta" en Comparaciones.

**Archivos a Modificar**:
- [src/components/Workspace/Comparison.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Comparison.tsx):
  - Añadir botón "Generar Propuesta" (visible solo si `activeComparison` existe)
  - Botón llama a `generateProposal(currentCaseId, activeComparison.id, 'client')`
  - Mostrar toast "Generando propuesta..." → Navegar al Tab de Propuestas

**Validaciones Rigurosas**:
- ✅ Verificar que el botón aparece solo cuando hay comparación activa
- ✅ Verificar que al hacer clic se genera la propuesta y se navega
- ✅ Verificar que el Tab de Propuestas muestra la propuesta generada

**Riesgo**: ⚠️ **BAJO** (Solo añadir botón y acción)

---

## 8. CONSIDERACIONES CRÍTICAS

### 8.1 Principios Arquitectónicos Preservados

✅ **Reutilización Máxima**:
- Mantener [Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx) actual con adaptaciones mínimas
- Reutilizar tipos existentes ([ProposalSelectedPlan](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts#306-307), [BrokerProfile](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts#316-317))
- Reutilizar funciones de formato ([formatMoney](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx#440-477), `formatDate`)

✅ **Arquitectura Dual**:
- Backend: Generar propuestas con IA, persistir, validar
- Frontend: Renderizar, interactuar, exportar cliente-side (print)

✅ **Estado Unidireccional**:
- Flujo claro: `Backend (BD)` → `State (Zustand)` → `UI (Proposal.tsx)`
- No mutación directa del estado desde componentes

✅ **Separación de Responsabilidades**:
- [types.ts](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts): Solo tipos
- [state.ts](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/ui/state.ts): Solo lógica de estado y acciones
- [Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx): Solo renderizado
- `/api/proposals/*`: Solo lógica de negocio

### 8.2 Puntos de Atención Especiales

⚠️ **Compatibilidad con Comparaciones**:
- El `comparisonId` debe ser válido y existir en la BD
- Validar que la comparación pertenece al mismo caso

⚠️ **RLS (Row Level Security)**:
- La nueva tabla `generated_proposals` debe tener políticas RLS por `orgId`
- Verificar que solo usuarios de la misma org pueden acceder

⚠️ **Performance**:
- La generación con OpenAI puede tardar 3-5 segundos
- Mostrar loading state apropiado
- Considerar queue para generaciones pesadas

⚠️ **Limpieza de Datos**:
- La transformación [(premium as unknown as number) * 100](file:///home/liones_messi/Documentos/trabajo/Briki/src/app/api/comparisons/route.ts#8-84) en [Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx) línea 96 es un **CODE SMELL**
- Esto indica que los datos de [Policy](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts#296-297) no están correctamente tipados
- **Solución**: Asegurar que `Policy.premium` es siempre de tipo [Money](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts#37-43) desde la BD

---

## 9. RESUMEN EJECUTIVO

### Estado Actual
El Tab de Propuestas es un **frontend muerto** con datos hardcodeados en el estado global. Renderiza correctamente pero no tiene persistencia ni generación dinámica.

### Propuesta de Solución
Implementar **generación automática de propuestas** desde el Tab de Comparaciones, con persistencia en BD, versionado (cliente vs técnica), y exportación a PDF/Excel. Reutilizar al máximo el código existente.

### Plan de Acción
5 fases incrementales, cada una con validaciones rigurosas para NO romper funcionalidades. Enfoque en backward compatibility y separación de responsabilidades.

### Riesgo Global
⚠️ **MEDIO-BAJO** → Con testing adecuado y enfoque incremental, el riesgo de rotura es mínimo.

### Tiempo Estimado
- Fase 1: 30 min (ya completado)
- Fase 2: 3-4 horas (Backend + Migraciones)
- Fase 3: 1-2 horas (State)
- Fase 4: 2-3 horas (Refactorización componente)
- Fase 5: 1 hora (Integración)
**Total**: ~8-11 horas de desarrollo + testing

---

**Recomendación**: Proceder con la implementación siguiendo estrictamente el plan de 5 fases. Cada fase debe completarse y verificarse antes de pasar a la siguiente.

# ⚡ Segunda Evaluación Breve: Tab de Propuestas

**Fecha**: 1 de Diciembre, 2025
**Enfoque**: Alineación con Principios y Roles

## 1. Alineación con Principios del Proyecto

| Principio | Evaluación | Veredicto |
|---|---|---|
| **Reutilización Máxima** | Se conserva el 90% de [Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx) y se reutiliza [ComparisonTable](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Comparison/ComparisonTable.tsx#12-87). No se reescribe, se adapta. | ✅ **Excelente** |
| **Arquitectura Dual** | La lógica pesada (generación con IA, persistencia) se mueve al Backend. El Frontend solo renderiza. | ✅ **Correcto** |
| **Estado Unidireccional** | Flujo estricto: `BD` → `API` → `Zustand` → [UI](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts#130-140). Se eliminan los datos "muertos" hardcodeados. | ✅ **Robusto** |
| **Separación de Responsabilidades** | [types.ts](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts) (Definición), [state.ts](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/ui/state.ts) (Gestión), [Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx) (Vista), `API` (Negocio). | ✅ **Claro** |

## 2. Evaluación de Riesgos y Roles

- **Rol Senior**: El plan prioriza la estabilidad ("no romper nada") mediante una estrategia incremental.
- **Riesgo**: La refactorización de [Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx) es el punto delicado.
- **Mitigación**: El plan incluye fallback a los datos antiguos durante la transición, asegurando que la app nunca deje de funcionar.

## 3. Conclusión

La estrategia propuesta es **técnicamente sólida y arquitectónicamente coherente**. Cumple con los requisitos de negocio (persistencia, generación dinámica) sin sacrificar la calidad del código.

**Decisión**: APROBADO. Proceder con Fase 1 inmediatamente.


- [ ] **Phase 31: Proposals Tab Implementation** `[ ]`
  - [x] **31.1: Backend & Persistence**
    - [x] Create [GeneratedProposal](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts#331-356) model in [schema.prisma](file:///home/liones_messi/Documentos/trabajo/Briki/prisma/schema.prisma)
    - [x] Create migration and apply to DB
    - [x] Implement `POST /api/proposals/generate` endpoint
    - [x] Implement `GET /api/proposals/[id]` endpoint
  - [x] **31.2: State Management**
    - [x] Update [types.ts](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts) with [GeneratedProposal](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/types.ts#331-356) interface
    - [x] Update [state.ts](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/ui/state.ts) with `activeProposal` and [generateProposal](file:///home/liones_messi/Documentos/trabajo/Briki/src/lib/ui/state.ts#1700-1739) action
  - [x] **31.3: Frontend Refactor**
    - [x] Refactor [Proposal.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Proposal.tsx) to support dynamic data
    - [x] Implement fallback to legacy data for backward compatibility
  - [ ] **31.4: Integration**
    - [ ] Add "Generate Proposal" button in [Comparison.tsx](file:///home/liones_messi/Documentos/trabajo/Briki/src/components/Workspace/Comparison.tsx)
    - [ ] Connect flow: Comparison -> Generate -> Proposal Tab
  - [ ] **31.5: Verification**
    - [ ] Verify persistence and reloading
    - [ ] Verify export functionality

- [ ] **Phase 18: Final Verification** `[ ]`
  - [ ] Test connection stability
  - [ ] Test policy interaction without disconnection
  - [ ] Verify no crashes with invalid data
  - [ ] Verify references appear in first analysis
  - [ ] Verify references appear in comparison analysis
  - [ ] Verify PDF navigation works correctly<!-- id: 15 -->
```