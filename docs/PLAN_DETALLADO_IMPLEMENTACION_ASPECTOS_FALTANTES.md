# PLAN DETALLADO: IMPLEMENTACIÓN DE ASPECTOS FALTANTES

**Fecha**: 29 de Enero, 2025  
**Rol**: Ingeniero FullStack Senior  
**Objetivo**: Implementar aspectos faltantes del flujo de trabajo sin romper funcionalidades existentes

---

## 📋 RESUMEN EJECUTIVO

Este plan aborda **4 aspectos faltantes** identificados en el análisis:

1. **FASE 1**: Completar seed script con usuario dev (30 min)
2. **FASE 2**: Agregar tab "Artifacts" al panel derecho del agente (1.5 horas)
3. **FASE 3**: Verificar/optimizar endpoint de storage (30 min)
4. **FASE 4**: Optimizar índices de base de datos (30 min)

**Total estimado**: ~3 horas  
**Riesgo general**: BAJO (implementaciones aisladas con reutilización de código existente)

---

## 🔍 ANÁLISIS EXHAUSTIVO DE RIESGOS Y DEPENDENCIAS

### **ANÁLISIS FASE 2: Tab "Artifacts" en Panel Derecho**

#### **Archivos Susceptibles de Romperse**:

1. **`src/components/Workspace/Tabs.tsx`**
   - **Riesgo**: MEDIO
   - **Razón**: Agregar nuevo tab afecta estructura de tabs
   - **Dependencias**: 
     - `WorkspaceTab` type (línea 16)
     - `tabLabels` useMemo (línea 39-46)
     - `TabsList` renderizado (línea 157-163)
     - `TabsContent` renderizado (línea 165-191)
   - **Precauciones**:
     - Mantener orden lógico de tabs
     - No romper dependencias de otros tabs
     - Asegurar que `activeCaseData` incluye `artifacts`

2. **`src/messages/es.ts` y `src/messages/en.ts`**
   - **Riesgo**: BAJO
   - **Razón**: Solo agregar traducción
   - **Dependencias**: `workspace.tabs` (líneas 427-435)
   - **Precauciones**: Mantener formato consistente

3. **Componente nuevo `ArtifactsList.tsx`**
   - **Riesgo**: BAJO (nuevo archivo)
   - **Dependencias**:
     - `activeCaseData` de `WorkspaceTabs`
     - Endpoint `/api/storage/[...path]`
     - Estilos UI existentes (`Card`, `Badge`, `Button`)
   - **Precauciones**: Reutilizar lógica de `CaseDetailContent.tsx` líneas 182-267

4. **`src/app/api/cases/[id]/route.ts`**
   - **Riesgo**: NINGUNO (ya incluye artifacts)
   - **Verificación**: ✅ Línea 26 confirma `include: { artifacts }`

5. **`src/app/api/storage/[...path]/route.ts`**
   - **Riesgo**: BAJO
   - **Verificación**: Existe y genera signed URLs
   - **Precaución**: Verificar formato de path (`artifact.fileId`)

---

### **ANÁLISIS FASE 1: Seed Script**

#### **Archivos Susceptibles de Romperse**:

1. **`prisma/seed.ts`**
   - **Riesgo**: BAJO (solo agregar código)
   - **Dependencias**:
     - `@supabase/supabase-js` (verificar instalación)
     - Variables de entorno: `SUPABASE_SERVICE_ROLE_KEY`, `DEV_USER_PASSWORD`
   - **Precauciones**:
     - Manejar errores gracefully si falta `SUPABASE_SERVICE_ROLE_KEY`
     - No fallar si usuario ya existe
     - Documentar variables requeridas

2. **`.env.example`**
   - **Riesgo**: NINGUNO (solo documentación)
   - **Precaución**: Agregar comentarios claros

3. **`package.json`**
   - **Riesgo**: BAJO
   - **Verificación**: Verificar si `@supabase/supabase-js` está instalado
   - **Precaución**: Si falta, agregar a `dependencies`

---

### **ANÁLISIS FASE 3: Endpoint Storage**

#### **Archivos Susceptibles de Romperse**:

1. **`src/app/api/storage/[...path]/route.ts`**
   - **Riesgo**: MEDIO
   - **Razón**: Puede afectar acceso a archivos existentes
   - **Dependencias**:
     - `createServerSupabase()` para signed URLs
     - Formato de path esperado
   - **Precauciones**:
     - Verificar que paths de artifacts existentes siguen funcionando
     - Asegurar validación de `org_id` en path
     - Mantener compatibilidad con paths actuales

---

### **ANÁLISIS FASE 4: Optimización Índices**

#### **Archivos Susceptibles de Romperse**:

1. **Nueva migración SQL**
   - **Riesgo**: BAJO
   - **Razón**: Solo agrega índices (no modifica datos)
   - **Dependencias**: NINGUNA (migración independiente)
   - **Precauciones**:
     - Usar `IF NOT EXISTS` para evitar errores
     - Verificar que índices no duplican existentes
     - Documentar propósito de cada índice

---

## 📝 PLAN DETALLADO DE IMPLEMENTACIÓN

---

## **FASE 1: COMPLETAR SEED SCRIPT CON USUARIO DEV**

### **Objetivo**
Crear o verificar usuario dev y asociarlo automáticamente a la organización dev en el seed script.

### **Análisis de Coherencia**
- ✅ **Pertinente**: Facilita onboarding de desarrolladores
- ✅ **Coherente**: Sigue patrón existente del seed
- ⚠️ **Consideración**: Requiere `SUPABASE_SERVICE_ROLE_KEY` (puede no estar disponible en todos los ambientes)

### **Archivos a Modificar**

#### **1. `prisma/seed.ts`**

**Ubicación**: Después de línea 29 (después de crear/verificar organización)

**Código a Agregar**:

```typescript
// ... código existente hasta línea 29 ...

// ✅ FASE 1: Crear o verificar usuario dev
console.log('📝 Checking for dev user...');

// Verificar si existe SUPABASE_SERVICE_ROLE_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseServiceKey || !supabaseUrl) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL no están configurados.');
  console.warn('📝 No se puede crear usuario dev automáticamente.');
  console.warn('📝 Por favor, crea el usuario dev manualmente en Supabase Dashboard y ejecuta:');
  console.warn('   INSERT INTO public.org_members (org_id, user_id, role) VALUES (\'' + org.id + '\', \'<user-id>\', \'owner\');');
} else {
  try {
    // Importar dinámicamente para evitar errores si no está instalado
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { autoRefreshToken: false } }
    );

    // Intentar encontrar usuario existente
    const devUserEmail = process.env.DEV_USER_EMAIL || 'dev@briki.local';
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    let devUser = null;
    if (!listError && userList?.users) {
      devUser = userList.users.find(u => u.email === devUserEmail);
    }

    if (devUser) {
      console.log('✅ Dev user already exists:', devUser.id);
    } else {
      // Crear usuario dev
      console.log('📝 Creating dev user...');
      const devUserPassword = process.env.DEV_USER_PASSWORD || 'dev-password-change-me-in-production';
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: devUserEmail,
        password: devUserPassword,
        email_confirm: true,
        user_metadata: { 
          role: 'developer',
          created_via: 'seed_script'
        }
      });

      if (createError) {
        console.warn('⚠️ Could not create dev user:', createError.message);
        console.warn('📝 Please create dev user manually in Supabase Dashboard');
      } else if (newUser?.user) {
        devUser = newUser.user;
        console.log('✅ Dev user created:', devUser.id);
      }
    }

    // Crear membresía si no existe
    if (devUser) {
      const existingMembership = await prisma.org_members.findFirst({
        where: {
          org_id: org.id,
          user_id: devUser.id
        }
      });

      if (!existingMembership) {
        await prisma.org_members.create({
          data: {
            org_id: org.id,
            user_id: devUser.id,
            role: 'owner'
          }
        });
        console.log('✅ Dev user membership created');
      } else {
        console.log('✅ Dev user membership already exists');
      }
    }
  } catch (error: any) {
    console.warn('⚠️ Error in dev user creation:', error.message);
    console.warn('📝 Seed will continue without dev user. Please create manually if needed.');
  }
}

// Continuar con código existente (crear casos de prueba)...
```

