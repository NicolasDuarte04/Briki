# ⚡ COMANDOS RÁPIDOS DE VALIDACIÓN - FASE 2

**Fecha**: 16 de Noviembre, 2025  
**Fase**: 2 - Mejora de Extracción de PDFs

---

## 🚀 VALIDACIÓN RÁPIDA (2 MINUTOS)

### Comando TODO-EN-UNO

```bash
cd /home/liones_messi/Documentos/trabajo/Briki && \
echo "╔════════════════════════════════════════════════════════════╗" && \
echo "║         VALIDACIÓN RÁPIDA - FASE 2                        ║" && \
echo "╚════════════════════════════════════════════════════════════╝" && \
echo "" && \
echo "1️⃣  Verificando archivos creados..." && \
ls -1 src/lib/pdf/extraction.ts tests/lib/pdf/extraction.test.ts tests/lib/pdf/run-extraction-tests.js 2>/dev/null && \
echo "   ✅ Todos los archivos existen" && \
echo "" && \
echo "2️⃣  Ejecutando tests utilitarios..." && \
node tests/lib/pdf/run-extraction-tests.js && \
echo "" && \
echo "3️⃣  Verificando integración con API..." && \
IMPORT_COUNT=$(grep -c "extractWithCoordinates" src/app/api/upload/pdf/route.ts) && \
echo "   Usos de extractWithCoordinates: $IMPORT_COUNT" && \
if [ "$IMPORT_COUNT" -ge 3 ]; then \
  echo "   ✅ API correctamente integrado"; \
else \
  echo "   ⚠️  Revisar integración (esperado >= 3)"; \
fi && \
echo "" && \
echo "╔════════════════════════════════════════════════════════════╗" && \
echo "║         ✅ FASE 2 VALIDADA EXITOSAMENTE                   ║" && \
echo "╚════════════════════════════════════════════════════════════╝"
```

---

## 📦 VERIFICACIÓN DE ARCHIVOS

### Listar Todos los Archivos de FASE 2

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

echo "📂 Archivos de FASE 2:"
echo ""
echo "Código:"
ls -lh src/lib/pdf/extraction.ts
ls -lh src/app/api/upload/pdf/route.ts
echo ""
echo "Tests:"
ls -lh tests/lib/pdf/extraction.test.ts
ls -lh tests/lib/pdf/run-extraction-tests.js
echo ""
echo "Documentación:"
ls -lh docs/FASE2_EXTRACCION_PDF_COMPLETADA.md
ls -lh docs/GUIA_TESTING_FASE2.md
ls -lh docs/RESUMEN_FASE2_POLIZAS.md
ls -lh docs/COMANDOS_VALIDACION_FASE2.md
```

### Verificar Tamaños de Archivos

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

# Librería principal (debe ser ~8-10 KB)
wc -l src/lib/pdf/extraction.ts

# Tests (debe ser ~500 líneas)
wc -l tests/lib/pdf/extraction.test.ts

# API modificado (debe ser ~450 líneas)
wc -l src/app/api/upload/pdf/route.ts
```

---

## 🧪 TESTS

### Ejecutar Tests Completos

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

node tests/lib/pdf/run-extraction-tests.js
```

**Resultado esperado**: 6 tests pasados (o más si hay PDF de prueba)

### Test Individual: Validación de Estructura

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

cat > test-quick-validation.js << 'EOF'
const {
  isValidExtractionResult,
  filterCoordinatesByPage,
  calculateBoundingBox
} = require('./src/lib/pdf/extraction.ts');

console.log('🧪 Test Rápido de Validación\n');

// Test 1
const valid = { text: 'Test', pages: 1, coordinates: [] };
console.log('1. isValidExtractionResult:', isValidExtractionResult(valid) ? '✅' : '❌');

// Test 2
const coords = [
  { text: 'A', page: 1, x: 0, y: 0, width: 10, height: 10 },
  { text: 'B', page: 2, x: 0, y: 0, width: 10, height: 10 }
];
const filtered = filterCoordinatesByPage(coords, 1);
console.log('2. filterCoordinatesByPage:', filtered.length === 1 ? '✅' : '❌');

// Test 3
const bbox = calculateBoundingBox(coords.slice(0, 1));
console.log('3. calculateBoundingBox:', bbox !== null ? '✅' : '❌');

console.log('\n✅ Validación rápida completada');
EOF

node test-quick-validation.js
rm test-quick-validation.js
```

---

## 🔍 VERIFICACIÓN DE INTEGRACIÓN

### Verificar Imports en API

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

echo "🔍 Verificando imports en API:"
grep -n "extractWithCoordinates" src/app/api/upload/pdf/route.ts
```

**Esperado**: Al menos 3 líneas (1 import + 2 usos)

### Verificar que Se Guardan Coordenadas

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

echo "🔍 Verificando que se guardan coordenadas en provenance:"
grep -A 1 "coordinates:" src/app/api/upload/pdf/route.ts | head -n 4
```

