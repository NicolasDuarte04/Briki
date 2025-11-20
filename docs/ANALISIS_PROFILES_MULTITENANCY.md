# 📊 ANÁLISIS EXHAUSTIVO: MULTI-TENANCY EN TABLA `profiles`

**Fecha**: 2025-01-08  
**Prioridad**: MEDIA-ALTA  
**Objetivo**: Analizar exhaustivamente la falta de multi-tenancy en `profiles` y determinar mejoras necesarias

---

## 🎯 PROBLEMA IDENTIFICADO

La tabla `profiles` **NO considera multi-tenancy** en sus políticas RLS. Actualmente solo permite que cada usuario vea su propio perfil, sin considerar la relación con organizaciones.

---

## 1️⃣ ESTRUCTURA ACTUAL DE `profiles`

### ✅ Aspectos Implementados Correctamente

#### 1.1. Estructura de Columnas
```sql
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name_enc bytea,                    -- ✅ Cifrado (BYTEA)
    phone bytea,                       -- ✅ Cifrado (BYTEA)
    address bytea,                     -- ✅ Cifrado (BYTEA)
    locale text DEFAULT 'en',
    onboarding_completed boolean DEFAULT false,
    notifications_product_updates boolean DEFAULT false,
    notifications_policy_alerts boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

**Estado**: ✅ Correcto - Estructura adecuada, cifrado implementado

---

#### 1.2. Relación con `auth.users`
- ✅ Foreign Key: `id → auth.users.id`
- ✅ `ON DELETE CASCADE`
- ✅ Relación 1:1 (un usuario = un perfil)

**Estado**: ✅ Correcto

---

#### 1.3. Cifrado de PII
- ✅ `name_enc` como `BYTEA` (cifrado)
- ✅ `phone` como `BYTEA` (cifrado)
- ✅ `address` como `BYTEA` (cifrado)
- ✅ Funciones `encrypt_pii()` / `decrypt_pii()` disponibles
- ✅ Helpers TypeScript implementados

**Estado**: ✅ Correcto

---

### ❌ PROBLEMA CRÍTICO: Falta de Multi-Tenancy

#### 1.4. **NO hay relación directa con `organizations`**

**Problema**:
- ❌ No hay columna `org_id` en `profiles`
- ❌ No hay Foreign Key a `organizations`
- ❌ No hay relación indirecta explícita

**Relación actual**:
```
profiles → auth.users → org_members → organizations
```

**Problema**: La relación es indirecta y no se usa en RLS.

---

#### 1.5. **RLS NO considera organizaciones**

**Políticas RLS actuales** (`20251004T000000_profiles.sql`):

```sql
-- SELECT: Solo puede ver su propio perfil
CREATE POLICY "Users can select own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

-- INSERT: Solo puede crear su propio perfil
CREATE POLICY "Users can insert own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- UPDATE: Solo puede actualizar su propio perfil
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);
```

**Problema identificado**:
- ❌ **No hay política DELETE** (aunque no se usa actualmente)
- ❌ **No considera organizaciones**: Solo `auth.uid() = id`
- ❌ **No permite a admins/owners ver perfiles de miembros**
- ❌ **No permite a miembros ver perfiles de compañeros** (si se requiere)

---

## 2️⃣ ANÁLISIS DE CÓDIGO RELACIONADO

### ✅ Código que usa `profiles` (Análisis Exhaustivo)

#### 2.1. **`src/app/[locale]/(app)/profile/page.tsx`**
**Uso**: Lee perfil del usuario actual

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { 
    profile: { 
      select: { 
        name: true, 
        locale: true,
        phone: true,
        address: true,
        // ...
      } 
    } 
  },
});
```

**Análisis**:
- ✅ Solo accede a su propio perfil (`userId` del usuario autenticado)
- ✅ No necesita multi-tenancy (uso personal)
- ⚠️ **No verifica organización** (pero no es necesario para este caso)

**Evaluación**: ✅ Correcto para uso personal

---

