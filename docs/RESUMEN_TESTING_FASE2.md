# 🧪 RESUMEN EJECUTIVO - GUÍA DE TESTING FASE 2

**Fecha**: 16 de Noviembre, 2025  
**Objetivo**: Validar que FASE 2 funciona correctamente antes de continuar con FASE 3

---

## 🎯 FLUJO DE TESTING RECOMENDADO

### Paso 1: Diagnóstico Previo (Opcional pero Recomendado)

**URL**: `http://localhost:3000/[locale]/test/diagnose-coordinates`

**Qué hacer**:
1. Subir el PDF que vas a analizar
2. Hacer clic en "Analizar PDF"
3. Revisar resultados:
   - ✅ Sistema de coordenadas detectado (relativo vs puntos)
   - ⚠️ Advertencias (height=0 es esperado)
   - 📊 Rangos de coordenadas

**Propósito**: Entender el PDF antes de analizarlo, detectar problemas temprano

**Tiempo**: ~5 segundos

---

### Paso 2: Análisis Completo (Obligatorio)

**URL**: `http://localhost:3000/[locale]/test/policies`

**Qué hacer**:
1. Ingresar el `artifactId` del PDF
2. Marcar "Forzar re-análisis" (si ya existe análisis previo)
3. Hacer clic en "Analizar Póliza"
4. Esperar 30-60 segundos
5. Verificar en terminal:
   ```
   🔍 [Mapeo] Normalizando X referencias...
   ✅ Coordenadas mapeadas para "campo": página X, box: {...}
   ```

**Qué validar**:
- ✅ Análisis se completa sin errores
- ✅ Logs de mapeo aparecen en terminal
- ✅ Mensaje de éxito en UI
- ✅ Análisis aparece en lista

**Propósito**: Validar que el sistema de scoring funciona y mapea coordenadas correctamente

**Tiempo**: 30-60 segundos

---

### Paso 3: Visualización de Highlights (Obligatorio)

**URL**: `http://localhost:3000/[locale]/test/analysis`

**Qué hacer**:
1. Ingresar el `caseId` del caso
2. Seleccionar el análisis de la lista
3. Verificar que:
   - ✅ PDF se carga correctamente
   - ✅ Highlights aparecen sobre el texto
   - ✅ **NO hay highlights superpuestos** (crítico)
   - ✅ Cada highlight está en ubicación correcta
   - ✅ Click en highlight/campo funciona

**Qué validar visualmente**:
- Highlights precisos (sobre el texto correcto)
- Sin superposición (cada campo en ubicación única)
- Navegación funciona (click navega al highlight)

**Propósito**: Verificar que los highlights se renderizan correctamente con coordenadas únicas

**Tiempo**: Inmediato (después de cargar)

---

### Paso 4: Verificación en Base de Datos (Obligatorio)

**Herramienta**: Supabase Dashboard (SQL Editor) o cualquier cliente SQL

**Query 1: Coordenadas Repetidas** (CRÍTICO)
```sql
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

**Resultado Esperado**: ✅ **0 filas** (ninguna coordenada repetida)

**Query 2: Resumen General**
```sql
SELECT 
  COUNT(*) as total_referencias,
  COUNT(DISTINCT bounding_box) as coordenadas_unicas,
  COUNT(*) - COUNT(DISTINCT bounding_box) as coordenadas_repetidas
FROM policy_page_references
WHERE policy_analysis_id = 'TU_ANALYSIS_ID_AQUI';
```

**Resultado Esperado**: 
- ✅ `coordenadas_repetidas = 0` (o muy bajo < 2)

**Propósito**: Confirmar que no hay coordenadas repetidas (problema resuelto en FASE 2)

**Tiempo**: ~30 segundos

---

## ✅ CHECKLIST DE VALIDACIÓN

### Funcionalidad Core
- [ ] Análisis se completa sin errores
- [ ] Logs de mapeo aparecen en terminal
- [ ] Análisis se guarda correctamente

### Coordenadas (CRÍTICO)
- [ ] **0 coordenadas repetidas** (query SQL retorna 0 filas)
- [ ] Cada campo tiene coordenadas únicas
- [ ] Coordenadas corresponden a página correcta

### Visualización (CRÍTICO)
- [ ] PDF se carga correctamente
- [ ] Highlights aparecen en ubicaciones correctas
- [ ] **NO hay highlights superpuestos**
- [ ] Interacción funciona (click en highlight/campo)

### Logs
- [ ] Logs informativos durante análisis
- [ ] Logs de scoring en desarrollo (si hay múltiples matches)

---

## 🎯 MÉTRICAS DE ÉXITO

### Cuantitativas
- ✅ **Coordenadas repetidas**: 0 (o < 2)
- ✅ **Coordenadas válidas**: > 80% con width > 0
- ✅ **Tiempo de análisis**: < 60 segundos

### Cualitativas
- ✅ Highlights precisos y visibles
- ✅ Sin superposición de highlights
- ✅ Experiencia de usuario fluida

---

## ⚠️ PROBLEMAS COMUNES

### "No se ven highlights"
- Verificar que el análisis se completó
- Verificar coordenadas en BD (query SQL)
- Verificar logs de mapeo en terminal

### "Coordenadas repetidas"
- Re-analizar con `force: true`
- Verificar que código de FASE 2 está activo
- Verificar logs de scoring

### "Logs no aparecen"
- Verificar `NODE_ENV === 'development'`
- Verificar que código de FASE 2 está desplegado
- Re-analizar con `force: true`

---

## 📝 NOTAS IMPORTANTES

1. **`/test/diagnose-coordinates`** es herramienta de **diagnóstico** (FASE 1), útil para entender el PDF antes de analizar, pero **NO es obligatorio** para validar FASE 2.

2. **`/test/policies`** es donde se valida el **análisis completo** con sistema de scoring (FASE 2).

3. **`/test/analysis`** es donde se valida la **visualización** de highlights (FASE 2).

4. **Queries SQL** son necesarias para **confirmar** que no hay coordenadas repetidas (validación crítica).

---

## 🚀 PRÓXIMOS PASOS

Si todos los tests pasan:
- ✅ **FASE 2 está implementada correctamente**
- ✅ Puedes proceder con **FASE 3**

Si algún test falla:
- Revisar logs en terminal
- Revisar datos en base de datos
- Consultar documentación completa: `docs/GUIA_TESTING_FASE2.md`

---

**Documento creado**: 16 de Noviembre, 2025  
**Versión**: Resumen Ejecutivo  
**Documento completo**: `docs/GUIA_TESTING_FASE2.md`

