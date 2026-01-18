# 📂 ESTRUCTURA DETALLADA DEL PROYECTO BRIKI V2

**Versión:** 2.1
**Rol:** FullStack Engineering
**Objetivo:** Guía de navegación quirúrgica para desarrolladores.

---

## 1. `src/app`: EL ENRUTADOR (App Router)

El directorio `app` define la estructura de rutas, layouts y la carga inicial de datos (Server Components).

### `src/app/[locale]` (Ruta Raíz Internacionalizada)
Todo el contenido visible vive dentro de `[locale]` para soportar i18n (`es`, `en`).
*   **`layout.tsx`**: **Root Layout**. Define `<html>`, `<body>`, fuentes, y proveedores de contexto globales (`NextIntlClientProvider`, `Toaster`). Es el envoltorio universal.
*   **`page.tsx`**: **Landing Page**. La página pública de entrada.

### `src/app/[locale]/(app)` (Rutas Protegidas de Aplicación)
El grupo `(app)` agrupa rutas que requieren autenticación, pero **no afecta la URL**.
*   **`layout.tsx`**: **App Layout**. Verifica autenticación estricta. Si no hay sesión, redirige a login. Envuelve a Workspace y Agent.

#### `src/app/[locale]/(app)/agent` (El Agente)
*   **`[threadId]/page.tsx`**: Página principal del chat.
    *   *Función:* Recibe `threadId`. Carga el componente cliente `HomeClient`.
    *   *Lógica:* Si `threadId` es nuevo, inicia flujo de creación. Si es existente, carga historial.
*   **`new-thread-placeholder/page.tsx`**: Ruta virtual para iniciar un nuevo caso sin ID aún.

#### `src/app/[locale]/(app)/dashboard` (El Dashboard)
*   **`page.tsx`**: Panel principal de control.
    *   *Función:* Carga estadísticas, casos recientes y accesos directos.
    *   *Optimización:* Usa `Suspense` para cargar componentes pesados (gráficas) asíncronamente.

#### `src/app/[locale]/(app)/policies` (Gestión de Pólizas)
*   **`page.tsx`**: Listado de pólizas de la organización.
*   **`overview/page.tsx`**: Dashboard analítico de pólizas (gráficas de distribución, vencimientos).

### `src/app/api` (Backend & Endpoints)
Endpoints REST para operaciones que requieren seguridad o lógica de servidor.
*   **`auth/`**: Endpoints de autenticación (callback de OAuth).
*   **`cases/`**: CRUD de casos.
    *   `[id]/messages/route.ts`: Obtiene historial de chat (desencriptado).
    *   `create/route.ts`: Crea nuevos casos. Maneja la lógica de `CasePolicyLink`.
*   **`org-policies/`**: Manejo del "Caso Virtual".
    *   `linkable/route.ts`: Devuelve pólizas disponibles para vincular (excluyendo las ya vinculadas).

---

## 2. `src/components`: LA INTERFAZ (UI Library)

Componentes de React reutilizables (Client Components en su mayoría).

### `src/components/ui` (Design System)
Componentes base de **shadcn/ui** (Button, Input, Card, Dialog). Son atómicos y estilizados con Tailwind.
*   *Regla:* No modificar lógica de negocio aquí. Solo estilo y comportamiento visual.

### `src/components/Chat` (Motor del Agente)
*   **`ConversationPane.tsx`**: El componente más complejo del chat.
    *   *Responsabilidad:* Renderiza la lista de mensajes, maneja el scroll, y el estado de "escribiendo".
    *   *Conexión:* Se conecta a `useUI` para leer/escribir mensajes.
*   **`Message.tsx`**: Renderiza un mensaje individual (Usuario o IA).
*   **`ChatInput.tsx`**: Área de texto con manejo de adjuntos (clips).

### `src/components/Workspace` (Gestión)
*   **`Sidebar.tsx`**: Navegación lateral.
*   **`Cases/CaseList.tsx`**: Tabla de casos con filtros y paginación.
*   **`Policies/OrgPolicySelector.tsx`**: Componente crítico nuevo.
    *   *Función:* Dropdown con búsqueda para seleccionar pólizas de la organización y vincularlas a un caso.
    *   *Uso:* Se usa en `BriefForm.tsx` al crear/editar casos.

---

## 3. `src/lib`: EL NÚCLEO LÓGICO (Logic Layer)

Donde reside la lógica de negocio, acceso a datos y utilidades.

### `src/lib/data` (Data Access Object - DAO)
Consultas directas a Base de Datos optimizadas para Server Components.
*   **`workspace.ts`**: Consultas para el Dashboard (`getRecentCases`, `getCaseStats`).
    *   *Nota Crítica:* Aquí se implementan los filtros de seguridad para ocultar el caso `__org_policies_container__`.

### `src/lib/helpers` (Utilidades)
*   **`getOrgPoliciesContainer.ts`**: Lógica centralizada para el "Caso Virtual".
    *   *Función:* `getOrCreateOrgPoliciesContainer(orgId)`. Garantiza que solo exista uno por organización.
    *   *Constante:* `ORG_POLICIES_CONTAINER` (define los IDs mágicos del sistema).

### `src/lib/ui` (Estado Global)
*   **`state.ts`**: Definición del store de **Zustand**.
    *   *Contenido:* `currentCaseId`, `messages`, `policies`, `approvalPhase`.
    *   *Acciones:* `setMessages`, `addMessage`, `resetWorkspaceState`.

### `src/lib/database.ts` (Prisma Wrapper)
Abstracciones sobre el cliente de Prisma para operaciones comunes y tipadas.

---

## 4. `src/middleware.ts`: EL GUARDIÁN

Archivo raíz que se ejecuta antes de cada petición.
*   **Responsabilidad:**
    1.  **Auth:** Valida token de Supabase.
    2.  **i18n:** Redirige a `/es` o `/en`.
    3.  **Tenant:** Asegura que el usuario tenga contexto de organización.
*   **Regla:** Mantener ligero. No hacer consultas pesadas a BD aquí.

---

## 5. `prisma/schema.prisma`: EL MODELO DE DATOS

Definición de la estructura de la base de datos PostgreSQL.

### Modelos Clave
*   **`Case`**: La unidad central de trabajo.
*   **`PolicyAnalysis`**: El análisis extraído de un PDF.
*   **`CasePolicyLink`** (NUEVO): Tabla pivote N:M.
    *   Permite que una `PolicyAnalysis` (del caso virtual) se "muestre" en un `Case` real.
    *   Campos: `caseId`, `policyAnalysisId`, `linkType`.
