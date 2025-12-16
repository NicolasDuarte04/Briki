# 🏗️ PLAN DE MIGRACIÓN: ARQUITECTURA MULTI-TENANCY (NORMALIZADA Y SEGURA)

**Fecha:** 13 de Diciembre de 2025  
**Autor:** GitHub Copilot (Senior FullStack Developer Role)  
**Objetivo:** Implementar soporte multi-organización robusto, seguro y escalable sin romper la funcionalidad existente.

---

## 1. RESUMEN EJECUTIVO

El sistema actual opera bajo un modelo híbrido donde la entidad `Organization` existe, pero la lógica de aplicación asume frecuentemente una relación 1:1 implícita o carece de mecanismos robustos para el cambio de contexto (`Context Switching`). La migración propuesta transformará la aplicación en un sistema **Multi-Tenant Real**, donde un usuario puede pertenecer a múltiples organizaciones con roles distintos, y la interfaz se adapta dinámicamente al contexto de la organización seleccionada (`org_id`), garantizando aislamiento de datos mediante RLS y encriptación.

---

## 2. AUDITORÍA DE ARQUITECTURA ACTUAL

### 2.1. Modelo de Datos (Prisma Schema)
*   **Entidades con `orgId`:** `Case`, `PolicyAnalysis`, `Renewal`, `clients`, `api_keys`, `GeneratedProposal`.
*   **Entidades sin `orgId` explícito:** `Profile` (relación indirecta vía `User`), `Message` (relación indirecta vía `Case`), `Artifact` (relación indirecta vía `Case`).
*   **Relación User-Org:** Existe la tabla `org_members` (Many-to-Many), lo cual es correcto para la forma normal.
*   **Estado:** La base de datos está preparada en un 80% para multi-tenancy, pero faltan índices compuestos y políticas de seguridad en profundidad.

### 2.2. Lógica de Contexto (`getCurrentOrg`)
*   **Implementación Actual:** La función `getCurrentOrg` recupera la *primera* organización encontrada (`organizations[0]`).
*   **Deficiencia Crítica:** No permite seleccionar una organización específica si el usuario pertenece a varias. Esto bloquea la funcionalidad multi-org efectiva.
*   **Riesgo:** Si un usuario es invitado a una segunda organización, el sistema podría seguir mostrándole la primera, o comportarse de manera impredecible.

### 2.3. Seguridad (RLS & Roles)
*   **Estado Actual:** Las políticas RLS en `profiles` son restrictivas (solo el propio usuario). No existen políticas que permitan a un Admin ver los perfiles de sus miembros.
*   **Deficiencia:** Falta de propagación del `org_id` activo hacia la base de datos para que las políticas RLS funcionen dinámicamente.

---

## 3. ANÁLISIS DE BRECHAS (GAP ANALYSIS)

| Característica | Estado Actual | Requerimiento (Meta) | Impacto del Cambio |
| :--- | :--- | :--- | :--- |
| **Selección de Org** | Automática (Primera encontrada) | Explícita (Usuario elige o persiste última sesión) | Alto: Requiere cambios en `getCurrentOrg`, Middleware y UI. |
| **Aislamiento de Datos** | Filtros en Prisma (Software) | RLS en Base de Datos (Hardware) + Prisma | Medio: Requiere migraciones SQL y ajuste de queries. |
| **Roles (RBAC)** | String simple en `org_members` | Sistema de permisos granular | Bajo: Lógica de negocio, no estructural. |
| **Estado Frontend** | Global / Singleton | Scoped por `orgId` | Alto: Zustand debe resetearse al cambiar de Org. |
| **Encriptación** | Pgcrypto en campos específicos | Mantener y extender a nuevos campos sensibles | Bajo: Ya existe la infraestructura. |

---

## 4. PLAN DE MIGRACIÓN (FASES)

Este plan está diseñado para ser **no destructivo**. Se implementarán las bases sin activar la funcionalidad hasta que todo esté listo.

### FASE 1: Infraestructura de Base de Datos y RLS (Cimientos)

**Objetivo:** Asegurar que la base de datos impida fugas de información entre organizaciones, independientemente del código de aplicación.

1.  **Normalización de RLS:**
    *   Crear una función en PostgreSQL `auth.org_id()` que lea una variable de configuración de sesión (ej. `app.current_org_id`).
    *   Actualizar las políticas RLS de todas las tablas sensibles (`cases`, `clients`, `renewals`) para usar esta función:
        ```sql
        USING (org_id = auth.org_id())
        ```
    *   Para tablas sin `org_id` directo (ej. `messages`), usar joins eficientes o desnormalizar `org_id` si el rendimiento lo exige (recomendado para `messages` por volumen).

