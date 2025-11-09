# GUÍA DE TESTING - FASE 2: SINCRONIZACIÓN DE MIGRACIONES

**Fecha**: 31 de Enero, 2025  
**Fase**: FASE 2 - Sincronización de Migraciones con Base de Datos  
**Objetivo**: Verificar que las columnas fueron renombradas correctamente y que la migración preservó la encriptación

---

## 📋 CHECKLIST DE VALIDACIÓN

### **PASO 1: VERIFICAR QUE LA MIGRACIÓN SE EJECUTÓ CORRECTAMENTE**

#### **1.1. Ejecución del Script**
- [ ] El script `scripts/execute-phase2-migration.sh` se ejecutó sin errores
- [ ] Se generaron los archivos de resultados en `.phase2-results/`
- [ ] No hubo errores críticos durante la ejecución

#### **1.2. Verificación de Archivos Generados**
- [ ] `.phase2-results/before-state.txt` existe y contiene información
- [ ] `.phase2-results/after-state.txt` existe y contiene información
- [ ] `.phase2-results/migration-output.txt` existe y muestra NOTICE exitosos
- [ ] `supabase/migrations/20250131_rename_encrypted_columns_to_normal_names.sql` existe

---

### **PASO 2: VERIFICAR RENOMBRADO DE COLUMNAS**

#### **2.1. Verificar `messages.content`**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar que content existe y es BYTEA
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
  AND column_name = 'content';
```

**Validar**:
- [ ] La columna `content` existe
- [ ] El tipo de dato es `bytea` (NO `text` ni `varchar`)
- [ ] La columna `content_enc` NO existe (fue renombrada)

**Resultado Esperado**:
```
 column_name | data_type | is_nullable 
-------------+-----------+-------------
 content     | bytea     | YES
```

#### **2.2. Verificar `profiles.phone`**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar que phone existe y es BYTEA
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name = 'phone';
```

**Validar**:
- [ ] La columna `phone` existe
- [ ] El tipo de dato es `bytea` (NO `text` ni `varchar`)
- [ ] La columna `phone_enc` NO existe (fue renombrada)

**Resultado Esperado**:
```
 column_name | data_type | is_nullable 
-------------+-----------+-------------
 phone      | bytea    | YES
```

#### **2.3. Verificar `profiles.address`**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar que address existe y es BYTEA
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name = 'address';
```

**Validar**:
- [ ] La columna `address` existe
- [ ] El tipo de dato es `bytea` (NO `text` ni `varchar`)
- [ ] La columna `address_enc` NO existe (fue renombrada)

**Resultado Esperado**:
```
 column_name | data_type | is_nullable 
-------------+-----------+-------------
 address     | bytea     | YES
```

---

### **PASO 3: VERIFICAR QUE NO QUEDAN COLUMNAS `_enc`**

#### **3.1. Verificar Ausencia de Columnas `_enc`**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar que no quedan columnas _enc en messages y profiles
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND (
    (table_name = 'messages' AND column_name LIKE '%_enc')
    OR (table_name = 'profiles' AND column_name IN ('phone_enc', 'address_enc', 'content_enc'))
  );
```

**Validar**:
- [ ] No se encuentran columnas `content_enc` en `messages`
- [ ] No se encuentran columnas `phone_enc` en `profiles`
- [ ] No se encuentran columnas `address_enc` en `profiles`

**Resultado Esperado**: 
```
(0 rows)
```

**Nota**: Si aparece `name_enc` en `profiles`, eso es normal y no es parte de esta migración.

---

### **PASO 4: VERIFICAR PRESERVACIÓN DE DATOS**

#### **4.1. Verificar Datos en `messages`**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar que hay datos y que content es BYTEA
SELECT 
    COUNT(*) as total_mensajes,
    COUNT(CASE WHEN content IS NOT NULL THEN 1 END) as mensajes_con_contenido
