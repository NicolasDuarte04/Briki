# 📦 Configuración del Gestor de Paquetes - pnpm

## 🎯 Resumen Ejecutivo

Este proyecto utiliza **pnpm** como gestor de paquetes exclusivo. Esta decisión arquitectónica está fundamentada en beneficios técnicos específicos que mejoran la calidad, rendimiento y mantenibilidad del proyecto.

---

## 🔍 Diferencia entre npm y pnpm

### **npm (Node Package Manager)**
- **Gestor tradicional**: Incluido por defecto con Node.js
- **Almacenamiento**: Cada proyecto tiene su propia copia de `node_modules`
- **Resolución**: Permite "phantom dependencies" (dependencias no declaradas)
- **Rendimiento**: Más lento en proyectos grandes
- **Espacio en disco**: Duplica dependencias entre proyectos

### **pnpm (Performant Node Package Manager)**
- **Gestor moderno**: Requiere instalación separada
- **Almacenamiento**: Store centralizado con enlaces simbólicos
- **Resolución**: Estricta, solo permite dependencias declaradas
- **Rendimiento**: Hasta 3x más rápido que npm
- **Espacio en disco**: Comparte dependencias entre proyectos

### **Comparación Práctica**

| Característica | npm | pnpm |
|----------------|-----|------|
| Instalación inicial | ~30s | ~10s |
| Espacio en disco (10 proyectos) | ~2GB | ~500MB |
| Resolución de dependencias | Permisiva | Estricta |
| Compatibilidad monorepo | Básica | Avanzada |
| Phantom dependencies | Permitidas | Bloqueadas |

---

## 🏗️ ¿Por qué este proyecto usa pnpm?

### **1. Rendimiento Optimizado**
- **Instalación rápida**: pnpm cachea dependencias de forma más eficiente
- **Builds más rápidos**: Menor tiempo de resolución de dependencias
- **CI/CD optimizado**: Menor tiempo de ejecución en pipelines

### **2. Resolución Estricta de Dependencias**
- **Previene errores**: Bloquea el uso de dependencias no declaradas
- **Mejor debugging**: Errores más claros cuando faltan dependencias
- **Compatibilidad garantizada**: Todas las dependencias están explícitamente declaradas

### **3. Eficiencia de Espacio**
- **Store centralizado**: Una sola copia de cada versión de paquete
- **Enlaces simbólicos**: Los proyectos referencian el store central
- **Ahorro significativo**: Especialmente importante en proyectos grandes

### **4. Consistencia del Equipo**
- **Mismo lockfile**: Todos los desarrolladores usan las mismas versiones
- **Menos "funciona en mi máquina"**: Resolución idéntica en todos los entornos
- **Onboarding simplificado**: Configuración más predecible

---

## ⚙️ Configuración del Proyecto

### **Archivos de Configuración**

#### **1. `package.json`**
```json
{
  "packageManager": "pnpm@10.16.1",
  "scripts": {
    "preinstall": "npx only-allow pnpm"
  }
}
```

**Propósito**:
- `packageManager`: Especifica la versión exacta de pnpm requerida
- `preinstall`: Bloquea el uso de npm/yarn antes de la instalación

#### **2. `.npmrc`**
```
package-lock=false
```

**Propósito**:
- Previene que npm cree `package-lock.json` si se ejecuta accidentalmente
- Documenta que el proyecto requiere pnpm

#### **3. `.pnpmrc`**
```
auto-install-peers=true
exclude-links-from-lockfile=false
```

**Propósito**:
- `auto-install-peers`: Instala automáticamente peer dependencies
- `exclude-links-from-lockfile`: Mantiene consistencia en el lockfile

#### **4. `.gitignore`**
```
package-lock.json
yarn.lock
```

**Propósito**:
- Evita que archivos de otros gestores se suban al repositorio
- Mantiene el repositorio limpio y consistente

---

## 🚨 Errores Comunes y Soluciones

### **Error: "Use pnpm install for installation"**

**Causa**: Intentaste usar `npm install` en lugar de `pnpm install`

**Solución**:
```bash
# ❌ Incorrecto
npm install

# ✅ Correcto
pnpm install
```

### **Error: Cursor sugiere npm**

**Causa**: Cursor detectó un `package-lock.json` (ya eliminado)

**Solución**:
1. El `package-lock.json` ha sido eliminado
2. Cursor ahora debería detectar `pnpm-lock.yaml` y sugerir pnpm
3. Si persiste, reinicia Cursor

### **Error: "pnpm: command not found"**

**Causa**: pnpm no está instalado en tu sistema

**Solución**:
```bash
# Instalar pnpm globalmente
npm install -g pnpm

# Verificar instalación
pnpm --version
```

---

## 📋 Comandos Equivalentes

| Acción | npm | pnpm |
|--------|-----|------|
| Instalar dependencias | `npm install` | `pnpm install` |
| Agregar dependencia | `npm install <pkg>` | `pnpm add <pkg>` |
| Agregar dev dependency | `npm install -D <pkg>` | `pnpm add -D <pkg>` |
| Remover dependencia | `npm uninstall <pkg>` | `pnpm remove <pkg>` |
| Actualizar dependencias | `npm update` | `pnpm update` |
| Ejecutar script | `npm run <script>` | `pnpm <script>` |

---

## ✅ Verificación de Configuración

Para verificar que todo está configurado correctamente:

```bash
# 1. Verificar versión de pnpm
pnpm --version
# Debe mostrar: 10.16.1 o superior

# 2. Verificar que no existe package-lock.json
ls package-lock.json
# No debe existir

# 3. Verificar que existe pnpm-lock.yaml
ls pnpm-lock.yaml
# Debe existir

# 4. Verificar configuración
cat .npmrc
cat .pnpmrc
# Deben existir y tener la configuración correcta

# 5. Probar instalación
pnpm install
# Debe completarse sin errores
```

---

## 🎓 Mejores Prácticas

### **Para Desarrolladores**

1. **Siempre usa pnpm**: Nunca uses `npm install` o `yarn install`
2. **Commit del lockfile**: Siempre commitea `pnpm-lock.yaml`
3. **Versión consistente**: Usa la versión de pnpm especificada en `package.json`
4. **Actualizar dependencias**: Usa `pnpm update` en lugar de editar `package.json` manualmente

### **Para el Equipo**

1. **Documentación**: Mantén este documento actualizado
2. **CI/CD**: Asegúrate de que los pipelines usen pnpm
3. **Onboarding**: Incluye instalación de pnpm en la guía de setup
4. **Monitoreo**: Verifica que nadie commitee `package-lock.json`

---

## 🔗 Referencias

- [Documentación oficial de pnpm](https://pnpm.io/)
- [Por qué usar pnpm](https://pnpm.io/motivation)
- [Migración de npm a pnpm](https://pnpm.io/migration)
- [Guía de desarrollador del proyecto](./DEVELOPER_ONBOARDING_GUIDE.md)

---

**Última actualización**: 2025-11-07  
**Mantenido por**: Equipo de Desarrollo Briki

