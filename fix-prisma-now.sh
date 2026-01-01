#!/bin/bash
# Quick fix script for Prisma database setup

echo "🔧 Fixing Prisma database setup..."
echo ""

# Remove conflicting files
echo "1. Removing conflicting environment files..."
rm -f .env 2>/dev/null
rm -f prisma/.env 2>/dev/null
echo "✅ Cleaned up conflicting files"

# Set environment variables from .env.local
echo ""
echo "2. Loading environment variables..."
export DATABASE_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:7lf2JjMHfDy2Wbtq@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
export DIRECT_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:7lf2JjMHfDy2Wbtq@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
echo "✅ Environment variables set"

# Generate Prisma client
echo ""
echo "3. Generating Prisma client..."
pnpm prisma generate

# Push database schema
echo ""
echo "4. Creating database tables..."
pnpm prisma db push --skip-generate

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Now you can start the development server with:"
echo "  pnpm dev"
echo ""
echo "Then visit http://localhost:3000 and try logging in!"