FROM public.messages;
```

**Validar**:
- [ ] Los datos existen (si había datos antes)
- [ ] El conteo es consistente con el estado anterior
- [ ] No se perdieron datos durante el renombrado

#### **4.2. Verificar Datos en `profiles`**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar que hay datos y que phone/address son BYTEA
SELECT 
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as profiles_con_phone,
    COUNT(CASE WHEN address IS NOT NULL THEN 1 END) as profiles_con_address
FROM public.profiles;
```

**Validar**:
- [ ] Los datos existen (si había datos antes)
- [ ] El conteo es consistente con el estado anterior
- [ ] No se perdieron datos durante el renombrado

---

### **PASO 5: VERIFICAR FUNCIONES DE ENCRIPTACIÓN**

#### **5.1. Verificar `encrypt_pii()` y `decrypt_pii()`**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar que las funciones existen
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('encrypt_pii', 'decrypt_pii');
```

**Validar**:
- [ ] `encrypt_pii` existe
- [ ] `decrypt_pii` existe
- [ ] Ambas son funciones (`FUNCTION`)

**Resultado Esperado**:
```
 routine_name | routine_type 
--------------+--------------
 decrypt_pii  | FUNCTION
 encrypt_pii  | FUNCTION
```

#### **5.2. Probar Funciones de Encriptación**

**Ejecutar en Supabase SQL Editor** (requiere `APP_ENCRYPTION_KEY` configurada):
```sql
-- Probar encriptación/desencriptación
DO $$
DECLARE
    test_text text := 'Test message';
    encrypted_data bytea;
    decrypted_data text;
BEGIN
    -- Configurar clave de encriptación (usar la clave real de tu .env.local)
    PERFORM set_config('app.encryption_key', current_setting('app.encryption_key', true), true);
    
    -- Encriptar
    encrypted_data := encrypt_pii(test_text);
    
    -- Desencriptar
    decrypted_data := decrypt_pii(encrypted_data);
    
    -- Verificar
    IF decrypted_data = test_text THEN
        RAISE NOTICE '✅ Funciones de encriptación funcionan correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: Datos desencriptados no coinciden';
    END IF;
END $$;
```

**Validar**:
- [ ] La encriptación funciona
- [ ] La desencriptación funciona
- [ ] Los datos desencriptados coinciden con los originales

---

### **PASO 6: VERIFICAR IDEMPOTENCIA DE LA MIGRACIÓN**

#### **6.1. Ejecutar Migración por Segunda Vez**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Ejecutar la migración nuevamente (debe ser idempotente)
\i supabase/migrations/20250131_rename_encrypted_columns_to_normal_names.sql
```

**Validar**:
- [ ] La migración se ejecuta sin errores
- [ ] No se intenta renombrar columnas que ya están renombradas
- [ ] Los NOTICE indican que las columnas ya existen

**Resultado Esperado**: NOTICE que indican que las columnas ya existen, sin errores.

---

### **PASO 7: VERIFICAR COMENTARIOS DE COLUMNAS**

#### **7.1. Verificar Comentarios**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar comentarios de columnas
SELECT 
    table_name,
    column_name,
    col_description(
        (table_schema||'.'||table_name)::regclass::oid,
        ordinal_position
    ) as comment
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND (
    (table_name = 'messages' AND column_name = 'content')
    OR (table_name = 'profiles' AND column_name IN ('phone', 'address'))
  )