#### 2.2. **`src/app/[locale]/(app)/profile/actions.ts`**
**Uso**: Actualiza perfil del usuario actual

```typescript
const existingProfile = await prisma.profile.findUnique({
  where: { id: userId },
  // ...
});

await prisma.profile.update({
  where: { id: userId },
  data: updateData,
});
```

**Análisis**:
- ✅ Solo actualiza su propio perfil
- ✅ No necesita multi-tenancy (uso personal)
- ⚠️ **No verifica organización** (pero no es necesario)

**Evaluación**: ✅ Correcto para uso personal

---

#### 2.3. **`src/app/[locale]/(auth)/actions.ts`**
**Uso**: Crea perfil al registrarse

```typescript
await prisma.profile.upsert({
  where: { id: authData.user.id },
  update: {},
  create: {
    id: authData.user.id,
    name: null,
    locale: 'en'
  }
});
```

**Análisis**:
- ✅ Crea perfil del usuario recién registrado
- ✅ Luego crea organización y membresía
- ⚠️ **No hay relación explícita** entre profile y organization

**Evaluación**: ✅ Funcional, pero falta relación explícita

---

#### 2.4. **`src/app/api/profile/name/route.ts`**
**Uso**: Obtiene nombre del perfil

```typescript
const profile = await prisma.profile.findUnique({
  where: { id: user.id },
  select: { name: true },
});
```

**Análisis**:
- ✅ Solo accede a su propio perfil
- ✅ No necesita multi-tenancy

**Evaluación**: ✅ Correcto

---

### ❌ CASOS DE USO FALTANTES (Multi-Tenancy)

#### 2.5. **Falta: Listar miembros de una organización**

**Caso de uso esperado**:
- Admin/Owner quiere ver lista de miembros de su organización
- Necesita ver nombres y perfiles de compañeros
- Actualmente: **NO IMPLEMENTADO**

**Código que debería existir** (pero no existe):
```typescript
// ❌ NO EXISTE
export async function getOrgMembers(orgId: string) {
  const members = await prisma.org_members.findMany({
    where: { org_id: orgId },
    include: { 
      users: {
        include: { profile: true } // ❌ RLS bloquearía esto
      }
    }
  });
  return members;
}
```

**Problema**: RLS actual bloquearía el acceso a perfiles de otros usuarios.

---

#### 2.6. **Falta: Ver perfil de un miembro específico**

**Caso de uso esperado**:
- Admin quiere ver perfil de un miembro de su organización
- Actualmente: **NO IMPLEMENTADO**

**Código que debería existir** (pero no existe):
```typescript
// ❌ NO EXISTE
export async function getMemberProfile(userId: string, orgId: string) {
  // Verificar que el usuario es miembro de la org
  const membership = await prisma.org_members.findFirst({
    where: { user_id: userId, org_id: orgId }
  });
  
  if (!membership) {
    throw new Error('User is not a member of this organization');
  }
  
  // ❌ RLS bloquearía esto si userId !== auth.uid()
  const profile = await prisma.profile.findUnique({
    where: { id: userId }
  });
  
  return profile;
}
```

**Problema**: RLS actual bloquearía el acceso.

---

#### 2.7. **Falta: Dashboard de miembros**

**Caso de uso esperado**:
- Dashboard muestra estadísticas de miembros de la organización
- Lista de miembros con sus perfiles
- Actualmente: **NO IMPLEMENTADO**

**Evidencia**: No hay código que liste miembros con perfiles.

---

## 3️⃣ ANÁLISIS DE SEGURIDAD Y RLS

### 🔴 PROBLEMA CRÍTICO: RLS No Considera Organizaciones

#### 3.1. **Políticas Actuales vs. Necesarias**

**Políticas actuales**:
```sql
-- Solo puede ver su propio perfil
USING (auth.uid() = id)
```

**Políticas necesarias para multi-tenancy**:
```sql
-- Opción 1: Propio perfil O miembro de la misma organización
USING (
  auth.uid() = id 
  OR id IN (
    SELECT user_id FROM org_members
    WHERE org_id IN (
      SELECT org_id FROM org_members
      WHERE user_id = auth.uid()
    )
  )
)
```

