# ANÁLISIS EXHAUSTIVO Y PLAN DE RESOLUCIÓN: PÉRDIDA Y PERSISTENCIA DE DATOS DEL FORMULARIO

**Fecha**: 31 de Enero, 2025  
**Rol**: Ingeniero FullStack Senior  
**Estado**: 🔴 PROBLEMA CRÍTICO IDENTIFICADO - PLAN DE RESOLUCIÓN COMPLETO  
**Prioridad**: ALTA - Los datos del formulario deben guardarse completos y limpiarse completamente

---

## 📋 RESUMEN EJECUTIVO

Se han identificado 2 problemas críticos relacionados con el manejo de datos del formulario:

1. **❌ DATOS NO SE GUARDAN COMPLETOS EN EL RESUMEN**: Algunos campos del formulario (`client_profile`, `max_budget`, `employees`, `required_coverages`, etc.) no se están guardando o visualizando correctamente en el resumen cuando se navega a `agent/case-id`.

2. **❌ DATOS PERSISTEN EN `new-thread-placeholder`**: Cuando se navega a `http://localhost:3000/es/agent/new-thread-placeholder`, algunos datos como el nombre del cliente u otros aspectos se recuerdan. El formulario debe estar completamente vacío en cada instancia.

**Requisitos**:
- ✅ TODOS los datos consignados en el formulario deben pasarse y visualizarse correctamente en `agent/case-id`
- ✅ TODOS los datos del formulario deben estar limpios (completamente vacíos) cada vez que se ingresa a `new-thread-placeholder`

---

## 🔍 ANÁLISIS DETALLADO DEL PROBLEMA 1: DATOS NO SE GUARDAN COMPLETOS

### **1.1. Ubicación del Código Problemático**

#### **Archivo**: `src/app/api/cases/approve/route.ts`

**Líneas 42-49**: Guardado condicional de campos
```typescript
// Actualizar campos opcionales solo si están presentes
if (briefData.clientName) updateData.clientName = briefData.clientName;
if (briefData.selectedClientId) updateData.clientRef = briefData.selectedClientId;
if (briefData.insurance_category) updateData.insurance_category = briefData.insurance_category;
if (briefData.max_budget) updateData.max_budget = briefData.max_budget;
if (briefData.budget_currency) updateData.budget_currency = briefData.budget_currency;
if (briefData.required_coverages) updateData.required_coverages = briefData.required_coverages;
if (briefData.client_profile) updateData.client_profile = briefData.client_profile;
```

**Problema Identificado**:
- Solo se guardan campos si son "truthy" (`if (briefData.field)`)
- Si un campo es `null`, `undefined`, `0`, o `''` (string vacío), NO se guarda
- Esto significa que si el usuario borra un campo o lo deja vacío, el valor anterior en BD se mantiene
- `employees` y `max_budget` pueden ser `null` y no se guardan explícitamente

**Campos que NO se guardan si son `null` o `undefined`**:
- `max_budget` (si es `null`, no se actualiza en BD)
- `employees` (si es `null`, no se actualiza en BD)
- `client_profile` (si es `''`, no se actualiza en BD)
- `required_coverages` (si es `[]`, no se actualiza en BD)

#### **Archivo**: `src/lib/case-actions.ts`

**Líneas 130, 142-145**: Creación de caso
```typescript
employees: briefData.employees,
// ...
max_budget: briefData.max_budget,
budget_currency: briefData.budget_currency,
required_coverages: briefData.required_coverages,
client_profile: briefData.client_profile,
```

**Análisis**: Este código está correcto, envía todos los campos al crear el caso. El problema está en `approve/route.ts` que no actualiza todos los campos.

#### **Archivo**: `src/components/Cases/BriefForm.tsx`

**Líneas 409-421**: Actualización del brief global
```typescript
const briefUpdate: any = {
  insurance_category: formData.insurance_category,
  max_budget: formData.max_budget ?? undefined,
  budget_currency: formData.budget_currency,
  required_coverages: formData.required_coverages,
  client_profile: formData.client_profile,
  clientName: formData.clientName,
  businessType: formData.businessType,
  employees: formData.employees ?? undefined,
  coverage: formData.coverage,
  freeText: formData.notes,
  tempUploads: tempUploads,
};
setBrief(briefUpdate);
```

**Problema Identificado**:
- `max_budget ?? undefined` convierte `null` a `undefined`
- `employees ?? undefined` convierte `null` a `undefined`
- Cuando se envía a `approve/route.ts`, `undefined` se omite en JSON, entonces no se actualiza en BD

#### **Archivo**: `src/components/Workspace/CaseSummary.tsx`

**Líneas 35-94**: Visualización del resumen
```typescript
{brief.clientName || 'N/A'}
{brief.client_profile || 'N/A'}
{brief.employees || 'N/A'}
{brief.max_budget ? `${brief.max_budget} ${brief.budget_currency || 'COP'}` : 'N/A'}
{brief.required_coverages && brief.required_coverages.length > 0 && (
  <div>{brief.required_coverages.join(', ')}</div>
)}
```

