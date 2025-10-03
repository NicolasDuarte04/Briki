#!/bin/bash
# Quick Supabase Environment Setup for Briki
# This script configures the correct database URLs for Supabase with pooled connections

set -e

echo "🔧 Supabase Database Configuration Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the briki directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ This script must be run from the briki directory${NC}"
  exit 1
fi

echo -e "${BLUE}ℹ️  This script will configure your database connection to use:${NC}"
echo "   - Pooled endpoint: aws-1-us-east-2.pooler.supabase.com"
echo "   - Project ref in username: postgres.vkzukorwsllzhpnzdmlo"
echo "   - Port 6543 for pooled connections (DATABASE_URL)"
echo "   - Port 5432 for direct connections (DIRECT_URL)"
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
  echo -e "${YELLOW}⚠️  Found existing .env.local${NC}"
  echo "   Creating backup: .env.local.backup"
  cp .env.local .env.local.backup
  
  # Source existing values
  source .env.local
fi

# Prompt for database password
echo -e "${YELLOW}Please enter your Supabase database password:${NC}"
read -s DB_PASSWORD
echo ""

# Generate AUTH_SECRET if not exists
if [ -z "$AUTH_SECRET" ] || [ "$AUTH_SECRET" = "REPLACE_WITH_SECURE_SECRET" ]; then
  echo "Generating new AUTH_SECRET..."
  AUTH_SECRET=$(openssl rand -base64 32)
  echo -e "${GREEN}✅ Generated AUTH_SECRET${NC}"
fi

# Create new .env.local with correct Supabase URLs
cat > .env.local << EOF
# Supabase Database URLs - Using pooled connection with project ref
DATABASE_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:${DB_PASSWORD}@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:${DB_PASSWORD}@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# NextAuth Configuration
NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}"
NEXTAUTH_SECRET="${AUTH_SECRET}"
AUTH_SECRET="${AUTH_SECRET}"

# Google OAuth (keep existing or prompt)
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-REPLACE_WITH_GOOGLE_CLIENT_ID}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-REPLACE_WITH_GOOGLE_CLIENT_SECRET}"
AUTH_GOOGLE_ID="${AUTH_GOOGLE_ID:-$GOOGLE_CLIENT_ID}"
AUTH_GOOGLE_SECRET="${AUTH_GOOGLE_SECRET:-$GOOGLE_CLIENT_SECRET}"
EOF

echo -e "${GREEN}✅ Created .env.local with Supabase configuration${NC}"

# Test database connection
echo ""
echo "Testing database connection..."
if PGPASSWORD="${DB_PASSWORD}" psql -h aws-1-us-east-2.pooler.supabase.com -p 6543 -U postgres.vkzukorwsllzhpnzdmlo -d postgres -c '\q' 2>/dev/null; then
  echo -e "${GREEN}✅ Database connection successful!${NC}"
else
  echo -e "${RED}❌ Failed to connect to database${NC}"
  echo "   Please check your password and try again."
  exit 1
fi

# Check Google OAuth configuration
echo ""
if [ "$GOOGLE_CLIENT_ID" = "REPLACE_WITH_GOOGLE_CLIENT_ID" ]; then
  echo -e "${YELLOW}⚠️  Google OAuth not configured${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Go to https://console.cloud.google.com/apis/credentials"
  echo "2. Create or update your OAuth 2.0 Client ID"
  echo "3. Add these settings:"
  echo "   - Authorized JavaScript origins: http://localhost:3000"
  echo "   - Authorized redirect URIs: http://localhost:3000/api/auth/callback/google"
  echo "4. Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local"
else
  echo -e "${GREEN}✅ Google OAuth credentials found${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ Environment configuration complete!${NC}"
echo ""
echo "Now run these commands to set up the database:"
echo ""
echo -e "${BLUE}# 1. Generate Prisma client:${NC}"
echo "   pnpm prisma generate"
echo ""
echo -e "${BLUE}# 2. Create database tables:${NC}"
echo "   pnpm prisma db push"
echo ""
echo -e "${BLUE}# 3. Start the development server:${NC}"
echo "   pnpm dev"
echo ""
echo -e "${YELLOW}Note: If 'pnpm prisma db push' fails, try:${NC}"
echo "   dotenv -e .env.local -- pnpm prisma db push"
echo "========================================"
