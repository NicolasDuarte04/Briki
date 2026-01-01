#!/bin/bash

echo "🔧 Final connection fix for Briki..."

# Step 1: Kill any running dev servers
echo "Stopping all Next.js processes..."
pkill -f "next dev" || true
sleep 2

# Step 2: Clear all caches
echo "Clearing all caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules/.prisma

# Step 3: Force regenerate Prisma client with connection pooling
echo "Regenerating Prisma client..."
export DATABASE_URL=$(grep "DATABASE_URL.*6543" .env | cut -d'"' -f2)
export DIRECT_URL=""  # Intentionally empty to prevent fallback
npx prisma generate

# Step 4: Create a startup wrapper that forces correct connection
cat > start-dev.sh << 'EOF'
#!/bin/bash
# Force use of pooled connection
export DATABASE_URL=$(grep "DATABASE_URL.*6543" .env | cut -d'"' -f2)
export DIRECT_URL=""  # Prevent fallback to direct connection

# Add connection stability settings
export PRISMA_CLIENT_CONNECT_TIMEOUT=30
export PRISMA_QUERY_ENGINE_HTTP_TIMEOUT=30
export NODE_OPTIONS="--max-old-space-size=4096"

echo "🚀 Starting with pooled connection on port 6543..."
echo "📊 DATABASE_URL is set to use port $(echo $DATABASE_URL | grep -o ':[0-9]\{4\}' | cut -d: -f2)"

pnpm dev
EOF

chmod +x start-dev.sh

echo "✅ Fix applied! Now run:"
echo "   ./start-dev.sh"
echo ""
echo "This will ensure Prisma ONLY uses the pooled connection on port 6543."
