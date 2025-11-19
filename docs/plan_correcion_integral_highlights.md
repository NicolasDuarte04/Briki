plan_correccion_integral_highlights.md

## 5. FUNCIONALIDADES SUSCEPTIBLES DE ROMPERSE

### 5.1 Componentes Directamente Afectados

#### 🔴 RIESGO CRÍTICO: `src/lib/openai/policyAnalysis.ts`

**Función**: `findCoordinatesForValue()` (líneas 414-459)

**Cambio propuesto**: Reemplazar por `findBestCoordinatesForValue()` con scoring

**Por qué podría romperse**:
- Firma cambia (añade `fieldName` y `expectedPage`)
- Lógica completamente diferente (loop completo vs primer match)
- Podría retornar `null` donde antes retornaba coordenadas inválidas

**Impacto si se rompe**:
- ❌ API `/api/policies/analyze` falla completamente
- ❌ No se pueden crear nuevos análisis
- ✅ Análisis existentes en BD NO afectados

**Mitigación**:
1. Tests unitarios exhaustivos antes del cambio
2. Mantener función vieja como fallback temporalmente
3. Feature flag para activar/desactivar nueva lógica
4. Logging detallado para comparar resultados

---

#### 🔴 RIESGO CRÍTICO: `src/components/Analysis/PdfViewer.tsx`

**Función**: Cálculo de píxeles para highlights (líneas 321-324)

**Cambio propuesto**: Nueva función `calculateHighlightPosition()` con viewport de react-pdf

**Por qué podría romperse**:
- react-pdf podría no exponer `onPageLoadSuccess` con dimensiones
- Diferentes PDFs tienen diferentes sistemas de coordenadas
- Necesita testing con múltiples PDFs

**Impacto si se rompe**:
- ❌ Highlights aún invisibles o en posición incorrecta
- ⚠️ Posibles errores de renderizado
- ✅ PDF aún se visualiza (solo highlights afectados)

**Mitigación**:
1. Consultar documentación de react-pdf
2. Tests con 10+ PDFs de diferentes orígenes
3. Logging de dimensiones para debugging
4. Fallback a sistema anterior si falla

---

#### 🟡 RIESGO MEDIO: `src/app/api/policies/analyze/route.ts`

**Línea afectada**: 145-149 (llamada a `analyzeWithAI`)

**Cambio propuesto**: Pasar más coordenadas y aumentar max_tokens

**Por qué podría romperse**:
- Aumento de costo de API (podría exceder cuota)
- Timeout si OpenAI tarda mucho
- Respuesta truncada si excede max_tokens

**Impacto si se rompe**:
- ❌ Timeouts en análisis de PDFs grandes
- ⚠️ Costos de OpenAI aumentan
- ✅ Análisis existentes NO afectados

**Mitigación**:
1. Configurar timeout apropiado (60s)
2. Monitorear costos de OpenAI
3. Aumentar max_tokens gradualmente (4000 → 5000 → 6000)
4. Retry logic con backoff

---

### 5.2 Componentes Indirectamente Afectados

#### 🟢 RIESGO BAJO: `src/components/Analysis/FindingsList.tsx`

**Cambio**: Ninguno directo, pero podría recibir más referencias

**Por qué podría afectarse**:
- Más referencias = más elementos en lista
- UI podría saturarse visualmente

**Impacto si se afecta**:
- ⚠️ Scroll performance
- ⚠️ UX confusa con 20 elementos

**Mitigación**:
1. Virtualización de lista si >15 elementos
2. Agrupación por tipo (financials, coverages, etc.)
3. Paginación o "Load more"

---

#### 🟢 RIESGO BAJO: `src/components/Workspace/Policies.tsx`

**Cambio**: Ninguno directo, pero tabla podría tener más filas

**Por qué podría afectarse**:
- Más análisis = más filas en tabla
- Cada fila con más referencias

**Impacto si se afecta**:
- ⚠️ Performance de tabla
- ✅ TanStack Table maneja esto bien

**Mitigación**:
1. TanStack Table ya tiene paginación
2. Lazy loading de referencias
3. Optimización de renders

---

### 5.3 Flujos de Usuario Afectados

| Flujo | Impacto | Mitigación |
|-------|---------|------------|
| **Upload PDF** | ✅ Sin cambio | N/A |
| **Analizar Póliza** | ⚠️ Tarda más (10-30s) | Progress indicator |
| **Ver Análisis** | ✅ Mejora (highlights visibles) | N/A |
| **Click "Ver en PDF"** | ✅ Mejora (scroll correcto) | N/A |
| **Chat con referencias** | ✅ Sin cambio | N/A |

