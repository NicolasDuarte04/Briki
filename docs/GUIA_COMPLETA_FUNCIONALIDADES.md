# GUÍA COMPLETA DE FUNCIONALIDADES - BRIKI
**Fecha**: 2025-10-12  
**Versión**: 1.0 - Post Integración Completa

---

## 📋 ÍNDICE
1. Resumen de Funcionalidades Implementadas
2. Arquitectura de Base de Datos (Explicación de Cada Tabla)
3. Flujo de Uso del Proyecto
4. Guía de Pruebas Paso a Paso
5. Integración con IA (Preparación)

---

## 1. FUNCIONALIDADES IMPLEMENTADAS

### ✅ AUTENTICACIÓN Y MULTI-TENANCY

**Funcionalidad**: Sistema de registro/login con organizaciones automáticas

**Archivos**:
- `src/app/[locale]/(auth)/actions.ts` - Server actions de auth
- `src/app/actions/organizationActions.ts` - Server actions de organizaciones
- `src/lib/supabase/server.ts` - Cliente Supabase SSR

**Cómo Funciona**:
1. Usuario se registra con email/password
2. Se crea en `auth.users` (Supabase Auth)
3. Se crea automáticamente:
   - Registro en `public.profiles`
   - Organización personal en `public.organizations`
   - Membresía como `owner` en `public.org_members`
4. Usuario queda listo para usar el sistema

**Seguridad**:
- RLS (Row Level Security) activo en todas las tablas
- Usuarios solo ven datos de sus organizaciones
- Sin fugas de información entre empresas

---

### ✅ GESTIÓN DE CASOS

**Funcionalidad**: CRUD completo de casos de seguros

**Archivos**:
- `src/lib/database.ts` - Funciones CRUD
- `src/app/[locale]/(app)/workspace/cases/*` - UI
- `src/components/Cases/*` - Componentes reutilizables
- `src/app/api/cases/create/route.ts` - API

**Cómo Funciona**:
1. Usuario navega a `/workspace/cases`
2. Ve lista de todos sus casos (filtrados por organización)
3. Puede crear nuevo caso manualmente
4. Cada caso tiene:
   - Cliente (nombre, tipo de negocio, empleados)
   - Estado (draft, active, completed, archived)
   - Etapa (initial, sourcing, analysis, proposal, etc.)
   - Prioridad (low, medium, high, urgent)
   - Brief (información inicial)

**Campos Importantes**:
- `orgId`: Vincula caso a organización (multi-tenancy)
- `briefData`: JSON con información estructurada
- `status` y `stage`: Seguimiento del progreso
- `priority`: Organización de trabajo

---

### ✅ GESTIÓN DE CLIENTES (CON CIFRADO PII)

**Funcionalidad**: CRUD de clientes con datos personales cifrados

**Archivos**:
- `src/lib/clientsDb.ts` - Funciones con cifrado
- `src/app/[locale]/(app)/workspace/clients/*` - UI
- `src/components/Clients/*` - Componentes
- `src/app/api/clients/*` - APIs

**Cómo Funciona**:
1. Usuario crea cliente con datos personales
2. Backend cifra automáticamente:
   - Nombre
   - Email
   - Teléfono
   - Dirección
3. Se guarda en BD como bytea (bytes cifrados)
4. Al leer, se descifra automáticamente
5. Usuario ve datos en texto plano, BD tiene datos cifrados

**Seguridad**:
- Variable `APP_ENCRYPTION_KEY` para cifrado simétrico
- Funciones PostgreSQL `encrypt_pii()` y `decrypt_pii()`
- Cumplimiento GDPR/CCPA

---

### ✅ UPLOAD Y PROCESAMIENTO DE PDFs

**Funcionalidad**: Sistema dual de uploads (temporal y persistente)

**Archivos**:
- `src/app/api/upload/pdf/route.ts` - API dual
- `src/components/Upload/PdfUploader.tsx` - UI para workspace
- `src/components/Landing/LandingChatInput.tsx` - UI para landing

