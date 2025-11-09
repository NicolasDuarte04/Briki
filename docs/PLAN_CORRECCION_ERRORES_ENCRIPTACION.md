# PLAN DETALLADO: CORRECCIÓN DE ERRORES POST-IMPLEMENTACIÓN DE ENCRIPTACIÓN

**Fecha**: 31 de Enero, 2025  
**Rol**: Ingeniero FullStack Senior  
**Objetivo**: Corregir errores críticos identificados después de la implementación de encriptación  
**Prioridad**: 🔴 CRÍTICA - Bloquea funcionalidades esenciales

---

## 📋 RESUMEN EJECUTIVO

### **ERRORES IDENTIFICADOS**

1. **Error en `/api/chat/process-message`**: 
   - `Invalid value provided. Expected String, provided Bytes.`
   - Los mensajes no se están guardando en la BD
   - **Impacto**: 🔴 CRÍTICO - Bloquea creación de mensajes

2. **Error en `/profile`**:
   - `The column profiles.display_name does not exist in the current database.`
   - No se puede acceder a la página de perfil
   - **Impacto**: 🔴 CRÍTICO - Bloquea acceso a perfiles

3. **Mensajes históricos no se muestran**:
   - Los mensajes existen en la BD (encriptados)
   - Pero no se están mostrando en la UI
   - **Impacto**: 🟡 MEDIO - Afecta experiencia de usuario

---

## 🔍 ANÁLISIS QUIRÚRGICO DE CAUSAS RAÍZ

### **ERROR 1: Prisma Client Espera String en lugar de Bytes**

#### **Causa Identificada**

**Ubicación**: `src/app/api/chat/process-message/route.ts` (líneas 79, 104)

**Problema**:
- El schema de Prisma define `Message.content` como `Bytes`
- El código intenta pasar `Uint8Array` (resultado de `encryptMessageContent()`)
- Prisma Client está validando que el tipo sea `String` en lugar de `Bytes`

**Análisis del Error**:
```
Invalid `prisma.message.create()` invocation:
Argument `content`: Invalid value provided. Expected String, provided Bytes.
```

**Posibles Causas**:
1. **Prisma Client no regenerado**: El cliente de Prisma puede no haberse regenerado correctamente después de cambiar el schema
2. **Cache de Prisma Client**: El cliente puede estar usando una versión cacheada del schema anterior
3. **Tipo incorrecto en Prisma Client**: El tipo generado puede no coincidir con el schema

**Archivos Afectados**:
- `src/app/api/chat/process-message/route.ts` (líneas 79, 104)
- `src/app/api/cases/[id]/messages/route.ts` (línea 96, 143)
- `prisma/schema.prisma` (línea 434)

**Verificación Necesaria**:
- Verificar que `prisma generate` se ejecutó correctamente
- Verificar que el Prisma Client generado tiene el tipo correcto para `Message.content`
- Verificar que no hay conflictos de tipos en TypeScript

---

### **ERROR 2: Columna `display_name` No Existe en BD**

#### **Causa Identificada**

**Ubicación**: `src/app/[locale]/(app)/profile/page.tsx` (línea 22)

**Problema**:
- El schema de Prisma define `Profile.name` con `@map("display_name")`
- La columna en la BD probablemente se llama diferente o no existe
- Prisma intenta acceder a `profiles.display_name` pero la columna no existe

**Análisis del Error**:
```
Invalid `prisma.user.findUnique()` invocation:
The column `profiles.display_name` does not exist in the current database.
```

**Posibles Causas**:
1. **Columna renombrada**: La columna puede haberse renombrado en la BD pero el schema no se actualizó
2. **Columna eliminada**: La columna puede haberse eliminado en alguna migración
3. **Nombre incorrecto en schema**: El `@map("display_name")` puede estar incorrecto
4. **Columna encriptada**: La columna puede haberse convertido a `name_enc` (BYTEA) pero el schema no refleja esto

