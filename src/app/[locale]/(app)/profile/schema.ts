import { z } from 'zod'

export const LocaleSchema = z.enum(['en', 'es'] as const)

export type LocaleValue = z.infer<typeof LocaleSchema>

export const ProfileInputSchema = z
  .object({
    name: z.string().trim().min(1),
    locale: LocaleSchema,
  })
  .strict()

// ⚠️ CÓDIGO LEGACY - NO USAR
// Los siguientes tipos ya no se utilizan en la implementación actual.
// Se mantienen temporalmente para evitar breaking changes.
// 
// NOTA: La implementación actual usa FormState de './actions.ts' que es:
// export type FormState = { ok: true } | { ok: false; message: string }
//
// TODO (Futuro): Evaluar si se puede eliminar completamente este código legacy
// después de verificar que no se usa en branches o PRs en progreso.

/**
 * @deprecated No se usa. Ver FormState en ./actions.ts
 */
export type ValidationKey = 'required' | 'invalidUnion'

/**
 * @deprecated No se usa. Ver FormState en ./actions.ts
 */
export type FormErrors = Partial<Record<'name' | 'locale', ValidationKey>>

/**
 * @deprecated No se usa. Ver FormState en ./actions.ts
 */
export type FormState = {
  status?: 'success' | 'error'
  errors?: FormErrors
  values?: { name: string; locale: LocaleValue }
  formError?: 'unauthorized' | 'unknown'
}
