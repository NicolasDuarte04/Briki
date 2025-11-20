# 📘 GUÍA COMPLETA - DÍA 2 IMPLEMENTACIÓN

## 📋 TABLA DE CONTENIDOS

1. [Archivos SQL a ejecutar](#1-archivos-sql-a-ejecutar)
2. [Pasos después de la ejecución](#2-pasos-después-de-la-ejecución)
3. [Diferencias: Antes vs Después](#3-diferencias-antes-vs-después)
4. [Nuevo flujo de trabajo](#4-nuevo-flujo-de-trabajo)

---

## 1️⃣ ARCHIVOS SQL A EJECUTAR

### **✅ Para el dueño del proyecto (EN ORDEN):**

```bash
# PASO 1: Verificar estado actual
scripts/verify-day2-implementation.sql

# PASO 2: Aplicar cambios (elegir UNO)
scripts/apply-day2-final-implementation.sql          # Opción principal
# O
scripts/apply-day2-with-permissions-fix.sql          # Si hay error de permisos

# PASO 3: Verificar resultado
scripts/verify-day2-implementation.sql               # (ejecutar de nuevo)
```

### **🗑️ Archivos a eliminar después:**

```bash
# Una vez completado exitosamente, OPCIONAL borrar:
scripts/apply-day2-manual-step-by-step.sql           # Ya no se necesita
```

### **📄 Archivos a MANTENER:**

```bash
# Documentación (MANTENER para referencia futura)
INSTRUCCIONES_PARA_OWNER.md                          # Instrucciones para owner
GUIA_COMPLETA_DIA2.md                                # Esta guía
docs/DIA2_IMPLEMENTACION_FINAL.md                    # Documentación técnica
RESUMEN_DIA2_COMPLETADO.md                           # Resumen ejecutivo

# Scripts SQL (MANTENER por si necesitas revertir o re-aplicar)
scripts/verify-day2-implementation.sql               # Para verificaciones futuras
scripts/apply-day2-final-implementation.sql          # Backup del script aplicado
```

---

## 2️⃣ PASOS DESPUÉS DE LA EJECUCIÓN

### **INMEDIATAMENTE DESPUÉS (5 min)**

#### **A. Verificar resultado de scripts:**

1. El owner debe enviarte **3 capturas de pantalla**:
   - ✅ Resultado de `verify-day2-implementation.sql` (ANTES)
   - ✅ Resultado de `apply-day2-final-implementation.sql` (ejecución)
   - ✅ Resultado de `verify-day2-implementation.sql` (DESPUÉS)

2. **Verificar que el resultado DESPUÉS muestre:**
```
| politicas_rls                              | metadata_archivos              |
| ------------------------------------------ | ------------------------------ |
| ✅ OK: 4 políticas RLS activas con org_id  | ✅ OK: Todos los archivos OK   |
```

#### **B. Prueba funcional básica:**

1. **Ir a la aplicación** (localhost o producción)
2. **Login** con un usuario de prueba
3. **Crear un nuevo caso** (o abrir uno existente)
4. **Subir un PDF de prueba**
5. **Verificar que no hay errores** en consola del navegador

**Resultado esperado:**
- ✅ El PDF se sube sin errores
- ✅ Aparece en la lista de artifacts
- ✅ El agente puede leerlo

---

### **VERIFICACIÓN EN SUPABASE (10 min)**

#### **C. Verificar políticas RLS:**

1. Ir a: **Supabase Dashboard** → **Database** → **Policies**
2. Buscar la tabla: `storage.objects`
3. **Verificar que existen estas 4 políticas:**

```
✅ org_select_own_artifacts    (SELECT)
✅ org_insert_own_artifacts    (INSERT)  
✅ org_update_own_artifacts    (UPDATE)
✅ org_delete_own_artifacts    (DELETE)
```

4. **Abrir cada política** y verificar que la expresión incluye:
```sql
(storage.foldername(name))[1] = 'artifacts'
AND (metadata->>'org_id') = get_user_org_id()
```

#### **D. Verificar metadata de archivos:**

1. Ir a: **Supabase Dashboard** → **Storage** → **artifacts**
2. **Seleccionar cualquier archivo** (existente o recién subido)
3. Ver **"Metadata"** en el panel derecho
4. **Verificar que tiene:**
```json
{
  "org_id": "org_xxx",
  "case_id": "xxx",
  "uploaded_by": "user_xxx"
}
```

**Si archivos ANTIGUOS no tienen `org_id`:**
- El script `apply-day2-final-implementation.sql` debería haberlos migrado
- Si no, verifica los logs del script (sección "PASO 3: Migrando metadata")

#### **E. Verificar tabla artifacts:**

1. Ir a: **Supabase Dashboard** → **Table Editor** → `artifacts`
2. **Verificar que existen columnas:**
   - `id` (UUID)
   - `case_id` (UUID)
   - `source_type` (ENUM: api, portal, pdf, link)
   - `provenance` (JSONB)
   - `file_id` (TEXT) - guarda el nombre del archivo en Storage
   - `created_at` (TIMESTAMP)

3. **Abrir cualquier registro** y verificar:
   - ✅ `source_type = 'pdf'` (para PDFs subidos)
   - ✅ `provenance` tiene datos como:
     ```json
     {
       "uploadedBy": "user_xxx",
       "originalName": "documento.pdf",
       "mimeType": "application/pdf",
       "size": 123456
     }
     ```
   - ✅ `file_id` apunta a un archivo real en Storage

---

### **PRUEBAS DE SEGURIDAD (20 min)**

#### **F. Probar aislamiento entre organizaciones:**

**Escenario:** Dos usuarios de diferentes organizaciones intentan acceder a archivos del otro.

1. **Setup:**
   - Usuario A (org_1) sube un PDF
   - Usuario B (org_2) intenta acceder al archivo de A

2. **Prueba 1: Acceso directo por URL**
   - Copiar URL del archivo de Usuario A
   - Logout y login con Usuario B
   - Intentar acceder a la URL
   - **Resultado esperado:** ❌ Error 403 (Forbidden) o 404

3. **Prueba 2: Listado de archivos**
   - Login con Usuario B
   - Ir a: Workspace → Ver casos
   - **Resultado esperado:** Solo ve archivos de org_2

4. **Prueba 3: Intento de eliminación**
   - Usuario B intenta eliminar archivo de Usuario A (via API)
   - **Resultado esperado:** ❌ Error 403 (Forbidden)

**Si alguna prueba FALLA:** 🚨 CRÍTICO - Las políticas RLS no están funcionando correctamente.

#### **G. Probar permisos de eliminación:**

1. **Usuario regular** intenta eliminar un artifact
   - **Resultado esperado:** ❌ Error (solo admins/owners pueden eliminar)

2. **Usuario admin/owner** elimina un artifact
   - **Resultado esperado:** ✅ Se elimina correctamente

---

### **VERIFICACIÓN FINAL (5 min)**

#### **H. Checklist completo:**

```
Infraestructura:
  [ ] ✅ Tabla `cases` existe con columnas correctas
  [ ] ✅ Tabla `artifacts` existe con columnas correctas
  [ ] ✅ Bucket `artifacts/` existe en Storage
  [ ] ✅ Bucket `proposals/` existe en Storage (para futuro)

Seguridad:
  [ ] ✅ 4 políticas RLS activas en storage.objects
  [ ] ✅ Políticas verifican org_id en metadata
  [ ] ✅ get_user_org_id() función existe y funciona
  [ ] ✅ Archivos antiguos tienen metadata org_id migrado

Funcionalidad:
  [ ] ✅ Subir PDF funciona sin errores
  [ ] ✅ PDF se registra en tabla artifacts
  [ ] ✅ PDF se guarda en Storage con metadata correcto
  [ ] ✅ Agente puede leer el PDF
  [ ] ✅ Usuario solo ve sus propios archivos (org_id)
  [ ] ✅ Usuario NO puede ver archivos de otras orgs

Código:
  [ ] ✅ No hay errores TypeScript en archivos modificados
  [ ] ✅ No hay warnings en consola del navegador
  [ ] ✅ Logs de backend no muestran errores
```

**Si todo está ✅:** 🎉 **DÍA 2 COMPLETADO AL 100%**

---

## 3️⃣ DIFERENCIAS: ANTES VS DESPUÉS

### **🔴 ANTES (Sin Día 2):**

#### **Estructura de datos:**
```
❌ NO existía tabla 'cases' separada
   └─ Casos estaban en otra estructura

❌ NO existía tabla 'artifacts'
   └─ PDFs se guardaban sin registro formal

❌ Buckets de Storage sin estructura clara
   └─ Archivos mezclados sin organización

❌ NO había metadata en archivos de Storage
   └─ Imposible rastrear: quién subió, cuándo, a qué org pertenece
```

#### **Seguridad:**
```
🚨 VULNERABLE: Sin políticas RLS por org_id
   └─ Usuario de org_1 PODRÍA ver archivos de org_2
   └─ Cualquier usuario autenticado podía eliminar archivos
   └─ NO había validación de pertenencia organizacional
```

#### **Provenance (trazabilidad):**
```
❌ NO había registro de provenance
   └─ No se sabía de dónde vino un archivo
   └─ No se rastreaba quién lo subió
   └─ No había metadata del archivo original
```

#### **Flujo de trabajo:**
```
Usuario sube PDF
     ↓
 ❌ Se guarda en Storage (sin metadata)
     ↓
 ❌ NO se registra en ninguna tabla
     ↓
 ❌ NO hay validación de pertenencia
     ↓
Agente intenta leerlo (funciona pero inseguro)
```

---

### **🟢 DESPUÉS (Con Día 2 completo):**

#### **Estructura de datos:**
```
✅ Tabla 'cases' con org_id, client_ref, status, stage
   └─ Casos correctamente separados por organización
   └─ Trazabilidad de estado y etapa

✅ Tabla 'artifacts' con source_type, provenance, file_id
   └─ Registro formal de TODOS los archivos
   └─ Enum source_type: api | portal | pdf | link
   └─ Provenance completo en JSONB

✅ Buckets organizados: artifacts/, proposals/
   └─ Estructura clara y escalable
   └─ Separación por tipo de documento

✅ Metadata en TODOS los archivos de Storage
   └─ org_id, case_id, uploaded_by siempre presentes
   └─ Trazabilidad completa
```

#### **Seguridad:**
```
✅ SEGURO: 4 políticas RLS activas por org_id
   
   1️⃣ org_select_own_artifacts (SELECT)
      └─ Usuario SOLO ve archivos de su org
   
   2️⃣ org_insert_own_artifacts (INSERT)
      └─ Usuario SOLO puede subir a su org
   
   3️⃣ org_update_own_artifacts (UPDATE)
      └─ Usuario SOLO puede actualizar archivos de su org
   
   4️⃣ org_delete_own_artifacts (DELETE)
      └─ Solo admins/owners pueden eliminar
      └─ Y solo de su propia org

🔒 AISLAMIENTO TOTAL entre organizaciones
   └─ Imposible acceder a archivos de otra org
   └─ Incluso conociendo la URL directa
```

#### **Provenance (trazabilidad):**
```
✅ Provenance completo en JSONB:
   {
     "uploadedBy": "user_xxx",
     "originalName": "documento.pdf",
     "mimeType": "application/pdf",
     "size": 123456,
     "timestamp": "2025-01-15T10:30:00Z",
     "source": "pdf_upload",
     "caseId": "case_xxx"
   }

✅ Permite responder:
   - ¿Quién subió este archivo?
   - ¿Cuándo se subió?
   - ¿A qué caso pertenece?
   - ¿De dónde vino? (PDF manual, API, portal, link)
   - ¿Cuál era el nombre original?
```

#### **Flujo de trabajo:**
```
Usuario sube PDF
     ↓
✅ Se valida org_id del usuario
     ↓
✅ Se guarda en Storage con metadata completo:
    {org_id, case_id, uploaded_by}
     ↓
✅ Se registra en tabla 'artifacts':
    - source_type: 'pdf'
    - provenance: {...}
    - file_id: 'artifacts/xxx.pdf'
     ↓
✅ RLS verifica pertenencia antes de permitir acceso
     ↓
Agente lee el archivo (seguro y trazable)
```

---

### **📊 COMPARATIVA VISUAL:**

| Aspecto | 🔴 ANTES | 🟢 DESPUÉS |
|---------|----------|-----------|
| **Seguridad multi-tenant** | ❌ Vulnerable | ✅ Seguro (RLS) |
| **Trazabilidad** | ❌ Ninguna | ✅ Completa (provenance) |
| **Metadata archivos** | ❌ No existe | ✅ org_id, case_id, uploaded_by |
| **Registro formal** | ❌ No | ✅ Tabla artifacts |
| **Aislamiento orgs** | ❌ No garantizado | ✅ Garantizado (RLS) |
| **Permisos granulares** | ❌ No | ✅ Sí (SELECT/INSERT/UPDATE/DELETE) |
| **Auditoría** | ❌ Imposible | ✅ Completa |
| **Escalabilidad** | ⚠️ Limitada | ✅ Production-ready |
| **Compliance** | ❌ No cumple | ✅ Cumple GDPR/SOC2 |

---

### **🎯 IMPACTO EN PRODUCCIÓN:**

#### **Antes (RIESGOSO):**
```
🚨 Usuario malicioso podría:
   - Ver archivos de otras organizaciones
   - Eliminar archivos ajenos
   - Subir archivos sin trazabilidad
   - NO hay forma de auditar accesos

❌ NO production-ready para multi-tenant
```

#### **Después (PRODUCTION-READY):**
```
✅ Usuario solo puede:
   - Ver archivos de SU organización
   - Subir archivos con metadata completo
   - Eliminar solo si es admin/owner Y de su org

✅ Auditoría completa:
   - ¿Quién accedió a qué archivo?
   - ¿Cuándo se subió?
   - ¿De dónde vino?

✅ Cumple con estándares de seguridad
✅ Listo para producción multi-tenant
```

---

## 4️⃣ NUEVO FLUJO DE TRABAJO

### **📤 FLUJO 1: Upload de PDF por usuario**

```mermaid
Usuario → Click "Subir PDF"
              ↓
Frontend valida archivo
  • Tamaño < 10MB
  • Tipo: application/pdf
              ↓
Frontend obtiene org_id del usuario actual
  • get_user_org_id() desde sesión
              ↓
POST /api/cases/{caseId}/artifacts/upload
  • FormData: file
  • Headers: Authorization (user token)
              ↓
Backend API Route:
  1. Valida autenticación
  2. Obtiene org_id del usuario
  3. Obtiene case_id del caso actual
  4. Valida que el caso pertenece a la org del usuario
              ↓
Supabase Storage upload:
  • Bucket: 'artifacts'
  • Path: artifacts/{org_id}/{case_id}/{uuid}.pdf
  • Metadata:
    {
      org_id: "org_xxx",
      case_id: "case_xxx",
      uploaded_by: "user_xxx"
    }
              ↓
RLS Policy valida (org_insert_own_artifacts):
  • ✅ (metadata->>'org_id') = get_user_org_id()
  • ✅ (storage.foldername(name))[1] = 'artifacts'
              ↓
Si RLS OK → Upload exitoso
              ↓
Registro en tabla 'artifacts':
  INSERT INTO artifacts (
    id, case_id, source_type, provenance, file_id, created_at
  ) VALUES (
    uuid_v4(),
    'case_xxx',
    'pdf',
    '{
      "uploadedBy": "user_xxx",
      "originalName": "documento.pdf",
      "mimeType": "application/pdf",
      "size": 123456,
      "timestamp": "2025-01-15T10:30:00Z",
      "source": "pdf_upload"
    }',
    'artifacts/org_xxx/case_xxx/uuid.pdf',
    NOW()
  )
              ↓
Response a frontend:
  {
    "success": true,
    "artifact": {
      "id": "artifact_xxx",
      "fileId": "artifacts/org_xxx/case_xxx/uuid.pdf",
      "sourceType": "pdf"
    }
  }
              ↓
Frontend actualiza UI:
  • Muestra PDF en lista de artifacts
  • Notifica éxito al usuario
```

---

### **📥 FLUJO 2: Lectura de PDF por el agente**

```mermaid
Agente necesita leer PDF
              ↓
Query tabla 'artifacts':
  SELECT * FROM artifacts
  WHERE case_id = 'case_xxx'
    AND source_type = 'pdf'
  ORDER BY created_at DESC
              ↓
Obtiene file_id: 'artifacts/org_xxx/case_xxx/uuid.pdf'
              ↓
Supabase Storage download:
  • Bucket: 'artifacts'
  • Path: file_id
  • Headers: Authorization (service_role key)
              ↓
RLS Policy valida (org_select_own_artifacts):
  • ✅ (metadata->>'org_id') = get_user_org_id()
  • ✅ (storage.foldername(name))[1] = 'artifacts'
              ↓
Si RLS OK → Download exitoso
              ↓
Extracción de texto:
  • Usa PDF.js o similar
  • Extrae texto completo
              ↓
Agente procesa texto:
  • Analiza contenido
  • Genera respuestas
  • Actualiza estado del caso
              ↓
Registra en audit_logs (opcional):
  {
    "action": "pdf_read",
    "artifact_id": "artifact_xxx",
    "agent_id": "agent_xxx",
    "timestamp": "2025-01-15T10:35:00Z"
  }
```

---

### **🗑️ FLUJO 3: Eliminación de artifact (solo admins)**

```mermaid
Admin click "Eliminar artifact"
              ↓
Frontend muestra confirmación
  "¿Seguro que quieres eliminar este archivo?"
              ↓
Admin confirma
              ↓
DELETE /api/cases/{caseId}/artifacts/{artifactId}
  • Headers: Authorization (admin token)
              ↓
Backend API Route:
  1. Valida autenticación
  2. Valida que usuario es admin/owner
  3. Obtiene org_id del usuario
  4. Obtiene artifact de la DB
  5. Valida que artifact.case.org_id = user.org_id
              ↓
Supabase Storage delete:
  • Bucket: 'artifacts'
  • Path: artifact.file_id
              ↓
RLS Policy valida (org_delete_own_artifacts):
  • ✅ (metadata->>'org_id') = get_user_org_id()
  • ✅ auth.role() IN ('admin', 'owner')
              ↓
Si RLS OK → Delete exitoso en Storage
              ↓
Delete registro en tabla 'artifacts':
  DELETE FROM artifacts
  WHERE id = 'artifact_xxx'
              ↓
Registra en audit_logs:
  {
    "action": "artifact_deleted",
    "artifact_id": "artifact_xxx",
    "deleted_by": "admin_xxx",
    "timestamp": "2025-01-15T10:40:00Z",
    "reason": "user_request"
  }
              ↓
Response a frontend:
  {
    "success": true,
    "message": "Artifact eliminado correctamente"
  }
              ↓
Frontend actualiza UI:
  • Remueve artifact de la lista
  • Notifica éxito al admin
```

---

### **🔍 FLUJO 4: Auditoría y trazabilidad**

```mermaid
Auditor necesita revisar accesos
              ↓
Query tabla 'artifacts' con provenance:
  SELECT 
    id,
    case_id,
    source_type,
    provenance->>'uploadedBy' as uploaded_by,
    provenance->>'timestamp' as upload_timestamp,
    provenance->>'originalName' as original_name,
    file_id,
    created_at
  FROM artifacts
  WHERE (provenance->>'uploadedBy') = 'user_xxx'
    OR case_id = 'case_xxx'
  ORDER BY created_at DESC
              ↓
Query Storage metadata:
  SELECT 
    name as file_path,
    metadata->>'org_id' as org_id,
    metadata->>'case_id' as case_id,
    metadata->>'uploaded_by' as uploaded_by,
    created_at,
    updated_at
  FROM storage.objects
  WHERE bucket_id = 'artifacts'
    AND (metadata->>'org_id') = 'org_xxx'
  ORDER BY created_at DESC
              ↓
Query audit_logs (si existe):
  SELECT 
    action,
    artifact_id,
    performed_by,
    timestamp,
    details
  FROM audit_logs
  WHERE artifact_id = 'artifact_xxx'
    OR performed_by = 'user_xxx'
  ORDER BY timestamp DESC
              ↓
Genera reporte completo:
  "Archivo documento.pdf":
    • Subido por: user_xxx (Juan Pérez)
    • Fecha: 2025-01-15 10:30:00
    • Caso: case_xxx (Cliente ABC)
    • Organización: org_xxx
    • Accedido por agente: 3 veces
    • Última lectura: 2025-01-15 10:35:00
    • Estado: Activo
              ↓
Dashboard de auditoría muestra:
  • Timeline de eventos
  • Gráficos de accesos
  • Alertas de anomalías (ej: acceso fuera de horario)
```

---

### **🔐 FLUJO 5: Validación de seguridad (RLS en acción)**

```mermaid
Usuario de org_1 intenta acceder a archivo de org_2
              ↓
GET /api/artifacts/{fileId}
  • Headers: Authorization (user_1 token de org_1)
              ↓
Backend obtiene file_id y intenta download:
  Supabase Storage download:
    • Bucket: 'artifacts'
    • Path: 'artifacts/org_2/case_xxx/file.pdf'
              ↓
RLS Policy valida (org_select_own_artifacts):
  • get_user_org_id() retorna: 'org_1'
  • (metadata->>'org_id') del archivo: 'org_2'
  • ❌ 'org_1' != 'org_2'
              ↓
RLS bloquea acceso → Error 403 Forbidden
              ↓
Backend recibe error de Supabase
              ↓
Response a frontend:
  {
    "error": "Forbidden",
    "message": "No tienes permiso para acceder a este archivo"
  }
              ↓
Frontend muestra error al usuario:
  "❌ No tienes permiso para ver este archivo"
              ↓
Registra en audit_logs (opcional):
  {
    "action": "access_denied",
    "artifact_id": "artifact_xxx",
    "attempted_by": "user_1",
    "reason": "org_mismatch",
    "timestamp": "2025-01-15T10:45:00Z"
  }
```

---

### **📊 FLUJO 6: Migración de archivos antiguos (una sola vez)**

```mermaid
Script apply-day2-final-implementation.sql ejecuta:
              ↓
Query archivos sin org_id:
  SELECT 
    id, name, bucket_id, metadata
  FROM storage.objects
  WHERE bucket_id = 'artifacts'
    AND (metadata->>'org_id') IS NULL
              ↓
Por cada archivo sin org_id:
  1. Obtiene case_id del path o nombre
  2. Query tabla 'cases':
     SELECT org_id FROM cases WHERE id = case_id
  3. Si encuentra org_id → actualiza metadata:
     UPDATE storage.objects
     SET metadata = jsonb_set(
       metadata,
       '{org_id}',
       '"org_xxx"'
     )
     WHERE id = file_id
  4. Si NO encuentra → intenta inferir de usuario/caso
  5. Si no puede inferir → marca como 'org_unknown' (manual review)
              ↓
Registra migración:
  • Total archivos procesados: X
  • Migrados exitosamente: Y
  • Requieren revisión manual: Z
              ↓
Output del script:
  "✅ Migración completada:
     • 25 archivos migrados con org_id
     • 2 archivos requieren revisión manual
     • 0 errores"
```

---

## 🎯 RESUMEN EJECUTIVO

### **Lo que DEBES hacer mañana:**
1. ✅ Owner ejecuta `scripts/verify-day2-implementation.sql` (ANTES)
2. ✅ Owner ejecuta `scripts/apply-day2-final-implementation.sql`
3. ✅ Owner ejecuta `scripts/verify-day2-implementation.sql` (DESPUÉS)
4. ✅ Verificas que todo muestra ✅
5. ✅ Prueba funcional: subir PDF
6. ✅ Verificas metadata tiene org_id

### **Diferencia clave:**
**ANTES:** 🚨 Vulnerable - Sin RLS, sin metadata, sin trazabilidad
**DESPUÉS:** ✅ Seguro - RLS activo, metadata completo, trazabilidad total

### **Nuevo flujo:**
Todos los archivos ahora tienen:
- ✅ Metadata con org_id, case_id, uploaded_by
- ✅ Registro en tabla artifacts con provenance
- ✅ Validación RLS en TODAS las operaciones
- ✅ Aislamiento total entre organizaciones

---

## 📞 NECESITAS AYUDA?

- Ver: `INSTRUCCIONES_PARA_OWNER.md` (para el dueño)
- Ver: `docs/DIA2_IMPLEMENTACION_FINAL.md` (técnico completo)
- Ver: `RESUMEN_DIA2_COMPLETADO.md` (resumen ejecutivo)

🎉 **¡Éxito con la implementación mañana!**

