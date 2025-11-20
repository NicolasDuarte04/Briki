# 📊 FASE 1: INVESTIGACIÓN Y PREPARACIÓN - DOCUMENTACIÓN COMPLETA

**Fecha de Implementación**: 17 de Noviembre, 2025  
**Estado**: ✅ **COMPLETADA**  
**Objetivo**: Entender completamente el sistema de coordenadas de pdf2json para determinar cómo mapear correctamente a píxeles en el visor

---

## 📋 RESUMEN EJECUTIVO

La FASE 1 se enfoca en investigar y documentar el sistema de coordenadas utilizado por `pdf2json` para extraer texto y posiciones de bloques en PDFs. Esta investigación es fundamental para corregir el cálculo de píxeles en el componente `PdfViewer`, que actualmente asume incorrectamente que las coordenadas están en pulgadas.

### Objetivos Cumplidos

✅ Script de diagnóstico creado para analizar coordenadas de PDFs  
✅ Estructura de directorios preparada (`test-fixtures/`)  
✅ Herramienta reusable para análisis de múltiples PDFs  
✅ Análisis comparativo entre diferentes PDFs

---

## 🔧 IMPLEMENTACIONES REALIZADAS

### 1. Script de Diagnóstico: `scripts/diagnose-pdf-coordinates.ts`

**Ubicación**: `/home/liones_messi/Documentos/trabajo/Briki/scripts/diagnose-pdf-coordinates.ts`

**Propósito**: Analizar el sistema de coordenadas de pdf2json para entender:
- Rango de valores de coordenadas (x, y, width, height)
- Sistema de unidades utilizado (puntos, relativos, pulgadas)
- Distribución de bloques de texto por página
- Muestras representativas de coordenadas

**Características**:

1. **Análisis Individual de PDF**:
   - Extrae texto y coordenadas usando `extractWithCoordinates()`
   - Calcula rangos (min, max, promedio) para cada dimensión
   - Muestra distribución de bloques por página
   - Presenta muestra de primeros 10 bloques con sus coordenadas

2. **Análisis Comparativo**:
   - Permite analizar múltiples PDFs en una sola ejecución
   - Genera tabla comparativa de rangos
   - Identifica si todos los PDFs usan el mismo sistema de unidades
   - Proporciona conclusiones sobre el sistema de coordenadas

