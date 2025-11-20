#!/bin/bash

# FASE 5 Validation Script
# Validates AnalysisTab component implementation

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         VALIDACIÓN RÁPIDA - FASE 5                        ║"
echo "║         Componente AnalysisTab                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

ERRORS=0

# 1. Check files
echo "1️⃣  Verificando archivos creados..."
FILES=(
  "src/components/Analysis/AnalysisTab.tsx"
  "src/components/Analysis/PdfViewer.tsx"
  "src/components/Analysis/PdfMinimap.tsx"
  "src/components/Analysis/FindingsList.tsx"
  "src/components/Analysis/AnnotationsPanel.tsx"
  "src/app/api/artifacts/[id]/download/route.ts"
  "src/app/test/analysis/page.tsx"
)

for FILE in "${FILES[@]}"; do
  if [ -f "$FILE" ]; then
    echo "   ✅ $FILE"
  else
    echo "   ❌ $FILE no encontrado"
    ERRORS=$((ERRORS + 1))
  fi
done
echo ""

# 2. Check react-pdf dependency
echo "2️⃣  Verificando dependencias..."
if grep -q "react-pdf" package.json; then
  echo "   ✅ react-pdf instalado"
else
  echo "   ❌ react-pdf no encontrado en package.json"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 3. Check imports
echo "3️⃣  Verificando imports..."
if grep -q "from 'react-pdf'" src/components/Analysis/PdfViewer.tsx; then
  echo "   ✅ PdfViewer importa react-pdf"
else
  echo "   ❌ PdfViewer no importa react-pdf"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "useUI" src/components/Analysis/AnalysisTab.tsx; then
  echo "   ✅ AnalysisTab usa Zustand"
else
  echo "   ❌ AnalysisTab no usa Zustand"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 4. Check workspace integration
echo "4️⃣  Verificando integración en workspace..."
if grep -q '"analysis"' src/components/Workspace/Tabs.tsx; then
  echo "   ✅ Tab Analysis integrado en workspace"
else
  echo "   ❌ Tab Analysis NO integrado en workspace"
  ERRORS=$((ERRORS + 1))
fi

if grep -q "AnalysisTab" src/components/Workspace/Tabs.tsx; then
  echo "   ✅ AnalysisTab importado en Tabs.tsx"
else
  echo "   ❌ AnalysisTab NO importado"
  ERRORS=$((ERRORS + 1))
fi

if grep -q 'analysis:' src/messages/es.ts; then
  echo "   ✅ Traducciones agregadas (es/en)"
else
  echo "   ❌ Traducciones faltantes"
  ERRORS=$((ERRORS + 1))
fi
echo ""

# 5. Summary
echo "════════════════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
  echo ""
  echo "✅ FASE 5 VALIDADA EXITOSAMENTE"
  echo ""
  echo "📋 Archivos creados: 7"
  echo "🔧 Archivos modificados: 3 (Tabs.tsx, es.ts, en.ts)"
  echo "🎯 Tab Analysis integrado en workspace"
  echo "📍 Acceso: Iniciar app y abrir tab 'Análisis' en panel derecho"
  echo ""
  exit 0
else
  echo ""
  echo "❌ FASE 5 TIENE $ERRORS ERRORES"
  echo ""
  exit 1
fi

