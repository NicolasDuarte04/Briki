# PLAN EXHAUSTIVO: CORRECCIÓN DE FORMULARIO Y BOTONES EN CASOS HISTÓRICOS

**Fecha**: 29 de Enero, 2025  
**Rol**: Ingeniero FullStack Senior  
**Objetivo**: Corregir problemas de UI después de crear casos y al cargar casos históricos

---

## 📋 RESUMEN EJECUTIVO

Se identificaron 3 problemas críticos después de implementar `router.push()`:

1. **Botones de aprobar siguen apareciendo** después de crear un caso (incorrecto, rompe el programa)
2. **Formulario aparece abierto** en lugar de resumen con botón "Editar" para casos históricos
3. **Información incompleta** al cargar casos históricos desde BD

---

## 🔍 ANÁLISIS EXHAUSTIVO DEL ESTADO ACTUAL

### **1. FLUJO DE ESTADOS DEL CASO**

#### **Estado en Base de Datos (`prisma/schema.prisma`)**:
- `status`: `'draft'` (recién creado) o `'active'` (aprobado)
- `stage`: `'initial'` (inicial) o `'sourcing'` (aprobado)

#### **Estado en Zustand (`src/lib/ui/state.ts`)**:
- `caseApproved`: `boolean` (true después de llamar `approveCurrentCase`)
- `currentCaseId`: `string | null` (ID del caso activo)
- `brief`: `CaseBrief` (datos del formulario)

#### **Estado en Componentes**:
- `activeCaseData` (`WorkspaceTabs.tsx`): Datos completos del caso desde BD (incluye `status`)

---

### **2. PROBLEMA 1: BOTONES DE APROBAR DESPUÉS DE CREAR CASO**

#### **Análisis del Flujo Actual**:
```
1. Usuario completa formulario → hace clic "Buscar Planes"
2. createCaseIfNeeded() crea caso con status='draft'
3. router.push() navega a /agent/[caseId] (mantiene estado)
4. currentCaseId existe, caseApproved=false
5. isEditing = !!currentCaseId && !caseApproved = true
6. BriefForm se renderiza con botones de aprobar (INCORRECTO)
```

#### **Problema**:
- Después de crear el caso, `isEditing = true` muestra formulario con botones de aprobar
- El usuario NO debe ver botones de aprobar después de crear (ya creó, debe ver conversación)
- Estos botones pueden romper el programa si se presionan

#### **Detección de Caso Recién Creado**:
- Podemos usar `window.lastCaseCreation` timestamp
- O verificar si `activeCaseData` no existe todavía (caso recién creado no tiene datos cargados)

---

### **3. PROBLEMA 2: FORMULARIO ABIERTO EN CASOS HISTÓRICOS**

#### **Análisis del Flujo Actual**:
```
1. Usuario carga caso histórico desde sidebar
2. activeCaseData se carga con status='active'
3. caseApproved en Zustand es false (inicial)
4. Tabs.tsx línea 133: caseApproved ? CaseSummary : CaseBriefForm
5. Muestra CaseBriefForm (INCORRECTO, debería mostrar CaseSummary)
```

#### **Problema**:
- `caseApproved` en Zustand no se sincroniza con `status` del caso en BD
- Para casos históricos con `status='active'`, debería mostrar `CaseSummary` con botón "Editar"

#### **Solución**:
- Verificar `activeCaseData.status === 'active'` en lugar de solo `caseApproved`
- Si `activeCaseData.status === 'active'`, mostrar `CaseSummary`
- Solo mostrar formulario si el usuario explícitamente hace clic en "Editar"

---

### **4. PROBLEMA 3: INFORMACIÓN INCOMPLETA EN CASOS HISTÓRICOS**

#### **Análisis del Carga de Datos**:
```
1. API /api/cases/[id] retorna:
   - status, stage, clientName, businessType, employees
   - insurance_category, max_budget, budget_currency
   - required_coverages, client_profile
   - briefData: JSON con freeText, coverage, etc.
   - artifacts: Array de PDFs
2. WorkspaceTabs carga activeCaseData
3. Se pasa como initialData a CaseBriefForm
4. CaseBriefForm sincroniza con brief (pero puede perder campos)
```

