# RESUMEN: FASE 5 - DEDUPLICACIÓN GLOBAL

**Fecha**: 2 de Febrero, 2025  
**Estado**: ✅ IMPLEMENTACIÓN COMPLETA

---

## 📋 OBJETIVO

Implementar deduplicación global de archivos, verificando duplicados en TODOS los casos (no solo en el mismo caso), con opción de reutilizar archivos existentes o rechazar uploads duplicados.

---

## ✅ IMPLEMENTACIÓN

### Archivos creados/modificados:

1. **Nuevo**: `src/lib/storage/findDuplicateArtifact.ts`
   - Función helper para buscar duplicados globalmente
   - Usa query SQL directa con JSONB path para eficiencia
   - Retorna artifact existente si se encuentra

2. **Modificado**: `src/app/api/upload/pdf/route.ts`
   - Verificación de duplicados local (mismo caso) - mantenida como fallback
   - Verificación de duplicados global (todos los casos) - nueva
   - Opción de reutilizar archivo existente o rechazar upload

---

## 🔧 FUNCIONALIDAD IMPLEMENTADA

### 1. Verificación de duplicados en dos niveles:

#### Nivel 1: Duplicado local (mismo caso)
- **Comportamiento**: Rechaza upload (status 409)
- **Mensaje**: "This file has already been uploaded to this case"
- **Mantenido**: Comportamiento original como fallback

#### Nivel 2: Duplicado global (otros casos)
- **Comportamiento configurable**:
  - **Por defecto**: Rechaza upload (status 409) - comportamiento seguro
  - **Con `reuseExisting=true`**: Reutiliza archivo existente - crea nuevo artifact apuntando al mismo `fileId`

### 2. Reutilización de archivos:

Cuando `reuseExisting=true`:
- ✅ Crea nuevo artifact apuntando al mismo `fileId` del artifact existente
- ✅ Reutiliza `contentText` del artifact original (no extrae texto nuevamente)
- ✅ Reutiliza `contentType` del artifact original
- ✅ Añade metadata indicando que es reutilizado (`reusedFrom`, `originalFileName`, etc.)
- ✅ Registra auditoría con acción `artifact_uploaded_reused`

**Ventajas**:
- No duplica archivos en Storage
- No extrae texto nuevamente (ahorro de procesamiento)
- Mantiene trazabilidad (sabe de dónde se reutilizó)

---

## 🔍 ANÁLISIS DE LA IMPLEMENTACIÓN

### Causa del problema original:

**ANTES (FASE 5)**:
- Solo verificaba duplicados dentro del mismo caso
- El mismo archivo podía subirse múltiples veces en diferentes casos
- Consumo innecesario de storage
- No había forma de reutilizar archivos existentes

**Código problemático** (líneas 193-213):
```typescript
const allArtifacts = await prisma.artifact.findMany({
  where: { caseId: caseId } // ❌ Solo busca en el mismo caso
});
```

### Resolución implementada:

**DESPUÉS (FASE 5)**:
- Verifica duplicados localmente (mismo caso) - mantenido como fallback
- Verifica duplicados globalmente (todos los casos) - nuevo
- Opción de reutilizar archivo existente o rechazar upload
- Query optimizada usando SQL directo con JSONB path

**Código mejorado**:
```typescript
// 1. Verificación local (fallback)
const localDuplicate = localArtifacts.find(...);

// 2. Verificación global (nuevo)
const globalDuplicate = await findDuplicateArtifact(fileHash, caseId);

// 3. Opción de reutilizar o rechazar
if (reuseExisting) {
  // Reutilizar archivo existente
} else {
  // Rechazar upload (por defecto)
}
```

---

## 📊 ADHERENCIA A PRINCIPIOS

### ✅ Reutilización máxima del código:
- Función helper `findDuplicateArtifact()` centraliza lógica
- Reutiliza código de verificación local como fallback
- Reutiliza `contentText` y `contentType` del artifact original

### ✅ Mantenimiento de arquitectura dual:
- No modifica estructura de BD
- No modifica otros componentes
- Solo añade funcionalidad nueva

