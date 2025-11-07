# PLAN DE RESOLUCIÓN: NAVEGACIÓN LANDING PAGE CON SIDEBAR

**Fecha**: 31 de Enero, 2025  
**Rol**: Ingeniero FullStack Senior  
**Estado**: 🔴 PROBLEMA IDENTIFICADO - PLAN DE RESOLUCIÓN COMPLETO  
**Prioridad**: ALTA - Error crítico de UX

---

## 📋 RESUMEN EJECUTIVO

### **PROBLEMA IDENTIFICADO**

Cuando el usuario navega desde la interfaz del agente (`/agent/case-id`) hacia el LandingPage (`/landing`), se produce un error visual crítico:

1. **Se muestra una versión incorrecta del LandingPage** con la barra lateral izquierda visible
2. **Esta versión aparece bajo la URL del agente** (`/agent/case-id`) durante unos segundos
3. **Después se carga la versión correcta** del LandingPage sin sidebar en `/landing`
4. **El LandingPage NUNCA debe tener sidebar** según los requisitos de diseño

### **IMPACTO**

- ❌ **UX Degradada**: El usuario ve contenido incorrecto durante la transición
- ❌ **Confusión Visual**: La barra lateral no debe aparecer en el LandingPage
- ❌ **Inconsistencia Arquitectónica**: Mezcla de layouts entre grupos de rutas diferentes
- ❌ **Problema de Rendimiento**: Renderizado innecesario de componentes

---

## 🔍 ANÁLISIS EXHAUSTIVO DEL PROBLEMA

### **1. ESTRUCTURA DE RUTAS Y LAYOUTS**

#### **1.1. Arquitectura de Grupos de Rutas**

```
src/app/[locale]/
├── (app)/                    ← Grupo de rutas autenticadas CON sidebar
│   ├── layout.tsx           ← Envuelve con BrikiSidebarLayout
│   ├── agent/
│   │   ├── [threadId]/
│   │   │   └── page.tsx     ← Renderiza HomeClient
│   │   └── page.tsx
│   └── dashboard/
│       └── page.tsx
│
└── (marketing)/              ← Grupo de rutas de marketing SIN sidebar
    ├── landing/
    │   └── page.tsx         ← Renderiza Landing directamente
    └── page.tsx              ← Renderiza HomeClient con initialStep="landing"
```

#### **1.2. Layouts Aplicados**

**Archivo**: `src/app/[locale]/(app)/layout.tsx`

```typescript
export default async function AppLayout({ children, params }: AppLayoutProps) {
  // ... autenticación ...
  
  return (
    <BrikiSidebarLayout>  ← TODAS las rutas en (app)/ tienen sidebar
      {children}
    </BrikiSidebarLayout>
  )
}
```

**Archivo**: `src/app/[locale]/(marketing)/landing/page.tsx`

```typescript
export default function DedicatedLandingPage() {
  return <Landing />;  ← NO usa HomeClient, renderiza directamente
}
```

**Archivo**: `src/app/[locale]/(marketing)/page.tsx`

```typescript
export default function Home() {
  return <HomeClient initialStep="landing" />;  ← Usa HomeClient
}
```

#### **1.3. Componente HomeClient**

**Archivo**: `src/components/HomeClient.tsx`

**Propósito**: Orquestador principal que maneja diferentes "steps" (landing, conversation, etc.)

**Lógica de Renderizado** (líneas 284-295):

```typescript
) : currentStep === "landing" ? (
  <div className="landing-scroll relative flex-1 overflow-auto">
    <motion.div
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <Landing />  ← Renderiza Landing cuando currentStep === "landing"
    </motion.div>
  </div>
) : (
```

**Problema Identificado**: `HomeClient` renderiza `<Landing />` basándose únicamente en `currentStep === "landing"`, sin verificar si está dentro de un layout con sidebar.

---

### **2. FLUJO DE NAVEGACIÓN PROBLEMÁTICO**

#### **2.1. Punto de Navegación**

**Archivo**: `src/components/SidebarNav.tsx`

**Líneas 21-23**: Handler del logo

```typescript
const handleLogoClick = () => {
  setStep("landing");  ← ❌ PROBLEMA: Cambia estado de Zustand INMEDIATAMENTE
};
```

**Líneas 50-55**: Link de navegación

