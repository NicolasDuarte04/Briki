# ANÁLISIS DE IMPLICACIONES: NO APLICAR FASE 3 (POLÍTICAS DE STORAGE)

**Fecha**: 2 de Febrero, 2025  
**Estado**: ⚠️ **RIESGO DE SEGURIDAD CRÍTICO**  
**Prioridad**: 🔴 **ALTA**

---

## 📊 ESTADO ACTUAL DE LAS POLÍTICAS DE STORAGE

### Políticas Actuales (Migración `20250127_fix_storage_buckets_and_policies.sql`)

**Buckets configurados**:
- `artifacts`: `public = true` (público)
- `proposals`: `public = true` (público)
- `temp-processing`: `public = true` (público)

**Políticas de acceso actuales**:

#### Bucket `artifacts`:
1. **SELECT (Lectura)**: 
   ```sql
   CREATE POLICY "public_artifacts_select" 
   ON storage.objects FOR SELECT 
   USING (bucket_id = 'artifacts');
   ```
   - ⚠️ **CRÍTICO**: Acceso público - CUALQUIERA puede leer archivos (incluso sin autenticación)

2. **INSERT (Subida)**:
   ```sql
   CREATE POLICY "authenticated_users_can_upload_artifacts" 
   ON storage.objects FOR INSERT 
   WITH CHECK (
       bucket_id = 'artifacts' AND
       auth.role() = 'authenticated'
   );
   ```
   - ⚠️ **ALTO**: Cualquier usuario autenticado puede subir archivos (no valida `org_id`)

3. **UPDATE (Actualización)**:
   ```sql
   CREATE POLICY "authenticated_users_can_update_artifacts" 
   ON storage.objects FOR UPDATE 
   USING (
       bucket_id = 'artifacts' AND
       auth.role() = 'authenticated'
   );
   ```
   - ⚠️ **ALTO**: Cualquier usuario autenticado puede modificar archivos de cualquier organización

4. **DELETE (Eliminación)**:
   ```sql
   CREATE POLICY "authenticated_users_can_delete_artifacts" 
   ON storage.objects FOR DELETE 
   USING (
       bucket_id = 'artifacts' AND
       auth.role() = 'authenticated'
   );
   ```
   - ⚠️ **CRÍTICO**: Cualquier usuario autenticado puede eliminar archivos de cualquier organización

#### Bucket `proposals`:
- Mismas políticas que `artifacts` (mismos riesgos)

---

## 🚨 IMPLICACIONES Y RIESGOS DE SEGURIDAD

### Riesgo Crítico 1: Acceso Público a Archivos (SELECT)

**Problema**:
- Los buckets están configurados como `public = true`
- La política `public_artifacts_select` permite que **CUALQUIERA** (incluso sin autenticación) pueda leer archivos
- Solo requiere saber la URL del archivo

**Impacto**:
- 🔴 **CRÍTICO**: Violación de privacidad de datos
- 🔴 **CRÍTICO**: Exposición de información confidencial de clientes
- 🔴 **CRÍTICO**: Violación de GDPR/LOPD si aplica
- 🔴 **CRÍTICO**: Riesgo legal y de cumplimiento normativo

**Escenario de ataque**:
```
1. Atacante obtiene URL de archivo (por ejemplo, de logs, referrer, etc.)
2. Atacante accede directamente a: https://[project].supabase.co/storage/v1/object/public/artifacts/[orgId]/[caseId]/[file]
3. Archivo descargado sin autenticación
```

**Ejemplo real**:
- Si un usuario comparte un enlace a un PDF en un email o chat
- Cualquiera con ese enlace puede acceder al archivo
- No hay validación de pertenencia a la organización

---

### Riesgo Crítico 2: Acceso Cruzado entre Organizaciones (INSERT/UPDATE/DELETE)

**Problema**:
- Las políticas solo verifican `auth.role() = 'authenticated'`
- **NO** validan que el usuario pertenezca a la organización del archivo
- Un usuario de Org A puede modificar/eliminar archivos de Org B