**Diferencia**: Las políticas actuales **NO permiten** ver perfiles de compañeros.

---

#### 3.2. **Análisis de Permisos por Rol**

**Escenario actual**:
- ❌ **Owner**: No puede ver perfiles de miembros
- ❌ **Admin**: No puede ver perfiles de miembros
- ❌ **Member**: No puede ver perfiles de compañeros

**Escenario esperado** (según criterios de roles):
- ✅ **Owner**: Puede ver perfiles de todos los miembros
- ✅ **Admin**: Puede ver perfiles de todos los miembros
- ⚠️ **Member**: ¿Puede ver perfiles de compañeros? (depende de requisitos)

---

## 4️⃣ PROBLEMAS ESPECÍFICOS IDENTIFICADOS

### 🔴 CRÍTICO: No hay relación explícita con organizations

**Problema**:
- `profiles` no tiene `org_id`
- La relación es indirecta: `profiles → users → org_members → organizations`
- RLS no puede usar esta relación indirecta eficientemente

**Impacto**:
- No se puede filtrar perfiles por organización directamente
- No se puede hacer JOIN eficiente con organizations
- RLS debe hacer subconsultas anidadas (menos eficiente)

---

### 🟡 MEDIO: RLS no permite acceso a perfiles de compañeros

**Problema**:
- Políticas actuales solo permiten `auth.uid() = id`
- No hay política que permita ver perfiles de miembros de la misma organización

**Impacto**:
- Admins/Owners no pueden ver perfiles de miembros
- No se puede implementar funcionalidad de "equipo" o "miembros"
- Dashboard no puede mostrar información de miembros

---

### 🟡 MEDIO: Falta política DELETE

**Problema**:
- No hay política DELETE en RLS
- Aunque no se usa actualmente, debería estar preparada

**Impacto**:
- Si se implementa DELETE en el futuro, no habrá control de acceso
- Solo el usuario podría eliminar su propio perfil (¿es correcto?)

---

### 🟢 BAJO: Falta índice para búsquedas por organización

**Problema**:
- No hay índices que optimicen búsquedas de perfiles por organización
- Las búsquedas requieren JOIN con `org_members`

**Impacto**:
- Performance degradada en consultas de miembros por organización

---

## 5️⃣ CASOS DE USO QUE REQUIEREN MULTI-TENANCY

### 5.1. **Listar Miembros de una Organización**

**Requisito**: Admin/Owner quiere ver lista de miembros con sus perfiles.

**Implementación necesaria**:
```typescript
// Código que debería funcionar (pero RLS lo bloquea)
const members = await prisma.org_members.findMany({
  where: { org_id: currentOrg.id },
  include: {
    users: {
      include: {
        profile: true // ❌ RLS bloquea si user_id !== auth.uid()
      }
    }
  }
});
```

**Solución**: Políticas RLS que permitan acceso a perfiles de miembros de la misma organización.

---

### 5.2. **Ver Perfil de un Miembro Específico**

**Requisito**: Admin quiere ver perfil completo de un miembro.

**Implementación necesaria**:
```typescript
// Código que debería funcionar
const profile = await prisma.profile.findUnique({
  where: { id: memberUserId } // ❌ RLS bloquea si memberUserId !== auth.uid()
});
```

**Solución**: Políticas RLS que permitan acceso si el usuario es miembro de la misma organización.

---

### 5.3. **Dashboard de Miembros**

**Requisito**: Mostrar estadísticas y lista de miembros en dashboard.

**Implementación necesaria**:
- API endpoint: `GET /api/organizations/[id]/members`
- Componente UI: Lista de miembros con perfiles
- Estadísticas: Total de miembros, roles, etc.

**Estado actual**: ❌ No implementado

---

## 6️⃣ PLAN DE MEJORAS DETALLADO

### 🔴 PRIORIDAD CRÍTICA: Mejorar Políticas RLS