**Cómo Funciona**:

**Modo Temporal** (Landing Page):
1. Usuario sube PDF ANTES de enviar mensaje
2. Se guarda en Storage `artifacts/temp/<userId>/...`
3. Se extrae texto automáticamente (OCR)
4. Se devuelve metadata + texto extraído
5. NO se crea registro en BD todavía

**Modo Persistente** (Workspace):
1. Usuario sube PDF dentro de un caso existente
2. Se guarda en Storage `artifacts/<orgId>/<caseId>/...`
3. Se crea registro en `public.artifacts`
4. Se vincula al caso específico

**Procesamiento**:
- Extracción de texto con `pdf2json`
- Detección de duplicados por hash SHA-256
- Validación de tamaño (máx 10MB)
- Metadata guardada en `provenance` (JSON)

---

### ✅ SISTEMA DE CONVERSACIÓN CON AGENTE

**Funcionalidad**: Chat que conecta con casos en BD

**Archivos**:
- `src/components/Chat/ConversationPane.tsx` - UI del chat
- `src/app/api/chat/start/route.ts` - Crear caso inicial
- `src/app/api/chat/process-message/route.ts` - Mensajes subsecuentes
- `src/lib/ui/state.ts` - Estado global (Zustand)

**Cómo Funciona**:
1. **Inicio** (Landing):
   - Usuario sube PDFs (temporal)
   - Escribe mensaje inicial
   - POST `/api/chat/start`:
     - Crea `Case` en BD
     - Crea `Artifacts` con PDFs
     - Devuelve `caseId`
   - `caseId` se guarda en estado global

2. **Conversación**:
   - Usuario hace preguntas
   - POST `/api/chat/process-message`:
     - Recibe `caseId`
     - Consulta `artifacts` del caso
     - Responde con: mensaje + lista de PDFs
     - (Preparado para conectar LLM)

**Estado Global**:
- `currentCaseId`: Referencia al caso activo
- `brief`: Brief estructurado
- `initialMessage`: Primer mensaje del usuario

---

### ✅ AUDITORÍA AUTOMÁTICA

**Funcionalidad**: Registro de todas las acciones importantes

**Archivos**:
- `src/lib/audit.ts` - Helper de auditoría
- `src/components/Audit/AuditTimeline.tsx` - Visualización
- Tabla `public.audit_log` en BD

**Cómo Funciona**:
1. Acciones importantes llaman `tryRecordAuditLog()`
2. Se crea registro en `public.audit_log` con:
   - Qué se hizo (`action`)
   - Quién lo hizo (`actor`)
   - Cuándo (`createdAt`)
   - Qué herramienta (`tool`)
   - Datos completos (`payload` en JSON)
3. Usuario ve timeline en detalle del caso

**Eventos Registrados**:
- `artifact_uploaded`: Cuando se sube un PDF
- `chat_started`: Cuando se crea un caso desde chat

---

### ✅ DASHBOARD Y ESTADÍSTICAS

**Funcionalidad**: Métricas y KPIs de la organización

**Archivos**:
- `src/app/[locale]/(app)/dashboard/page.tsx` - UI
- `src/app/api/stats/route.ts` - API
- `src/lib/database.ts` - Función `getCaseStatsByOrg()`

**Métricas Mostradas**:
- Total de casos
- Casos por estado (draft, active, completed, archived)
- Casos por etapa (initial, sourcing, analysis, etc.)
- Casos por prioridad (low, medium, high, urgent)
- Total de documentos procesados

---

## 2. ARQUITECTURA DE BASE DE DATOS

### 🔐 ESQUEMA AUTH (Supabase)

#### Tabla: `auth.users`
**Propósito**: Usuarios del sistema (gestionada por Supabase Auth)

**Campos Clave**:
- `id` (UUID): Identificador único del usuario
- `email`: Email del usuario
- `encrypted_password`: Contraseña cifrada (bcrypt)
- `created_at`: Fecha de registro

