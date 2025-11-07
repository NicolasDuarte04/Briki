# CHECKLIST DE VALIDACIÓN: NAVEGACIÓN LANDING PAGE CON SIDEBAR

**Fecha**: 31 de Enero, 2025  
**Fase**: 3 - Validación Funcional Exhaustiva  
**Estado**: 🔄 EN PROGRESO

---

## 📋 RESUMEN DE CAMBIOS IMPLEMENTADOS

### **FASE 1: Desacoplamiento de Navegación**
- ✅ Eliminado `setStep("landing")` de `SidebarNav.tsx`
- ✅ Eliminado `handleLogoClick` que causaba el problema
- ✅ Eliminado `onClick={handleLogoClick}` del Link

### **FASE 2: Capa de Defensa**
- ✅ Agregado `usePathname()` en `HomeClient.tsx`
- ✅ Agregada verificación `isAgentRoute` para prevenir renderizado incorrecto
- ✅ Modificada condición de renderizado para usar `shouldRenderLanding`

---

## ✅ CHECKLIST DE PRUEBAS MANUALES

### **TEST 1: Corrección Principal - Navegación desde Agente a Landing** 🔴 CRÍTICO

**Objetivo**: Verificar que el error visual está completamente resuelto.

**Pasos**:
1. Iniciar la aplicación en modo desarrollo: `pnpm dev`
2. Autenticarse en la aplicación
3. Navegar a `/agent/[cualquier-case-id]` (o crear un nuevo caso)
4. **VERIFICAR**: El agente se muestra correctamente con sidebar izquierdo
5. Hacer clic en el **logo de Briki** en el sidebar izquierdo
6. **OBSERVAR ATENTAMENTE** la transición de navegación

**Resultados Esperados**:
- ✅ **NO** se muestra el LandingPage con sidebar durante la transición
- ✅ La navegación es **directa y limpia** a `/landing`
- ✅ El LandingPage se muestra **sin sidebar** inmediatamente
- ✅ **NO** hay renderizado intermedio incorrecto
- ✅ La URL cambia directamente de `/agent/case-id` a `/landing`

**Criterios de Éxito**:
- [ ] No aparece LandingPage con sidebar durante la transición
- [ ] La navegación es instantánea sin renderizado intermedio
- [ ] El LandingPage final se muestra correctamente sin sidebar
- [ ] No hay "parpadeo" o contenido incorrecto visible

---

### **TEST 2: Navegación desde Landing a Agente** 🟡 IMPORTANTE

**Objetivo**: Verificar que la navegación inversa sigue funcionando correctamente.

**Pasos**:
1. Navegar a `/landing` (página principal)
2. **VERIFICAR**: El LandingPage se muestra correctamente sin sidebar
3. Hacer clic en el botón "Agente" en la navegación del LandingPage (o usar cualquier método para navegar al agente)
4. **OBSERVAR** la transición

**Resultados Esperados**:
- ✅ Se navega correctamente a `/agent/new-thread-placeholder` o `/agent/[case-id]`
- ✅ El agente se muestra con sidebar izquierdo
- ✅ No hay errores en la consola del navegador
- ✅ El estado se sincroniza correctamente

**Criterios de Éxito**:
- [ ] La navegación funciona correctamente
- [ ] El agente se muestra con sidebar
- [ ] No hay errores en consola
- [ ] El estado de Zustand se sincroniza correctamente

---

### **TEST 3: Estado de Zustand después de Navegar** 🟡 IMPORTANTE

**Objetivo**: Verificar que el estado de Zustand no causa problemas residuales.

**Pasos**:
1. Navegar a `/agent/[case-id]`
2. Abrir la consola del navegador (F12)
3. Verificar en la consola que `step` en Zustand es `"conversation"`
4. Hacer clic en el logo para navegar a `/landing`
5. Verificar que el estado puede ser `"landing"` o `"conversation"` (no crítico)
6. Volver a `/agent/[case-id]` usando el botón "Agente" en el sidebar
7. **VERIFICAR**: El agente se muestra correctamente

**Resultados Esperados**:
- ✅ El estado se sincroniza correctamente desde `initialStep` cuando se carga una ruta
- ✅ No hay conflictos de estado que causen renderizado incorrecto
- ✅ El agente funciona correctamente después de navegar de vuelta