```typescript
<Link
  href="/landing"      ← Navegación SPA de Next.js (asíncrona)
  onClick={handleLogoClick}
  aria-label="Home"
  className="..."
>
```

#### **2.2. Secuencia de Eventos (PROBLEMÁTICA)**

```
TIEMPO 0ms: Usuario hace clic en logo
  ↓
TIEMPO 1ms: handleLogoClick() ejecuta setStep("landing")
  ↓
  └─→ Zustand actualiza: step = "landing" (INMEDIATO)
  ↓
TIEMPO 2ms: href="/landing" inicia navegación SPA (ASÍNCRONA)
  ↓
TIEMPO 3ms: HomeClient detecta: currentStep === "landing" (TRUE)
  ↓
  └─→ HomeClient renderiza: <Landing /> dentro del layout del agente
  ↓
TIEMPO 4ms: URL todavía es: /agent/case-id (NO ha cambiado)
  ↓
TIEMPO 5-2000ms: Usuario ve LandingPage con sidebar (URL: /agent/case-id) ❌
  ↓
TIEMPO 2001ms: Next.js completa navegación: /landing
  ↓
  └─→ Se carga: (marketing)/landing/page.tsx (sin sidebar) ✅
```

#### **2.3. Causa Raíz**

**PROBLEMA PRINCIPAL**: Conflicto entre estado de Zustand y navegación de Next.js

1. **`setStep("landing")`** cambia el estado de Zustand **INMEDIATAMENTE** (síncrono)
2. **`href="/landing"`** inicia navegación SPA de Next.js **ASÍNCRONAMENTE**
3. **`HomeClient`** detecta `currentStep === "landing"` **ANTES** de que Next.js complete la navegación
4. **`HomeClient`** renderiza `<Landing />` **DENTRO** del layout del agente (con sidebar)
5. La URL todavía es `/agent/case-id` durante este renderizado incorrecto

---

### **3. ANÁLISIS DE DEPENDENCIAS Y CONEXIONES**

#### **3.1. Archivos Directamente Relacionados**

| Archivo | Líneas Clave | Responsabilidad | Impacto |
|---------|--------------|-----------------|---------|
| `src/components/SidebarNav.tsx` | 21-23, 50-55 | Navegación desde sidebar | 🔴 CRÍTICO |
| `src/components/HomeClient.tsx` | 284-295 | Renderizado condicional de Landing | 🔴 CRÍTICO |
| `src/app/[locale]/(app)/layout.tsx` | 34-38 | Layout con sidebar para rutas (app)/ | 🟡 MEDIO |
| `src/app/[locale]/(marketing)/landing/page.tsx` | 1-6 | Página dedicada de landing | 🟢 BAJO |
| `src/app/[locale]/(marketing)/page.tsx` | 1-5 | Página home con HomeClient | 🟡 MEDIO |
| `src/lib/ui/state.ts` | 533-692 | Store de Zustand con step | 🟡 MEDIO |

#### **3.2. Flujos que Dependen de `setStep("landing")`**

**Búsqueda en código**: `grep -r "setStep.*landing" src/`

**Resultados**:
- `src/components/SidebarNav.tsx` (línea 22) ← **ÚNICO USO PROBLEMÁTICO**
- `src/components/Chat/BrikiChat.tsx` (línea 463) ← Uso interno en modo landing
- `src/components/HomeClient.tsx` (línea 53) ← Sincronización desde props

**Análisis**: Solo `SidebarNav.tsx` usa `setStep("landing")` para navegación externa. Los otros usos son internos y no causan el problema.

#### **3.3. Flujos que Dependen de `currentStep === "landing"`**

**Búsqueda en código**: `grep -r "currentStep.*landing\|step.*landing" src/components/HomeClient.tsx`

**Resultados**:
- `src/components/HomeClient.tsx` (línea 284) ← Renderizado condicional

**Análisis**: Solo `HomeClient.tsx` usa `currentStep === "landing"` para renderizar Landing. Este es el punto donde se produce el renderizado incorrecto.

---

### **4. ANÁLISIS DE RIESGOS Y FUNCIONALIDADES SUSCEPTIBLES**

#### **4.1. Funcionalidades que NO se Afectan**

✅ **Navegación desde Landing a Agente**: No se afecta porque usa `router.push()` directamente sin `setStep()`

✅ **Navegación entre casos históricos**: No se afecta porque no usa `setStep("landing")`

✅ **Renderizado de Landing en `/landing`**: No se afecta porque usa página dedicada sin HomeClient