**Archivos Afectados**:
- `src/app/[locale]/(app)/profile/page.tsx` (línea 22, 28)
- `prisma/schema.prisma` (línea 65)
- Posiblemente `src/app/[locale]/(app)/profile/actions.ts`

**Verificación Necesaria**:
- Verificar estructura real de la tabla `profiles` en la BD
- Verificar si existe `display_name`, `name`, o `name_enc`
- Verificar migraciones relacionadas con `profiles.name`

---

### **ERROR 3: Mensajes Históricos No Se Muestran**

#### **Causa Identificada**

**Ubicación**: `src/components/Chat/ConversationPane.tsx`

**Problema**:
- `SidebarChatPanel` carga los mensajes históricos y los establece en el estado global (`setMessages`)
- `ConversationPane` no tiene un `useEffect` que cargue los mensajes cuando `currentCaseId` cambia
- Si el usuario navega directamente a `/agent/[caseId]` sin pasar por `SidebarChatPanel`, los mensajes no se cargan

**Análisis del Flujo**:
1. Usuario hace clic en caso histórico en `SidebarChatPanel`
2. `SidebarChatPanel.handleChatClick()` carga mensajes y llama `setMessages(historicalMessages)`
3. Navega a `/agent/[caseId]`
4. `ConversationPane` se monta pero no tiene lógica para cargar mensajes si `currentCaseId` ya existe
5. Los mensajes no se muestran

**Archivos Afectados**:
- `src/components/Chat/ConversationPane.tsx` (falta `useEffect` para cargar mensajes)
- `src/components/SidebarChatPanel.tsx` (carga mensajes pero solo cuando se hace clic)

**Verificación Necesaria**:
- Verificar que `ConversationPane` tiene lógica para cargar mensajes cuando `currentCaseId` cambia
- Verificar que la API `/api/cases/[id]/messages` retorna mensajes desencriptados correctamente
- Verificar que el formato de mensajes retornado por la API coincide con el formato esperado por `ConversationPane`

---

## 🎯 PLAN DE RESOLUCIÓN DETALLADO

### **FASE 1: CORRECCIÓN DE ERROR DE PRISMA CLIENT (BYTES vs STRING)**

#### **Objetivo**
Corregir el error de validación de Prisma que espera `String` en lugar de `Bytes` para `Message.content`.

#### **Estrategia**

**1.1. Verificar Regeneración de Prisma Client**

**Acciones**:
1. Verificar que `prisma/schema.prisma` tiene `content Bytes` (no `String`)
2. Ejecutar `pnpm prisma generate` para regenerar el cliente
3. Verificar que no hay errores durante la generación
4. Verificar que el tipo generado en `node_modules/.prisma/client/index.d.ts` es correcto

**Archivos a Verificar**:
- `prisma/schema.prisma` (línea 434)
- `node_modules/.prisma/client/index.d.ts` (buscar `MessageCreateInput`)

**Tiempo Estimado**: 15 minutos

---

**1.2. Verificar Uso Correcto de Uint8Array**

**Problema Identificado**:
- `encryptMessageContent()` retorna `Uint8Array`
- Prisma puede requerir `Buffer` en lugar de `Uint8Array`

**Acciones**:
1. Verificar si Prisma acepta `Uint8Array` o requiere `Buffer`
2. Si requiere `Buffer`, convertir `Uint8Array` a `Buffer` antes de pasar a Prisma
3. Actualizar `messageEncryption.ts` si es necesario

**Archivos a Modificar**:
- `src/lib/helpers/messageEncryption.ts` (si es necesario convertir a Buffer)
- `src/app/api/chat/process-message/route.ts` (verificar conversión)
- `src/app/api/cases/[id]/messages/route.ts` (verificar conversión)

**Tiempo Estimado**: 30 minutos

---

**1.3. Verificar Tipos TypeScript**

**Acciones**:
1. Verificar que los tipos TypeScript coinciden con los tipos de Prisma
2. Verificar que no hay conflictos de tipos en los archivos que usan `Message.content`
3. Ejecutar `pnpm tsc --noEmit` para verificar errores de tipos

