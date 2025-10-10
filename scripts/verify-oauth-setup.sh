#!/bin/bash
# Verify OAuth Setup - Quick diagnostic tool
# Run this to check if your environment is ready for OAuth

echo "🔍 Briki OAuth Setup Verification"
echo "=================================="
echo ""

ERRORS=0
WARNINGS=0

# Check 1: .env.local exists
echo "📄 Checking .env.local..."
if [ ! -f ".env.local" ]; then
  echo "   ❌ FAILED: .env.local not found"
  echo "      Create it using the template in OAUTH_QUICK_START.md"
  ((ERRORS++))
else
  echo "   ✅ .env.local exists"
  
  # Check environment variables
  source .env.local
  
  echo ""
  echo "🔑 Checking environment variables..."
  
  if [ -z "$NEXTAUTH_URL" ]; then
    echo "   ❌ NEXTAUTH_URL not set"
    ((ERRORS++))
  elif [ "$NEXTAUTH_URL" != "http://localhost:3000" ]; then
    echo "   ⚠️  NEXTAUTH_URL is $NEXTAUTH_URL (should be http://localhost:3000)"
    ((WARNINGS++))
  else
    echo "   ✅ NEXTAUTH_URL = http://localhost:3000"
  fi
  
  if [ -z "$AUTH_SECRET" ] || [ "$AUTH_SECRET" = "REPLACE_WITH_SECURE_SECRET" ]; then
    echo "   ❌ AUTH_SECRET not set or using placeholder"
    echo "      Generate with: openssl rand -base64 32"
    ((ERRORS++))
  else
    SECRET_LEN=${#AUTH_SECRET}
    if [ $SECRET_LEN -lt 32 ]; then
      echo "   ⚠️  AUTH_SECRET is too short ($SECRET_LEN chars, recommend 32+)"
      ((WARNINGS++))
    else
      echo "   ✅ AUTH_SECRET is set (${SECRET_LEN} chars)"
    fi
  fi
  
  if [ -z "$GOOGLE_CLIENT_ID" ] || [ "$GOOGLE_CLIENT_ID" = "REPLACE_WITH_GOOGLE_CLIENT_ID" ]; then
    echo "   ❌ GOOGLE_CLIENT_ID not set"
    ((ERRORS++))
  else
    echo "   ✅ GOOGLE_CLIENT_ID is set"
  fi
  
  if [ -z "$GOOGLE_CLIENT_SECRET" ] || [ "$GOOGLE_CLIENT_SECRET" = "REPLACE_WITH_GOOGLE_CLIENT_SECRET" ]; then
    echo "   ❌ GOOGLE_CLIENT_SECRET not set"
    ((ERRORS++))
  else
    echo "   ✅ GOOGLE_CLIENT_SECRET is set"
  fi
  
  if [ -z "$DATABASE_URL" ]; then
    echo "   ❌ DATABASE_URL not set"
    ((ERRORS++))
  else
    echo "   ✅ DATABASE_URL is set"
  fi
fi

# Check 2: Port 3000 availability
echo ""
echo "🌐 Checking port 3000..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
  echo "   ⚠️  Port 3000 is already in use"
  echo "      Kill process with: lsof -ti:3000 | xargs kill -9"
  ((WARNINGS++))
else
  echo "   ✅ Port 3000 is available"
fi

# Check 3: PostgreSQL connection
echo ""
echo "🗄️  Checking PostgreSQL..."
if [ -z "$DATABASE_URL" ]; then
  echo "   ⏭️  Skipping (DATABASE_URL not set)"
else
  if command -v psql &> /dev/null; then
    if psql "$DATABASE_URL" -c '\q' 2>/dev/null; then
      echo "   ✅ PostgreSQL connection successful"
      
      # Check if tables exist
      TABLES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('User', 'Account', 'Session')" 2>/dev/null | xargs)
      if [ "$TABLES" = "3" ]; then
        echo "   ✅ NextAuth tables exist"
      else
        echo "   ⚠️  NextAuth tables missing (found $TABLES/3)"
        echo "      Run: pnpm prisma db push"
        ((WARNINGS++))
      fi
    else
      echo "   ❌ Cannot connect to PostgreSQL"
      echo "      Check DATABASE_URL and ensure PostgreSQL is running"
      ((ERRORS++))
    fi
  else
    echo "   ⚠️  psql not found (cannot verify connection)"
    echo "      Connection will be tested when app starts"
    ((WARNINGS++))
  fi
fi

# Check 4: Prisma client
echo ""
echo "⚙️  Checking Prisma..."
if [ -d "node_modules/.prisma/client" ]; then
  echo "   ✅ Prisma client generated"
else
  echo "   ⚠️  Prisma client not generated"
  echo "      Run: pnpm prisma generate"
  ((WARNINGS++))
fi

# Check 5: NextAuth route
echo ""
echo "📂 Checking NextAuth files..."
if [ -f "src/app/api/auth/[...nextauth]/route.ts" ]; then
  echo "   ✅ NextAuth route exists"
  
  if grep -q 'runtime = "nodejs"' "src/app/api/auth/[...nextauth]/route.ts"; then
    echo "   ✅ Runtime set to nodejs"
  else
    echo "   ❌ Runtime not set to nodejs (may cause 405 errors)"
    ((ERRORS++))
  fi
else
  echo "   ❌ NextAuth route not found"
  ((ERRORS++))
fi

if [ -f "auth.ts" ]; then
  echo "   ✅ auth.ts exists"
else
  echo "   ❌ auth.ts not found"
  ((ERRORS++))
fi

# Check 6: Dependencies
echo ""
echo "📦 Checking dependencies..."
if [ -f "node_modules/next-auth/package.json" ]; then
  NEXTAUTH_VERSION=$(node -p "require('./node_modules/next-auth/package.json').version")
  echo "   ✅ next-auth installed (v$NEXTAUTH_VERSION)"
else
  echo "   ❌ next-auth not installed"
  echo "      Run: pnpm install"
  ((ERRORS++))
fi

# Summary
echo ""
echo "=================================="
echo "📊 Summary"
echo "=================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ All checks passed! You're ready to start the app."
  echo ""
  echo "Next steps:"
  echo "  1. Run: pnpm dev"
  echo "  2. Open: http://localhost:3000"
  echo "  3. Click 'Login' and test OAuth flow"
  echo ""
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  Setup is mostly complete with $WARNINGS warning(s)."
  echo ""
  echo "You can try starting the app, but you may encounter issues."
  echo "Review the warnings above and fix them if possible."
  echo ""
  exit 0
else
  echo "❌ Setup incomplete. Found $ERRORS error(s) and $WARNINGS warning(s)."
  echo ""
  echo "Please fix the errors above before starting the app."
  echo ""
  echo "Quick fixes:"
  if [ ! -f ".env.local" ]; then
    echo "  • Create .env.local (see OAUTH_QUICK_START.md)"
  fi
  echo "  • Run: ./scripts/setup-oauth.sh"
  echo "  • Or follow: docs/OAUTH_SETUP.md"
  echo ""
  exit 1
fi

