# 🧹 Guía Paso a Paso - Limpieza de Caché del Navegador

**Problema**: Errores persisten después de corregir código debido a caché del navegador  
**Solución**: Forzar descarga de chunks nuevos del servidor

---

## 🎯 Método 1: Hard Refresh (RÁPIDO - 30 segundos)

### Paso 1: Abrir DevTools

1. Abre tu navegador (Chrome, Firefox, Edge)
2. Presiona `F12` o `Ctrl + Shift + I` (Mac: `Cmd + Option + I`)
3. Se abrirá el panel de DevTools

### Paso 2: Activar "Disable Cache"

1. En DevTools, ve a la pestaña **Network** (Red)
2. En la parte superior, marca la casilla **"Disable cache"** ✅
   - Esta opción solo funciona mientras DevTools está abierto
   - Es la forma más rápida de deshabilitar caché temporalmente

### Paso 3: Hard Refresh

**Chrome/Edge/Firefox (Windows/Linux)**:
- Presiona `Ctrl + Shift + R`
- O `Ctrl + F5`

**Chrome/Edge/Firefox (Mac)**:
- Presiona `Cmd + Shift + R`

**Safari (Mac)**:
- Presiona `Cmd + Option + E` (limpiar caché)
- Luego `Cmd + R` (recargar)

### Paso 4: Verificar

1. Ve a la pestaña **Console** en DevTools
2. Verifica que NO aparezca el error `Object.defineProperty called on non-object`
3. Si el error persiste, continúa con el Método 2

---

## 🔥 Método 2: Limpieza Completa de Caché (COMPLETO - 2 minutos)

### Chrome / Edge (Chromium)

#### Opción A: Desde Configuración

1. Abre Chrome
2. Presiona `Ctrl + Shift + Delete` (Mac: `Cmd + Shift + Delete`)
3. Se abrirá la ventana "Borrar datos de navegación"
4. En **"Rango de tiempo"**, selecciona **"Todo el tiempo"**
5. Marca SOLO:
   - ✅ **"Imágenes y archivos en caché"**
   - ❌ Desmarca todo lo demás (cookies, historial, etc.)
6. Haz clic en **"Borrar datos"**
7. Espera a que termine (puede tardar 30-60 segundos)
8. Cierra y reabre Chrome completamente

#### Opción B: Desde URL

1. Abre una nueva pestaña
2. Escribe en la barra de direcciones: `chrome://settings/clearBrowserData`
3. Presiona Enter
4. Sigue los pasos de la Opción A (pasos 4-8)

### Firefox

1. Abre Firefox
2. Presiona `Ctrl + Shift + Delete` (Mac: `Cmd + Shift + Delete`)
3. Se abrirá la ventana "Limpiar datos recientes"
4. En **"Rango de tiempo"**, selecciona **"Todo"**
5. Marca SOLO:
   - ✅ **"Caché"**
   - ❌ Desmarca todo lo demás
6. Haz clic en **"Limpiar ahora"**
7. Cierra y reabre Firefox completamente

### Safari (Mac)

1. Abre Safari
2. Menú **Safari** → **Preferencias** → **Avanzado**
3. Marca **"Mostrar el menú Desarrollo en la barra de menús"**
4. Menú **Desarrollo** → **Vaciar cachés**
5. Cierra y reabre Safari completamente

---

## 🚀 Método 3: Navegador en Modo Limpio (MÁXIMO - 5 minutos)

### Paso 1: Cerrar TODOS los Navegadores

1. Cierra **TODAS** las ventanas del navegador
2. Verifica en el Administrador de Tareas que no queden procesos:
   - Windows: `Ctrl + Shift + Esc` → Buscar "chrome.exe" o "firefox.exe"
   - Mac: `Cmd + Option + Esc` → Seleccionar navegador → Forzar salida

### Paso 2: Limpiar Caché del Sistema

**Windows**:
```powershell
# Abre PowerShell como Administrador
# Navega a la carpeta de caché de Chrome
cd "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache"
# Elimina todo
Remove-Item * -Recurse -Force
```

**Mac**:
```bash
# Abre Terminal
# Elimina caché de Chrome
rm -rf ~/Library/Caches/Google/Chrome/*
# Elimina caché de Firefox
rm -rf ~/Library/Caches/Firefox/*
```

**Linux**:
```bash
# Elimina caché de Chrome
rm -rf ~/.cache/google-chrome/*
# Elimina caché de Firefox
rm -rf ~/.cache/mozilla/firefox/*
```

### Paso 3: Reiniciar Servidor de Desarrollo