**Precauciones**:
- ✅ Manejo graceful si `SUPABASE_SERVICE_ROLE_KEY` no existe
- ✅ No falla si usuario ya existe
- ✅ Importación dinámica de `@supabase/supabase-js` para evitar errores
- ✅ Continúa con seed aunque falle creación de usuario

---

#### **2. `.env.example`**

**Ubicación**: Agregar nuevas variables

**Código a Agregar**:

```bash
# Supabase Admin (para seed script)
# Obtener desde: Supabase Dashboard > Settings > API > service_role key
SUPABASE_SERVICE_ROLE_KEY=

# Usuario de desarrollo (opcional, para seed script)
DEV_USER_EMAIL=dev@briki.local
DEV_USER_PASSWORD=dev-password-change-me-in-production
```

---

#### **3. `package.json` (si es necesario)**

**Verificación**: Comprobar si `@supabase/supabase-js` está en `dependencies`

**Código**: Si no está, agregar:
```json
"dependencies": {
  "@supabase/supabase-js": "^2.x.x",
  // ... otros
}
```

---

### **Test de Aceptación FASE 1**

```bash
# 1. Configurar variables de entorno
echo "SUPABASE_SERVICE_ROLE_KEY=your-key" >> .env.local
echo "DEV_USER_EMAIL=dev@briki.local" >> .env.local
echo "DEV_USER_PASSWORD=test-password" >> .env.local

# 2. Ejecutar seed
pnpm db:seed

# 3. Verificar en Supabase Dashboard:
# - Usuario dev@briki.local existe
# - Usuario tiene membresía en organización 'briki-dev' con rol 'owner'
# - Seed completa sin errores incluso si usuario ya existe
```

---

## **FASE 2: AGREGAR TAB "ARTIFACTS" AL PANEL DERECHO**

### **Objetivo**
Reutilizar la lógica de `CaseDetailContent.tsx` para crear un componente `ArtifactsList` y agregarlo como tab en `WorkspaceTabs.tsx` del panel derecho del agente.

### **Análisis de Coherencia**
- ✅ **Pertinente**: Panel derecho debe ser constante en todos los flujos
- ✅ **Coherente**: Reutiliza lógica existente de `/workspace/cases/[id]`
- ✅ **Complementario**: Aporta consistencia visual y funcional

### **Archivos a Crear/Modificar**

#### **1. Crear `src/components/Workspace/ArtifactsList.tsx`**

**Estrategia**: Extraer y adaptar lógica de `CaseDetailContent.tsx` líneas 182-267

**Análisis de Reutilización**:
- ✅ Card structure: Reutilizable
- ✅ Badge para sourceType: Reutilizable
- ✅ Iframe para PDF: Reutilizable
- ✅ Links para abrir/descargar: Reutilizable
- ✅ Metadata expandible: Reutilizable
- ⚠️ **Ajuste necesario**: Adaptar formato de URL (`/api/storage/${artifact.fileId}`)

**Implementación**:

```typescript
// src/components/Workspace/ArtifactsList.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink, Download, Calendar, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useUI } from '@/lib/ui/state';

interface ArtifactsListProps {
  caseData: {
    id: string;
    artifacts?: Array<{
      id: string;
      sourceType: string;
      fileName?: string | null;
      fileId?: string | null;
      contentType?: string | null;
      createdAt: string | Date;
      provenance?: any;
    }>;
  } | null;
  loading?: boolean;
}

export function ArtifactsList({ caseData, loading }: ArtifactsListProps) {
  const { currentCaseId } = useUI();
  const artifacts = caseData?.artifacts || [];

  // ✅ REUTILIZACIÓN: Función para obtener URL del storage (igual que CaseDetailContent)
  const getStorageUrl = (fileId: string) => {
    // Formato: /api/storage/{path}
    // fileId viene en formato: org_id/timestamp_filename
    return `/api/storage/${fileId}`;
  };

  // ✅ REUTILIZACIÓN: Formatear fecha (igual que diseño existente)
  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ✅ REUTILIZACIÓN: Labels y colores para sourceType (igual que CaseDetailContent)
  const getSourceTypeLabel = (sourceType: string) => {
    const labels: Record<string, string> = {
      api: 'API',
      portal: 'Portal',
      pdf: 'PDF',
      link: 'Enlace'
    };
    return labels[sourceType] || sourceType.toUpperCase();
  };

  const getSourceTypeVariant = (sourceType: string): "default" | "secondary" | "destructive" | "outline" => {
    // Usar variant="outline" para mantener consistencia con CaseDetailContent
    return "outline";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (artifacts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay artefactos asociados a este caso</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con contador */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Artefactos del Caso</h3>
        <Badge variant="secondary">{artifacts.length} archivo{artifacts.length !== 1 ? 's' : ''}</Badge>
      </div>

      {/* Lista de Artifacts - REUTILIZANDO ESTRUCTURA DE CaseDetailContent */}
      {artifacts.map((artifact) => {
        const [showMetadata, setShowMetadata] = useState(false);
        const storageUrl = artifact.fileId ? getStorageUrl(artifact.fileId) : null;
        const isPDF = artifact.sourceType === 'pdf' && artifact.fileId;

        return (
          <Card key={artifact.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {artifact.fileName || 'Sin nombre'}
                </CardTitle>
                <Badge variant={getSourceTypeVariant(artifact.sourceType)}>
                  {getSourceTypeLabel(artifact.sourceType)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Información básica */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {formatDate(artifact.createdAt)}
                </div>

                {artifact.contentType && (
                  <div className="text-sm text-muted-foreground">
                    <strong>Tipo:</strong> {artifact.contentType}
                  </div>
                )}

                {/* ✅ REUTILIZACIÓN: Iframe para PDF (igual que CaseDetailContent líneas 206-228) */}
                {isPDF && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Vista Previa (PDF)</p>
                    {storageUrl && (
                      <>
                        <a
                          href={storageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mb-2 block"
                        >
                          <ExternalLink className="w-4 h-4 inline mr-1" />
                          Abrir PDF en nueva ventana
                        </a>
                        <div className="border rounded-lg overflow-hidden">
                          <iframe
                            src={storageUrl}
                            width="100%"
                            height="600px"
                            className="border-0"
                            style={{ minHeight: '600px' }}
                            title={`Vista previa de ${artifact.fileName || 'documento'}`}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Si el PDF no se muestra, haz clic en "Abrir PDF en nueva ventana" para descargarlo.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* ✅ REUTILIZACIÓN: Link para artifacts tipo 'link' (igual que CaseDetailContent líneas 230-241) */}
                {artifact.sourceType === 'link' && artifact.provenance?.url && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Enlace</p>
                    <a
                      href={artifact.provenance.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {artifact.provenance.url}
                    </a>
                  </div>
                )}

                {/* ✅ REUTILIZACIÓN: Metadata expandible (igual que CaseDetailContent líneas 243-251) */}
                {artifact.provenance && (
                  <details 
                    className="mt-4"
                    onToggle={(e) => setShowMetadata((e.target as HTMLDetailsElement).open)}
                  >
                    <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                      <ChevronDown className={`w-4 h-4 transition-transform ${showMetadata ? 'rotate-180' : ''}`} />
                      Ver Metadata
                    </summary>
                    <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto">
                      {JSON.stringify(artifact.provenance, null, 2)}
                    </pre>
                  </details>
                )}

                {/* Botones de acción */}
                {storageUrl && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(storageUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = storageUrl;
                        a.download = artifact.fileName || 'documento.pdf';
                        a.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
```

**Precauciones**:
- ✅ Reutiliza estructura exacta de `CaseDetailContent.tsx`
- ✅ Maneja estados de loading y empty
- ✅ Compatible con formato de `activeCaseData.artifacts`
- ✅ Usa mismos componentes UI (`Card`, `Badge`, `Button`)

---

#### **2. Modificar `src/components/Workspace/Tabs.tsx`**

