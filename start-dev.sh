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