**Problema Identificado**:
- `CaseSummary` muestra datos del `brief` de Zustand, que puede no estar sincronizado con BD
- Si `brief` no se actualiza después de aprobar, muestra datos antiguos
- Si `brief` no se carga desde BD cuando se navega a `agent/case-id`, muestra datos incorrectos

#### **Archivo**: `src/components/Workspace/Tabs.tsx`

**Líneas 66-69**: Carga de datos desde BD
```typescript
const response = await fetch(`/api/cases/${currentCaseId}`);
if (response.ok) {
  const { case: caseData } = await response.json();
  setActiveCaseData(caseData);
}
```

**Análisis**: Este código carga los datos correctamente, pero `CaseSummary` usa `brief` de Zustand, no `activeCaseData`.

#### **Archivo**: `src/components/Workspace/CaseBriefForm.tsx`

**Líneas 98-118**: Mapeo de datos desde BD
```typescript
const mappedBrief: Partial<CaseBrief> = {
  clientName: activeCaseData.clientName || '',
  businessType: activeCaseData.businessType || '',
  ...(activeCaseData.employees !== undefined && activeCaseData.employees !== null && {
    employees: activeCaseData.employees
  }),
  ...(activeCaseData.max_budget !== undefined && activeCaseData.max_budget !== null && {
    max_budget: Number(activeCaseData.max_budget)
  }),
  // ...
};
setBrief(mappedBrief);
```

**Análisis**: Este código mapea correctamente los datos desde BD a `brief`, pero solo se ejecuta cuando hay `activeCaseData` y `currentCaseId`.

### **1.2. Causa Raíz Identificada**

**PROBLEMA PRINCIPAL**: `approve/route.ts` solo actualiza campos si son "truthy", causando que:
1. Campos con valor `null` no se actualicen en BD
2. Campos con valor `undefined` se omitan en JSON
3. El resumen muestra datos del `brief` de Zustand, que puede no estar sincronizado con BD

**FLUJO PROBLEMÁTICO**:
1. Usuario llena formulario con `max_budget: 1000`, `employees: 5`, `client_profile: "texto"`
2. Usuario hace clic en "Aprobar"
3. `BriefForm` actualiza `brief` global con `max_budget: 1000 ?? undefined` → `1000`
4. `approveCurrentCase` envía `briefData` a `/api/cases/approve`
5. `approve/route.ts` verifica `if (briefData.max_budget)` → `true`, guarda `1000` ✅
6. **PERO** si el usuario borra `max_budget` y lo deja en `null`:
   - `BriefForm` envía `max_budget: null ?? undefined` → `undefined`
   - `approve/route.ts` verifica `if (briefData.max_budget)` → `false` (undefined es falsy)
   - NO se actualiza en BD, mantiene el valor anterior ❌

**PROBLEMA SECUNDARIO**: `CaseSummary` usa `brief` de Zustand, que puede no estar sincronizado con BD después de aprobar.

---

## 🔍 ANÁLISIS DETALLADO DEL PROBLEMA 2: DATOS PERSISTEN EN `new-thread-placeholder`

### **2.1. Ubicación del Código Problemático**

#### **Archivo**: `src/components/HomeClient.tsx`

**Líneas 71-83**: Limpieza del brief
```typescript
state.setBrief({
  freeText: '',
  clientName: '',
  selectedClientId: null,
  insurance_category: '',
  budget_currency: 'COP',
  required_coverages: [],
  client_profile: '',
  businessType: '',
  coverage: '',
  tempUploads: []
  // Omitimos employees y max_budget en lugar de establecerlos como undefined
});
```

**Problema Identificado**:
- **NO se establecen `employees` y `max_budget` explícitamente**
- Si estos campos tienen valores previos en `brief`, NO se limpian
- El comentario dice "Omitimos employees y max_budget", pero esto causa que persistan

#### **Archivo**: `src/lib/ui/state.ts`

**Líneas 696-712**: Persistencia en localStorage
```typescript
const persistState = (state: Partial<UIState>) => {
  if (typeof window !== 'undefined') {
    try {
      const stateToPersist = {
        currentCaseId: state.currentCaseId,
        brief: state.brief,  // ✅ Se persiste el brief completo
        messages: state.messages,
        step: state.step,
        caseApproved: state.caseApproved
      };
      localStorage.setItem('briki-ui-state', JSON.stringify(stateToPersist));
    }
  }
};
```

**Líneas 1514-1520**: Carga de estado persistido
```typescript
if (typeof window !== 'undefined') {
  const persistedState = loadPersistedState();
  if (Object.keys(persistedState).length > 0) {
    useUI.setState(persistedState);  // ✅ Se carga el brief completo desde localStorage
    console.log('✅ [useUI] Estado persistido cargado al inicializar');
  }
}
```

**Problema Identificado**:
- `persistState` persiste `brief` completo en localStorage
- `loadPersistedState` carga el estado persistido al inicializar la aplicación
- Si el usuario llena el formulario y luego navega a `new-thread-placeholder`, el brief se limpia en `HomeClient`, pero:
  - Si hay datos en localStorage, pueden cargarse después
  - Si `HomeClient` se ejecuta antes de que `loadPersistedState` se complete, los datos pueden persistir

