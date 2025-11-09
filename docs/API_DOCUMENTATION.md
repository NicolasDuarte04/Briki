# DOCUMENTACIÓN COMPLETA DE APIs

**Versión**: 2.0  
**Fecha**: 1 de Febrero, 2025  
**Objetivo**: Documentación integral de todos los endpoints API del proyecto

---

## 📋 CONFIGURACIÓN GENERAL

### **Autenticación**
- **Método**: Supabase Auth vía cookies
- **Middleware**: Todas las rutas protegidas verifican autenticación automáticamente
- **Helper**: `getCurrentOrg()` obtiene usuario y organización actual

### **Headers**
- **Content-Type**: `application/json` (excepto uploads que usan `multipart/form-data`)
- **Cookies**: Se leen automáticamente por `createServerSupabase()`

### **Respuestas**
- **Éxito**: Status 200-201 con JSON
- **Error**: Status 400-500 con `{ error: string }`

---

## 🔐 APIs DE AUTENTICACIÓN

### **GET /api/auth/me**
**Propósito**: Obtener información del usuario autenticado actual

**Autenticación**: Requerida

**Respuesta exitosa (200)**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "orgId": "uuid",
  "userId": "uuid"
}
```

**Errores**:
- `401`: No autenticado

---

### **GET /api/auth/callback**
**Propósito**: Callback de OAuth (Google, etc.)

**Autenticación**: No requerida (manejado por Supabase)

**Funcionalidad**:
- Procesa token de OAuth
- Establece cookie de sesión
- Redirige a dashboard

---

### **GET/POST /api/auth/[...nextauth]**
**Propósito**: Endpoint de NextAuth.js para autenticación alternativa (si se usa)

**Autenticación**: No requerida (manejado por NextAuth)

**Nota**: Este endpoint puede existir si se usa NextAuth.js como alternativa a Supabase Auth, pero el sistema principal usa Supabase Auth

---

## 📁 APIs DE CASOS

### **GET /api/cases**
**Propósito**: Obtener lista de casos de la organización

**Autenticación**: Requerida

**Query Parameters**:
- `status?`: Filtrar por status (draft, active, completed, archived)
- `stage?`: Filtrar por stage (initial, sourcing, analysis, etc.)

**Respuesta exitosa (200)**:
```json
{
  "cases": [
    {
      "id": "uuid",
      "clientName": "Cliente",
      "status": "draft",
      "stage": "initial",
      "createdAt": "2025-01-01T00:00:00Z",
      "max_budget": 100000.50
    }
  ]
}
```

---

### **POST /api/cases/create**
**Propósito**: Crear un nuevo caso

**Autenticación**: Requerida

**Body**:
```json
{
  "orgId": "uuid", // Opcional, se obtiene automáticamente si no se proporciona
  "clientName": "Cliente Nuevo",
  "clientRef": "REF-123",
  "businessType": "Retail",
  "employees": 50,
  "status": "draft",
  "stage": "initial",
  "priority": "medium",
  "briefData": {
    "freeText": "Necesito seguro para mi negocio",
    "coverage": "General"
  },
  "insurance_category": "General",
  "max_budget": 100000.50, // Validado: -99,999,999.99 a 99,999,999.99
  "budget_currency": "COP",
  "required_coverages": ["Cobertura A", "Cobertura B"],
  "client_profile": "Perfil del cliente",
  "tempUploads": [ // PDFs temporales del formulario
    {
      "id": "temp-id",
      "storagePath": "temp/path",
      "fileName": "document.pdf",
      "fileSize": 1024,
      "extractedText": "Texto extraído"
    }
  ]
}
```

**Validaciones**:
- `max_budget`: Se valida y normaliza a rango DECIMAL(10,2)
- `insurance_category`: Requerido si `status !== 'draft'`
- `orgId`: Se obtiene automáticamente de membresía del usuario si no se proporciona

**Respuesta exitosa (201)**:
```json
{
  "success": true,
  "caseId": "uuid",
  "case": { /* objeto case completo */ }
}
```

**Errores**:
- `401`: No autenticado
- `403`: Usuario no pertenece a la organización
- `400`: Validación fallida
- `503`: Error de conexión a BD (después de reintentos)

**Funcionalidad detallada**:
1. Autentica usuario con Supabase
2. Valida y normaliza `max_budget` (rango DECIMAL(10,2))
3. Resuelve `orgId` si no se proporciona
4. Verifica membresía del usuario
5. Crea caso con retry (máximo 3 intentos)
6. Registra auditoría
7. Procesa PDFs temporales creando artifacts

---

### **GET /api/cases/[id]**
**Propósito**: Obtener un caso específico con sus artifacts

**Autenticación**: Requerida

**Respuesta exitosa (200)**:
```json
{
  "case": {
    "id": "uuid",
    "clientName": "Cliente",
    "status": "draft",
    "briefData": { /* JSON */ },
    "artifacts": [
      {
        "id": "uuid",
        "fileName": "document.pdf",
        "contentText": "Texto extraído"
      }
    ]
  }
}
```

**Errores**:
- `404`: Caso no encontrado o sin acceso

---

### **GET /api/cases/[id]/messages**
**Propósito**: Obtener mensajes de un caso (desencriptados)

**Autenticación**: Requerida

**Respuesta exitosa (200)**:
```json
{
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "Mensaje desencriptado",
      "createdAt": "2025-01-01T00:00:00Z",
      "metadata": { /* JSON */ }
    }
  ]
}
```

**Funcionalidad**:
1. Verifica que el caso pertenece a la organización
2. Obtiene mensajes ordenados por `createdAt: 'asc'`
3. Desencripta todos los mensajes usando `decryptMessages()`
4. Retorna array de mensajes desencriptados

---

### **POST /api/cases/[id]/messages**
**Propósito**: Crear un mensaje en un caso (encriptado)

**Autenticación**: Requerida

**Body**:
```json
{
  "role": "user" | "assistant" | "system",
  "content": "Contenido del mensaje",
  "metadata": { /* JSON opcional */ }
}
```

**Validaciones**:
- Verifica que el caso pertenece a la organización
- Verifica duplicados (últimos 5 segundos)
- Encripta contenido antes de guardar

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "message": {
    "id": "uuid",
    "role": "user",
    "content": "Contenido desencriptado",
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "duplicate": false
}
```