ORDER BY table_name, column_name;
```

**Validar**:
- [ ] Los comentarios existen
- [ ] Los comentarios mencionan que son BYTEA
- [ ] Los comentarios mencionan `encrypt_pii()` y `decrypt_pii()`

---

## 🧪 TESTING DE VALIDACIÓN

### **TEST 1: Verificar Renombrado Completo**

**Objetivo**: Confirmar que todas las columnas fueron renombradas

**Pasos**:
1. Ejecutar consulta para verificar columnas:
   ```sql
   SELECT 
       table_name,
       column_name,
       data_type
   FROM information_schema.columns
   WHERE table_schema = 'public' 
     AND (
       (table_name = 'messages' AND column_name IN ('content', 'content_enc'))
       OR (table_name = 'profiles' AND column_name IN ('phone', 'phone_enc', 'address', 'address_enc'))
     )
   ORDER BY table_name, column_name;
   ```

2. Verificar resultado:
   - [ ] `messages.content` existe (BYTEA)
   - [ ] `messages.content_enc` NO existe
   - [ ] `profiles.phone` existe (BYTEA)
   - [ ] `profiles.phone_enc` NO existe
   - [ ] `profiles.address` existe (BYTEA)
   - [ ] `profiles.address_enc` NO existe

**Resultado Esperado**: ✅ Solo columnas con nombres normales (`content`, `phone`, `address`)

---

### **TEST 2: Verificar Tipo BYTEA**

**Objetivo**: Confirmar que todas las columnas mantienen tipo BYTEA

**Pasos**:
1. Ejecutar consulta:
   ```sql
   SELECT 
       table_name,
       column_name,
       data_type
   FROM information_schema.columns
   WHERE table_schema = 'public' 
     AND (
       (table_name = 'messages' AND column_name = 'content')
       OR (table_name = 'profiles' AND column_name IN ('phone', 'address'))
     )
   ORDER BY table_name, column_name;
   ```

2. Verificar resultado:
   - [ ] Todas las columnas tienen `data_type = 'bytea'`
   - [ ] Ninguna columna tiene `data_type = 'text'` o `'varchar'`

**Resultado Esperado**: ✅ Todas las columnas son `bytea`

---

### **TEST 3: Verificar Preservación de Datos**

**Objetivo**: Confirmar que no se perdieron datos durante el renombrado

**Pasos**:
1. Comparar conteos antes/después:
   ```sql
   -- Contar mensajes
   SELECT COUNT(*) as total_mensajes FROM public.messages;
   
   -- Contar profiles
   SELECT COUNT(*) as total_profiles FROM public.profiles;
   ```

2. Verificar resultado:
   - [ ] Los conteos son consistentes con el estado anterior
   - [ ] No hay pérdida de datos

**Resultado Esperado**: ✅ Conteos consistentes, sin pérdida de datos

---

### **TEST 4: Verificar Idempotencia**

**Objetivo**: Confirmar que la migración puede ejecutarse múltiples veces

**Pasos**:
1. Ejecutar la migración por segunda vez
2. Verificar que no hay errores
3. Verificar que el estado final es el mismo

**Resultado Esperado**: ✅ Migración idempotente, sin errores en segunda ejecución

---

## ✅ CRITERIOS DE APROBACIÓN PARA CONTINUAR A FASE 3

La FASE 2 se considera **COMPLETA Y APROBADA** cuando:

- [x] ✅ La migración se ejecutó sin errores
- [x] ✅ `messages.content` existe como BYTEA
- [x] ✅ `profiles.phone` existe como BYTEA
- [x] ✅ `profiles.address` existe como BYTEA
- [x] ✅ No quedan columnas `content_enc`, `phone_enc`, `address_enc`
- [x] ✅ Los datos se preservaron durante el renombrado
- [x] ✅ Las funciones `encrypt_pii()` y `decrypt_pii()` existen
- [x] ✅ La migración es idempotente
- [x] ✅ Los comentarios de columnas están actualizados

---

## 📝 NOTAS DE TESTING

**Fecha de Testing**: [FECHA]  
**Tester**: [NOMBRE]  
**Resultado General**: [APROBADO/PENDIENTE/REQUIERE CORRECCIONES]

**Problemas Encontrados**:
1. [DESCRIPCIÓN DEL PROBLEMA]
   - **Impacto**: [ALTO/MEDIO/BAJO]
   - **Solución**: [DESCRIPCIÓN]

**Observaciones**:
- [AGREGAR OBSERVACIONES ADICIONALES]

---

**Última actualización**: 31 de Enero, 2025  
**Estado**: ⏳ LISTO PARA TESTING

