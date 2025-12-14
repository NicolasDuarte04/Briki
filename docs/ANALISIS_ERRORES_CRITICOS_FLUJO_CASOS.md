# Análisis Exhaustivo: Errores Críticos en Flujo de Creación de Casos

**Fecha**: 11 de Diciembre de 2025  
**Estado**: Análisis Completo - Pendiente de Implementación  
**Prioridad**: 🔴 CRÍTICA

---

## 📋 Resumen Ejecutivo

Se han identificado **3 errores críticos** en el flujo de creación/aprobación de casos que afectan la experiencia de usuario y la integridad de datos:

1. **Botones de aprobación reaparecen** momentáneamente tras aprobar caso
2. **Error 500 en compliance records** al intentar cargar registros inexistentes
3. **Error SQL de type casting** en detección de artifacts duplicados

---

## 🔴 ERROR #1: Botones de Aprobación Reaparecen

### Descripción del Problema

Los botones "Aprobar", "Aprobar y continuar análisis" y "Buscar Planes" deben **DESAPARECER PERMANENTEMENTE** cuando se aprueba un caso. Sin embargo, actualmente:

1. Se ocultan correctamente al iniciar aprobación
2. **Reaparecen momentáneamente** después de aprobar
3. Se vuelven a ocultar tras la redirección

**Comportamiento esperado**: Los botones deben desaparecer AL MOMENTO de cerrar el formulario y NUNCA reaparecer.

### Análisis Técnico

#### Archivos Involucrados

```
src/lib/ui/state.ts                       # Estado global de aprobación
src/components/Chat/ConversationPane.tsx  # Botones principales
src/components/Chat/MessageAgent.tsx      # Botones en mensajes del agente
src/components/Cases/BriefForm.tsx        # Botón "Buscar Planes"
```

#### Flujo Actual (PROBLEMÁTICO)

```typescript
// 1. Usuario presiona "Aprobar" → ConversationPane.tsx:789
useUI.setState({ caseResolvingClient: true, caseApproving: true });

// 2. Se crea el caso → createCaseIfNeeded()
const caseId = await createCaseIfNeeded(...);

// 3. Se aprueba el caso → approveCurrentCase()
const success = await approveCurrentCase(clientId);

// 4. Se establece caseApproved = true
useUI.getState().setCaseApproved(true);

// 5. Se persiste en localStorage
persistState();

// 6. Se navega a la nueva URL
router.push(`/${locale}/agent/${finalCaseId}`);

// 7. ❌ PROBLEMA: Durante la navegación hay un re-render
// 8. WorkspaceTabs.tsx detecta caseId válido y carga datos de BD
// 9. Al cargar datos, se ejecuta:
set({ caseApproved: false }); // ← ❌ ESTO RESETEA caseApproved

// 10. shouldShowApprovalButtons() retorna TRUE momentáneamente
// 11. Los botones REAPARECEN
// 12. Luego se detecta que status='active' y se vuelve a establecer TRUE
```

#### Causa Raíz

**Archivo**: `src/components/Workspace/WorkspaceTabs.tsx` (líneas ~500-600)

```typescript
// ❌ PROBLEMA: Este código resetea caseApproved a FALSE al cargar datos
const loadCaseData = async (caseId: string) => {
  const caseData = await fetch(`/api/cases/${caseId}`).then(r => r.json());
  
  // ❌ AQUÍ: Se resetea caseApproved sin verificar si ya estaba aprobado
  useUI.setState({
    activeCaseData: caseData,
    caseApproved: false, // ← ❌ ERROR CRÍTICO
    caseApproving: false
  });
  
  // Luego se verifica status y se corrige (pero ya hubo un flash)
  if (caseData.status === 'active') {
    useUI.setState({ caseApproved: true });
  }
};
```

#### Lógica de Visibilidad Actual

**Archivo**: `src/lib/ui/state.ts` (líneas 600-650)

```typescript
// ✅ Función que decide si mostrar botones
shouldShowApprovalButtons: () => {
  const { approvalPhase, brief, currentCaseId, caseApproved } = get();
  
  // REGLA 1: No mostrar si approvalPhase === 'completed'
  if (approvalPhase === 'completed') return false;
  
  // REGLA 2: No mostrar si caseApproved === true
  if (caseApproved) return false; // ← ✅ ESTO FUNCIONA
  
  // REGLA 3: No mostrar si no hay insurance_category
  if (!brief?.insurance_category) return false;
  
  // REGLA 4: Mostrar solo en new-thread-placeholder o casos draft
  return currentCaseId === 'new-thread-placeholder' || 
         (currentCaseId && !caseApproved);
};
```