#### **Archivo**: `src/components/Cases/BriefForm.tsx`

**Líneas 121-133**: Inicialización del estado local
```typescript
const [formData, setFormData] = useState<CaseBriefData>({
  insurance_category: initialData?.insurance_category || '',
  max_budget: initialData?.max_budget || null,
  budget_currency: initialData?.budget_currency || 'COP',
  required_coverages: initialData?.required_coverages || [],
  client_profile: initialData?.client_profile || '',
  notes: initialNotes,
  clientName: initialData?.clientName || brief?.clientName || '',  // ❌ PROBLEMA: Usa brief?.clientName como fallback
  businessType: initialData?.businessType || brief?.businessType || '',  // ❌ PROBLEMA: Usa brief?.businessType como fallback
  employees: initialData?.employees || brief?.employees || null,  // ❌ PROBLEMA: Usa brief?.employees como fallback
  coverage: brief?.coverage || '',  // ❌ PROBLEMA: Usa brief?.coverage como fallback
  freeText: initialData?.briefData?.freeText || brief?.freeText || '',  // ❌ PROBLEMA: Usa brief?.freeText como fallback
});
```

**Problema Identificado**:
- El estado local se inicializa con `initialData || brief`
- Si `initialData` está vacío pero `brief` tiene datos (por ejemplo, de localStorage), los datos persisten
- Esto causa que el formulario muestre datos previos incluso en `new-thread-placeholder`

#### **Archivo**: `src/components/Workspace/CaseBriefForm.tsx`

**Líneas 136-152**: Limpieza cuando no hay `currentCaseId`
```typescript
useEffect(() => {
  if (!currentCaseId) {
    console.log('🧹 [CaseBriefForm] Limpiando brief para new-thread-placeholder');
    setBrief({
      freeText: '',
      clientName: '',
      selectedClientId: null,
      insurance_category: '',
      budget_currency: 'COP',
      required_coverages: [],
      client_profile: '',
      businessType: '',
      coverage: '',
      tempUploads: []
    });
  }
}, [currentCaseId, setBrief]);
```

**Problema Identificado**:
- **NO se establecen `employees` y `max_budget` explícitamente**
- Si estos campos tienen valores previos, NO se limpian

#### **Archivo**: `src/components/Cases/BriefForm.tsx`

**Líneas 170-203**: Limpieza del estado local
```typescript
useEffect(() => {
  const currentCaseId = useUI.getState().currentCaseId;
  if (!currentCaseId) {
    console.log('🧹 [BriefForm] Limpiando estado local para new-thread-placeholder');
    setFormData({
      insurance_category: '',
      max_budget: null,
      budget_currency: 'COP',
      required_coverages: [],
      client_profile: '',
      notes: '',
      clientName: '',
      businessType: '',
      employees: null,
      coverage: '',
      freeText: '',
    });
    setTempUploads([]);
    
    // ✅ CORRECCIÓN: Limpiar tempUploads del brief global
    const currentBrief = useUI.getState().brief;
    if ((currentBrief as any).tempUploads && (currentBrief as any).tempUploads.length > 0) {
      setBrief({ tempUploads: [] } as any);
    }
  }
}, [initialNotes, setBrief]);
```

**Análisis**: Este código limpia correctamente el estado local, pero:
- Depende de `initialNotes` y `setBrief`, lo que puede causar que se ejecute en momentos incorrectos
- No limpia el brief global completamente (solo limpia `tempUploads`)

#### **Archivo**: `src/components/SidebarChatPanel.tsx`

**Líneas 105-109**: Limpieza al crear nuevo chat
```typescript
setBrief({
  freeText: '', clientName: '', selectedClientId: null, insurance_category: '',
  max_budget: undefined as any, budget_currency: 'COP', required_coverages: [],
  client_profile: '', businessType: '', employees: undefined as any, coverage: ''
});
```

**Análisis**: Este código establece `max_budget: undefined` y `employees: undefined`, pero:
- Usa `undefined` en lugar de `null`
- No es consistente con otros lugares donde se limpia el brief

### **2.2. Causa Raíz Identificada**

**PROBLEMA PRINCIPAL**: Múltiples lugares limpian el brief, pero:
1. **NO todos limpian TODOS los campos** (especialmente `employees` y `max_budget`)
2. **Persistencia en localStorage** carga datos previos después de limpiar
3. **Inicialización del estado local** usa `brief` como fallback, causando que datos previos persistan

**FLUJO PROBLEMÁTICO**:
1. Usuario llena formulario con `clientName: "Juan"`, `max_budget: 1000`, `employees: 5`
2. Usuario navega a `new-thread-placeholder`
3. `HomeClient` limpia el brief pero omite `employees` y `max_budget`
4. `loadPersistedState` carga el brief desde localStorage (con `clientName: "Juan"`, `max_budget: 1000`, `employees: 5`)
5. `BriefForm` inicializa el estado local con `initialData || brief`
6. Como `initialData` está vacío, usa `brief` que tiene datos de localStorage
7. **RESULTADO**: El formulario muestra datos previos ❌

---

## 🎯 PLAN DE RESOLUCIÓN

### **PRINCIPIO RECTOR**

