# ANÁLISIS CRÍTICO: RENDIMIENTO Y TIMEOUT DEL AGENTE
**Fecha**: 2025-01-12  
**Rol**: Developer FullStack Senior  
**Objetivo**: Identificar y resolver problemas de rendimiento, timeout de Prisma y falta de respuesta del agente

---

## 📋 RESUMEN EJECUTIVO

### **Problemas Identificados:**
1. **Navegación Lenta**: El agente se demora 8+ segundos en cargar
2. **Sin Respuesta del Agente**: No aparece mensaje del agente pidiendo llenar formulario
3. **Sin Botón de Confirmación**: No hay botones de confirmación visibles
4. **Error de Timeout de Prisma**: Transacción expirada después de 15 segundos
5. **Error en API de Clientes**: `GET /api/clients/list 500` con timeout de 38 segundos

### **Impacto en UX:**
- **Experiencia Fragmentada**: Navegación lenta y sin feedback
- **Funcionalidad Perdida**: Agente no responde ni guía al usuario
- **Errores de Base de Datos**: Timeouts que bloquean funcionalidades

---

## 🔍 ANÁLISIS DETALLADO DE PROBLEMAS

### **PROBLEMA 1: NAVEGACIÓN LENTA (8+ SEGUNDOS)**

#### **Causa Raíz Identificada:**
La navegación lenta se debe a **múltiples compilaciones secuenciales** y **consultas de base de datos pesadas**:

```bash
# Logs de la terminal
○ Compiling /api/auth/me ...
✓ Compiled /api/auth/me in 969ms (1710 modules)
○ Compiling /api/cases/create ...
✓ Compiled /api/cases/create in 3.5s (1712 modules)
POST /api/cases/create 201 in 5121ms
○ Compiling /[locale]/agent ...
✓ Compiled /[locale]/agent in 4.7s (1714 modules)
GET /agent 307 in 8371ms
```

#### **Análisis Técnico:**
1. **Compilación Secuencial**: Cada API route se compila individualmente
2. **Módulos Duplicados**: 1710+ módulos compilados repetidamente
3. **Tiempo Total**: 9.7 segundos solo en compilación + 5.1 segundos en API

#### **Archivos Involucrados:**
- `src/app/api/auth/me/route.ts`
- `src/app/api/cases/create/route.ts`
- `src/app/[locale]/agent/page.tsx`

---

### **PROBLEMA 2: SIN RESPUESTA DEL AGENTE**

#### **Causa Raíz Identificada:**
El `ConversationPane` tiene un `useEffect` que maneja el `initialMessage`, pero **NO está enviando el mensaje a la API de OpenAI**. Solo muestra una respuesta estática:

```typescript
// src/components/Chat/ConversationPane.tsx (líneas 401-419)
useEffect(() => {
  if (initialMessage && initialMessage.trim() !== '') {
    const userMessage: ChatMessage = { 
      role: "user", 
      content: initialMessage, 
      id: `initial-user-${Date.now()}`,
      createdAt: Date.now()
    };
    const agentResponse: ChatMessage = {
      role: "assistant",
      content: "Estoy analizando tu solicitud, pero para darte la mejor recomendación, por favor completa los detalles (Que tengas a disposicion) del caso en el formulario del panel derecho.",
      agent: { label: "Sourcing" },
      id: `initial-agent-${Date.now()}`,
      createdAt: Date.now()
    };
    setMessages([userMessage, agentResponse]);
    clearInitialMessage();
  }
}, [initialMessage, clearInitialMessage, setMessages]);
```

#### **Problema Identificado:**
- **Respuesta Estática**: No llama a `/api/chat/process-message`
- **Sin Análisis Real**: No utiliza OpenAI para procesar el mensaje
- **Sin Integración**: No se conecta con el flujo de análisis de documentos

---

### **PROBLEMA 3: ERROR DE TIMEOUT DE PRISMA**