```bash
# En tu terminal del proyecto
cd /home/liones_messi/Documentos/trabajo/Briki

# Matar servidor si está corriendo
pkill -f "next dev"

# Limpiar .next/
rm -rf .next/

# Reiniciar servidor
pnpm dev
```

### Paso 4: Abrir Navegador Limpio

1. Abre el navegador (debe estar completamente cerrado)
2. Abre una ventana **incógnito/privada**:
   - Chrome: `Ctrl + Shift + N` (Mac: `Cmd + Shift + N`)
   - Firefox: `Ctrl + Shift + P` (Mac: `Cmd + Shift + P`)
   - Edge: `Ctrl + Shift + N` (Mac: `Cmd + Shift + N`)
3. Ve a `http://localhost:3000`
4. Abre DevTools (`F12`)
5. Ve a **Network** → Marca **"Disable cache"**
6. Recarga la página (`Ctrl + R`)

---

## ✅ Verificación Post-Limpieza

### Test 1: Verificar que el Error Desapareció

1. Abre DevTools (`F12`)
2. Ve a la pestaña **Console**
3. **NO debe aparecer**: `Object.defineProperty called on non-object`
4. Si aparece, continúa con el Método 3

### Test 2: Verificar que los Chunks se Descargaron

1. En DevTools, ve a la pestaña **Network**
2. Recarga la página (`Ctrl + R`)
3. Filtra por **"JS"** (archivos JavaScript)
4. Busca chunks con nombres como: `_app-pages-browser_..._PdfViewer_...js`
5. Haz clic en uno de estos archivos
6. Verifica en la pestaña **Headers**:
   - **Status Code**: Debe ser `200` (no `304 Not Modified`)
   - **Size**: Debe mostrar tamaño real (no "disk cache")
   - **Time**: Debe mostrar tiempo de descarga (no `0ms`)

### Test 3: Validar Funcionalidad

1. Ve a un caso histórico en la aplicación
2. Tab **"Pólizas"** → Haz clic en **"Ver en PDF"**
3. Cambia al tab **"Análisis"**
4. **Debe aparecer**: "Cargando análisis..." brevemente
5. **Luego debe cargar**: El PDF con highlights
6. **NO debe aparecer**: Error en Console

---

## 🔄 Prevención Futura

### Durante Desarrollo (SIEMPRE)

1. **Mantén DevTools abierto** con **"Disable cache"** activado
2. **Hard refresh** después de:
   - Cambios en código
   - Reinstalar dependencias
   - Cambiar ramas de Git
   - Eliminar `.next/`

### Semanalmente

1. Limpia caché completo del navegador (Método 2)
2. Reinicia el servidor de desarrollo
3. Valida que todo funciona correctamente

### Antes de PRs Críticos

1. Ejecuta el Método 3 (Navegador en Modo Limpio)
2. Valida funcionalidad completa
3. Documenta cualquier comportamiento inesperado

---

## 🆘 Si Nada Funciona

### Último Recurso: Forzar Nuevo Hash

Si después de todos los métodos el error persiste, el problema puede ser que el hash del chunk no cambió porque el archivo fuente no cambió. En este caso:

1. **Contacta al equipo** con:
   - Screenshot del error
   - Hash del chunk problemático (visible en Network tab)
   - Timestamp del archivo en `.next/static/chunks/`

2. **Solución temporal**: Modificar levemente el archivo fuente para forzar nuevo hash:
   ```typescript
   // Añadir comentario al inicio del archivo
   // Build timestamp: 2025-11-16 12:52
   ```

3. **Recompilar**: `pnpm dev:clean`

---

## 📝 Notas Importantes

### ⚠️ Modo Incógnito NO ES Suficiente

- Modo incógnito solo aísla cookies e historial
- **NO aísla el caché de recursos estáticos**
- Siempre usa Hard Refresh + "Disable cache"

### ⚠️ Cerrar Solo la Pestaña NO Es Suficiente

- El navegador mantiene procesos en segundo plano
- **Cierra TODAS las ventanas** del navegador
- Verifica en el Administrador de Tareas

### ⚠️ `rm -rf .next/` NO Afecta al Navegador

- Limpia el caché del servidor
- **NO comunica al navegador** que invalide su caché
- Siempre combina con limpieza del navegador

---

## 🔗 Referencias

- [Documentación completa](./TROUBLESHOOTING.md)
- [Chrome DevTools - Network](https://developer.chrome.com/docs/devtools/network/)
- [Next.js - Caching](https://nextjs.org/docs/app/building-your-application/caching)

---

**¿Este problema persiste después de seguir todos los métodos?**  
Por favor, reporta el issue con:
1. Navegador y versión
2. Screenshot del error
3. Hash del chunk problemático
4. Logs del servidor