---

## 6. PLAN DE IMPLEMENTACIÓN PASO A PASO

### FASE 1: Investigación y Preparación (1 día)

**Objetivo**: Entender completamente el sistema de coordenadas de pdf2json

#### Tareas:
1. **Crear script de diagnóstico**:
   ```typescript
   // scripts/diagnose-pdf-coordinates.ts
   import fs from 'fs';
   import { extractWithCoordinates } from '@/lib/pdf/extraction';
   
   async function diagnosePdf(pdfPath: string) {
     const buffer = fs.readFileSync(pdfPath);
     const result = await extractWithCoordinates(buffer);
     
     console.log('📄 PDF Analysis:');
     console.log('  Pages:', result.pages);
     console.log('  Text blocks:', result.coordinates.length);
     
     // Analizar rango de coordenadas
     const xValues = result.coordinates.map(c => c.x);
     const yValues = result.coordinates.map(c => c.y);
     const widthValues = result.coordinates.map(c => c.width);
     const heightValues = result.coordinates.map(c => c.height);
     
     console.log('\n📊 Coordinate Ranges:');
     console.log('  X: min=', Math.min(...xValues), 'max=', Math.max(...xValues));
     console.log('  Y: min=', Math.min(...yValues), 'max=', Math.max(...yValues));
     console.log('  Width: min=', Math.min(...widthValues), 'max=', Math.max(...widthValues));
     console.log('  Height: min=', Math.min(...heightValues), 'max=', Math.max(...heightValues));
     
     // Muestrear primeros 10 bloques
     console.log('\n📝 Sample Blocks (first 10):');
     result.coordinates.slice(0, 10).forEach((coord, i) => {
       console.log(`  [${i}] "${coord.text.substring(0, 30)}"`, coord);
     });
   }
   
   diagnosePdf('test-fixtures/sample-policy.pdf');
   ```

2. **Ejecutar con 3-5 PDFs diferentes**
3. **Documentar hallazgos** sobre sistema de unidades
4. **Confirmar hipótesis** sobre puntos vs relativos

#### Entregables:
- ✅ Documentación del sistema de coordenadas
- ✅ Script de diagnóstico reusable
- ✅ Datos de prueba de 3-5 PDFs

---

### FASE 2: Implementar Mejora de Mapeo (2-3 días)

**Objetivo**: Eliminar coordenadas repetidas

#### Tareas:
1. **Crear `findBestCoordinatesForValue()`** en `src/lib/openai/policyAnalysis.ts`
2. **Crear funciones auxiliares**:
   - `getKnownLabelsForField()`
   - `getNearbyText()`
3. **Actualizar `normalizeAnalysisResult()`** para usar nueva función
4. **Tests unitarios**:
   ```typescript
   // tests/lib/openai/policyAnalysis.test.ts
   describe('findBestCoordinatesForValue', () => {
     it('should prioritize expected page', () => {
       const coords = [
         { text: '15000', page: 1, x: 10, y: 20, width: 30, height: 5 },
         { text: '15000', page: 3, x: 15, y: 25, width: 35, height: 6 }
       ];
       
       const result = findBestCoordinatesForValue(
         'premium_total',
         '15000',
         coords,
         3  // Expected page
       );
       
       expect(result?.page).toBe(3);
     });
     
     it('should reject invalid dimensions', () => {
       const coords = [
         { text: '15000', page: 1, x: 10, y: 20, width: 0.5, height: 0 }
       ];
       
       const result = findBestCoordinatesForValue(
         'premium_total',
         '15000',
         coords
       );
       
       expect(result).toBeNull();
     });
     
     // ... más tests
   });
   ```
5. **Feature flag** para activar/desactivar
6. **Logging detallado** para comparar con función vieja

#### Entregables:
- ✅ Función `findBestCoordinatesForValue()` implementada
- ✅ Tests passing (>90% coverage)
- ✅ Feature flag configurado
- ✅ PR con documentación

---

### FASE 3: Mejorar Prompt de IA (1-2 días)

**Objetivo**: Generar 15-20 referencias

#### Tareas:
1. **Implementar `smartSampleCoordinates()`**
2. **Actualizar `buildAnalysisPrompt()`**:
   - Cambiar instrucción de "campos principales" a "15-20 referencias"
   - Incluir tipos específicos (coberturas, exclusiones)