**Análisis de Cambios**:

**Línea 16**: Modificar tipo `WorkspaceTab`
```typescript
// ANTES
export type WorkspaceTab = "case-brief" | "policies" | "comparisons" | "proposal" | "compliance" | "renewals";

// DESPUÉS
export type WorkspaceTab = "case-brief" | "artifacts" | "policies" | "comparisons" | "proposal" | "compliance" | "renewals";
```

**Línea 39-46**: Agregar traducción para "artifacts"
```typescript
// ANTES
const tabLabels = useMemo(() => ({
    "case-brief": t("caseBrief"),
    policies: t("policies"),
    // ...
}), [t]);

// DESPUÉS
const tabLabels = useMemo(() => ({
    "case-brief": t("caseBrief"),
    "artifacts": t("artifacts"), // ✅ NUEVO
    policies: t("policies"),
    // ...
}), [t]);
```

**Línea 165-191**: Agregar `TabsContent` para artifacts
```typescript
// DESPUÉS de TabsContent "case-brief" (línea 175), ANTES de "policies" (línea 176)
<TabsContent value="artifacts" className="py-6">
  <ArtifactsList caseData={activeCaseData} loading={isLoading} />
</TabsContent>
```

**Línea 1-14**: Agregar import
```typescript
// Agregar después de línea 14
import { ArtifactsList } from './ArtifactsList';
```

**Implementación Completa**:

```typescript
// src/components/Workspace/Tabs.tsx

// ... imports existentes ...
import { ArtifactsList } from './ArtifactsList'; // ✅ FASE 2: Import nuevo componente

export type WorkspaceTab = "case-brief" | "artifacts" | "policies" | "comparisons" | "proposal" | "compliance" | "renewals"; // ✅ FASE 2: Agregar "artifacts"

// ... resto del código ...

const tabLabels = useMemo(() => ({
    "case-brief": t("caseBrief"),
    "artifacts": t("artifacts"), // ✅ FASE 2: Agregar traducción
    policies: t("policies"),
    comparisons: t("comparisons"),
    proposal: t("proposal"),
    compliance: t("compliance"),
    renewals: t("renewals"),
  } satisfies Record<WorkspaceTab, string>), [t]);

// ... resto del código hasta TabsContent ...

<TabsContent value="case-brief" className="py-6 h-full">
  {/* ... código existente ... */}
</TabsContent>

<TabsContent value="artifacts" className="py-6"> {/* ✅ FASE 2: Nuevo tab */}
  <ArtifactsList caseData={activeCaseData} loading={isLoading} />
</TabsContent>

<TabsContent value="policies" className="py-6">
  {/* ... código existente ... */}
</TabsContent>

// ... resto de TabsContent ...
```

**Precauciones**:
- ✅ Mantener orden lógico: "case-brief" → "artifacts" → "policies" → ...
- ✅ No afectar otros tabs (solo agregar, no modificar)
- ✅ `activeCaseData` ya incluye `artifacts` (verificado en endpoint `/api/cases/[id]`)
- ✅ `isLoading` se propaga correctamente

---

#### **3. Modificar `src/messages/es.ts`**

**Ubicación**: `workspace.tabs` (líneas 427-435)

**Código a Agregar**:

```typescript
workspace: {
  tabs: {
    caseBrief: "Resumen",
    artifacts: "Artefactos", // ✅ FASE 2: Agregar traducción
    policies: "Pólizas",
    // ... resto igual ...
  }
}
```

---

#### **4. Modificar `src/messages/en.ts`**

**Ubicación**: `workspace.tabs` (líneas 427-435)

**Código a Agregar**:

```typescript
workspace: {
  tabs: {
    caseBrief: "Case Brief",
    artifacts: "Artifacts", // ✅ FASE 2: Agregar traducción
    policies: "Policies",
    // ... resto igual ...
  }
}
```

---

### **Test de Aceptación FASE 2**

1. **Crear caso con PDFs**:
   - Completar formulario y subir PDFs
   - Verificar que PDFs se guardan como `Artifact`