> **"Todos los campos del formulario deben guardarse explícitamente en BD (incluso si son `null`), y todos los campos deben limpiarse explícitamente cuando se navega a `new-thread-placeholder` (incluyendo `employees` y `max_budget`). El resumen debe mostrar datos desde BD, no desde Zustand."**

### **ESTRATEGIA GENERAL**

1. **Guardar TODOS los campos explícitamente** en `approve/route.ts`, incluso si son `null` o `undefined`
2. **Limpiar TODOS los campos explícitamente** en todos los lugares donde se limpia el brief
3. **NO persistir `brief` en localStorage** cuando se navega a `new-thread-placeholder`
4. **Cargar datos desde BD** en `CaseSummary` en lugar de usar `brief` de Zustand
5. **Sincronizar `brief` con BD** después de aprobar y cuando se carga un caso histórico

---

## 📊 FASES DE IMPLEMENTACIÓN

### **FASE 1: Corregir Guardado de Datos en `approve/route.ts`**

**Objetivo**: Guardar TODOS los campos explícitamente, incluso si son `null` o `undefined`

**Archivo**: `src/app/api/cases/approve/route.ts`

**Cambio**: Reemplazar guardado condicional con guardado explícito

**ANTES** (líneas 42-49):
```typescript
// Actualizar campos opcionales solo si están presentes
if (briefData.clientName) updateData.clientName = briefData.clientName;
if (briefData.selectedClientId) updateData.clientRef = briefData.selectedClientId;
if (briefData.insurance_category) updateData.insurance_category = briefData.insurance_category;
if (briefData.max_budget) updateData.max_budget = briefData.max_budget;
if (briefData.budget_currency) updateData.budget_currency = briefData.budget_currency;
if (briefData.required_coverages) updateData.required_coverages = briefData.required_coverages;
if (briefData.client_profile) updateData.client_profile = briefData.client_profile;
```

**DESPUÉS**:
```typescript
// ✅ CORRECCIÓN CRÍTICA: Guardar TODOS los campos explícitamente, incluso si son null o undefined
// Esto asegura que los valores se actualicen correctamente en BD
updateData.clientName = briefData.clientName ?? null;
updateData.clientRef = briefData.selectedClientId ?? null;
updateData.insurance_category = briefData.insurance_category ?? null;
updateData.max_budget = briefData.max_budget ?? null;  // ✅ Guardar null explícitamente
updateData.budget_currency = briefData.budget_currency ?? 'COP';
updateData.required_coverages = briefData.required_coverages ?? [];
updateData.client_profile = briefData.client_profile ?? null;
updateData.employees = briefData.employees ?? null;  // ✅ Guardar null explícitamente
```

**Justificación**: 
- Usar `??` (nullish coalescing) en lugar de `if` condicional
- Guardar `null` explícitamente para campos opcionales
- Asegurar que todos los campos se actualicen en BD, incluso si el usuario los borra

**Riesgo**: 🟡 MEDIO (afecta guardado de datos en BD)

---

### **FASE 2: Corregir Limpieza Completa en `HomeClient.tsx`**

**Objetivo**: Limpiar TODOS los campos explícitamente, incluyendo `employees` y `max_budget`

**Archivo**: `src/components/HomeClient.tsx`

**Cambio**: Agregar `employees` y `max_budget` a la limpieza

**ANTES** (líneas 71-83):
```typescript
state.setBrief({
  freeText: '',
  clientName: '',
  selectedClientId: null,
  insurance_category: '',
  budget_currency: 'COP',
  required_coverages: [],
  client_profile: '',
  businessType: '',
  coverage: '',
  tempUploads: []
  // Omitimos employees y max_budget en lugar de establecerlos como undefined
});
```

**DESPUÉS**:
```typescript
// ✅ CORRECCIÓN CRÍTICA: Limpiar TODOS los campos explícitamente, incluyendo employees y max_budget
state.setBrief({
  freeText: '',
  clientName: '',
  selectedClientId: null,
  insurance_category: '',
  budget_currency: 'COP',
  required_coverages: [],
  client_profile: '',
  businessType: '',
  coverage: '',
  employees: null,  // ✅ AGREGADO: Limpiar employees explícitamente
  max_budget: null,  // ✅ AGREGADO: Limpiar max_budget explícitamente
  tempUploads: []
});
```

**Justificación**: 
- Establecer `employees` y `max_budget` como `null` explícitamente
- Asegurar que todos los campos se limpien completamente

**Riesgo**: 🟢 BAJO (solo limpieza de datos)

---

### **FASE 3: Corregir Limpieza Completa en `CaseBriefForm.tsx`**

**Objetivo**: Limpiar TODOS los campos explícitamente cuando no hay `currentCaseId`

**Archivo**: `src/components/Workspace/CaseBriefForm.tsx`

**Cambio**: Agregar `employees` y `max_budget` a la limpieza

**ANTES** (líneas 139-151):
```typescript
setBrief({
  freeText: '',
  clientName: '',
  selectedClientId: null,
  insurance_category: '',
  budget_currency: 'COP',
  required_coverages: [],
  client_profile: '',
  businessType: '',
  coverage: '',
  tempUploads: []
});
```