**El problema**: La lógica es correcta, pero `caseApproved` se resetea momentáneamente en WorkspaceTabs.tsx.

### Impacto

- ❌ **UX degradada**: Usuario ve "flickering" de botones
- ❌ **Confusión**: Puede intentar presionar botones de nuevo
- ❌ **Inconsistencia**: Estado global no es "single source of truth"

### Solución Propuesta

#### Opción A: No Resetear caseApproved en WorkspaceTabs (RECOMENDADA)

**Cambios**:
1. En `WorkspaceTabs.tsx`, **preservar** `caseApproved` si ya está en `true`
2. Solo establecer `caseApproved = true` si `status === 'active'`
3. NUNCA establecer `caseApproved = false` para casos con `caseId` válido

```typescript
// ✅ SOLUCIÓN en WorkspaceTabs.tsx
const loadCaseData = async (caseId: string) => {
  const caseData = await fetch(`/api/cases/${caseId}`).then(r => r.json());
  
  // ✅ NUEVO: Preservar caseApproved si ya está en true
  const currentCaseApproved = useUI.getState().caseApproved;
  const shouldPreserveCaseApproved = currentCaseApproved === true;
  
  useUI.setState({
    activeCaseData: caseData,
    // ✅ NO resetear a false si ya está aprobado
    caseApproved: shouldPreserveCaseApproved 
      ? true 
      : (caseData.status === 'active'),
    caseApproving: false
  });
};
```

**Ventajas**:
- ✅ Minimal change - solo afecta WorkspaceTabs
- ✅ Preserva "single source of truth" de caseApproved
- ✅ No hay flickering

**Desventajas**:
- Ninguna

#### Opción B: Usar approvalPhase en lugar de caseApproved

**Cambios**:
1. Eliminar uso de `caseApproved` completamente
2. Usar solo `approvalPhase`: 'pending' | 'processing' | 'completed'
3. Actualizar todas las condiciones para usar `approvalPhase`

**Ventajas**:
- ✅ Estado más semántico
- ✅ Menos flags booleanos

**Desventajas**:
- ❌ Requiere cambios en 8+ archivos
- ❌ Mayor riesgo de romper funcionalidades
- ❌ Más testing necesario

### Archivos a Modificar (Opción A - Recomendada)

```
src/components/Workspace/WorkspaceTabs.tsx  # Cambio CRÍTICO
```

**Total**: 1 archivo, ~10 líneas modificadas

---

## 🔴 ERROR #2: Compliance Record 500

### Descripción del Problema

Al aprobar un caso nuevo, se intenta cargar un `complianceRecord` que aún no existe en BD, resultando en un error 500:

```
Failed to load compliance record: 500
GET /api/compliance/records/62aa7a02-76db-4c15-ae80-ca49c3f2c24c 500
Error at state.ts:1328
```

**Comportamiento esperado**: Retornar `null` sin error cuando no existe registro (como hace el endpoint para 404).

### Análisis Técnico

#### Archivos Involucrados

```
src/lib/ui/state.ts                                          # Llamada a loadComplianceRecord
src/app/api/compliance/records/[caseId]/route.ts            # Endpoint GET
src/components/Workspace/WorkspaceTabs.tsx                  # Trigger de loadComplianceRecord
```

#### Flujo Actual (PROBLEMÁTICO)

```typescript
// 1. Usuario aprueba caso → caseId = "62aa7a02-76db-4c15-ae80-ca49c3f2c24c"

// 2. WorkspaceTabs detecta cambio de caseId
useEffect(() => {
  if (currentCaseId && currentCaseId !== 'new-thread-placeholder') {
    loadComplianceRecord(currentCaseId); // ← Llamada automática
  }
}, [currentCaseId]);

// 3. loadComplianceRecord hace fetch
const response = await fetch(`/api/compliance/records/${caseId}`);

// 4. Endpoint busca en BD
const record = await prisma.complianceRecord.findFirst({
  where: { caseId: caseId },
  orderBy: { createdAt: 'desc' },
  take: 1
});

// 5. ❌ PROBLEMA: record es NULL (caso nuevo sin compliance aún)
if (!record) {
  return NextResponse.json(null); // ← ✅ Esto retorna 200 con null
}

// 6. ❌ PERO: En algunos casos puede fallar ANTES con 500
// Posibles causas:
// - Error en query de org_members
// - Error en query de case
// - Timeouts de BD
```

