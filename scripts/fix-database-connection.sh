#!/bin/bash
# Fix Database Connection Script for Supabase
# This script updates the database URLs to use the pooled connection with project ref

set -e

echo "🔧 Fixing Database Connection for Supabase"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the briki directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}❌ This script must be run from the briki directory${NC}"
  exit 1
fi

# Prompt for database password
echo -e "${YELLOW}Please enter your Supabase database password:${NC}"
read -s DB_PASSWORD
echo ""

# Create a temporary .env file for prisma commands
TEMP_ENV=".env.temp"
cat > "$TEMP_ENV" << EOF
# Temporary environment for Prisma migration
DATABASE_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:${DB_PASSWORD}@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:${DB_PASSWORD}@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
EOF

echo -e "${GREEN}✅ Created temporary environment configuration${NC}"

# Test database connection
echo ""
echo "Testing database connection..."
if DATABASE_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:${DB_PASSWORD}@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true" psql -c '\q' 2>/dev/null; then
  echo -e "${GREEN}✅ Database connection successful${NC}"
else
  echo -e "${RED}❌ Failed to connect to database. Please check your password.${NC}"
  rm -f "$TEMP_ENV"
  exit 1
fi

# Generate Prisma client
echo ""
echo "Generating Prisma client..."
dotenv -e "$TEMP_ENV" -- pnpm prisma generate

# Push database schema
echo ""
echo "Creating database tables..."
dotenv -e "$TEMP_ENV" -- pnpm prisma db push --skip-generate

# Clean up temporary file
rm -f "$TEMP_ENV"

# Update or create .env.local with proper values
echo ""
echo "Updating .env.local configuration..."

# Check if .env.local exists and has content
if [ -f ".env.local" ]; then
  # Backup existing file
  cp .env.local .env.local.backup
  echo -e "${GREEN}✅ Backed up existing .env.local to .env.local.backup${NC}"
  
  # Read existing values
  if [ -f ".env.local" ]; then
    source .env.local
  fi
fi

# Generate AUTH_SECRET if not set
if [ -z "$AUTH_SECRET" ] || [ "$AUTH_SECRET" = "REPLACE_WITH_SECURE_SECRET" ]; then
  AUTH_SECRET=$(openssl rand -base64 32)
  echo -e "${GREEN}✅ Generated new AUTH_SECRET${NC}"
fi

# Create new .env.local
cat > .env.local << EOF
# Database URLs - Using pooled connection with project ref in username
DATABASE_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:${DB_PASSWORD}@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.vkzukorwsllzhpnzdmlo:${DB_PASSWORD}@aws-1-us-east-2.pooler.supabase.com:5432/postgres"

# NextAuth Configuration
NEXTAUTH_URL="${NEXTAUTH_URL:-http://localhost:3000}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-$AUTH_SECRET}"
AUTH_SECRET="${AUTH_SECRET}"

# Google OAuth
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-REPLACE_WITH_GOOGLE_CLIENT_ID}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-REPLACE_WITH_GOOGLE_CLIENT_SECRET}"
AUTH_GOOGLE_ID="${AUTH_GOOGLE_ID:-$GOOGLE_CLIENT_ID}"
AUTH_GOOGLE_SECRET="${AUTH_GOOGLE_SECRET:-$GOOGLE_CLIENT_SECRET}"
EOF

echo -e "${GREEN}✅ Updated .env.local with correct database URLs${NC}"

# Check if Google OAuth is configured
echo ""
if [ "$GOOGLE_CLIENT_ID" = "REPLACE_WITH_GOOGLE_CLIENT_ID" ]; then
  echo -e "${YELLOW}⚠️  Google OAuth credentials not configured${NC}"
  echo "   Please update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local"
  echo "   Get these from: https://console.cloud.google.com/apis/credentials"
else
  echo -e "${GREEN}✅ Google OAuth credentials found${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Database connection fixed!${NC}"
echo ""
echo "The following tables have been created:"
echo "  - User"
echo "  - Account" 
echo "  - Session"
echo "  - VerificationToken"
echo "  - Profile"
echo ""
echo "Next steps:"
echo "  1. Ensure Google OAuth credentials are set in .env.local"
echo "  2. Restart your development server: pnpm dev"
echo "  3. Try logging in with Google"
echo ""
echo -e "${YELLOW}Note: Your database password is stored in .env.local${NC}"
echo -e "${YELLOW}Make sure .env.local is in your .gitignore!${NC}"
echo "=========================================="
