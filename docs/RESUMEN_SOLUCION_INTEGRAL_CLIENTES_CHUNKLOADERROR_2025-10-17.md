# Documentación de Solución Integral: Asociación de Clientes y ChunkLoadError (Briki)

## 1. Arquitectura y Decisiones Técnicas

- **Frontend:** Next.js 13+, React, Zustand para estado global, shadcn/ui para UI, manejo de errores con ErrorBoundary.
- **Backend:** API routes Next.js, Supabase Auth, Prisma/PostgreSQL, cifrado PII, RLS por organización.
- **Middleware:** next-intl para internacionalización, SSR y Edge Runtime compatible, matcher robusto para rutas.

## 2. Endpoints y Flujos Clave

- `/api/clients/list`: Devuelve clientes asociados al usuario/organización actual, seguro por sesión y RLS.
- **BriefForm:** Combobox consume `/api/clients/list`, permite seleccionar cliente existente o crear uno nuevo.
- **handleApprovalRequest:** Centraliza validación/creación de cliente y asociación al caso, usado por los 3 botones de aprobación.

## 3. Estado Global y Persistencia

- Zustand mantiene referencia a cliente y caso activo.
- Al crear cliente, solo se guarda el nombre cifrado y se asocia a la organización.
- El caso guarda referencia por ID al cliente.

## 4. Seguridad y Auditoría

- Todas las operaciones respetan RLS y cifrado PII.
- Auditoría en tabla `audit_log` para acciones críticas.
- Autenticación unificada con Supabase Auth.

## 5. Manejo de ChunkLoadError

- ErrorBoundary en `layout.tsx` detecta ChunkLoadError y muestra mensaje amigable para refrescar.
- Matcher en `middleware.ts` excluye rutas estáticas, imágenes, favicon y API para evitar errores de carga.
- Validar despliegue y configuración de rutas en `next.config.ts`.

## 6. Flujo de Trabajo para el Desarrollador

1. Al abrir BriefForm, cargar clientes y mostrar en Combobox.
2. Al enviar, validar cliente; si no existe, ofrecer crearlo.
3. Los 3 botones de aprobación usan la misma función centralizada.
4. Guardar caso con referencia al cliente y avanzar en el flujo.
5. Robustecer frontend contra ChunkLoadError y documentar despliegue.
6. Mantener seguridad y cifrado en todas las operaciones.

## 7. Referencias de Código

- `/src/components/Cases/BriefForm.tsx`: Combobox y lógica de selección/creación de cliente.
- `/src/components/Chat/ConversationPane.tsx`: handleApprovalRequest y flujo de aprobación.
- `/src/app/api/clients/list/route.ts`: Endpoint seguro para clientes.
- `/src/middleware.ts`: Matcher robusto para rutas.
- `/src/app/[locale]/layout.tsx`: ErrorBoundary para ChunkLoadError.
- `/src/lib/types.ts`: Tipos extendidos para CaseBrief y cliente.

## 8. Recomendaciones de Transferencia

- Leer el plan en `/docs/PLAN_SOLUCION_INTEGRAL_CLIENTES_CHUNKLOADERROR_2025-10-17.txt` para contexto completo.
- Revisar los archivos referenciados para entender la implementación.
- Validar que no existan errores de compilación tras cada cambio.
- Mantener la documentación actualizada tras cada fase.

---

Este documento resume la solución integral y el flujo de trabajo implementado. Cualquier desarrollador puede continuar el proyecto siguiendo estos pasos y referencias. Para dudas o ampliaciones, consultar el plan detallado en la carpeta `docs`.