✅ **Hotkeys y navegación por teclado**: No se afecta porque usa `setStep()` internamente sin navegación

✅ **Flujo de creación de casos**: No se afecta porque no navega a landing

#### **4.2. Funcionalidades que SÍ se Afectan (Requieren Verificación)**

🟡 **Navegación desde otros puntos del sidebar**: Si hay otros links que navegan a landing, deben verificarse

🟡 **Estado de Zustand después de navegar**: El estado `step: "landing"` puede quedar residual si no se limpia

🟡 **Renderizado de Landing en otras rutas**: Si `HomeClient` se usa en otras rutas con `initialStep="landing"`, debe verificarse

#### **4.3. Análisis de Regresiones Potenciales**

**RIESGO 1: HomeClient en rutas (app)/ con initialStep="landing"**

**Verificación**: 
- `src/app/[locale]/(app)/agent/[threadId]/page.tsx` → `initialStep="conversation"` ✅
- `src/app/[locale]/(app)/agent/page.tsx` → Redirige, no usa HomeClient ✅
- No hay otras rutas en (app)/ que usen HomeClient con `initialStep="landing"` ✅

**Conclusión**: No hay riesgo de regresión en rutas (app)/

**RIESGO 2: Navegación programática a /landing desde otros componentes**

**Verificación**:
- `grep -r "router.push.*landing\|router.replace.*landing" src/` → No hay otros usos ✅
- `grep -r "href.*landing" src/components/` → Solo en SidebarNav.tsx ✅

**Conclusión**: No hay otros puntos de navegación a /landing

**RIESGO 3: Estado residual de Zustand**

**Verificación**:
- Si `step: "landing"` queda en Zustand después de navegar, podría causar problemas si el usuario vuelve a `/agent/*`
- `HomeClient` sincroniza `step` desde `initialStep` prop (línea 48-57)
- Si `initialStep="conversation"` pero `step="landing"` en Zustand, se sincronizará correctamente ✅

**Conclusión**: El riesgo es mínimo, pero debe verificarse

---

## 🎯 PLAN DE RESOLUCIÓN DETALLADO

### **PRINCIPIO RECTOR**

> **"El LandingPage nunca debe renderizarse dentro del layout del agente. La navegación a `/landing` debe ser una navegación de ruta completa, no un cambio de step dentro de la misma ruta."**

### **ESTRATEGIA GENERAL**

1. **Eliminar `setStep("landing")` de la navegación a `/landing`**
2. **Agregar verificación de ruta en `HomeClient` para prevenir renderizado incorrecto**
3. **Usar navegación programática directa sin cambiar estado de Zustand**
4. **Asegurar limpieza de estado si es necesario**

---

### **FASE 1: ELIMINAR setStep("landing") DE LA NAVEGACIÓN**

#### **Objetivo**

Eliminar el cambio de estado de Zustand antes de navegar a `/landing`, permitiendo que Next.js maneje la navegación completamente.

#### **Archivo**: `src/components/SidebarNav.tsx`

**Cambio 1.1**: Eliminar `handleLogoClick` que ejecuta `setStep("landing")`

**ANTES** (líneas 21-23):
```typescript
const handleLogoClick = () => {
  setStep("landing");
};
```

**DESPUÉS**:
```typescript
// ✅ ELIMINADO: No cambiar estado de Zustand antes de navegar
// La navegación a /landing debe ser una navegación de ruta completa
// No un cambio de step dentro de la misma ruta
```

**Justificación**: 
- `setStep("landing")` cambia el estado INMEDIATAMENTE, causando renderizado prematuro
- La navegación a `/landing` debe ser manejada completamente por Next.js
- El estado de Zustand no debe controlar navegación entre grupos de rutas diferentes

**Cambio 1.2**: Eliminar `onClick={handleLogoClick}` del Link

**ANTES** (líneas 50-55):
```typescript
<Link
  href="/landing"
  onClick={handleLogoClick}  ← ❌ ELIMINAR
  aria-label="Home"
  className="..."
>
```

**DESPUÉS**:
```typescript
<Link
  href="/landing"
  aria-label="Home"
  className="..."
>
```

**Justificación**: 
- El `onClick` ya no es necesario porque no cambiamos estado
- Next.js manejará la navegación automáticamente con el `href`

**Cambio 1.3**: Eliminar importación de `setStep` si no se usa en otro lugar

