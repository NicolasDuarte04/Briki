# Instrucciones para Aplicar Migraciones del Día 5

## Migraciones a Aplicar

1. `20250127_add_audit_trigger_to_clients.sql`
2. `20250127_refine_rls_to_clients.sql`

---

## Método 1: Supabase Dashboard (Recomendado)

1. Abre tu navegador y ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto: `ikbnuvvqcqbpgqwtjyah`
3. Navega a: **SQL Editor** → **+ New query**
4. Copia y pega el contenido de cada migración (una por una)
5. Haz clic en **Run** para ejecutar cada una
6. Verifica que no haya errores

---

## Método 2: Supabase CLI (Si tienes acceso)

```bash
# Si tienes Supabase CLI instalado
supabase db push

# O específicamente las migraciones nuevas
supabase migration up
```

---

## Contenido de las Migraciones

### Migración 1: Audit Trigger

**Archivo:** `supabase/migrations/20250127_add_audit_trigger_to_clients.sql`

**Qué hace:**
- Añade un trigger que registra automáticamente todas las operaciones (INSERT, UPDATE, DELETE) en la tabla `audit_log`
- Sincroniza `clients` con el patrón de auditoría de `cases` y `artifacts`

**Riesgo:** BAJO ✅ - Solo añade funcionalidad, no elimina nada

---

### Migración 2: RLS Refinado

**Archivo:** `supabase/migrations/20250127_refine_rls_to_clients.sql`

**Qué hace:**
- Elimina la política general `FOR ALL` (too broad)
- Crea 4 políticas específicas:
  1. SELECT - Todos los miembros pueden leer
  2. INSERT - Todos los miembros pueden crear
  3. UPDATE - Solo admins/owners pueden actualizar
  4. DELETE - Solo admins pueden eliminar

**Riesgo:** BAJO ✅ - Mejora la seguridad, solo restringe operaciones

---

## Validación Post-Migración

### Verificar Trigger de Auditoría

```sql
-- Verificar que el trigger existe
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'clients'
    AND trigger_name = 'audit_clients_trigger';
```

**Resultado esperado:**
```
trigger_name              | event_manipulation | event_object_table | action_statement
---------------------------|-------------------|---------------------|------------------
audit_clients_trigger     | INSERT             | clients             | EXECUTE FUNCTION audit_trigger_function()
audit_clients_trigger     | UPDATE             | clients             | EXECUTE FUNCTION audit_trigger_function()
audit_clients_trigger     | DELETE             | clients             | EXECUTE FUNCTION audit_trigger_function()
```

---

### Verificar Políticas RLS

```sql
-- Verificar que las políticas existen
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies
WHERE tablename = 'clients';
```

**Resultado esperado:**
```
policyname                         | permissive | roles    | cmd
-----------------------------------|------------|----------|-----------
clients_org_isolation_select       | PERMISSIVE | {public} | SELECT
clients_org_isolation_insert        | PERMISSIVE | {public} | INSERT
clients_org_isolation_update        | PERMISSIVE | {public} | UPDATE
clients_org_isolation_delete        | PERMISSIVE | {public} | DELETE
```

---

### Probar Funcionalidad

#### Test 1: Crear Cliente (Member)

```sql
-- Como usuario "member", intentar crear cliente
INSERT INTO public.clients (org_id, name_enc, email_enc)
VALUES ('org-uuid', encrypt_pii('Test Client'), encrypt_pii('test@email.com'));

-- Resultado esperado: ✅ INSERT exitoso
```

#### Test 2: Actualizar Cliente (Member)

```sql
-- Como usuario "member", intentar actualizar cliente
UPDATE public.clients
SET name_enc = encrypt_pii('Updated Name')
WHERE id = 'client-uuid';

-- Resultado esperado: ❌ UPDATE bloqueado (solo admins)
```

#### Test 3: Eliminar Cliente (Member)

```sql
-- Como usuario "member", intentar eliminar cliente
DELETE FROM public.clients
WHERE id = 'client-uuid';

-- Resultado esperado: ❌ DELETE bloqueado (solo admins)
```

#### Test 4: Verificar Auditoría

```sql
-- Verificar que se registró la auditoría
SELECT 
    action,
    resource_type,
    resource_id,
    user_id,
    created_at
FROM public.audit_log
WHERE resource_type = 'clients'
ORDER BY created_at DESC
LIMIT 5;
```

**Resultado esperado:**
```
action  | resource_type | resource_id | user_id             | created_at
--------|---------------|-------------|---------------------|--------------------
INSERT  | clients       | xxx-uuid    | yyy-uuid (member)  | 2025-01-27 10:30:00
UPDATE  | clients       | xxx-uuid    | zzz-uuid (admin)   | 2025-01-27 10:35:00
DELETE  | clients       | xxx-uuid    | zzz-uuid (admin)   | 2025-01-27 10:40:00
```

---

## Rollback (Si es necesario)

Si necesitas revertir las migraciones:

```sql
-- Revertir migración 1: Eliminar trigger
DROP TRIGGER IF EXISTS audit_clients_trigger ON public.clients;

-- Revertir migración 2: Restaurar política general
DROP POLICY IF EXISTS "clients_org_isolation_select" ON public.clients;
DROP POLICY IF EXISTS "clients_org_isolation_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_org_isolation_update" ON public.clients;
DROP POLICY IF EXISTS "clients_org_isolation_delete" ON public.clients;

-- Restaurar política original (too broad)
CREATE POLICY "org_members_can_view_clients" 
    ON public.clients FOR ALL 
    USING (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    ));
```

---

## Resumen de Cambios

### Archivos Modificados: 0
- ✅ No se modifica ningún archivo de código TypeScript
- ✅ No se modifica ningún archivo de API
- ✅ Solo se añaden migraciones SQL

### Archivos Nuevos: 2
1. `supabase/migrations/20250127_add_audit_trigger_to_clients.sql`
2. `supabase/migrations/20250127_refine_rls_to_clients.sql`

### Impacto en Funcionalidades Existentes: NINGUNO ✅
- ✅ Los datos cifrados siguen funcionando igual
- ✅ Las APIs siguen funcionando igual
- ✅ Solo se AÑADE auditoría automática
- ✅ Solo se RESTRINGEN operaciones sensibles (mejora seguridad)

---

## Notas Importantes

1. **Backup:** Asegúrate de tener un backup antes de aplicar las migraciones
2. **Orden:** Aplica las migraciones en el orden cronológico (20250127_*)
3. **Validación:** Ejecuta los tests de validación después de cada migración
4. **Rollback:** Si algo sale mal, usa el script de rollback proporcionado

