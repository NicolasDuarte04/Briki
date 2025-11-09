# GUÍA DE TESTING - FASE 1: ANÁLISIS Y DIAGNÓSTICO

**Fecha**: 31 de Enero, 2025  
**Fase**: FASE 1 - Análisis y Diagnóstico de la Base de Datos Real  
**Objetivo**: Verificar que el análisis de la BD se realizó correctamente y que los datos documentados son precisos

---

## 📋 CHECKLIST DE VALIDACIÓN

### **PASO 1: VERIFICAR QUE EL SCRIPT SQL SE EJECUTÓ CORRECTAMENTE**

#### **1.1. Acceso a Supabase**
- [ ] Tienes acceso al Supabase Dashboard del proyecto
- [ ] Puedes acceder al SQL Editor
- [ ] Tienes permisos para ejecutar consultas

#### **1.2. Ejecución del Script**
- [ ] El script `scripts/analyze-db-structure.sql` se ejecutó completo
- [ ] No hubo errores durante la ejecución
- [ ] Todos los resultados se copiaron correctamente

#### **1.3. Verificación de Resultados**
- [ ] Se obtuvieron resultados para la sección "ESTRUCTURA DE messages"
- [ ] Se obtuvieron resultados para la sección "ESTRUCTURA DE profiles"
- [ ] Se obtuvieron resultados para la sección "FUNCIONES DE ENCRIPTACIÓN"
- [ ] Se obtuvieron resultados para la sección "ESTRUCTURA DE clients"
- [ ] Se obtuvieron resultados para la sección "CONFIGURACIÓN DE ENCRIPTACIÓN"
- [ ] Se obtuvieron resultados para la sección "RESUMEN DE HALLAZGOS"

---

### **PASO 2: VERIFICAR QUE LA DOCUMENTACIÓN ESTÁ COMPLETA**

#### **2.1. Archivo `docs/ESTRUCTURA_BD_REAL.md`**
- [ ] El archivo existe y está accesible
- [ ] Todas las secciones tienen datos completados
- [ ] Los resultados de las consultas SQL están pegados correctamente
- [ ] Las conclusiones están marcadas (✅ o ❌)
- [ ] Los escenarios están identificados (A, B o C)

#### **2.2. Completitud de Información**
- [ ] Sección 1 (messages): ✅ Completa
- [ ] Sección 2 (profiles): ✅ Completa
- [ ] Sección 3 (funciones): ✅ Completa
- [ ] Sección 4 (clients): ✅ Completa
- [ ] Sección 5 (configuración): ✅ Completa
- [ ] Resumen de hallazgos: ✅ Completo
- [ ] Conclusiones: ✅ Completas

---

### **PASO 3: VALIDAR PRECISIÓN DE LOS DATOS**

#### **3.1. Validación Manual de `messages`**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar tipo de content
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'messages'
  AND column_name = 'content';
```

**Validar**:
- [ ] El tipo reportado en la documentación coincide con este resultado
- [ ] Si es `bytea`, confirmar que está encriptado
- [ ] Si es `text` o `varchar`, confirmar que NO está encriptado

#### **3.2. Validación Manual de `profiles`**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar tipos de phone y address
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('phone', 'address');
```

**Validar**:
- [ ] Los tipos reportados en la documentación coinciden con estos resultados
- [ ] Si son `bytea`, confirmar que están encriptados
- [ ] Si son `text` o `varchar`, confirmar que NO están encriptados

#### **3.3. Validación de Funciones de Encriptación**

**Ejecutar en Supabase SQL Editor**:
```sql
-- Verificar que encrypt_pii y decrypt_pii existen
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('encrypt_pii', 'decrypt_pii');
```

**Validar**:
- [ ] Ambas funciones existen
- [ ] Las funciones están documentadas correctamente
- [ ] Las definiciones están completas

---

### **PASO 4: VERIFICAR CONSISTENCIA CON EL CÓDIGO ACTUAL**

#### **4.1. Comparar con Prisma Schema**

**Archivo**: `prisma/schema.prisma`

**Verificar**:
- [ ] El tipo de `Message.content` en Prisma coincide con la BD
  - Si Prisma dice `String` y BD dice `bytea` → ❌ INCONSISTENCIA
  - Si Prisma dice `String` y BD dice `text` → ✅ CONSISTENTE
  - Si Prisma dice `Bytes` y BD dice `bytea` → ✅ CONSISTENTE

- [ ] El tipo de `Profile.phone` y `Profile.address` en Prisma coincide con la BD
  - Si Prisma dice `String?` y BD dice `bytea` → ❌ INCONSISTENCIA
  - Si Prisma dice `String?` y BD dice `text` → ✅ CONSISTENTE
  - Si Prisma dice `Bytes?` y BD dice `bytea` → ✅ CONSISTENTE

