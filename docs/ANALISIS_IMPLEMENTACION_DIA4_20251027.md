# Análisis e Implementación del Día 4 (2025-01-27)
## Auditoría pre-deploy (CHAT/UI)

---

## 📋 Resumen Ejecutivo

El Día 4 tiene como objetivo:
- **Revisar wiring de pantallas de casos y artefactos** (mocks si falta)
- **Vista "Case Detail" con pestaña Artefactos** (lista + link)
- **Aceptación**: Navegar org→case→artefacto; ver PDF embebido o link

---

## 1️⃣ ANÁLISIS DE COHERENCIA Y PERTINENCIA

### Aspectos Ya Implementados ✅

#### A. **Migraciones y Tablas (Días 1-2)**
- ✅ `api_keys` tabla con RLS (Día 1)
- ✅ `cases` tabla con RLS (Día 2)
- ✅ `artifacts` tabla con RLS (Día 2)
- ✅ ENUM `source_type_enum` (`api`, `portal`, `pdf`, `link`)
- ✅ Cifrado PII con `pgcrypto` (Día 1)

**Valoración**: Coherente y pertinente. La estructura de base de datos está completa para soportar casos con múltiples artefactos de diferentes fuentes.

#### B. **API y Endpoints (Día 3)**
- ✅ `POST /api/cases/create` endpoint funcional
- ✅ Seed script con `briki-dev` org y 2 casos de prueba
- ✅ Audit logging funcionando (`created_case`)
- ✅ Creación de artifacts con `sourceType: 'pdf'`

**Valoración**: Endpoints funcionando correctamente. La integración de audit logs asegura trazabilidad.

#### C. **UI de Cases (Ya Existente)**
- ✅ Lista de casos (`src/app/[locale]/(app)/workspace/cases/page.tsx`)
- ✅ Detalle de caso (`src/app/[locale]/(app)/workspace/cases/[id]/CaseDetailContent.tsx`)
- ✅ Botones Edit/Delete en detalle
- ✅ Visualización de contador de documentos en info cards

**Valoración**: Estructura básica sólida, pero **falta la pestaña de Artefactos**.

---

### Aspectos Faltantes o Incompletos ⚠️

#### A. **Pestaña de Artefactos en Case Detail** ❌
**Ubicación**: `src/app/[locale]/(app)/workspace/cases/[id]/CaseDetailContent.tsx`

**Problema actual**:
```tsx
// Línea 127-131: Solo muestra COUNT, no lista
<div className="text-2xl font-bold">
  {caseData.artifacts?.length || 0}
</div>
```

**Lo que falta**:
1. Tabs/TabsList/TabsTrigger para "Detalles" y "Artefactos"
2. Tab de Artefactos con lista de `caseData.artifacts`
3. Para cada artifact:
   - Render PDF embebido si `sourceType === 'pdf'` y hay `fileId`
   - Mostrar link si `sourceType === 'link'`
   - Mostrar metadata si es JSON en `provenance`

**Ubicación de datos**: `caseData.artifacts` viene de `getCaseById()` en `src/lib/database.ts` (líneas 371-374)

#### B. **Visualización de PDFs Embebidos** ❌
**Ubicación**: Dentro de la pestaña de Artefactos

**Lo que falta**:
1. Componente para renderizar PDFs embebidos
2. Integración con Supabase Storage para obtener URL pública
3. Manejador de errores si PDF no existe

**Consideraciones**:
- Storage bucket `artifacts/` ya existe con RLS
- URLs públicas temporales (expiran en 1 hora)

#### C. **Mocks o Datos de Prueba** ⚠️
**Ubicación**: `src/app/[locale]/(app)/workspace/cases/[id]/page.tsx`

**Situación actual**: `getCaseById()` incluye artifacts (líneas 371-374 de `database.ts`), pero la UI no los muestra.

**Necesidad**: 
- Si no hay artifacts en DB, no mostrar nada (no hace falta mocks)
- Si hay artifacts, mostrar la lista

---

## 2️⃣ ASPECTOS ESPECÍFICOS QUE HACEN FALTA

### Tarea 1: Implementar Tabs en CaseDetailContent
**Archivo**: `src/app/[locale]/(app)/workspace/cases/[id]/CaseDetailContent.tsx`

**Acción**:
1. Importar `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` de `@/components/ui/tabs`
2. Añadir estado `const [activeTab, setActiveTab] = useState('details')`
3. Envolver el contenido existente en `<Tabs defaultValue="details">`
4. Añadir tab "Artefactos" con lista de artifacts

**Código sugerido**:
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useState } from 'react';

// Dentro del componente:
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Detalles</TabsTrigger>
    <TabsTrigger value="artifacts">Artefactos ({caseData.artifacts?.length || 0})</TabsTrigger>
  </TabsList>
  
  <TabsContent value="details">
    {/* Contenido existente actual */}
  </TabsContent>
  
  <TabsContent value="artifacts">
    <ArtifactsList artifacts={caseData.artifacts || []} />
  </TabsContent>
