# 🧪 GUÍA COMPLETA DE TESTING - FASE 2: MEJORA DE EXTRACCIÓN DE PDFs

**Fecha**: 16 de Noviembre, 2025  
**Fase**: 2 - Mejora de Extracción de PDFs  
**Fuente**: `PLAN_ANALISIS_POLIZAS_PDF.md`

---

## 📋 ÍNDICE

1. [Pre-requisitos](#pre-requisitos)
2. [Método 1: Tests Automatizados](#método-1-tests-automatizados)
3. [Método 2: Tests Manuales con Node](#método-2-tests-manuales-con-node)
4. [Método 3: Tests de Integración con API](#método-3-tests-de-integración-con-api)
5. [Verificación Visual](#verificación-visual)
6. [Resolución de Problemas](#resolución-de-problemas)
7. [Checklist Final](#checklist-final)

---

## PRE-REQUISITOS

### 1. Verificar que FASE 1 Está Completa

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

# Verificar que existen las tablas de FASE 1
psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('policy_analyses', 'policy_page_references');"
```

**Resultado esperado**: `2`

### 2. Verificar Archivos Nuevos Existen

```bash
# Verificar archivos de FASE 2
ls -lh src/lib/pdf/extraction.ts
ls -lh tests/lib/pdf/extraction.test.ts
ls -lh tests/lib/pdf/run-extraction-tests.js
```

**Resultado esperado**: 3 archivos listados

### 3. Verificar que No Hay Errores de Linter

```bash
# Si tienes ESLint configurado
npx eslint src/lib/pdf/extraction.ts
npx eslint src/app/api/upload/pdf/route.ts
```

**Resultado esperado**: Sin errores

---

## MÉTODO 1: TESTS AUTOMATIZADOS

### Paso 1: Ejecutar Suite de Tests

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

# Ejecutar tests programáticos
node tests/lib/pdf/run-extraction-tests.js
```

**Resultado esperado**:

```
🧪 TESTS DE EXTRACCIÓN PDF - FASE 2

======================================================================

🔧 Utility Function Tests:

  ✅ isValidExtractionResult should validate correctly
  ✅ filterCoordinatesByPage should filter correctly
  ✅ findTextCoordinates should find text
  ✅ calculateBoundingBox should calculate correctly
  ✅ calculateBoundingBox should return null for empty
  ✅ extractWithCoordinates should reject invalid PDF

======================================================================

📊 RESUMEN:
   ✅ Pasados: 6
   ❌ Fallidos: 0
   📈 Total: 6

🎉 ¡TODOS LOS TESTS PASARON!
```

### Paso 2: Verificar Funciones Individuales

Crear archivo de prueba `test-extraction-manual.js`:

```javascript
const { extractWithCoordinates } = require('./src/lib/pdf/extraction.ts');
const fs = require('fs');

async function testBasic() {
  // Crear un PDF de prueba simple (necesitas un PDF real)
  const pdfPath = './test-data/sample.pdf'; // Ajustar path
  
  if (!fs.existsSync(pdfPath)) {
    console.log('⚠️  No hay PDF de prueba. Coloca uno en:', pdfPath);
    return;
  }
  
  const buffer = fs.readFileSync(pdfPath);
  const result = await extractWithCoordinates(buffer);
  
  console.log('📊 Resultado de Extracción:');
  console.log(`   Páginas: ${result.pages}`);
  console.log(`   Caracteres: ${result.text.length}`);
  console.log(`   Bloques de texto: ${result.coordinates.length}`);
  console.log('\n   Primeros 3 bloques:');
  result.coordinates.slice(0, 3).forEach((coord, i) => {
    console.log(`   ${i + 1}. "${coord.text.substring(0, 30)}" (página ${coord.page})`);
  });
}

testBasic().catch(console.error);
```

Ejecutar:
```bash
node test-extraction-manual.js
```

---

## MÉTODO 2: TESTS MANUALES CON NODE

### Test 1: Verificar Estructura de Datos

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

cat > test-estructura.js << 'EOF'
const { extractWithCoordinates } = require('./src/lib/pdf/extraction.ts');

// Test con PDF inválido (debe fallar correctamente)
async function testInvalidPdf() {
  console.log('🧪 Test: PDF Inválido\n');
  
  const invalidBuffer = Buffer.from('Esto no es un PDF');
  
  try {
    await extractWithCoordinates(invalidBuffer);
    console.log('❌ ERROR: Debería haber fallado');
  } catch (error) {
    console.log('✅ Correctamente rechazó PDF inválido');
    console.log(`   Error: ${error.message}\n`);
  }
}

testInvalidPdf().catch(console.error);
EOF

node test-estructura.js
```

**Resultado esperado**:
```
🧪 Test: PDF Inválido

✅ Correctamente rechazó PDF inválido
   Error: Failed to parse PDF
```

### Test 2: Verificar Funciones Utilitarias

```bash
cat > test-utilidades.js << 'EOF'
const {
  isValidExtractionResult,
  filterCoordinatesByPage,
  findTextCoordinates,
  calculateBoundingBox
} = require('./src/lib/pdf/extraction.ts');

function testUtilities() {
  console.log('🧪 Tests de Funciones Utilitarias\n');
  
  // Test 1: isValidExtractionResult
  console.log('1. isValidExtractionResult:');
  const valid = { text: 'Test', pages: 1, coordinates: [] };
  const invalid = { text: 'Test' }; // Falta pages y coordinates
  
  console.log(`   Valid result: ${isValidExtractionResult(valid) ? '✅' : '❌'}`);
  console.log(`   Invalid result: ${!isValidExtractionResult(invalid) ? '✅' : '❌'}\n`);
  
  // Test 2: filterCoordinatesByPage
  console.log('2. filterCoordinatesByPage:');
  const coords = [
    { text: 'P1', page: 1, x: 0, y: 0, width: 10, height: 10 },
    { text: 'P2', page: 2, x: 0, y: 0, width: 10, height: 10 },
    { text: 'P1b', page: 1, x: 0, y: 20, width: 10, height: 10 },
  ];
  
  const page1 = filterCoordinatesByPage(coords, 1);
  console.log(`   Página 1: ${page1.length === 2 ? '✅' : '❌'} (esperado 2, obtenido ${page1.length})`);
  
  const page2 = filterCoordinatesByPage(coords, 2);
  console.log(`   Página 2: ${page2.length === 1 ? '✅' : '❌'} (esperado 1, obtenido ${page2.length})\n`);
  
  // Test 3: findTextCoordinates
  console.log('3. findTextCoordinates:');
  const found = findTextCoordinates(coords, 'P1');
  console.log(`   Búsqueda "P1": ${found.length === 2 ? '✅' : '❌'} (esperado 2, obtenido ${found.length})\n`);
  
  // Test 4: calculateBoundingBox
  console.log('4. calculateBoundingBox:');
  const bbox = calculateBoundingBox(coords.slice(0, 2));
  console.log(`   Bbox calculado: ${bbox ? '✅' : '❌'}`);
  if (bbox) {
    console.log(`   x=${bbox.x}, y=${bbox.y}, w=${bbox.width}, h=${bbox.height}\n`);
  }
}

testUtilities();
EOF

node test-utilidades.js
```

**Resultado esperado**:
```
🧪 Tests de Funciones Utilitarias

1. isValidExtractionResult:
   Valid result: ✅
   Invalid result: ✅

2. filterCoordinatesByPage:
   Página 1: ✅ (esperado 2, obtenido 2)
   Página 2: ✅ (esperado 1, obtenido 1)

3. findTextCoordinates:
   Búsqueda "P1": ✅ (esperado 2, obtenido 2)

4. calculateBoundingBox:
   Bbox calculado: ✅
   x=0, y=0, w=10, h=10
```

---

## MÉTODO 3: TESTS DE INTEGRACIÓN CON API

### Test 1: Verificar que API Usa Nueva Función

```bash
cat > test-api-integration.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testApiIntegration() {
  console.log('\n🧪 Test de Integración con API\n');
  
  try {
    // Buscar el artifact más reciente
    const recentArtifact = await prisma.artifact.findFirst({
      where: { sourceType: 'pdf' },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!recentArtifact) {
      console.log('⚠️  No hay artifacts de tipo PDF en la base de datos');
      console.log('   Sube un PDF primero para probar la integración\n');
      return;
    }
    
    console.log('📄 Artifact más reciente encontrado:');
    console.log(`   ID: ${recentArtifact.id}`);
    console.log(`   Archivo: ${recentArtifact.fileName}`);
    console.log(`   Fecha: ${recentArtifact.createdAt}\n`);
    
    // Verificar que tiene provenance
    if (!recentArtifact.provenance) {
      console.log('❌ Artifact no tiene provenance');
      return;
    }
    
    const provenance = recentArtifact.provenance as any;
    
    // Verificar campos de FASE 2
    console.log('🔍 Verificando campos de FASE 2 en provenance:\n');
    
    const checks = [
      { name: 'pageCount', exists: 'pageCount' in provenance },
      { name: 'coordinates', exists: 'coordinates' in provenance },
      { name: 'coordinatesCount', exists: 'coordinatesCount' in provenance },
    ];
    
    checks.forEach(check => {
      console.log(`   ${check.exists ? '✅' : '❌'} ${check.name}`);
    });
    
    if (provenance.coordinates) {
      console.log(`\n📊 Estadísticas de coordenadas:`);
      console.log(`   Total bloques: ${provenance.coordinatesCount || provenance.coordinates.length}`);
      console.log(`   Páginas: ${provenance.pageCount}`);
      
      if (provenance.coordinates.length > 0) {
        const firstCoord = provenance.coordinates[0];
        console.log(`\n   Primer bloque:`);
        console.log(`   - Texto: "${firstCoord.text.substring(0, 50)}${firstCoord.text.length > 50 ? '...' : ''}"`);
        console.log(`   - Página: ${firstCoord.page}`);
        console.log(`   - Posición: (${firstCoord.x}, ${firstCoord.y})`);
        console.log(`   - Tamaño: ${firstCoord.width}x${firstCoord.height}`);
      }
    }
    
    console.log('\n✅ Integración con API verificada correctamente\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testApiIntegration();
EOF

node test-api-integration.js
```

**Resultado esperado** (si hay PDF subido):
```
🧪 Test de Integración con API

📄 Artifact más reciente encontrado:
   ID: abc-123-def...
   Archivo: poliza-ejemplo.pdf
   Fecha: 2025-11-16...

🔍 Verificando campos de FASE 2 en provenance:

   ✅ pageCount
   ✅ coordinates
   ✅ coordinatesCount

📊 Estadísticas de coordenadas:
   Total bloques: 347
   Páginas: 5

   Primer bloque:
   - Texto: "Póliza de Seguro de Vida Individual"
   - Página: 1
   - Posición: (72, 720)
   - Tamaño: 200x24

✅ Integración con API verificada correctamente
```

### Test 2: Subir PDF de Prueba y Verificar

**IMPORTANTE**: Este test requiere tener un PDF de prueba y credenciales válidas.

```bash
cat > test-upload-pdf.js << 'EOF'
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testPdfUpload() {
  console.log('\n🧪 Test: Upload de PDF y Verificación de Coordenadas\n');
  
  // Ajustar estos valores
  const PDF_PATH = './test-data/sample.pdf';
  const API_URL = 'http://localhost:3000/api/upload/pdf';
  const CASE_ID = 'your-case-id';
  const ORG_ID = 'your-org-id';
  const SESSION_COOKIE = 'your-session-cookie';
  
  if (!fs.existsSync(PDF_PATH)) {
    console.log('⚠️  PDF de prueba no encontrado:', PDF_PATH);
    console.log('   Coloca un PDF en ese path para probar\n');
    return;
  }
  
  console.log('📤 Subiendo PDF...');
  
  const form = new FormData();
  form.append('file', fs.createReadStream(PDF_PATH));
  form.append('caseId', CASE_ID);
  form.append('orgId', ORG_ID);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      body: form,
      headers: {
        'Cookie': SESSION_COOKIE,
      },
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.log('❌ Error:', result.error);
      return;
    }
    
    console.log('✅ PDF subido exitosamente\n');
    console.log('📊 Resultado:');
    console.log(`   Artifact ID: ${result.artifact.id}`);
    console.log(`   Páginas: ${result.artifact.pageCount}`);
    console.log(`   Caracteres: ${result.artifact.charactersExtracted}`);
    
    if (result.artifact.coordinatesExtracted !== undefined) {
      console.log(`   Coordenadas: ${result.artifact.coordinatesExtracted}`);
      console.log('\n✅ FASE 2 funcionando correctamente\n');
    } else {
      console.log('\n⚠️  No se encontró campo coordinatesExtracted');
      console.log('   Verifica que la API esté usando extractWithCoordinates()\n');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Nota: Ajustar credenciales antes de ejecutar
// testPdfUpload();
console.log('⚠️  Test deshabilitado. Ajustar credenciales en el código antes de ejecutar.\n');
EOF

# Solo mostrar el script, no ejecutar
cat test-upload-pdf.js
```

---

## VERIFICACIÓN VISUAL

### 1. Verificar Estructura de Archivos

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

echo "📂 Estructura de Archivos FASE 2:"
echo ""
echo "Librería de Extracción:"
ls -lh src/lib/pdf/extraction.ts
echo ""
echo "API Actualizado:"
ls -lh src/app/api/upload/pdf/route.ts
echo ""
echo "Tests:"
ls -lh tests/lib/pdf/
```

### 2. Verificar Imports

```bash
# Verificar que el import está correcto en el API
grep -n "extractWithCoordinates" src/app/api/upload/pdf/route.ts
```

**Resultado esperado**:
```
9:import { extractWithCoordinates, extractTextFromPDF } from '@/lib/pdf/extraction';
87:      const extracted = await extractWithCoordinates(buffer);
351:      const extracted = await extractWithCoordinates(buffer);
```

### 3. Verificar Que Se Guardan Coordenadas

```bash
# Buscar donde se guarda en provenance
grep -A 2 "coordinates:" src/app/api/upload/pdf/route.ts
```

**Resultado esperado**:
```
          coordinates: coordinates, // ✅ FASE 2: Coordenadas de todos los bloques de texto
          coordinatesCount: coordinates.length // ✅ FASE 2: Número total de bloques con coordenadas
```

---

## RESOLUCIÓN DE PROBLEMAS

### Problema 1: "Cannot find module extraction.ts"

**Síntomas**:
```
Error: Cannot find module './src/lib/pdf/extraction.ts'
```

**Solución**:
```bash
# Verificar que el archivo existe
ls -l src/lib/pdf/extraction.ts

# Si no existe, revisar ruta o recrear archivo
```

### Problema 2: "pdf2json is not defined"

**Síntomas**:
```
ReferenceError: PDFParser is not defined
```

**Solución**:
```bash
# Verificar que pdf2json está instalado
npm list pdf2json

# Si no está instalado:
npm install pdf2json --save
```

### Problema 3: Tests Fallan en Modo Temporal

**Síntomas**: Tests de utilidades pasan, pero integración con API falla.

**Solución**:
```bash
# Verificar que el API está usando la función correcta
grep "extractWithCoordinates" src/app/api/upload/pdf/route.ts

# Debe aparecer en al menos 2 lugares (temp y persistente)
```

### Problema 4: Coordenadas Vacías

**Síntomas**: `coordinates.length === 0` para un PDF válido.

**Posibles Causas**:
1. PDF escaneado (solo imágenes, sin texto)
2. PDF con texto en formato no estándar
3. Error en parsing

**Verificación**:
```bash
cat > verify-pdf.js << 'EOF'
const { extractWithCoordinates } = require('./src/lib/pdf/extraction.ts');
const fs = require('fs');

async function verifyPdf(path) {
  const buffer = fs.readFileSync(path);
  const result = await extractWithCoordinates(buffer);
  
  console.log(`Texto extraído: ${result.text.length} caracteres`);
  console.log(`Coordenadas: ${result.coordinates.length} bloques`);
  
  if (result.text.length > 0 && result.coordinates.length === 0) {
    console.log('⚠️  PDF tiene texto pero sin coordenadas (posible problema)');
  } else if (result.text.length === 0) {
    console.log('⚠️  PDF sin texto (posiblemente escaneado, requiere OCR)');
  } else {
    console.log('✅ PDF procesado correctamente');
  }
}

verifyPdf(process.argv[2]).catch(console.error);
EOF

node verify-pdf.js path/to/your.pdf
```

---

## CHECKLIST FINAL

### Archivos y Código

- [ ] ✅ Archivo `src/lib/pdf/extraction.ts` existe
- [ ] ✅ Función `extractWithCoordinates()` exportada
- [ ] ✅ Función `extractTextFromPDF()` legacy exportada
- [ ] ✅ 5 funciones utilitarias exportadas
- [ ] ✅ API actualizado con imports correctos
- [ ] ✅ API usa `extractWithCoordinates()` en ambos modos (temp y persistente)
- [ ] ✅ Coordenadas guardadas en `provenance`
- [ ] ✅ Sin errores de linter
- [ ] ✅ Sin errores de TypeScript

### Tests

- [ ] ✅ Tests utilitarios pasan (6 tests)
- [ ] ✅ Test de PDF inválido funciona correctamente
- [ ] ✅ Test de estructura de datos pasa
- [ ] ✅ (Opcional) Test con PDF real extrae coordenadas

### Integración

- [ ] ✅ Artifact en BD contiene `coordinates` en `provenance`
- [ ] ✅ Artifact en BD contiene `coordinatesCount` en `provenance`
- [ ] ✅ Coordenadas tienen estructura correcta (text, page, x, y, width, height)
- [ ] ✅ Páginas son 1-indexed

### Funcionalidad

- [ ] ✅ Upload de PDF funciona igual que antes (sin regressions)
- [ ] ✅ Texto extraído es igual o mejor que versión anterior
- [ ] ✅ Coordenadas se capturan para todos los bloques de texto
- [ ] ✅ Función legacy mantiene compatibilidad

---

## COMANDO TODO-EN-UNO

Verificación rápida de toda la FASE 2:

```bash
cd /home/liones_messi/Documentos/trabajo/Briki && \
echo "=== VERIFICACIÓN RÁPIDA FASE 2 ===" && \
echo "" && \
echo "1. Archivos creados:" && \
ls -1 src/lib/pdf/extraction.ts tests/lib/pdf/extraction.test.ts tests/lib/pdf/run-extraction-tests.js && \
echo "" && \
echo "2. Tests utilitarios:" && \
node tests/lib/pdf/run-extraction-tests.js && \
echo "" && \
echo "3. Verificar imports en API:" && \
grep "extractWithCoordinates" src/app/api/upload/pdf/route.ts | wc -l && \
echo "   (debe ser al menos 3)" && \
echo "" && \
echo "✅ FASE 2 VERIFICADA"
```

**Resultado esperado**:
```
=== VERIFICACIÓN RÁPIDA FASE 2 ===

1. Archivos creados:
src/lib/pdf/extraction.ts
tests/lib/pdf/extraction.test.ts
tests/lib/pdf/run-extraction-tests.js

2. Tests utilitarios:
🧪 TESTS DE EXTRACCIÓN PDF - FASE 2
...
🎉 ¡TODOS LOS TESTS PASARON!

3. Verificar imports en API:
3
   (debe ser al menos 3)

✅ FASE 2 VERIFICADA
```

---

## APROBACIÓN PARA FASE 3

Una vez que todos los checks pasen:

✅ **FASE 2 VALIDADA Y APROBADA**

Puedes proceder a:
- **FASE 3**: API de Análisis de Pólizas con IA
- Ver: `PLAN_ANALISIS_POLIZAS_PDF.md` Sección 7.2 (Días 7-10)

---

**Fin de la Guía de Testing - Fase 2**

**Última actualización**: 16 de Noviembre, 2025