**ANTES** (línea 16):
```typescript
const { setStep, openChatPanel } = useUI();
```

**DESPUÉS**:
```typescript
const { openChatPanel } = useUI();  // ✅ Eliminar setStep si no se usa
```

**Verificación**: 
- Buscar otros usos de `setStep` en `SidebarNav.tsx` → No hay otros usos ✅
- Eliminar `setStep` del destructuring

#### **Riesgos y Mitigaciones**

**RIESGO**: Si hay otros componentes que dependen de `setStep("landing")` en `SidebarNav`, podrían romperse.

**MITIGACIÓN**: 
- Verificar que no hay otros usos de `setStep` en `SidebarNav.tsx` ✅
- Los otros usos de `setStep("landing")` en el código son internos y no se afectan ✅

**RIESGO**: El estado de Zustand podría quedar en `step: "conversation"` después de navegar a `/landing`.

**MITIGACIÓN**: 
- Cuando el usuario navegue a `/landing`, Next.js cargará la página dedicada que no usa `HomeClient` con lógica de steps
- Si el usuario vuelve a `/agent/*`, `HomeClient` sincronizará el estado desde `initialStep="conversation"` ✅

---

### **FASE 2: AGREGAR VERIFICACIÓN DE RUTA EN HOMECLIENT**

#### **Objetivo**

Prevenir que `HomeClient` renderice `<Landing />` cuando está dentro de una ruta de agente (`/agent/*`), incluso si `currentStep === "landing"`.

#### **Archivo**: `src/components/HomeClient.tsx`

**Cambio 2.1**: Importar `usePathname` de Next.js

**ANTES** (líneas 1-17):
```typescript
import { useEffect, useRef, useState } from "react";
// ... otros imports ...
```

**DESPUÉS**:
```typescript
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";  // ✅ AGREGAR
// ... otros imports ...
```

**Justificación**: Necesitamos verificar la ruta actual para determinar si estamos en una ruta de agente.

**Cambio 2.2**: Obtener `pathname` en el componente

**ANTES** (línea 29):
```typescript
export default function HomeClient({ initialStep = "landing", threadId }: HomeClientProps) {
  const initializedRef = useRef(false);
  const { step, ... } = useUI();
  // ...
```

**DESPUÉS**:
```typescript
export default function HomeClient({ initialStep = "landing", threadId }: HomeClientProps) {
  const initializedRef = useRef(false);
  const pathname = usePathname();  // ✅ AGREGAR
  const { step, ... } = useUI();
  // ...
```

**Justificación**: Necesitamos la ruta actual para la verificación.

**Cambio 2.3**: Crear función helper para verificar si estamos en ruta de agente

**ANTES** (línea 284):
```typescript
) : currentStep === "landing" ? (
```

**DESPUÉS** (antes de la línea 284):
```typescript
  // ✅ CORRECCIÓN: Verificar si estamos en una ruta de agente
  // Si estamos en /agent/*, NO renderizar Landing incluso si currentStep === "landing"
  // Esto previene el renderizado incorrecto durante la navegación
  const isAgentRoute = pathname?.includes('/agent');
  const shouldRenderLanding = currentStep === "landing" && !isAgentRoute;

) : shouldRenderLanding ? (
```

**Justificación**: 
- Si estamos en una ruta de agente (`/agent/*`), NO debemos renderizar Landing
- Esto previene el renderizado incorrecto durante la transición de navegación
- Solo renderizamos Landing si NO estamos en una ruta de agente

**Cambio 2.4**: Actualizar condición de renderizado

**ANTES** (líneas 284-295):
```typescript
) : currentStep === "landing" ? (
  <div className="landing-scroll relative flex-1 overflow-auto">
    <motion.div
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <Landing />
    </motion.div>
  </div>
) : (
```

**DESPUÉS**:
```typescript
) : shouldRenderLanding ? (
  <div className="landing-scroll relative flex-1 overflow-auto">
    <motion.div
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <Landing />
    </motion.div>
  </div>
) : (
```

**Justificación**: 
- Usamos `shouldRenderLanding` en lugar de `currentStep === "landing"`
- Esto previene el renderizado incorrecto cuando estamos en rutas de agente

#### **Riesgos y Mitigaciones**

**RIESGO**: Si `pathname` es `null` o `undefined`, `isAgentRoute` podría ser incorrecto.