**Criterios de Éxito**:
- [ ] El estado se sincroniza correctamente
- [ ] No hay conflictos de estado
- [ ] El agente funciona después de navegar de vuelta

---

### **TEST 4: Renderizado de Landing en Otras Rutas** 🟢 VERIFICACIÓN

**Objetivo**: Verificar que el LandingPage se renderiza correctamente en rutas de marketing.

**Pasos**:
1. Navegar directamente a `/(marketing)/page.tsx` (ruta raíz `/` o `/[locale]/`)
2. **VERIFICAR**: `HomeClient` se carga con `initialStep="landing"`
3. **VERIFICAR**: `isAgentRoute` será `false` (no estamos en `/agent/*`)
4. **VERIFICAR**: `shouldRenderLanding` será `true`
5. **VERIFICAR**: El LandingPage se muestra correctamente

**Resultados Esperados**:
- ✅ El LandingPage se renderiza correctamente en rutas de marketing
- ✅ No hay sidebar visible
- ✅ La verificación de ruta funciona correctamente (`isAgentRoute = false`)

**Criterios de Éxito**:
- [ ] LandingPage se renderiza en rutas de marketing
- [ ] No hay sidebar visible
- [ ] La verificación de ruta funciona correctamente

---

### **TEST 5: Hotkeys y Navegación por Teclado** 🟢 VERIFICACIÓN

**Objetivo**: Verificar que los hotkeys y la navegación por teclado no se afectaron.

**Pasos**:
1. Navegar a `/agent/[case-id]`
2. Usar los hotkeys para cambiar de step (si están configurados)
3. **VERIFICAR**: Los hotkeys funcionan correctamente
4. **VERIFICAR**: No se navega accidentalmente a `/landing`

**Resultados Esperados**:
- ✅ Los hotkeys funcionan correctamente
- ✅ No hay navegación accidental a `/landing`
- ✅ El estado interno de steps funciona correctamente

**Criterios de Éxito**:
- [ ] Hotkeys funcionan correctamente
- [ ] No hay navegación accidental
- [ ] El estado interno funciona correctamente

---

### **TEST 6: Regresión - Funcionalidades Existentes** 🟢 VERIFICACIÓN

**Objetivo**: Verificar que no se rompieron funcionalidades existentes.

**Pasos**:
1. **Creación de casos desde Landing**:
   - Navegar a `/landing`
   - Escribir un mensaje en el chat input
   - Enviar el mensaje
   - **VERIFICAR**: Se crea el caso y se navega correctamente

2. **Navegación entre casos históricos**:
   - Navegar a `/agent/[case-id]`
   - Abrir el panel de chat histórico (botón "Chat" en sidebar)
   - Hacer clic en un caso histórico
   - **VERIFICAR**: Se carga el caso correctamente

3. **Aprobación de casos**:
   - Llenar el formulario de brief
   - Hacer clic en "Aprobar" o "Buscar Planes"
   - **VERIFICAR**: El caso se aprueba correctamente
   - **VERIFICAR**: Los botones desaparecen después de aprobar
   - **VERIFICAR**: El formulario se cierra y muestra el resumen

4. **Edición de casos**:
   - Después de aprobar un caso, hacer clic en "Editar"
   - **VERIFICAR**: El formulario se abre correctamente
   - **VERIFICAR**: El botón muestra "Actualizar Formulario"

5. **Chat con agente**:
   - Enviar mensajes al agente
   - **VERIFICAR**: Los mensajes se envían y reciben correctamente
   - **VERIFICAR**: El agente responde correctamente

**Resultados Esperados**:
- ✅ Todas las funcionalidades existentes funcionan correctamente
- ✅ No hay regresiones en el flujo de casos
- ✅ No hay regresiones en el flujo de chat

**Criterios de Éxito**:
- [ ] Creación de casos funciona
- [ ] Navegación entre casos funciona
- [ ] Aprobación de casos funciona
- [ ] Edición de casos funciona
- [ ] Chat con agente funciona

---

### **TEST 7: Rendimiento y Consola del Navegador** 🟢 VERIFICACIÓN

**Objetivo**: Verificar que no hay errores en consola ni problemas de rendimiento.

**Pasos**:
1. Abrir la consola del navegador (F12)
2. Navegar entre diferentes rutas:
   - `/landing` → `/agent/[case-id]` → `/landing` (varias veces)
