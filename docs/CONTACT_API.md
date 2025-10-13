# Contact Form API

## Endpoint

**POST** `/api/contact`

## Runtime

Node.js (acceso completo a crypto y headers)

## Contrato del Payload

### Campos Requeridos

| Campo | Tipo | Validación | Descripción |
|-------|------|------------|-------------|
| `name` | `string` | 2-100 caracteres | Nombre del contacto |
| `email` | `string` | Formato email válido, max 255 | Email del contacto |
| `company` | `string` | 2-150 caracteres | Nombre de la empresa |
| `city` | `string` | 2-100 caracteres | Ciudad |
| `locale` | `string` | `"en"` o `"es"` | Idioma preferido |
| `message` | `string` | 10-2000 caracteres | Mensaje del contacto |

### Campos Opcionales

| Campo | Tipo | Validación | Descripción |
|-------|------|------------|-------------|
| `phone` | `string` | max 30 caracteres | Teléfono (opcional) |
| `honeypot` | `string` | debe estar vacío | Campo trampa antispam |

## Ejemplo de Request

```bash
curl -X POST https://briki.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@empresa.com",
    "company": "Empresa SA",
    "city": "Madrid",
    "phone": "+34 600 123 456",
    "locale": "es",
    "message": "Me gustaría recibir más información sobre sus servicios",
    "honeypot": ""
  }'
```

## Respuestas

### 200 OK - Éxito
```json
{
  "ok": true,
  "message": "Contact request received successfully"
}
```

### 400 Bad Request - Error de Validación
```json
{
  "ok": false,
  "error": "validation_error",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

### 429 Too Many Requests - Spam Detectado
```json
{
  "ok": false,
  "error": "spam_detected"
}
```

### 500 Internal Server Error
```json
{
  "ok": false,
  "error": "internal_error",
  "message": "An unexpected error occurred"
}
```

## Protección Antispam

### Honeypot
El campo `honeypot` es un campo trampa que debe estar vacío. Si contiene cualquier valor, la solicitud se rechaza inmediatamente con código 429.

**Implementación en frontend:**
- Ocultar el campo con CSS (`display: none` o `position: absolute; left: -9999px`)
- NO usar `type="hidden"` (los bots lo ignoran)
- Nombre genérico como "website" o "url" para parecer legítimo

### IP Hashing
Para future rate limiting, el sistema:
1. Extrae la IP del cliente desde headers (`x-forwarded-for`, `x-real-ip`)
2. Concatena: `IP + SALT_SECRET`
3. Genera SHA-256 hash
4. Guarda solo el hash (NUNCA la IP directa)

## Variables de Entorno

```bash
# Requerida (opcional en dev, obligatoria en prod)
CONTACT_SPAM_SALT=tu-salt-secreto-aleatorio-aqui
```

**Generación recomendada:**
```bash
openssl rand -base64 32
```

## Integración Frontend

```typescript
// Ejemplo con fetch
async function submitContactForm(data: ContactFormData) {
  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...data,
        honeypot: '', // Campo trampa vacío
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      if (result.error === 'validation_error') {
        console.error(`Error en ${result.details.field}: ${result.details.message}`);
      } else if (result.error === 'spam_detected') {
        console.error('Solicitud rechazada por spam');
      }
      throw new Error(result.message || 'Error al enviar formulario');
    }

    return result;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

## TODOs Pendientes

1. **Persistencia en BD**: Agregar modelo Prisma para `ContactSubmission`
2. **Notificaciones**: Enviar email al equipo de ventas cuando llega un contacto
3. **Rate Limiting**: Implementar límite por IP hash (ej: 3 solicitudes/hora)
4. **CRM Integration**: Agregar contactos automáticamente a CRM o mailing list
5. **Analytics**: Trackear conversiones de formulario de contacto

## Seguridad

✅ Validación server-side completa
✅ Honeypot antispam
✅ IP hashing (no almacena IPs directas)
✅ User-Agent logging para análisis
✅ Límites de longitud en todos los campos
✅ Content-Type validation
✅ Errores genéricos en producción (no expone internals)

## Testing

```bash
# Test válido
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","company":"Test Co","city":"Madrid","locale":"es","message":"Este es un mensaje de prueba válido","honeypot":""}'

# Test spam (honeypot)
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Spammer","email":"spam@spam.com","company":"Spam Inc","city":"Spam","locale":"en","message":"Spam message here","honeypot":"https://spam.com"}'

# Test validación
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"A","email":"invalid","company":"X","city":"Y","locale":"fr","message":"Too short"}'
```

