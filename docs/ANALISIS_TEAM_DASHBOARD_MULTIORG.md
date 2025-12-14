# Análisis: Team Dashboard & Multi-Organización

## 📋 Resumen Ejecutivo

**Objetivo**: Permitir a usuarios pertenecer a múltiples organizaciones y cambiar entre ellas con un Team Dashboard en el perfil.

**Estado**: La infraestructura base EXISTE pero falta tracking de "organización activa" y UI.

---

## ✅ Lo que YA EXISTE

### 1. Base de Datos
- ✅ Tabla `org_members` (N:M entre users ↔ organizations)
  - Campos: `user_id`, `org_id`, `role` (owner/admin/member)
  - Ya tiene índices y RLS
- ✅ Tabla `organizations`
- ✅ Tabla `profiles` (1:1 con auth.users)

### 2. Código Backend
- ✅ `getCurrentOrg()` - Helper que obtiene org del usuario
  - **Limitación**: Devuelve siempre `organizations[0]` - NO hay selección
- ✅ `getUserOrganizations()` - Lista todas las orgs del usuario
- ✅ `createOrganization()` - Crear nuevas orgs

### 3. RLS Policies
- ✅ Políticas para ver perfiles de colegas en misma org
- ✅ Políticas para que admins/owners gestionen miembros
- ✅ Todas las tablas (cases, clients, artifacts, etc.) filtran por `org_id`

---

## ❌ Lo que FALTA

### 1. **CRÍTICO**: Tracking de Organización Actual
**Problema**: `getCurrentOrg()` devuelve siempre la primera org, no hay persistencia de elección del usuario.

**Opciones**:
- **A)** Agregar `current_org_id` a tabla `profiles`
- **B)** Guardar en cookie/sesión de Supabase (metadata de usuario)
- **C)** Usar JWT custom claims

**Recomendación**: Opción A (columna en profiles) - Simple, consistente, auditable.

### 2. Team Dashboard UI
**Ubicación**: Tab "Dashboard de equipo" en `/profile` (YA EXISTE pero vacío)

**Componentes faltantes**:
```
src/app/[locale]/(app)/profile/
├── TeamDashboard.tsx          ❌ No existe
├── OrgSwitcher.tsx            ❌ No existe  
└── InviteMemberForm.tsx       ❌ No existe
```

**Funcionalidades requeridas**:
- Dropdown para cambiar org activa
- Input para invitar usuarios por ID
- Lista de miembros del equipo actual
- Roles y permisos por miembro

### 3. API Endpoints
**Faltantes**:
```typescript
// src/app/actions/organizationActions.ts
- switchOrganization(orgId)      ❌
- inviteUserToOrg(userId, orgId) ❌
- getOrgMembers(orgId)           ❌
- removeUserFromOrg(userId)      ❌
```

---

## ⚠️ RIESGOS PRINCIPALES

### 1. Breaking Changes en getCurrentOrg()
**Impacto**: ~40+ archivos lo usan
**Áreas afectadas**:
- API routes (casos, clientes, artifacts, análisis, comparaciones, proposals)
- Storage policies
- Middleware

**Solución**: Mantener backward compatibility:
```typescript
// Antes: Siempre devuelve organizations[0]
// Después: Devuelve current_org_id del perfil (con fallback a [0])
```

### 2. RLS Policies - Visibilidad Cross-Org
**Problema actual**: Usuario puede ver perfiles de colegas de TODAS sus orgs simultáneamente.

**Pregunta clave**: ¿Debe filtrar por org_activa o ver todas?
- **Opción 1**: Filtrar todo por `current_org_id` → Aislamiento total
- **Opción 2**: Permitir ver datos de todas las orgs → Confusión

**Recomendación**: Opción 1 - Filtrar por org activa.

### 3. Migración de Usuarios Existentes
**Problema**: Usuarios actuales no tienen `current_org_id` set.

**Solución**:
```sql
-- Migration: Set current_org_id = primera org del usuario
UPDATE profiles p
SET current_org_id = (
  SELECT org_id FROM org_members 
  WHERE user_id = p.id 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE current_org_id IS NULL;
```

---

## 🎯 Plan de Implementación (Alto Nivel)

### Fase 1: Base de Datos
1. Agregar columna `current_org_id UUID` a `profiles`
2. FK a `organizations(id)` ON DELETE SET NULL
3. Índice en `current_org_id`
4. Migrar datos existentes (set primera org)

### Fase 2: Backend
1. Actualizar `getCurrentOrg()` para usar `current_org_id`
2. Agregar fallback a organizations[0] si null
3. Crear `switchOrganization(orgId)` action
4. Validar que user pertenece a org antes de switch

### Fase 3: API Endpoints
1. `inviteUserToOrg(userId, orgId)` - Insertar en org_members
2. `getOrgMembers(orgId)` - Listar con roles
3. `removeUserFromOrg(userId, orgId)` - Soft/hard delete
4. Validaciones de permisos (solo admin/owner)

### Fase 4: UI Components
1. `OrgSwitcher.tsx` - Dropdown con todas las orgs del usuario
2. `TeamDashboard.tsx` - Container principal
3. `InviteMemberForm.tsx` - Input + botón invitar
4. `MembersList.tsx` - Tabla con roles
5. Integrar en `AccountSettings.tsx` tab "team"

### Fase 5: Testing & Rollout
1. Probar switch entre orgs
2. Verificar aislamiento de datos
3. Probar invitaciones
4. Deploy incremental

---

## 📊 Archivos Clave a Modificar

```
prisma/schema.prisma                    # +current_org_id
supabase/migrations/XXX_add_current_org.sql
src/lib/helpers/getCurrentOrg.ts        # CRÍTICO
src/app/actions/organizationActions.ts  # +4 funciones
src/app/[locale]/(app)/profile/
  ├── AccountSettings.tsx               # Conectar Team tab
  ├── TeamDashboard.tsx                 # NUEVO
  ├── OrgSwitcher.tsx                   # NUEVO
  └── InviteMemberForm.tsx              # NUEVO
```

---

## 🚨 Puntos de Atención

1. **getCurrentOrg() es CRÍTICO**: Usado en 40+ lugares
2. **RLS debe actualizarse**: Filtrar por current_org_id si implementamos aislamiento
3. **Supabase Auth**: Sesión persiste org_id o solo DB?
4. **UX**: ¿Qué pasa si user no tiene orgs? (Crear automáticamente)
5. **Permisos**: Solo owner/admin pueden invitar?

---

## 📝 Preguntas Pendientes

1. ¿Aislamiento total por org o ver todas simultáneamente?
2. ¿Permitir a users crear nuevas orgs libremente?
3. ¿Invitación por email o solo por user_id existente?
4. ¿Qué pasa si usuario es removido de su org activa?
5. ¿Auditoría de cambios de org? (audit_log)

---

## 🔥 Quick Reference - getCurrentOrg()

**Ubicación**: `src/lib/helpers/getCurrentOrg.ts`

**Uso actual (40+ files)**:
```typescript
const org = await getCurrentOrg()
// org = { id, name, slug, settings, ... }
```

**Cambio requerido**:
```typescript
// ANTES:
return organizations[0].organizations

// DESPUÉS:
const profile = await prisma.profile.findUnique({
  where: { id: user.id },
  select: { current_org_id: true }
})

if (profile?.current_org_id) {
  return organizations.find(o => o.id === profile.current_org_id)
}

return organizations[0]?.organizations // Fallback
```

---

**Fecha**: 11 Dic 2025  
**Estado**: Análisis completo - Listo para implementación  
**Próximo paso**: Esperar corrección de errores existentes antes de proceder
