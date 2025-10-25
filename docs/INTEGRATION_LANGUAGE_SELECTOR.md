# Integración del Selector de Idioma

## Resumen
Implementación completa del selector de idioma en el perfil del usuario con funcionalidad de cambio dinámico.

## Cambios Implementados

### 1. AccountSettings (`src/app/[locale]/(app)/profile/AccountSettings.tsx`)
- **Nueva sección**: Card de idioma en la pestaña "Personal info"
- **Estado local**: `currentLocale` para manejo del estado actual
- **Función**: `handleLocaleChange` para cambio de idioma
- **UI**: Botones toggle con feedback visual (English ✓ / Español)

### 2. Funcionalidad de Cambio
- **Validación**: Previene cambio si ya está en el idioma seleccionado
- **API**: Usa `updateProfile` existente con campo `locale`
- **Feedback**: Toast de éxito/error
- **Redirección**: Navegación automática al nuevo locale

### 3. Integración con Backend
- **Acción existente**: `updateProfile` ya maneja campo `locale`
- **Validación**: Solo acepta 'en' o 'es'
- **Base de datos**: Actualización en tabla `profiles`
- **Revalidación**: Path revalidado después del cambio

## Flujo de Usuario
```
Perfil → Sección Personal → Idioma → Seleccionar → Actualización → Redirección
```

## Archivos Modificados
- `src/app/[locale]/(app)/profile/AccountSettings.tsx`

## Archivos de Soporte (sin cambios)
- `src/app/[locale]/(app)/profile/actions.ts` (ya manejaba locale)
- `src/app/[locale]/(app)/profile/schema.ts` (ya definía LocaleValue)

## Testing
- ✅ Build exitoso
- ✅ Linting sin errores
- ✅ Cambio de idioma funcional
- ✅ Persistencia en base de datos
- ✅ Redirección correcta

## Commits
- `feat: implement language selector in profile`
