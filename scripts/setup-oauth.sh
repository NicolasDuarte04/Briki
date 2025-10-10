#!/bin/bash
# Quick OAuth Setup Script for Briki
# Run this after configuring Google OAuth Console

set -e

echo "🔧 Briki OAuth Setup Script"
echo "================================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "❌ .env.local not found!"
  echo ""
  echo "Creating .env.local from template..."
  
  cat > .env.local << 'EOF'
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=REPLACE_WITH_SECURE_SECRET
NEXTAUTH_SECRET=REPLACE_WITH_SECURE_SECRET

# Google OAuth Credentials
GOOGLE_CLIENT_ID=REPLACE_WITH_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=REPLACE_WITH_GOOGLE_CLIENT_SECRET
AUTH_GOOGLE_ID=REPLACE_WITH_GOOGLE_CLIENT_ID
AUTH_GOOGLE_SECRET=REPLACE_WITH_GOOGLE_CLIENT_SECRET

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/briki
EOF
  
  echo "✅ Created .env.local"
  echo ""
  echo "⚠️  You must now edit .env.local and set:"
  echo "   1. AUTH_SECRET (run: openssl rand -base64 32)"
  echo "   2. GOOGLE_CLIENT_ID from Google Console"
  echo "   3. GOOGLE_CLIENT_SECRET from Google Console"
  echo "   4. DATABASE_URL if different from default"
  echo ""
  read -p "Press Enter after you've updated .env.local..."
else
  echo "✅ .env.local exists"
fi

# Validate environment variables
echo ""
echo "Validating environment variables..."

source .env.local

if [ "$AUTH_SECRET" = "REPLACE_WITH_SECURE_SECRET" ]; then
  echo "❌ AUTH_SECRET not set!"
  echo "   Generate with: openssl rand -base64 32"
  exit 1
fi

if [ "$GOOGLE_CLIENT_ID" = "REPLACE_WITH_GOOGLE_CLIENT_ID" ]; then
  echo "❌ GOOGLE_CLIENT_ID not set!"
  exit 1
fi

if [ "$GOOGLE_CLIENT_SECRET" = "REPLACE_WITH_GOOGLE_CLIENT_SECRET" ]; then
  echo "❌ GOOGLE_CLIENT_SECRET not set!"
  exit 1
fi

echo "✅ Environment variables configured"

# Check if PostgreSQL is running
echo ""
echo "Checking PostgreSQL connection..."

if psql "$DATABASE_URL" -c '\q' 2>/dev/null; then
  echo "✅ PostgreSQL connected"
else
  echo "❌ Cannot connect to PostgreSQL"
  echo ""
  echo "Start PostgreSQL with Docker:"
  echo "  docker run --name briki-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=briki -p 5432:5432 -d postgres:15"
  echo ""
  read -p "Press Enter after PostgreSQL is running..."
fi

# Generate Prisma client
echo ""
echo "Generating Prisma client..."
pnpm prisma generate

# Push database schema
echo ""
echo "Pushing database schema..."
pnpm prisma db push

echo ""
echo "================================"
echo "✅ OAuth setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start dev server: pnpm dev"
echo "  2. Open http://localhost:3000"
echo "  3. Click Login and test OAuth flow"
echo ""
echo "See docs/OAUTH_SETUP.md for detailed troubleshooting"
echo "================================"