2.  **Políticas de Perfiles (Cross-Member Access):**
    *   Modificar RLS de `profiles` para permitir lectura si `auth.uid()` y `target_user_id` comparten una organización activa.

### FASE 2: Gestión de Contexto en Backend (El Cerebro)

**Objetivo:** Que el servidor sepa en todo momento en qué organización está operando el usuario.

1.  **Cookie de Sesión de Organización:**
    *   Implementar una cookie segura `briki-org-context` que almacene el `org_id` activo.
    *   Esta cookie debe ser firmada y `HttpOnly`.

2.  **Refactorización de `getCurrentOrg`:**
    *   **Lógica Nueva:**
        1.  Leer cookie `briki-org-context`.
        2.  Si existe, validar que el usuario sigue siendo miembro de esa org.
        3.  Si es válido, retornar esa org.
        4.  Si no existe o no es válido, fallback a la "org por defecto" (la primera o la última usada) y establecer la cookie.
    *   **Impacto:** Esto habilita la persistencia de la sesión de organización.

3.  **Middleware de Contexto (Opcional pero recomendado):**
    *   Inyectar el `org_id` en el contexto de Prisma o en headers para que las queries sepan qué org usar.

### FASE 3: Estado y UI Frontend (La Experiencia)

**Objetivo:** Que la interfaz refleje instantáneamente el cambio de organización y prevenga mezcla de datos.

1.  **Selector de Organización:**
    *   Crear componente UI (Dropdown en Sidebar/Header) que liste las organizaciones del usuario.
    *   Al seleccionar:
        1.  Llamar Server Action `switchOrganization(orgId)`.
        2.  Server Action valida membresía y actualiza cookie.
        3.  Server Action redirige o revalida path.

2.  **Limpieza de Estado (Zustand):**
    *   Implementar un patrón de "Reset" en los stores de Zustand (`useChatStore`, `useCaseStore`).
    *   Al detectar cambio de `orgId` (vía `useEffect` o key en el provider), disparar `store.reset()`.
    *   **Crucial:** Evitar que un chat de la Org A aparezca brevemente al cambiar a la Org B.

3.  **Sincronización Realtime (Supabase):**
    *   Asegurar que las suscripciones a canales de Supabase incluyan el `org_id` en el filtro:
        ```typescript
        supabase.channel(`org:${orgId}:cases`)
        ```

### FASE 4: Verificación y Hardening (QA)

1.  **Tests de Aislamiento:**
    *   Crear usuario "Espía" que pertenece a Org A y Org B.
    *   Verificar que al estar en Org A, las queries de API devuelvan 0 registros de Org B.
    *   Intentar acceder a un recurso de Org B mediante URL directa mientras se está logueado en Org A (debe dar 403/404).

2.  **Auditoría de Roles:**
    *   Verificar que un "Member" no pueda acceder a rutas de "Admin" (ej. configuración de org, facturación).

---

## 5. ANÁLISIS DE RIESGOS Y MITIGACIÓN

*   **Riesgo:** "Zombie Data" en el frontend (datos de la org anterior persisten).
    *   *Mitigación:* Usar `key={orgId}` en el componente raíz del layout de la aplicación (`src/app/[locale]/(app)/layout.tsx`). Esto fuerza a React a desmontar y remontar todo el árbol de componentes de la aplicación al cambiar de organización, garantizando un estado limpio.

*   **Riesgo:** RLS bloqueando inserts legítimos.
    *   *Mitigación:* Asegurar que el `org_id` se pase explícitamente en todos los `create` de Prisma, no confiar en defaults de base de datos para columnas críticas de seguridad.

*   **Riesgo:** Performance en queries RLS complejas.
    *   *Mitigación:* Índices compuestos `[org_id, created_at]` en todas las tablas transaccionales.

---

## 6. CONCLUSIÓN

La arquitectura actual de Briki es sólida pero "monógama" en su comportamiento. La migración a multi-tenancy real es principalmente un ejercicio de **gestión de contexto** y **refuerzo de seguridad**. No requiere reescribir la lógica de negocio de los casos o pólizas, sino "envolverla" en un contexto de organización estricto.

El cambio más significativo será en `getCurrentOrg` y en la introducción de un mecanismo explícito de selección de organización, junto con la limpieza de estado en el cliente.