**Funcionalidad**:
1. Verifica acceso al caso
2. Encripta contenido con `encryptMessageContent()`
3. Verifica duplicados (desencripta mensajes recientes para comparar)
4. Crea mensaje con `content: Buffer.from(encryptedContent)`
5. Desencripta mensaje creado para retornarlo

---

### **PUT /api/cases/approve**
**Propósito**: Aprobar un caso (cambiar de draft a active)

**Autenticación**: Requerida

**Body**:
```json
{
  "caseId": "uuid",
  "briefData": { /* Datos completos del brief */ }
}
```

**Validaciones**:
- El caso debe estar en status 'draft'
- Valida y normaliza `max_budget` si está presente

**Respuesta exitosa (200)**:
```json
{
  "success": true,
  "case": { /* caso actualizado */ }
}
```

**Errores**:
- `404`: Caso no encontrado
- `409`: Caso no está en draft

---

### **PUT /api/cases/update**
**Propósito**: Actualizar un caso existente

**Autenticación**: Requerida

**Body**: Similar a `POST /api/cases/create` pero solo campos a actualizar

**Validaciones**:
- Valida y normaliza `max_budget` si está presente
- Verifica que el caso pertenece a la organización

---

### **DELETE /api/cases/delete**
**Propósito**: Eliminar un caso

**Autenticación**: Requerida

**Body**:
```json
{
  "caseId": "uuid"
}
```

**Funcionalidad**:
- Elimina caso y todos sus mensajes/artifacts (CASCADE)
- Verifica que el caso pertenece a la organización