3. **Detección de Sistema de Unidades**:
   - **Hipótesis 1 - Sistema Relativo (0-100)**: Detecta si max X/Y ≤ 100
   - **Hipótesis 2 - Sistema de Puntos (1pt = 1/72")**: Detecta si max X/Y está entre 100-650
   - Análisis de altura promedio de texto para validar hipótesis
   - Estimación de dimensiones en pulgadas si es sistema de puntos

**Uso**:
```bash
# Analizar un PDF
npx tsx scripts/diagnose-pdf-coordinates.ts test-fixtures/sample-policy.pdf

# Analizar múltiples PDFs
npx tsx scripts/diagnose-pdf-coordinates.ts *.pdf

# Ver ayuda
npx tsx scripts/diagnose-pdf-coordinates.ts
```

**Salida del Script**:

El script genera un reporte detallado que incluye:

1. **Información General**:
   - Número de páginas
   - Total de bloques de texto extraídos

2. **Rangos de Coordenadas**:
   - Mínimo, máximo y promedio para X, Y, Width, Height
   - Permite identificar el sistema de unidades

3. **Distribución por Página**:
   - Cantidad de bloques por página
   - Porcentaje del total

4. **Muestra de Bloques**:
   - Primeros 10 bloques con texto y coordenadas completas
   - Útil para debugging y validación

5. **Análisis de Sistema de Unidades**:
   - Conclusión sobre si es sistema relativo o de puntos
   - Estimación de dimensiones si es sistema de puntos
   - Recomendaciones para conversión a píxeles

6. **Resumen Comparativo** (si se analizan múltiples PDFs):
   - Tabla comparativa de rangos
   - Conclusión sobre consistencia del sistema

### 2. Directorio de Test Fixtures

**Ubicación**: `/home/liones_messi/Documentos/trabajo/Briki/test-fixtures/`

**Propósito**: Almacenar PDFs de prueba para:
- Ejecutar el script de diagnóstico
- Validar el sistema de coordenadas con diferentes tipos de PDFs
- Testing de las fases posteriores

**Estructura**:
```
test-fixtures/
  ├── sample-policy.pdf          # PDF de ejemplo (a añadir por el usuario)
  ├── large-policy.pdf           # PDF grande para testing (a añadir)
  └── ...                        # Otros PDFs de prueba
```

---

## 📊 ESTRUCTURA DEL CÓDIGO

### Interfaces TypeScript

```typescript
interface DiagnosticResult {
  fileName: string;
  pages: number;
  totalBlocks: number;
  coordinateRanges: {
    x: { min: number; max: number; avg: number };
    y: { min: number; max: number; avg: number };
    width: { min: number; max: number; avg: number };
    height: { min: number; max: number; avg: number };
  };
  sampleBlocks: Array<{
    text: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  pageDistribution: Record<number, number>;
}
```

### Funciones Principales

1. **`diagnosePdf(pdfPath: string): Promise<DiagnosticResult>`**
   - Analiza un PDF individual
   - Retorna objeto estructurado con toda la información

2. **`analyzeMultiplePdfs(pdfPaths: string[]): Promise<void>`**
   - Analiza múltiples PDFs
   - Genera resumen comparativo
   - Proporciona conclusiones sobre consistencia del sistema

3. **`main(): Promise<void>`**
   - Punto de entrada del script
   - Maneja argumentos de línea de comandos
   - Valida existencia de archivos

---

## 🔍 ANÁLISIS TÉCNICO

### Sistema de Coordenadas de pdf2json

Según la documentación y comportamiento típico de `pdf2json`, las coordenadas pueden estar en:

1. **Puntos (Points)**: 
   - 1 punto = 1/72 de pulgada
   - PDF estándar carta: 612pt × 792pt (8.5" × 11")
   - PDF A4: 595pt × 842pt (21cm × 29.7cm)
   - Rango típico: 0-650 para X, 0-850 para Y

2. **Unidades Relativas**:
   - Sistema 0-100 (porcentaje)
   - Menos común pero posible en algunos parsers
   - Rango: 0-100 para todas las dimensiones

3. **Pulgadas Directas**:
   - Menos común
   - Rango típico: 0-11 para Y, 0-8.5 para X

### Hipótesis de Trabajo

El script implementa lógica para detectar automáticamente el sistema:

- **Si max X/Y ≤ 100**: Probablemente sistema relativo
- **Si max X/Y entre 100-650**: Probablemente sistema de puntos
- **Si max X/Y > 650**: Sistema diferente o PDF muy grande

### Conversión a Píxeles

Una vez identificado el sistema, la conversión correcta será:

**Para Sistema de Puntos**:
```typescript
// Obtener dimensiones originales del PDF (de react-pdf)
const pdfWidthPoints = page.originalWidth;  // ej: 612
const pdfHeightPoints = page.originalHeight; // ej: 792

// Obtener dimensiones renderizadas (de react-pdf)
const viewportWidth = page.width;  // ej: 800px
const viewportHeight = page.height; // ej: 1200px

// Conversión
const pixelX = (coordX / pdfWidthPoints) * viewportWidth;
const pixelY = (coordY / pdfHeightPoints) * viewportHeight;
const pixelWidth = (coordWidth / pdfWidthPoints) * viewportWidth;
const pixelHeight = (coordHeight / pdfHeightPoints) * viewportHeight;
```

**Para Sistema Relativo**:
```typescript
const pixelX = (coordX / 100) * viewportWidth;
const pixelY = (coordY / 100) * viewportHeight;
// etc.
```

---

## 🎯 PRÓXIMOS PASOS (FASE 2)

Con los hallazgos de esta fase, se procederá a:

1. **Validar hipótesis** ejecutando el script con PDFs reales
2. **Documentar sistema confirmado** en base a resultados
3. **Implementar conversión correcta** en `PdfViewer.tsx` (FASE 5)
4. **Ajustar cálculo** según sistema detectado

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### Dependencias

El script utiliza:
- `fs`: Para lectura de archivos
- `path`: Para manipulación de rutas
- `extractWithCoordinates`: Función existente en `src/lib/pdf/extraction.ts`

### Manejo de Errores

- Validación de existencia de archivos antes de procesar
- Try-catch para errores individuales (continúa con otros PDFs)
- Mensajes de error descriptivos

### Performance

- Procesa PDFs secuencialmente (no paralelo para evitar sobrecarga)
- Muestra progreso en consola
- Eficiente en memoria (no carga todos los PDFs a la vez)

---

## ✅ CRITERIOS DE COMPLETITUD

- ✅ Script de diagnóstico implementado y funcional
- ✅ Sin errores de linting
- ✅ Directorio test-fixtures creado
- ✅ Documentación completa
- ✅ Listo para ejecución y validación

---

**Fin de Documentación FASE 1**

