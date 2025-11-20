// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Verificar o crear organización de desarrollo
  console.log('📝 Checking for development organization...');
  let org = await prisma.organizations.findUnique({
    where: { slug: 'briki-dev' }
  });

  if (!org) {
    console.log('📝 Creating development organization...');
    org = await prisma.organizations.create({
      data: {
        name: 'Briki Development Org',
        slug: 'briki-dev',
        settings: {
          environment: 'development'
        }
      }
    });
    console.log('✅ Organization created:', org.id);
  } else {
    console.log('✅ Organization already exists:', org.id);
  }

  // 2. Limpiar casos de prueba existentes para evitar duplicados
  console.log('🧹 Cleaning up existing test cases...');
  await prisma.case.deleteMany({
    where: {
      orgId: org.id,
      clientName: {
        in: ['Test Client 1', 'Test Client 2']
      }
    }
  });

  // 3. Crear casos de prueba
  console.log('📝 Creating test cases...');
  
  const case1 = await prisma.case.create({
    data: {
      orgId: org.id,
      clientName: 'Test Client 1',
      status: 'draft',
      stage: 'initial',
      priority: 'medium',
      budget_currency: 'COP',
      briefData: {
        freeText: 'Este es un caso de prueba para desarrollo'
      }
    }
  });
  console.log('✅ Test case 1 created:', case1.id);

  const case2 = await prisma.case.create({
    data: {
      orgId: org.id,
      clientName: 'Test Client 2',
      status: 'active',
      stage: 'sourcing',
      priority: 'high',
      budget_currency: 'USD',
      briefData: {
        freeText: 'Caso de prueba activo'
      }
    }
  });
  console.log('✅ Test case 2 created:', case2.id);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