#### Causa Raíz

**Archivo**: `src/app/api/compliance/records/[caseId]/route.ts` (líneas 1-60)

```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ caseId: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { caseId } = await params;

    if (!caseId) {
      return new NextResponse("Case ID required", { status: 400 });
    }

    // 1. Get user's org
    const membership = await prisma.org_members.findFirst({
      where: { user_id: user.id },
      select: { org_id: true },
    });

    if (!membership) {
      return new NextResponse("Organization not found", { status: 403 });
    }

    // 2. Verify case access
    const caseItem = await prisma.case.findUnique({
      where: { id: caseId },
      select: { orgId: true },
    });

    if (!caseItem || caseItem.orgId !== membership.org_id) {
      return new NextResponse("Case not found or access denied", { status: 404 });
    }

    // 3. Get latest compliance record
    const record = await prisma.complianceRecord.findFirst({
      where: { caseId: caseId },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (!record) {
      // ✅ Esto retorna 200 con null
      return NextResponse.json(null);
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("[COMPLIANCE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 }); // ← ❌ AQUÍ
  }
}
```

**Posibles causas del 500**:
1. Query a `org_members` falla (user_id no encontrado, timeout)
2. Query a `case` falla (caseId inválido, timeout)
3. Query a `complianceRecord` falla (error de sintaxis, timeout)
4. Error de Prisma (conexión, schema mismatch)

**Observación de logs**: 
```
[API/cases/create] ... (todo exitoso hasta aquí)
✅ [API] Artifact created successfully
✅ [moveTempToPersistent] Movimiento completado
```

El caso SE CREA correctamente, por lo que:
- `caseId` es válido
- `orgId` es válido
- Usuario tiene permisos

**Conclusión**: El error 500 ocurre porque:
1. La query a `complianceRecord.findFirst` puede estar lanzando una excepción inesperada
2. O hay un race condition donde el `case` aún no está completamente persistido cuando se hace el GET

### Impacto

- ❌ **Logs contaminados**: Error aparece aunque es comportamiento normal
- ⚠️ **UX**: Usuario puede ver error en DevTools (aunque no afecta funcionalidad)
- ❌ **Monitoreo**: Alertas falsas de errores 500

### Solución Propuesta

#### Opción A: Manejo Silencioso de Null (RECOMENDADA)

**Cambios**:
1. En `state.ts`, **NO lanzar error** si response es 500 pero es un caso nuevo
2. Verificar que el `caseId` existe antes de intentar cargar compliance
3. Agregar retry logic con exponential backoff

```typescript
// ✅ SOLUCIÓN en state.ts
loadComplianceRecord: async (caseId: string) => {
  if (!caseId || caseId === 'new-thread-placeholder') {
    return;
  }
  
  set({ complianceLoading: true });
  
  try {
    const response = await fetch(`/api/compliance/records/${caseId}`);
    
    // ✅ NUEVO: Manejar 500 para casos nuevos
    if (response.status === 500) {
      // Verificar si es un caso recién creado
      const caseResponse = await fetch(`/api/cases/${caseId}`);
      if (caseResponse.ok) {
        const caseData = await caseResponse.json();
        const isNewCase = Date.now() - new Date(caseData.createdAt).getTime() < 5000;
        
        if (isNewCase) {
          // Caso nuevo, es normal que no tenga compliance
          console.log('ℹ️ [loadComplianceRecord] New case, compliance will be created later');
          set({ activeComplianceRecord: null, complianceLoading: false });
          return;
        }
      }
      
      // Si no es caso nuevo, sí es un error real
      throw new Error(`Failed to load compliance record: 500`);
    }
    
    if (response.status === 404 || response.status === 200) {
      const record = await response.json();
      set({ 
        activeComplianceRecord: record, 
        complianceLoading: false 
      });
      return;
    }
    
    throw new Error(`Failed to load compliance record: ${response.status}`);
  } catch (error) {
    console.error('[loadComplianceRecord] Error:', error);
    // No mostrar toast para casos nuevos
    set({ activeComplianceRecord: null, complianceLoading: false });
  }
};
```

