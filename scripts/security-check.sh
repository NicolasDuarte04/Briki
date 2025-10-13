#!/bin/bash

# Security Check Script
# Ejecutar antes de cada deploy a producción
# Basado en: docs/SECURITY_PII_POLICIES.md

set -e

echo "🔒 Briki Security Check"
echo "======================="
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Helper functions
error() {
  echo -e "${RED}❌ ERROR: $1${NC}"
  ERRORS=$((ERRORS + 1))
}

warning() {
  echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
  WARNINGS=$((WARNINGS + 1))
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# 1. Check for console.log with potential PII
echo "1. Checking for console.log with PII..."
PII_PATTERNS="(email|password|token|userId|user_id|phone|address|ssn|credit)"

# Buscar en src/ pero excluir archivos de test y node_modules
CONSOLE_PII=$(grep -rE "console\.(log|error|warn).*${PII_PATTERNS}" src/ \
  --exclude-dir=node_modules \
  --exclude="*.test.ts" \
  --exclude="*.test.tsx" \
  --exclude="*.spec.ts" \
  --exclude="secure-logging.ts" \
  || true)

if [ ! -z "$CONSOLE_PII" ]; then
  error "Found console.log with potential PII:"
  echo "$CONSOLE_PII"
  echo ""
else
  success "No PII in console.log statements"
fi

# 2. Check for SERVICE_ROLE_KEY in client code
echo "2. Checking for SERVICE_ROLE_KEY in client code..."
CLIENT_PATHS="src/components/ src/app/(marketing)/ src/app/(auth)/"

SERVICE_IN_CLIENT=$(grep -r "SUPABASE_SERVICE_ROLE_KEY" $CLIENT_PATHS 2>/dev/null || true)

if [ ! -z "$SERVICE_IN_CLIENT" ]; then
  error "Found SUPABASE_SERVICE_ROLE_KEY in client code:"
  echo "$SERVICE_IN_CLIENT"
  echo ""
else
  success "No SERVICE_ROLE_KEY in client code"
fi

# 3. Check for hardcoded secrets/API keys
echo "3. Checking for hardcoded secrets..."
HARDCODED=$(grep -rE "(sk-[a-zA-Z0-9]{32,}|ghp_[a-zA-Z0-9]{36}|eyJhbGciOi)" src/ \
  --exclude-dir=node_modules \
  --exclude="*.test.ts" \
  --exclude="*.md" \
  || true)

if [ ! -z "$HARDCODED" ]; then
  error "Found potential hardcoded secrets:"
  echo "$HARDCODED"
  echo ""
else
  success "No hardcoded secrets found"
fi

# 4. Check for .env files in git
echo "4. Checking if .env files are gitignored..."
ENV_IN_GIT=$(git ls-files | grep "\.env$" || true)

if [ ! -z "$ENV_IN_GIT" ]; then
  error ".env file is tracked by git:"
  echo "$ENV_IN_GIT"
  echo ""
else
  success ".env files are not tracked"
fi

# 5. Check for exposed error stack traces
echo "5. Checking for exposed stack traces in API routes..."
STACK_TRACES=$(grep -rE "(error\.stack|error\.message)" src/app/api/ \
  --exclude-dir=node_modules \
  | grep -v "errorType: error" \
  | grep -v "// " \
  || true)

if [ ! -z "$STACK_TRACES" ]; then
  warning "Potential stack trace exposure in API routes:"
  echo "$STACK_TRACES"
  echo ""
  echo "  → Verify these are not sent to client"
  echo ""
else
  success "No obvious stack trace exposure"
fi

# 6. Check for analytics tracking with PII
echo "6. Checking analytics for potential PII..."
ANALYTICS_PII=$(grep -rE "trackEvent.*\b${PII_PATTERNS}\b" src/ \
  --exclude-dir=node_modules \
  --exclude="*.test.ts" \
  || true)

if [ ! -z "$ANALYTICS_PII" ]; then
  error "Found trackEvent with potential PII:"
  echo "$ANALYTICS_PII"
  echo ""
else
  success "No PII in analytics events"
fi

# 7. Check for console.log without development guard
echo "7. Checking for unguarded console.log..."
UNGUARDED_LOGS=$(grep -r "console\.log" src/ \
  --exclude-dir=node_modules \
  --exclude="*.test.ts" \
  --exclude="secure-logging.ts" \
  --exclude="analytics.ts" \
  | grep -v "NODE_ENV" \
  | grep -v "devLog" \
  | grep -v "//" \
  || true)

if [ ! -z "$UNGUARDED_LOGS" ]; then
  warning "Found console.log without development guard:"
  echo "$UNGUARDED_LOGS"
  echo ""
  echo "  → Consider using devLog() from secure-logging.ts"
  echo ""
else
  success "All console.log statements are guarded"
fi

# 8. Verify secure-logging.ts exists
echo "8. Checking if secure-logging utility exists..."
if [ ! -f "src/lib/secure-logging.ts" ]; then
  warning "secure-logging.ts not found"
  echo "  → Create it following docs/SECURITY_PII_POLICIES.md"
  echo ""
else
  success "secure-logging.ts exists"
fi

# 9. Check for TODO/FIXME security notes
echo "9. Checking for security TODOs..."
SECURITY_TODOS=$(grep -rE "(TODO|FIXME).*\b(security|pii|secret|password)\b" src/ \
  --exclude-dir=node_modules \
  -i || true)

if [ ! -z "$SECURITY_TODOS" ]; then
  warning "Found security-related TODOs:"
  echo "$SECURITY_TODOS"
  echo ""
else
  success "No security TODOs found"
fi

# 10. Check build for secrets (if .next exists)
if [ -d ".next" ]; then
  echo "10. Checking build artifacts for secrets..."
  BUILD_SECRETS=$(grep -rE "(service.*role|SUPABASE_SERVICE_ROLE)" .next/static/ 2>/dev/null || true)
  
  if [ ! -z "$BUILD_SECRETS" ]; then
    error "Found potential secrets in build artifacts:"
    echo "$BUILD_SECRETS"
    echo ""
  else
    success "No secrets in build artifacts"
  fi
else
  echo "10. Skipping build check (.next not found)"
fi

# Summary
echo ""
echo "======================="
echo "📊 Security Check Summary"
echo "======================="

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}Errors: $ERRORS${NC}"
fi

if [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
fi

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}All checks passed! ✨${NC}"
  exit 0
elif [ $ERRORS -gt 0 ]; then
  echo ""
  echo -e "${RED}❌ Security check failed. Fix errors before deploying.${NC}"
  echo ""
  echo "📖 See docs/SECURITY_PII_POLICIES.md for guidelines"
  exit 1
else
  echo ""
  echo -e "${YELLOW}⚠️  Warnings found. Review before deploying.${NC}"
  echo ""
  echo "📖 See docs/SECURITY_PII_POLICIES.md for guidelines"
  exit 0
fi