**Archivos a Verificar**:
- `src/app/api/chat/process-message/route.ts`
- `src/app/api/cases/[id]/messages/route.ts`
- `src/lib/helpers/messageEncryption.ts`

**Tiempo Estimado**: 20 minutos

---

**1.4. Testing de Corrección**

**Acciones**:
1. Crear un mensaje desde `/agent/new-thread-placeholder`
2. Verificar que se guarda correctamente en la BD
3. Verificar que el contenido está encriptado (BYTEA)
4. Verificar que se puede leer y desencriptar correctamente

**Tiempo Estimado**: 15 minutos

**Tiempo Total FASE 1**: ~1.5 horas

---

### **FASE 2: CORRECCIÓN DE ERROR DE PROFILE (display_name)**

#### **Objetivo**
Corregir el error de columna `display_name` no encontrada en la tabla `profiles`.

#### **Estrategia**

**2.1. Verificar Estructura Real de la BD**

**Acciones**:
1. Ejecutar consulta SQL para verificar columnas de `profiles`:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
     AND table_name = 'profiles' 
     AND column_name LIKE '%name%'
   ORDER BY column_name;
   ```
2. Verificar si existe `display_name`, `name`, o `name_enc`
3. Documentar estructura real encontrada

**Tiempo Estimado**: 15 minutos

---

**2.2. Actualizar Schema de Prisma**

**Escenarios Posibles**:

**Escenario A**: La columna se llama `name` (no `display_name`)
- Actualizar `prisma/schema.prisma`: Remover `@map("display_name")` o cambiar a `@map("name")`

**Escenario B**: La columna se llama `name_enc` (BYTEA encriptado)
- Actualizar `prisma/schema.prisma`: Cambiar `name String?` a `name Bytes? @map("name_enc")`
- Crear helper de encriptación para `name` (similar a `phone` y `address`)
- Actualizar `profile/page.tsx` y `profile/actions.ts` para usar encriptación

**Escenario C**: La columna no existe
- Crear migración para agregar la columna
- O remover el campo del schema si no es necesario

**Acciones**:
1. Basado en la estructura real, actualizar `prisma/schema.prisma`
2. Regenerar Prisma Client: `pnpm prisma generate`
3. Verificar que no hay errores

**Archivos a Modificar**:
- `prisma/schema.prisma` (línea 65)
- Posiblemente `src/lib/helpers/profileEncryption.ts` (si se requiere encriptación)
- `src/app/[locale]/(app)/profile/page.tsx` (si se requiere desencriptación)
- `src/app/[locale]/(app)/profile/actions.ts` (si se requiere encriptación)

**Tiempo Estimado**: 1-2 horas (dependiendo del escenario)

---

**2.3. Testing de Corrección**

**Acciones**:
1. Acceder a `/profile`
2. Verificar que la página se carga correctamente
3. Verificar que se pueden leer los datos del perfil
4. Verificar que se pueden actualizar los datos del perfil

**Tiempo Estimado**: 15 minutos

**Tiempo Total FASE 2**: ~2-3 horas

---

### **FASE 3: CORRECCIÓN DE CARGA DE MENSAJES HISTÓRICOS**

#### **Objetivo**
Asegurar que los mensajes históricos se cargan y muestran correctamente en `ConversationPane`.

#### **Estrategia**

**3.1. Agregar useEffect para Cargar Mensajes en ConversationPane**

**Problema Identificado**:
- `ConversationPane` no tiene lógica para cargar mensajes cuando `currentCaseId` cambia
- Solo `SidebarChatPanel` carga mensajes, pero si el usuario navega directamente a `/agent/[caseId]`, los mensajes no se cargan

**Acciones**:
1. Agregar `useEffect` en `ConversationPane` que:
   - Se ejecute cuando `currentCaseId` cambia
   - Cargue mensajes desde `/api/cases/[currentCaseId]/messages`
   - Establezca los mensajes en el estado global usando `setMessages`
   - No interfiera con el flujo de mensaje inicial o bienvenida

2. Asegurar que:
   - Solo carga si `currentCaseId` existe
   - No carga si ya hay mensajes en el estado (para evitar sobrescribir)
   - Maneja errores correctamente
   - No causa loops infinitos

**Código Propuesto**:
```typescript
// Cargar mensajes históricos cuando currentCaseId cambia
useEffect(() => {
  const loadHistoricalMessages = async () => {
    if (!currentCaseId) return;
    
    // No cargar si ya hay mensajes (puede haber sido cargado por SidebarChatPanel)
    const currentMessages = useUI.getState().messages;
    if (currentMessages.length > 0) {
      console.log('📋 [ConversationPane] Mensajes ya cargados, omitiendo carga');
      return;
    }
    
    try {
      console.log(`📥 [ConversationPane] Cargando mensajes históricos para caso ${currentCaseId}`);
      const response = await fetch(`/api/cases/${currentCaseId}/messages`);
      
      if (!response.ok) {
        console.warn(`⚠️ [ConversationPane] Error cargando mensajes: ${response.status}`);
        return;
      }
      
      const { messages: historicalMessages } = await response.json();
      
      if (historicalMessages && historicalMessages.length > 0) {
        console.log(`✅ [ConversationPane] Cargados ${historicalMessages.length} mensajes históricos`);
        setMessages(historicalMessages);
      } else {
        console.log('📭 [ConversationPane] No hay mensajes históricos para este caso');
      }
    } catch (error) {
      console.error('❌ [ConversationPane] Error cargando mensajes históricos:', error);
    }
  };
  
  loadHistoricalMessages();
}, [currentCaseId, setMessages]);
```

**Archivos a Modificar**:
- `src/components/Chat/ConversationPane.tsx` (agregar `useEffect`)

**Tiempo Estimado**: 45 minutos

---

**3.2. Verificar Formato de Mensajes Retornado por API**

**Acciones**:
1. Verificar que `/api/cases/[id]/messages` retorna mensajes en el formato correcto
2. Verificar que los mensajes están desencriptados (texto plano)
3. Verificar que el formato coincide con el formato esperado por `ConversationPane`

**Archivos a Verificar**:
- `src/app/api/cases/[id]/messages/route.ts` (GET handler)
- `src/components/Chat/ConversationPane.tsx` (formato esperado)

**Tiempo Estimado**: 20 minutos

---

**3.3. Testing de Corrección**

**Acciones**:
1. Crear un caso con mensajes
2. Navegar directamente a `/agent/[caseId]` (sin pasar por SidebarChatPanel)
3. Verificar que los mensajes se cargan y muestran correctamente
4. Verificar que los mensajes están desencriptados (legibles)
5. Verificar que se pueden enviar nuevos mensajes

**Tiempo Estimado**: 20 minutos

**Tiempo Total FASE 3**: ~1.5 horas

---

## 📊 RESUMEN DE FASES Y PRIORIDADES

| Fase | Descripción | Tiempo | Prioridad | Dependencias |
|------|-------------|--------|-----------|--------------|
| **FASE 1** | Corrección de Prisma Client (Bytes vs String) | ~1.5h | 🔴 CRÍTICA | Ninguna |
| **FASE 2** | Corrección de Profile (display_name) | ~2-3h | 🔴 CRÍTICA | FASE 1 |
| **FASE 3** | Corrección de carga de mensajes históricos | ~1.5h | 🟡 MEDIA | FASE 1 |

**Tiempo Total Estimado**: 5-6 horas

---

## 🎯 PRINCIPIOS ARQUITECTÓNICOS APLICADOS

### **1. Reutilización Máxima del Código Existente**
- ✅ Reutilizar helpers de encriptación existentes
- ✅ Mantener estructura de APIs existentes
- ✅ No duplicar lógica de carga de mensajes

### **2. Mantenimiento de Arquitectura Dual**
- ✅ No modificar estructura de `/workspace` vs `/agent`
- ✅ Mantener separación de responsabilidades
- ✅ Preservar flujos existentes

### **3. Consistencia de Estado Unidireccional**
- ✅ BD como fuente de verdad
- ✅ Estado global (Zustand) como fuente de verdad para UI
- ✅ APIs como intermediarios entre BD y UI

### **4. Separación Clara de Responsabilidades**
- ✅ Helpers de encriptación separados por entidad
- ✅ APIs manejan encriptación transparentemente
- ✅ Componentes no conocen detalles de encriptación

---

## 🚨 RIESGOS Y MITIGACIONES

### **RIESGO 1: Prisma Client No Se Regenera Correctamente**
**Descripción**: El cliente puede no regenerarse correctamente, causando errores persistentes

**Mitigación**:
- Limpiar cache de Prisma: `rm -rf node_modules/.prisma`
- Regenerar cliente: `pnpm prisma generate`
- Verificar tipos generados manualmente

### **RIESGO 2: Cambios en Profile Rompen Funcionalidad Existente**
**Descripción**: Cambiar el schema de Profile puede romper código que usa `name`

**Mitigación**:
- Verificar todos los usos de `Profile.name` en el código
- Actualizar todos los archivos afectados
- Testing exhaustivo de funcionalidad de profile

### **RIESGO 3: Carga de Mensajes Causa Loops Infinitos**
**Descripción**: El `useEffect` puede causar loops infinitos si no se implementa correctamente

**Mitigación**:
- Usar dependencias correctas en `useEffect`
- Verificar que no se carga si ya hay mensajes
- Testing exhaustivo de carga de mensajes

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **Pre-Implementación**
- [ ] Ejecutar análisis de estructura de BD para `profiles`
- [ ] Verificar regeneración de Prisma Client
- [ ] Documentar estructura real encontrada

### **Implementación**
- [ ] FASE 1: Corregir error de Prisma Client
- [ ] FASE 2: Corregir error de Profile
- [ ] FASE 3: Corregir carga de mensajes históricos

### **Post-Implementación**
- [ ] Verificar que creación de mensajes funciona
- [ ] Verificar que acceso a profile funciona
- [ ] Verificar que mensajes históricos se cargan correctamente
- [ ] Verificar que no se rompieron otras funcionalidades

---

## 📝 NOTAS IMPORTANTES

### **1. Orden de Implementación CRÍTICO**
1. **PRIMERO**: FASE 1 (Prisma Client) - Sin esto, nada funciona
2. **SEGUNDO**: FASE 2 (Profile) - Bloquea acceso a perfiles
3. **TERCERO**: FASE 3 (Mensajes históricos) - Mejora experiencia de usuario

### **2. Testing Incremental**
- Probar cada fase antes de continuar
- No avanzar si hay errores críticos
- Documentar problemas encontrados

### **3. Rollback Plan**
Si algo sale mal:
1. Revertir cambios de código (git)
2. Regenerar Prisma Client
3. Revisar logs de errores
4. Re-analizar situación

---

## 🎯 CONCLUSIÓN

Este plan exhaustivo aborda los tres errores críticos identificados después de la implementación de encriptación. La estrategia es:

1. **Corregir Prisma Client** para aceptar `Bytes` correctamente
2. **Corregir schema de Profile** para reflejar estructura real de BD
3. **Agregar carga de mensajes históricos** en `ConversationPane`

El plan preserva:
- ✅ Todas las funcionalidades existentes
- ✅ La arquitectura dual del proyecto
- ✅ Los principios de diseño establecidos
- ✅ La robustez y seguridad implementada

**Última actualización**: 31 de Enero, 2025  
**Mantenedor**: Equipo de Desarrollo Briki  
**Estado**: 📋 PLAN COMPLETO - LISTO PARA VALIDACIÓN Y IMPLEMENTACIÓN

