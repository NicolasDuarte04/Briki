# 🧪 GUÍA DE TESTING - FASE 2: MEJORA DE MAPEO DE COORDENADAS

**Fecha**: 16 de Noviembre, 2025  
**Fase**: FASE 2 - Validación Completa  
**Objetivo**: Verificar que todas las mejoras de FASE 2 funcionan correctamente

---

## 📋 ÍNDICE

1. [Preparación](#1-preparación)
2. [Test 0: Diagnóstico Previo de Coordenadas](#2-test-0-diagnóstico-previo-de-coordenadas-opcional)
3. [Test 1: Análisis de Póliza](#3-test-1-análisis-de-póliza)
4. [Test 2: Verificación de Coordenadas Únicas](#4-test-2-verificación-de-coordenadas-únicas)
5. [Test 3: Verificación de Scoring](#5-test-3-verificación-de-scoring)
6. [Test 4: Verificación de Highlights](#6-test-4-verificación-de-highlights)
7. [Test 5: Verificación de Logs](#7-test-5-verificación-de-logs)
8. [Test 6: Verificación de Base de Datos](#8-test-6-verificación-de-base-de-datos)
9. [Checklist Final](#9-checklist-final)

---

## 1. PREPARACIÓN

### 1.1 Requisitos Previos

- ✅ Aplicación corriendo (`pnpm dev`)
- ✅ Base de datos accesible
- ✅ Usuario autenticado
- ✅ PDF de prueba (recomendado: póliza con múltiples campos repetidos)

### 1.2 Acceso a Herramientas

**URLs de Testing**:
- `/test/diagnose-coordinates` - **Herramienta de diagnóstico de coordenadas** (FASE 1)
- `/test/policies` - Página de testing de análisis de pólizas
- `/test/analysis` - Página de testing de visualización

**Herramientas de Base de Datos**:
- Supabase Dashboard (SQL Editor)
- O cualquier cliente SQL con acceso a la BD

### 1.3 Flujo de Testing Recomendado

**Orden recomendado de testing**:

1. **TEST 0: Diagnóstico previo** (opcional pero recomendado)
   - URL: `/test/diagnose-coordinates`
   - **Propósito**: Entender el sistema de coordenadas del PDF antes de analizar
   - **Cuándo usar**: Antes de analizar un PDF nuevo o cuando hay problemas
   - **Resultado**: Información sobre sistema de coordenadas, advertencias, rangos

2. **TEST 1: Análisis completo**
   - URL: `/test/policies`
   - **Propósito**: Analizar póliza con IA usando el nuevo sistema de scoring
   - **Cuándo usar**: Para validar que el mapeo funciona correctamente
   - **Resultado**: Análisis completo con coordenadas mapeadas

3. **TEST 4: Visualización**
   - URL: `/test/analysis`
   - **Propósito**: Verificar que los highlights se muestran correctamente
   - **Cuándo usar**: Después de analizar, para verificar visualización
   - **Resultado**: PDF con highlights precisos

4. **TEST 6: Verificación en BD**
   - **Propósito**: Verificar datos guardados con queries SQL
   - **Cuándo usar**: Para validar que no hay coordenadas repetidas
   - **Resultado**: Confirmación de calidad de datos

**Nota importante**: `/test/diagnose-coordinates` es una herramienta de **diagnóstico** (FASE 1), no de análisis completo. Es útil para entender el PDF antes de analizarlo, pero el análisis real se hace en `/test/policies`.

---

## 2. TEST 0: DIAGNÓSTICO PREVIO DE COORDENADAS (OPCIONAL)

### 2.1 Objetivo

Diagnosticar el sistema de coordenadas del PDF **antes** de analizarlo. Esto ayuda a entender qué esperar y detectar problemas temprano.

### 2.2 Pasos

1. **Navegar a la página de diagnóstico**:
   ```
   http://localhost:3000/[locale]/test/diagnose-coordinates
   ```

2. **Subir el PDF de prueba**:
   - Haz clic en "Seleccionar archivo"
   - Elige el PDF que vas a analizar

3. **Hacer clic en "Analizar PDF"**

4. **Revisar los resultados**:
   - **Información General**: Páginas, bloques de texto
   - **Análisis del Sistema de Coordenadas**: Sistema detectado (relativo vs puntos)
   - **Advertencias**: Problemas detectados (height=0, inconsistencias)
   - **Rangos de Coordenadas**: Min, max, promedio
   - **Distribución por Página**: Cuántos bloques por página
   - **Muestra de Bloques**: Primeros 10 bloques con sus coordenadas

### 2.3 Qué Buscar

✅ **Sistema de Coordenadas**:
- Sistema relativo (0-100) o sistema de puntos
- Conclusión clara sobre cómo convertir coordenadas

⚠️ **Advertencias**:
- "Height siempre es 0" - Esperado (limitación de pdf2json)
- "Sistema inconsistente" - Puede indicar problemas

✅ **Rangos**:
- X, Y, Width, Height dentro de rangos esperados
- Width max no debería exceder 100 si es sistema relativo

### 2.4 Resultados Esperados

✅ **Éxito si**:
- El diagnóstico se completa sin errores
- Se muestra información completa del PDF
- Se detecta el sistema de coordenadas correctamente

❌ **Fallo si**:
- Error al procesar el PDF
- No se muestra información
- Sistema de coordenadas no detectado

### 2.5 Notas

- Este test es **opcional** pero **recomendado** antes de analizar
- Ayuda a entender el PDF y detectar problemas temprano
- Los resultados aquí NO afectan el análisis posterior

---

## 3. TEST 1: ANÁLISIS DE PÓLIZA

### 2.1 Objetivo

Verificar que el análisis de póliza funciona correctamente con el nuevo sistema de scoring.

### 2.2 Pasos

1. **Navegar a la página de testing**:
   ```
   http://localhost:3000/[locale]/test/policies
   ```

2. **Subir un PDF de póliza**:
   - Si ya tienes un PDF subido, usa ese
   - Si no, sube uno desde la interfaz principal

3. **Iniciar análisis**:
   - Ingresa el `artifactId` del PDF
   - Marca el checkbox "Forzar re-análisis" (si ya existe análisis previo)
   - Haz clic en "Analizar Póliza"

4. **Observar logs en terminal**:
   ```
   🤖 Analizando con IA...
   🔍 [Mapeo] Normalizando X referencias con Y coordenadas disponibles
   🔍 [Mapeo 1/X] Campo: "policy_number", Valor: "...", Box actual: {...}
   🔎 Intentando mapeo automático para "policy_number"...
   ✅ Coordenadas mapeadas para "policy_number": página X, box: {...}
   ```

### 2.3 Resultados Esperados

✅ **Éxito si**:
- El análisis se completa sin errores
- Se ven logs de mapeo en la terminal
- Se muestra mensaje de éxito en la UI
- El análisis aparece en la lista de pólizas

❌ **Fallo si**:
- Errores en la terminal
- El análisis no se completa
- No se ven logs de mapeo

### 2.4 Notas

- El análisis puede tardar 30-60 segundos dependiendo del tamaño del PDF
- Los logs de mapeo solo aparecen si hay coordenadas que mapear

---

## 4. TEST 2: VERIFICACIÓN DE COORDENADAS ÚNICAS

### 3.1 Objetivo

Verificar que **NO hay coordenadas repetidas** (problema resuelto en FASE 2).

### 3.2 Pasos

1. **Obtener el ID del análisis**:
   - Desde la UI, copia el `analysisId` del análisis recién creado
   - O desde la terminal, busca el log: `✅ Análisis completado - ID: ...`

2. **Ejecutar query SQL**:
   ```sql
   -- Query para encontrar coordenadas repetidas
   SELECT 
     bounding_box,
     COUNT(*) as veces_repetida,
     STRING_AGG(field_name, ', ') as campos_afectados
   FROM policy_page_references
   WHERE policy_analysis_id = 'TU_ANALYSIS_ID_AQUI'
     AND bounding_box IS NOT NULL
   GROUP BY bounding_box
   HAVING COUNT(*) > 1
   ORDER BY veces_repetida DESC;
   ```

3. **Verificar resultados**:
   - **ANTES de FASE 2**: Habría múltiples filas con `veces_repetida > 1`
   - **DESPUÉS de FASE 2**: Debe retornar **0 filas** (ninguna coordenada repetida)

### 3.3 Resultados Esperados

✅ **Éxito si**:
- La query retorna **0 filas** (ninguna coordenada repetida)
- Cada campo tiene coordenadas únicas

❌ **Fallo si**:
- Hay coordenadas repetidas (múltiples campos con mismo `bounding_box`)
- Más de 2-3 campos comparten coordenadas

### 3.4 Query Adicional: Verificar Coordenadas Inválidas

```sql
-- Verificar coordenadas inválidas (width = 0 o height = 0)
SELECT 
  field_name,
  page_number,
  bounding_box,
  field_value
FROM policy_page_references
WHERE policy_analysis_id = 'TU_ANALYSIS_ID_AQUI'
  AND (
    (bounding_box->>'width')::numeric = 0
    OR (bounding_box->>'height')::numeric = 0
  )
ORDER BY page_number, field_name;
```

**Resultado Esperado**: 
- Debe haber **pocas o ninguna** coordenada inválida
- Si hay, deben ser casos donde `height = 0` (limitación conocida de pdf2json)

---

## 5. TEST 3: VERIFICACIÓN DE SCORING

### 4.1 Objetivo

Verificar que el sistema de scoring selecciona el **mejor match** (no el primero).

### 4.2 Pasos

1. **Abrir DevTools del navegador** (F12)

2. **Navegar a la consola**

3. **Buscar logs de scoring**:
   ```
   🎯 [Mapeo] Encontrados X matches para "..." - Mejor score: Y
   ```

4. **Verificar que se selecciona el mejor match**:
   - Los logs muestran múltiples matches encontrados
   - Se selecciona el match con mejor score
   - No siempre es el primer match encontrado

### 4.3 Verificación Manual

1. **Identificar un campo con valor repetido**:
   - Ejemplo: `policy_number` que aparece en múltiples páginas
   - O un valor numérico como "15000" que aparece varias veces

2. **Verificar en base de datos**:
   ```sql
   -- Ver todas las referencias de un campo específico
   SELECT 
     field_name,
     field_value,
     page_number,
     bounding_box,
     confidence
   FROM policy_page_references
   WHERE policy_analysis_id = 'TU_ANALYSIS_ID_AQUI'
     AND field_name = 'policy_number'
   ORDER BY page_number;
   ```

3. **Verificar que cada referencia tiene coordenadas diferentes**:
   - Si el valor aparece en página 1 y página 2, deben tener coordenadas diferentes
   - Las coordenadas deben corresponder a la página correcta

### 4.4 Resultados Esperados

✅ **Éxito si**:
- Se ven logs de scoring en la consola (en desarrollo)
- Cada campo tiene coordenadas únicas
- Las coordenadas corresponden a la página correcta

❌ **Fallo si**:
- Múltiples campos comparten coordenadas
- Las coordenadas no corresponden a la página esperada

---

## 6. TEST 4: VERIFICACIÓN DE HIGHLIGHTS

### 5.1 Objetivo

Verificar que los highlights se muestran correctamente en el visor de PDF.

### 5.2 Pasos

1. **Navegar a la página de análisis**:
   ```
   http://localhost:3000/[locale]/test/analysis
   ```

2. **Seleccionar un análisis**:
   - Ingresa el `caseId` del caso con el análisis
   - Selecciona un análisis de la lista

3. **Verificar que el PDF se carga**:
   - El PDF debe aparecer en el panel izquierdo
   - Debe poder navegar entre páginas

4. **Verificar highlights**:
   - Los highlights deben aparecer como rectángulos coloreados sobre el texto
   - Cada highlight debe corresponder a un campo del análisis
   - Los highlights deben estar en la ubicación correcta del texto

5. **Probar interacción**:
   - Hacer clic en un highlight debe mostrar información del campo
   - Hacer clic en un campo en el panel derecho debe navegar al highlight

### 5.3 Verificación Específica

1. **Verificar que NO hay highlights superpuestos**:
   - Si antes había 8 campos con las mismas coordenadas, ahora deben estar en ubicaciones diferentes
   - Cada highlight debe ser único

2. **Verificar precisión**:
   - Los highlights deben estar sobre el texto correcto
   - No deben estar desplazados o en ubicaciones incorrectas

### 5.4 Resultados Esperados

✅ **Éxito si**:
- El PDF se carga correctamente
- Los highlights aparecen en las ubicaciones correctas
- No hay highlights superpuestos
- La interacción funciona (click en highlight/campo)

❌ **Fallo si**:
- El PDF no se carga
- Los highlights no aparecen
- Hay highlights superpuestos
- Los highlights están en ubicaciones incorrectas

---

## 7. TEST 5: VERIFICACIÓN DE LOGS

### 6.1 Objetivo

Verificar que los logs de debugging muestran información útil sobre el mapeo.

### 6.2 Pasos

1. **Abrir terminal donde corre la aplicación**

2. **Buscar logs de mapeo durante el análisis**:
   ```
   🔍 [Mapeo] Normalizando X referencias con Y coordenadas disponibles
   🔍 [Mapeo 1/X] Campo: "policy_number", Valor: "...", Box actual: {...}
   🔎 Intentando mapeo automático para "policy_number"...
   ✅ Coordenadas mapeadas para "policy_number": página X, box: {...}
   ```

3. **Verificar logs de scoring** (solo en desarrollo):
   ```
   🎯 [Mapeo] Encontrados X matches para "..." - Mejor score: Y
   ```

### 6.3 Logs Esperados

**Durante el análisis**:
- ✅ Logs de normalización
- ✅ Logs de mapeo para cada campo
- ✅ Logs de éxito cuando se mapean coordenadas
- ✅ Logs de advertencia cuando no se encuentran coordenadas

**En desarrollo**:
- ✅ Logs de scoring cuando hay múltiples matches

### 6.4 Resultados Esperados

✅ **Éxito si**:
- Se ven logs informativos durante el análisis
- Los logs muestran el proceso de mapeo
- Los logs ayudan a entender qué está pasando

❌ **Fallo si**:
- No hay logs de mapeo
- Los logs muestran errores
- Los logs no son informativos

---

## 8. TEST 6: VERIFICACIÓN DE BASE DE DATOS

### 7.1 Objetivo

Verificar que los datos guardados en la base de datos son correctos.

### 7.2 Queries de Verificación

#### Query 1: Resumen de Referencias

```sql
-- Resumen general de referencias
SELECT 
  COUNT(*) as total_referencias,
  COUNT(DISTINCT bounding_box) as coordenadas_unicas,
  COUNT(*) - COUNT(DISTINCT bounding_box) as coordenadas_repetidas,
  COUNT(CASE WHEN (bounding_box->>'width')::numeric > 0 THEN 1 END) as con_width_valido,
  COUNT(CASE WHEN (bounding_box->>'height')::numeric > 0 THEN 1 END) as con_height_valido
FROM policy_page_references
WHERE policy_analysis_id = 'TU_ANALYSIS_ID_AQUI';
```

**Resultado Esperado**:
- `coordenadas_repetidas` debe ser **0** o muy bajo (< 2)
- `con_width_valido` debe ser alto (> 80% de referencias)
- `con_height_valido` puede ser menor (limitación de pdf2json)

#### Query 2: Distribución por Campo

```sql
-- Ver distribución de referencias por campo
SELECT 
  field_name,
  COUNT(*) as total,
  COUNT(DISTINCT bounding_box) as coordenadas_unicas,
  COUNT(DISTINCT page_number) as paginas_diferentes,
  AVG((bounding_box->>'width')::numeric) as avg_width,
  AVG((bounding_box->>'height')::numeric) as avg_height
FROM policy_page_references
WHERE policy_analysis_id = 'TU_ANALYSIS_ID_AQUI'
GROUP BY field_name
ORDER BY total DESC;
```

**Resultado Esperado**:
- Cada campo debe tener coordenadas únicas (o muy pocas repetidas)
- Los campos que aparecen en múltiples páginas deben tener `paginas_diferentes > 1`

#### Query 3: Verificar Campos con Mismo Valor

```sql
-- Encontrar campos que comparten el mismo valor
SELECT 
  field_value,
  COUNT(*) as veces_usado,
  STRING_AGG(DISTINCT field_name, ', ') as campos_afectados,
  COUNT(DISTINCT bounding_box) as coordenadas_diferentes
FROM policy_page_references
WHERE policy_analysis_id = 'TU_ANALYSIS_ID_AQUI'
  AND field_value IS NOT NULL
  AND field_value != ''
GROUP BY field_value
HAVING COUNT(*) > 1
ORDER BY veces_usado DESC;
```

**Resultado Esperado**:
- Si un valor aparece en múltiples campos, deben tener `coordenadas_diferentes` igual o cercano a `veces_usado`
- Ejemplo: Si "15000" aparece 3 veces, debe tener 3 coordenadas diferentes (o al menos 2-3)

### 7.3 Resultados Esperados

✅ **Éxito si**:
- `coordenadas_repetidas` es 0 o muy bajo
- Cada campo tiene coordenadas únicas
- Los campos con mismo valor tienen coordenadas diferentes

❌ **Fallo si**:
- `coordenadas_repetidas` es alto (> 3)
- Múltiples campos comparten coordenadas
- Los campos con mismo valor tienen las mismas coordenadas

---

## 9. CHECKLIST FINAL

### 8.1 Funcionalidad Core

- [ ] El análisis de póliza se completa sin errores
- [ ] Los logs de mapeo aparecen en la terminal
- [ ] El análisis se guarda correctamente en la BD

### 8.2 Coordenadas

- [ ] **0 coordenadas repetidas** (query SQL retorna 0 filas)
- [ ] Cada campo tiene coordenadas únicas
- [ ] Las coordenadas corresponden a la página correcta
- [ ] Pocas o ninguna coordenada inválida (width=0)

### 8.3 Scoring

- [ ] Los logs muestran múltiples matches cuando aplica
- [ ] Se selecciona el mejor match (no siempre el primero)
- [ ] Los campos con mismo valor tienen coordenadas diferentes

### 8.4 Visualización

- [ ] El PDF se carga correctamente
- [ ] Los highlights aparecen en las ubicaciones correctas
- [ ] **NO hay highlights superpuestos**
- [ ] La interacción funciona (click en highlight/campo)

### 8.5 Logs

- [ ] Logs informativos durante el análisis
- [ ] Logs de scoring en desarrollo
- [ ] Logs de éxito/error claros

### 8.6 Base de Datos

- [ ] Datos guardados correctamente
- [ ] Coordenadas válidas (width > 0)
- [ ] Relaciones correctas (policy_analysis_id, etc.)

---

## 10. PROBLEMAS COMUNES Y SOLUCIONES

### 9.1 "No se ven highlights"

**Posibles causas**:
- El PDF no se ha analizado aún
- Las coordenadas están en (0,0,0,0)
- El visor de PDF no está configurado correctamente

**Solución**:
1. Verificar que el análisis se completó
2. Verificar coordenadas en BD (query SQL)
3. Verificar logs de mapeo en terminal

### 9.2 "Coordenadas repetidas"

**Posibles causas**:
- El análisis es anterior a FASE 2
- El valor aparece solo una vez en el PDF

**Solución**:
1. Re-analizar con `force: true`
2. Verificar que el código de FASE 2 está activo
3. Verificar logs de scoring

### 9.3 "Logs no aparecen"

**Posibles causas**:
- Estás en producción (logs solo en desarrollo)
- El análisis no está usando el nuevo código

**Solución**:
1. Verificar `NODE_ENV === 'development'`
2. Verificar que el código de FASE 2 está desplegado
3. Re-analizar con `force: true`

---

## 11. MÉTRICAS DE ÉXITO

### 10.1 Métricas Cuantitativas

- ✅ **Coordenadas repetidas**: 0 (o < 2)
- ✅ **Coordenadas válidas**: > 80% con width > 0
- ✅ **Precisión de mapeo**: > 90% de campos con coordenadas correctas
- ✅ **Tiempo de análisis**: < 60 segundos para PDFs normales

### 10.2 Métricas Cualitativas

- ✅ Highlights precisos y visibles
- ✅ No hay superposición de highlights
- ✅ Logs informativos y útiles
- ✅ Experiencia de usuario fluida

---

## 12. CONCLUSIÓN

Si todos los tests pasan, **FASE 2 está implementada correctamente** y puedes proceder con FASE 3.

Si algún test falla, revisa:
1. Los logs en terminal
2. Los datos en base de datos
3. La documentación de corrección de errores

---

**Documento creado**: 16 de Noviembre, 2025  
**Última actualización**: 16 de Noviembre, 2025  
**Autor**: AI Assistant (Auto)  
**Revisado por**: Pendiente