#### **Causa Raíz Identificada:**
El error de timeout se debe a **transacciones de cifrado PII que exceden el límite de 15 segundos**:

```bash
ERROR [API/CLIENTS/LIST]: Failed to fetch clients - Error [PrismaClientKnownRequestError]: 
Transaction API error: Transaction already closed: A query cannot be executed on an expired transaction. 
The timeout for this transaction was 15000 ms, however 15180 ms passed since the start of the transaction.
```

#### **Análisis Técnico:**
```typescript
// src/lib/clientsDb.ts (líneas 165-180)
export async function getClientsForCombobox(orgId: string): Promise<{ id: string; name: string }[]> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    // Solo descifrar el nombre para el Combobox
    return tx.$queryRaw<{ id: string; name: string }[]>`
      SELECT 
        id::text,
        public.decrypt_pii(name_enc) as name
      FROM public.clients
      WHERE org_id = ${orgId}::uuid
      ORDER BY created_at DESC
    `;
  }, {
    timeout: 15000, // 15 segundos timeout para operaciones más simples
  });
}
```

#### **Problemas Identificados:**
1. **Cifrado PII Lento**: `decrypt_pii()` es computacionalmente costoso
2. **Timeout Insuficiente**: 15 segundos no es suficiente para operaciones de cifrado
3. **Sin Optimización**: No hay índices ni optimizaciones para consultas cifradas

---

### **PROBLEMA 4: ESTADO INCONSISTENTE**

#### **Causa Raíz Identificada:**
El estado de `step` es inconsistente entre `initialStep` y `step`:

```javascript
HomeClient Debug: {
  currentStep: 'conversation',  // ✅ Correcto
  rightOpen: true,              // ✅ Correcto
  isSourcing: false,            // ✅ Correcto
  initialStep: 'conversation',  // ✅ Correcto
  step: 'landing'               // ❌ Inconsistente
}
```

#### **Análisis Técnico:**
```typescript
// src/components/HomeClient.tsx (línea 25)
const currentStep = initialStep || step; // Simplified logic
```

El problema es que `step` no se actualiza correctamente cuando se navega desde el LandingPage.

---

## 🏗️ ARQUITECTURA ACTUAL Y PROBLEMAS

### **Flujo Actual (Problemático):**
```
1. Usuario envía mensaje en LandingPage
2. LandingChatInput.handleSubmit()
3. Crear caso en BD (API /api/cases/create) ← 5.1 segundos
4. Establecer estado (setStep("conversation"))
5. Navegar al agente (window.location.href) ← 8.3 segundos
6. HomeClient recibe initialStep="conversation"
7. ConversationPane muestra mensaje estático ← SIN API
8. API /api/clients/list falla por timeout ← 38 segundos
```

### **Problemas de Arquitectura:**
1. **Navegación Síncrona**: `window.location.href` causa recarga completa
2. **Estado No Persistente**: `step` se pierde en la navegación
3. **API No Integrada**: `ConversationPane` no llama a OpenAI
4. **Cifrado Ineficiente**: PII cifrado causa timeouts

---

## 🎯 PLAN DE SOLUCIÓN INTEGRAL

### **FASE 1: OPTIMIZACIÓN DE RENDIMIENTO**

#### **1.1 Optimizar Compilación de Next.js**
```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        '*.tsx': {
          loaders: ['swc-loader'],
          as: '*.js',
        },
      },
    },
  },
  webpack: (config) => {
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    };
    return config;
  },
};
```

#### **1.2 Implementar Navegación del Cliente**
```typescript
// src/components/Landing/LandingChatInput.tsx
import { useRouter } from 'next/navigation';

const router = useRouter();

// En lugar de window.location.href
router.push(pathForAgent(locale as 'en' | 'es'));
```