#### Opción B: Lazy Loading de Compliance (MEJOR)

**Cambios**:
1. **NO** cargar compliance automáticamente al cargar caso
2. Solo cargar cuando usuario ABRE el tab de Compliance
3. Crear compliance record al momento de primer uso

```typescript
// ✅ SOLUCIÓN en WorkspaceTabs.tsx
// Remover llamada automática
useEffect(() => {
  if (currentCaseId && currentCaseId !== 'new-thread-placeholder') {
    // loadComplianceRecord(currentCaseId); // ← ❌ ELIMINAR
    fetchPolicyAnalyses(currentCaseId);
    fetchRenewals(currentCaseId);
  }
}, [currentCaseId]);

// ✅ AGREGAR: Cargar solo cuando tab está activo
useEffect(() => {
  if (activeTab === 'compliance' && currentCaseId) {
    loadComplianceRecord(currentCaseId);
  }
}, [activeTab, currentCaseId]);
```

**Ventajas**:
- ✅ No hay llamadas innecesarias
- ✅ Mejor performance (menos queries)
- ✅ No hay errores 500 para casos nuevos

**Desventajas**:
- ⚠️ Primera carga del tab será más lenta (pero aceptable)

### Archivos a Modificar (Opción B - Recomendada)

```
src/components/Workspace/WorkspaceTabs.tsx  # Remover llamada automática
src/lib/ui/state.ts                          # Mejorar error handling
```

**Total**: 2 archivos, ~20 líneas modificadas

---

## 🔴 ERROR #3: SQL Type Casting en findDuplicateArtifact

### Descripción del Problema

Durante la creación de artifacts, la función `findDuplicateArtifact` lanza un error SQL de type casting:

```sql
ERROR: operator does not exist: uuid <> text
HINT: No operator matches the given name and argument types. 
      You might need to add explicit type casts.
```

```
at findDuplicateArtifact (src/lib/storage/findDuplicateArtifact.ts:70:21)
at POST (src/app/api/cases/create/route.ts:311:35)
```

**Comportamiento esperado**: La query debe ejecutarse sin errores SQL y detectar correctamente artifacts duplicados.

### Análisis Técnico

#### Archivos Involucrados

```
src/lib/storage/findDuplicateArtifact.ts    # Función con error
src/app/api/cases/create/route.ts           # Llamada a findDuplicateArtifact
prisma/schema.prisma                         # Esquema de artifacts
```

#### Causa Raíz

**Archivo**: `src/lib/storage/findDuplicateArtifact.ts` (líneas 50-70)

```typescript
export async function findDuplicateArtifact(
  fileHash: string,
  excludeCaseId?: string
): Promise<FindDuplicateResult> {
  try {
    let query = `
      SELECT 
        id,
        case_id as "caseId",
        file_id as "fileId",
        file_name as "fileName",
        created_at as "createdAt"
      FROM public.artifacts
      WHERE provenance->>'fileHash' = $1
    `;
    
    const params: any[] = [fileHash];
    
    // ❌ PROBLEMA: excludeCaseId es un string UUID
    if (excludeCaseId) {
      query += ` AND case_id != $2`; // ← ❌ AQUÍ: case_id es UUID, $2 es text
      params.push(excludeCaseId);      // ← ❌ String sin cast
    }
    
    query += ` ORDER BY created_at ASC LIMIT 1`;
    
    const results = await prisma.$queryRawUnsafe<Array<{
      id: string;
      caseId: string;
      fileId: string | null;
      fileName: string | null;
      createdAt: Date;
    }>>(query, ...params);
    
    // ...
  } catch (error: any) {
    console.error('❌ [findDuplicateArtifact] Error buscando duplicado:', error);
    return { exists: false }; // ← ✅ No bloquea upload, pero NO detecta duplicados
  }
}
```

**Diagnóstico**:

1. **Columna en BD**: `case_id UUID NOT NULL`
2. **Parámetro**: `excludeCaseId: string` (UUID como string de TypeScript)
3. **Operador SQL**: `!=` espera que ambos lados sean del mismo tipo
4. **PostgreSQL**: No puede comparar `UUID != TEXT` sin cast explícito