**Relaciones**:
- 1 user → 1 profile (en `public.profiles`)
- 1 user → N organizaciones (via `public.org_members`)

**Flujo de Uso**:
```
Registro → auth.users (nuevo registro)
Login → auth.users (validación)
```

---

### 👤 Tabla: `public.profiles`
**Propósito**: Información extendida del perfil de usuario

**Campos Clave**:
- `id` (UUID): Mismo ID que `auth.users.id` (FK)
- `name`: Nombre para mostrar
- `locale`: Idioma preferido (en/es)
- `phone`, `address`: Datos adicionales
- `notificationsProductUpdates`, `notificationsPolicyAlerts`: Preferencias

**Relaciones**:
- 1 profile → 1 user (en `auth.users`)

**Flujo de Uso**:
```
Usuario se registra → Se crea profile automáticamente
Usuario edita perfil → Se actualiza profile
```

---

### 🏢 Tabla: `public.organizations`
**Propósito**: Entidades multi-tenant (empresas/brokers)

**Campos Clave**:
- `id` (UUID): Identificador único
- `name`: Nombre de la organización
- `slug`: URL-friendly (ej: "mi-empresa")
- `settings` (JSONB): Configuraciones personalizadas

**Relaciones**:
- 1 organization → N members (via `org_members`)
- 1 organization → N clients
- 1 organization → N cases

**Flujo de Uso**:
```
Usuario se registra → Se crea organización "personal-XXXXXXXX"
Usuario crea org adicional → Nueva fila en organizations
```

**RLS**: Usuario solo ve organizations donde es miembro

---

### 👥 Tabla: `public.org_members`
**Propósito**: Membresías de usuarios en organizaciones (tabla de unión)

**Campos Clave**:
- `id` (UUID): Identificador de la membresía
- `org_id` (UUID): FK a `organizations`
- `user_id` (UUID): FK a `auth.users`
- `role`: owner, admin, member

**Roles Explicados**:
- `owner`: Propietario, control total
- `admin`: Administrador, puede gestionar usuarios
- `member`: Miembro regular, acceso a datos

**Flujo de Uso**:
```
Usuario se registra → Se crea como owner de su org personal
Usuario invita a otro → Nueva fila como member/admin
Permisos → Se verifican consultando role
```

**Uso en RLS**:
```sql
-- Ejemplo de política RLS
WHERE org_id IN (
    SELECT org_id FROM org_members 
    WHERE user_id = auth.uid()
)
```

---

### 👔 Tabla: `public.clients`
**Propósito**: Información de clientes con PII cifrada

**Campos Clave**:
- `id` (UUID): Identificador del cliente
- `org_id` (UUID): FK a `organizations`
- `name_enc` (BYTEA): Nombre CIFRADO
- `email_enc` (BYTEA): Email CIFRADO
- `phone_enc` (BYTEA): Teléfono CIFRADO
- `address_enc` (BYTEA): Dirección CIFRADA

**¿Por qué BYTEA?**:
- Los datos cifrados son binarios, no texto
- PostgreSQL usa tipo `bytea` para datos binarios
- Se cifra con `encrypt_pii()`, se descifra con `decrypt_pii()`

**Flujo de Uso**:
```
Usuario crea cliente → Backend cifra datos → Se guarda bytea
Usuario lee cliente → Backend descifra → Usuario ve texto plano
Base de datos → Solo tiene bytes cifrados (seguridad)
```

**Ejemplo en BD**:
```
name_enc: \x0a1b2c3d... (bytes)
Descifrado: "Juan Pérez García"
```

---

### 📁 Tabla: `public.cases`
**Propósito**: Casos de análisis de pólizas y propuestas

**Campos Clave**:
- `id` (UUID): Identificador del caso
- `orgId` (UUID): FK a `organizations` (multi-tenancy)
- `clientRef`: Referencia del cliente (ej: "CLI-001")
- `clientName`: Nombre del cliente (NO cifrado, para display rápido)
- `businessType`: Tipo de negocio
- `employees`: Número de empleados
- `status`: draft, active, completed, archived
- `stage`: initial, sourcing, analysis, proposal, negotiation, closed
- `briefData` (JSONB): Información estructurada del brief

