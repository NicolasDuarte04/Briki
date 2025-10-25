# PLAN DE RESOLUCIÓN INTEGRAL - ERRORES CRÍTICOS BRIKI
**Fecha**: 2025-01-25  
**Desarrollador**: FullStack Senior AI Assistant  
**Objetivo**: Resolver errores críticos de chunk loading, bucles infinitos y acceso al LandingPage

---

## 📋 RESUMEN EJECUTIVO

### PROBLEMAS IDENTIFICADOS

1. **ERROR DE CHUNK LOADING**
   - Archivo: `src/app/[locale]/(app)/agent/[threadId]/page.tsx`
   - Error: `Loading chunk app/[locale]/(app)/agent/[threadId]/page failed`
   - Causa: Problema de resolución de módulos en tiempo de ejecución

2. **BUCLE INFINITO DE REACT**
   - Archivo: `src/components/ui/select.tsx` (línea 36)
   - Error: `Maximum update depth exceeded`
   - Causa: Re-renderizado infinito en componente Select

3. **ACCESO AL LANDINGPAGE BLOQUEADO**
   - Problema: Usuarios logueados no pueden acceder al LandingPage
   - Causa: Middleware redirige automáticamente al Dashboard
   - Solución requerida: Acceso vía logo en panel izquierdo

---

## 🔍 ANÁLISIS DETALLADO DE CAUSAS

### 1. ERROR DE CHUNK LOADING

**Causa Raíz**:
- El componente `HomeClient` está siendo renderizado desde un Server Component
- El dynamic import de `ConversationPane` no se está resolviendo correctamente
- Problema de hidratación entre Server y Client Components

**Archivos Involucrados**:
- `src/app/[locale]/(app)/agent/[threadId]/page.tsx` (Server Component)
- `src/components/HomeClient.tsx` (Client Component)
- `src/components/Chat/ConversationPane.tsx` (Dynamic Import)

**Flujo Problemático**:
```
AgentThreadPage (Server) → HomeClient (Client) → ConversationPane (Dynamic)
```

### 2. BUCLE INFINITO DE REACT

**Causa Raíz**:
- El componente `Select` está causando re-renderizados infinitos
- Problema en la gestión de refs en `@radix-ui/react-compose-refs`
- El componente `BriefForm` está siendo re-renderizado constantemente

**Archivos Involucrados**:
- `src/components/ui/select.tsx` (SelectTrigger)
- `src/components/Cases/BriefForm.tsx` (Uso del Select)
- `src/components/Workspace/CaseBriefForm.tsx` (Wrapper del BriefForm)

**Flujo Problemático**:
```
BriefForm → Select → SelectTrigger → Re-renderizado infinito
```

### 3. ACCESO AL LANDINGPAGE BLOQUEADO

**Causa Raíz**:
- El middleware redirige automáticamente a usuarios logueados al Dashboard
- No hay mecanismo para acceder al LandingPage desde el panel izquierdo
- El logo de Briki no tiene funcionalidad de navegación

**Archivos Involucrados**:
- `src/middleware.ts` (Lógica de redirección)
- `src/components/BrikiSidebar.tsx` (Logo sin funcionalidad)
- `src/components/SidebarNav.tsx` (Navegación del sidebar)

---

## 🎯 PLAN DE RESOLUCIÓN INTEGRAL

### FASE 1: RESOLUCIÓN DE ERROR DE CHUNK LOADING

#### 1.1 Análisis del Problema
- **Archivo**: `src/app/[locale]/(app)/agent/[threadId]/page.tsx`
- **Problema**: Server Component renderizando Client Component con dynamic import
- **Solución**: Convertir a Client Component o usar Suspense

#### 1.2 Implementación
```typescript
// Opción A: Convertir a Client Component
"use client";
import { useEffect, useState } from "react";
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import HomeClient from '@/components/HomeClient';

export default function AgentThreadPage({ params }: { params: Promise<{ threadId: string; locale: string }> }) {
  const [isReady, setIsReady] = useState(false);
  const [currentOrg, setCurrentOrg] = useState(null);
  
  useEffect(() => {
    const init = async () => {
      const org = await getCurrentOrg();
      setCurrentOrg(org.currentOrg);
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) return <div>Cargando...</div>;
  
  return <HomeClient initialStep="conversation" />;
}

// Opción B: Usar Suspense
import { Suspense } from "react";
import HomeClient from '@/components/HomeClient';

export default function AgentThreadPage({ params }: { params: Promise<{ threadId: string; locale: string }> }) {
  return (
    <Suspense fallback={<div>Cargando agente...</div>}>
      <HomeClient initialStep="conversation" />
    </Suspense>
  );
}
```