**MITIGACIÓN**: 
- `usePathname()` siempre retorna un string en componentes client-side
- Si es `null`, `pathname?.includes('/agent')` retornará `false`, que es seguro ✅

**RIESGO**: Si hay otras rutas que usan `HomeClient` con `initialStep="landing"` y NO son rutas de agente, podrían verse afectadas.

**MITIGACIÓN**: 
- Verificar que no hay otras rutas en `(app)/` que usen `HomeClient` con `initialStep="landing"` ✅
- Las rutas en `(marketing)/` que usan `HomeClient` NO están en rutas de agente, por lo que funcionarán correctamente ✅

**RIESGO**: La verificación `pathname?.includes('/agent')` podría ser demasiado amplia y afectar otras rutas.

**MITIGACIÓN**: 
- Verificar que no hay otras rutas que contengan `/agent` en el pathname
- `grep -r "/agent" src/app/` → Solo rutas en `(app)/agent/` ✅
- La verificación es específica y segura ✅

---

### **FASE 3: OPCIONAL - NAVEGACIÓN PROGRAMÁTICA CON ROUTER**

#### **Objetivo (OPCIONAL)**

Si queremos más control sobre la navegación, podemos usar `router.push()` o `router.replace()` en lugar de `<Link>`.

#### **Archivo**: `src/components/SidebarNav.tsx`

**Cambio 3.1**: Importar `useRouter` de Next.js

**ANTES** (líneas 1-13):
```typescript
import { SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useUI } from "@/lib/ui/state";
import { getWorkspaceLinks } from "@/config/navigation";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import type { Locale } from "@/lib/routes/workspace";
import { motion } from "framer-motion";
```

**DESPUÉS**:
```typescript
import { SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import Image from "next/image";
// import Link from "next/link";  // ✅ OPCIONAL: Eliminar si usamos router
import { useRouter } from "next/navigation";  // ✅ AGREGAR
import { useUI } from "@/lib/ui/state";
import { getWorkspaceLinks } from "@/config/navigation";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import type { Locale } from "@/lib/routes/workspace";
import { motion } from "framer-motion";
```

**Cambio 3.2**: Reemplazar `<Link>` con botón y `router.push()`

**ANTES** (líneas 50-67):
```typescript
<Link
  href="/landing"
  aria-label="Home"
  className="..."
>
  <span className="...">
    <Image ... />
  </span>
</Link>
```

**DESPUÉS**:
```typescript
<button
  onClick={() => {
    const locale = useLocale() as Locale;
    router.push(`/${locale}/landing`);  // ✅ Navegación programática
  }}
  aria-label="Home"
  className="..."  // ✅ Mantener mismos estilos
>
  <span className="...">
    <Image ... />
  </span>
</button>
```

**Justificación**: 
- `router.push()` nos da más control sobre la navegación
- Podemos asegurar que la navegación sea inmediata sin cambios de estado previos
- `router.replace()` podría ser mejor si no queremos agregar entrada al historial

**NOTA**: Esta fase es OPCIONAL. El `<Link>` de Next.js debería funcionar correctamente después de las Fases 1 y 2.

#### **Riesgos y Mitigaciones**

**RIESGO**: Si usamos `router.push()`, perdemos las optimizaciones de prefetching de Next.js.

**MITIGACIÓN**: 
- El prefetching es útil pero no crítico para esta navegación
- La navegación es rápida de todas formas ✅

**RIESGO**: Si usamos `router.replace()`, el usuario no podrá volver con el botón "atrás".

**MITIGACIÓN**: 
- Usar `router.push()` en lugar de `router.replace()` si queremos mantener el historial ✅
- O usar `router.replace()` si queremos que la navegación sea "definitiva" ✅

---

### **FASE 4: VERIFICACIÓN Y TESTING**

#### **4.1. Casos de Prueba**

**TEST 1: Navegación desde Agente a Landing**

**Pasos**:
1. Navegar a `/agent/case-id`
2. Hacer clic en el logo en el sidebar
3. Verificar que NO se muestra Landing con sidebar
4. Verificar que se navega directamente a `/landing` sin transición intermedia
5. Verificar que el LandingPage se muestra sin sidebar

**Resultado Esperado**: ✅ Navegación directa sin renderizado intermedio

**TEST 2: Navegación desde Landing a Agente**