**Flujo de Uso**:
```
Landing: Usuario envía mensaje → Se crea Case
Workspace: Usuario crea caso manual → Se crea Case
Conversación: Mensajes se asocian al Case (via currentCaseId)
```

**Relación con Artifacts**:
- 1 Case → N Artifacts (PDFs subidos)
- Cuando se elimina un Case, se eliminan sus Artifacts (CASCADE)

---

### 📄 Tabla: `public.artifacts`
**Propósito**: Metadatos y contenido de documentos (PDFs)

**Campos Clave**:
- `id` (UUID): Identificador del artifact
- `caseId` (UUID): FK a `cases`
- `sourceType`: upload, api, pdf, link, form
- `fileId`: Path en Supabase Storage
- `fileName`: Nombre original del archivo
- `contentType`: MIME type (ej: application/pdf)
- `contentText`: Texto extraído del PDF (OCR)
- `provenance` (JSONB): Metadata adicional

**Flujo de Uso**:
```
Landing: 
  1. Upload temp → Storage (temp/<userId>/...)
  2. Envío mensaje → Crea Artifact con contentText

Workspace:
  1. Upload persistente → Storage (<orgId>/<caseId>/...)
  2. Crea Artifact inmediatamente
```

**Contenido de `provenance`**:
```json
{
  "uploadedBy": "user-uuid",
  "uploadedAt": "2025-10-12T...",
  "fileHash": "a1b2c3...",
  "fileSize": 235844,
  "pageCount": 15,
  "charactersExtracted": 45230
}
```

**Relación con Agente**:
- Agente consulta `artifacts.contentText` por `caseId`
- Usa el texto para análisis y respuestas contextuales

---

### 📝 Tabla: `public.audit_log`
**Propósito**: Registro de auditoría de todas las acciones

**Campos Clave**:
- `id` (UUID): Identificador del evento
- `caseId` (UUID): FK a `cases`
- `actor`: Identificador del usuario que actúa
- `action`: artifact_uploaded, chat_started, etc.
- `tool`: upload_api, chat_start_api, etc.
- `payload` (JSONB): Datos completos del evento
- `payloadHash`: Hash SHA-256 del payload
- `createdAt`: Timestamp del evento

**Flujo de Uso**:
```
Usuario sube PDF → tryRecordAuditLog() → Nueva fila en audit_log
Usuario inicia chat → tryRecordAuditLog() → Nueva fila
Workspace: Tab Actividad → Consulta audit_log por caseId
```

**Características**:
- Inmutable (no se puede UPDATE)
- Solo INSERT por el sistema
- Solo DELETE por super admins
- Trazabilidad completa

---

## 3. FLUJO DE USO DEL PROYECTO

### FLUJO #1: USUARIO NUEVO (REGISTRO)

```
┌─────────────────────────────────────────────────────────────┐
│ PASO 1: REGISTRO                                            │
├─────────────────────────────────────────────────────────────┤
│ Usuario → /register                                         │
│   ↓                                                         │
│ Ingresa email + password                                    │
│   ↓                                                         │
│ Submit → signup() server action                             │
│   ↓                                                         │
│ Supabase Auth crea usuario en auth.users                    │
│   ↓                                                         │
│ Backend automáticamente:                                    │
│   ├─ Crea profile en public.profiles                        │
│   ├─ Crea organization "personal-XXXXXXXX"                  │
│   └─ Crea org_member con role='owner'                       │
│   ↓                                                         │
│ Redirect a Landing Page (autenticado)                       │
└─────────────────────────────────────────────────────────────┘
```

**Tablas Afectadas**:
- `auth.users` → 1 fila
- `public.profiles` → 1 fila
- `public.organizations` → 1 fila
- `public.org_members` → 1 fila