#### **4.2. Comparar con Código de Encriptación**

**Archivo**: `src/lib/clientsDb.ts`

**Verificar**:
- [ ] El código usa `encrypt_pii()` y `decrypt_pii()` (como se espera)
- [ ] Las funciones existen en la BD (según documentación)
- [ ] El patrón de encriptación es consistente

---

### **PASO 5: IDENTIFICAR DISCREPANCIAS**

#### **5.1. Discrepancias Encontradas**

**Completar tabla**:

| Discrepancia | Tabla/Campo | Código Actual | BD Real | Impacto | Acción Requerida |
|--------------|-------------|---------------|---------|---------|------------------|
| [Ejemplo] | messages.content | String | bytea | 🔴 CRÍTICO | Actualizar código |
| | | | | | |
| | | | | | |

#### **5.2. Validar Impacto de Discrepancias**

Para cada discrepancia identificada:

- [ ] **Impacto en creación de clientes**: [ALTO/MEDIO/BAJO/NINGUNO]
- [ ] **Impacto en creación de cases**: [ALTO/MEDIO/BAJO/NINGUNO]
- [ ] **Impacto en guardado de mensajes**: [ALTO/MEDIO/BAJO/NINGUNO]
- [ ] **Impacto en lectura de mensajes**: [ALTO/MEDIO/BAJO/NINGUNO]

---

### **PASO 6: VERIFICAR PREPARACIÓN PARA FASE 2**

#### **6.1. Información Necesaria para FASE 2**

- [ ] Se identificó claramente el escenario para `messages` (A, B o C)
- [ ] Se identificó claramente el escenario para `profiles` (A, B o C)
- [ ] Se documentaron todas las funciones de encriptación disponibles
- [ ] Se identificaron todas las discrepancias entre código y BD
- [ ] Se tiene claro qué migraciones necesitan crearse/modificarse

#### **6.2. Decisiones Tomadas**

**Basado en los hallazgos, se decidió**:

- [ ] **Para messages**: [ACCIÓN ESPECÍFICA]
- [ ] **Para profiles**: [ACCIÓN ESPECÍFICA]
- [ ] **Para migraciones**: [ACCIÓN ESPECÍFICA]

---

## 🧪 TESTING DE VALIDACIÓN

### **TEST 1: Verificar Acceso a Datos**

**Objetivo**: Confirmar que podemos leer la estructura real de la BD

**Pasos**:
1. Ejecutar consulta simple en Supabase SQL Editor:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'messages' 
   AND column_name = 'content';
   ```

2. Verificar resultado:
   - [ ] La consulta se ejecuta sin errores
   - [ ] Se obtiene un resultado
   - [ ] El resultado coincide con la documentación

**Resultado Esperado**: ✅ Consulta exitosa con resultado consistente

---

### **TEST 2: Verificar Funciones de Encriptación**

**Objetivo**: Confirmar que las funciones de encriptación están disponibles

**Pasos**:
1. Ejecutar consulta en Supabase SQL Editor:
   ```sql
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name IN ('encrypt_pii', 'decrypt_pii');
   ```

2. Verificar resultado:
   - [ ] Se encuentran ambas funciones
   - [ ] Las funciones están en el schema `public`
   - [ ] Las funciones están documentadas

**Resultado Esperado**: ✅ Ambas funciones existen y están disponibles

---

### **TEST 3: Verificar Consistencia de Datos**

**Objetivo**: Confirmar que los datos documentados son precisos

**Pasos**:
1. Comparar manualmente los resultados del script con la documentación
2. Verificar cada sección:
   - [ ] Estructura de messages: ✅ Coincide
   - [ ] Estructura de profiles: ✅ Coincide
   - [ ] Funciones de encriptación: ✅ Coincide
   - [ ] Configuración: ✅ Coincide

**Resultado Esperado**: ✅ Todos los datos son consistentes

---

## ✅ CRITERIOS DE APROBACIÓN PARA CONTINUAR A FASE 2

La FASE 1 se considera **COMPLETA Y APROBADA** cuando:

- [x] ✅ El script SQL se ejecutó completamente sin errores
- [x] ✅ Todos los resultados se documentaron en `docs/ESTRUCTURA_BD_REAL.md`
- [x] ✅ Se identificó claramente el escenario para `messages` (A, B o C)
- [x] ✅ Se identificó claramente el escenario para `profiles` (A, B o C)
- [x] ✅ Se documentaron todas las funciones de encriptación disponibles
- [x] ✅ Se identificaron todas las discrepancias entre código y BD
- [x] ✅ Se validó la precisión de los datos documentados
- [x] ✅ Se tiene claro qué acciones se requieren en FASE 2

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

**Última actualización**: [FECHA]  
**Estado**: ⏳ LISTO PARA TESTING

