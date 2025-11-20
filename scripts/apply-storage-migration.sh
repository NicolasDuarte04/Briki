#!/bin/bash
# Script para aplicar migración de Storage buckets
# Uso: ./scripts/apply-storage-migration.sh

echo "📝 Aplicando migración de Storage buckets..."

# Leer la migración SQL
SQL_FILE="supabase/migrations/20250127_fix_storage_buckets_and_policies.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Error: No se encontró el archivo $SQL_FILE"
    exit 1
fi

echo "✅ Archivo encontrado: $SQL_FILE"
echo ""
echo "📋 Contenido de la migración:"
cat "$SQL_FILE"
echo ""
echo "⚠️  IMPORTANTE: Debes aplicar esta migración manualmente."
echo ""
echo "Opciones:"
echo "1. Copiar el contenido de arriba y aplicarlo en Supabase Dashboard > SQL Editor"
echo "2. O ejecutar el comando de Prisma (si está configurado):"
echo "   npx prisma db execute --stdin < $SQL_FILE"
echo ""

