#!/bin/bash

# =====================================================
# SCRIPT: Aplicar Nuevas Migraciones
# Objetivo: Aplicar migraciones del Día 5 usando Prisma
# =====================================================

set -e

echo "====================================================="
echo "APLICANDO MIGRACIONES DEL DÍA 5"
echo "====================================================="
echo ""

# Migraciones a aplicar (en orden cronológico)
MIGRATIONS=(
    "supabase/migrations/20250127_add_audit_trigger_to_clients.sql"
    "supabase/migrations/20250127_refine_rls_to_clients.sql"
)

# Verificar que los archivos existen
echo "📁 Verificando archivos de migración..."
for migration in "${MIGRATIONS[@]}"; do
    if [ -f "$migration" ]; then
        echo "✅ $(basename "$migration") encontrado"
    else
        echo "❌ ERROR: $migration no encontrado"
        exit 1
    fi
done

echo ""
echo "🔄 Aplicando migraciones..."
echo ""

# Aplicar cada migración
for migration in "${MIGRATIONS[@]}"; do
    echo "========================================="
    echo "Aplicando: $(basename "$migration")"
    echo "========================================="
    echo ""
    
    # Usar Prisma para ejecutar el SQL
    npx prisma db execute --file "$migration" --schema prisma/schema.prisma
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Migración aplicada exitosamente: $(basename "$migration")"
    else
        echo ""
        echo "❌ ERROR al aplicar migración: $(basename "$migration")"
        exit 1
    fi
    
    echo ""
done

echo ""
echo "====================================================="
echo "✅ TODAS LAS MIGRACIONES HAN SIDO APLICADAS"
echo "====================================================="
echo ""

# Sincronizar Prisma con la BD
echo "🔄 Sincronizando Prisma con la base de datos..."
npx prisma db pull
npx prisma generate

echo ""
echo "✅ Prisma sincronizado y cliente regenerado"
echo ""
echo "====================================================="
echo "✅ COMPLETADO"
echo "====================================================="