#### 1.3 Verificación
- [ ] Chunk loading funciona correctamente
- [ ] No hay errores de hidratación
- [ ] El agente se carga sin problemas

### FASE 2: RESOLUCIÓN DE BUCLE INFINITO

#### 2.1 Análisis del Problema
- **Archivo**: `src/components/ui/select.tsx`
- **Problema**: Re-renderizado infinito en SelectTrigger
- **Causa**: Gestión incorrecta de refs en Radix UI

#### 2.2 Implementación
```typescript
// src/components/ui/select.tsx
import React, { forwardRef } from "react";
import { SelectPrimitive } from "@radix-ui/react-select";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

const SelectTrigger = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    size?: "sm" | "default"
  }
>(({ className, children, size, ...props }, ref) => {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});

SelectTrigger.displayName = "SelectTrigger";

export { SelectTrigger };
```

#### 2.3 Optimización del BriefForm
```typescript
// src/components/Cases/BriefForm.tsx
import React, { useCallback, useMemo } from "react";

const BriefForm = React.memo(({ onSubmit, initialData }: BriefFormProps) => {
  const [formData, setFormData] = useState(initialData);
  
  const updateField = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  }, [formData, onSubmit]);
  
  // Memoizar opciones para evitar re-renderizados
  const insuranceCategories = useMemo(() => INSURANCE_CATEGORIES, []);
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resto del formulario */}
    </form>
  );
});

BriefForm.displayName = "BriefForm";
export default BriefForm;
```

#### 2.4 Verificación
- [ ] No hay bucles infinitos de re-renderizado
- [ ] El componente Select funciona correctamente
- [ ] El BriefForm se renderiza sin problemas

### FASE 3: RESOLUCIÓN DE ACCESO AL LANDINGPAGE

#### 3.1 Análisis del Problema
- **Archivo**: `src/middleware.ts`
- **Problema**: Redirección automática al Dashboard para usuarios logueados
- **Solución**: Permitir acceso al LandingPage vía parámetro o ruta específica

#### 3.2 Implementación del Middleware
```typescript
// src/middleware.ts
export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  const { pathname } = request.nextUrl;

  // Strip locale prefix if present to check the actual path
  const pathWithoutLocale = pathname.replace(/^\/(es|en)/, '') || '/';
  
  // Extract locale from pathname for redirection
  const localeMatch = pathname.match(/^\/(es|en)/);
  const locale = (localeMatch ? localeMatch[1] : 'es') as Locale;

  // Check for ?landing=1 bypass parameter
  const bypassLanding = request.nextUrl.searchParams.get('landing') === '1';
  
  // Check for /landing route
  const isLandingRoute = pathWithoutLocale === '/landing';

  // Public paths that are always accessible
  const publicPaths = [
    '/',
    '/landing', // ← NUEVA RUTA PARA LANDINGPAGE
    '/login',
    '/register',
    '/auth/verify',
    '/auth/callback',
    '/auth/error',
    '/auth/update-password',
  ];

  // Check if the path is explicitly public
  const isPublicPath = publicPaths.some(
    (path) => pathWithoutLocale === path || pathWithoutLocale.startsWith(path + '/')
  );

  // If it's a public path, check for authentication redirect
  if (isPublicPath) {
    // For marketing root paths (/, /es, /en), check if user is authenticated
    const isMarketingRoot = pathWithoutLocale === '/';
    
    if (isMarketingRoot && !bypassLanding && !isLandingRoute) {
      // Create Supabase client to check authentication
      const supabase = createServerClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              response.cookies.set({ name, value, ...options });
            },
            remove(name: string, options: CookieOptions) {
              response.cookies.set({ name, value: '', ...options });
            },
          },
        }
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // If user is authenticated, redirect to dashboard
      if (user) {
        const dashboardUrl = getDashboardHome(locale);
        return NextResponse.redirect(new URL(dashboardUrl, request.url));
      }
    }

    return response;
  }

  // Resto del middleware...
}
```

#### 3.3 Implementación del Logo Funcional
```typescript
// src/components/BrikiSidebar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BrikiSidebar() {
  const pathname = usePathname();
  
  const handleLogoClick = () => {
    // Si estamos en el workspace, ir al landing
    if (pathname.includes('/workspace') || pathname.includes('/dashboard')) {
      window.location.href = '/landing';
    } else {
      // Si estamos en el agente, ir al dashboard
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="flex h-16 items-center px-4">
      <button
        onClick={handleLogoClick}
        className="flex items-center space-x-2"
      >
        <Image
          src="/brand/briki-logo-2.png"
          alt="Briki"
          width={32}
          height={32}
          className="h-8 w-8"
        />
        <span className="text-xl font-bold">Briki</span>
      </button>
    </div>
  );
}
```

