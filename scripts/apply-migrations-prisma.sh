#!/bin/bash

# =====================================================
# SCRIPT: Aplicar Migraciones con Prisma
# Objetivo: Aplicar migraciones SQL usando Prisma como proxy
# =====================================================

set -e

echo "====================================================="
echo "APLICADOR DE MIGRACIONES CON PRISMA"
echo "====================================================="
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

# Crear script SQL temporal que importa todas las migraciones
TEMP_SQL_FILE="/tmp/all_migrations_$(date +%s).sql"

echo "-- Aplicar migraciones en orden" > "$TEMP_SQL_FILE"
echo "-- Generado automáticamente el $(date)" >> "$TEMP_SQL_FILE"
echo "" >> "$TEMP_SQL_FILE"

for migration in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration" ]; then
        echo "-- Migración: $(basename "$migration")" >> "$TEMP_SQL_FILE"
        echo "" >> "$TEMP_SQL_FILE"
        cat "$migration" >> "$TEMP_SQL_FILE"
        echo "" >> "$TEMP_SQL_FILE"
        echo "" >> "$TEMP_SQL_FILE"
    fi
done

echo "🔄 Archivo SQL temporal creado: $TEMP_SQL_FILE"
echo ""

# Aplicar usando Prisma
echo "🔄 Aplicando migraciones con Prisma..."
echo ""

# Usar Prisma para ejecutar el SQL
pnpm prisma db execute --file "$TEMP_SQL_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Migraciones aplicadas exitosamente"
    
    # Limpiar archivo temporal
    rm -f "$TEMP_SQL_FILE"
    echo "✅ Archivo temporal eliminado"
else
    echo "❌ Error al aplicar migraciones"
    rm -f "$TEMP_SQL_FILE"
    exit 1
fi

echo ""
echo "====================================================="
echo "✅ Todas las migraciones han sido aplicadas"
echo "====================================================="