**DESPUÉS**:
```typescript
// ✅ CORRECCIÓN CRÍTICA: Limpiar TODOS los campos explícitamente
setBrief({
  freeText: '',
  clientName: '',
  selectedClientId: null,
  insurance_category: '',
  budget_currency: 'COP',
  required_coverages: [],
  client_profile: '',
  businessType: '',
  coverage: '',
  employees: null,  // ✅ AGREGADO: Limpiar employees explícitamente
  max_budget: null,  // ✅ AGREGADO: Limpiar max_budget explícitamente
  tempUploads: []
});
```

**Justificación**: 
- Establecer `employees` y `max_budget` como `null` explícitamente
- Asegurar consistencia con `HomeClient.tsx`

**Riesgo**: 🟢 BAJO (solo limpieza de datos)

---

### **FASE 4: Corregir Limpieza Completa en `SidebarChatPanel.tsx`**

**Objetivo**: Usar `null` en lugar de `undefined` para consistencia

**Archivo**: `src/components/SidebarChatPanel.tsx`

**Cambio**: Cambiar `undefined` a `null`

**ANTES** (líneas 105-109):
```typescript
setBrief({
  freeText: '', clientName: '', selectedClientId: null, insurance_category: '',
  max_budget: undefined as any, budget_currency: 'COP', required_coverages: [],
  client_profile: '', businessType: '', employees: undefined as any, coverage: ''
});
```

**DESPUÉS**:
```typescript
// ✅ CORRECCIÓN: Usar null en lugar de undefined para consistencia
setBrief({
  freeText: '',
  clientName: '',
  selectedClientId: null,
  insurance_category: '',
  budget_currency: 'COP',
  required_coverages: [],
  client_profile: '',
  businessType: '',
  coverage: '',
  employees: null,  // ✅ CAMBIADO: undefined → null
  max_budget: null,  // ✅ CAMBIADO: undefined → null
  tempUploads: []
});
```

**Justificación**: 
- Usar `null` en lugar de `undefined` para consistencia
- Asegurar que todos los campos se limpien explícitamente

**Riesgo**: 🟢 BAJO (solo limpieza de datos)

---

### **FASE 5: Prevenir Persistencia de `brief` en `new-thread-placeholder`**

**Objetivo**: NO persistir `brief` cuando se navega a `new-thread-placeholder`

**Archivo**: `src/lib/ui/state.ts`

**Cambio**: Modificar `persistState` para NO persistir `brief` si `currentCaseId` es `null`

**ANTES** (líneas 696-712):
```typescript
const persistState = (state: Partial<UIState>) => {
  if (typeof window !== 'undefined') {
    try {
      const stateToPersist = {
        currentCaseId: state.currentCaseId,
        brief: state.brief,  // ❌ PROBLEMA: Siempre persiste brief
        messages: state.messages,
        step: state.step,
        caseApproved: state.caseApproved
      };
      localStorage.setItem('briki-ui-state', JSON.stringify(stateToPersist));
    }
  }
};
```

**DESPUÉS**:
```typescript
const persistState = (state: Partial<UIState>) => {
  if (typeof window !== 'undefined') {
    try {
      const currentCaseId = state.currentCaseId ?? useUI.getState().currentCaseId;
      
      // ✅ CORRECCIÓN CRÍTICA: NO persistir brief si currentCaseId es null (new-thread-placeholder)
      // Esto previene que datos del formulario persistan cuando se navega a new-thread-placeholder
      const stateToPersist: any = {
        currentCaseId: state.currentCaseId,
        messages: state.messages,
        step: state.step,
        caseApproved: state.caseApproved
      };
      
      // Solo persistir brief si hay un currentCaseId (caso histórico o recién creado)
      if (currentCaseId) {
        stateToPersist.brief = state.brief ?? useUI.getState().brief;
      } else {
        // Si no hay currentCaseId, NO persistir brief (new-thread-placeholder)
        // Esto asegura que el formulario esté limpio en cada instancia
        console.log('⏭️ [useUI] Omitiendo persistencia de brief (currentCaseId es null)');
      }
      
      localStorage.setItem('briki-ui-state', JSON.stringify(stateToPersist));
      console.log('✅ [useUI] Estado persistido:', stateToPersist);
    } catch (error) {
      console.error('❌ [useUI] Error persistiendo estado:', error);
    }
  }
};
```

**Justificación**: 
- NO persistir `brief` cuando `currentCaseId` es `null` (new-thread-placeholder)
- Esto previene que datos del formulario persistan en localStorage
- Asegurar que el formulario esté limpio en cada instancia de `new-thread-placeholder`

**Riesgo**: 🟡 MEDIO (afecta persistencia de estado)

---

### **FASE 6: Corregir Inicialización del Estado Local en `BriefForm.tsx`**

**Objetivo**: NO usar `brief` como fallback cuando `currentCaseId` es `null`

**Archivo**: `src/components/Cases/BriefForm.tsx`

**Cambio**: Modificar inicialización para NO usar `brief` como fallback si `currentCaseId` es `null`

