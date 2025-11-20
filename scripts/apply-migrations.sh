#!/bin/bash

# =====================================================
# SCRIPT: Aplicar Migraciones a Supabase
# Objetivo: Aplicar migraciones SQL desde supabase/migrations/
# =====================================================

set -e  # Salir si hay errores

echo "====================================================="
echo "APLICADOR DE MIGRACIONES A SUPABASE"
echo "====================================================="
echo ""

# Verificar que DATABASE_URL está configurada
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no está configurada"
    echo "Por favor, configura DATABASE_URL en .env.local"
    exit 1
fi

echo "✅ DATABASE_URL configurada"
echo ""

# Verificar que psql está disponible
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql no está instalado"
    echo "Instala PostgreSQL client: sudo apt-get install postgresql-client"
    exit 1
fi

echo "✅ psql instalado"
echo ""

# Directorio de migraciones
MIGRATIONS_DIR="supabase/migrations"
if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ Error: Directorio $MIGRATIONS_DIR no existe"
    exit 1
fi

echo "✅ Directorio de migraciones encontrado: $MIGRATIONS_DIR"
echo ""

# Contar archivos de migración
MIGRATION_FILES=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l)
echo "📁 Archivos de migración encontrados: $MIGRATION_FILES"
echo ""

# Aplicar migraciones en orden cronológico
for migration in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration" ]; then
        echo "🔄 Aplicando: $(basename "$migration")"
        
        # Ejecutar migración usando psql
        psql "$DATABASE_URL" -f "$migration"
        
        if [ $? -eq 0 ]; then
            echo "✅ Migración aplicada exitosamente"
        else
            echo "❌ Error al aplicar migración: $(basename "$migration")"
            exit 1
        fi
        echo ""
    fi
done

echo "====================================================="
echo "✅ Todas las migraciones han sido aplicadas"
echo "====================================================="