**Impacto**:
- 🔴 **CRÍTICO**: Violación de integridad de datos
- 🔴 **CRÍTICO**: Pérdida de datos (eliminación no autorizada)
- 🔴 **CRÍTICO**: Modificación no autorizada de documentos
- 🟠 **ALTO**: Violación de multi-tenancy (aislamiento de datos)

**Escenario de ataque**:
```
1. Usuario de Org A (usuario@orga.com) se autentica
2. Usuario conoce el path de un archivo de Org B: `{orgB_id}/{caseId}/documento.pdf`
3. Usuario puede:
   - Modificar el archivo (UPDATE)
   - Eliminar el archivo (DELETE)
   - Subir archivos en nombre de Org B (INSERT)
```

**Ejemplo real**:
- Usuario malicioso o con acceso legítimo a múltiples organizaciones
- Puede acceder a archivos de organizaciones a las que no pertenece
- Puede eliminar o modificar documentos críticos

---

### Riesgo Alto 3: Falta de Auditoría y Trazabilidad

**Problema**:
- Sin políticas que validen `org_id`, no hay forma de rastrear:
  - Qué organización accedió a qué archivo
  - Si un acceso fue autorizado o no
  - Quién modificó/eliminó archivos de qué organización

**Impacto**:
- 🟠 **ALTO**: Imposible cumplir con requisitos de auditoría
- 🟠 **ALTO**: Dificultad para investigar incidentes de seguridad
- 🟡 **MEDIO**: No se puede demostrar cumplimiento normativo

---

### Riesgo Medio 4: Escalabilidad y Mantenimiento

**Problema**:
- Las políticas actuales no escalan bien con múltiples organizaciones
- No hay forma de implementar permisos granulares por organización
- Dificulta implementar features como:
  - Compartir archivos entre organizaciones específicas
  - Permisos por rol dentro de la organización
  - Expiración de acceso temporal

**Impacto**:
- 🟡 **MEDIO**: Limitaciones para crecimiento del producto
- 🟡 **MEDIO**: Dificultad para implementar features avanzadas

---

## ✅ MITIGACIONES ACTUALES EN EL CÓDIGO

### Mitigación 1: Validación en API Routes

**Archivos**:
- `src/app/api/upload/pdf/route.ts` (líneas 152-180)
- `src/app/api/cases/create/route.ts`
- `src/app/api/cases/update/route.ts`

**Qué hace**:
- Valida que el usuario pertenezca a la organización antes de operaciones
- Verifica membresía en `org_members` antes de crear/actualizar casos

**Limitación**:
- ⚠️ Solo protege operaciones a través de la API
- ⚠️ **NO** protege acceso directo a Storage (URLs públicas)
- ⚠️ Si alguien obtiene la URL del archivo, puede acceder directamente

