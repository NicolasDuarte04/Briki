# 📋 GUÍA: INTEGRACIÓN DE ADOBE PDF EMBED API

> **Fecha**: 2025-01-16  
> **Estado**: En progreso  
> **Objetivo**: Integrar Adobe PDF Embed API como alternativa/complemento a react-pdf

---

## 🎯 PASO 1: CONFIGURACIÓN DE DOMINIO EN ADOBE

### Dominios a Configurar

Cuando Adobe te pida especificar el dominio de uso, tienes varias opciones:

#### Opción 1: Solo "localhost" (RECOMENDADO PARA EMPEZAR)

Si la interfaz solo te permite un dominio, escribe:
```
localhost
```

**Nota**: Muchas veces Adobe acepta `localhost` y funciona para:
- ✅ `localhost` (sin puerto)
- ✅ `localhost:3000` (con puerto)
- ✅ `127.0.0.1` (equivalente)
- ✅ `127.0.0.1:3000`

#### Opción 2: Separados por Comas

Si el campo acepta múltiples valores, intenta:
```
localhost, localhost:3000, 127.0.0.1, 127.0.0.1:3000
```

O sin espacios:
```
localhost,localhost:3000,127.0.0.1,127.0.0.1:3000
```

#### Opción 3: Botón "Add Domain"

Si hay un botón "+" o "Add Domain", agrega cada uno por separado:
1. `localhost`
2. `localhost:3000`
3. `127.0.0.1`
4. `127.0.0.1:3000`

#### Opción 4: Editar Después

Si ya creaste la key con solo `localhost`:
1. Ve a la configuración de tu key en Adobe
2. Busca "Edit" o "Manage"
3. Agrega más dominios desde ahí

#### Producción (cuando despliegues)

Agrega estos dominios adicionales:
```
tu-dominio.com
www.tu-dominio.com
*.vercel.app  (si usas Vercel)
```

### ¿Por qué múltiples dominios?

- ✅ **localhost** y **localhost:3000**: Desarrollo local
- ✅ **127.0.0.1**: Alternativa a localhost (algunos navegadores)
- ✅ **Tu dominio de producción**: Para cuando despliegues
- ✅ **Wildcard *.vercel.app**: Si usas Vercel, cubre todos los previews

### Notas Importantes

1. **Puedes agregar múltiples dominios** en la misma key (después de crearla)
2. **No hay límite** de dominios por key (dentro de lo razonable)
3. **Puedes editar** los dominios después si necesitas agregar más
4. **Los cambios** pueden tardar unos minutos en aplicarse
5. **Solo "localhost" puede ser suficiente** para desarrollo local

---

## 🔑 PASO 2: OBTENER LA API KEY

Una vez configurados los dominios, Adobe te dará:

1. **Client ID (API Key)**: Algo como `abc123def456...`
2. **Documentación**: Link a la documentación de integración

**Guarda estos datos** - los necesitarás para la integración.

---

## 📦 PASO 3: CREAR TIPOS DE TYPESCRIPT

**Nota**: Adobe no publica tipos TypeScript oficiales, así que crearemos nuestros propios tipos.

**Archivo creado**: `src/types/adobe-pdf-embed.d.ts`

Este archivo ya está creado en el proyecto y proporciona todas las declaraciones de tipos necesarias para usar Adobe PDF Embed API con TypeScript.

**No necesitas instalar nada** - Adobe PDF Embed API se carga vía script tag.

---

## ⚙️ PASO 4: CONFIGURAR VARIABLES DE ENTORNO

Crea o actualiza tu archivo `.env.local`:

```bash
# Adobe PDF Embed API
NEXT_PUBLIC_ADOBE_PDF_CLIENT_ID=tu-client-id-aqui

# Opcional: Activar Adobe PDF Embed API (por defecto usa react-pdf)
NEXT_PUBLIC_USE_ADOBE_PDF=true
```

**Importante**: 
- El prefijo `NEXT_PUBLIC_` es necesario para que la variable sea accesible en el cliente
- NO subas este archivo a Git (debe estar en `.gitignore`)
- Si `NEXT_PUBLIC_USE_ADOBE_PDF` no está definido o es `false`, se usará `react-pdf` (comportamiento por defecto)

---

## 🔧 PASO 5: INTEGRAR EN EL LAYOUT

Actualizar `src/app/layout.tsx` para cargar el script de Adobe:

```tsx
// En el <head> del layout
<script
  type="text/javascript"
  src="https://documentcloud.adobe.com/view-sdk/viewer.js"
/>
```

