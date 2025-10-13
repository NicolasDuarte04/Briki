# Plan QA Manual – Formulario de Contacto Landing

**Objetivo**: Validar end-to-end el formulario de contacto antes de deploy a Producción.  
**Ambientes**: Preview (Vercel) → Production  
**Responsable**: QA/Dev  
**Fecha**: Oct 2025

---

## 📋 Pasos de Prueba Manual (10 pasos)

### 1. **Envío válido – Desktop – ES**
- **Input**: Nombre, email, mensaje válidos (en español)
- **Verificar**:
  - ✅ Toast de éxito aparece: "¡Mensaje enviado! Te contactaremos pronto."
  - ✅ Formulario se limpia automáticamente
  - ✅ Tiempo de respuesta < 2s
  - ✅ Nueva fila en tabla `contacts` (Supabase)

### 2. **Envío válido – Desktop – EN**
- **Input**: Nombre, email, mensaje válidos (en inglés)
- **Verificar**:
  - ✅ Toast de éxito aparece: "Message sent! We'll contact you soon."
  - ✅ Formulario se limpia
  - ✅ Tiempo de respuesta < 2s
  - ✅ Nueva fila en tabla `contacts`

### 3. **Envío válido – Móvil – ES**
- **Device**: iPhone/Android simulado (375px)
- **Input**: Datos válidos en español
- **Verificar**:
  - ✅ Formulario responsive (sin overflow horizontal)
  - ✅ Toast visible y legible
  - ✅ Botón accesible sin zoom
  - ✅ Nueva fila en DB

### 4. **Envío válido – Móvil – EN**
- **Device**: iPhone/Android simulado
- **Input**: Datos válidos en inglés
- **Verificar**:
  - ✅ Toast en inglés correcto
  - ✅ UX fluida en móvil
  - ✅ Nueva fila en DB

### 5. **Validación de errores – Email inválido**
- **Input**: Email sin `@` o dominio incorrecto
- **Verificar**:
  - ✅ Mensaje de error inline: "Email inválido" (ES) / "Invalid email" (EN)
  - ❌ NO se envía request al backend
  - ❌ NO se crea fila en DB

### 6. **Validación de errores – Campos vacíos**
- **Input**: Dejar nombre, email o mensaje en blanco
- **Verificar**:
  - ✅ Mensajes de error por campo:
    - "El nombre es requerido" (ES)
    - "Name is required" (EN)
  - ❌ NO se envía request
  - ❌ NO se crea fila en DB

### 7. **Validación de errores – Mensaje muy corto**
- **Input**: Mensaje con < 10 caracteres
- **Verificar**:
  - ✅ Error: "El mensaje debe tener al menos 10 caracteres" (ES)
  - ✅ Error: "Message must be at least 10 characters" (EN)
  - ❌ NO se envía request

### 8. **Honeypot – Simulación de bot**
- **Acción**: 
  - Abrir DevTools
  - En Console: `document.querySelector('input[name="website"]').value = 'http://spam.com'`
  - Enviar formulario
- **Verificar**:
  - ✅ Toast de éxito aparece (fake success)
  - ❌ NO se crea fila en DB (silently rejected)
  - ✅ Tiempo de respuesta < 1s (mock rápido)

### 9. **Manejo de errores de red**
- **Acción**: 
  - Desconectar internet (DevTools → Offline)
  - Intentar enviar formulario
- **Verificar**:
  - ✅ Toast de error: "Error al enviar. Intenta de nuevo." (ES)
  - ✅ Toast de error: "Error sending. Try again." (EN)
  - ✅ Formulario NO se limpia (datos preservados)

### 10. **Rate limiting (opcional en Preview)**
- **Acción**: Enviar 5+ mensajes en < 1 minuto desde la misma IP
- **Verificar**:
  - ✅ Mensaje de throttling después del 5º envío
  - ✅ O bien: implementar rate limit en backend
  - ⚠️ Si no hay rate limit, documentar como mejora futura

---

## ✅ Criterios GO / NO-GO para Producción

### **GO** ✅ (Luz verde para deploy)
- [ ] **Pasos 1-7** pasan al 100%
- [ ] **Paso 8** (honeypot) rechaza silenciosamente bots
- [ ] **Paso 9** muestra error de red correctamente
- [ ] **DB**: Al menos 3 filas de prueba creadas con éxito (limpiar después)
- [ ] **Performance**: Todos los envíos < 2s en red 3G simulada
- [ ] **i18n**: Mensajes correctos en ES/EN sin hardcoded strings
- [ ] **Mobile**: Sin overflow, toast visible, botones táctiles accesibles
- [ ] **Evidencia**: Screenshots de toast + fila en Supabase adjuntos

### **NO-GO** ❌ (Bloquear deploy)
- [ ] Cualquier paso 1-7 falla
- [ ] Honeypot NO funciona (bots pueden enviar)
- [ ] Formulario NO se limpia tras envío exitoso
- [ ] Toast NO aparece o muestra mensaje incorrecto
- [ ] Errores de red NO manejados (crash o silent fail)
- [ ] Mobile: overflow horizontal o botón no clickeable
- [ ] DB: Filas duplicadas, campos NULL inesperados
- [ ] Tiempo de respuesta > 3s en red normal

---

## 📸 Evidencia Requerida

Para cada ambiente (Preview, Production):

1. **Screenshot de toast de éxito** (ES + EN)
2. **Screenshot de Supabase** mostrando fila nueva en tabla `contacts`:
   - Columnas: `id`, `name`, `email`, `message`, `created_at`, `locale`
3. **Screenshot de validación de errores** (campo vacío, email inválido)
4. **Video corto (opcional)**: flujo completo en móvil (15-30s)

---

## 🚀 Checklist de Deploy

**Preview → Production**

1. [ ] QA manual completo en Preview
2. [ ] Todos los criterios GO cumplidos
3. [ ] Evidencia adjunta en ticket/PR
4. [ ] Limpiar filas de prueba en DB antes de producción
5. [ ] Deploy a Production
6. [ ] **Smoke test post-deploy**: Enviar 1 mensaje real en ES y EN
7. [ ] Verificar fila en DB production
8. [ ] Confirmar toast y limpieza de form
9. [ ] ✅ **Sign-off final**

---

## 📊 Tiempos Esperados

| Acción | Tiempo Esperado | Tiempo Máximo |
|--------|----------------|---------------|
| Envío válido (red normal) | < 1s | 2s |
| Envío válido (3G simulado) | < 2s | 3s |
| Validación frontend | Instantáneo | 100ms |
| Toast aparece | Inmediato | 200ms |
| Honeypot reject | < 500ms | 1s |

---

## 🐛 Registro de Bugs (si aplica)

| # | Paso | Descripción | Severidad | Status |
|---|------|-------------|-----------|--------|
| 1 | — | — | — | — |

---

**Última actualización**: Oct 11, 2025  
**Próxima revisión**: Después de deploy a Production