**Esquema de BD** (prisma/schema.prisma):

```prisma
model artifact {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  case_id        String   @db.Uuid  // ← Tipo UUID
  // ...
}
```

### Impacto

- ❌ **Detección de duplicados falla**: Archivos duplicados NO se detectan
- ❌ **Storage desperdiciado**: Mismos PDFs subidos múltiples veces
- ❌ **Logs contaminados**: Errores SQL repetidos
- ⚠️ **Performance**: Try-catch oculta error, pero query sigue fallando

### Solución Propuesta

#### Opción A: Cast Explícito en SQL (RECOMENDADA)

**Cambios**:
1. Agregar `::uuid` cast al parámetro `$2`
2. Mantener tipo TypeScript como `string`

```typescript
// ✅ SOLUCIÓN en findDuplicateArtifact.ts
if (excludeCaseId) {
  // ✅ NUEVO: Cast explícito a UUID
  query += ` AND case_id != $2::uuid`;
  params.push(excludeCaseId);
}
```

**Ventajas**:
- ✅ Minimal change - 1 línea
- ✅ No afecta tipo TypeScript
- ✅ Funciona con Prisma $queryRawUnsafe

**Desventajas**:
- Ninguna

#### Opción B: Usar Prisma Raw Query con Template

**Cambios**:
1. Cambiar de `$queryRawUnsafe` a `Prisma.sql` template
2. Prisma maneja type casting automáticamente

```typescript
// ✅ ALTERNATIVA con Prisma.sql
import { Prisma } from '@prisma/client';

const results = excludeCaseId
  ? await prisma.$queryRaw<Array<{...}>>`
      SELECT id, case_id as "caseId", ...
      FROM public.artifacts
      WHERE provenance->>'fileHash' = ${fileHash}
        AND case_id != ${excludeCaseId}::uuid
      ORDER BY created_at ASC LIMIT 1
    `
  : await prisma.$queryRaw<Array<{...}>>`
      SELECT id, case_id as "caseId", ...
      FROM public.artifacts
      WHERE provenance->>'fileHash' = ${fileHash}
      ORDER BY created_at ASC LIMIT 1
    `;
```

**Ventajas**:
- ✅ Prisma maneja escaping automáticamente
- ✅ Más type-safe

**Desventajas**:
- ❌ Más código (2 queries separadas)
- ❌ Menos flexible

#### Opción C: Usar findFirst de Prisma (MEJOR ARQUITECTURA)

**Cambios**:
1. Eliminar raw SQL completamente
2. Usar Prisma query builder con filtro JSON

```typescript
// ✅ MEJOR SOLUCIÓN con Prisma ORM
export async function findDuplicateArtifact(
  fileHash: string,
  excludeCaseId?: string
): Promise<FindDuplicateResult> {
  try {
    const artifact = await prisma.artifact.findFirst({
      where: {
        provenance: {
          path: ['fileHash'],
          equals: fileHash
        },
        ...(excludeCaseId && {
          case_id: { not: excludeCaseId }
        })
      },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        case_id: true,
        file_id: true,
        file_name: true,
        created_at: true
      }
    });

    if (artifact) {
      return {
        exists: true,
        artifact: {
          id: artifact.id,
          caseId: artifact.case_id,
          fileId: artifact.file_id,
          fileName: artifact.file_name,
          createdAt: artifact.created_at
        }
      };
    }

    return { exists: false };
  } catch (error: any) {
    console.error('❌ [findDuplicateArtifact] Error:', error);
    return { exists: false };
  }
}
```

**Ventajas**:
- ✅ No raw SQL - más mantenible
- ✅ Type-safe completo
- ✅ Prisma maneja type casting
- ✅ Funciona con cualquier BD (no solo Postgres)

**Desventajas**:
- ⚠️ Puede ser más lento que raw SQL (pero probablemente insignificante)
- ⚠️ Requiere que Prisma soporte JSONB path queries (sí lo soporta)

### Archivos a Modificar (Opción C - Recomendada)

```
src/lib/storage/findDuplicateArtifact.ts    # Reemplazar raw SQL con Prisma ORM
```

**Total**: 1 archivo, ~30 líneas modificadas

---

## 📊 Plan de Corrección Consolidado

### Fase 1: Errores Críticos (Prioridad Alta)