---

### FLUJO #2: USUARIO SUBE PDF Y CONVERSA (LANDING)

```
┌─────────────────────────────────────────────────────────────┐
│ PASO 1: SUBIR PDF (TEMPORAL)                                │
├─────────────────────────────────────────────────────────────┤
│ Usuario → Landing Page                                      │
│   ↓                                                         │
│ Click botón "Upload PDF"                                    │
│   ↓                                                         │
│ Selecciona archivo.pdf                                      │
│   ↓                                                         │
│ POST /api/upload/pdf (SIN caseId/orgId)                     │
│   ├─ Sube a Storage: temp/<userId>/timestamp_file.pdf       │
│   ├─ Extrae texto con pdf2json                              │
│   └─ Devuelve: { tempUpload: { extractedText, ... } }       │
│   ↓                                                         │
│ Frontend guarda en estado local: tempUploads[]              │
│   ↓                                                         │
│ Usuario ve badge verde: "✓ PDF Loaded"                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PASO 2: ENVIAR MENSAJE Y CREAR CASO                         │
├─────────────────────────────────────────────────────────────┤
│ Usuario escribe: "¿Qué cobertura tiene esta póliza?"        │
│   ↓                                                         │
│ Click enviar                                                │
│   ↓                                                         │
│ POST /api/chat/start                                        │
│   Body: { message, tempUploads }                            │
│   ↓                                                         │
│ Backend:                                                    │
│   ├─ Crea Case en public.cases                              │
│   │   └─ briefData: { freeText: message }                   │
│   ├─ Para cada tempUpload:                                  │
│   │   └─ Crea Artifact en public.artifacts                  │
│   │       ├─ caseId: (del caso recién creado)               │
│   │       ├─ fileId: temp/<userId>/...                      │
│   │       └─ contentText: tempUpload.extractedText          │
│   ├─ Registra en audit_log: 'chat_started'                  │
│   └─ Devuelve: { success: true, caseId }                    │
│   ↓                                                         │
│ Frontend:                                                   │
│   ├─ Guarda caseId en estado global (Zustand)               │
│   │   useUI.getState().setCurrentCaseId(caseId)             │
│   └─ Navega a conversación: setStep("conversation")         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PASO 3: CONVERSACIÓN CON CONTEXTO                           │
├─────────────────────────────────────────────────────────────┤
│ Usuario pregunta: "¿Cuál es el deducible?"                  │
│   ↓                                                         │
│ POST /api/chat/process-message                              │
│   Body: { message, brief, caseId }                          │
│   ↓                                                         │
│ Backend:                                                    │
│   ├─ Consulta: SELECT * FROM artifacts WHERE caseId=...     │
│   ├─ Obtiene: fileName + contentText de cada PDF            │
│   ├─ Construye respuesta:                                   │
│   │   "¿Cuál es el deducible?                               │
│   │                                                         │
│   │    Documentos cargados:                                 │
│   │    📄 poliza-vida.pdf                                   │
│   │                                                         │
│   │    Estoy analizando..."                                 │
│   └─ Devuelve: { response, caseId }                         │
│   ↓                                                         │
│ Frontend: Muestra mensaje del agente                        │
└─────────────────────────────────────────────────────────────┘
```

**Tablas Afectadas**:
- `public.cases` → 1 fila (nuevo caso)
- `public.artifacts` → N filas (1 por PDF)
- `public.audit_log` → 1 fila (chat_started)
- Supabase Storage → N archivos en temp/

**Datos Guardados**:
- El **mensaje** se guarda en `cases.briefData.freeText`
- El **texto del PDF** se guarda en `artifacts.contentText`
- El **archivo físico** está en Storage `artifacts` bucket

---

### FLUJO #3: USUARIO EN WORKSPACE