#### **1.3 Optimizar Consultas de Base de Datos**
```typescript
// src/lib/clientsDb.ts
export async function getClientsForCombobox(orgId: string): Promise<{ id: string; name: string }[]> {
  // Usar consulta directa sin transacción para operaciones simples
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  
  return prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT 
      id::text,
      public.decrypt_pii(name_enc) as name
    FROM public.clients
    WHERE org_id = ${orgId}::uuid
    ORDER BY created_at DESC
    LIMIT 50  -- Limitar resultados
  `;
}
```

### **FASE 2: INTEGRACIÓN REAL DEL AGENTE**

#### **2.1 Modificar ConversationPane para Llamar a OpenAI**
```typescript
// src/components/Chat/ConversationPane.tsx
useEffect(() => {
  if (initialMessage && initialMessage.trim() !== '') {
    const userMessage: ChatMessage = { 
      role: "user", 
      content: initialMessage, 
      id: `initial-user-${Date.now()}`,
      createdAt: Date.now()
    };
    
    // AÑADIR: Llamar a la API de OpenAI
    sendMessage(initialMessage);
    clearInitialMessage();
  }
}, [initialMessage, clearInitialMessage, sendMessage]);
```

#### **2.2 Implementar Respuesta Dinámica del Agente**
```typescript
// src/components/Chat/ConversationPane.tsx
const sendMessage = useCallback(async (messageText?: string) => {
  const trimmed = messageText ? messageText.trim() : value.trim();
  if (!trimmed) return;
  
  // Agregar mensaje del usuario
  const newUserMessage: ChatMessage = { 
    id: `user-${Date.now()}`,
    role: "user", 
    content: trimmed,
    createdAt: Date.now()
  };
  addMessage(newUserMessage);
  
  // Llamar a OpenAI
  try {
    const response = await fetch('/api/chat/process-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: trimmed,
        brief: brief,
        caseId: currentCaseId
      })
    });
    
    const result = await response.json();
    
    const assistantResponse: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: result.response, // Respuesta real de OpenAI
      createdAt: Date.now(),
      agent: { label: chatTranslations("agents.sourcing") },
    };
    addMessage(assistantResponse);
    
  } catch (error) {
    console.error('Error calling OpenAI:', error);
  }
}, [/* dependencias */]);
```

### **FASE 3: OPTIMIZACIÓN DE BASE DE DATOS**

#### **3.1 Aumentar Timeout de Prisma**
```typescript
// src/lib/prisma.ts
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  transactionOptions: {
    timeout: 60000, // 60 segundos
    maxWait: 10000, // 10 segundos
  },
});
```

#### **3.2 Implementar Caching para Clientes**
```typescript
// src/lib/clientsDb.ts
const clientCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function getClientsForCombobox(orgId: string): Promise<{ id: string; name: string }[]> {
  const cacheKey = `clients-${orgId}`;
  const cached = clientCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  // Consulta real con timeout aumentado
  const result = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT 
      id::text,
      public.decrypt_pii(name_enc) as name
    FROM public.clients
    WHERE org_id = ${orgId}::uuid
    ORDER BY created_at DESC
    LIMIT 50
  `;
  
  clientCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}
```

### **FASE 4: CORRECCIÓN DE ESTADO**

#### **4.1 Sincronizar Estado de Navegación**
```typescript
// src/components/HomeClient.tsx
useEffect(() => {
  if (initialStep) {
    console.log('Setting step to:', initialStep);
    setStep(initialStep);
  }
}, [initialStep, setStep]);

// Asegurar que step se actualice correctamente
const currentStep = initialStep || step;
```

#### **4.2 Implementar Persistencia de Estado**
```typescript
// src/lib/ui/state.ts
export const useUI = create<UIState>()(
  devtools(
    (set, get) => ({
      // ... estado existente
      setStep: (step) => {
        set({ step });
        // Persistir en localStorage para navegación
        if (typeof window !== 'undefined') {
          localStorage.setItem('briki-current-step', step);
        }
      },
    }),
    {
      name: 'briki-ui-state',
      partialize: (state) => ({
        step: state.step,
        currentCaseId: state.currentCaseId,
        brief: state.brief,
      }),
    }
  )
);
```

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### **Archivos a Modificar:**

#### **1. Optimización de Rendimiento:**
- `next.config.ts` - Configuración de Turbo y webpack
- `src/components/Landing/LandingChatInput.tsx` - Navegación del cliente
- `src/lib/clientsDb.ts` - Optimización de consultas

#### **2. Integración del Agente:**
- `src/components/Chat/ConversationPane.tsx` - Llamada a OpenAI
- `src/app/api/chat/process-message/route.ts` - Verificar funcionamiento

#### **3. Optimización de Base de Datos:**
- `src/lib/prisma.ts` - Aumentar timeouts
- `src/lib/clientsDb.ts` - Implementar caching

#### **4. Corrección de Estado:**
- `src/components/HomeClient.tsx` - Sincronización de estado
- `src/lib/ui/state.ts` - Persistencia de estado

---

## 📊 MÉTRICAS DE ÉXITO

### **Rendimiento:**
- **Tiempo de Navegación**: < 3 segundos (actual: 8+ segundos)
- **Tiempo de Compilación**: < 2 segundos (actual: 9+ segundos)
- **Tiempo de API**: < 1 segundo (actual: 5+ segundos)

### **Funcionalidad:**
- **Respuesta del Agente**: Mensaje dinámico de OpenAI
- **Botón de Confirmación**: Visible cuando `isBriefValid()`
- **Estado Consistente**: `step` sincronizado correctamente

### **Base de Datos:**
- **Timeout de Clientes**: < 5 segundos (actual: 38 segundos)
- **Caching**: 95% de hits en consultas repetidas
- **Errores de Prisma**: 0 timeouts

---

## 🚀 PRÓXIMAS MEJORAS

### **Optimizaciones Adicionales:**
1. **Streaming de Respuestas**: Respuestas de OpenAI en tiempo real
2. **Lazy Loading**: Cargar componentes bajo demanda
3. **Service Workers**: Caching offline de datos
4. **CDN**: Servir assets estáticos desde CDN

### **Monitoreo:**
1. **APM**: Application Performance Monitoring
2. **Logs Estructurados**: Análisis de rendimiento
3. **Alertas**: Notificaciones de timeouts
4. **Métricas**: Dashboard de rendimiento

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### **Fase 1: Rendimiento**
- [ ] Configurar Turbo en Next.js
- [ ] Implementar navegación del cliente
- [ ] Optimizar consultas de base de datos
- [ ] Añadir límites a consultas

### **Fase 2: Agente**
- [ ] Modificar ConversationPane para llamar a OpenAI
- [ ] Implementar respuesta dinámica
- [ ] Verificar API de process-message
- [ ] Añadir manejo de errores

### **Fase 3: Base de Datos**
- [ ] Aumentar timeouts de Prisma
- [ ] Implementar caching de clientes
- [ ] Optimizar consultas cifradas
- [ ] Añadir índices de base de datos

### **Fase 4: Estado**
- [ ] Sincronizar estado de navegación
- [ ] Implementar persistencia
- [ ] Corregir inconsistencia de step
- [ ] Añadir validación de estado

---

## 🎯 CONCLUSIÓN

El problema principal es una **combinación de rendimiento deficiente, integración incompleta del agente y timeouts de base de datos**. La solución requiere:

1. **Optimización de Rendimiento**: Navegación del cliente y compilación optimizada
2. **Integración Real del Agente**: Llamadas a OpenAI en lugar de respuestas estáticas
3. **Optimización de Base de Datos**: Timeouts aumentados y caching implementado
4. **Corrección de Estado**: Sincronización y persistencia adecuada

**Prioridad**: Implementar las correcciones en orden de impacto en UX, comenzando por la integración del agente y la optimización de rendimiento.

---

**Fecha de Documentación**: 12 de Enero, 2025  
**Desarrollador**: FullStack Senior AI Assistant  
**Archivos Analizados**: 15  
**Problemas Identificados**: 5  
**Soluciones Propuestas**: 4 fases