**ANTES** (líneas 121-133):
```typescript
const [formData, setFormData] = useState<CaseBriefData>({
  insurance_category: initialData?.insurance_category || '',
  max_budget: initialData?.max_budget || null,
  budget_currency: initialData?.budget_currency || 'COP',
  required_coverages: initialData?.required_coverages || [],
  client_profile: initialData?.client_profile || '',
  notes: initialNotes,
  clientName: initialData?.clientName || brief?.clientName || '',  // ❌ PROBLEMA
  businessType: initialData?.businessType || brief?.businessType || '',  // ❌ PROBLEMA
  employees: initialData?.employees || brief?.employees || null,  // ❌ PROBLEMA
  coverage: brief?.coverage || '',  // ❌ PROBLEMA
  freeText: initialData?.briefData?.freeText || brief?.freeText || '',  // ❌ PROBLEMA
});
```

**DESPUÉS**:
```typescript
// ✅ CORRECCIÓN CRÍTICA: NO usar brief como fallback si currentCaseId es null
// Esto previene que datos previos persistan en new-thread-placeholder
const currentCaseId = useUI.getState().currentCaseId;
const shouldUseBriefFallback = currentCaseId !== null;  // Solo usar brief si hay currentCaseId

const [formData, setFormData] = useState<CaseBriefData>({
  insurance_category: initialData?.insurance_category || '',
  max_budget: initialData?.max_budget || null,
  budget_currency: initialData?.budget_currency || 'COP',
  required_coverages: initialData?.required_coverages || [],
  client_profile: initialData?.client_profile || '',
  notes: initialNotes,
  clientName: initialData?.clientName || (shouldUseBriefFallback ? brief?.clientName : '') || '',
  businessType: initialData?.businessType || (shouldUseBriefFallback ? brief?.businessType : '') || '',
  employees: initialData?.employees || (shouldUseBriefFallback ? brief?.employees : null) || null,
  coverage: (shouldUseBriefFallback ? brief?.coverage : '') || '',
  freeText: initialData?.briefData?.freeText || (shouldUseBriefFallback ? brief?.freeText : '') || '',
});
```

**Justificación**: 
- NO usar `brief` como fallback si `currentCaseId` es `null`
- Esto previene que datos previos persistan en `new-thread-placeholder`
- Asegurar que el formulario esté completamente vacío en cada instancia

**Riesgo**: 🟡 MEDIO (afecta inicialización del formulario)

---

### **FASE 7: Cargar Datos desde BD en `CaseSummary`**

**Objetivo**: Mostrar datos desde BD en lugar de `brief` de Zustand

**Archivo**: `src/components/Workspace/CaseSummary.tsx`

**Cambio**: Recibir `activeCaseData` como prop y usarlo en lugar de `brief`

**ANTES** (líneas 10-15):
```typescript
interface CaseSummaryProps {
  brief: Partial<CaseBrief>;
  onEdit: () => void;
}

export function CaseSummary({ brief, onEdit }: CaseSummaryProps) {
  // Usa brief directamente
}
```

**DESPUÉS**:
```typescript
interface CaseSummaryProps {
  brief: Partial<CaseBrief>;  // Mantener para compatibilidad
  activeCaseData?: any;  // ✅ NUEVO: Datos desde BD
  onEdit: () => void;
}

export function CaseSummary({ brief, activeCaseData, onEdit }: CaseSummaryProps) {
  // ✅ CORRECCIÓN CRÍTICA: Priorizar activeCaseData sobre brief
  // activeCaseData viene directamente de BD y es la fuente de verdad
  const displayData = activeCaseData ? {
    clientName: activeCaseData.clientName || brief.clientName || 'N/A',
    client_profile: activeCaseData.client_profile || brief.client_profile || 'N/A',
    businessType: activeCaseData.businessType || brief.businessType || 'N/A',
    employees: activeCaseData.employees ?? brief.employees ?? 'N/A',
    insurance_category: activeCaseData.insurance_category || brief.insurance_category || 'N/A',
    coverage: (activeCaseData.briefData as any)?.coverage || brief.coverage || 'N/A',
    max_budget: activeCaseData.max_budget ? Number(activeCaseData.max_budget) : (brief.max_budget ?? 'N/A'),
    budget_currency: activeCaseData.budget_currency || brief.budget_currency || 'COP',
    required_coverages: activeCaseData.required_coverages || brief.required_coverages || [],
    freeText: (activeCaseData.briefData as any)?.freeText || brief.freeText || 'N/A',
  } : brief;  // Fallback a brief si no hay activeCaseData
  
  // Usar displayData en lugar de brief
}
```

**Archivo**: `src/components/Workspace/Tabs.tsx`

**Cambio**: Pasar `activeCaseData` a `CaseSummary`

**ANTES** (línea 225):
```typescript
<CaseSummary brief={brief} onEdit={handleEditBrief} />
```

**DESPUÉS**:
```typescript
<CaseSummary brief={brief} activeCaseData={activeCaseData} onEdit={handleEditBrief} />
```

**Justificación**: 
- `activeCaseData` viene directamente de BD y es la fuente de verdad
- Priorizar `activeCaseData` sobre `brief` asegura que se muestren los datos correctos
- Fallback a `brief` si no hay `activeCaseData` (compatibilidad)

