# ARQUITECTURA DEL FLUJO DEL AGENTE CON OPENAI
**Fecha**: 2025-01-12  
**Desarrollador**: FullStack Senior AI Assistant  
**Objetivo**: Documentar el flujo completo de procesamiento de mensajes con integración de OpenAI

---

## 🔄 FLUJO COMPLETO DE PROCESAMIENTO DE MENSAJES

### **1. Inicio del Proceso**
```
Usuario escribe mensaje → ConversationPane.sendMessage() → Validaciones locales
```

### **2. Preparación de Datos**
```typescript
// src/components/Chat/ConversationPane.tsx
const sendMessage = async (messageText?: string) => {
  const trimmed = messageText ? messageText.trim() : value.trim();
  if (!trimmed) return;
  
  // Agregar mensaje del usuario al chat
  const newUserMessage: ChatMessage = { role: "user", content: trimmed };
  setMessages((prev) => [...prev, newUserMessage]);
  
  // Activar indicadores de estado
  setIsTyping(true);
  setIsAnalyzing(true);
}
```

### **3. Llamada a la API de Procesamiento**
```typescript
// src/components/Chat/ConversationPane.tsx
const response = await fetch('/api/chat/process-message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: trimmed,
    brief: brief,
    caseId: currentCaseId  // Referencia al caso activo
  })
});
```

### **4. Procesamiento en el Backend**
```typescript
// src/app/api/chat/process-message/route.ts
export async function POST(request: NextRequest) {
  // 1. Autenticación y validación
  const { user, currentOrg } = await getCurrentOrg();
  const { message, brief, caseId } = await request.json();

  // 2. Obtener documentos del caso
  const artifacts = await prisma.artifact.findMany({
    where: { caseId: caseId, orgId: currentOrg.id },
    select: { fileName: true, contentText: true }
  });

  // 3. Preparar solicitud para OpenAI
  const analysisRequest: AnalysisRequest = {
    message: message || '',
    brief: brief || {},
    documents: artifacts.map(artifact => ({
      fileName: artifact.fileName || 'Unknown Document',
      content: artifact.contentText
    }))
  };

  // 4. Llamar a OpenAI
  const analysisResult = await analyzeInsuranceDocuments(analysisRequest);

  // 5. Devolver respuesta
  return NextResponse.json({
    response: analysisResult,
    caseId: caseId
  });
}
```

### **5. Servicio de OpenAI**
```typescript
// src/lib/openai.ts
export async function analyzeInsuranceDocuments(request: AnalysisRequest): Promise<string> {
  // 1. Validar configuración
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured.');
  }

  // 2. Formatear prompt especializado
  const formattedPrompt = formatInsurancePrompt(request);

  // 3. Llamar a OpenAI API
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [{ role: 'user', content: formattedPrompt }],
    max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000', 10),
    temperature: 0.5
  });

  return response.choices[0]?.message?.content || 'No se pudo generar un análisis.';
}
```

### **6. Prompt Especializado**
```typescript
// src/lib/prompts/insurance-analysis.ts
export const INSURANCE_ANALYSIS_PROMPT_TEMPLATE = `
Tú Rol: Eres un agente especializado en el análisis riguroso y profesional de seguros...

INFORMACIÓN DEL CASO:
- Tipo de negocio: {businessType}
- Número de empleados: {employees}
- Cobertura solicitada: {coverage}
- Categoría de seguro: {insurance_category}
- Presupuesto Máximo: {max_budget} {budget_currency}
- Coberturas Imprescindibles: {required_coverages}
- Perfil del Cliente: {client_profile}
- Notas Adicionales: {freeText}

DOCUMENTOS ADJUNTOS:
{documentsContent}

MENSAJE ORIGINAL DEL USUARIO:
{message}

Análisis Solicitado: Proporciona un análisis detallado y profesional...
`;

export function formatInsurancePrompt(data: PromptData): string {
  // Reemplazar placeholders con datos reales del caso
  return INSURANCE_ANALYSIS_PROMPT_TEMPLATE
    .replace('{businessType}', brief.businessType || 'No especificado')
    .replace('{employees}', brief.employees?.toString() || 'No especificado')
    // ... más reemplazos
}
```

### **7. Respuesta al Usuario**
```typescript
// src/components/Chat/ConversationPane.tsx
const result = await response.json();

const assistantResponse: ChatMessage = {
  role: "assistant",
  content: result.response, // Respuesta generada por OpenAI
  agent: { label: chatTranslations("agents.sourcing") },
};
setMessages((prev) => [...prev, assistantResponse]);

// Desactivar indicadores
setIsAnalyzing(false);
setIsTyping(false);
```

---

## 🏗️ ARQUITECTURA DE COMPONENTES

