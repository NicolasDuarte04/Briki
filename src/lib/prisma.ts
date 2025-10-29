import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

// ✅ FIX: Usar DIRECT_URL si está disponible para mejor performance
const connectionUrl = process.env.DIRECT_URL || process.env.DATABASE_URL

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl
    }
  },
  log: ['error', 'warn'],
  // ✅ CORRECCIÓN CRÍTICA: Configurar pool de conexiones
  __internal: {
    engine: {
      connectionLimit: 20, // Aumentar límite de conexiones
      poolTimeout: 30, // Aumentar timeout del pool
    }
  }
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// ✅ CORRECCIÓN INTEGRAL: Función de reconexión robusta con múltiples estrategias
export async function reconnectPrisma() {
  try {
    console.log('🔄 [Prisma] Iniciando reconexión...');
    await prisma.$disconnect();
    
    // Pequeño delay antes de reconectar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await prisma.$connect();
    console.log('✅ [Prisma] Reconectado exitosamente');
    return true;
  } catch (error) {
    console.error('❌ [Prisma] Error reconectando:', error);
    return false;
  }
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
