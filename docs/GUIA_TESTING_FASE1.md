# GUÍA DE TESTING: FASE 1 - FUNCIÓN HELPER `moveTempToPersistent()`

**Fecha**: 2 de Febrero, 2025  
**Objetivo**: Verificar que FASE 1 está completamente integrada y no rompe funcionalidades existentes

---

## ✅ ESTADO ACTUAL DE FASE 1

### Archivo creado:
- ✅ `src/lib/storage/moveTempToPersistent.ts` - Función helper creada

### Integración:
- ⚠️ **NO está integrada aún** - La función es nueva y no se usa en ningún lugar
- ✅ **No rompe nada** - Al ser nueva y no usada, no afecta código existente

---

## 🧪 CHECKLIST DE TESTING

### Test 1: Verificar que el proyecto compila

**Comando**:
```bash
cd /home/liones_messi/Documentos/trabajo/Briki
pnpm run build
```

**Resultado esperado**: 
- ✅ Compilación exitosa (puede haber warnings de dependencias como 'critters', pero no errores relacionados con nuestra función)

**Si hay errores relacionados con `moveTempToPersistent`**: Reportar inmediatamente

---

### Test 2: Verificar que la función puede importarse

**Crear archivo temporal de test**: `test-import.ts` (en raíz del proyecto)

**Contenido**:
```typescript
import { moveTempToPersistent } from './src/lib/storage/moveTempToPersistent';

console.log('✅ Import exitoso');
```

**Ejecutar**:
```bash
npx tsx test-import.ts
```

**Resultado esperado**: 
- ✅ "Import exitoso" sin errores

**Limpieza**:
```bash
rm test-import.ts
```

---

### Test 3: Verificar que no hay errores de linting

**Comando**:
```bash
pnpm run lint src/lib/storage/moveTempToPersistent.ts
```

**O verificar manualmente en el IDE**: 
- ✅ No debe mostrar errores de linting en el archivo

---

### Test 4: Verificar que las dependencias existen

**Verificar que estos archivos existen**:
- ✅ `src/lib/supabase/server.ts` - Debe existir y exportar `createServerSupabase`
- ✅ `src/lib/storage/moveTempToPersistent.ts` - Debe existir y exportar la función

**Comando**:
```bash
ls -la src/lib/supabase/server.ts
ls -la src/lib/storage/moveTempToPersistent.ts
```

**Resultado esperado**: Ambos archivos deben existir

---

### Test 5: Verificar estructura de la función

**Abrir**: `src/lib/storage/moveTempToPersistent.ts`

**Verificar**:
- ✅ Exporta `moveTempToPersistent` (función)
- ✅ Exporta `MoveTempToPersistentParams` (interface)
- ✅ Exporta `MoveTempToPersistentResult` (interface)
- ✅ Usa `createServerSupabase` correctamente
- ✅ Tiene validación de `tempPath`
- ✅ Tiene manejo de errores robusto
- ✅ Tiene logs descriptivos

---

### Test 6: Verificar que no se usa en ningún lugar (esperado)

**Comando**:
```bash
grep -r "moveTempToPersistent" src/ --exclude-dir=node_modules
```

**Resultado esperado**: 
- ✅ Solo debe aparecer en `src/lib/storage/moveTempToPersistent.ts` (definición)
- ✅ No debe aparecer en ningún otro archivo (aún no se usa)

---

### Test 7: Verificar funcionalidades existentes siguen funcionando

**APIs críticas a probar**:

#### 7.1: Upload de PDF (modo temporal)
**Endpoint**: `POST /api/upload/pdf` (sin caseId/orgId)

**Acción**:
1. Subir un PDF desde landing page o formulario
2. Verificar que se sube correctamente a `temp/{userId}/...`
3. Verificar que retorna `tempUpload` con `storagePath`

**Resultado esperado**: ✅ Funciona igual que antes

---

