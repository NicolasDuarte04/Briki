# Arquitectura de Aprobación de Casos Unificada

Este documento describe el patrón de diseño implementado para unificar la funcionalidad de "aprobación" de casos en la aplicación Briki.

## 1. Principio de Diseño

La aprobación de un caso es una acción de negocio crítica que implica dos operaciones:
1.  Persistir los datos más recientes del "brief" del caso.
2.  Cambiar el estado del caso de `draft` a `active`.

Para garantizar la consistencia y mantenibilidad, esta lógica se ha centralizado siguiendo un patrón de tres capas:

## 2. Flujo de la Acción

**Capa 1: Componentes de UI (Los Disparadores)**
- Tres botones (`MessageAgent`, `BriefForm`, `ConversationPane`) actúan como disparadores.
- Su única responsabilidad es invocar la función `approveCurrentCase()` del store de Zustand (`useUI`). No contienen lógica de negocio.

**Capa 2: Estado Global (El Orquestador)**
- La función `approveCurrentCase()` reside en `src/lib/ui/state.ts`.
- Orquesta la acción:
    - Gestiona los estados de carga (`caseApproving`).
    - Obtiene el `currentCaseId` y los datos del `brief` del propio store.
    - Llama al endpoint de la API.
    - En caso de éxito, invoca otras acciones de UI (`startSourcing`).
    - Maneja y expone los errores.

**Capa 3: Backend API (El Guardián)**
- El endpoint `PUT /api/cases/approve` es la única puerta de entrada a la lógica de negocio.
- Es responsable de:
    - Validar la autenticación y los permisos (pertenencia a la organización).
    - Validar el estado del caso (debe ser `draft`).
    - Ejecutar una única operación atómica `prisma.case.update` para guardar los datos y cambiar el estado.
    - Devolver una respuesta clara de éxito o fracaso.

Este patrón asegura que la lógica de negocio esté en un solo lugar (la API), la orquestación de la UI esté en otro (Zustand), y los componentes sean simples y reutilizables.
