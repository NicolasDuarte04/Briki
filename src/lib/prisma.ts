import { PrismaClient } from '@prisma/client'

// --- TEMPORARY FIX ---
// Forcibly override the datasource to ensure connection to Supabase.
// This is a temporary diagnostic step to bypass environment variable issues.
const SUPABASE_DIRECT_URL = "postgresql://postgres.vkzukorwsllzhpnzdmlo:nebnob-gegvYt-hoccu7@aws-1-us-east-2.pooler.supabase.com:5432/postgres?options=-csearch_path=auth,public&sslmode=require"

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: SUPABASE_DIRECT_URL,
    },
  },
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