**Esperado**: Ver `coordinates: coordinates` y `coordinatesCount:`

### Verificar Función Legacy

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

echo "🔍 Verificando función legacy exportada:"
grep "export.*extractTextFromPDF" src/lib/pdf/extraction.ts
```

**Esperado**: Ver export de función `extractTextFromPDF`

---

## 📊 VERIFICACIÓN EN BASE DE DATOS (OPCIONAL)

### Verificar Último Artifact Tiene Coordenadas

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

cat > verify-artifact-coords.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyCoordinates() {
  try {
    const artifact = await prisma.artifact.findFirst({
      where: { sourceType: 'pdf' },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!artifact) {
      console.log('⚠️  No hay artifacts de tipo PDF');
      return;
    }
    
    console.log('📄 Artifact más reciente:');
    console.log(`   ID: ${artifact.id}`);
    console.log(`   Archivo: ${artifact.fileName}`);
    
    const prov = artifact.provenance as any;
    
    if (prov && 'coordinates' in prov) {
      console.log(`   ✅ Tiene coordenadas: ${prov.coordinatesCount || prov.coordinates.length} bloques`);
    } else {
      console.log('   ⚠️  No tiene coordenadas (artifact anterior a FASE 2)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCoordinates();
EOF

node verify-artifact-coords.js
rm verify-artifact-coords.js
```

---

## 🔧 HERRAMIENTAS DE DIAGNÓSTICO

### Verificar que pdf2json está Instalado

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

npm list pdf2json
```

**Esperado**: Ver versión instalada

### Verificar No Hay Errores de Linter

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

# Si tienes ESLint configurado
npx eslint src/lib/pdf/extraction.ts --quiet
npx eslint src/app/api/upload/pdf/route.ts --quiet
```

**Esperado**: Sin output (sin errores)

### Verificar TypeScript Compila

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

# Verificar solo los archivos de FASE 2
npx tsc --noEmit --skipLibCheck \
  src/lib/pdf/extraction.ts \
  src/app/api/upload/pdf/route.ts
```

**Esperado**: Sin errores

---

## 📝 CREAR PDF DE PRUEBA (OPCIONAL)

### Generar PDF Simple con Node

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

# Instalar librería si no está
npm install --save-dev pdfkit

cat > generate-test-pdf.js << 'EOF'
const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument();
doc.pipe(fs.createWriteStream('test-fixtures/sample-policy.pdf'));

doc.fontSize(24).text('Póliza de Seguro de Vida', 100, 100);
doc.fontSize(14).text('Número: POL-2025-001', 100, 150);
doc.fontSize(14).text('Prima: $500.00', 100, 180);
doc.fontSize(14).text('Deducible: $100.00', 100, 210);
doc.fontSize(14).text('Cobertura: $100,000.00', 100, 240);

doc.addPage();
doc.fontSize(16).text('Términos y Condiciones', 100, 100);
doc.fontSize(12).text('Lorem ipsum dolor sit amet...', 100, 150);

doc.end();

console.log('✅ PDF de prueba creado: test-fixtures/sample-policy.pdf');
EOF

mkdir -p test-fixtures
node generate-test-pdf.js
rm generate-test-pdf.js
```

### Probar Extracción con PDF Generado

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

cat > test-with-generated-pdf.js << 'EOF'
const { extractWithCoordinates } = require('./src/lib/pdf/extraction.ts');
const fs = require('fs');

async function testGenerated() {
  const buffer = fs.readFileSync('test-fixtures/sample-policy.pdf');
  const result = await extractWithCoordinates(buffer);
  
  console.log('📊 Resultado de Extracción:');
  console.log(`   Páginas: ${result.pages}`);
  console.log(`   Caracteres: ${result.text.length}`);
  console.log(`   Bloques: ${result.coordinates.length}`);
  console.log('\n   Primeros 3 bloques:');
  result.coordinates.slice(0, 3).forEach((c, i) => {
    console.log(`   ${i + 1}. "${c.text}" (pág ${c.page})`);
  });
}

testGenerated().catch(console.error);
EOF

node test-with-generated-pdf.js
rm test-with-generated-pdf.js
```

---

## 🚀 TEST DE INTEGRACIÓN CON API (REQUIERE SERVER)

### Subir PDF de Prueba

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

# Asegúrate de que el servidor esté corriendo
# npm run dev

# Ajustar estos valores antes de ejecutar
CASE_ID="your-case-id"
ORG_ID="your-org-id"
SESSION_COOKIE="your-session-cookie"

curl -X POST http://localhost:3000/api/upload/pdf \
  -H "Cookie: $SESSION_COOKIE" \
  -F "file=@test-fixtures/sample-policy.pdf" \
  -F "caseId=$CASE_ID" \
  -F "orgId=$ORG_ID" \
  | jq '.'
```