3. **Aumentar `max_tokens`**: 4000 → 6000
4. **Tests de integración**:
   ```typescript
   // tests/api/policies/analyze-integration.test.ts
   it('should generate at least 15 references for large PDF', async () => {
     const largePdf = fs.readFileSync('test-fixtures/large-policy.pdf');
     // ... upload
     
     const analyzeRes = await fetch('/api/policies/analyze', {
       method: 'POST',
       body: JSON.stringify({ artifactId: artifact.id })
     });
     
     const { analysis } = await analyzeRes.json();
     
     expect(analysis.pageReferences.length).toBeGreaterThanOrEqual(15);
   });
   ```
5. **Monitorear costos** en staging
6. **Ajustar si es necesario**

#### Entregables:
- ✅ Prompt mejorado
- ✅ Sampling inteligente implementado
- ✅ Tests passing
- ✅ Análisis de costos

---

### FASE 4: Validación de Coordenadas (1 día)

**Objetivo**: Filtrar coordenadas inválidas antes de BD

#### Tareas:
1. **Actualizar `normalizeAnalysisResult()`**:
   - Validar dimensiones mínimas
   - Validar rango de coordenadas
   - Filtrar referencias inválidas
2. **Tests**:
   ```typescript
   it('should filter invalid coordinates', () => {
     const result = {
       data: {},
       confidence: 0.9,
       pageReferences: [
         { field: 'valid', value: '123', page: 1, box: { x: 10, y: 20, width: 30, height: 5 }, confidence: 0.9 },
         { field: 'invalid_dim', value: '456', page: 1, box: { x: 10, y: 20, width: 0.5, height: 0 }, confidence: 0.9 },
         { field: 'negative', value: '789', page: 1, box: { x: -10, y: 20, width: 30, height: 5 }, confidence: 0.9 }
       ]
     };
     
     const normalized = normalizeAnalysisResult(result, []);
     
     expect(normalized.pageReferences).toHaveLength(1);
     expect(normalized.pageReferences[0].field).toBe('valid');
   });
   ```
3. **Documentar criterios de validación**

#### Entregables:
- ✅ Validación implementada
- ✅ Tests passing
- ✅ Documentación actualizada

---

### FASE 5: Corregir Cálculo de Píxeles (2-3 días)

**Objetivo**: Highlights visibles en posición correcta

#### Tareas:
1. **Consultar documentación de react-pdf**:
   - Confirmar API de `onPageLoadSuccess`
   - Obtener `originalWidth`, `originalHeight`, `width`, `height`
2. **Implementar `calculateHighlightPosition()`** en `PdfViewer.tsx`
3. **Añadir estado para dimensiones de página**
4. **Tests con diferentes PDFs**:
   - PDF estándar (8.5x11 inch)
   - PDF A4 (21x29.7 cm)
   - PDF carta (8.5x14 inch)
   - PDF con orientación landscape
5. **Ajustar cálculo según hallazgos** de FASE 1
6. **Logging para debugging**:
   ```typescript
   console.log('📏 [PdfViewer] Dimensions:', {
     original: { width: originalWidth, height: originalHeight },
     rendered: { width: renderedWidth, height: renderedHeight },
     scale
   });
   
   console.log('🎯 [PdfViewer] Highlight:', {
     input: boundingBox,
     calculated: { left, top, width, height }
   });
   ```

#### Entregables:
- ✅ Cálculo de píxeles corregido
- ✅ Tests con múltiples PDFs
- ✅ Highlights visibles
- ✅ Documentación del cálculo

---

### FASE 6: Re-análisis de Datos Existentes (1 día)

**Objetivo**: Aplicar mejoras a análisis ya guardados en BD

#### Tareas:
1. **Crear script de migración**:
   ```typescript
   // scripts/reanalyze-policies.ts
   import { prisma } from '@/lib/prisma';
   import { analyzeWithAI } from '@/lib/openai/policyAnalysis';
   
   async function reanalyzeAll() {
     const analyses = await prisma.policyAnalysis.findMany({
       where: {
         // Filtrar solo análisis con pocas referencias
         pageReferences: {
           count: { lt: 15 }
         }
       },
       include: { artifact: true }
     });
     
     console.log(`🔄 Re-analyzing ${analyses.length} policies...`);
     
     for (const analysis of analyses) {
       try {
         // Re-descargar y re-analizar
         // ... (lógica similar a /api/policies/analyze)
         
         console.log(`✅ Re-analyzed ${analysis.id}`);
       } catch (err) {
         console.error(`❌ Failed to re-analyze ${analysis.id}:`, err);
       }
     }
   }
   
   reanalyzeAll();
   ```
2. **Ejecutar en staging** primero
3. **Verificar resultados**
4. **Ejecutar en production** (con backup previo)

#### Entregables:
- ✅ Script de re-análisis
- ✅ Análisis actualizados en BD
- ✅ Verificación de mejoras

