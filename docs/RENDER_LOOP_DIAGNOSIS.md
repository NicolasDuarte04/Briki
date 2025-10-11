# Diagnóstico del Loop de Renderizado en Comparisons

## Problema Identificado

La pestaña "Comparisons" está causando un loop infinito de renderizado con dos errores:
1. "The result of getSnapshot should be cached to avoid an infinite loop"
2. "Maximum update depth exceeded"

## Causa Raíz

El selector de `useUI` en `Comparison.tsx` (líneas 68-81) está creando un nuevo objeto en cada renderizado:

```typescript
const { ... } = useUI(
  (state: UIState) => ({
    policies: state.policies,
    policiesLoading: state.policiesLoading,
    policiesLoaded: state.policiesLoaded,
    comparisonScores: state.comparisonScores,
    comparisonPlaybook: state.comparisonPlaybook,
    comparisonWeights: state.comparisonWeights,
    setComparisonPlaybook: state.setComparisonPlaybook,
    setComparisonWeights: state.setComparisonWeights,
    resetComparisonWeights: state.resetComparisonWeights,
  }),
  shallow
);
```

### Por qué esto causa el loop:

1. **Nueva referencia en cada render**: El selector `(state) => ({ ... })` crea un nuevo objeto cada vez que se ejecuta
2. **Shallow comparison insuficiente**: Aunque usa `shallow`, la comparación superficial ve que el objeto es diferente (nueva referencia)
3. **Re-render infinito**: Zustand detecta un "cambio" y dispara otro render, que crea otro nuevo objeto, y así sucesivamente

## Solución

El selector debe retornar referencias estables. Hay varias opciones:

### Opción 1: Selector granular (múltiples hooks)
```typescript
const policies = useUI((state) => state.policies);
const policiesLoading = useUI((state) => state.policiesLoading);
// etc...
```

### Opción 2: Selector memoizado
```typescript
const selector = useCallback((state: UIState) => ({
  policies: state.policies,
  // ...
}), []);

const { ... } = useUI(selector, shallow);
```

### Opción 3: Seleccionar solo primitivos y funciones
```typescript
const comparisonData = useUI((state) => state); // O seleccionar propiedades específicas sin crear objeto
```

## Verificación adicional

También revisar si `comparisonScores` se está recalculando en cada cambio de estado, lo que podría contribuir al problema.

## Análisis Completo

### 1. El selector problemático (línea 68-81)
```typescript
const { ... } = useUI(
  (state: UIState) => ({  // ⚠️ NUEVO OBJETO CADA VEZ
    policies: state.policies,
    policiesLoading: state.policiesLoading,
    policiesLoaded: state.policiesLoaded,
    comparisonScores: state.comparisonScores,
    comparisonPlaybook: state.comparisonPlaybook,
    comparisonWeights: state.comparisonWeights,
    setComparisonPlaybook: state.setComparisonPlaybook,
    setComparisonWeights: state.setComparisonWeights,
    resetComparisonWeights: state.resetComparisonWeights,
  }),
  shallow  // ❌ No ayuda porque el objeto siempre es nuevo
);
```

### 2. Flujo del loop infinito
1. Componente renderiza → selector ejecuta → crea nuevo objeto
2. Zustand detecta "cambio" (nueva referencia) → dispara re-render
3. Re-render → selector ejecuta de nuevo → nuevo objeto
4. Loop infinito hasta que React lo detiene con "Maximum update depth exceeded"

### 3. Confirmación de no hay setters durante render
- ✅ No hay llamadas a `setComparisonWeights` durante render
- ✅ Los setters solo se llaman en event handlers (`onChange`, `onClick`)

### 4. Recálculo de scores
En `state.ts`, los scores se recalculan en:
- `setPolicies` → recalcula con weights actuales
- `setComparisonWeights` → recalcula con nuevos weights
- `setComparisonPlaybook` → recalcula con preset weights

Esto es comportamiento esperado y no causa el loop.
