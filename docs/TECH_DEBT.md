### Deuda técnica: remover flags de ignorar ESLint/TS en Next build

**Contexto**
- Para desbloquear el build actual se activaron flags que ignoran errores de ESLint y TypeScript en `next.config.ts`.
- Debemos revertir estos flags en una iteración futura cuando el repositorio esté limpio.

**Archivo afectado**
- `next.config.ts`
  - `eslint: { ignoreDuringBuilds: true }`
  - `typescript: { ignoreBuildErrors: true }`

**Alcance**
- Corregir los errores de ESLint y TypeScript que hoy impiden el build sin flags.
- Mantener el comportamiento actual de la app; evitar refactors grandes no necesarios.
- No cambiar la configuración en esta iteración; solo documentar la deuda.

**Criterio de aceptación**
- Se eliminan ambas opciones en `next.config.ts`.
- El build pasa sin dichas flags.

**Notas**
- No tocar otras opciones de `next.config.ts` (p. ej. `turbopack`, `reactStrictMode`, ajustes de `webpack`).
- Si aparecen bloqueos puntuales, reintroducir temporalmente la flag mínima y abrir issues específicos por error.

**Checklist sugerido**
- Listar errores TS/ESLint actuales.
- Corregirlos.
- Quitar `eslint.ignoreDuringBuilds` y `typescript.ignoreBuildErrors` de `next.config.ts`.
- Confirmar que `pnpm build` pasa sin flags.