#### 1.1 Error #3 - Type Casting SQL (PRIMERO)
**Por qué primero**: Causa errores repetidos y no bloquea flujo

**Archivos**:
- `src/lib/storage/findDuplicateArtifact.ts`

**Cambios**:
```typescript
// ANTES:
query += ` AND case_id != $2`;

// DESPUÉS:
query += ` AND case_id != $2::uuid`;
```

**Testing**:
1. Subir 2 PDFs iguales en mismo caso → Debe detectar duplicado
2. Subir mismo PDF en 2 casos diferentes → No debe detectar duplicado
3. Revisar logs: No debe haber error SQL

**Tiempo estimado**: 10 minutos  
**Riesgo**: Bajo (cambio mínimo, try-catch protege)

---

#### 1.2 Error #1 - Botones Reaparecen (SEGUNDO)
**Por qué segundo**: Afecta UX directamente

**Archivos**:
- `src/components/Workspace/WorkspaceTabs.tsx`

**Cambios**:
```typescript
// ANTES:
useUI.setState({
  activeCaseData: data,
  caseApproved: false, // ← PROBLEMA
  caseApproving: false
});

if (data.status === 'active') {
  useUI.setState({ caseApproved: true });
}

// DESPUÉS:
const currentCaseApproved = useUI.getState().caseApproved;

useUI.setState({
  activeCaseData: data,
  // ✅ Preservar caseApproved si ya está aprobado
  caseApproved: currentCaseApproved === true 
    ? true 
    : (data.status === 'active'),
  caseApproving: false
});
```

**Testing**:
1. Crear caso nuevo → Aprobar → NO deben reaparecer botones
2. Abrir caso aprobado histórico → NO deben aparecer botones
3. Abrir caso draft histórico → SÍ deben aparecer botones
4. Probar con navegación rápida entre casos

**Tiempo estimado**: 20 minutos  
**Riesgo**: Medio (afecta lógica de estado, pero muy localizado)

---

#### 1.3 Error #2 - Compliance 500 (TERCERO)
**Por qué tercero**: No bloquea flujo, solo logs

**Archivos**:
- `src/components/Workspace/WorkspaceTabs.tsx`
- `src/lib/ui/state.ts` (opcional, para mejor error handling)

**Cambios**:
```typescript
// ANTES en WorkspaceTabs.tsx:
useEffect(() => {
  if (currentCaseId && currentCaseId !== 'new-thread-placeholder') {
    loadComplianceRecord(currentCaseId); // ← PROBLEMA: Carga siempre
    fetchPolicyAnalyses(currentCaseId);
    fetchRenewals(currentCaseId);
  }
}, [currentCaseId]);

// DESPUÉS:
useEffect(() => {
  if (currentCaseId && currentCaseId !== 'new-thread-placeholder') {
    // ✅ NO cargar compliance automáticamente
    fetchPolicyAnalyses(currentCaseId);
    fetchRenewals(currentCaseId);
  }
}, [currentCaseId]);

// ✅ NUEVO: Cargar solo cuando tab está activo
useEffect(() => {
  if (activeTab === 'compliance' && currentCaseId && currentCaseId !== 'new-thread-placeholder') {
    loadComplianceRecord(currentCaseId);
  }
}, [activeTab, currentCaseId]);
```

**Testing**:
1. Crear caso nuevo → No debe haber error 500 en logs
2. Abrir tab Compliance → Debe cargar (o crear) compliance record
3. Navegar entre tabs → Solo debe cargar compliance al abrir tab
4. Verificar performance (menos queries innecesarias)

**Tiempo estimado**: 15 minutos  
**Riesgo**: Bajo (lazy loading es mejor práctica)

---

### Fase 2: Mejoras Opcionales (Prioridad Media)

#### 2.1 Migrar findDuplicateArtifact a Prisma ORM
**Beneficio**: Código más mantenible, type-safe, portable

**Tiempo estimado**: 30 minutos  
**Riesgo**: Medio (cambio arquitectónico, requiere testing exhaustivo)

#### 2.2 Unificar lógica de aprobación con approvalPhase
**Beneficio**: Estado más semántico, menos flags booleanos

**Tiempo estimado**: 2 horas  
**Riesgo**: Alto (afecta 8+ archivos, requiere refactor completo)

---

## 🔍 Análisis de Impacto

