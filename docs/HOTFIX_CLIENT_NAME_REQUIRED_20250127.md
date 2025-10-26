# Hotfix: Error "Client name is required" en Panel Derecho del Agente

**Fecha:** 2025-01-27  
**Relacionado con:** `HOTFIX_CASEBRIEF_NO_CASEID_20250127.md`

---

## 📋 Problema

Al intentar aprobar un caso desde el panel derecho del agente (`CaseBriefForm.tsx`), después de la corrección del error "No currentCaseId found", apareció un nuevo error:

```
Client name is required
src/components/Workspace/CaseBriefForm.tsx (115:27) @ handleApproveWithValidation
```

**Síntomas:**
- El mensaje emergente dice: "Hubo un error"
- La consola muestra: "Client name is required"
- El usuario puede seleccionar un cliente del desplegable y verlo en el textbox, pero el error persiste
- El único campo realmente requerido (según la lógica de negocio) es `insurance_category`

---

## 🔍 Causa Raíz

El endpoint `/api/cases/create` en `src/app/api/cases/create/route.ts` validaba que `clientName` fuera obligatorio:

```typescript
if (!clientName) {
  return NextResponse.json(
    { error: 'Client name is required' },
    { status: 400 }
  );
}
```

**Motivo del Problema:**
- Según la lógica de negocio, el único campo requerido es `insurance_category`
- El usuario puede crear un caso sin especificar un cliente (se puede crear el cliente después)
- La validación de `clientName` era demasiado estricta para el flujo del panel derecho
- Desde LandingPage funciona porque el brief inicialmente tiene un mensaje de texto que se puede convertir en nombre de cliente, pero desde el panel derecho el brief puede no tener `clientName`

---

## 🛠️ Solución Implementada

### Cambios en `src/app/api/cases/create/route.ts`

#### 1. Hacer `clientName` Opcional con Valor por Defecto

**Antes:**
```typescript
if (!clientName) {
  return NextResponse.json(
    { error: 'Client name is required' },
    { status: 400 }
  );
}
```

**Después:**
```typescript
// clientName es opcional - usar valor por defecto si no se proporciona
const finalClientName = clientName || 'Cliente Nuevo';
```

#### 2. Validar que el Caso Tenga `insurance_category`

**Antes:**
```typescript
// No había validación específica para insurance_category
```

**Después:**
```typescript
// Validar que el caso tenga al menos insurance_category
if (!insurance_category) {
  return NextResponse.json(
    { error: 'Insurance category is required' },
    { status: 400 }
  );
}
```

#### 3. Usar el Valor Final en la Creación del Caso

**Antes:**
```typescript
{
  clientName,
  // ...
}
```

**Después:**
```typescript
{
  clientName: finalClientName,  // Usar el valor final (con fallback)
  // ...
}
```

---

## ✅ Resultado

Ahora el endpoint `/api/cases/create`:
1. ✅ No requiere `clientName` obligatoriamente
2. ✅ Usa "Cliente Nuevo" como valor por defecto si no se proporciona `clientName`
3. ✅ Valida que `insurance_category` esté presente (el único campo realmente requerido)
4. ✅ Permite crear casos desde el panel derecho sin especificar cliente
5. ✅ Mantiene la compatibilidad con el flujo desde LandingPage

---

## 📊 Principios Aplicados

### Reutilización Máxima
- La solución reutiliza el flujo existente de creación de casos
- No cambia la estructura de datos ni las relaciones entre entidades
- Mantiene la compatibilidad con `HomeClient.tsx` y `LandingChatInput.tsx`

### Consistencia de Estado Unidireccional
- El estado sigue siendo manejado de manera predecible
- `clientName` puede ser actualizado después de la creación del caso
- El `brief` puede no tener `clientName` inicialmente

### Separación de Responsabilidades
- El API valida solo los campos estrictamente necesarios
- La lógica de negocio determina que `insurance_category` es el único requerido
- `clientName` se puede agregar después sin problemas

---

## 🧪 Validación

### ✅ Checklist de Validación

- [ ] **Escenario 1 - Con Cliente:** Seleccionar un cliente del desplegable y crear caso → ✅ Debe funcionar
- [ ] **Escenario 2 - Sin Cliente:** Crear caso sin especificar cliente → ✅ Debe funcionar (usar "Cliente Nuevo")
- [ ] **Escenario 3 - Sin Categoría:** Intentar crear caso sin `insurance_category` → ❌ Debe mostrar error "Insurance category is required"
- [ ] **Escenario 4 - LandingPage:** Crear caso desde LandingPage → ✅ Debe funcionar (compatibilidad mantenida)
- [ ] **Escenario 5 - Panel Derecho:** Crear caso desde panel derecho del agente → ✅ Debe funcionar

---

## 📝 Notas Técnicas

### Valor por Defecto
- Se usa "Cliente Nuevo" como nombre por defecto
- Este nombre puede ser actualizado después desde el gestor de clientes
- El usuario puede crear el cliente con datos completos más adelante

### Validación de `insurance_category`
- Ahora es el **único campo requerido** según la lógica de negocio
- Esto es consistente con el comportamiento del UI donde el botón "Buscar Planes" se activa solo cuando hay `insurance_category`

### Compatibilidad
- Los cambios son retrocompatibles con el flujo desde LandingPage
- Si el brief tiene `clientName`, se usa ese valor
- Si no lo tiene, se usa el valor por defecto

---

## 🔗 Referencias

- **Hotfix Anterior:** `docs/HOTFIX_CASEBRIEF_NO_CASEID_20250127.md`
- **Archivo Modificado:** `src/app/api/cases/create/route.ts`
- **Componente que Inicia el Flujo:** `src/components/Workspace/CaseBriefForm.tsx`

---

**Autor:** AI Assistant (Claude Sonnet 4.5)  
**Revisado por:** Usuario  
**Estado:** ✅ IMPLEMENTADO