#### 7.2: Upload de PDF (modo persistente)
**Endpoint**: `POST /api/upload/pdf` (con caseId/orgId)

**Acción**:
1. Subir un PDF desde workspace (con caso existente)
2. Verificar que se sube a `{orgId}/{caseId}/...`
3. Verificar que se crea artifact correctamente

**Resultado esperado**: ✅ Funciona igual que antes

---

#### 7.3: Crear caso con tempUploads
**Endpoint**: `POST /api/cases/create`

**Acción**:
1. Crear caso con `tempUploads` en el body
2. Verificar que se crean artifacts con `fileId` apuntando a `temp/...`
3. Verificar que los archivos siguen siendo accesibles

**Resultado esperado**: ✅ Funciona igual que antes (artifacts apuntan a temp/)

---

#### 7.4: Actualizar caso con tempUploads
**Endpoint**: `PUT /api/cases/update`

**Acción**:
1. Actualizar caso con `tempUploads` en el body
2. Verificar que se crean artifacts correctamente

**Resultado esperado**: ✅ Funciona igual que antes

---

#### 7.5: Iniciar chat con tempUploads
**Endpoint**: `POST /api/chat/start`

**Acción**:
1. Enviar mensaje desde landing page con `tempUploads`
2. Verificar que se crea caso y artifacts

**Resultado esperado**: ✅ Funciona igual que antes

---

#### 7.6: Acceso a archivos
**Endpoint**: `GET /api/storage/[...path]`

**Acción**:
1. Acceder a un archivo temporal: `/api/storage/temp/{userId}/...`
2. Acceder a un archivo persistente: `/api/storage/{orgId}/{caseId}/...`
3. Verificar que ambos funcionan

**Resultado esperado**: ✅ Ambos funcionan correctamente

---

#### 7.7: Visualización de artifacts en frontend
**Componentes**: 
- `ArtifactsList.tsx`
- `CaseDetailContent.tsx`

**Acción**:
1. Abrir un caso con artifacts
2. Verificar que los PDFs se muestran correctamente
3. Verificar que los iframes funcionan

**Resultado esperado**: ✅ Funciona igual que antes

---

## 📊 RESUMEN DE VALIDACIÓN

### ✅ Tests de código (automáticos):
- [ ] Test 1: Proyecto compila
- [ ] Test 2: Función puede importarse
- [ ] Test 3: Sin errores de linting
- [ ] Test 4: Dependencias existen
- [ ] Test 5: Estructura correcta
- [ ] Test 6: No se usa aún (esperado)

### ✅ Tests de funcionalidad (manuales):
- [ ] Test 7.1: Upload temporal funciona
- [ ] Test 7.2: Upload persistente funciona
- [ ] Test 7.3: Crear caso con tempUploads funciona
- [ ] Test 7.4: Actualizar caso con tempUploads funciona
- [ ] Test 7.5: Iniciar chat con tempUploads funciona
- [ ] Test 7.6: Acceso a archivos funciona
- [ ] Test 7.7: Visualización en frontend funciona

---

## ⚠️ SI ALGO FALLA

### Error: "Cannot find module '@/lib/supabase/server'"
- **Causa**: Problema de paths de TypeScript
- **Solución**: Verificar `tsconfig.json` tiene `paths` configurado correctamente

### Error: Funcionalidad existente rota
- **Causa**: Cambio accidental en código existente
- **Solución**: Revisar `git diff` para ver qué cambió

### Error: Build falla
- **Causa**: Dependencias faltantes (como 'critters')
- **Solución**: `pnpm install` o instalar dependencia faltante

---

## ✅ CRITERIO DE ÉXITO

**FASE 1 está completa cuando**:
- ✅ Todos los tests de código pasan
- ✅ Todas las funcionalidades existentes siguen funcionando
- ✅ La función helper puede importarse correctamente
- ✅ No hay errores de linting o TypeScript relacionados con la función

---

**Última actualización**: 2 de Febrero, 2025

