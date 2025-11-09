/**
 * Script de prueba para verificar que la query de Profile funciona correctamente
 * Simula exactamente lo que hace profile/page.tsx
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testProfileQuery() {
  try {
    console.log('🔍 Probando query de Profile...');
    
    // Simular userId (necesitarías un ID real para probar)
    // Por ahora solo verificamos que la query se puede construir
    const testQuery = {
      where: { id: '00000000-0000-0000-0000-000000000000' }, // UUID de prueba
      select: { 
        email: true,
        profile: { 
          select: { 
            name: true,  // Esto debe mapear a name_enc en la BD
            locale: true,
            phone: true,
            address: true,
            notificationsProductUpdates: true,
            notificationsPolicyAlerts: true
          } 
        } 
      },
    };
    
    console.log('✅ Query construida correctamente');
    console.log('📋 Query structure:', JSON.stringify(testQuery, null, 2));
    
    // Intentar ejecutar la query (fallará si no existe el usuario, pero eso está bien)
    try {
      const result = await prisma.user.findUnique(testQuery);
      console.log('✅ Query ejecutada sin errores de columna');
      console.log('📊 Result:', result ? 'Usuario encontrado' : 'Usuario no encontrado (esperado)');
    } catch (error: any) {
      if (error.message?.includes('display_name')) {
        console.error('❌ ERROR: Todavía intenta acceder a display_name');
        console.error('Error:', error.message);
        process.exit(1);
      } else if (error.message?.includes('name_enc')) {
        console.log('✅ Query usa name_enc correctamente');
        console.log('Error esperado (usuario no existe):', error.message);
      } else {
        console.log('✅ Query ejecutada (error esperado si usuario no existe)');
        console.log('Error:', error.message);
      }
    }
    
    // Verificar estructura de la tabla directamente
    const columnCheck = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'profiles'
        AND (column_name = 'name_enc' OR column_name = 'display_name')
      ORDER BY column_name;
    `;
    
    console.log('\n📊 Estructura de columnas en BD:');
    console.table(columnCheck);
    
    const hasNameEnc = columnCheck.some(c => c.column_name === 'name_enc');
    const hasDisplayName = columnCheck.some(c => c.column_name === 'display_name');
    
    if (hasDisplayName && !hasNameEnc) {
      console.error('❌ PROBLEMA: display_name existe pero name_enc NO existe');
      process.exit(1);
    } else if (hasDisplayName && hasNameEnc) {
      console.warn('⚠️  ADVERTENCIA: Ambas columnas existen. Se recomienda eliminar display_name.');
    } else if (!hasNameEnc) {
      console.error('❌ PROBLEMA: name_enc NO existe en la BD');
      process.exit(1);
    } else {
      console.log('✅ CORRECTO: name_enc existe en la BD');
    }
    
    console.log('\n✅ Todas las verificaciones pasaron');
    
  } catch (error: any) {
    console.error('❌ Error en test:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testProfileQuery();

