#!/usr/bin/env node

/**
 * Fix Prisma Connection Issues with Supabase
 * 
 * This script helps resolve connection timeout issues when using Prisma with Supabase
 * by configuring proper connection settings and providing diagnostic information.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Prisma Connection Issues...\n');

// Step 1: Check environment variables
console.log('📋 Checking environment variables...');
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

if (!envExists) {
  console.error('❌ .env.local file not found!');
  process.exit(1);
}

// Step 2: Create optimized Prisma schema with connection settings
console.log('\n📝 Creating optimized Prisma configuration...');

const prismaConfig = `
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["auth", "public"]
  // Add connection pool settings for better stability
  connectionLimit = 5
}
`;

// Step 3: Set environment variables for better connection handling
console.log('\n🔗 Setting connection environment variables...');

// These environment variables help with connection stability
const connectionEnvVars = {
  // Increase Node.js connection timeout
  'PRISMA_CLIENT_CONNECT_TIMEOUT': '30',
  // Increase query timeout
  'PRISMA_QUERY_ENGINE_HTTP_TIMEOUT': '30',
  // Enable connection pooling
  'PRISMA_CLIENT_ENGINE_TYPE': 'binary',
  // PostgreSQL specific settings
  'PGCONNECT_TIMEOUT': '30',
  'PGSTATEMENT_TIMEOUT': '0',
  'PGIDLE_IN_TRANSACTION_SESSION_TIMEOUT': '0'
};

// Write a .env.prisma file with optimized settings
const envPrismaContent = Object.entries(connectionEnvVars)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

fs.writeFileSync('.env.prisma', envPrismaContent);

console.log('✅ Created .env.prisma with optimized connection settings');

// Step 4: Create a wrapper script for running Prisma commands
console.log('\n📜 Creating Prisma wrapper script...');

const wrapperScript = `#!/bin/bash
# Prisma wrapper script with timeout settings

# Load environment variables
set -a
[ -f .env.local ] && source .env.local
[ -f .env.prisma ] && source .env.prisma
set +a

# Export timeout settings
export PRISMA_CLIENT_CONNECT_TIMEOUT=30
export PRISMA_QUERY_ENGINE_HTTP_TIMEOUT=30
export NODE_OPTIONS="--max-old-space-size=4096"

# Function to run Prisma commands with retry logic
run_prisma_with_retry() {
  local max_attempts=3
  local attempt=1
  
  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt of $max_attempts..."
    
    if npx prisma "$@"; then
      echo "✅ Command succeeded!"
      return 0
    else
      echo "❌ Attempt $attempt failed"
      
      if [ $attempt -lt $max_attempts ]; then
        echo "Waiting 5 seconds before retry..."
        sleep 5
      fi
      
      ((attempt++))
    fi
  done
  
  echo "❌ All attempts failed"
  return 1
}

# Check if we're using direct connection for migrations
if [[ "$1" == "db" && ("$2" == "push" || "$2" == "deploy") ]]; then
  echo "🔄 Using DIRECT_URL for database migrations..."
  export DATABASE_URL="$DIRECT_URL"
fi

# Run the Prisma command
run_prisma_with_retry "$@"
`;

fs.writeFileSync('prisma-wrapper.sh', wrapperScript);
fs.chmodSync('prisma-wrapper.sh', '755');

console.log('✅ Created prisma-wrapper.sh script');

// Step 5: Alternative connection string formats
console.log('\n🔗 Alternative connection string formats:');
console.log('\nFor .env.local, try these formats:');
console.log('\n# Option 1: With explicit timeouts (recommended)');
console.log('DATABASE_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&pool_timeout=60&connect_timeout=30"');
console.log('\n# Option 2: Direct connection with keep-alive');
console.log('DIRECT_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:5432/postgres?keepalives=1&keepalives_idle=30&keepalives_interval=10&keepalives_count=5"');

// Step 6: Test connection script
console.log('\n📝 Creating connection test script...');

const testScript = `
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
    console.log('\\nTesting query execution...');
    const result = await prisma.$queryRaw\`SELECT current_database(), current_schema(), version()\`;
    console.log('✅ Query executed successfully:', result);
    
    // Test table access
    console.log('\\nChecking for org_members table...');
    const tables = await prisma.$queryRaw\`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'org_members'
    \`;
    
    if (tables.length > 0) {
      console.log('✅ org_members table exists');
    } else {
      console.log('❌ org_members table not found');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    if (error.code === 'P1017') {
      console.log('\\n💡 Server closed the connection. Try:');
      console.log('1. Using the transaction pooler (port 6543) instead of direct connection');
      console.log('2. Adding connection parameters: ?pgbouncer=true&pool_timeout=60');
      console.log('3. Running the SQL script directly in Supabase SQL Editor');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
`;

fs.writeFileSync('test-prisma-connection.js', testScript);

console.log('✅ Created test-prisma-connection.js');

// Final instructions
console.log('\n' + '='.repeat(70));
console.log('🎯 NEXT STEPS:');
console.log('='.repeat(70));
console.log('\n1. IMMEDIATE FIX - Run SQL directly in Supabase:');
console.log('   - Go to your Supabase dashboard');
console.log('   - Navigate to SQL Editor');
console.log('   - Run the contents of: prisma/generate-schema.sql');
console.log('\n2. TEST CONNECTION:');
console.log('   node test-prisma-connection.js');
console.log('\n3. USE WRAPPER FOR PRISMA COMMANDS:');
console.log('   ./prisma-wrapper.sh db push');
console.log('\n4. UPDATE YOUR .env.local:');
console.log('   Add the connection parameters shown above');
console.log('\n5. IF ALL ELSE FAILS:');
console.log('   - Use Supabase SQL Editor for all schema changes');
console.log('   - Use "prisma db pull" to sync your schema after');

console.log('\n✨ Good luck!');