</Tabs>
```

### Tarea 2: Crear Componente ArtifactsList
**Archivo nuevo**: `src/components/Cases/ArtifactsList.tsx`

**Responsabilidades**:
1. Listar artifacts (map)
2. Para cada artifact:
   - Si `sourceType === 'pdf'` y `fileId`, mostrar PDF embebido
   - Si `sourceType === 'link'` y `provenance.url`, mostrar link
   - Mostrar metadata en `provenance`

**Componentes UI necesarios**:
- `Card` para cada artifact
- `Badge` para mostrar `sourceType`
- `Button` con `Link` para abrir PDF externo
- `<iframe>` para PDFs embebidos (con restricciones de seguridad)

**Lógica de Supabase Storage**:
```tsx
// Para obtener URL pública de PDF desde Storage
const getPublicUrl = async (fileId: string) => {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from('artifacts')
    .createSignedUrl(fileId, 3600); // URL válida 1 hora
  return data?.signedUrl;
};
```

### Tarea 3: Validar Estructura de Datos
**Archivo**: `src/lib/database.ts` (líneas 363-389)

**Validación necesaria**:
1. Confirmar que `getCaseById()` incluye `artifacts` con todos los campos necesarios
2. Verificar que `Artifact.provenance` contiene la metadata correcta

**Revisar estructura**:
```typescript
// En getCaseById(), línea 371-374:
artifacts: {
  orderBy: { createdAt: 'desc' }
}
```

**Verificar que incluye**:
- `id`
- `sourceType`
- `fileName`
- `fileId`
- `contentType`
- `provenance`

---

## 3️⃣ PLAN DE INTEGRACIÓN DETALLADO

### Fase 1: Preparación (5 min)
**Objetivo**: Verificar datos existentes

**Acción**:
1. Ejecutar seed script: `pnpm db:seed`
2. Verificar en Supabase Dashboard que hay casos con artifacts en DB
3. Confirmar que `caseData.artifacts` viene poblado correctamente

### Fase 2: Implementar Tabs (10 min)
**Objetivo**: Separar "Detalles" y "Artefactos" en tabs

**Acción**:
1. Abrir `src/app/[locale]/(app)/workspace/cases/[id]/CaseDetailContent.tsx`
2. Importar `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
3. Añadir tabs con contenido existente en tab "Detalles"
4. Crear tab "Artefactos" con componente `ArtifactsList`

**Criterios de aceptación**:
- Tabs funcionan (click cambia tab)
- Contenido de "Detalles" se mantiene igual
- Tab "Artefactos" muestra contador correcto

### Fase 3: Crear ArtifactsList (15 min)
**Objetivo**: Mostrar lista de artifacts con visualización apropiada

**Archivo nuevo**: `src/components/Cases/ArtifactsList.tsx`

**Estructura**:
```tsx
interface ArtifactsListProps {
  artifacts: Array<{
    id: string;
    sourceType: 'api' | 'portal' | 'pdf' | 'link';
    fileName: string | null;
    fileId: string | null;
    contentType: string | null;
    provenance: any;
    createdAt: Date;
  }>;
}

export function ArtifactsList({ artifacts }: ArtifactsListProps) {
  if (!artifacts || artifacts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No hay artefactos asociados a este caso
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {artifacts.map((artifact) => (
        <ArtifactCard key={artifact.id} artifact={artifact} />
      ))}
    </div>
  );
}
```

**Sub-componente ArtifactCard**:
```tsx
function ArtifactCard({ artifact }: { artifact: any }) {
  // Lógica para renderizar según sourceType
  if (artifact.sourceType === 'pdf' && artifact.fileId) {
    // Renderizar PDF embebido
  } else if (artifact.sourceType === 'link') {
    // Renderizar link
  } else {
    // Renderizar metadata
  }
}
```

**Criterios de aceptación**:
- Lista muestra todos los artifacts
- Cada artifact muestra info relevante
- PDFs se muestran embebidos (con iframe)
- Links se muestran como botones/enlaces

### Fase 4: Integrar Supabase Storage (10 min)
**Objetivo**: Obtener URLs públicas para PDFs

**Acción**:
1. En `ArtifactCard`, crear función `getPublicUrl(fileId: string)`
2. Usar `createClient()` de `@/lib/supabase/client`
3. Obtener signed URL con `createSignedUrl(fileId, 3600)`
4. Usar URL en `<iframe src={signedUrl} />`

**Criterios de aceptación**:
- PDFs se cargan correctamente en iframe
- URLs son temporales (expiran en 1 hora)
- Manejo de errores si PDF no existe

### Fase 5: Testing Manual (10 min)
**Objetivo**: Validar flujo completo

**Checklist**:
- [ ] Navegar a lista de casos
- [ ] Click en un caso
- [ ] Verificar que aparecen tabs "Detalles" y "Artefactos"
- [ ] Click en tab "Artefactos"
- [ ] Verificar que lista de artifacts se muestra
- [ ] Si hay PDFs, verificar que se cargan en iframe
- [ ] Si hay links, verificar que funcionan
- [ ] Verificar metadata en provenance

---

## 4️⃣ VALORACIÓN FINAL

### Coherencia ✅
Los artefactos ya se están guardando en DB correctamente con la estructura esperada. Solo falta mostrarlos en la UI.

### Pertinencia ✅
La pestaña de Artefactos es esencial para compliance y trazabilidad. Los usuarios deben poder ver todos los documentos asociados a un caso.

### Riesgos ⚠️
1. **Performance**: Si hay muchos PDFs embebidos, puede ralentizar la página
   - **Mitigación**: Lazy load con `loading="lazy"` en iframes
2. **Seguridad**: PDFs embebidos pueden tener contenido sensible
   - **Mitigación**: RLS ya protege el bucket `artifacts/`
3. **CORS**: Supabase Storage puede tener restricciones CORS
   - **Mitigación**: Configurar CORS en Supabase Dashboard

---

## 5️⃣ ENTREGABLES DEL DÍA 4

- ✅ Tabs implementados en Case Detail
- ✅ Lista de Artefactos funcional
- ✅ PDFs embebidos funcionando
- ✅ Links a documentos funcionando
- ✅ Aceptación: Navegar org→case→artefacto verificado

---

## 6️⃣ PRÓXIMOS PASOS (Día 5-7)

- **Día 5**: Endurecimiento RLS + cifrado PII
- **Día 6-7**: Pulido y demo M1
- Entregables S1 completos