3. **VERIFICAR**: No hay errores en la consola
4. **VERIFICAR**: No hay warnings relacionados con React
5. **VERIFICAR**: No hay renderizados innecesarios (usar React DevTools si está disponible)

**Resultados Esperados**:
- ✅ No hay errores en la consola
- ✅ No hay warnings de React
- ✅ No hay renderizados innecesarios
- ✅ La navegación es fluida y rápida

**Criterios de Éxito**:
- [ ] No hay errores en consola
- [ ] No hay warnings
- [ ] No hay renderizados innecesarios
- [ ] La navegación es fluida

---

### **TEST 8: Casos Edge - Rutas Especiales** 🟢 VERIFICACIÓN

**Objetivo**: Verificar que las rutas especiales funcionan correctamente.

**Pasos**:
1. **Ruta `/agent/new-thread-placeholder`**:
   - Navegar directamente a esta ruta
   - **VERIFICAR**: Se muestra el formulario de brief
   - **VERIFICAR**: No se renderiza Landing incorrectamente

2. **Recarga de página en `/agent/[case-id]`**:
   - Navegar a `/agent/[case-id]`
   - Recargar la página (F5)
   - **VERIFICAR**: El agente se carga correctamente
   - **VERIFICAR**: No se renderiza Landing incorrectamente

3. **Navegación directa a `/landing`**:
   - Abrir una nueva pestaña
   - Navegar directamente a `/landing`
   - **VERIFICAR**: El LandingPage se muestra correctamente sin sidebar

**Resultados Esperados**:
- ✅ Las rutas especiales funcionan correctamente
- ✅ No hay renderizado incorrecto en ningún caso
- ✅ La verificación de ruta funciona en todos los casos

**Criterios de Éxito**:
- [ ] Rutas especiales funcionan
- [ ] No hay renderizado incorrecto
- [ ] La verificación de ruta funciona en todos los casos

---

## 📊 RESUMEN DE VALIDACIÓN

### **Tests Críticos (Deben pasar 100%)**
- [ ] **TEST 1**: Corrección Principal - Navegación desde Agente a Landing
- [ ] **TEST 2**: Navegación desde Landing a Agente
- [ ] **TEST 3**: Estado de Zustand después de Navegar

### **Tests Importantes (Deben pasar 100%)**
- [ ] **TEST 4**: Renderizado de Landing en Otras Rutas
- [ ] **TEST 6**: Regresión - Funcionalidades Existentes

### **Tests de Verificación (Deben pasar 100%)**
- [ ] **TEST 5**: Hotkeys y Navegación por Teclado
- [ ] **TEST 7**: Rendimiento y Consola del Navegador
- [ ] **TEST 8**: Casos Edge - Rutas Especiales

---

## 🚨 CRITERIOS DE APROBACIÓN

**La implementación se considera EXITOSA si**:
- ✅ **TEST 1** pasa completamente (no hay renderizado incorrecto)
- ✅ **TEST 2** y **TEST 3** pasan (navegación funciona correctamente)
- ✅ **TEST 6** pasa (no hay regresiones)
- ✅ No hay errores críticos en consola
- ✅ La experiencia de usuario es fluida y sin errores visuales

**La implementación se considera FALLIDA si**:
- ❌ Se muestra LandingPage con sidebar durante la transición (TEST 1 falla)
- ❌ Hay regresiones en funcionalidades existentes (TEST 6 falla)
- ❌ Hay errores críticos en consola que rompen la aplicación

---

## 📝 NOTAS PARA EL TESTER

1. **Observar atentamente la transición**: El problema original era un renderizado intermedio incorrecto. Presta especial atención a la transición cuando haces clic en el logo.

2. **Verificar la consola**: Abre la consola del navegador (F12) y verifica que no hay errores relacionados con React, Next.js o Zustand.

3. **Probar múltiples veces**: Ejecuta el TEST 1 varias veces para asegurar que el problema está completamente resuelto.

4. **Probar en diferentes navegadores**: Si es posible, prueba en Chrome, Firefox y Safari para asegurar compatibilidad.

5. **Probar con diferentes casos**: Prueba con casos nuevos, casos históricos, casos aprobados, etc.

---

**Última actualización**: 31 de Enero, 2025  
**Estado**: 🔄 LISTO PARA EJECUTAR PRUEBAS