**Ejemplo**:
```typescript
// ✅ Esto está protegido (a través de API)
const response = await fetch('/api/upload/pdf', { ... });

// ❌ Esto NO está protegido (acceso directo)
const url = `https://[project].supabase.co/storage/v1/object/public/artifacts/${orgId}/${caseId}/file.pdf`;
const response = await fetch(url); // ✅ Funciona sin autenticación
```

---

### Mitigación 2: Path-based Organization Structure

**Qué hace**:
- Los archivos se organizan por path: `{orgId}/{caseId}/{filename}`
- El código valida que el path contenga el `orgId` correcto

**Limitación**:
- ⚠️ Solo funciona si el código siempre valida el path
- ⚠️ **NO** previene acceso directo si se conoce la URL
- ⚠️ Si un archivo se mueve o renombra, la validación puede fallar

---

## 🔧 ALTERNATIVAS Y SOLUCIONES

### Opción 1: Aplicar FASE 3 desde Supabase Dashboard (RECOMENDADO)

**Ventajas**:
- ✅ Solución completa y correcta
- ✅ Implementa validación por `org_id` en metadata
- ✅ Protege acceso directo a Storage
- ✅ Cumple con requisitos del Día 2

**Desventajas**:
- ⚠️ Requiere permisos de administrador
- ⚠️ No se puede aplicar desde terminal

**Pasos**:
1. Abrir Supabase Dashboard
2. Ir a SQL Editor
3. Copiar contenido de `supabase/migrations/20250202_storage_policies_org_metadata.sql`
4. Ejecutar el script
5. Verificar que las políticas se crearon correctamente

**Nota**: Si no tienes permisos, contactar a Supabase Support para que ejecuten la migración.

---

### Opción 2: Políticas Híbridas (Path + Metadata) - TEMPORAL

**Estrategia**:
- Mantener políticas basadas en path para archivos existentes
- Agregar validación de metadata para archivos nuevos
- Migrar gradualmente archivos existentes

**Código de política híbrida**:
```sql
CREATE POLICY "artifacts_hybrid_select" 
ON storage.objects FOR SELECT 
USING (
    bucket_id = 'artifacts' AND
    auth.role() = 'authenticated' AND
    (
        -- Validar por metadata (archivos nuevos)
        (metadata->>'org_id')::uuid IN (
            SELECT org_id FROM public.org_members 
            WHERE user_id = auth.uid()
        )
        OR
        -- Validar por path (archivos existentes - compatibilidad)
        (split_part(name, '/', 1) IN (
            SELECT org_id::text FROM public.org_members 
            WHERE user_id = auth.uid()
        ))
    )
);
```

**Ventajas**:
- ✅ Compatible con archivos existentes
- ✅ Protege archivos nuevos con metadata
- ✅ No rompe funcionalidad existente

**Desventajas**:
- ⚠️ Más complejo de mantener
- ⚠️ No es la solución ideal (solo temporal)
- ⚠️ Archivos existentes siguen siendo vulnerables hasta migración

---

### Opción 3: Validación en Middleware/API Gateway

**Estrategia**:
- Crear middleware que valide acceso antes de servir archivos
- Interceptar todas las peticiones a Storage
- Validar membresía antes de permitir acceso

**Implementación**:
```typescript
// src/middleware.ts o src/app/api/storage/[...path]/route.ts
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Extraer orgId del path
  const path = request.nextUrl.pathname;
  const orgId = path.split('/')[3]; // artifacts/{orgId}/...
  
  // Validar membresía
  const { data: membership } = await supabase
    .from('org_members')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single();
  
  if (!membership) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Proxear request a Supabase Storage
  const storageUrl = `https://[project].supabase.co/storage/v1/object/public${path}`;
  const response = await fetch(storageUrl);
  return response;
}
```

**Ventajas**:
- ✅ Control total sobre validación
- ✅ No requiere permisos de administrador en Supabase
- ✅ Puede agregar logging y auditoría

**Desventajas**:
- ⚠️ Requiere cambiar todas las URLs de Storage en el frontend
- ⚠️ Añade latencia (proxy)
- ⚠️ Más complejo de mantener
- ⚠️ No protege si alguien accede directamente a Supabase Storage

---

### Opción 4: Buckets Privados con Signed URLs

**Estrategia**:
- Cambiar buckets a `public = false`
- Generar URLs firmadas (signed URLs) con expiración
- Validar acceso antes de generar URL

**Implementación**:
```typescript
// Generar URL firmada solo si usuario tiene acceso
const { data, error } = await supabase.storage
  .from('artifacts')
  .createSignedUrl(storagePath, 3600); // Expira en 1 hora

// Validar membresía antes de generar URL
const { data: membership } = await supabase
  .from('org_members')
  .select('*')
  .eq('org_id', orgId)
  .eq('user_id', user.id)
  .single();

if (!membership) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**Ventajas**:
- ✅ URLs temporales (expiran)
- ✅ Control total sobre acceso
- ✅ No requiere políticas complejas

**Desventajas**:
- ⚠️ Requiere cambiar toda la lógica de acceso a archivos
- ⚠️ URLs no son permanentes (puede romper funcionalidad existente)
- ⚠️ Más complejo de implementar

---

## 📋 QUÉ DEBERÍA CONSIDERARSE

### Consideración 1: Prioridad de Seguridad

**Pregunta**: ¿Qué tan crítico es proteger los archivos?

**Si es crítico** (datos confidenciales, clientes, cumplimiento normativo):
- ✅ **DEBE** aplicar FASE 3 (contactar Supabase Support si es necesario)
- ✅ No es opcional, es un requisito de seguridad

