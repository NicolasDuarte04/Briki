# INSTRUCCIONES URGENTES: CORREGIR ERROR display_name

**PROBLEMA CRÍTICO**: Prisma intenta acceder a `profiles.display_name` que no existe en la BD.

**CAUSA RAÍZ**: La base de datos todavía tiene la columna `display_name` (TEXT) en lugar de `name_enc` (BYTEA).

---

## 🔴 SOLUCIÓN INMEDIATA

### **OPCIÓN 1: Ejecutar Script SQL Directamente en Supabase**

1. Abre Supabase Dashboard → SQL Editor
2. Copia y pega el contenido de `scripts/fix-display-name-urgent.sql`
3. Ejecuta el script
4. Verifica que el resultado muestre solo `name_enc` (BYTEA), NO `display_name`

### **OPCIÓN 2: Ejecutar Migración**

Si usas migraciones de Supabase:

```bash
# La migración 20250201_fix_display_name_to_name_enc.sql ya está creada
# Solo necesita ejecutarse en Supabase
```

---

## ✅ VERIFICACIÓN POST-CORRECCIÓN

Después de ejecutar el script, verifica:

1. **Estructura de BD**:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
     AND table_name = 'profiles' 
     AND (column_name = 'name_enc' OR column_name = 'display_name');
   ```
   
   **Resultado Esperado**:
   - ✅ `name_enc` (bytea) - DEBE existir
   - ❌ `display_name` - NO debe existir

2. **Reiniciar Servidor**:
   ```bash
   # Detener servidor (Ctrl+C)
   # Limpiar cache de Prisma
   rm -rf node_modules/.prisma
   # Regenerar Prisma Client
   pnpm prisma generate
   # Reiniciar servidor
   pnpm run dev
   ```

3. **Probar Acceso a Profile**:
   - Acceder a `/profile`
   - Debe cargar sin errores
   - No debe aparecer error de `display_name`

---

## 📝 NOTAS IMPORTANTES

- **Pérdida de Datos**: Si hay datos en `display_name` (TEXT), se perderán al convertir a BYTEA. Esto es esperado ya que los datos deben estar encriptados.

- **Migración Idempotente**: El script es seguro de ejecutar múltiples veces (idempotente).

- **Verificación**: Siempre verifica el resultado antes de asumir que funcionó.

---

**Última actualización**: 1 de Febrero, 2025  
**Prioridad**: 🔴 CRÍTICA