#### 3.4 Creación de Ruta de LandingPage
```typescript
// src/app/[locale]/(marketing)/landing/page.tsx
import Landing from "@/components/Landing";

export default function LandingPage() {
  return <Landing />;
}
```

#### 3.5 Verificación
- [ ] Usuarios logueados pueden acceder al LandingPage vía logo
- [ ] El middleware no bloquea la ruta /landing
- [ ] La navegación funciona correctamente

### FASE 4: IMPLEMENTACIÓN DE MENSAJE INICIAL DEL AGENTE

#### 4.1 Análisis del Problema
- **Requerimiento**: Mensaje hardcodeado cuando se accede al agente desde el panel izquierdo
- **Problema**: El mensaje inicial no se está estableciendo correctamente
- **Solución**: Mejorar la lógica de mensaje inicial en HomeClient

#### 4.2 Implementación
```typescript
// src/components/HomeClient.tsx
export default function HomeClient({ initialStep }: { initialStep: UIStep }) {
  const { setStep, setInitialMessage, initialMessage } = useUI();
  
  // --- MENSAJE INICIAL DEL AGENTE ---
  useEffect(() => {
    // Establecer mensaje inicial cuando se accede al agente desde el panel lateral
    if (initialStep === "conversation" && !initialMessage) {
      const welcomeMessage = "Hola, estoy aquí para ayudarte con este caso. ¿En qué puedo asistirte?";
      setInitialMessage(welcomeMessage);
    }
  }, [initialStep, initialMessage, setInitialMessage]);

  // Resto del componente...
}
```

#### 4.3 Verificación
- [ ] El mensaje inicial se muestra cuando se accede desde el panel izquierdo
- [ ] No interfiere con el flujo normal del LandingPage
- [ ] El mensaje se establece correctamente

---

## 🔧 IMPLEMENTACIÓN TÉCNICA DETALLADA

### 1. ESTRUCTURA DE ARCHIVOS A MODIFICAR

```
src/
├── app/
│   └── [locale]/
│       ├── (app)/
│       │   └── agent/
│       │       └── [threadId]/
│       │           └── page.tsx ← CONVERTIR A CLIENT COMPONENT
│       └── (marketing)/
│           └── landing/
│               └── page.tsx ← NUEVO ARCHIVO
├── components/
│   ├── ui/
│   │   └── select.tsx ← OPTIMIZAR REFS
│   ├── Cases/
│   │   └── BriefForm.tsx ← MEMOIZAR COMPONENTE
│   └── BrikiSidebar.tsx ← AGREGAR FUNCIONALIDAD DE LOGO
├── middleware.ts ← AGREGAR RUTA /landing
└── lib/
    └── ui/
        └── state.ts ← VERIFICAR LÓGICA DE MENSAJE INICIAL
```

### 2. DEPENDENCIAS Y CONFIGURACIONES

#### 2.1 Next.js Configuration
```typescript
// next.config.ts
const nextConfig = {
  experimental: {
    optimizeCss: true,
  },
  webpack: (config) => {
    // Optimización para dynamic imports
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: -10,
          chunks: 'all',
        },
      },
    };
    return config;
  },
};
```