#### Migración: `20250108_improve_profiles_rls_multitenancy.sql`

**Objetivo**: Agregar políticas RLS que consideren organizaciones.

**Cambios propuestos**:

1. **Mantener política actual** (propio perfil):
   - ✅ SELECT: `auth.uid() = id` (mantener)
   - ✅ INSERT: `auth.uid() = id` (mantener)
   - ✅ UPDATE: `auth.uid() = id` (mantener)

2. **Agregar políticas nuevas** (miembros de la misma organización):
   - ✅ SELECT: Permitir a miembros ver perfiles de compañeros
   - ⚠️ UPDATE: ¿Permitir a admins actualizar perfiles de miembros? (depende de requisitos)
   - ✅ DELETE: Solo admins/owners pueden eliminar perfiles (preparado para futuro)

**Políticas propuestas**:
```sql
-- Política adicional: SELECT - Miembros pueden ver perfiles de compañeros
CREATE POLICY "org_members_can_view_colleague_profiles" 
    ON public.profiles FOR SELECT 
    USING (
        id IN (
            SELECT user_id FROM public.org_members
            WHERE org_id IN (
                SELECT org_id FROM public.org_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- Política adicional: UPDATE - Solo admins/owners pueden actualizar perfiles de miembros
CREATE POLICY "org_admins_can_update_member_profiles" 
    ON public.profiles FOR UPDATE 
    USING (
        -- Puede actualizar su propio perfil
        auth.uid() = id
        OR
        -- O es admin/owner y el perfil es de un miembro de su organización
        (
            id IN (
                SELECT user_id FROM public.org_members
                WHERE org_id IN (
                    SELECT org_id FROM public.org_members
                    WHERE user_id = auth.uid()
                    AND role IN ('admin', 'owner')
                )
            )
        )
    );

-- Política adicional: DELETE - Solo admins/owners pueden eliminar perfiles
CREATE POLICY "org_admins_can_delete_member_profiles" 
    ON public.profiles FOR DELETE 
    USING (
        id IN (
            SELECT user_id FROM public.org_members
            WHERE org_id IN (
                SELECT org_id FROM public.org_members
                WHERE user_id = auth.uid()
                AND role IN ('admin', 'owner')
            )
        )
    );
```

**Consideración importante**: 
- ⚠️ Las políticas actuales (`auth.uid() = id`) son **PERMISIVAS** por defecto
- ⚠️ Las nuevas políticas también son **PERMISIVAS**
- ⚠️ PostgreSQL usa **OR** entre políticas permisivas (no AND)
- ✅ Esto significa que si una política permite acceso, el usuario puede acceder

**Resultado**: El usuario puede ver su propio perfil (política actual) O perfiles de compañeros (nueva política).

---

### 🟡 PRIORIDAD MEDIA: Optimizar Consultas

#### 6.2.1. Índice para búsquedas por organización

**Problema**: Las consultas que buscan perfiles por organización requieren JOIN con `org_members`.

**Solución**: Crear índice compuesto en `org_members`:

```sql
-- Índice para búsquedas de miembros por organización
CREATE INDEX IF NOT EXISTS idx_org_members_org_user 
    ON public.org_members(org_id, user_id);
```

**Beneficio**: Mejora performance de consultas que buscan perfiles por organización.

---

### 🟢 PRIORIDAD BAJA: Considerar columna `org_id` (OPCIONAL)

#### 6.3.1. Agregar `org_id` a `profiles` (Solo si es necesario)

**Análisis**:
- ⚠️ **NO RECOMENDADO** porque:
  - Un usuario puede estar en múltiples organizaciones
  - `profiles` es 1:1 con `users` (un perfil por usuario)
  - ¿Qué `org_id` se pondría si el usuario está en 3 organizaciones?
  
- ✅ **ALTERNATIVA RECOMENDADA**:
  - Mantener relación indirecta: `profiles → users → org_members → organizations`
  - Usar RLS con subconsultas (ya implementado en otras tablas)
  - Es el patrón correcto para usuarios multi-org