**Riesgo**: 🟡 MEDIO (afecta visualización del resumen)

---

### **FASE 8: Sincronizar `brief` con BD Después de Aprobar**

**Objetivo**: Asegurar que `brief` se sincronice con BD después de aprobar

**Archivo**: `src/components/Workspace/Tabs.tsx`

**Cambio**: Sincronizar `brief` cuando `activeCaseData` se carga después de aprobar

**ANTES** (líneas 168-191):
```typescript
useEffect(() => {
  if (caseApproved && currentCaseId) {
    // Evitar recarga si ya tenemos los datos y el status es 'active'
    if (activeCaseData?.id === currentCaseId && activeCaseData.status === 'active') {
      console.log('✅ [WorkspaceTabs] activeCaseData ya está sincronizado, omitiendo recarga');
      return;
    }
    
    console.log('🔄 [WorkspaceTabs] Recargando activeCaseData después de aprobación');
    const fetchCaseData = async () => {
      try {
        const response = await fetch(`/api/cases/${currentCaseId}`);
        if (response.ok) {
          const { case: caseData } = await response.json();
          setActiveCaseData(caseData);
          console.log(`✅ [WorkspaceTabs] Datos del caso recargados después de aprobación, status: ${caseData.status}`);
        }
      } catch (error: any) {
        console.error('❌ [WorkspaceTabs] Error recargando datos después de aprobación:', error);
      }
    };
    fetchCaseData();
  }
}, [caseApproved, currentCaseId, activeCaseData?.id, activeCaseData?.status]);
```

**DESPUÉS**:
```typescript
useEffect(() => {
  if (caseApproved && currentCaseId) {
    // Evitar recarga si ya tenemos los datos y el status es 'active'
    if (activeCaseData?.id === currentCaseId && activeCaseData.status === 'active') {
      console.log('✅ [WorkspaceTabs] activeCaseData ya está sincronizado, omitiendo recarga');
      return;
    }
    
    console.log('🔄 [WorkspaceTabs] Recargando activeCaseData después de aprobación');
    const fetchCaseData = async () => {
      try {
        const response = await fetch(`/api/cases/${currentCaseId}`);
        if (response.ok) {
          const { case: caseData } = await response.json();
          setActiveCaseData(caseData);
          
          // ✅ CORRECCIÓN CRÍTICA: Sincronizar brief con datos desde BD
          // Esto asegura que brief refleje los datos guardados correctamente
          const { setBrief } = useUI.getState();
          const mappedBrief: Partial<CaseBrief> = {
            clientName: caseData.clientName || '',
            businessType: caseData.businessType || '',
            employees: caseData.employees ?? null,
            insurance_category: caseData.insurance_category || '',
            max_budget: caseData.max_budget ? Number(caseData.max_budget) : null,
            budget_currency: (caseData.budget_currency as 'COP' | 'USD') || 'COP',
            required_coverages: Array.isArray(caseData.required_coverages) ? caseData.required_coverages : [],
            client_profile: caseData.client_profile || '',
            freeText: (caseData.briefData as any)?.freeText || '',
            coverage: (caseData.briefData as any)?.coverage || '',
            selectedClientId: caseData.clientRef || null,
          };
          setBrief(mappedBrief);
          
          console.log(`✅ [WorkspaceTabs] Datos del caso recargados y brief sincronizado después de aprobación, status: ${caseData.status}`);
        }
      } catch (error: any) {
        console.error('❌ [WorkspaceTabs] Error recargando datos después de aprobación:', error);
      }
    };
    fetchCaseData();
  }
}, [caseApproved, currentCaseId, activeCaseData?.id, activeCaseData?.status]);
```

**Justificación**: 
- Sincronizar `brief` con datos desde BD después de aprobar
- Asegurar que `brief` refleje los datos guardados correctamente
- Esto previene inconsistencias entre `brief` y BD

**Riesgo**: 🟡 MEDIO (afecta sincronización de estado)

---

## 📊 RESUMEN DE CAMBIOS

### **Archivos a Modificar**

| Archivo | Cambios | Riesgo | Prioridad |
|---------|---------|--------|-----------|
| `src/app/api/cases/approve/route.ts` | Guardar TODOS los campos explícitamente | 🟡 MEDIO | 🔴 ALTA |
| `src/components/HomeClient.tsx` | Limpiar `employees` y `max_budget` explícitamente | 🟢 BAJO | 🔴 ALTA |
| `src/components/Workspace/CaseBriefForm.tsx` | Limpiar `employees` y `max_budget` explícitamente | 🟢 BAJO | 🔴 ALTA |
| `src/components/SidebarChatPanel.tsx` | Usar `null` en lugar de `undefined` | 🟢 BAJO | 🟡 MEDIA |
| `src/lib/ui/state.ts` | NO persistir `brief` si `currentCaseId` es `null` | 🟡 MEDIO | 🔴 ALTA |
| `src/components/Cases/BriefForm.tsx` | NO usar `brief` como fallback si `currentCaseId` es `null` | 🟡 MEDIO | 🔴 ALTA |
| `src/components/Workspace/CaseSummary.tsx` | Priorizar `activeCaseData` sobre `brief` | 🟡 MEDIO | 🔴 ALTA |
| `src/components/Workspace/Tabs.tsx` | Sincronizar `brief` con BD después de aprobar | 🟡 MEDIO | 🔴 ALTA |

