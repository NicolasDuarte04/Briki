# Post-Mortem: Corrección de Errores Críticos (12-Ene-2025)

## 1. Resumen del Incidente

El 12 de enero de 2025, se identificaron fallas críticas que impedían la creación de casos y clientes, y la eliminación de casos desde el workspace. Las operaciones fallaban con errores de `PrismaClientValidationError` o de forma silenciosa. Adicionalmente, se detectó un `ChunkLoadError` en la navegación a la página de detalle de casos.

## 2. Análisis de Causa Raíz

### 2.1 Errores de Creación (PrismaClientValidationError)
La investigación determinó que la causa raíz principal fue una **desincronización entre el esquema de la base de datos y el cliente de Prisma generado**. Aunque el archivo `prisma/schema.prisma` fue actualizado para incluir el campo `priority` en la tabla `Case`, el cliente de Prisma en `node_modules` no se había regenerado, por lo que la aplicación en tiempo de ejecución no reconocía este nuevo campo.

### 2.2 ChunkLoadError en Navegación
El error `ChunkLoadError` con archivo `.undefined.js` fue causado por la **importación directa de componentes client-side en un Server Component**. Específicamente, los componentes `PdfUploader` y `AuditTimeline` (marcados con `'use client'`) estaban siendo importados directamente en `src/app/[locale]/(app)/workspace/cases/[id]/page.tsx`, creando un boundary problemático que Next.js no podía resolver durante la generación de chunks.

### 2.3 Eliminación Silenciosa de Casos
El fallo en la eliminación de casos fue identificado como un problema de logging insuficiente que no permitía diagnosticar errores en la lógica de la API o políticas de RLS restrictivas.

## 3. Acciones de Resolución

### 3.1 Sincronización de Prisma
Se ejecutó una limpieza completa de la caché de Prisma (`.prisma`, `.next`) y se forzó la regeneración del cliente con `npx prisma generate`. Esto resolvió inmediatamente los errores de validación en la creación de casos y clientes.

**Comandos ejecutados:**
```bash
rm -rf node_modules/.prisma
rm -rf .next
npx prisma generate
npx prisma validate
```

### 3.2 Resolución del ChunkLoadError
Se implementó **importación dinámica** para los componentes client-side problemáticos, separando correctamente los boundaries entre Server y Client Components:

```typescript
// Antes (problemático)
import { PdfUploader } from '@/components/Upload/PdfUploader';

// Después (correcto)
const PdfUploader = dynamic(() => import('@/components/Upload/PdfUploader').then(mod => ({ default: mod.PdfUploader })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-muted h-32 rounded-lg"></div>
});
```

### 3.3 Instrumentación de API
Se inyectó logging detallado en el endpoint `DELETE /api/cases/delete` para hacer visible cualquier error durante el proceso de eliminación:

- Logs de inicio de petición (`🗑️`)
- Validación de parámetros
- Verificación de existencia del caso
- Confirmación de eliminación exitosa
- Manejo robusto de errores

## 4. Medidas Preventivas

Para evitar la recurrencia de problemas similares, se recomienda:

### 4.1 Prevención de Desincronización de Prisma
* **Integrar `prisma generate` en los scripts del proyecto:** Añadir `prisma generate` al script `postinstall` en `package.json` para asegurar que el cliente siempre esté actualizado después de instalar dependencias.
* **Hooks de Pre-commit:** Implementar un hook de pre-commit (usando `husky`) que ejecute `npx prisma validate` para prevenir commits con un esquema desincronizado.

### 4.2 Prevención de ChunkLoadError
* **Linting personalizado:** Crear reglas ESLint que detecten importaciones directas de componentes client-side en Server Components.
* **Arquitectura clara:** Establecer convenciones claras sobre qué componentes deben ser Server vs Client Components.
* **Documentación:** Mantener documentación actualizada sobre el uso correcto de importaciones dinámicas.

### 4.3 Mejora del Debugging
* **Logging estandarizado:** Implementar un sistema de logging consistente con emojis identificadores para diferentes tipos de operaciones.
* **Monitoreo proactivo:** Configurar alertas para errores comunes como `PrismaClientValidationError` y `ChunkLoadError`.

## 5. Lecciones Aprendidas

1. **La regeneración del cliente Prisma debe ser parte del flujo de desarrollo:** Los cambios en el schema requieren regeneración explícita del cliente.
2. **Los boundaries Server/Client en Next.js 13+ requieren cuidado especial:** Las importaciones dinámicas son esenciales para componentes client-side en Server Components.
3. **El logging detallado es crucial para el debugging:** Los fallos silenciosos son más difíciles de diagnosticar que los errores explícitos.

## 6. Impacto

- **Tiempo de resolución:** ~2 horas
- **Funcionalidades afectadas:** Creación de casos/clientes, eliminación de casos, navegación de detalle
- **Usuarios afectados:** Todos los usuarios del workspace
- **Severidad:** Crítica (funcionalidades core no disponibles)

---

**Documento generado:** 12 de enero de 2025  
**Responsable:** Asistente de Ingeniería FullStack Senior  
**Estado:** Resuelto y documentado