#### 2.2 TypeScript Configuration
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "figmalanding"]
}
```

### 3. TESTING Y VERIFICACIÓN

#### 3.1 Checklist de Funcionalidad
- [ ] **Chunk Loading**: El agente se carga sin errores de chunk
- [ ] **Bucle Infinito**: No hay re-renderizados infinitos en Select
- [ ] **Acceso LandingPage**: Usuarios logueados pueden acceder vía logo
- [ ] **Mensaje Inicial**: Se muestra mensaje hardcodeado al acceder al agente
- [ ] **Navegación**: El logo funciona correctamente en ambos contextos
- [ ] **Performance**: No hay degradación en el rendimiento

#### 3.2 Testing de Integración
```typescript
// tests/integration/agent-flow.test.ts
describe('Agent Flow Integration', () => {
  test('should load agent without chunk loading errors', async () => {
    // Test chunk loading
  });
  
  test('should not cause infinite re-renders in Select', async () => {
    // Test infinite loop prevention
  });
  
  test('should allow access to LandingPage from logo', async () => {
    // Test LandingPage access
  });
  
  test('should show initial message when accessing agent', async () => {
    // Test initial message
  });
});
```

---

## 📊 DIAGRAMA DE FLUJO DE RESOLUCIÓN

```
┌─────────────────────────────────────────────────────────────┐
│                    PROBLEMA INICIAL                        │
├─────────────────────────────────────────────────────────────┤
│ • Chunk loading error en agent/[threadId]                  │
│ • Bucle infinito en Select component                       │
│ • Acceso bloqueado al LandingPage                          │
│ • Mensaje inicial del agente no funciona                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    FASE 1: CHUNK LOADING                   │
├─────────────────────────────────────────────────────────────┤
│ • Convertir AgentThreadPage a Client Component             │
│ • Implementar Suspense para dynamic imports                │
│ • Optimizar webpack configuration                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    FASE 2: BUCLE INFINITO                  │
├─────────────────────────────────────────────────────────────┤
│ • Optimizar SelectTrigger con forwardRef                   │
│ • Memoizar BriefForm component                             │
│ • Implementar useCallback para handlers                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    FASE 3: ACCESO LANDING                  │
├─────────────────────────────────────────────────────────────┤
│ • Agregar ruta /landing al middleware                      │
│ • Implementar funcionalidad de logo                        │
│ • Crear página de LandingPage dedicada                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    FASE 4: MENSAJE INICIAL                 │
├─────────────────────────────────────────────────────────────┤
│ • Mejorar lógica de mensaje inicial en HomeClient          │
│ • Implementar detección de acceso desde panel izquierdo    │
│ • Verificar funcionamiento end-to-end                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    RESULTADO FINAL                         │
├─────────────────────────────────────────────────────────────┤
│ ✅ Agente funciona sin errores de chunk loading            │
│ ✅ No hay bucles infinitos de re-renderizado               │
│ ✅ Acceso completo al LandingPage desde logo               │
│ ✅ Mensaje inicial del agente funciona correctamente       │
│ ✅ Navegación fluida entre todas las secciones             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 PRINCIPIOS DE IMPLEMENTACIÓN

### 1. REUTILIZACIÓN MÁXIMA DEL CÓDIGO EXISTENTE
- Mantener toda la lógica de negocio existente
- Reutilizar componentes y hooks ya implementados
- Preservar la arquitectura dual del proyecto

### 2. MANTENIMIENTO DE LA ARQUITECTURA DUAL
- No alterar la estructura de Server/Client Components
- Mantener la separación entre flujo del agente y workspace
- Preservar la integración entre ambas arquitecturas

### 3. CONSISTENCIA DE ESTADO UNIDIRECCIONAL
- Mantener el flujo de datos unidireccional
- Preservar la gestión de estado con Zustand
- No introducir dependencias circulares

### 4. SEPARACIÓN CLARA DE RESPONSABILIDADES
- Cada componente mantiene su responsabilidad específica
- No mezclar lógica de diferentes capas
- Mantener la separación de concerns

---

## 📝 NOTAS DE IMPLEMENTACIÓN

### 1. ORDEN DE IMPLEMENTACIÓN
1. **Fase 1**: Resolver chunk loading (crítico)
2. **Fase 2**: Resolver bucle infinito (crítico)
3. **Fase 3**: Implementar acceso al LandingPage (funcionalidad)
4. **Fase 4**: Mejorar mensaje inicial del agente (mejora)

### 2. CONSIDERACIONES DE PERFORMANCE
- Usar `React.memo` para componentes pesados
- Implementar `useCallback` para handlers
- Optimizar dynamic imports con loading states
- Minimizar re-renderizados innecesarios

### 3. CONSIDERACIONES DE UX
- Mostrar loading states durante la carga
- Mantener transiciones suaves
- Preservar el estado del usuario
- Proporcionar feedback visual claro

### 4. CONSIDERACIONES DE TESTING
- Probar cada fase individualmente
- Verificar integración end-to-end
- Validar performance después de cambios
- Confirmar que no se introducen regresiones

---

## 🔮 FUTURAS MEJORAS

### 1. OPTIMIZACIONES ADICIONALES
- Implementar lazy loading más granular
- Optimizar bundle splitting
- Mejorar caching de componentes
- Implementar preloading inteligente

### 2. FUNCIONALIDADES ADICIONALES
- Historial de navegación en el logo
- Breadcrumbs para navegación
- Shortcuts de teclado para navegación
- Modo offline para componentes críticos

### 3. MONITOREO Y OBSERVABILIDAD
- Implementar logging de errores
- Monitorear performance de chunks
- Tracking de uso de funcionalidades
- Alertas automáticas de errores

---

**FIN DEL PLAN DE RESOLUCIÓN INTEGRAL**

Este documento debe actualizarse conforme se implementen las soluciones y se descubran nuevos problemas o mejoras.