**Pasos**:
1. Navegar a `/landing`
2. Hacer clic en "Agente" en la navegación
3. Verificar que se navega correctamente a `/agent/new-thread-placeholder`
4. Verificar que el agente se muestra con sidebar

**Resultado Esperado**: ✅ Navegación funciona correctamente (no se afecta)

**TEST 3: Estado de Zustand después de Navegar**

**Pasos**:
1. Navegar a `/agent/case-id`
2. Verificar que `step` en Zustand es `"conversation"`
3. Navegar a `/landing` haciendo clic en el logo
4. Verificar que `step` en Zustand puede ser `"landing"` o `"conversation"` (no crítico)
5. Volver a `/agent/case-id`
6. Verificar que el agente se muestra correctamente

**Resultado Esperado**: ✅ El estado se sincroniza correctamente desde `initialStep`

**TEST 4: Renderizado de Landing en Otras Rutas**

**Pasos**:
1. Navegar a `/(marketing)/page.tsx` (que usa `HomeClient` con `initialStep="landing"`)
2. Verificar que Landing se renderiza correctamente
3. Verificar que NO hay sidebar

**Resultado Esperado**: ✅ Landing se renderiza correctamente en rutas de marketing

**TEST 5: Hotkeys y Navegación por Teclado**

**Pasos**:
1. Navegar a `/agent/case-id`
2. Usar hotkeys para cambiar de step
3. Verificar que los hotkeys funcionan correctamente
4. Verificar que NO se navega a `/landing` accidentalmente

**Resultado Esperado**: ✅ Hotkeys funcionan correctamente (no se afectan)

#### **4.2. Verificación de Regresiones**

**VERIFICACIÓN 1: Funcionalidades Existentes**

- ✅ Creación de casos desde Landing
- ✅ Navegación entre casos históricos
- ✅ Aprobación de casos
- ✅ Edición de casos
- ✅ Renderizado de formularios
- ✅ Chat con agente

**VERIFICACIÓN 2: Rendimiento**

- ✅ No hay renderizados innecesarios
- ✅ No hay cambios de estado innecesarios
- ✅ La navegación es rápida

**VERIFICACIÓN 3: Consistencia Arquitectónica**

- ✅ Las rutas en `(app)/` tienen sidebar
- ✅ Las rutas en `(marketing)/` NO tienen sidebar
- ✅ No hay mezcla de layouts

---

## 📊 RESUMEN DE CAMBIOS

### **Archivos a Modificar**

| Archivo | Cambios | Riesgo | Prioridad |
|---------|---------|--------|-----------|
| `src/components/SidebarNav.tsx` | Eliminar `setStep("landing")` y `handleLogoClick` | 🟢 BAJO | 🔴 ALTA |
| `src/components/HomeClient.tsx` | Agregar verificación de ruta para prevenir renderizado incorrecto | 🟡 MEDIO | 🔴 ALTA |

### **Archivos que NO se Modifican (Verificación)**

| Archivo | Razón |
|---------|-------|
| `src/app/[locale]/(app)/layout.tsx` | No se modifica, sigue funcionando correctamente |
| `src/app/[locale]/(marketing)/landing/page.tsx` | No se modifica, renderiza Landing directamente |
| `src/app/[locale]/(marketing)/page.tsx` | No se modifica, usa HomeClient correctamente |
| `src/lib/ui/state.ts` | No se modifica, el estado funciona correctamente |

### **Líneas de Código Específicas**

**Archivo 1**: `src/components/SidebarNav.tsx`
- **Línea 21-23**: Eliminar `handleLogoClick`
- **Línea 16**: Eliminar `setStep` del destructuring si no se usa
- **Línea 52**: Eliminar `onClick={handleLogoClick}`

**Archivo 2**: `src/components/HomeClient.tsx`
- **Línea 3**: Agregar `import { usePathname } from "next/navigation";`
- **Línea 29**: Agregar `const pathname = usePathname();`
- **Línea 283**: Agregar verificación `const isAgentRoute = pathname?.includes('/agent');`
- **Línea 283**: Agregar `const shouldRenderLanding = currentStep === "landing" && !isAgentRoute;`
- **Línea 284**: Cambiar `currentStep === "landing"` por `shouldRenderLanding`

---

## 🎯 PRINCIPIOS ARQUITECTÓNICOS APLICADOS

### **1. Reutilización Máxima del Código Existente**

