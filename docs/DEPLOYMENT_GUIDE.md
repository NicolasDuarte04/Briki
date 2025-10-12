## Deployment Guide (Esqueleto)

1. Variables de entorno (.env.local)
   - NEXT_PUBLIC_APP_URL
   - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
   - DATABASE_URL
   - APP_ENCRYPTION_KEY

2. Base de datos y Prisma
   - Ejecutar: `npx prisma db pull && npx prisma generate`

3. Storage
   - Bucket `artifacts` en Supabase, policy pública deshabilitada.

4. Build
   - `npm run build` y `npm start`