**Conclusión**: ❌ NO agregar `org_id` a `profiles`. La relación indirecta es correcta.

---

## 7️⃣ ANÁLISIS DE COMPATIBILIDAD CON CÓDIGO EXISTENTE

### ✅ Código que NO se verá afectado

1. **`src/app/[locale]/(app)/profile/page.tsx`**:
   - ✅ Sigue funcionando (accede a su propio perfil)
   - ✅ Nueva política permite acceso (OR con política actual)

2. **`src/app/[locale]/(app)/profile/actions.ts`**:
   - ✅ Sigue funcionando (actualiza su propio perfil)
   - ✅ Nueva política permite acceso (OR con política actual)

3. **`src/app/[locale]/(auth)/actions.ts`**:
   - ✅ Sigue funcionando (crea su propio perfil)
   - ✅ Política INSERT no cambia

4. **`src/app/api/profile/name/route.ts`**:
   - ✅ Sigue funcionando (lee su propio perfil)

### 🆕 Funcionalidades nuevas habilitadas

1. **Listar miembros de organización**:
   - ✅ Ahora es posible (RLS permite acceso)
   - ⚠️ Requiere implementar código nuevo

2. **Ver perfil de miembro**:
   - ✅ Ahora es posible (RLS permite acceso)
   - ⚠️ Requiere implementar código nuevo

---

## 8️⃣ PLAN DE IMPLEMENTACIÓN DETALLADO

### **PASO 1: Mejorar Políticas RLS**

**Archivo**: `supabase/migrations/20250108_improve_profiles_rls_multitenancy.sql`

**Contenido**:
1. Mantener políticas actuales (no destructivo)
2. Agregar políticas nuevas para acceso a compañeros
3. Agregar política DELETE (preparado para futuro)
4. Verificaciones idempotentes

**Riesgo**: 🟢 BAJO - Políticas permisivas se combinan con OR, no rompen funcionalidad existente

---

### **PASO 2: Agregar Índices de Performance**

**Archivo**: `supabase/migrations/20250108_improve_profiles_rls_multitenancy.sql` (mismo archivo)

**Contenido**:
1. Índice compuesto en `org_members` para búsquedas eficientes

**Riesgo**: 🟢 BAJO - Solo agrega índices, no modifica datos

---

### **PASO 3: Verificación Post-Implementación**

**Script**: `scripts/verify-profiles-multitenancy.sql`

**Verifica**:
1. RLS habilitado
2. Políticas creadas (actuales + nuevas)
3. Índices creados
4. Funcionalidades existentes siguen funcionando

---

## 9️⃣ RESUMEN EJECUTIVO

### ✅ Lo que está bien (70%)

1. Estructura de tabla: Correcta
2. Cifrado PII: Implementado correctamente
3. Relación con `auth.users`: Correcta (1:1)
4. RLS básico: Funciona para uso personal
5. Helpers de cifrado: Implementados correctamente

### ❌ Lo que falta (30%)

1. ❌ **RLS no considera organizaciones** (CRÍTICO)
2. ❌ **No permite ver perfiles de compañeros** (MEDIO)
3. ❌ **No hay política DELETE** (BAJO)
4. ⚠️ **Falta funcionalidad de "equipo/miembros"** (No implementada en código)

### 🎯 Mejoras Necesarias

1. 🔴 **CRÍTICO**: Agregar políticas RLS que permitan acceso a perfiles de miembros de la misma organización
2. 🟡 **MEDIO**: Agregar índices para optimizar consultas
3. 🟢 **BAJO**: Agregar política DELETE (preparado para futuro)

---

## 🚀 PRÓXIMOS PASOS

1. Crear migración `20250108_improve_profiles_rls_multitenancy.sql`
2. Aplicar migración
3. Verificar que funcionalidades existentes siguen funcionando
4. (Opcional) Implementar funcionalidad de "equipo/miembros" en código

---

**Fecha del análisis**: 2025-01-08  
**Estado**: Listo para implementación de mejoras