#### **Problema**:
- Algunos campos no se mapean correctamente desde `activeCaseData` a `brief`
- Campos del briefData (JSON) no siempre se cargan
- `tempUploads` no se sincroniza con `artifacts`

---

## 🔧 PLAN DETALLADO DE IMPLEMENTACIÓN

### **CRITERIOS FUNDAMENTALES**

1. **EXHAUSTIVO**: Análisis exhaustivo antes de cambiar
2. **RIGUROSO**: Verificar todas las dependencias
3. **PRECAUCIÓN**: No romper funcionalidades existentes
4. **REUTILIZACIÓN**: Aprovechar código existente
5. **ESTADO UNIDIRECCIONAL**: Flujo claro de datos

---

### **FASE 1: DETECTAR Y OCULTAR BOTONES DESPUÉS DE CREAR CASO**

#### **Objetivo**: Ocultar botones de aprobar inmediatamente después de crear un caso

#### **Archivos a Modificar**:

**1. `src/components/Workspace/CaseBriefForm.tsx`**
- **Línea 91**: Modificar lógica de `isEditing`
- **Riesgo**: MEDIO (afecta renderizado)
- **Precaución**: Asegurar que casos históricos no se rompan

#### **Análisis de Dependencias**:
- `isEditing` determina si mostrar botón "Editar" en header
- `isEditing` determina `mode` prop de `BriefForm` ('edit' vs 'create')
- `mode='edit'` en `BriefForm` muestra botones de aprobar (línea 671-679)

#### **Estrategia de Detección**:
```typescript
// Opción 1: Usar timestamp (más simple)
const isCaseJustCreated = (window as any).lastCaseCreation && 
  Date.now() - (window as any).lastCaseCreation < 2000; // 2 segundos

// Opción 2: Verificar si activeCaseData no existe (más robusto)
const hasCaseData = !!activeCaseData && activeCaseData.id === currentCaseId;
const isCaseJustCreated = !hasCaseData && !!currentCaseId;

// Usar Opción 2 para mayor robustez
```

#### **Implementación**:
```typescript
// src/components/Workspace/CaseBriefForm.tsx

// Agregar import
import { useUI } from '@/lib/ui/state';
const { activeCaseData } = useUI(); // Si no existe, agregar al selector

// Modificar isEditing (línea 91)
const isEditing = useMemo(() => {
  if (!currentCaseId) return false;
  
  // Si hay datos del caso en BD, verificar status
  if (activeCaseData && activeCaseData.id === currentCaseId) {
    // Caso histórico: solo editar si status es 'active' Y caseApproved es false
    return activeCaseData.status === 'active' && !caseApproved;
  }
  
  // Caso recién creado: NO mostrar botones de aprobar (solo después de aprobar)
  // Si no hay activeCaseData todavía, es caso recién creado → no editar todavía
  return false;
}, [currentCaseId, activeCaseData, caseApproved]);
```

#### **Test**:
- ✅ Crear caso → no ver botones de aprobar
- ✅ Navegar a caso histórico → ver resumen con botón "Editar"
- ✅ Hacer clic "Editar" → ver formulario editable

---

### **FASE 2: MOSTRAR RESUMEN PARA CASOS HISTÓRICOS**

#### **Objetivo**: Mostrar `CaseSummary` para casos con `status='active'` en BD

#### **Archivos a Modificar**:

**1. `src/components/Workspace/Tabs.tsx`**
- **Línea 133**: Modificar lógica de renderizado
- **Riesgo**: MEDIO (afecta renderizado principal)
- **Precaución**: Asegurar que casos nuevos no se rompan

#### **Análisis de Dependencias**:
- `caseApproved` viene de Zustand (línea 26)
- `activeCaseData` viene de estado local (línea 27)
- `activeCaseData.status` indica si caso está aprobado en BD