2. **Verificar tab "Artefactos"**:
   - Navegar a `/agent/[caseId]`
   - Verificar que aparece tab "Artefactos" después de "Resumen"
   - Hacer clic en tab "Artefactos"
   - Verificar que se muestran todos los PDFs subidos

3. **Verificar visualización de PDFs**:
   - Verificar que iframe muestra PDF correctamente
   - Verificar que link "Abrir PDF en nueva ventana" funciona
   - Verificar que botón "Descargar" descarga el PDF

4. **Verificar casos sin artifacts**:
   - Cargar caso sin PDFs
   - Verificar que muestra mensaje "No hay artefactos asociados"

5. **Verificar casos históricos**:
   - Cargar caso histórico desde sidebar
   - Verificar que tab "Artefactos" muestra PDFs históricos

---

## **FASE 3: VERIFICAR Y OPTIMIZAR ENDPOINT DE STORAGE**

### **Objetivo**
Verificar que `/api/storage/[...path]` funciona correctamente con paths de artifacts y validar acceso por organización.

### **Análisis de Riesgo**

#### **Archivos Susceptibles**:

1. **`src/app/api/storage/[...path]/route.ts`**
   - **Riesgo**: MEDIO
   - **Razón**: Afecta acceso a TODOS los archivos
   - **Verificación actual**: 
     - ✅ Genera signed URLs
     - ⚠️ No valida `org_id` en path (puede ser vulnerabilidad)
   - **Precaución**: Agregar validación sin romper acceso existente

### **Implementación**

**Código Actual** (líneas 1-34):
```typescript
export async function GET(...) {
  const filePath = resolvedParams.path.join('/');
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.storage
    .from('artifacts')
    .createSignedUrl(filePath, 3600);
  return NextResponse.redirect(data.signedUrl);
}
```

**Problema Identificado**: No valida que el path pertenezca a la organización del usuario.

**Solución Optimizada** (sin romper funcionalidad existente):

```typescript
// src/app/api/storage/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filePath = resolvedParams.path.join('/');
    
    console.log('📎 [API /api/storage] Generating signed URL for:', filePath);
    
    // ✅ FASE 3: Validar acceso por organización
    const { currentOrg } = await getCurrentOrg();
    
    // Verificar formato de path: artifacts/{org_id}/...
    const pathParts = filePath.split('/');
    if (pathParts.length >= 2 && pathParts[0] === 'artifacts') {
      const pathOrgId = pathParts[1];
      
      // Validar que el path pertenece a la organización del usuario
      if (pathOrgId !== currentOrg.id) {
        console.error('❌ [API /api/storage] Access denied: path org_id does not match user org');
        return NextResponse.json(
          { error: 'Access denied to file' },
          { status: 403 }
        );
      }
    }
    // Si el path no sigue formato artifacts/{org_id}/..., permitir (backward compatibility)
    // Esto permite que paths antiguos o temporales sigan funcionando
    
    const supabase = await createServerSupabase();
    
    // Generar URL firmada (válida por 1 hora)
    const { data, error } = await supabase.storage
      .from('artifacts')
      .createSignedUrl(filePath, 3600);
    
    if (error) {
      console.error('❌ [API /api/storage] Error generating signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate URL' },
        { status: 500 }
      );
    }
    
    console.log('✅ [API /api/storage] Signed URL generated successfully');
    
    // Redirigir a la URL firmada
    return NextResponse.redirect(data.signedUrl);
  } catch (error: any) {
    console.error('❌ [API /api/storage] Error in storage route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Precauciones**:
- ✅ Validación solo para paths con formato `artifacts/{org_id}/...`
- ✅ Backward compatibility: paths sin formato siguen funcionando
- ✅ No rompe acceso a archivos existentes
- ✅ Logs claros para debugging

---

### **Test de Aceptación FASE 3**

1. **Validar acceso correcto**:
   - Usuario de Org A intenta acceder a PDF de Org A → ✅ Permite
   - Usuario de Org A intenta acceder a PDF de Org B → ❌ Deniega (403)

2. **Validar backward compatibility**:
   - Paths antiguos sin formato `artifacts/{org_id}/...` → ✅ Siguen funcionando

3. **Validar signed URLs**:
   - Verificar que signed URLs se generan correctamente
   - Verificar que URLs expiran después de 1 hora

---

## **FASE 4: OPTIMIZAR ÍNDICES DE BASE DE DATOS**

### **Objetivo**
Crear índices optimizados para mejorar performance de consultas frecuentes en `cases` y `artifacts`.

### **Análisis de Riesgo**

#### **Archivos Susceptibles**:

1. **Nueva migración SQL**
   - **Riesgo**: BAJO (solo agrega índices)
   - **Dependencias**: NINGUNA
   - **Precaución**: Verificar que índices no duplican existentes

### **Implementación**

**Archivo a Crear**: `supabase/migrations/20250130_optimize_case_indices.sql`

```sql
-- =====================================================
-- MIGRACIÓN: OPTIMIZACIÓN DE ÍNDICES PARA CASES Y ARTIFACTS
-- Objetivo: Mejorar performance de consultas frecuentes
-- Fecha: 2025-01-30
-- =====================================================

