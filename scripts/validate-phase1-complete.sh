#!/bin/bash
# Script para validar que la FASE 1 está completa y correcta
# Verifica que todos los componentes estén funcionando correctamente

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}VALIDACIÓN FASE 1: ANÁLISIS Y DIAGNÓSTICO${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Este script debe ejecutarse desde el directorio raíz del proyecto${NC}"
  exit 1
fi

# Verificar archivos generados
echo -e "${BLUE}📁 Verificando archivos generados...${NC}"

FILES_OK=true

if [ ! -f "docs/ESTRUCTURA_BD_REAL.md" ]; then
  echo -e "${RED}❌ docs/ESTRUCTURA_BD_REAL.md no existe${NC}"
  FILES_OK=false
else
  echo -e "${GREEN}✅ docs/ESTRUCTURA_BD_REAL.md existe${NC}"
fi

if [ ! -f ".phase1-results/analysis-results.txt" ]; then
  echo -e "${RED}❌ .phase1-results/analysis-results.txt no existe${NC}"
  FILES_OK=false
else
  echo -e "${GREEN}✅ .phase1-results/analysis-results.txt existe${NC}"
fi

if [ ! -f ".phase1-results/processed-results.json" ]; then
  echo -e "${RED}❌ .phase1-results/processed-results.json no existe${NC}"
  FILES_OK=false
else
  echo -e "${GREEN}✅ .phase1-results/processed-results.json existe${NC}"
fi

if [ ! "$FILES_OK" = true ]; then
  echo -e "${RED}❌ Faltan archivos de la FASE 1. Ejecuta primero: ./scripts/execute-phase1-analysis.sh${NC}"
  exit 1
fi

echo ""

# Verificar estructura de BD actual
echo -e "${BLUE}🔍 Verificando estructura actual de la BD...${NC}"

if [ ! -f ".env.local" ]; then
  echo -e "${YELLOW}⚠️  .env.local no encontrado, usando variables de entorno${NC}"
  if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL no está configurada${NC}"
    exit 1
  fi
  DB_URL="$DATABASE_URL"
else
  source .env.local 2>/dev/null || true
  DB_URL="$DATABASE_URL"
fi

if [ -z "$DB_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL no está configurada${NC}"
  exit 1
fi

# Extraer información de conexión
DB_URL_CLEAN=$(echo $DB_URL | sed 's/.*:\/\///')
DB_USER=$(echo $DB_URL_CLEAN | cut -d':' -f1)
DB_PASS_AND_HOST=$(echo $DB_URL_CLEAN | cut -d':' -f2-)
DB_PASSWORD=$(echo $DB_PASS_AND_HOST | cut -d'@' -f1)
DB_HOST_AND_PORT=$(echo $DB_PASS_AND_HOST | cut -d'@' -f2)
DB_HOST=$(echo $DB_HOST_AND_PORT | cut -d':' -f1)
DB_PORT_AND_DB=$(echo $DB_HOST_AND_PORT | cut -d':' -f2-)
DB_PORT=$(echo $DB_PORT_AND_DB | cut -d'/' -f1)
DB_NAME=$(echo $DB_PORT_AND_DB | cut -d'/' -f2 | cut -d'?' -f1)

export PGPASSWORD="$DB_PASSWORD"

# Verificar estructura actual
echo -e "${BLUE}📊 Verificando estructura de messages...${NC}"
MESSAGES_STRUCT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT 
    column_name || '|' || data_type || '|' || is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
  AND column_name = 'content'
ORDER BY ordinal_position;
" 2>/dev/null | tr -d ' ')

if echo "$MESSAGES_STRUCT" | grep -q "content|bytea"; then
  echo -e "${GREEN}✅ messages.content es BYTEA (correcto)${NC}"
else
  echo -e "${RED}❌ messages.content NO es BYTEA${NC}"
  echo "   Estructura encontrada: $MESSAGES_STRUCT"
fi

echo -e "${BLUE}📊 Verificando estructura de profiles...${NC}"
PROFILES_PHONE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT 
    column_name || '|' || data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name = 'phone'
LIMIT 1;
" 2>/dev/null | tr -d ' ')

PROFILES_ADDRESS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT 
    column_name || '|' || data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name = 'address'
LIMIT 1;
" 2>/dev/null | tr -d ' ')

if echo "$PROFILES_PHONE" | grep -q "phone|bytea"; then
  echo -e "${GREEN}✅ profiles.phone es BYTEA (correcto)${NC}"
else
  echo -e "${RED}❌ profiles.phone NO es BYTEA${NC}"
  echo "   Estructura encontrada: $PROFILES_PHONE"
fi

if echo "$PROFILES_ADDRESS" | grep -q "address|bytea"; then
  echo -e "${GREEN}✅ profiles.address es BYTEA (correcto)${NC}"
else
  echo -e "${RED}❌ profiles.address NO es BYTEA${NC}"
  echo "   Estructura encontrada: $PROFILES_ADDRESS"
fi

# Verificar funciones de encriptación
echo ""
echo -e "${BLUE}🔧 Verificando funciones de encriptación...${NC}"
FUNCTIONS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('encrypt_pii', 'decrypt_pii')
ORDER BY routine_name;
" 2>/dev/null | tr -d ' ')

if echo "$FUNCTIONS" | grep -q "decrypt_pii"; then
  echo -e "${GREEN}✅ decrypt_pii() existe${NC}"
else
  echo -e "${RED}❌ decrypt_pii() NO existe${NC}"
fi

if echo "$FUNCTIONS" | grep -q "encrypt_pii"; then
  echo -e "${GREEN}✅ encrypt_pii() existe${NC}"
else
  echo -e "${RED}❌ encrypt_pii() NO existe${NC}"
fi

# Verificar extensión pgcrypto
echo ""
echo -e "${BLUE}🔐 Verificando extensión pgcrypto...${NC}"
PGCRYPTO=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
);
" 2>/dev/null | tr -d ' ')

if [ "$PGCRYPTO" = "t" ]; then
  echo -e "${GREEN}✅ Extensión pgcrypto está instalada${NC}"
else
  echo -e "${RED}❌ Extensión pgcrypto NO está instalada${NC}"
fi

# Resumen final
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}RESUMEN DE VALIDACIÓN${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

VALIDATION_OK=true

if ! echo "$MESSAGES_STRUCT" | grep -q "content|bytea"; then
  VALIDATION_OK=false
fi

if ! echo "$PROFILES_PHONE" | grep -q "phone|bytea"; then
  VALIDATION_OK=false
fi

if ! echo "$PROFILES_ADDRESS" | grep -q "address|bytea"; then
  VALIDATION_OK=false
fi

if ! echo "$FUNCTIONS" | grep -q "encrypt_pii"; then
  VALIDATION_OK=false
fi

if ! echo "$FUNCTIONS" | grep -q "decrypt_pii"; then
  VALIDATION_OK=false
fi

if [ "$PGCRYPTO" != "t" ]; then
  VALIDATION_OK=false
fi

if [ "$VALIDATION_OK" = true ]; then
  echo -e "${GREEN}✅ FASE 1 VALIDADA CORRECTAMENTE${NC}"
  echo ""
  echo "📊 Estado de la BD:"
  echo "   - messages.content: BYTEA ✅"
  echo "   - profiles.phone: BYTEA ✅"
  echo "   - profiles.address: BYTEA ✅"
  echo "   - Funciones de encriptación: Disponibles ✅"
  echo "   - Extensión pgcrypto: Instalada ✅"
  echo ""
  echo "✅ La FASE 1 está completa y correcta"
  exit 0
else
  echo -e "${RED}❌ FASE 1 NO ESTÁ COMPLETA${NC}"
  echo ""
  echo "⚠️  Hay problemas que deben resolverse antes de continuar"
  exit 1
fi

# Limpiar variable de entorno
unset PGPASSWORD

