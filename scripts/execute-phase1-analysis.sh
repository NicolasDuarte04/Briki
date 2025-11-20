#!/bin/bash
# Script para ejecutar FASE 1: Análisis y Diagnóstico de BD
# Ejecuta consultas SQL en Supabase y procesa resultados

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}FASE 1: ANÁLISIS Y DIAGNÓSTICO DE BD${NC}"
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
  read -p "Host de Supabase (ej: aws-1-us-east-2.pooler.supabase.com): " DB_HOST
  read -p "Puerto (6543 para pooled, 5432 para direct): " DB_PORT
  read -p "Usuario (ej: postgres.vkzukorwsllzhpnzdmlo): " DB_USER
  read -p "Base de datos (ej: postgres): " DB_NAME
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
    # Formato: postgresql://user:password@host:port/database
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
  echo "   Por favor, instala PostgreSQL client:"
  echo "   Ubuntu/Debian: sudo apt-get install postgresql-client"
  echo "   macOS: brew install postgresql"
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
  echo "   Por favor, verifica las credenciales"
  exit 1
fi

# Crear directorio para resultados temporales
RESULTS_DIR=".phase1-results"
mkdir -p "$RESULTS_DIR"

# Ejecutar script SQL y guardar resultados
echo -e "${BLUE}📊 Ejecutando análisis de estructura de BD...${NC}"
echo ""

# Ejecutar consultas y guardar resultados
SQL_FILE="scripts/analyze-db-structure.sql"
OUTPUT_FILE="$RESULTS_DIR/analysis-results.txt"

# Ejecutar script SQL completo
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE" > "$OUTPUT_FILE" 2>&1

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Análisis completado${NC}"
  echo "   Resultados guardados en: $OUTPUT_FILE"
  echo ""
else
  echo -e "${RED}❌ Error al ejecutar análisis${NC}"
  echo "   Revisa el archivo: $OUTPUT_FILE"
  exit 1
fi

# Procesar resultados y generar reporte
echo -e "${BLUE}📝 Procesando resultados...${NC}"

# Usar script Python para procesar resultados
if [ -f "scripts/process-phase1-results.py" ]; then
  python3 scripts/process-phase1-results.py
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Resultados procesados y documentación generada${NC}"
    echo ""
  else
    echo -e "${YELLOW}⚠️  Error al procesar resultados${NC}"
    echo "   Revisa manualmente: $OUTPUT_FILE"
  fi
else
  echo -e "${YELLOW}⚠️  Script de procesamiento no encontrado${NC}"
  echo "   Revisa manualmente: $OUTPUT_FILE"
fi

# Mostrar resumen
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}RESUMEN DE HALLAZGOS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ -f ".phase1-results/processed-results.json" ]; then
  python3 << 'PYTHON_SUMMARY'
import json
import sys

try:
    with open('.phase1-results/processed-results.json', 'r') as f:
        results = json.load(f)
    
    print("📊 TABLA messages:")
    if 'messages' in results and results['messages']:
        msg = results['messages']
        print(f"   Tipo de content: {msg.get('data_type', 'N/A')}")
        print(f"   Tipo detectado: {msg.get('tipo_detectado', 'N/A')}")
        print(f"   Escenario: {msg.get('scenario', 'N/A')}")
        print(f"   Encriptado: {'✅ SÍ' if msg.get('encrypted') else '❌ NO'}")
    else:
        print("   ⚠️  No se pudo determinar")
    
    print("\n📊 TABLA profiles:")
    if 'profiles' in results and results['profiles']:
        prof = results['profiles']
        print(f"   Tipo de phone: {prof.get('phone_type', 'N/A')}")
        print(f"   Tipo de address: {prof.get('address_type', 'N/A')}")
        print(f"   Escenario: {prof.get('scenario', 'N/A')}")
        print(f"   Encriptado: {'✅ SÍ' if prof.get('encrypted') else '❌ NO'}")
    else:
        print("   ⚠️  No se pudo determinar")
    
    print("\n🔧 FUNCIONES DE ENCRIPTACIÓN:")
    if 'functions' in results and results['functions']:
        for func in results['functions']:
            print(f"   ✅ {func}")
    else:
        print("   ⚠️  No se encontraron funciones")
except Exception as e:
    print(f"   ⚠️  Error al leer resultados: {e}")
    sys.exit(1)
PYTHON_SUMMARY
fi

echo ""
echo -e "${GREEN}✅ FASE 1 completada${NC}"
echo ""
echo "📁 Archivos generados:"
echo "   - $OUTPUT_FILE (resultados completos)"
echo "   - .phase1-results/processed-results.json (resultados procesados)"
echo ""
echo "📝 Próximo paso:"
echo "   Revisar resultados y completar docs/ESTRUCTURA_BD_REAL.md"
echo ""

# Limpiar variable de entorno
unset PGPASSWORD