-- ✅ ÍNDICE 1: Búsqueda por org y status (muy frecuente en listados)
-- Uso: WHERE org_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_cases_org_status 
  ON public.cases(org_id, status)
  WHERE org_id IS NOT NULL;

COMMENT ON INDEX idx_cases_org_status IS 'Optimiza filtrado por organización y estado (usado en /api/cases)';

-- ✅ ÍNDICE 2: Ordenamiento por fecha (dashboards, listados)
-- Uso: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_cases_created_at_desc 
  ON public.cases(created_at DESC)
  WHERE org_id IS NOT NULL;

COMMENT ON INDEX idx_cases_created_at_desc IS 'Optimiza ordenamiento por fecha de creación (listados, dashboards)';

-- ✅ ÍNDICE 3: Artifacts por case y source (filtros comunes)
-- Uso: WHERE case_id = ? AND source_type = ?
CREATE INDEX IF NOT EXISTS idx_artifacts_case_source 
  ON public.artifacts(case_id, source_type)
  WHERE case_id IS NOT NULL;

COMMENT ON INDEX idx_artifacts_case_source IS 'Optimiza búsqueda de artifacts por caso y tipo de fuente';

-- ✅ ÍNDICE 4: Artifacts por fecha (ordenamiento)
-- Uso: ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at_desc 
  ON public.artifacts(created_at DESC);

COMMENT ON INDEX idx_artifacts_created_at_desc IS 'Optimiza ordenamiento de artifacts por fecha';

-- =====================================================
-- VERIFICACIÓN DE ÍNDICES EXISTENTES
-- =====================================================

-- Verificar que no hay duplicados
DO $$
DECLARE
  existing_idx text;
BEGIN
  SELECT indexname INTO existing_idx
  FROM pg_indexes
  WHERE tablename = 'cases' AND indexname = 'idx_cases_org_status';
  
  IF existing_idx IS NOT NULL THEN
    RAISE NOTICE 'Índice idx_cases_org_status ya existe, omitiendo...';
  END IF;
END $$;
```

**Precauciones**:
- ✅ Usar `IF NOT EXISTS` para evitar errores en re-ejecución
- ✅ Comentarios descriptivos para cada índice
- ✅ Verificación de duplicados antes de crear

---

### **Test de Aceptación FASE 4**

```sql
-- 1. Verificar índices creados
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename IN ('cases', 'artifacts')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 2. Verificar performance (usar EXPLAIN ANALYZE)
EXPLAIN ANALYZE 
SELECT * FROM public.cases 
WHERE org_id = '...' AND status = 'active'
ORDER BY created_at DESC;

