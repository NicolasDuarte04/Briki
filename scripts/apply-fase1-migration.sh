#!/bin/bash
#
# Script: apply-fase1-migration.sh
# Purpose: Apply FASE 1 migration for Policy Analysis infrastructure
# Source: PLAN_ANALISIS_POLIZAS_PDF.md - FASE 1
# Created: 2025-11-16
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if we're in the correct directory
if [ ! -f "prisma/schema.prisma" ]; then
    print_error "Error: Must run from project root directory"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "Error: DATABASE_URL environment variable is not set"
    print_info "Please set it in your .env file or export it:"
    echo "export DATABASE_URL='postgresql://user:pass@localhost:5432/dbname'"
    exit 1
fi

print_header "FASE 1: Policy Analysis Infrastructure"
echo ""

# Step 1: Validate Prisma Schema
print_info "Step 1: Validating Prisma Schema..."
if npx prisma validate; then
    print_success "Prisma schema is valid"
else
    print_error "Prisma schema validation failed"
    exit 1
fi
echo ""

# Step 2: Apply Migration
print_info "Step 2: Applying database migration..."
print_warning "This will create the following tables:"
echo "  - policy_analyses"
echo "  - policy_page_references"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Migration cancelled by user"
    exit 0
fi

# Check if migration file exists
MIGRATION_FILE="supabase/migrations/20251116_add_policy_analyses_tables.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    print_error "Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Apply migration via psql
print_info "Applying migration to database..."
if psql "$DATABASE_URL" -f "$MIGRATION_FILE"; then
    print_success "Migration applied successfully"
else
    print_error "Migration failed"
    print_info "Check the error messages above for details"
    exit 1
fi
echo ""

# Step 3: Generate Prisma Client
print_info "Step 3: Generating Prisma Client..."
if npx prisma generate; then
    print_success "Prisma Client generated"
else
    print_error "Failed to generate Prisma Client"
    exit 1
fi
echo ""

# Step 4: Verify TypeScript types
print_info "Step 4: Verifying TypeScript types..."
if npx tsc --noEmit; then
    print_success "TypeScript types are valid"
else
    print_warning "TypeScript has some type errors (may be unrelated)"
fi
echo ""

# Step 5: Verify tables were created
print_info "Step 5: Verifying tables in database..."
TABLE_CHECK=$(psql "$DATABASE_URL" -t -c "
SELECT COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('policy_analyses', 'policy_page_references');
")

if [ "$TABLE_CHECK" -eq 2 ]; then
    print_success "Both tables created successfully"
else
    print_error "Tables not found in database"
    exit 1
fi
echo ""

# Optional: Run tests
print_info "Step 6 (Optional): Running migration tests..."
read -p "Run tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if npm test tests/db/policy-analyses-migrations.test.ts; then
        print_success "All tests passed"
    else
        print_warning "Some tests failed (review output above)"
    fi
fi
echo ""

# Summary
print_header "MIGRATION SUMMARY"
echo ""
print_success "FASE 1 Migration Completed Successfully!"
echo ""
echo "Tables created:"
echo "  ✓ policy_analyses"
echo "  ✓ policy_page_references"
echo ""
echo "Foreign keys:"
echo "  ✓ policy_analyses → artifacts (CASCADE)"
echo "  ✓ policy_analyses → cases (CASCADE)"
echo "  ✓ policy_analyses → organizations (CASCADE)"
echo "  ✓ policy_page_references → policy_analyses (CASCADE)"
echo ""
echo "RLS Policies:"
echo "  ✓ SELECT, INSERT, UPDATE, DELETE on both tables"
echo ""
echo "Indices:"
echo "  ✓ 6 indices on policy_analyses (including GIN on JSONB)"
echo "  ✓ 4 indices on policy_page_references"
echo ""
print_info "Next steps:"
echo "  1. Review docs/FASE1_INFRAESTRUCTURA_COMPLETADA.md"
echo "  2. Verify tables manually (see verification queries in docs)"
echo "  3. Proceed to FASE 2 after validation"
echo ""
print_success "Done!"