#### **Estrategia**:
```typescript
// Determinar si mostrar resumen o formulario
const shouldShowSummary = useMemo(() => {
  // Si caseApproved es true, siempre mostrar resumen
  if (caseApproved) return true;
  
  // Si activeCaseData existe y status es 'active', mostrar resumen
  if (activeCaseData && activeCaseData.status === 'active') return true;
  
  // Caso contrario: mostrar formulario
  return false;
}, [caseApproved, activeCaseData]);
```

#### **Implementación**:
```typescript
// src/components/Workspace/Tabs.tsx

// Agregar useMemo para determinar qué mostrar
const shouldShowSummary = useMemo(() => {
  if (caseApproved) return true;
  
  // Verificar si caso está aprobado en BD
  if (activeCaseData && activeCaseData.status === 'active') {
    // Sincronizar caseApproved con status de BD
    if (!caseApproved) {
      setCaseApproved(true);
    }
    return true;
  }
  
  return false;
}, [caseApproved, activeCaseData, setCaseApproved]);

// Modificar renderizado (línea 132-137)
<TabsContent value="case-brief" className="py-6 h-full">
  {shouldShowSummary ? (
    <CaseSummary brief={brief} onEdit={handleEditBrief} />
  ) : (
    <CaseBriefForm initialData={activeCaseData?.briefData || brief} />
  )}
</TabsContent>
```

#### **Test**:
- ✅ Cargar caso histórico → ver `CaseSummary`
- ✅ Hacer clic "Editar" → ver formulario editable
- ✅ Caso nuevo → ver formulario (no resumen)

---

### **FASE 3: CARGAR TODA LA INFORMACIÓN EN CASOS HISTÓRICOS**

#### **Objetivo**: Asegurar que todos los campos se cargan correctamente desde BD

#### **Archivos a Modificar**:

**1. `src/components/Workspace/CaseBriefForm.tsx`**
- **Líneas 110-120**: Mejorar sincronización de `initialData`
- **Riesgo**: BAJO (solo sincronización de datos)

**2. `src/components/Workspace/Tabs.tsx`**
- **Líneas 40-100**: Asegurar que `activeCaseData.briefData` incluye todos los campos
- **Riesgo**: BAJO (ya existe la carga)

#### **Análisis de Mapeo**:
```typescript
// activeCaseData viene de BD con:
{
  id: string;
  status: 'draft' | 'active';
  clientName: string;
  businessType: string;
  employees: number;
  insurance_category: string;
  max_budget: Decimal;
  budget_currency: string;
  required_coverages: string[];
  client_profile: string;
  briefData: JSON; // { freeText, coverage, ... }
  artifacts: Array; // PDFs
}

// Necesitamos mapear a brief:
{
  clientName: activeCaseData.clientName,
  businessType: activeCaseData.businessType,
  employees: activeCaseData.employees,
  insurance_category: activeCaseData.insurance_category,
  max_budget: Number(activeCaseData.max_budget),
  budget_currency: activeCaseData.budget_currency,
  required_coverages: activeCaseData.required_coverages,
  client_profile: activeCaseData.client_profile,
  freeText: activeCaseData.briefData?.freeText,
  coverage: activeCaseData.briefData?.coverage,
  // artifacts → tempUploads (si es necesario)
}
```

