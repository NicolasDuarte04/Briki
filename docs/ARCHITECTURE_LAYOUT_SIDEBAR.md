# Arquitectura del Layout Principal y Sidebar Interactivo

Este documento describe la estructura del layout principal de la aplicación Briki (sección autenticada) y la lógica del componente del sidebar interactivo.

## 1. Estructura del Layout Principal

La sección autenticada de la aplicación (`src/app/[locale]/(app)/*`) utiliza una estructura de layout unificada definida en `src/app/[locale]/(app)/layout.tsx`.

-   **Componente Raíz:** `(app)/layout.tsx`
-   **Wrapper Principal:** `<BrikiSidebarLayout>` (instancia única)
    -   **Prop `sidebar`:** Renderiza condicionalmente `SidebarNav` o `SidebarChatPanel` basado en el estado global `chatPanelOpen` (de Zustand `useUI`).
    -   **Prop `children`:** Renderiza el contenido específico de la página actual (ej., `HomeClient`, `CasesPage`, `ClientsPage`, etc.).

Esta estructura evita la duplicación de layouts y asegura una apariencia y comportamiento consistentes en toda la sección `(app)`.

## 2. Lógica del Sidebar Interactivo (`BrikiSidebarLayout` / `ui/sidebar.tsx`)

El componente del sidebar implementa las siguientes características:

-   **Estado Dual:** Utiliza un estado local (`open`) para manejar la expansión/colapso por hover y observa el estado global `chatPanelOpen` (de Zustand `useUI`) para forzar la expansión cuando el panel de chat está activo.
-   **Auto-Colapso:** Por defecto (`disableAutoCollapse = false`), el sidebar está colapsado (`72px`) y se expande (`280px`) al pasar el ratón (`onMouseEnter`) y se vuelve a colapsar al quitarlo (`onMouseLeave`).
-   **Persistencia (Modo Chat):** Cuando `chatPanelOpen` es `true`, la prop `disableAutoCollapse` se activa, el sidebar se fuerza a `open = true`, y los eventos `onMouseEnter`/`onMouseLeave` se desactivan, manteniendo el sidebar expandido.
-   **Animación:** Utiliza `framer-motion` para animar suavemente la propiedad `width` entre los estados colapsado y expandido.

### **Estado Centralizado:**
El estado `sidebarOpen` y la lógica de hover/panel de chat residen en el store `useUI` (`src/lib/ui/state.ts`). El componente del sidebar lee y actualiza este estado global.

Esta implementación proporciona una experiencia de usuario intuitiva y se integra limpiamente con el estado global de la aplicación.

## 3. Flujo de Datos

### **Estado Global (Zustand):**
```typescript
interface UIState {
  chatPanelOpen: boolean;
  sidebarOpen: boolean;
  sidebarHovered: boolean;
  // ... otros estados
}
```

### **Componentes Principales:**
1. **`(app)/layout.tsx`**: Layout principal que envuelve toda la sección autenticada
2. **`BrikiSidebarLayout`**: Wrapper del sidebar que maneja la lógica de expansión/colapso
3. **`AgentSidebar`**: Componente que decide qué sidebar mostrar (Nav vs ChatPanel)
4. **`DesktopSidebar`**: Implementación del sidebar con animaciones y hover

### **Flujo de Interacción:**
1. **Hover**: `onMouseEnter` → `setSidebarOpen(true)` → Animación de expansión
2. **Leave**: `onMouseLeave` → `setSidebarOpen(false)` → Animación de colapso
3. **Chat Panel**: `chatPanelOpen = true` → `setSidebarOpen(true)` + `disableAutoCollapse = true`

## 4. Principios de Diseño

### **Separación de Responsabilidades:**
- **Layout**: Estructura general y autenticación
- **Sidebar**: Lógica de expansión/colapso y navegación
- **Canvas**: Manejo de paneles izquierdo y derecho
- **UI State**: Gestión de estado global

### **Consistencia de Estado:**
- **Unidireccional**: Estado fluye desde Zustand hacia los componentes
- **Centralizado**: Un solo store para toda la UI
- **Predecible**: Cambios de estado son explícitos y rastreables

