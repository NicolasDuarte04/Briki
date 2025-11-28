import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

// ✅ CORRECCIÓN: Priorizar DATABASE_URL (pooler - puerto 6543) para runtime
// DIRECT_URL (puerto 5432) solo se usa si DATABASE_URL no está disponible
const connectionUrl = process.env.DATABASE_URL || process.env.DIRECT_URL

// ✅ CORRECCIÓN CRÍTICA: Validar que la URL de conexión esté configurada
if (!connectionUrl) {
  console.error('❌ [Prisma] DATABASE_URL or DIRECT_URL environment variable is not set.');
  console.error('❌ [Prisma] Please configure your database connection in .env.local');
  throw new Error('Database connection URL is not configured. Please set DATABASE_URL or DIRECT_URL in your environment variables.');
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl
    }
  },
  log: ['error', 'warn'],
  errorFormat: 'minimal',
})

// ℹ️  NOTA: Para configurar pool de conexiones y timeouts, usar parámetros en DATABASE_URL:
//    Ejemplo: postgresql://...?connection_limit=20&pool_timeout=30&connect_timeout=10
//    O configurar en Supabase Dashboard → Project Settings → Database → Connection pooling

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}


// ✅ CORRECCIÓN INTEGRAL: Función de health check para la BD
export async function checkDatabaseHealth() {
  try {
    // Query simple para verificar conectividad
    await prisma.$queryRaw`SELECT 1`;
    return { healthy: true, error: null };
  } catch (error: any) {
    return {
      healthy: false,
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
}
