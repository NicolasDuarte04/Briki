#!/bin/bash
# Script de Validación - FASE 3: API de Análisis de Pólizas
# Fecha: 16 de Noviembre, 2025

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         VALIDACIÓN COMPLETA - FASE 3                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

cd "$(dirname "$0")/.."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

FAILED=0

# 1. Verificar archivos creados
echo "1️⃣  Verificando archivos creados..."
echo ""

FILES=(
  "src/lib/storage/downloadFromStorage.ts"
  "src/lib/openai/policyAnalysis.ts"
  "src/app/api/policies/analyze/route.ts"
  "src/app/api/policies/analyses/route.ts"
  "tests/api/policies/analyze.test.ts"
  "tests/api/policies/run-simple-tests.js"
  "src/app/test/policies/page.tsx"
  "docs/FASE3_API_ANALISIS_COMPLETADA.md"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "   ${GREEN}✅${NC} $file"
  else
    echo -e "   ${RED}❌${NC} $file (NO EXISTE)"
    FAILED=$((FAILED + 1))
  fi
done

echo ""

# 2. Ejecutar tests
echo "2️⃣  Ejecutando tests unitarios..."
echo ""

node tests/api/policies/run-simple-tests.js
TEST_RESULT=$?

if [ $TEST_RESULT -eq 0 ]; then
  echo -e "${GREEN}✅ Tests pasaron exitosamente${NC}"
else
  echo -e "${RED}❌ Tests fallaron${NC}"
  FAILED=$((FAILED + 1))
fi

echo ""

# 3. Verificar TypeScript (si está disponible)
echo "3️⃣  Verificando TypeScript..."
echo ""

if command -v npx &> /dev/null; then
  npx tsc --noEmit --skipLibCheck \
    src/lib/storage/downloadFromStorage.ts \
    src/lib/openai/policyAnalysis.ts \
    src/app/api/policies/analyze/route.ts \
    src/app/api/policies/analyses/route.ts 2>&1 | head -n 20
  
  TS_RESULT=${PIPESTATUS[0]}
  
  if [ $TS_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ Sin errores de TypeScript${NC}"
  else
    echo -e "${YELLOW}⚠️  Hay errores de TypeScript (ver arriba)${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  TypeScript no disponible, omitiendo...${NC}"
fi

echo ""

# 4. Verificar variables de entorno necesarias
echo "4️⃣  Verificando variables de entorno..."
echo ""

if [ -f ".env.local" ]; then
  if grep -q "OPENAI_API_KEY" .env.local; then
    echo -e "   ${GREEN}✅${NC} OPENAI_API_KEY configurada"
  else
    echo -e "   ${RED}❌${NC} OPENAI_API_KEY NO configurada"
    FAILED=$((FAILED + 1))
  fi
  
  if grep -q "DATABASE_URL" .env.local; then
    echo -e "   ${GREEN}✅${NC} DATABASE_URL configurada"
  else
    echo -e "   ${RED}❌${NC} DATABASE_URL NO configurada"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "   ${YELLOW}⚠️${NC} .env.local no encontrado"
fi

echo ""

# 5. Verificar que las tablas de FASE 1 existen
echo "5️⃣  Verificando tablas de base de datos..."
echo ""

if [ -n "$DATABASE_URL" ]; then
  TABLES_EXIST=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('policy_analyses', 'policy_page_references');" 2>/dev/null)
  
  if [ "$TABLES_EXIST" = " 2" ]; then
    echo -e "   ${GREEN}✅${NC} Tablas de FASE 1 existen"
  else
    echo -e "   ${RED}❌${NC} Tablas de FASE 1 NO existen (ejecuta FASE 1 primero)"
    FAILED=$((FAILED + 1))
  fi
else
  echo -e "   ${YELLOW}⚠️${NC} DATABASE_URL no disponible, omitiendo..."
fi

echo ""

# Resumen
echo "╔════════════════════════════════════════════════════════════╗"

if [ $FAILED -eq 0 ]; then
  echo -e "║         ${GREEN}✅ VALIDACIÓN EXITOSA${NC}                            ║"
else
  echo -e "║         ${RED}❌ VALIDACIÓN FALLÓ ($FAILED errores)${NC}                   ║"
fi

echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 FASE 3 está lista para usar"
  echo ""
  echo "📝 Próximos pasos:"
  echo "   1. Accede a /test/policies en tu navegador para probar"
  echo "   2. Sube un PDF de póliza y copia su Artifact ID"
  echo "   3. Úsalo en la página de testing para analizar"
  echo ""
else
  echo "⚠️  Corrige los errores antes de continuar"
  echo ""
fi

exit $FAILED