---

## 📝 PASO 6: CREAR COMPONENTE ADOBE PDF VIEWER

Crear `src/components/Analysis/AdobePdfViewer.tsx`:

```tsx
"use client";

import { useEffect, useRef } from 'react';

interface AdobePdfViewerProps {
  pdfUrl: string;
  analysis?: PolicyAnalysis;
}

export function AdobePdfViewer({ pdfUrl, analysis }: AdobePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    const clientId = process.env.NEXT_PUBLIC_ADOBE_PDF_CLIENT_ID;
    if (!clientId) {
      console.error('Adobe PDF Client ID no configurado');
      return;
    }

    // Esperar a que el SDK de Adobe esté disponible
    const initializeViewer = () => {
      if (typeof (window as any).AdobeDC === 'undefined') {
        setTimeout(initializeViewer, 100);
        return;
      }

      const { AdobeDC } = window as any;
      const adobeDCView = new AdobeDC.View({
        clientId: clientId,
        divId: containerRef.current!.id,
      });

      adobeDCView.previewFile(
        {
          content: { location: { url: pdfUrl } },
          metaData: { fileName: 'Policy.pdf' },
        },
        {
          showAnnotationTools: true,
          showLeftHandPanel: true,
          showDownloadPDF: true,
          showPrintPDF: true,
        }
      );

      viewerRef.current = adobeDCView;
    };

    initializeViewer();

    return () => {
      if (viewerRef.current) {
        viewerRef.current = null;
      }
    };
  }, [pdfUrl]);

  return (
    <div
      id="adobe-dc-view"
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '600px' }}
    />
  );
}
```

---

## 🔄 PASO 7: ACTIVAR ADOBE PDF EMBED API

**✅ IMPLEMENTADO**: El toggle ya está integrado en `PdfViewer.tsx`

Para activar Adobe PDF Embed API, agrega en tu `.env.local`:

```bash
NEXT_PUBLIC_USE_ADOBE_PDF=true
```

**Comportamiento**:
- Si `NEXT_PUBLIC_USE_ADOBE_PDF=true` Y `NEXT_PUBLIC_ADOBE_PDF_CLIENT_ID` está configurado → Usa Adobe
- Si no → Usa react-pdf (comportamiento por defecto)

**Ventajas del toggle**:
- ✅ Puedes cambiar entre visores sin modificar código
- ✅ react-pdf como fallback si Adobe falla
- ✅ Fácil de probar ambos visores

---

## ✅ CHECKLIST DE INTEGRACIÓN

- [x] **Tipos TypeScript creados** (`src/types/adobe-pdf-embed.d.ts`)
- [x] **Script de Adobe agregado** en `layout.tsx`
- [x] **Componente `AdobePdfViewer` creado** (`src/components/Analysis/AdobePdfViewer.tsx`)
- [x] **Integrado en `PdfViewer`** con toggle automático
- [ ] Dominios configurados en Adobe (localhost, producción, etc.)
- [ ] Client ID obtenido de Adobe
- [ ] Variable `NEXT_PUBLIC_ADOBE_PDF_CLIENT_ID` en `.env.local` ✅ (ya configurado)
- [ ] Variable `NEXT_PUBLIC_USE_ADOBE_PDF=true` en `.env.local` (opcional, para activar)
- [ ] Probado en desarrollo local
- [ ] Probado en producción (cuando despliegues)

---

## 🎯 VENTAJAS DE ADOBE PDF EMBED API

✅ **Mejor rendimiento** para PDFs grandes  
✅ **Mejor calidad de renderizado**  
✅ **Herramientas de anotación** integradas  
✅ **Soporte para PDFs complejos** (formularios, 3D, etc.)  
✅ **Accesibilidad** mejorada  

## ⚠️ CONSIDERACIONES

⚠️ **Límites de uso**: Adobe tiene límites en el plan gratuito  
⚠️ **Dependencia externa**: Requiere conexión a internet  
⚠️ **Costo**: Puede tener costos en planes superiores  

---

## 📚 REFERENCIAS

- [Adobe PDF Embed API Documentation](https://developer.adobe.com/document-services/docs/overview/pdf-embed-api/)
- [Getting Started Guide](https://developer.adobe.com/document-services/docs/overview/pdf-embed-api/howtos/#getting-started)
- [API Reference](https://developer.adobe.com/document-services/docs/overview/pdf-embed-api/howtos/#api-reference)

---

**FIN DE LA GUÍA**

