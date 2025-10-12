## Onboarding para Desarrolladores (Esqueleto)

1. Requisitos
   - Node 18+, PNPM/NPM
2. Setup
   - `cp .env.example .env.local` y completar
   - `npm install`
   - `npx prisma db pull && npx prisma generate`
3. Desarrollo
   - `npm run dev`
   - Rutas clave: `/workspace/cases`, `/workspace/clients`, `/dashboard`
4. Estándares
   - TypeScript estricto
   - Lint: `npm run lint`