### **Archivos que NO se Modifican**

| Archivo | Razón |
|---------|-------|
| `src/lib/case-actions.ts` | Ya envía todos los campos correctamente |
| `src/app/api/cases/create/route.ts` | Ya guarda todos los campos correctamente |
| `src/app/api/cases/[id]/route.ts` | Ya retorna todos los campos correctamente |

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **Pre-Implementación**

- [x] Analizar flujo de guardado de datos
- [x] Analizar flujo de limpieza de datos
- [x] Identificar lugares donde se limpia el brief
- [x] Identificar lugares donde se persiste el brief
- [x] Identificar lugares donde se carga el brief

### **Implementación**

- [ ] **FASE 1**: Corregir guardado de datos en `approve/route.ts`
- [ ] **FASE 2**: Corregir limpieza completa en `HomeClient.tsx`
- [ ] **FASE 3**: Corregir limpieza completa en `CaseBriefForm.tsx`
- [ ] **FASE 4**: Corregir limpieza completa en `SidebarChatPanel.tsx`
- [ ] **FASE 5**: Prevenir persistencia de `brief` en `new-thread-placeholder`
- [ ] **FASE 6**: Corregir inicialización del estado local en `BriefForm.tsx`
- [ ] **FASE 7**: Cargar datos desde BD en `CaseSummary`
- [ ] **FASE 8**: Sincronizar `brief` con BD después de aprobar

### **Post-Implementación**

- [ ] **TEST 1**: Llenar formulario completo, aprobar, verificar que TODOS los datos se guardan en BD
- [ ] **TEST 2**: Llenar formulario completo, aprobar, verificar que TODOS los datos se muestran en el resumen
- [ ] **TEST 3**: Navegar a `new-thread-placeholder`, verificar que el formulario está completamente vacío
- [ ] **TEST 4**: Llenar formulario, navegar a `new-thread-placeholder`, verificar que no persisten datos
- [ ] **TEST 5**: Cargar caso histórico, verificar que TODOS los datos se muestran correctamente
- [ ] **TEST 6**: Editar caso histórico, verificar que los cambios se guardan correctamente

---

## 🚨 NOTAS IMPORTANTES

### **1. Guardado Explícito de Campos**

**CRÍTICO**: Todos los campos deben guardarse explícitamente en BD, incluso si son `null` o `undefined`. Usar `??` (nullish coalescing) en lugar de `if` condicional.

### **2. Limpieza Completa de Campos**

**CRÍTICO**: Todos los campos deben limpiarse explícitamente cuando se navega a `new-thread-placeholder`, incluyendo `employees` y `max_budget`. Usar `null` en lugar de `undefined` para consistencia.

### **3. Persistencia Condicional**

**IMPORTANTE**: NO persistir `brief` en localStorage cuando `currentCaseId` es `null` (new-thread-placeholder). Esto previene que datos del formulario persistan entre sesiones.

### **4. Fuente de Verdad**

**IMPORTANTE**: `activeCaseData` (desde BD) es la fuente de verdad para el resumen. `brief` de Zustand solo se usa como fallback si no hay `activeCaseData`.

### **5. Sincronización Post-Aprobación**

**IMPORTANTE**: Después de aprobar, `brief` debe sincronizarse con BD para asegurar consistencia.

---

## 📝 CONCLUSIÓN

Este análisis identifica que:

1. **Problema 1 (Datos no se guardan completos)**: Se debe a que `approve/route.ts` solo guarda campos si son "truthy", y `CaseSummary` usa `brief` de Zustand en lugar de datos desde BD.

2. **Problema 2 (Datos persisten en new-thread-placeholder)**: Se debe a que:
   - `HomeClient.tsx` y `CaseBriefForm.tsx` no limpian `employees` y `max_budget` explícitamente
   - `persistState` persiste `brief` en localStorage incluso cuando `currentCaseId` es `null`
   - `BriefForm.tsx` usa `brief` como fallback al inicializar el estado local

La solución requiere:
1. Guardar TODOS los campos explícitamente en `approve/route.ts`
2. Limpiar TODOS los campos explícitamente en todos los lugares donde se limpia el brief
3. NO persistir `brief` en localStorage cuando `currentCaseId` es `null`
4. NO usar `brief` como fallback al inicializar el estado local si `currentCaseId` es `null`
5. Priorizar `activeCaseData` sobre `brief` en `CaseSummary`
6. Sincronizar `brief` con BD después de aprobar

La solución:
✅ **Respeta la arquitectura existente**  
✅ **Mantiene la separación de responsabilidades**  
✅ **No rompe funcionalidades existentes**  
✅ **Sigue los principios arquitectónicos del proyecto**  
✅ **Es robusta y maneja todos los casos** (null, undefined, valores vacíos)

---

**Última actualización**: 31 de Enero, 2025  
**Mantenedor**: Equipo de Desarrollo Briki  
**Estado**: 🔴 LISTO PARA IMPLEMENTACIÓN