-- 3. Verificar que índices mejoran tiempo de consulta
-- (debe mostrar "Index Scan" en lugar de "Seq Scan")
```

---

## 🎯 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

### **Secuencia Óptima**

1. **FASE 2** (1.5 horas) - Tab "Artifacts" → **PRIORIDAD ALTA**
   - Impacto inmediato en UX
   - Reutiliza código existente (bajo riesgo)
   - No afecta otras funcionalidades

2. **FASE 3** (30 min) - Verificar Storage → **PRIORIDAD MEDIA**
   - Mejora seguridad
   - Depende de FASE 2 (para probar visualización)

3. **FASE 1** (30 min) - Seed Script → **PRIORIDAD MEDIA**
   - Facilita desarrollo
   - Independiente de otras fases

4. **FASE 4** (30 min) - Optimización Índices → **PRIORIDAD BAJA**
   - Solo mejora performance
   - Puede implementarse después si hay problemas de velocidad

---

## ✅ VALIDACIÓN POST-IMPLEMENTACIÓN

### **Checklist de Validación**

#### **FASE 2: Tab Artifacts**
- [ ] Tab "Artefactos" aparece en panel derecho del agente
- [ ] Tab está entre "Resumen" y "Pólizas"
- [ ] Muestra correctamente todos los artifacts del caso
- [ ] Iframe muestra PDFs correctamente
- [ ] Links "Abrir PDF" y "Descargar" funcionan
- [ ] Metadata expandible funciona
- [ ] Casos sin artifacts muestran mensaje apropiado
- [ ] Traducciones en español e inglés funcionan
- [ ] Panel derecho se mantiene constante en todos los flujos

#### **FASE 3: Storage Endpoint**
- [ ] Validación de `org_id` funciona correctamente
- [ ] Usuarios no pueden acceder a PDFs de otras organizaciones
- [ ] Paths antiguos siguen funcionando (backward compatibility)
- [ ] Signed URLs se generan correctamente

#### **FASE 1: Seed Script**
- [ ] Seed crea usuario dev si `SUPABASE_SERVICE_ROLE_KEY` está configurado
- [ ] Seed asocia usuario dev a organización dev
- [ ] Seed no falla si usuario ya existe
- [ ] Seed continúa funcionando si falta `SUPABASE_SERVICE_ROLE_KEY`

#### **FASE 4: Índices**
- [ ] Índices se crean sin errores
- [ ] No hay índices duplicados
- [ ] Consultas usan índices (verificar con EXPLAIN ANALYZE)

---

## 🚨 PRECAUCIONES CRÍTICAS

### **Riesgos Identificados y Mitigaciones**

#### **RIESGO 1: Tab "Artifacts" no se muestra en algunos casos**
- **Causa**: `activeCaseData` puede no incluir `artifacts` si falla el fetch
- **Mitigación**: `ArtifactsList` maneja `loading` y `null` states correctamente
- **Precaución**: Verificar que endpoint `/api/cases/[id]` siempre incluye `artifacts`

#### **RIESGO 2: Endpoint Storage rompe acceso a archivos existentes**
- **Causa**: Validación de `org_id` puede bloquear paths antiguos
- **Mitigación**: Validación solo aplica a paths con formato `artifacts/{org_id}/...`
- **Precaución**: Probar con archivos antiguos antes de deploy

#### **RIESGO 3: Seed script falla en producción**
- **Causa**: `SUPABASE_SERVICE_ROLE_KEY` puede no estar disponible
- **Mitigación**: Manejo graceful con warnings, no bloquea seed
- **Precaución**: Documentar claramente en `.env.example`

#### **RIESGO 4: Índices duplicados causan errores**
- **Causa**: Migración ejecutada dos veces
- **Mitigación**: Usar `IF NOT EXISTS` en todos los índices
- **Precaución**: Verificar índices existentes antes de crear

---

## 📝 CONCLUSIÓN

Este plan proporciona implementaciones detalladas y seguras que:
- ✅ **Reutilizan código existente** (máxima eficiencia)
- ✅ **No rompen funcionalidades** (análisis exhaustivo de dependencias)
- ✅ **Mantienen consistencia** (panel derecho constante)
- ✅ **Siguen principios** (reutilización, arquitectura dual, estado unidireccional)
- ✅ **Son exhaustivas** (precauciones en cada paso)

**Estado**: ✅ LISTO PARA IMPLEMENTACIÓN  
**Recomendación**: 🚀 PROCEDER CON FASE 2 (Tab Artifacts) PRIMERO

