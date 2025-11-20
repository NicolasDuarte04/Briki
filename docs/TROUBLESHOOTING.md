# 🔧 Troubleshooting Guide - Briki

**Última actualización**: 16 de Noviembre, 2025  
**Versión**: 1.0.0

---

## 📋 Tabla de Contenidos

1. [Problemas de Caché del Navegador](#problemas-de-caché-del-navegador)
2. [Errores de SSR con pdfjs-dist](#errores-de-ssr-con-pdfjs-dist)
3. [Scripts de Limpieza](#scripts-de-limpieza)
4. [Proceso de Validación Post-Cambio](#proceso-de-validación-post-cambio)
5. [Conocimientos Fundamentales](#conocimientos-fundamentales)

---

## 🚨 Problemas de Caché del Navegador

### Síntomas

- ✅ Cambios en código no se reflejan después de reiniciar servidor
- ✅ Errores persisten aunque el código esté corregido
- ✅ Comportamiento inconsistente entre desarrolladores
- ✅ Chunks con hash idéntico pero contenido diferente
- ✅ Errores de `Object.defineProperty called on non-object` que persisten

### Causa Raíz

El problema **NO es un error de implementación**, sino un comportamiento esperado del sistema de caché del navegador:

1. **Content-Based Hashing**: Next.js/Webpack genera hashes basados en el contenido del archivo
2. **Si el archivo NO cambia**: El hash permanece idéntico
3. **Navegador ve hash conocido**: Usa versión del caché disk en lugar de descargar nueva
4. **Resultado**: Código nuevo en servidor, pero navegador usa versión vieja

### Ejemplo Real

```
12:24 → Modificas: src/app/[locale]/test/analysis/page.tsx
12:45 → Servidor recompila: .next/ regenerado
12:52 → Chunk PdfViewer: Hash 6c89a05d88fd597c (MISMO que antes)
        └─ Porque PdfViewer.tsx NO cambió, solo su dependiente

Navegador: "Ya tengo 6c89a05d88fd597c.js en caché"
         → NO descarga del servidor
         → Usa versión VIEJA del caché
         → Error persiste
```

### Solución Inmediata

Ver sección: [Guía Paso a Paso - Limpieza de Caché](#guía-paso-a-paso---limpieza-de-caché)

### Prevención

1. **Durante Desarrollo**: Siempre tener "Disable cache" activado en DevTools
2. **Después de cambios críticos**: Hard refresh (`Ctrl + Shift + R`)
3. **Semanalmente**: Limpiar caché completo del navegador
4. **Antes de marcar tarea como "Done"**: Validar en entorno limpio

---

## ⚠️ Errores de SSR con pdfjs-dist

### Síntomas

```
Object.defineProperty called on non-object
src/app/layout.tsx (249:9) @ RootLayout
```

### Causa Raíz

`pdfjs-dist` (dependencia de `react-pdf`) **NO es compatible con Server-Side Rendering (SSR)**. Cuando Next.js intenta renderizar componentes que usan `pdfjs-dist` en el servidor, falla porque:

1. `pdfjs-dist` asume un entorno de navegador (window, document, etc.)
2. Next.js SSR ejecuta código en Node.js (sin window)
3. `Object.defineProperty` falla porque el objeto no existe en el contexto de Node.js

### Solución Implementada

**Import dinámico con `ssr: false`**:

```typescript
// ✅ CORRECTO
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(
  () => import('./PdfViewer').then(mod => ({ default: mod.PdfViewer })),
  {
    ssr: false,  // ← CRÍTICO: No renderizar en servidor
    loading: () => <div>Cargando...</div>
  }
);
```

### Archivos que DEBEN usar import dinámico

1. ✅ `src/components/Analysis/AnalysisTab.tsx` → PdfViewer dinámico
2. ✅ `src/components/Workspace/Tabs.tsx` → AnalysisTab dinámico
3. ✅ `src/app/[locale]/test/analysis/page.tsx` → AnalysisTab dinámico

### Verificación

Si el error persiste después de aplicar imports dinámicos:

1. **Verificar que TODOS los imports sean dinámicos** (ver lista arriba)
2. **Limpiar caché del navegador** (ver sección de caché)
3. **Eliminar `.next/` y recompilar**: `pnpm dev:clean`
4. **Verificar que no haya imports estáticos** en otros archivos

---

## 🧹 Scripts de Limpieza

### Scripts Disponibles

```bash
# Limpiar solo .next/ (rápido)
pnpm dev:clean

# Limpiar todo (lento, pero completo)
pnpm clean:all  # (ver package.json para implementar)

# Limpiar y reinstalar dependencias
rm -rf node_modules .next node_modules/.cache
pnpm install
pnpm dev
```

### Cuándo Usar Cada Script

| Script | Cuándo Usar | Tiempo |
|--------|-------------|--------|
| `pnpm dev:clean` | Cambios en código, errores de compilación | ~5s |
| `rm -rf .next` | Errores persistentes, cambios en config | ~5s |
| `pnpm clean:all` | Cambios en dependencias, errores críticos | ~2min |

---

## ✅ Proceso de Validación Post-Cambio

### Checklist Pre-Commit

Antes de marcar una tarea como "Done":

- [ ] Código compila sin errores (`pnpm typecheck`)
- [ ] Linter pasa (`pnpm lint`)
- [ ] Hard refresh en navegador (`Ctrl + Shift + R`)
- [ ] DevTools → Network → "Disable cache" activado
- [ ] Testear funcionalidad completa
- [ ] Verificar que no hay errores en Console

### Checklist Pre-PR

Antes de crear Pull Request:

- [ ] Todos los tests pasan
- [ ] Documentación actualizada (si aplica)
- [ ] Changelog actualizado (si aplica)
- [ ] Validado en entorno limpio (ver abajo)

### Validación en Entorno Limpio

**Frecuencia**: Antes de PRs críticos o cambios en arquitectura

```bash
# 1. Cerrar TODOS los navegadores
# 2. Limpiar completamente
rm -rf .next node_modules/.cache

# 3. Reiniciar servidor
pnpm dev

# 4. Abrir navegador en incógnito
# 5. Testear funcionalidad completa
```

---

## 📚 Conocimientos Fundamentales

### ¿Por Qué el Hash No Cambia?

**Content-Based Hashing**:

```
Archivo original → Hash del contenido → Nombre del chunk
PdfViewer.tsx    → 6c89a05d88fd597c → _app-pages-browser_..._6c89a05d88fd597c.js
```

**CRÍTICO**: El hash se calcula **solo del archivo fuente**, NO de sus dependientes.

**Ejemplo**:
```
ANTES:
PdfViewer.tsx (contenido X) → Hash: 6c89a05d88fd597c

DESPUÉS (modificas page.tsx, NO PdfViewer.tsx):
PdfViewer.tsx (contenido X) → Hash: 6c89a05d88fd597c
                              ↑
                        ¡MISMO CONTENIDO!
```

### El Ciclo Vicioso del Caché

```
1. Developer: "Hice cambios, reinicié servidor"
   └─ Expectativa: Todo nuevo ✅

2. Servidor: "Compilé correctamente"
   └─ Realidad: Chunk regenerado con mismo hash ✅

3. Navegador: "No necesito descargar nada"
   └─ Realidad: Usa versión VIEJA del caché ❌

4. Developer: "¿Por qué el error persiste?"
   └─ Conclusión errónea: "El servidor no recompiló"
```

### Por Qué Next.js No Resuelve Esto

**Limitaciones Técnicas**:

1. **El servidor NO puede controlar el caché del navegador**
   - HTTP es stateless
   - Headers de caché son sugerencias, no órdenes
   - El navegador decide qué cachear y por cuánto tiempo

2. **Hot Module Replacement (HMR) tiene límites**
   - Solo funciona para módulos "hot-updatable"
   - NO puede forzar descarga de chunks ya cacheados
   - Requiere conexión WebSocket (puede fallar)

3. **Trade-off: Performance vs Freshness**
   - Cache agresivo = mejor performance
   - Sin cache = builds más lentos
   - Next.js optimiza para el caso común (funciona 95% del tiempo)

### Modo Incógnito NO ES Suficiente

**Concepto erróneo común**:
> "Si uso modo incógnito, no hay caché"

**Realidad**:
- ✅ Incógnito = sin cookies, sin historial
- ❌ **PERO**: Comparte el disk cache con ventanas normales
- ✅ Solo aísla datos de sesión, no recursos estáticos

**Solución**: Hard refresh + "Disable cache" en DevTools

---

## 🎯 Estrategias Preventivas

### Durante Desarrollo

#### 1. Configuración del Navegador

**DevTools → Network → "Disable cache"** (SIEMPRE activado durante desarrollo)

**Ventajas**:
- ✅ Fuerza descarga de todos los recursos
- ✅ Refleja cambios inmediatamente
- ✅ No afecta performance de producción

**Desventajas**:
- ⚠️ Debes recordar activarlo
- ⚠️ Solo funciona con DevTools abierto

#### 2. Hard Refresh Sistemático

**Después de**:
- Reinstalar dependencias (`pnpm install`)
- Cambiar ramas de Git con cambios en node_modules
- Eliminar `.next/`
- Cambios en `next.config.js`

**Comando**: `Ctrl + Shift + R` (o `Cmd + Shift + R` en Mac)

#### 3. Limpieza de Caché del Navegador

**Frecuencia Recomendada**: Semanal o cuando aparezcan comportamientos extraños

**Chrome**: `chrome://settings/clearBrowserData`
- ✅ Cached images and files
- ❌ Cookies (opcional, no necesario)

#### 4. Perfil de Desarrollo Separado

**Chrome**: Crear perfil "Development"
- ✅ Configuraciones específicas para dev
- ✅ Extensiones de desarrollo
- ✅ Caché independiente del perfil personal

### Arquitectura del Proyecto

#### 1. Documentación de "Known Issues"

Este documento (`TROUBLESHOOTING.md`) debe ser actualizado cuando:
- Se encuentren nuevos casos edge
- Se resuelvan problemas recurrentes
- Se cambien dependencias críticas (como `react-pdf`)

#### 2. Onboarding de Desarrolladores

**Incluir en proceso de onboarding**:
- ✅ Configuración inicial del navegador
- ✅ Extensiones recomendadas
- ✅ Shortcuts clave (hard refresh, DevTools)
- ✅ Scripts de limpieza

#### 3. Comunicación del Equipo

**Pull Request Guidelines**:

Cuando hacer PR que afecte chunks:
```markdown
⚠️ **IMPORTANT**: Este PR modifica componentes core.
Después de mergear:
1. Hard refresh (Ctrl + Shift + R)
2. Si usas Chrome, considera limpiar caché
```

**Mensajes de Commit Descriptivos**:
```bash
# ❌ MAL
fix: update component

# ✅ BIEN
fix(PdfViewer): resolve SSR compatibility with dynamic import

BREAKING CHANGE: PdfViewer now requires client-side rendering.
Developers must clear browser cache after pulling this change.
```

---

## 🔍 Debugging Avanzado

### Verificar Chunks en Servidor

```bash
# Ver chunks compilados
find .next/static/chunks -name "*PdfViewer*"

# Ver timestamps
ls -lah .next/static/chunks/*PdfViewer*

# Verificar hash
# El hash debe cambiar si el contenido del archivo cambió
```

### Verificar Caché del Navegador

**Chrome DevTools**:
1. Abrir DevTools (`F12`)
2. Pestaña **Application**
3. Sección **Cache Storage**
4. Buscar chunks con hash sospechoso
5. Eliminar manualmente si es necesario

### Network Tab - Verificar Requests

**Chrome DevTools → Network**:
1. Filtrar por "JS"
2. Buscar chunk con hash sospechoso
3. Verificar:
   - **Status**: ¿200 (servido desde caché) o 304 (Not Modified)?
   - **Size**: ¿"disk cache" o tamaño real?
   - **Time**: ¿0ms (desde caché) o tiempo de descarga?

---

## 📝 Notas Finales

### Este NO es un error de implementación

✅ El código está correcto (imports dinámicos aplicados)  
✅ El servidor recompiló correctamente  
✅ Los chunks se regeneraron correctamente  

❌ **El problema está en el caché del navegador**, que es:
- Fuera de control del servidor
- Diseñado para performance
- Esperado en entornos de desarrollo

### Es un problema de herramientas, no de arquitectura

Este tipo de issues son **normales** en desarrollo web moderno:
- Build tools complejos (Webpack, Turbopack)
- Optimizaciones agresivas (code splitting, hashing)
- Ambientes multi-capa (servidor, navegador, CDN)

### La Solución es Conocimiento + Proceso

No necesitas cambiar la arquitectura del proyecto, solo:
1. **Conocer** cómo funcionan los sistemas de caché
2. **Documentar** los casos edge que encuentres
3. **Establecer** procesos de validación
4. **Educar** al equipo sobre estas peculiaridades

---

## 🔗 Referencias

- [Next.js - Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import)
- [Webpack - Code Splitting](https://webpack.js.org/guides/code-splitting/)
- [MDN - HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
- [Chrome DevTools - Network](https://developer.chrome.com/docs/devtools/network/)

---

**¿Encontraste un problema no documentado aquí?**  
Por favor, actualiza este documento y comparte con el equipo.