✅ **No creamos nuevos componentes**: Reutilizamos `HomeClient` y `Landing` existentes  
✅ **No duplicamos lógica**: Agregamos verificaciones mínimas sin duplicar código  
✅ **Mantenemos estructura existente**: No cambiamos la arquitectura de layouts

### **2. Mantenimiento de la Arquitectura Dual del Proyecto**

✅ **Respetamos grupos de rutas**: `(app)/` con sidebar, `(marketing)/` sin sidebar  
✅ **No mezclamos layouts**: El LandingPage nunca se renderiza en layout de agente  
✅ **Separación clara**: Navegación entre grupos de rutas es explícita

### **3. Consistencia de Estado Unidireccional**

✅ **URL como fuente de verdad**: La URL determina qué página mostrar  
✅ **Estado de Zustand para steps internos**: Solo para steps dentro de la misma ruta  
✅ **No mezclamos navegación y estado**: La navegación a `/landing` no cambia estado prematuramente

### **4. Separación Clara de Responsabilidades**

✅ **SidebarNav**: Solo navegación, no manejo de estado  
✅ **HomeClient**: Renderizado condicional basado en ruta Y estado  
✅ **Next.js Router**: Manejo completo de navegación entre rutas

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **Pre-Implementación**

- [ ] Revisar todos los archivos relacionados
- [ ] Verificar que no hay otros usos de `setStep("landing")` para navegación
- [ ] Confirmar que no hay regresiones potenciales
- [ ] Revisar documentación de arquitectura

### **Implementación**

- [ ] **FASE 1**: Eliminar `setStep("landing")` de `SidebarNav.tsx`
- [ ] **FASE 2**: Agregar verificación de ruta en `HomeClient.tsx`
- [ ] **FASE 3 (OPCIONAL)**: Implementar navegación programática
- [ ] Ejecutar linter y corregir errores
- [ ] Verificar que no hay errores de TypeScript

### **Post-Implementación**

- [ ] **TEST 1**: Navegación desde Agente a Landing
- [ ] **TEST 2**: Navegación desde Landing a Agente
- [ ] **TEST 3**: Estado de Zustand después de Navegar
- [ ] **TEST 4**: Renderizado de Landing en Otras Rutas
- [ ] **TEST 5**: Hotkeys y Navegación por Teclado
- [ ] Verificar que no hay regresiones en funcionalidades existentes
- [ ] Verificar rendimiento (no hay renderizados innecesarios)
- [ ] Verificar consistencia arquitectónica

### **Documentación**

- [ ] Actualizar este documento con resultados de testing
- [ ] Documentar cambios en changelog si es necesario
- [ ] Actualizar documentación de arquitectura si hay cambios significativos

---

## 🚨 NOTAS IMPORTANTES

### **1. Orden de Implementación**

**CRÍTICO**: Implementar las fases en orden:
1. **FASE 1** primero (eliminar `setStep("landing")`)
2. **FASE 2** segundo (agregar verificación de ruta)
3. **FASE 3** opcional (navegación programática)

**Razón**: La FASE 2 depende de que la FASE 1 esté completa para funcionar correctamente.

### **2. Testing Exhaustivo**

**CRÍTICO**: Probar TODOS los casos de prueba antes de considerar la implementación completa.

**Razón**: Este es un cambio que afecta la navegación principal de la aplicación.

### **3. Rollback Plan**

Si algo sale mal:
1. Revertir cambios en `SidebarNav.tsx` (restaurar `handleLogoClick`)
2. Revertir cambios en `HomeClient.tsx` (eliminar verificación de ruta)
3. Verificar que todo funciona como antes

---

## 📝 CONCLUSIÓN

Este plan de resolución aborda el problema de manera exhaustiva y quirúrgica, minimizando el impacto en otras funcionalidades mientras resuelve el error crítico de UX. Las soluciones propuestas:

✅ **Respetan la arquitectura existente**  
✅ **Mantienen la separación de responsabilidades**  
✅ **No rompen funcionalidades existentes**  
✅ **Siguen los principios arquitectónicos del proyecto**  
✅ **Son fáciles de entender y mantener**

La implementación debe seguir el orden especificado y debe ser probada exhaustivamente antes de considerarse completa.

---

**Última actualización**: 31 de Enero, 2025  
**Mantenedor**: Equipo de Desarrollo Briki  
**Estado**: 🔴 LISTO PARA IMPLEMENTACIÓN

