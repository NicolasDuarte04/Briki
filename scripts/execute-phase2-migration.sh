#!/bin/bash
# Script para ejecutar FASE 2: Sincronización de Migraciones
# Renombra columnas _enc a nombres normales manteniendo BYTEA

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FASE 2: SINCRONIZACIÓN DE MIGRACIONES${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ Este script debe ejecutarse desde el directorio raíz del proyecto${NC}"
  exit 1
fi

# Verificar si existe .env.local
if [ ! -f ".env.local" ]; then
  echo -e "${YELLOW}⚠️  No se encontró .env.local${NC}"
  echo "   Por favor, proporciona la información de conexión a Supabase:"
  echo ""
  read -p "Host de Supabase: " DB_HOST
  read -p "Puerto: " DB_PORT
  read -p "Usuario: " DB_USER
  read -p "Base de datos: " DB_NAME
  read -s -p "Contraseña: " DB_PASSWORD
  echo ""
else
  # Intentar leer DATABASE_URL de .env.local
  source .env.local 2>/dev/null || true
  
  if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL no encontrada en .env.local${NC}"
    echo "   Por favor, proporciona la información de conexión:"
    echo ""
    read -p "Host de Supabase: " DB_HOST
    read -p "Puerto: " DB_PORT
    read -p "Usuario: " DB_USER
    read -p "Base de datos: " DB_NAME
    read -s -p "Contraseña: " DB_PASSWORD
    echo ""
  else
    # Extraer información de DATABASE_URL
    DB_URL=$(echo $DATABASE_URL | sed 's/.*:\/\///')
    DB_USER=$(echo $DB_URL | cut -d':' -f1)
    DB_PASS_AND_HOST=$(echo $DB_URL | cut -d':' -f2-)
    DB_PASSWORD=$(echo $DB_PASS_AND_HOST | cut -d'@' -f1)
    DB_HOST_AND_PORT=$(echo $DB_PASS_AND_HOST | cut -d'@' -f2)
    DB_HOST=$(echo $DB_HOST_AND_PORT | cut -d':' -f1)
    DB_PORT_AND_DB=$(echo $DB_HOST_AND_PORT | cut -d':' -f2-)
    DB_PORT=$(echo $DB_PORT_AND_DB | cut -d'/' -f1)
    DB_NAME=$(echo $DB_PORT_AND_DB | cut -d'/' -f2 | cut -d'?' -f1)
    
    echo -e "${GREEN}✅ Información de conexión extraída de .env.local${NC}"
    echo "   Host: $DB_HOST"
    echo "   Puerto: $DB_PORT"
    echo "   Usuario: $DB_USER"
    echo "   Base de datos: $DB_NAME"
    echo ""
  fi
fi

# Verificar que psql está instalado
if ! command -v psql &> /dev/null; then
  echo -e "${RED}❌ psql no está instalado${NC}"
  echo "   Por favor, instala PostgreSQL client"
  exit 1
fi

# Verificar conexión
echo -e "${BLUE}🔍 Verificando conexión a la base de datos...${NC}"
export PGPASSWORD="$DB_PASSWORD"
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
  echo -e "${GREEN}✅ Conexión exitosa${NC}"
  echo ""
else
  echo -e "${RED}❌ Error al conectar a la base de datos${NC}"
  exit 1
fi

# Crear directorio para resultados
RESULTS_DIR=".phase2-results"
mkdir -p "$RESULTS_DIR"

# Verificar estado ANTES de la migración
echo -e "${BLUE}📊 Verificando estado ANTES de la migración...${NC}"
BEFORE_STATE="$RESULTS_DIR/before-state.txt"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'SQL' > "$BEFORE_STATE" 2>&1
-- Verificar columnas de messages
SELECT 
    'messages' as tabla,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
  AND (column_name = 'content' OR column_name = 'content_enc')
ORDER BY column_name;

-- Verificar columnas de profiles
SELECT 
    'profiles' as tabla,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND (column_name IN ('phone', 'phone_enc', 'address', 'address_enc'))
ORDER BY column_name;
SQL

echo -e "${GREEN}✅ Estado antes de migración guardado en: $BEFORE_STATE${NC}"
echo ""

# Ejecutar migración
echo -e "${BLUE}🔄 Ejecutando migración de renombrado de columnas...${NC}"
MIGRATION_FILE="supabase/migrations/20250131_rename_encrypted_columns_to_normal_names.sql"
OUTPUT_FILE="$RESULTS_DIR/migration-output.txt"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo -e "${RED}❌ No se encontró el archivo de migración: $MIGRATION_FILE${NC}"
  exit 1
fi

# Ejecutar migración
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE" > "$OUTPUT_FILE" 2>&1

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Migración ejecutada exitosamente${NC}"
  echo "   Resultados guardados en: $OUTPUT_FILE"
  echo ""
else
  echo -e "${RED}❌ Error al ejecutar migración${NC}"
  echo "   Revisa el archivo: $OUTPUT_FILE"
  exit 1
fi

# Verificar estado DESPUÉS de la migración
echo -e "${BLUE}📊 Verificando estado DESPUÉS de la migración...${NC}"
AFTER_STATE="$RESULTS_DIR/after-state.txt"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'SQL' > "$AFTER_STATE" 2>&1
-- Verificar columnas de messages
SELECT 
    'messages' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
  AND (column_name = 'content' OR column_name = 'content_enc')
ORDER BY column_name;

-- Verificar columnas de profiles
SELECT 
    'profiles' as tabla,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND (column_name IN ('phone', 'phone_enc', 'address', 'address_enc'))
ORDER BY column_name;

-- Verificar que no quedan columnas _enc
SELECT 
    'VERIFICACIÓN' as tipo,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND (
    (table_name = 'messages' AND column_name LIKE '%_enc')
    OR (table_name = 'profiles' AND column_name LIKE '%_enc')
  );
SQL

echo -e "${GREEN}✅ Estado después de migración guardado en: $AFTER_STATE${NC}"
echo ""

# Procesar y mostrar resumen
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}RESUMEN DE MIGRACIÓN${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

python3 << 'PYTHON_SUMMARY'
import sys
import re

try:
    # Leer estado después
    with open('.phase2-results/after-state.txt', 'r') as f:
        after_content = f.read()
    
    print("📊 ESTADO DESPUÉS DE MIGRACIÓN:")
    print("")
    
    # Verificar messages.content
    if re.search(r'messages\s+\|\s+content\s+\|\s+bytea', after_content):
        print("   ✅ messages.content existe como BYTEA")
    elif re.search(r'messages\s+\|\s+content_enc\s+\|\s+bytea', after_content):
        print("   ⚠️  messages.content_enc aún existe (no se renombró)")
    else:
        print("   ❌ No se encontró messages.content")
    
    # Verificar profiles.phone
    if re.search(r'profiles\s+\|\s+phone\s+\|\s+bytea', after_content):
        print("   ✅ profiles.phone existe como BYTEA")
    elif re.search(r'profiles\s+\|\s+phone_enc\s+\|\s+bytea', after_content):
        print("   ⚠️  profiles.phone_enc aún existe (no se renombró)")
    else:
        print("   ℹ️  profiles.phone no existe o no es BYTEA")
    
    # Verificar profiles.address
    if re.search(r'profiles\s+\|\s+address\s+\|\s+bytea', after_content):
        print("   ✅ profiles.address existe como BYTEA")
    elif re.search(r'profiles\s+\|\s+address_enc\s+\|\s+bytea', after_content):
        print("   ⚠️  profiles.address_enc aún existe (no se renombró)")
    else:
        print("   ℹ️  profiles.address no existe o no es BYTEA")
    
    # Verificar que no quedan columnas _enc
    if re.search(r'VERIFICACIÓN.*_enc', after_content):
        print("")
        print("   ⚠️  ADVERTENCIA: Aún existen columnas con sufijo _enc")
    else:
        print("")
        print("   ✅ No quedan columnas con sufijo _enc")
    
except Exception as e:
    print(f"   ⚠️  Error al procesar resultados: {e}")
    sys.exit(1)
PYTHON_SUMMARY

echo ""
echo -e "${GREEN}✅ FASE 2 completada${NC}"
echo ""
echo "📁 Archivos generados:"
echo "   - $BEFORE_STATE (estado antes)"
echo "   - $OUTPUT_FILE (salida de migración)"
echo "   - $AFTER_STATE (estado después)"
echo ""
echo "📝 Próximo paso:"
echo "   Validar cambios y proceder con FASE 3"
echo ""

# Limpiar variable de entorno
unset PGPASSWORD

