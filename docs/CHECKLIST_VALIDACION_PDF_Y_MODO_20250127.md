# Checklist de Validación: Refactorización PDF y Máquina de Estado
**Fecha:** 2025-01-27  
**Fase:** 3/3 (Completada)

---

## VALIDACIONES REQUERIDAS

### ✅ Proceso: Subida de PDFs desde Panel Derecho

**Descripción:** Validar que los PDFs se suben correctamente desde el panel derecho del agente y se guardan en el caso.

**Pasos:**
1. Navegar a `/agent` (interfaz del agente)
2. Llenar el formulario del panel derecho con:
   - Categoría de seguro: Salud
   - Presupuesto: 5000000 COP
   - Descripción: "Necesito un seguro de salud para mi familia"
3. Arrastrar 1 PDF al área de PDFs del formulario
4. Verificar que aparece "✓ Archivo seleccionado. Se subirá cuando se guarde el caso."
5. Llenar Categoría de Seguro (único campo requerido)
6. Hacer click en "Buscar Planes"
7. Verificar en terminal que aparecen logs: `📎 [CaseBriefForm] Creando caso con tempUploads: 1`
8. Esperar la respuesta del agente
9. Verificar en Supabase que el caso tiene 1 artifact con el PDF

**Criterio de éxito:**
- ✅ No hay error "No se puede subir el archivo sin un caso válido"
- ✅ El botón "Subir PDF" NO aparece
- ✅ Los PDFs se guardan como artifacts en el caso
- ✅ El agente responde correctamente

---

### ✅ Proceso: Modo Creación vs. Modo Edición

**Descripción:** Validar que el formulario del panel derecho se abre en modo creación cuando NO hay caso.

**Pasos:**
1. Navegar a `/agent` (interfaz del agente)
2. Verificar que el formulario está en modo "creación" (campos vacíos)
3. Llenar el formulario parcialmente
4. Hacer click en "Buscar Planes"
5. Verificar que se crea un nuevo caso
6. Verificar que el formulario cambia a modo "edición" (botón "Editar" aparece)
7. Hacer click en "Editar"
8. Modificar algún campo
9. Hacer click en "Guardar Cambios"
10. Verificar que el caso se actualiza correctamente

**Criterio de éxito:**
- ✅ El formulario inicia en modo creación
- ✅ Se puede crear un nuevo caso
- ✅ El formulario cambia a modo edición después de crear
- ✅ Se pueden editar y guardar cambios

---

### ✅ Proceso: Landing Page → Panel Derecho

**Descripción:** Validar que al enviar un mensaje desde el Landing, el formulario se abre en modo creación.

**Pasos:**
1. Navegar a `/landing#pricing` (Landing Page)
2. Escribir un mensaje en el chat: "Necesito un seguro de salud"
3. Subir 2 PDFs (arrastrar al área de PDFs)
4. Hacer click en "Enviar" (flecha arriba)
5. Verificar que navega a `/agent`
6. Verificar que el formulario del panel derecho está en modo creación (NO edición)
7. Verificar que los PDFs aparecen como "Preparados para subir"
8. Llenar Categoría de Seguro
9. Hacer click en "Buscar Planes"
10. Verificar que el agente responde correctamente
11. Verificar en Supabase que el caso tiene 2 artifacts

**Criterio de éxito:**
- ✅ El Landing navega correctamente a `/agent`
- ✅ El formulario NO aparece en "modo edición"
- ✅ Los PDFs del Landing se transfieren correctamente
- ✅ El agente responde sin errores

---

### ✅ Proceso: Aprobación de Caso (Resolver Error "Case is not in draft status")

**Descripción:** Validar que se puede aprobar un caso creado desde el panel derecho sin error.

**Pasos:**
1. Navegar a `/agent`
2. Llenar el formulario del panel derecho (Categoría de Seguro mínimo)
3. Subir 1 PDF
4. Hacer click en "Buscar Planes"
5. Verificar en terminal que no hay error:
   - ❌ NO debe aparecer: "Case is not in draft status"
   - ✅ Debe aparecer: "✅ Caso creado exitosamente: <caseId>"
6. Verificar que el agente responde correctamente
7. Verificar en Supabase que el caso tiene:
   - `status: 'draft'` (o actualizado a 'active' después de aprobación)
   - 1 artifact con el PDF
   - Datos del formulario guardados correctamente

**Criterio de éxito:**
- ✅ No hay error "Case is not in draft status"
- ✅ El caso se puede aprobar exitosamente
- ✅ El agente responde correctamente
- ✅ Los datos y PDFs se guardan correctamente

---

### ✅ Proceso: Edición de Caso Existente

**Descripción:** Validar que se pueden editar casos existentes y agregar PDFs.

**Pasos:**
1. Navegar a `/workspace/cases` (lista de casos)
2. Abrir un caso existente
3. Hacer click en "Editar"
4. Modificar algún campo (ej: Presupuesto)
5. Subir 1 PDF nuevo
6. Hacer click en "Guardar Cambios"
7. Verificar que el caso se actualiza
8. Verificar en Supabase que:
   - Los campos modificados se guardaron
   - El nuevo PDF aparece como artifact

**Criterio de éxito:**
- ✅ Se pueden editar casos existentes
- ✅ Se pueden agregar PDFs a casos existentes
- ✅ Los cambios se guardan correctamente
- ✅ El botón dice "Guardar Cambios" (NO "Buscar Planes")

---

### ✅ Proceso: Eliminación de PDFs

**Descripción:** Validar que se pueden eliminar PDFs antes de guardar.

**Pasos:**
1. Navegar a `/agent`
2. Llenar Categoría de Seguro
3. Subir 2 PDFs
4. Verificar que aparecen en la lista
5. Hacer click en el botón "X" de uno de los PDFs
6. Verificar que se elimina de la lista
7. Verificar que solo queda 1 PDF en la lista
8. Hacer click en "Buscar Planes"
9. Verificar en Supabase que solo se guardaron 1 artifact

**Criterio de éxito:**
- ✅ Se pueden eliminar PDFs de la lista
- ✅ Solo los PDFs restantes se guardan en el caso

---

## REGISTRO DE RESULTADOS

Fecha de validación: _______________

Validación realizada por: _______________

**Resultados:**

- [ ] ✅ Todos los procesos pasaron
- [ ] ❌ Errores encontrados (especificar abajo)

**Errores encontrados (si aplica):**

1. _______________________________
2. _______________________________
3. _______________________________

**Notas adicionales:**

_______________________________
_______________________________
_______________________________

---

## CONVENCIÓN DE VALIDACIÓN

- **✅ = Proceso validado exitosamente**
- **❌ = Error encontrado (documentar en "Errores encontrados")**
- **⏸️ = Validación pausada (especificar razón en "Notas adicionales")**

---

## PRÓXIMOS PASOS

1. Ejecutar todas las validaciones manualmente
2. Documentar resultados
3. Si hay errores, crear un nuevo análisis de bugs
4. Si todo pasa, marcar el hotfix como completado

