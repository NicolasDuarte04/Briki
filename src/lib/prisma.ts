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
// Ahora incluye verificación de health check para asegurar que el engine está realmente listo
export async function reconnectPrisma(maxAttempts: number = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 [Prisma] Intento de reconexión ${attempt}/${maxAttempts}...`);
      
      // Desconectar si ya está conectado
      try {
        await prisma.$disconnect();
      } catch (e) {
        // Ignorar error si ya está desconectado
      }
      
      // Delay progresivo antes de reconectar
      await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
      
      // Reconectar
      await prisma.$connect();
      console.log('✅ [Prisma] Conexión establecida');
      
      // ✅ CORRECCIÓN CRÍTICA: Verificar que el engine esté realmente listo
      // Hacer un health check con múltiples intentos
      for (let healthAttempt = 1; healthAttempt <= 3; healthAttempt++) {
        try {
          await prisma.$queryRaw`SELECT 1`;
          console.log('✅ [Prisma] Engine verificado y listo');
          return true;
        } catch (healthError: any) {
          if (healthAttempt < 3) {
            console.warn(`⚠️ [Prisma] Health check falló (${healthAttempt}/3), esperando...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          } else {
            throw healthError;
          }
        }
      }
      
      return true;
    } catch (error: any) {
      console.error(`❌ [Prisma] Error en intento ${attempt}/${maxAttempts}:`, error.message);
      
      if (attempt === maxAttempts) {
        console.error('❌ [Prisma] Reconexión falló después de todos los intentos');
        return false;
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
  
  return false;
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