### ✅ Consistencia de estado unidireccional:
- Verificación local → global (orden claro)
- Reutilización mantiene integridad (mismo `fileId`)
- Metadata clara sobre reutilización

### ✅ Separación clara de responsabilidades:
- `findDuplicateArtifact()`: Solo busca duplicados
- `upload/pdf/route.ts`: Orquesta verificación y upload
- No mezcla lógica de negocio

### ✅ No rompe funcionalidades existentes:
- Mantiene verificación local como fallback
- Comportamiento por defecto es rechazar (seguro)
- Reutilización es opcional (`reuseExisting=true`)
- Si falla verificación global, continúa con upload normal

---

## 🧪 TESTING

### Test 1: Duplicado en mismo caso
1. Subir PDF a un caso
2. Intentar subir el mismo PDF al mismo caso
3. **Resultado esperado**: Rechazado con error "This file has already been uploaded to this case"

### Test 2: Duplicado en caso diferente (rechazar)
1. Subir PDF a Caso A
2. Intentar subir el mismo PDF a Caso B (sin `reuseExisting`)
3. **Resultado esperado**: Rechazado con error "This file has already been uploaded to another case"

### Test 3: Duplicado en caso diferente (reutilizar)
1. Subir PDF a Caso A
2. Subir el mismo PDF a Caso B con `reuseExisting=true`
3. **Resultado esperado**: 
   - Nuevo artifact creado en Caso B
   - Mismo `fileId` que artifact en Caso A
   - `contentText` reutilizado del artifact original
   - Metadata indica `reused: true`

### Test 4: Archivo único
1. Subir PDF nuevo (no duplicado)
2. **Resultado esperado**: Upload normal, artifact creado normalmente

---

## ⚠️ RIESGOS Y MITIGACIÓN

### Riesgo 1: Query global puede ser lenta con muchos artifacts
**Mitigación**: 
- Usa query SQL directa con JSONB path (eficiente)
- Limita resultado a 1 (LIMIT 1)
- Si falla, continúa con upload normal (no bloquea)

### Riesgo 2: Reutilizar archivo que fue eliminado
**Mitigación**: 
- Verifica que artifact original existe antes de reutilizar
- Si no existe, continúa con upload normal
- El archivo en Storage se mantiene mientras haya artifacts apuntándolo

### Riesgo 3: Cambiar comportamiento de uploads existentes
**Mitigación**: 
- Mantiene verificación local como fallback
- Comportamiento por defecto es rechazar (seguro)
- Reutilización es opcional (requiere `reuseExisting=true`)

---

## 📝 COMPORTAMIENTO CONFIGURABLE

### Opción 1: Rechazar upload (por defecto)
```typescript
// Sin parámetro reuseExisting o reuseExisting=false
// Resultado: Rechaza upload con status 409
```

### Opción 2: Reutilizar archivo existente
```typescript
// Con reuseExisting=true en FormData
formData.append('reuseExisting', 'true');
// Resultado: Crea nuevo artifact apuntando al mismo fileId
```

---

## ✅ CRITERIO DE ÉXITO

**FASE 5 está completa cuando**:
- ✅ Función `findDuplicateArtifact()` creada y funciona
- ✅ Verificación local mantenida (compatibilidad)
- ✅ Verificación global implementada
- ✅ Opción de reutilizar archivo funciona
- ✅ Opción de rechazar upload funciona (por defecto)
- ✅ No se rompen funcionalidades existentes
- ✅ Testing manual verifica todos los escenarios

---

## 📊 IMPACTO

### Antes de FASE 5:
- ❌ Mismo archivo subido múltiples veces en diferentes casos
- ❌ Consumo innecesario de storage
- ❌ No hay forma de reutilizar archivos

### Después de FASE 5:
- ✅ Detecta duplicados globalmente
- ✅ Opción de reutilizar archivos (ahorro de storage)
- ✅ Opción de rechazar uploads duplicados (comportamiento seguro)
- ✅ Mantiene compatibilidad con código existente

---

**Última actualización**: 2 de Febrero, 2025

