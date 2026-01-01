#!/bin/bash
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
