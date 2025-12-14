# Verificación Fase 1 - Renovaciones

## Fecha: 11 de diciembre de 2025

## Resumen de Implementación

### ✅ Cambios en Código (Completados)

1. **Schema Prisma** (`prisma/schema.prisma`)
   - ✅ Añadidos 3 nuevos modelos: `Renewal`, `RenewalHistory`, `RenewalAlert`
   - ✅ Añadidos 4 nuevos enums: `RenewalStatus`, `RenewalWindowStatus`, `RenewalAlertType`, `AlertSeverity`
   - ✅ Añadidas relaciones inversas en `Case` y `PolicyAnalysis`

2. **Validación Zod** (`src/lib/validation.ts`)
   - ✅ `RenewalFullSchema` - validación de datos completos de renovación
   - ✅ `RenewalHistorySchema` - validación de historial
   - ✅ `RenewalAlertSchema` - validación de alertas
   - ✅ Enums Zod correspondientes

3. **Tipos TypeScript** (`src/lib/types.ts`)
   - ✅ `RenewalFull` - tipo principal exportado
   - ✅ `RenewalHistory`, `RenewalAlert` - tipos auxiliares
   - ✅ `RenewalFiltersExtended` - para filtros UI
   - ✅ Enums exportados: `RenewalProcessStatus`, `RenewalWindowStatus`, `RenewalAlertType`, `AlertSeverity`

### ⏳ Cambios en Base de Datos (Pendiente de Aplicar)

El archivo SQL de migración se encuentra en:
```
migrations/add_renewals_phase1.sql
```

## Cómo Aplicar la Migración en Supabase

### Opción 1: Supabase SQL Editor (Recomendado)

1. Abre tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor** → **New Query**
3. Copia el contenido completo de `migrations/add_renewals_phase1.sql`
4. Pega en el editor y ejecuta (`Run` / `Ctrl+Enter`)
5. Verifica que no haya errores en la consola

### Opción 2: Prisma Migrate (Alternativa)

Si prefieres usar Prisma (requiere configuración local):
```bash
# Asegúrate de tener DATABASE_URL configurado apuntando a Supabase
npx prisma migrate dev --name add_renewals_phase1

# O para producción:
npx prisma migrate deploy
```

## Verificaciones Post-Migración

### 1. Verificar que las tablas se crearon

Ejecuta en Supabase SQL Editor:

```sql
-- Listar tablas nuevas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'renewal%'
ORDER BY table_name;

-- Deberías ver:
-- renewal_alerts
-- renewal_history
-- renewals
```

### 2. Verificar que los enums se crearon

```sql
-- Listar tipos enum nuevos
SELECT typname, enumlabel 
FROM pg_type 
JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid
WHERE typname LIKE '%renewal%' OR typname LIKE '%alert%'
ORDER BY typname, enumlabel;

-- Deberías ver:
-- alert_severity_enum: info, warning, critical
-- renewal_alert_type_enum: reminder, premium_increase, coverage_change, expiry_warning, document_required
-- renewal_status_enum: pending, in_review, approved, renewed, expired
-- renewal_window_status_enum: ok, dueSoon, overdue
```

### 3. Verificar índices

```sql
-- Listar índices en las tablas de renovación
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'renewal%'
ORDER BY tablename, indexname;

-- Deberías ver al menos 10 índices distribuidos en las 3 tablas
```

### 4. Verificar políticas RLS

```sql
-- Listar políticas RLS en tablas de renovación
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'renewal%'
ORDER BY tablename, policyname;

-- Deberías ver políticas para SELECT, INSERT, UPDATE, DELETE
```

### 5. Verificar estructura de tabla principal

```sql
-- Ver columnas de la tabla renewals
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'renewals'
ORDER BY ordinal_position;

-- Campos esperados:
-- id, case_id, policy_analysis_id, org_id, carrier, policy_number,
-- plan_name, current_start_date, current_end_date, renewal_date,
-- current_premium_minor, currency, proposed_premium_minor, 
-- premium_change_pct, status, renewal_window_status,
-- reminder_set, reminder_date, notes, created_at, updated_at
```

## Validación de Integridad

### Test de Inserción Básica