### **Frontend (ConversationPane)**
- **Estado**: `isAnalyzing`, `isTyping`, `messages`
- **Funciones**: `sendMessage()`, manejo de errores
- **UI**: Indicadores de carga, input de texto, botones

### **API Route (process-message)**
- **Autenticación**: `getCurrentOrg()`
- **Datos**: Consulta de artifacts por `caseId` y `orgId`
- **Integración**: Llamada a servicio de OpenAI
- **Respuesta**: JSON con análisis generado

### **Servicio OpenAI (openai.ts)**
- **Configuración**: Cliente OpenAI con API key
- **Procesamiento**: Formateo de prompt y llamada a API
- **Manejo de errores**: Try-catch con mensajes amigables

### **Prompt Engine (insurance-analysis.ts)**
- **Template**: Prompt especializado para análisis de seguros
- **Formateo**: Reemplazo de placeholders con datos reales
- **Contexto**: Información del caso + documentos + mensaje

---

## 🔐 SEGURIDAD Y VALIDACIÓN

### **Autenticación**
- Usuario debe estar autenticado (`getCurrentOrg()`)
- Verificación de pertenencia a organización
- Filtrado de artifacts por `orgId`

### **Validación de Datos**
- `caseId` requerido en la solicitud
- Validación de tipos en `AnalysisRequest`
- Manejo de documentos con contenido nulo

### **Manejo de Errores**
- Errores de OpenAI capturados y mapeados
- Fallbacks apropiados para respuestas
- Logging detallado para debugging

---

## 📊 FLUJO DE DATOS

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Route      │    │   OpenAI        │
│                 │    │                  │    │                 │
│ 1. Usuario      │───▶│ 2. getCurrentOrg │    │                 │
│    escribe      │    │ 3. Query artifacts│    │                 │
│                 │    │ 4. Prepare req   │───▶│ 5. Analyze docs │
│ 6. Show response│◀───│ 7. Return result │◀───│ 6. Generate     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

---

## 🎯 CORRECCIÓN DEL PANEL DERECHO

### **Problema Identificado**
El panel derecho se ocultaba completamente durante `isSourcing`, perdiendo funcionalidad del formulario.

### **Solución Implementada**
```typescript
// src/components/HomeClient.tsx
if (currentStep === "conversation" || isSourcing) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Widget de progreso: Solo si isSourcing */}
      {isSourcing && (
        <div className="flex-shrink-0 border-b border-border/50 p-2">
          <SourcingProgressWidget compact onStop={stopSourcing} />
        </div>
      )}

      {/* Panel de Tabs: Siempre visible */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <WorkspaceTabs />
      </div>
    </div>
  );
}
```

### **Beneficios**
- ✅ Panel derecho siempre visible durante conversación
- ✅ Formulario accesible mientras agente analiza
- ✅ Widget de progreso integrado sin bloquear panel
- ✅ Mejor experiencia de usuario

---

## 🔧 CONFIGURACIÓN REQUERIDA

### **Variables de Entorno**
```bash
# .env.local
OPENAI_API_KEY="sk-..."           # Clave de API de OpenAI
OPENAI_MODEL="gpt-4o-mini"        # Modelo a utilizar
OPENAI_MAX_TOKENS="4000"          # Límite de tokens
```

### **Dependencias**
```json
{
  "openai": "^4.0.0"  // Cliente oficial de OpenAI
}
```

---

## 📈 MÉTRICAS Y MONITOREO

### **Logs de Debugging**
- `🔄 API: Procesando mensaje` - Inicio del proceso
- `📁 X documentos disponibles` - Cantidad de documentos
- `✅ API: Análisis completado` - Finalización exitosa
- `ERROR [OpenAI Service]` - Errores de API

### **Indicadores de Estado**
- `isTyping` - Usuario escribiendo
- `isAnalyzing` - OpenAI procesando
- `isSourcing` - Análisis en progreso

---

## 🚀 PRÓXIMAS MEJORAS

### **Optimizaciones de Performance**
- Caching de respuestas de OpenAI
- Streaming de respuestas largas
- Rate limiting de llamadas

### **Mejoras de UX**
- Indicadores de progreso más detallados
- Previsualización de documentos
- Historial de conversaciones

### **Funcionalidades Adicionales**
- Múltiples modelos de IA
- Análisis de sentimientos
- Exportación de análisis

---

**CONCLUSIÓN**: La integración con OpenAI proporciona análisis real e inteligente de documentos de seguros, mientras que la corrección del panel derecho mantiene la funcionalidad completa del formulario durante todo el proceso.

---

**Fecha de Documentación**: 12 de Enero, 2025  
**Desarrollador**: FullStack Senior AI Assistant  
**Archivos Modificados**: 4  
**Archivos Creados**: 3  
**Líneas de Código**: ~300