### **Reutilización de Código:**
- **Componentes Modulares**: Cada componente tiene una responsabilidad específica
- **Hooks Compartidos**: `useUI` proporciona estado y funciones a todos los componentes
- **Props Consistentes**: Interfaz uniforme entre componentes similares

## 5. Mejoras Implementadas

### **Eliminación de Duplicación:**
- ✅ **Un Solo Layout**: Eliminado `BrikiSidebarLayout` duplicado en `HomeClient`
- ✅ **Arquitectura Limpia**: Responsabilidades claras entre layout y componentes
- ✅ **Consistencia Visual**: Comportamiento uniforme en todas las páginas

### **Comportamiento Correcto del Sidebar:**
- ✅ **Animación Real**: Width cambia de 72px a 280px correctamente
- ✅ **Hover Funcional**: Responde correctamente a eventos de mouse
- ✅ **Estado Sincronizado**: Integrado con `chatPanelOpen` global
- ✅ **Auto-Collapse**: Se colapsa automáticamente cuando corresponde

### **Estado Centralizado:**
- ✅ **Zustand Store**: Estado del sidebar en `useUI`
- ✅ **Funciones Dedicadas**: `setSidebarOpen` y `setSidebarHovered`
- ✅ **Tipo Seguro**: TypeScript para todas las funciones y estados

## 6. Archivos Modificados

### **Eliminación de Duplicación:**
- `src/components/HomeClient.tsx`: Eliminado `BrikiSidebarLayout` wrapper
- `src/app/[locale]/(app)/layout.tsx`: Mantenido como único layout

### **Corrección del Sidebar:**
- `src/components/ui/sidebar.tsx`: Corregida animación y lógica de hover
- `src/components/BrikiSidebarLayout.tsx`: Integrado con estado centralizado
- `src/lib/ui/state.ts`: Añadido estado del sidebar

### **Documentación:**
- `docs/ARCHITECTURE_LAYOUT_SIDEBAR.md`: Este documento
- `docs/ANALISIS_CRITICO_DUPLICACION_PANEL_DERECHO_Y_COMPORTAMIENTO_SIDEBAR_2025-01-12.md`: Análisis completo

## 7. Testing y Validación

### **Checklist de Validación:**
1. **Eliminación de Duplicación**: Panel derecho aparece una sola vez
2. **Comportamiento Hover**: Sidebar se expande/colapsa correctamente
3. **Panel de Chat**: Sidebar permanece expandido durante chat
4. **Navegación**: Comportamiento consistente entre páginas
5. **Responsividad**: Funciona en diferentes tamaños de pantalla

### **Métricas de Éxito:**
- ✅ **0 Duplicaciones**: Un solo sidebar en toda la aplicación
- ✅ **Hover Funcional**: Sidebar responde correctamente al hover
- ✅ **Auto-Collapse**: Se colapsa automáticamente cuando corresponde
- ✅ **Performance**: No hay regresiones en tiempo de renderizado

## 8. Mantenimiento Futuro

### **Añadir Nuevas Funcionalidades:**
1. **Estado del Sidebar**: Usar `setSidebarOpen` y `setSidebarHovered`
2. **Nuevos Componentes**: Seguir el patrón de `AgentSidebar`
3. **Animaciones**: Modificar `DesktopSidebar` para nuevos efectos

### **Debugging:**
1. **Estado Global**: Revisar `useUI` store para estado del sidebar
2. **Componentes**: Verificar `BrikiSidebarLayout` para lógica de expansión
3. **Animaciones**: Revisar `DesktopSidebar` para problemas de hover

### **Optimizaciones:**
1. **Performance**: Usar `useMemo` y `useCallback` donde sea necesario
2. **Accesibilidad**: Añadir ARIA labels y keyboard navigation
3. **Responsive**: Mejorar comportamiento en móviles

---

**Fecha de Creación**: 2025-01-12  
**Última Actualización**: 2025-01-12  
**Versión**: 1.0  
**Estado**: Implementado y Validado