**Si no es crítico** (datos públicos, desarrollo, pruebas):
- ⚠️ Puede posponer, pero debe documentar el riesgo
- ⚠️ Considerar aplicar cuando se mueva a producción

---

### Consideración 2: Estado del Proyecto

**Si está en desarrollo/pruebas**:
- ⚠️ Puede usar mitigaciones temporales
- ⚠️ Debe planificar aplicar FASE 3 antes de producción

**Si está en producción**:
- 🔴 **CRÍTICO**: Debe aplicar FASE 3 inmediatamente
- 🔴 Considerar pausar nuevas subidas hasta aplicar políticas
- 🔴 Auditar accesos recientes por si hubo violaciones

---

### Consideración 3: Volumen de Archivos Existentes

**Si hay muchos archivos existentes**:
- ⚠️ Debe aplicar script de migración de metadata (Paso 4.5)
- ⚠️ O usar políticas híbridas (Opción 2) temporalmente

**Si hay pocos archivos o es nuevo**:
- ✅ Puede aplicar FASE 3 directamente
- ✅ Archivos nuevos ya tienen metadata (FASE 4 implementada)

---

### Consideración 4: Capacidad de Aplicar FASE 3

**Si puedes aplicar desde Dashboard**:
- ✅ Aplicar FASE 3 inmediatamente
- ✅ Es la solución correcta y completa

**Si no puedes aplicar (sin permisos)**:
- ⚠️ Contactar Supabase Support
- ⚠️ Mientras tanto, usar Opción 2 (políticas híbridas) o Opción 3 (middleware)
- ⚠️ Documentar que es una solución temporal

---

## 🎯 RECOMENDACIÓN FINAL

### Escenario 1: Proyecto en Producción con Datos Confidenciales

**Acción**: 🔴 **CRÍTICO - APLICAR FASE 3 INMEDIATAMENTE**

1. Contactar Supabase Support para aplicar migración
2. Mientras tanto, implementar Opción 3 (middleware) como mitigación temporal
3. Auditar accesos recientes
4. Aplicar FASE 3 tan pronto como sea posible

---

### Escenario 2: Proyecto en Desarrollo/Pruebas

**Acción**: 🟠 **ALTA - PLANIFICAR APLICACIÓN DE FASE 3**

1. Documentar el riesgo actual
2. Planificar aplicación de FASE 3 antes de producción
3. Usar Opción 2 (políticas híbridas) si hay archivos existentes
4. Aplicar FASE 3 antes de lanzar a producción

---

### Escenario 3: Proyecto Nuevo sin Archivos Existentes

**Acción**: ✅ **APLICAR FASE 3 AHORA**

1. Aplicar FASE 3 desde Dashboard (o contactar Support)
2. No hay archivos existentes que migrar
3. Archivos nuevos ya tienen metadata (FASE 4 implementada)
4. Solución completa y correcta

---

## 📝 CHECKLIST DE ACCIONES

- [ ] Evaluar criticidad de datos almacenados
- [ ] Determinar si proyecto está en producción
- [ ] Contar archivos existentes en Storage
- [ ] Intentar aplicar FASE 3 desde Dashboard
- [ ] Si no es posible, contactar Supabase Support
- [ ] Implementar mitigación temporal si es necesario
- [ ] Documentar decisiones y riesgos
- [ ] Planificar aplicación de FASE 3
- [ ] Auditar accesos recientes (si en producción)
- [ ] Aplicar FASE 3 tan pronto como sea posible

---

## 🔗 REFERENCIAS

- **Migración FASE 3**: `supabase/migrations/20250202_storage_policies_org_metadata.sql`
- **Plan de Integración**: `docs/PLAN_INTEGRACION_DIA2_QUIRURGICO.md`
- **Documentación Supabase Storage Policies**: https://supabase.com/docs/guides/storage/security/access-control

---

**Última actualización**: 2 de Febrero, 2025  
**Estado**: ⚠️ **REQUIERE ACCIÓN INMEDIATA** (dependiendo del escenario)

