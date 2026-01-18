# 🏗️ ARQUITECTURA Y FLUJOS DE TRABAJO - BRIKI V2

**Versión:** 2.1 (Estado Actual)
**Rol:** FullStack Engineering
**Enfoque:** Arquitectura Dual, Estado Unidireccional, Separación de Responsabilidades

---

## 1. CONCEPTO DE ARQUITECTURA DUAL

Briki no es una aplicación monolítica tradicional; opera bajo un concepto de **Arquitectura Dual** que separa claramente dos contextos de usuario:

### A. El WORKSPACE (`/workspace`)
*   **Propósito:** Gestión administrativa, estática y estructurada.
*   **Naturaleza:** CRUD (Create, Read, Update, Delete), Dashboards, Tablas.
*   **Estado:** Depende fuertemente de **Server Components** para la carga de datos inicial y revalidación de caché.
*   **Usuario:** El usuario "gestiona" casos, clientes y pólizas.

### B. El AGENTE (`/agent`)
*   **Propósito:** Interacción dinámica, conversacional y asistida por IA.
*   **Naturaleza:** Stateful (mantiene estado de chat), Streaming (respuestas de IA en tiempo real).
*   **Estado:** Depende fuertemente de **Client Components** y **Zustand** (`useUI`) para mantener la fluidez de la conversación sin recargas.
*   **Usuario:** El usuario "conversa" y "colabora" con la IA para construir el caso.

---

## 2. GESTIÓN DE ESTADO (Zustand + Persistence)

La aplicación utiliza **Zustand** (`src/lib/ui/state.ts`) como única fuente de verdad para el estado de la interfaz de usuario (UI State).

### Principio de Unidireccionalidad
1.  **Acción UI:** Usuario hace clic o escribe.
2.  **Store Update:** Se actualiza el store de Zustand.
3.  **Re-render:** Los componentes suscritos se actualizan.
4.  **Sync (Opcional):** Se sincroniza con la BD vía API.

### Estrategia de Persistencia (`localStorage`)
Para evitar la pérdida de contexto al recargar, persistimos datos *esenciales* pero *no sensibles/pesados*:
*   ✅ `currentCaseId`: Para saber en qué caso está el usuario.
*   ✅ `step`: Para saber si está en 'landing', 'conversation', etc.
*   ❌ `messages`: **NO SE PERSISTEN** en localStorage. Se recargan siempre desde la BD (`/api/cases/[id]/messages`) al iniciar para garantizar integridad y seguridad.

---

## 3. ARQUITECTURA DE PÓLIZAS DE ORGANIZACIÓN (El "Caso Virtual")

Una de las implementaciones más críticas y únicas de Briki es el manejo de pólizas a nivel de organización.

### El Problema
Originalmente, las pólizas (`PolicyAnalysis`) dependían obligatoriamente de un caso (`Case`). Esto impedía tener una "biblioteca de pólizas" de la organización que no estuviera atada a un cliente específico.

### La Solución: El Caso Virtual (`__org_policies_container__`)
Creamos un **Caso Contenedor** único por organización que actúa como "biblioteca".

*   **Identificador:** `status = '__org_policies_container__'`
*   **Stage:** `'__system__'`
*   **Visibilidad:** **ESTRICTAMENTE OCULTO**. Este caso nunca debe aparecer en:
    *   Listas de casos recientes.
    *   Resultados de búsqueda.
    *   Sidebar de historial.
*   **Implementación Técnica:**
    *   Se filtra explícitamente en `src/lib/data/workspace.ts` y en las consultas de Prisma.
    *   Usa una relación N:M (`CasePolicyLink`) para vincular estas pólizas "flotantes" a casos reales cuando se necesitan.

### Flujo de Vinculación (Linking)
1.  Usuario sube póliza a "Pólizas de Organización" -> Se guarda en el **Caso Virtual**.
2.  Usuario crea un **Caso Real** (ej. "Cliente Juan").
3.  Usuario selecciona pólizas de la organización.
4.  Sistema crea registros en `CasePolicyLink` uniendo el **Caso Real** con las **Pólizas del Caso Virtual**.
5.  El Agente ve estas pólizas como si fueran nativas del caso.

---

## 4. MIDDLEWARE Y SEGURIDAD (`src/middleware.ts`)

El middleware actúa como el guardián de la arquitectura dual y la seguridad multi-tenant.

1.  **Resolución de Locale:** Determina el idioma (`es`, `en`) basado en headers o cookies.
2.  **Autenticación (Supabase):** Verifica la sesión del usuario antes de tocar cualquier ruta protegida.
3.  **Contexto de Organización:**
    *   Detecta si el usuario tiene una organización seleccionada.
    *   Si intenta acceder a `/workspace` o `/agent` sin organización, lo redirige a `/onboarding` o `/select-org`.
4.  **Protección de Rutas:**
    *   Rutas públicas: `/login`, `/auth/*`, `/landing`.
    *   Rutas protegidas: `/dashboard`, `/agent/*`, `/policies`.

---

## 5. FLUJO DE DATOS: DEL SERVIDOR AL CLIENTE

Briki maximiza el uso de **Server Components** para la carga inicial de datos (SEO, Performance) y **Client Components** para la interactividad.

### Patrón de Hidratación
1.  **Page (Server):** `src/app/.../page.tsx`
    *   Verifica sesión y permisos.
    *   Hace fetch de datos a la BD (Prisma) o API.
    *   Pasa datos iniciales como *props* al componente cliente.
2.  **Client Component:** `src/components/...Client.tsx`
    *   Recibe props iniciales.
    *   Inicializa estado de Zustand (si es necesario).
    *   Maneja interactividad (clicks, formularios).

Este patrón asegura que el usuario vea contenido inmediatamente (Server Side Rendering) mientras la interactividad se carga (Hydration).