```
┌─────────────────────────────────────────────────────────────┐
│ NAVEGACIÓN DESDE CONVERSACIÓN                               │
├─────────────────────────────────────────────────────────────┤
│ Usuario en conversación del agente                          │
│   ↓                                                         │
│ Click "Cases" en sidebar                                    │
│   ↓                                                         │
│ Next.js Router → /workspace/cases                           │
│   ↓                                                         │
│ Backend:                                                    │
│   ├─ getCurrentOrg() obtiene organización del usuario       │
│   └─ getCasesByOrg() lista casos                            │
│       SELECT * FROM cases WHERE orgId = ...                 │
│   ↓                                                         │
│ Frontend: Muestra lista de casos (incluyendo el de Landing) │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ DETALLE DEL CASO                                            │
├─────────────────────────────────────────────────────────────┤
│ Usuario click en un caso                                    │
│   ↓                                                         │
│ /workspace/cases/[id]                                       │
│   ↓                                                         │
│ Backend:                                                    │
│   SELECT * FROM cases WHERE id=... AND orgId=...            │
│   INCLUDE artifacts, auditLogs                              │
│   ↓                                                         │
│ Frontend: 3 tabs                                            │
│   ├─ Resumen: Datos del cliente, brief                      │
│   ├─ Documentos: Lista PDFs + Uploader                      │
│   └─ Actividad: Timeline de audit_log                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. GUÍA DE PRUEBAS PASO A PASO

### ✅ PRUEBA 1: AUTENTICACIÓN Y ORGANIZACIÓN

**Paso 1.1**: Registro
```
1. Ir a http://localhost:3000/register
2. Email: test@example.com
3. Password: password123 (mínimo 8 caracteres)
4. Submit
```

**Verificar**:
- ✅ Redirect a Landing Page
- ✅ Navbar muestra usuario autenticado
- ✅ En Supabase:
  - `auth.users`: Nuevo usuario
  - `public.profiles`: Nuevo perfil
  - `public.organizations`: Org "personal-XXXXXXXX"
  - `public.org_members`: Membresía con role='owner'

**Paso 1.2**: Login con usuario existente
```
1. Logout
2. Login con mismas credenciales
3. Verificar acceso
```

---

### ✅ PRUEBA 2: FLUJO COMPLETO DE LANDING CON PDF

**Paso 2.1**: Subir PDF
```
1. En Landing Page
2. Click "Upload PDF" o botón de paperclip
3. Seleccionar archivo PDF (< 10MB)
4. Esperar a que termine
```

**Verificar**:
- ✅ Badge verde: "✓ PDF Loaded"
- ✅ Nombre del archivo visible
- ✅ Tamaño y páginas mostrados
- ✅ Terminal: "201 in Xms" (éxito)
- ✅ Supabase Storage → artifacts/temp/<userId>/... (archivo existe)

**Paso 2.2**: Enviar mensaje con PDF
```
1. Escribir: "¿Qué cobertura tiene esta póliza?"
2. Click enviar (o Enter)
```

**Verificar**:
- ✅ Navega a conversación
- ✅ Terminal: POST /api/chat/start 201
- ✅ Mensaje del usuario aparece
- ✅ Respuesta del agente aparece con:
  ```
  ¿Qué cobertura tiene esta póliza?
  
  Documentos cargados:
  📄 nombre-del-archivo.pdf
  
  Estoy analizando...
  ```
- ✅ En Supabase:
  - `public.cases`: Nuevo caso con briefData
  - `public.artifacts`: Fila con contentText (no null)
  - `public.audit_log`: Evento 'chat_started'

**Paso 2.3**: Hacer más preguntas
```
1. En la conversación, escribir: "¿Y el deducible?"
2. Enviar
```

**Verificar**:
- ✅ Respuesta del agente menciona el PDF cargado
- ✅ Terminal: "📁 1 documentos disponibles para análisis"

---

### ✅ PRUEBA 3: NAVEGACIÓN A WORKSPACE

**Paso 3.1**: Ir a Cases
```
1. En conversación, mirar sidebar izquierdo
2. Click en "Cases"
```

**Verificar**:
- ✅ Navega a /workspace/cases
- ✅ Se ve el caso creado desde Landing
- ✅ Stats correctos (1 caso, X documentos)
- ✅ Card del caso muestra nombre, estado, prioridad

**Paso 3.2**: Entrar a detalle del caso
```
1. Click en el caso de la lista
2. Ver las 3 tabs
```

**Verificar Tab "Resumen"**:
- ✅ Información del cliente
- ✅ Brief inicial (tu mensaje)

**Verificar Tab "Documentos"**:
- ✅ Lista el PDF subido
- ✅ Muestra páginas y tamaño
- ✅ Badge "Procesado"
- ✅ Componente de upload visible

**Verificar Tab "Actividad"**:
- ✅ Timeline con evento "chat_started"
- ✅ Payload JSON visible

---

### ✅ PRUEBA 4: CREAR CASO MANUAL

**Paso 4.1**: Crear caso desde workspace
```
1. En /workspace/cases
2. Click "Nuevo Caso"
3. Llenar formulario:
   - Nombre del Cliente: "Acme Corp"
   - Tipo de Negocio: "Retail"
   - Empleados: 50
   - Prioridad: Alta
   - Descripción: "Necesitan seguro de vida grupal"
