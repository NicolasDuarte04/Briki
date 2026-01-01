
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('Testing Prisma connection...');
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL || process.env.DIRECT_URL
      }
    }
  });
  
  try {
    // Test basic connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Test a simple query
    console.log('\nTesting query execution...');
    const result = await prisma.$queryRaw`SELECT current_database(), current_schema(), version()`;
    console.log('✅ Query executed successfully:', result);
    
    // Test table access
    console.log('\nChecking for org_members table...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'org_members'
    `;
    
    if (tables.length > 0) {
      console.log('✅ org_members table exists');
    } else {
      console.log('❌ org_members table not found');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    if (error.code === 'P1017') {
      console.log('\n💡 Server closed the connection. Try:');
      console.log('1. Using the transaction pooler (port 6543) instead of direct connection');
      console.log('2. Adding connection parameters: ?pgbouncer=true&pool_timeout=60');
      console.log('3. Running the SQL script directly in Supabase SQL Editor');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
