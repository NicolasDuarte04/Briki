import { z } from 'zod'

export const LocaleSchema = z.enum(['en', 'es'] as const)

export type LocaleValue = z.infer<typeof LocaleSchema>

export const ProfileInputSchema = z
  .object({
    name: z.string().trim().min(1),
    locale: LocaleSchema,
  })
  .strict()

export type ValidationKey = 'required' | 'invalidUnion'

export type FormErrors = Partial<Record<'name' | 'locale', ValidationKey>>

export type FormState = {
  status?: 'success' | 'error'
  errors?: FormErrors
  values?: { name: string; locale: LocaleValue }
  formError?: 'unauthorized' | 'unknown'
}
