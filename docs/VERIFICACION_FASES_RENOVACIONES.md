**Guía de Verificación — Renovaciones (Fases 1–7)**

Esta guía resume de forma concisa los cambios implementados en cada fase, el impacto en la aplicación/UX y una guía de pruebas para validación manual. Mantener formato: 1) Resumen breve de cambios (sin código), 2) Impacto en app/UX, 3) Guía de testing.

**Fase 1 — Infraestructura BD**
- **Resumen:** Se añadieron los modelos Prisma `Renewal`, `RenewalHistory` y `RenewalAlert` más enums asociados. Se crearon esquemas Zod y tipos TypeScript para validación y tipado, y se aplicó la migración en Supabase.
- **Impacto en App/UX:** No hay cambios visuales inmediatos; sienta la base para almacenar renovaciones, su historial y alertas.
- **Guía de testing:** Verificar que la migración se aplicó correctamente en la base de datos (tablas y columnas presentes). Confirmar que la generación del cliente Prisma funciona (`prisma generate`) y que no hay errores de importación en build.

**Fase 2 — Endpoints API**
- **Resumen:** Creación de 6 endpoints REST: listar/crear (`/api/renewals`), obtener/actualizar/eliminar por id (`/api/renewals/[id]`), historial (`/api/renewals/[id]/history`), alertas (`/api/renewals/[id]/alerts`), auto-detección (`/api/renewals/detect`) y estadísticas (`/api/renewals/stats`). Se añadieron validaciones Zod y control de errores.
- **Impacto en App/UX:** Permite persistir y recuperar renovaciones desde el backend; habilita operaciones CRUD y mecanismos de detección/estadísticas que usarán futuras vistas.
- **Guía de testing:** Hacer peticiones a cada endpoint con herramientas como `curl` o Postman y verificar respuestas esperadas, códigos HTTP y mensajes de error en casos inválidos. Revisar logs del servidor y ejecutar `pnpm build` para confirmar que las rutas están registradas.

**Fase 3 — Estado global (Zustand)**
- **Resumen:** Se implementaron funciones en `src/lib/fx.ts` que llaman a los endpoints reales, y se añadieron acciones en `src/lib/ui/state.ts`: `fetchRenewals`, `createRenewal`, `updateRenewal`, `deleteRenewal`, `detectRenewals`, `getRenewalStats`, `setRenewalReminder`. Se unificaron transformaciones entre `RenewalFull` (API) y `RenewalRecord` (UI).
- **Impacto en App/UX:** Las operaciones sobre renovaciones dejan de ser mock y persisten en BD; el store central maneja carga, caché y notificaciones.
- **Guía de testing:** Invocar acciones desde la app (o tests unitarios): cargar renovaciones de un `caseId`, crear/actualizar/eliminar una renovación y verificar cambios en la BD y en el estado del store. Revisar mensajes toast y logs de consola añadidos por las acciones.

**Fase 4 — Conexión UI**
- **Resumen:** Se conectó `Renewals.tsx` con el store Zustand; `WorkspaceTabs` carga `fetchRenewals` al cambiar `currentCaseId`. El componente ya consumía selectores (`renewalsLoading`, `renewalsLoaded`, filtros y vistas derivadas) y ahora muestra datos reales.
- **Impacto en App/UX:** Al abrir un caso, el tab Renovaciones carga automáticamente datos reales; skeletons de carga y filtros aplican sobre datos reales.
- **Guía de testing:** Abrir un caso en la UI y validar en DevTools console los logs: `📋 [WorkspaceTabs] Loading renewals for case:` y `📋 [fetchRenewals]`. Verificar que la tabla muestra renovaciones reales o el mensaje vacío si no hay datos. Probar filtros y ordenamientos.

**Fase 5 — Auto-detección UI**
- **Resumen:** Añadido botón `Detectar` en `Renewals.tsx` que invoca `/api/renewals/detect` vía action `detectRenewals`. Se añadieron traducciones y manejo de estado `isDetecting` con spinner y toasts de resultado.
- **Impacto en App/UX:** Los agentes pueden detectar automáticamente renovaciones desde pólizas ya analizadas; UX muestra spinner y notificaciones del resultado.
- **Guía de testing:** En un caso con pólizas analizadas, ir a Renovaciones, pulsar `Detectar`. Observar spinner y toast. Confirmar que nuevas renovaciones aparecen en la tabla y en la BD. Probar escenario sin pólizas analizadas (botón deshabilitado).

**Fase 6 — Integración Comparaciones**
- **Resumen:** Se añadió acción `startRenewalComparison` en el store y un botón `Comparar` en `ActionsGroup` para cada renovación. La acción preselecciona la `policyAnalysisId` asociada (si existe) y navega al tab `comparisons`.
- **Impacto en App/UX:** Desde la fila de una renovación es posible iniciar la comparación semántica de coberturas; el usuario llega al flujo de comparaciones con la póliza preseleccionada.
- **Guía de testing:** En Renovaciones, pulsar `Comparar` en una fila que tenga `policyId`. Verificar navegación al tab Comparaciones, preselección en el store (`selectedAnalysisIds`) y logs `🔄 [startRenewalComparison]`. Probar con renovación sin `policyId` (debería limpiar selección y permitir selección manual).

**Fase 7 — Integración Propuestas**
- **Resumen:** Se añadió acción `generateRenewalProposal` en el store y un botón `Propuesta` en cada fila. Al invocarlo, se preselecciona la póliza (si existe) y se llama al endpoint `generateProposal`, navegando al tab `proposal` y mostrando toasts.
- **Impacto en App/UX:** Permite generar una propuesta comercial desde una renovación con un solo clic; navegación automática al tab Propuesta y feedback visual (spinner, toast).
- **Guía de testing:** En Renovaciones, pulsar `Propuesta` en una fila con `policyId`. Verificar spinner `Generando...`, toast de éxito y navegación al tab `Propuesta`. Confirmar que la propuesta creada aparece en `activeProposal` y que la BD/endpoint `POST /api/proposals/generate` recibe los `analysisIds` esperados.

**Checklist de verificación final (recomendado)**
- Ejecutar `pnpm build` y confirmar que el proyecto compila sin errores.
- Validar que las rutas API listadas en el build incluyen las rutas de renovaciones y propuestas.
- Probar manualmente cada flujo en la UI: listar, crear, actualizar, eliminar, detectar, comparar y generar propuesta.
- Revisar la persistencia en Supabase para renovaciones, historial y alertas.
- Revisar logs de consola que se añadieron en cada acción para facilitar debugging.

Archivo creado: [docs/VERIFICACION_FASES_RENOVACIONES.md](docs/VERIFICACION_FASES_RENOVACIONES.md)