---

## 💬 APIs DE CHAT

### **POST /api/chat/start**
**Propósito**: Iniciar una nueva conversación desde landing page

**Autenticación**: Requerida

**Body**:
```json
{
  "message": "Mensaje inicial del usuario",
  "tempUploads": [ /* PDFs temporales */ ]
}
```

**Respuesta exitosa (200)**:
```json
{
  "caseId": "uuid",
  "response": "Respuesta del agente"
}
```

**Funcionalidad**:
1. Crea caso en status 'draft'
2. Procesa PDFs temporales creando artifacts
3. Guarda mensaje inicial encriptado
4. Genera respuesta del agente
5. Guarda respuesta del agente encriptada

---

### **POST /api/chat/process-message**
**Propósito**: Procesar mensaje del usuario con IA y guardar respuesta

**Autenticación**: Requerida

**Body**:
```json
{
  "message": "Mensaje del usuario",
  "brief": { /* Datos del brief actual */ },
  "caseId": "uuid"
}
```

**Respuesta exitosa (200)**:
```json
{
  "response": "Análisis del agente",
  "caseId": "uuid"
}
```

**Funcionalidad detallada**:
1. Obtiene artifacts del caso para análisis
2. Verifica duplicados de mensaje del usuario (últimos 10 segundos)
3. Si no existe duplicado, guarda mensaje del usuario encriptado
4. Prepara request para OpenAI con mensaje, brief y documentos
5. Llama a `analyzeInsuranceDocuments()` para análisis
6. Guarda respuesta del agente encriptada con `role: 'assistant'`
7. Retorna respuesta del agente

---

## 👥 APIs DE CLIENTES

### **POST /api/clients/create**
**Propósito**: Crear un nuevo cliente

**Autenticación**: Requerida

**Body**:
```json
{
  "name": "Nombre del Cliente",
  "email": "cliente@example.com",
  "phone": "+57 1234567890",
  "address": "Dirección del cliente"
}
```

**Validaciones**:
- `name`: Requerido, no puede estar vacío
- `email`, `phone`, `address`: Opcionales
- Los campos PII se encriptan automáticamente

**Respuesta exitosa (201)**:
```json
{
  "id": "uuid"
}
```

**Errores**:
- `400`: Name requerido
- `500`: Error de encriptación (clave no configurada)

---

### **PATCH /api/clients/[id]/update**
**Propósito**: Actualizar un cliente existente

**Autenticación**: Requerida

**Body**: Similar a `POST /api/clients/create` pero solo campos a actualizar

**Validaciones**:
- Verifica que el cliente pertenece a la organización
- Encripta campos PII antes de actualizar

---

### **DELETE /api/clients/[id]/delete**
**Propósito**: Eliminar un cliente

**Autenticación**: Requerida

**Validaciones**:
- Verifica que el cliente pertenece a la organización

**Respuesta exitosa (200)**:
```json
{
  "success": true
}
```

---

### **GET /api/clients/list**
**Propósito**: Obtener lista de clientes de la organización

**Autenticación**: Requerida

**Respuesta exitosa (200)**:
```json
{
  "clients": [
    {
      "id": "uuid",
      "name": "Cliente",
      "email": "cliente@example.com", // Desencriptado
      "phone": "+57 1234567890", // Desencriptado
      "address": "Dirección" // Desencriptado
    }
  ]
}
```

**Funcionalidad**:
- Desencripta campos PII antes de retornar

---

## 📄 APIs DE UPLOAD Y STORAGE

### **POST /api/upload/pdf**
**Propósito**: Subir un PDF y extraer texto

**Autenticación**: Requerida

**Body**: `multipart/form-data`
- `file`: Archivo PDF
- `caseId?`: ID del caso (opcional, modo temporal si no se proporciona)
- `orgId?`: ID de la organización (opcional)