---

### FASE 7: Testing End-to-End (1-2 días)

**Objetivo**: Verificar flujo completo funciona

#### Tareas:
1. **Test: Upload → Analyze → View → Highlights visibles**
2. **Test: Click en "Ver en PDF" → Scroll correcto**
3. **Test: Click en hallazgo → Highlight correcto**
4. **Test: Diferentes PDFs** (10+ muestras)
5. **Test de regresión**:
   - ✅ Funcionalidades existentes intactas
   - ✅ Performance aceptable
   - ✅ No errores en consola
6. **User Acceptance Testing** (UAT) con usuario real

#### Entregables:
- ✅ Suite de tests E2E passing
- ✅ Informe de UAT
- ✅ Bugs identificados (si existen) y corregidos

---

## 7. CRITERIOS DE ÉXITO

### 7.1 Métricas Cuantitativas

- ✅ **Coordenadas únicas**: <5% repetidas (actualmente 80%)
- ✅ **Coordenadas válidas**: >95% (actualmente ~80%)
- ✅ **Referencias por análisis**: 15-20 para docs grandes (actualmente 10)
- ✅ **Highlights visibles**: 100% (actualmente 0%)
- ✅ **Precisión de posición**: ±20px (actualmente infinito)

### 7.2 Métricas Cualitativas

- ✅ Usuario puede ver highlights al abrir "Analysis" tab
- ✅ Click en hallazgo → scroll y highlight en posición correcta
- ✅ Diferentes campos tienen highlights diferentes (no sobrepuestos)
- ✅ Experiencia fluida sin lag o errores

### 7.3 Métricas de Calidad de Código

- ✅ Cobertura de tests: >85%
- ✅ Linter sin errores
- ✅ TypeScript sin errores de tipo
- ✅ Documentación actualizada
- ✅ Logging apropiado para debugging

---

## 8. RESUMEN EJECUTIVO

### Situación Actual
- 🔴 **Highlights invisibles**: Cálculo de píxeles incorrecto
- 🔴 **Coordenadas repetidas**: 80% de campos comparten mismas coordenadas
- 🟡 **Pocas referencias**: Solo 10 vs esperadas 15-20
- 🟡 **Coordenadas inválidas**: 20% tienen dimensiones ~0

### Soluciones Propuestas
1. **Mapeo inteligente** con scoring y contexto → Elimina repeticiones
2. **Prompt de IA mejorado** → Genera 15-20 referencias
3. **Validación robusta** → Filtra coordenadas inválidas
4. **Cálculo correcto de píxeles** → Highlights visibles

### Riesgos Principales
- 🔴 **Alto**: Cambios en lógica core (mapeo y renderizado)
- 🟡 **Medio**: Aumento de costos de API (+50%)
- 🟢 **Bajo**: Funcionalidades existentes (aisladas)

### Tiempo Estimado
- **Total**: 8-12 días de desarrollo
- **Testing**: 2-3 días adicionales
- **Re-análisis de datos**: 1 día
- **TOTAL**: ~2-3 semanas

### Impacto Esperado
- ✅ Funcionalidad "Ver en PDF" completamente funcional
- ✅ Experiencia de usuario significativamente mejorada
- ✅ Confianza en el sistema restaurada
- ⚠️ Costos de OpenAI aumentan ~50%

---

## 9. PRÓXIMOS PASOS

1. ✅ **Validar este análisis** con el usuario
2. ✅ **Aprobar el plan** de implementación
3. ⏳ **Comenzar FASE 1** (Investigación)
4. ⏳ **Implementar fase por fase** con validación entre fases
5. ⏳ **Testing exhaustivo** antes de production
6. ⏳ **Deploy gradual** con feature flag
7. ⏳ **Monitoreo post-deploy**

---

**FIN DEL ANÁLISIS EXHAUSTIVO**

**Autor**: Agente Asistente IA  
**Fecha**: 17 de Noviembre, 2025  
**Estado**: ✅ **COMPLETO - LISTO PARA REVISIÓN DEL USUARIO**

EOF

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ANÁLISIS EXHAUSTIVO COMPLETADO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📄 Archivos generados:"
echo "  • /tmp/analisis_exhaustivo_highlights.md"
echo "  • /tmp/plan_correccion_integral_highlights.md"
echo ""
echo "📊 Resumen:"
echo "  • Problemas identificados: 4 críticos"
echo "  • Soluciones propuestas: 4 integrales"
echo "  • Fases de implementación: 7 fases"
echo "  • Tiempo estimado: 2-3 semanas"
echo ""
cat /tmp/plan_correccion_integral_highlights.md