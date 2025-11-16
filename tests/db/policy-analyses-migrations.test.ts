/**
 * Tests for Policy Analyses Database Migrations
 * Phase: 1 - Infrastructure Preparation
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 7.2 (Día 3)
 * 
 * Purpose: Verify that the policy_analyses and policy_page_references tables
 * are created correctly with proper constraints, indices, and RLS policies.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Policy Analysis Migrations', () => {
  beforeAll(async () => {
    // Ensure database connection is established
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Table Creation', () => {
    it('should create policy_analyses table', async () => {
      // Query information_schema to verify table exists
      const result = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'policy_analyses';
      `;

      expect(result).toHaveLength(1);
      expect(result[0].table_name).toBe('policy_analyses');
    });

    it('should create policy_page_references table', async () => {
      const result = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'policy_page_references';
      `;

      expect(result).toHaveLength(1);
      expect(result[0].table_name).toBe('policy_page_references');
    });
  });

  describe('Table Columns', () => {
    it('should have correct columns in policy_analyses', async () => {
      const result = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'policy_analyses'
        ORDER BY ordinal_position;
      `;

      const columnNames = result.map(col => col.column_name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('artifact_id');
      expect(columnNames).toContain('case_id');
      expect(columnNames).toContain('org_id');
      expect(columnNames).toContain('extracted_data');
      expect(columnNames).toContain('extraction_method');
      expect(columnNames).toContain('overall_confidence');
      expect(columnNames).toContain('extracted_at');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
    });

    it('should have correct columns in policy_page_references', async () => {
      const result = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'policy_page_references'
        ORDER BY ordinal_position;
      `;

      const columnNames = result.map(col => col.column_name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('policy_analysis_id');
      expect(columnNames).toContain('field_name');
      expect(columnNames).toContain('field_value');
      expect(columnNames).toContain('page_number');
      expect(columnNames).toContain('bounding_box');
      expect(columnNames).toContain('confidence');
      expect(columnNames).toContain('created_at');
    });

    it('should have JSONB type for extracted_data', async () => {
      const result = await prisma.$queryRaw<Array<{ data_type: string; udt_name: string }>>`
        SELECT data_type, udt_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'policy_analyses'
        AND column_name = 'extracted_data';
      `;

      expect(result[0].udt_name).toBe('jsonb');
    });

    it('should have DECIMAL(3,2) type for confidence fields', async () => {
      const result = await prisma.$queryRaw<Array<{ 
        table_name: string; 
        column_name: string; 
        numeric_precision: number;
        numeric_scale: number;
      }>>`
        SELECT table_name, column_name, numeric_precision, numeric_scale
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND (
          (table_name = 'policy_analyses' AND column_name = 'overall_confidence')
          OR (table_name = 'policy_page_references' AND column_name = 'confidence')
        );
      `;

      expect(result).toHaveLength(2);
      result.forEach(col => {
        expect(col.numeric_precision).toBe(3);
        expect(col.numeric_scale).toBe(2);
      });
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should have foreign key from policy_analyses to artifacts', async () => {
      const result = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'policy_analyses'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%artifact%';
      `;

      expect(result.length).toBeGreaterThan(0);
    });

    it('should have foreign key from policy_analyses to cases', async () => {
      const result = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'policy_analyses'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%case%';
      `;

      expect(result.length).toBeGreaterThan(0);
    });

    it('should have foreign key from policy_analyses to organizations', async () => {
      const result = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'policy_analyses'
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%org%';
      `;

      expect(result.length).toBeGreaterThan(0);
    });

    it('should have foreign key from policy_page_references to policy_analyses', async () => {
      const result = await prisma.$queryRaw<Array<{ constraint_name: string }>>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
        AND table_name = 'policy_page_references'
        AND constraint_type = 'FOREIGN KEY';
      `;

      expect(result.length).toBeGreaterThan(0);
    });

    it('should cascade delete from artifacts to policy_analyses', async () => {
      const result = await prisma.$queryRaw<Array<{ delete_rule: string }>>`
        SELECT rc.delete_rule
        FROM information_schema.referential_constraints rc
        JOIN information_schema.table_constraints tc 
          ON rc.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
        AND tc.table_name = 'policy_analyses'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND rc.constraint_name LIKE '%artifact%';
      `;

      expect(result[0].delete_rule).toBe('CASCADE');
    });
  });

  describe('Indices', () => {
    it('should have indices on policy_analyses', async () => {
      const result = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'policy_analyses';
      `;

      const indexNames = result.map(idx => idx.indexname);
      
      expect(indexNames).toContain('idx_policy_analyses_artifact_id');
      expect(indexNames).toContain('idx_policy_analyses_case_id');
      expect(indexNames).toContain('idx_policy_analyses_org_id');
      expect(indexNames).toContain('idx_policy_analyses_extracted_at');
      expect(indexNames).toContain('idx_policy_analyses_confidence');
      expect(indexNames).toContain('idx_policy_analyses_extracted_data');
    });

    it('should have GIN index on extracted_data for JSONB search', async () => {
      const result = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'policy_analyses'
        AND indexname = 'idx_policy_analyses_extracted_data';
      `;

      expect(result[0].indexdef).toContain('USING gin');
    });

    it('should have indices on policy_page_references', async () => {
      const result = await prisma.$queryRaw<Array<{ indexname: string }>>`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'policy_page_references';
      `;

      const indexNames = result.map(idx => idx.indexname);
      
      expect(indexNames).toContain('idx_policy_page_refs_analysis_id');
      expect(indexNames).toContain('idx_policy_page_refs_field_name');
      expect(indexNames).toContain('idx_policy_page_refs_page_number');
      expect(indexNames).toContain('idx_policy_page_refs_confidence');
    });
  });

  describe('Check Constraints', () => {
    it('should enforce extraction_method enum values', async () => {
      const result = await prisma.$queryRaw<Array<{ check_clause: string }>>`
        SELECT cc.check_clause
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu 
          ON cc.constraint_name = ccu.constraint_name
        WHERE ccu.table_schema = 'public'
        AND ccu.table_name = 'policy_analyses'
        AND ccu.column_name = 'extraction_method';
      `;

      expect(result.length).toBeGreaterThan(0);
      const checkClause = result[0].check_clause.toLowerCase();
      expect(checkClause).toContain('manual');
      expect(checkClause).toContain('ocr');
      expect(checkClause).toContain('hybrid');
    });

    it('should enforce overall_confidence between 0 and 1', async () => {
      const result = await prisma.$queryRaw<Array<{ check_clause: string }>>`
        SELECT cc.check_clause
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu 
          ON cc.constraint_name = ccu.constraint_name
        WHERE ccu.table_schema = 'public'
        AND ccu.table_name = 'policy_analyses'
        AND ccu.column_name = 'overall_confidence';
      `;

      expect(result.length).toBeGreaterThan(0);
      const checkClause = result[0].check_clause.toLowerCase();
      expect(checkClause).toContain('>= 0');
      expect(checkClause).toContain('<= 1');
    });

    it('should enforce page_number > 0', async () => {
      const result = await prisma.$queryRaw<Array<{ check_clause: string }>>`
        SELECT cc.check_clause
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu 
          ON cc.constraint_name = ccu.constraint_name
        WHERE ccu.table_schema = 'public'
        AND ccu.table_name = 'policy_page_references'
        AND ccu.column_name = 'page_number';
      `;

      expect(result.length).toBeGreaterThan(0);
      const checkClause = result[0].check_clause.toLowerCase();
      expect(checkClause).toContain('> 0');
    });
  });

  describe('Row Level Security', () => {
    it('should have RLS enabled on policy_analyses', async () => {
      const result = await prisma.$queryRaw<Array<{ relrowsecurity: boolean }>>`
        SELECT relrowsecurity
        FROM pg_class
        WHERE relname = 'policy_analyses'
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
      `;

      expect(result[0].relrowsecurity).toBe(true);
    });

    it('should have RLS enabled on policy_page_references', async () => {
      const result = await prisma.$queryRaw<Array<{ relrowsecurity: boolean }>>`
        SELECT relrowsecurity
        FROM pg_class
        WHERE relname = 'policy_page_references'
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
      `;

      expect(result[0].relrowsecurity).toBe(true);
    });

    it('should have SELECT policy on policy_analyses', async () => {
      const result = await prisma.$queryRaw<Array<{ policyname: string }>>`
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'policy_analyses'
        AND cmd = 'SELECT';
      `;

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].policyname).toContain('select');
    });

    it('should have INSERT policy on policy_analyses', async () => {
      const result = await prisma.$queryRaw<Array<{ policyname: string }>>`
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'policy_analyses'
        AND cmd = 'INSERT';
      `;

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].policyname).toContain('insert');
    });

    it('should have UPDATE policy on policy_analyses', async () => {
      const result = await prisma.$queryRaw<Array<{ policyname: string }>>`
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'policy_analyses'
        AND cmd = 'UPDATE';
      `;

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].policyname).toContain('update');
    });

    it('should have DELETE policy on policy_analyses for admins only', async () => {
      const result = await prisma.$queryRaw<Array<{ policyname: string; qual: string }>>`
        SELECT policyname, pg_get_expr(polqual, polrelid) as qual
        FROM pg_policy
        JOIN pg_class ON pg_policy.polrelid = pg_class.oid
        WHERE pg_class.relname = 'policy_analyses'
        AND polcmd = 'd';
      `;

      expect(result.length).toBeGreaterThan(0);
      const qualClause = result[0].qual.toLowerCase();
      expect(qualClause).toContain('owner');
      expect(qualClause).toContain('admin');
    });

    it('should have policies on policy_page_references', async () => {
      const result = await prisma.$queryRaw<Array<{ policyname: string }>>`
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'policy_page_references';
      `;

      // Should have at least 4 policies (SELECT, INSERT, UPDATE, DELETE)
      expect(result.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Table Comments', () => {
    it('should have comment on policy_analyses table', async () => {
      const result = await prisma.$queryRaw<Array<{ description: string }>>`
        SELECT obj_description('public.policy_analyses'::regclass) as description;
      `;

      expect(result[0].description).toBeTruthy();
      expect(result[0].description.toLowerCase()).toContain('policy');
    });

    it('should have comment on policy_page_references table', async () => {
      const result = await prisma.$queryRaw<Array<{ description: string }>>`
        SELECT obj_description('public.policy_page_references'::regclass) as description;
      `;

      expect(result[0].description).toBeTruthy();
      expect(result[0].description.toLowerCase()).toContain('pdf');
    });
  });

  describe('Default Values', () => {
    it('should have default UUID for id columns', async () => {
      const result = await prisma.$queryRaw<Array<{ 
        table_name: string;
        column_default: string;
      }>>`
        SELECT table_name, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name IN ('policy_analyses', 'policy_page_references')
        AND column_name = 'id';
      `;

      expect(result).toHaveLength(2);
      result.forEach(col => {
        expect(col.column_default).toContain('gen_random_uuid');
      });
    });

    it('should have default NOW() for timestamp columns', async () => {
      const result = await prisma.$queryRaw<Array<{ 
        table_name: string;
        column_name: string;
        column_default: string;
      }>>`
        SELECT table_name, column_name, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name IN ('policy_analyses', 'policy_page_references')
        AND column_name IN ('created_at', 'extracted_at');
      `;

      expect(result.length).toBeGreaterThan(0);
      result.forEach(col => {
        expect(col.column_default.toLowerCase()).toContain('now()');
      });
    });

    it('should have default "hybrid" for extraction_method', async () => {
      const result = await prisma.$queryRaw<Array<{ column_default: string }>>`
        SELECT column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'policy_analyses'
        AND column_name = 'extraction_method';
      `;

      expect(result[0].column_default).toContain('hybrid');
    });

    it('should have default 0.00 for confidence columns', async () => {
      const result = await prisma.$queryRaw<Array<{ 
        table_name: string;
        column_name: string;
        column_default: string;
      }>>`
        SELECT table_name, column_name, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND (
          (table_name = 'policy_analyses' AND column_name = 'overall_confidence')
          OR (table_name = 'policy_page_references' AND column_name = 'confidence')
        );
      `;

      expect(result).toHaveLength(2);
      result.forEach(col => {
        expect(col.column_default).toContain('0.00');
      });
    });
  });
});