**Modos de operación**:
1. **Modo temporal** (sin `caseId`/`orgId`):
   - Sube a `temp/{userId}/{timestamp}_{filename}`
   - Extrae texto opcionalmente
   - Retorna `tempUpload` con datos del archivo
   - No crea artifact en BD

2. **Modo persistente** (con `caseId`/`orgId`):
   - Valida membresía del usuario
   - Valida que el caso existe y pertenece a la organización
   - Verifica duplicados por hash SHA256
   - Sube a `{orgId}/{caseId}/{timestamp}_{filename}`
   - Extrae texto del PDF con pdf2json
   - Crea artifact en BD con `sourceType: 'pdf'`
   - Registra auditoría

**Respuesta exitosa (201)**:
```json
{
  "success": true,
  "mode": "temp" | "persistent",
  "artifact": {
    "id": "uuid",
    "fileName": "document.pdf",
    "fileSize": 1024,
    "pageCount": 5,
    "charactersExtracted": 1000,
    "storagePath": "path/to/file"
  }
}
```

**Errores**:
- `400`: No se proporcionó archivo o no es PDF
- `403`: Usuario no pertenece a la organización
- `404`: Caso no encontrado
- `409`: Archivo duplicado (mismo hash)

---

### **GET /api/storage/[...path]**
**Propósito**: Servir archivos desde Supabase Storage

**Autenticación**: Requerida

**Funcionalidad**:
- Genera URL firmada de Supabase Storage
- Redirige a la URL del archivo

---

## 📊 APIs DE ESTADÍSTICAS

### **GET /api/stats**
**Propósito**: Obtener estadísticas de la organización

**Autenticación**: Requerida

**Respuesta exitosa (200)**:
```json
{
  "stats": {
    "total": 10,
    "byStatus": {
      "draft": 5,
      "active": 3,
      "completed": 2
    },
    "byStage": {
      "initial": 3,
      "sourcing": 4,
      "analysis": 3
    },
    "byPriority": {
      "low": 2,
      "medium": 5,
      "high": 3
    },
    "totalArtifacts": 25
  }
}
```

---

## 👤 APIs DE PERFIL

### **GET /api/profile/name**
**Propósito**: Obtener nombre del perfil desencriptado

**Autenticación**: Requerida

**Respuesta exitosa (200)**:
```json
{
  "name": "Nombre del Usuario" // Desencriptado, o null
}
```

**Funcionalidad**:
1. Obtiene perfil del usuario autenticado
2. Si `name` existe, lo desencripta con `decryptProfileName()`
3. Si no existe, intenta obtener de `user_metadata` (fallback)
4. Retorna nombre o null

---

## 📝 APIs DE AUDITORÍA

### **GET /api/audit-log**
**Propósito**: Obtener logs de auditoría de un caso

**Autenticación**: Requerida

**Query Parameters**:
- `caseId`: ID del caso

**Respuesta exitosa (200)**:
```json
{
  "logs": [
    {
      "id": "uuid",
      "action": "created_case",
      "actor": "user@example.com",
      "timestamp": "2025-01-01T00:00:00Z",
      "payload": { /* JSON */ }
    }
  ]
}
```

---

## 🔒 SEGURIDAD Y ENCRIPTACIÓN

### **Encriptación de Mensajes**
- **Campo**: `messages.content` (BYTEA)
- **Función**: `encryptMessageContent()` / `decryptMessages()`
- **Uso**: Todos los mensajes se encriptan antes de guardar y se desencriptan al leer

### **Encriptación de Profiles**
- **Campos**: `profiles.name`, `profiles.phone`, `profiles.address` (BYTEA)
- **Funciones**: `encryptProfileName()`, `encryptProfilePhone()`, `encryptProfileAddress()`
- **Uso**: Campos PII se encriptan antes de guardar y se desencriptan al leer

### **Validación de Organización**
- Todas las operaciones verifican que el usuario pertenece a la organización
- Se usa `getCurrentOrg()` para obtener organización actual
- RLS (Row Level Security) en PostgreSQL proporciona capa adicional de seguridad