**Buscar en respuesta**:
- `success: true`
- `artifact.pageCount`
- `artifact.coordinatesExtracted` (nuevo en FASE 2)

---

## 📚 ACCESO RÁPIDO A DOCUMENTACIÓN

### Ver Resumen Ejecutivo

```bash
cat docs/RESUMEN_FASE2_POLIZAS.md | less
```

### Ver Guía de Testing Completa

```bash
cat docs/GUIA_TESTING_FASE2.md | less
```

### Ver Documentación Técnica

```bash
cat docs/FASE2_EXTRACCION_PDF_COMPLETADA.md | less
```

---

## ✅ CHECKLIST RÁPIDO

### Copiar y Pegar Este Checklist

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              CHECKLIST DE VALIDACIÓN - FASE 2             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# 1. Archivos
echo "1️⃣  Archivos creados:"
[ -f src/lib/pdf/extraction.ts ] && echo "   ✅ extraction.ts" || echo "   ❌ extraction.ts"
[ -f tests/lib/pdf/extraction.test.ts ] && echo "   ✅ extraction.test.ts" || echo "   ❌ extraction.test.ts"
[ -f tests/lib/pdf/run-extraction-tests.js ] && echo "   ✅ run-extraction-tests.js" || echo "   ❌ run-extraction-tests.js"
echo ""

# 2. Tests
echo "2️⃣  Tests (ejecutando...):"
node tests/lib/pdf/run-extraction-tests.js 2>&1 | grep -E "(Pasados|Fallidos)"
echo ""

# 3. Integración
echo "3️⃣  Integración con API:"
IMPORT_COUNT=$(grep -c "extractWithCoordinates" src/app/api/upload/pdf/route.ts 2>/dev/null || echo "0")
[ "$IMPORT_COUNT" -ge 3 ] && echo "   ✅ API integrado ($IMPORT_COUNT usos)" || echo "   ⚠️  Revisar API ($IMPORT_COUNT usos)"
echo ""

# 4. Documentación
echo "4️⃣  Documentación:"
[ -f docs/FASE2_EXTRACCION_PDF_COMPLETADA.md ] && echo "   ✅ Técnica" || echo "   ❌ Técnica"
[ -f docs/GUIA_TESTING_FASE2.md ] && echo "   ✅ Testing" || echo "   ❌ Testing"
[ -f docs/RESUMEN_FASE2_POLIZAS.md ] && echo "   ✅ Resumen" || echo "   ❌ Resumen"
echo ""

echo "╚════════════════════════════════════════════════════════════╝"
echo "   FASE 2 lista para validación del usuario"
echo "╚════════════════════════════════════════════════════════════╝"
```

---

## 🔄 ROLLBACK (SI ES NECESARIO)

### Revertir Cambios de FASE 2

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

# Backup antes de revertir
git stash save "Backup FASE 2 antes de rollback"

# Revertir API a versión anterior
git checkout HEAD -- src/app/api/upload/pdf/route.ts

# Eliminar archivos nuevos
rm -f src/lib/pdf/extraction.ts
rm -f tests/lib/pdf/extraction.test.ts
rm -f tests/lib/pdf/run-extraction-tests.js
rm -f tests/lib/pdf/test-extraction-runner.js

echo "✅ Rollback completado"
echo "⚠️  Puedes restaurar con: git stash pop"
```

---

## 📞 SOPORTE

### Si Algo Falla

1. **Ver logs detallados**:
   ```bash
   node tests/lib/pdf/run-extraction-tests.js 2>&1 | tee test-output.log
   ```

2. **Revisar guía de troubleshooting**:
   ```bash
   cat docs/GUIA_TESTING_FASE2.md | grep -A 20 "RESOLUCIÓN DE PROBLEMAS"
   ```

3. **Verificar FASE 1 está completa**:
   ```bash
   cat docs/COMANDOS_VALIDACION_FASE1.md
   ```

---

## 🎯 APROBAR Y CONTINUAR

### Una Vez Validado Todo

```bash
cd /home/liones_messi/Documentos/trabajo/Briki

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       ✅ FASE 2 VALIDADA Y APROBADA                       ║"
echo "║                                                            ║"
echo "║       Siguiente: FASE 3 - API de Análisis de Pólizas     ║"
echo "║       Duración estimada: 3-4 días                          ║"
echo "║       Ver: PLAN_ANALISIS_POLIZAS_PDF.md (Días 7-10)      ║"
echo "╚════════════════════════════════════════════════════════════╝"
```

---

**Fin de Comandos Rápidos - FASE 2**

**Última actualización**: 16 de Noviembre, 2025