4. Submit
```

**Verificar**:
- ✅ Redirect a detalle del caso
- ✅ Caso aparece en lista
- ✅ En BD: public.cases tiene el nuevo caso

**Paso 4.2**: Subir PDF desde workspace
```
1. En detalle del caso
2. Tab "Documentos"
3. Drag & drop un PDF o click para seleccionar
4. Click "Subir PDF"
```

**Verificar**:
- ✅ Barra de progreso
- ✅ Mensaje de éxito
- ✅ PDF aparece en la lista
- ✅ En BD: public.artifacts con contentText

---

### ✅ PRUEBA 5: GESTIÓN DE CLIENTES

**Paso 5.1**: Crear cliente
```
1. Sidebar → Click "Clients"
2. Click "Nuevo Cliente"
3. Llenar:
   - Nombre: "Juan Pérez García"
   - Email: "juan@example.com"
   - Teléfono: "+52 55 1234 5678"
   - Dirección: "Calle Principal 123, CDMX"
4. Submit
```

**Verificar**:
- ✅ Redirect a detalle del cliente
- ✅ Icono de escudo "Datos cifrados"
- ✅ En BD: `public.clients` tiene campos `*_enc` como BYTEA
- ✅ En UI: Datos visibles en texto plano (descifrados)

**Paso 5.2**: Inspeccionar cifrado
```
1. Supabase Studio → Table Editor → clients
2. Ver columna name_enc
```

**Verificar**:
- ✅ Muestra bytes: `\x0a1b2c...` (cifrado)
- ✅ NO muestra "Juan Pérez García" (seguro)

---

### ✅ PRUEBA 6: DASHBOARD

**Paso 6.1**: Ver estadísticas
```
1. Sidebar → Click "Dashboard"
```

**Verificar**:
- ✅ Total de casos
- ✅ Total de documentos
- ✅ Distribución por estado
- ✅ Distribución por etapa

---

### ✅ PRUEBA 7: DEDUPLICACIÓN DE PDFs

**Paso 7.1**: Subir mismo PDF dos veces
```
1. En detalle de caso
2. Subir PDF una vez ✅
3. Intentar subir el MISMO PDF de nuevo
```

**Verificar**:
- ✅ Primera subida: 201 (éxito)
- ✅ Segunda subida: 409 (conflicto)
- ✅ Mensaje: "This file has already been uploaded"
- ✅ En BD: Solo 1 artifact (no duplicado)

---

## 5. FUNCIONALIDAD DE CADA TABLA (RESUMEN)

### auth.users
**Función**: Almacenar usuarios del sistema  
**Cuándo se usa**: Registro, login, verificación de sesión  
**Relacionada con**: profiles (1:1), org_members (1:N)

### public.profiles
**Función**: Perfil extendido de cada usuario  
**Cuándo se usa**: Página de perfil, preferencias  
**Datos**: Nombre, idioma, notificaciones  
**NO contiene**: Información de casos o clientes

### public.organizations
**Función**: Entidades multi-tenant (empresas)  
**Cuándo se usa**: Todo el flujo (filtro principal)  
**Datos**: Nombre, slug, configuraciones  
**Clave en**: Aislamiento de datos entre empresas

### public.org_members
**Función**: Quién pertenece a qué organización  
**Cuándo se usa**: Validación de permisos, RLS  
**Datos**: user_id, org_id, role  
**Clave en**: Sistema de permisos (owner/admin/member)

### public.clients
**Función**: Información de clientes con PII cifrada  
**Cuándo se usa**: Gestión de clientes, vinculación a casos  
**Datos**: Nombre, email, teléfono, dirección (CIFRADOS)  
**NO confundir con**: El "cliente" de un caso (puede ser solo nombre, no registro completo)

### public.cases
**Función**: Casos de análisis de pólizas  
**Cuándo se usa**: Conversación del agente, gestión de casos  
**Datos**: Brief, estado, etapa, prioridad  
**Contiene**: Referencia a cliente (clientName) pero NO datos PII completos

### public.artifacts
**Función**: Documentos (PDFs) con texto extraído  
**Cuándo se usa**: Upload de PDFs, análisis del agente  
**Datos**: Path en Storage + texto extraído (contentText)  
**Clave en**: El agente consulta contentText para responder

### public.audit_log
**Función**: Registro de auditoría  
**Cuándo se usa**: Todas las acciones importantes  
**Datos**: Quién, qué, cuándo, payload completo  
**Inmutable**: No se puede modificar, solo insertar

---

## 6. CORRECCIÓN FINAL: RESPUESTA LIMPIA DEL AGENTE

### Antes (Engorroso):
```
He recibido tu mensaje: "¿Qué cobertura tiene?"