```sql
-- IMPORTANTE: Reemplaza los UUIDs con valores reales de tu BD
-- Este test verifica que puedes insertar una renovación

-- 1. Primero, obtén un case_id y org_id válidos
SELECT id as case_id, org_id 
FROM public.cases 
LIMIT 1;

-- 2. Inserta una renovación de prueba (usa los IDs del paso anterior)
INSERT INTO public.renewals (
  case_id,
  org_id,
  carrier,
  plan_name,
  current_start_date,
  current_end_date,
  renewal_date,
  current_premium_minor,
  currency,
  status
) VALUES (
  'TU_CASE_ID_AQUI'::uuid,  -- Reemplazar
  'TU_ORG_ID_AQUI'::uuid,   -- Reemplazar
  'Test Carrier',
  'Test Plan',
  now(),
  now() + interval '1 year',
  now() + interval '11 months',
  10000000,  -- 100,000.00 COP en centavos
  'COP',
  'pending'
) RETURNING id, carrier, plan_name, status;

-- Si esto funciona, la tabla está correctamente configurada
-- Puedes eliminar el registro de prueba después:
-- DELETE FROM public.renewals WHERE carrier = 'Test Carrier';
```

### Verificar Prisma Client (Local)

```bash
# Regenerar cliente Prisma con los nuevos modelos
npx prisma generate

# Verificar que no hay errores de TypeScript
npx tsc --noEmit src/lib/validation.ts src/lib/types.ts
```

## Checklist de Verificación

Marca cada item después de verificarlo:

### Pre-Migración
- [ ] Archivo `migrations/add_renewals_phase1.sql` revisado
- [ ] Backup de la base de datos creado (opcional pero recomendado)
- [ ] Acceso al SQL Editor de Supabase confirmado

### Aplicación de Migración
- [ ] SQL ejecutado sin errores en Supabase
- [ ] Todas las tablas creadas (`renewals`, `renewal_history`, `renewal_alerts`)
- [ ] Todos los enums creados (4 tipos)
- [ ] Índices creados correctamente

### Validación Post-Migración
- [ ] Query de verificación de tablas ejecutado ✅
- [ ] Query de verificación de enums ejecutado ✅
- [ ] Query de verificación de índices ejecutado ✅
- [ ] Query de verificación de RLS ejecutado ✅
- [ ] Test de inserción básica realizado (opcional)

### Validación Local
- [ ] `npx prisma generate` ejecutado sin errores
- [ ] TypeScript compila sin errores en archivos modificados

## Estado Actual

- **Código**: ✅ Completado y validado
- **Base de Datos**: ⏳ **Pendiente de aplicar migración**
- **Fase 2 (APIs)**: ⏸️ Esperando confirmación de Fase 1

## Próximos Pasos

Una vez que hayas aplicado la migración y verificado que todo funciona:

1. **Notifica en el chat**: "Migración aplicada y verificada"
2. **Comparte resultados**: Si hubo algún error o advertencia durante la migración
3. **Procede a Fase 2**: Implementación de endpoints API REST para renovaciones

## Notas Importantes

### RLS (Row Level Security)
- Las políticas RLS se basan en `org_id` y `org_members`
- Asegúrate de que tu implementación actual de RLS siga el mismo patrón
- Si usas un esquema de permisos diferente, ajusta las políticas en el SQL

### Montos en Centavos
- Todos los montos se guardan en **unidades menores** (centavos)
- Ejemplo: $100,000.00 COP → guardar como `10000000`
- Al mostrar en UI: `currentPremiumMinor / 100`
- Al guardar desde UI: `amountInPesos * 100`

### Índices de Performance
- Los índices creados optimizan las queries más comunes:
  - Filtrar por `case_id`, `org_id`
  - Ordenar por `renewal_date`
  - Filtrar por `status` y `renewal_window_status`

### Relaciones Opcionales
- `policy_analysis_id` es opcional (puede ser NULL)
- Permite crear renovaciones manuales sin PDF analizado
- Permite vincular renovaciones a análisis existentes

## Soporte

Si encuentras algún error durante la migración:
1. **No ejecutes el SQL repetidamente** si ya se aplicó parcialmente
2. Copia el mensaje de error completo
3. Verifica qué objetos se crearon con las queries de verificación
4. Comparte el error para ajustar el SQL según sea necesario