### Archivos que NO se Romperán

✅ **src/components/Cases/BriefForm.tsx**
- Usa `shouldShowApprovalButtons()` que ya funciona correctamente
- No se ve afectado por cambios en WorkspaceTabs

✅ **src/components/Chat/ConversationPane.tsx**
- Lógica de aprobación ya es correcta
- Solo se beneficia de fix en WorkspaceTabs

✅ **src/components/Chat/MessageAgent.tsx**
- Usa misma lógica que ConversationPane
- No requiere cambios

✅ **src/lib/case-actions.ts**
- No se ve afectado por ningún cambio propuesto

✅ **src/app/api/cases/create/route.ts**
- Solo se beneficia de fix en findDuplicateArtifact
- No requiere cambios

### Archivos que Requieren Testing Extra

⚠️ **src/components/Workspace/WorkspaceTabs.tsx**
- **Cambio crítico** en lógica de carga de datos
- Probar casos: nuevo, draft, activo, navegación

⚠️ **src/lib/storage/findDuplicateArtifact.ts**
- **Cambio en SQL** puede afectar performance
- Probar detección de duplicados globalmente

⚠️ **src/lib/ui/state.ts**
- **Cambio opcional** en loadComplianceRecord
- Probar lazy loading de compliance

---

## 🎯 Orden de Implementación Recomendado

### Día 1: Fixes Críticos (1 hora total)
1. ✅ **10min**: Fix SQL type casting (Error #3)
2. ✅ **20min**: Fix botones reaparecen (Error #1)
3. ✅ **15min**: Fix compliance 500 (Error #2)
4. ✅ **15min**: Testing manual de los 3 fixes

### Día 2: Testing Exhaustivo (2 horas)
1. ✅ Crear caso nuevo completo (con PDFs duplicados)
2. ✅ Navegar entre casos (nuevo → draft → activo)
3. ✅ Probar todos los tabs (Brief, Analysis, Compliance, etc.)
4. ✅ Verificar logs (no deben haber errores SQL ni 500)

### Día 3: Documentación (1 hora)
1. ✅ Actualizar GUIA_COMPLETA_FUNCIONALIDADES.md
2. ✅ Agregar casos de prueba a GUIA_TESTING_FASE1.md
3. ✅ Documentar cambios en CHANGELOG.md

---

## 📝 Checklist Pre-Implementación

- [ ] Backup de BD (por si acaso)
- [ ] Branch nuevo: `fix/critical-case-flow-errors`
- [ ] Leer este documento completo
- [ ] Revisar archivos mencionados
- [ ] Preparar casos de prueba

## 📝 Checklist Post-Implementación

- [ ] Tests manuales pasados
- [ ] No hay errores en logs
- [ ] Botones NO reaparecen al aprobar
- [ ] Compliance NO lanza 500
- [ ] Duplicados detectados correctamente
- [ ] Build exitoso: `pnpm build`
- [ ] Commit con mensaje descriptivo
- [ ] PR con referencia a este documento

---

## 🚨 Notas Finales

### Principios Preservados

✅ **Reutilización máxima**: 
- findDuplicateArtifact sigue siendo helper reutilizable
- shouldShowApprovalButtons() es computed property reutilizable

✅ **Arquitectura dual**:
- Estado global (Zustand) sigue siendo single source of truth
- Componentes siguen patrón Container/Presentational

✅ **Estado unidireccional**:
- Flujo: User Action → Zustand setState → Re-render
- No hay mutaciones directas de estado

✅ **Separación de responsabilidades**:
- WorkspaceTabs: Carga de datos
- ConversationPane: Lógica de aprobación
- state.ts: Estado global
- findDuplicateArtifact: Lógica de BD

### Riesgos Residuales

⚠️ **Performance de compliance**: 
- Lazy loading puede hacer que primera apertura del tab sea lenta
- Mitigación: Mostrar loading spinner

⚠️ **Race conditions**:
- Entre navegación y persistencia de caseApproved
- Mitigación: await en setState + pequeños delays

⚠️ **Detección de duplicados**:
- Si Prisma ORM no soporta bien JSONB path queries
- Mitigación: Mantener raw SQL con cast (Opción A)

---

**Fin del Análisis**

Este documento debe ser consultado antes, durante y después de la implementación para asegurar que no se rompa ninguna funcionalidad existente.