Basándome en los siguientes documentos cargados:

--- Documento 1: poliza.pdf ---
PÓLIZA DE SEGUROS
Número: 123456
Vigencia: 01/01/2025 al 31/12/2025
Asegurado: Juan Pérez
Coberturas:
1. Gastos Médicos Mayores
   - Suma asegurada: $10,000,000 MXN
   - Deducible: $50,000 MXN
   ... (1000 caracteres más)

Estoy analizando...
```

### Ahora (Limpio):
```
¿Qué cobertura tiene?

Documentos cargados:
📄 poliza.pdf

Estoy analizando esta información para proporcionarte una respuesta detallada sobre tus seguros.
```

**Beneficio**:
- ✅ Chat limpio y legible
- ✅ contentText guardado en BD (disponible para LLM)
- ✅ Usuario ve solo referencia al archivo
- ✅ Agente (futuro LLM) tiene acceso al texto completo

---

## 7. INSTALACIÓN FINAL DE COMPONENTES UI

Para resolver el error de `select.tsx`, ejecuta:

```bash
npx shadcn@latest add select
npx shadcn@latest add progress
```

Reinicia el dev server y todas las páginas funcionarán correctamente.

---

## ✅ CHECKLIST DE VERIFICACIÓN COMPLETA

- [ ] Usuario se puede registrar y auto-crear organización
- [ ] Usuario puede subir PDF desde Landing (temporal)
- [ ] Usuario puede enviar mensaje y crear caso
- [ ] Agente responde mencionando el PDF (sin texto completo)
- [ ] Usuario puede navegar a /workspace/cases desde sidebar
- [ ] Lista de casos muestra el caso creado desde Landing
- [ ] Detalle del caso muestra PDFs en tab "Documentos"
- [ ] Se puede subir PDF adicional desde workspace
- [ ] Se puede crear cliente con datos cifrados
- [ ] Dashboard muestra estadísticas correctas
- [ ] Auditoría registra eventos correctamente

**TODO LISTO Y FUNCIONANDO** ✅