#### **Implementación**:
```typescript
// src/components/Workspace/CaseBriefForm.tsx

// Mejorar sincronización (línea 110-120)
useEffect(() => {
  if (!initialData || !currentCaseId) return;
  
  // Mapear todos los campos desde activeCaseData
  const mappedBrief: Partial<CaseBrief> = {
    clientName: initialData.clientName || '',
    businessType: initialData.businessType || '',
    employees: initialData.employees ?? undefined,
    insurance_category: initialData.insurance_category || '',
    max_budget: initialData.max_budget ? Number(initialData.max_budget) : undefined,
    budget_currency: initialData.budget_currency || 'COP',
    required_coverages: initialData.required_coverages || [],
    client_profile: initialData.client_profile || '',
    freeText: initialData.briefData?.freeText || '',
    coverage: initialData.briefData?.coverage || '',
    // NO incluir tempUploads para casos históricos (vienen de artifacts)
  };
  
  // Actualizar brief solo si es diferente
  const currentBrief = useUI.getState().brief;
  if (JSON.stringify(mappedBrief) !== JSON.stringify(currentBrief)) {
    setBrief(mappedBrief);
    console.log('✅ [CaseBriefForm] Brief sincronizado desde activeCaseData:', mappedBrief);
  }
}, [initialData, currentCaseId, setBrief]);
```

#### **Test**:
- ✅ Cargar caso histórico → ver todos los campos en `CaseSummary`
- ✅ Hacer clic "Editar" → ver todos los campos en formulario
- ✅ Campos numéricos, arrays, y strings se cargan correctamente

---

## 🎯 ORDEN DE IMPLEMENTACIÓN

1. **FASE 1**: Detectar y ocultar botones después de crear caso (Riesgo: MEDIO)
2. **FASE 2**: Mostrar resumen para casos históricos (Riesgo: MEDIO)
3. **FASE 3**: Cargar toda la información (Riesgo: BAJO)

---

## ✅ VALIDACIÓN POST-IMPLEMENTACIÓN

### **Escenarios de Prueba**:

1. **Caso Nuevo (desde formulario)**:
   - ✅ Completar formulario → "Buscar Planes"
   - ✅ Caso se crea → navegación SPA
   - ✅ NO ver botones de aprobar (solo conversación)
   - ✅ Agente responde automáticamente

2. **Caso Histórico (desde sidebar)**:
   - ✅ Hacer clic en caso histórico
   - ✅ Ver `CaseSummary` con todos los datos
   - ✅ Botón "Editar Brief" visible
   - ✅ Hacer clic "Editar" → ver formulario con todos los campos
   - ✅ Hacer clic "Guardar Datos" → actualiza caso

3. **Caso Histórico Aprobado**:
   - ✅ Cargar caso con `status='active'`
   - ✅ Ver `CaseSummary` automáticamente
   - ✅ `caseApproved` se sincroniza con BD

4. **Caso Nuevo Después de Aprobar**:
   - ✅ Aprobar caso → `caseApproved=true`
   - ✅ Ver `CaseSummary` (no formulario)
   - ✅ Botón "Editar Brief" funciona

---

## ⚠️ RIESGOS Y PRECAUCIONES

### **Riesgos Identificados**:

1. **FASE 1**: Cambiar `isEditing` puede afectar otros flujos
   - **Mitigación**: Verificar todos los usos de `isEditing` antes de cambiar

2. **FASE 2**: Cambiar lógica de renderizado puede romper casos nuevos
   - **Mitigación**: Agregar check explícito para casos nuevos

3. **FASE 3**: Mapeo incorrecto puede perder datos
   - **Mitigación**: Validar cada campo individualmente

### **Funcionalidades a Preservar**:

- ✅ Creación de casos desde formulario
- ✅ Navegación SPA con `router.push()`
- ✅ Respuesta automática del agente
- ✅ Carga de casos históricos desde sidebar
- ✅ Validación de clientes
- ✅ Botones sincronizados durante aprobación

---

## 📝 CONCLUSIÓN

Este plan aborda los 3 problemas identificados con:
- **Análisis exhaustivo** de dependencias
- **Cambios quirúrgicos** sin romper funcionalidades
- **Preservación** de toda la lógica existente
- **Validación** exhaustiva post-implementación

**TIEMPO ESTIMADO**: 2-3 horas  
**RIESGO GENERAL**: MEDIO  
**COMPLEJIDAD**: MEDIA

---

**Estado**: ✅ LISTO PARA IMPLEMENTACIÓN  
**Recomendación**: 🚀 PROCEDER CON FASE 1

