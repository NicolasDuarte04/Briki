// src/app/api/comparisons/[id]/export/route.ts
/**
 * POST /api/comparisons/[id]/export
 *
 * Generates an Excel (.xlsx) matrix from a stored comparison and returns it
 * as a downloadable binary response.
 *
 * Security:
 *  - Auth via getCurrentOrg() (session + org membership)
 *  - Cross-org access blocked: comparison.case.orgId must match user's org
 *  - No PII exposure: comparison data is pre-sanitized by the alignment engine
 *  - CSV injection prevention handled by ExcelBuilderService
 *
 * Flow:
 *  1. Validate auth + params
 *  2. Fetch Comparison + Case (insurance_category) + PolicyAnalyses
 *  3. Resolve MatrixDefinition for the category
 *  4. Build Excel buffer via ExcelBuilderService
 *  5. Return as application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
 *
 * @module api/comparisons/[id]/export
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { buildComparisonMatrix } from '@/lib/excel/ExcelBuilderService';
import { resolveMatrixDefinition } from '@/constants/matrices';
import type { PolicyComparison, PolicyAnalysis } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: comparisonId } = await params;

    if (!comparisonId) {
      return NextResponse.json(
        { error: 'Comparison ID is required' },
        { status: 400 }
      );
    }

    // 1. Auth & org validation
    const { currentOrg } = await getCurrentOrg();

    // 2. Fetch comparison with case context
    const comparison = await prisma.comparison.findUnique({
      where: { id: comparisonId },
      select: {
        id: true,
        caseId: true,
        result: true,
        analysisIds: true,
        label: true,
        createdAt: true,
        case: {
          select: {
            orgId: true,
            insurance_category: true,
            caseName: true,
          },
        },
      },
    });

    if (!comparison) {
      return NextResponse.json(
        { error: 'Comparison not found' },
        { status: 404 }
      );
    }

    // 3. Cross-org security check
    if (comparison.case.orgId !== currentOrg.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // 4. Parse comparison result
    const comparisonData = comparison.result as unknown as PolicyComparison;
    if (!comparisonData || !Array.isArray(comparisonData.rows)) {
      return NextResponse.json(
        { error: 'Comparison data is empty or malformed' },
        { status: 400 }
      );
    }

    // Ensure analysisIds are populated
    if (!comparisonData.analysisIds || comparisonData.analysisIds.length === 0) {
      comparisonData.analysisIds = comparison.analysisIds;
    }

    // 5. Fetch policy analyses for header insurer names
    const analyses = await prisma.policyAnalysis.findMany({
      where: {
        id: { in: comparison.analysisIds },
        orgId: currentOrg.id, // RLS reinforcement
      },
      select: {
        id: true,
        extractedData: true,
        artifactId: true,
        caseId: true,
        orgId: true,
        extractionMethod: true,
        insuranceCategory: true,
        overallConfidence: true,
        extractedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Also fetch quote analyses if any comparison IDs don't match policy analyses
    const policyAnalysisIds = new Set(analyses.map(a => a.id));
    const missingIds = comparison.analysisIds.filter(id => !policyAnalysisIds.has(id));

    let quoteAnalyses: typeof analyses = [];
    if (missingIds.length > 0) {
      quoteAnalyses = await prisma.quoteAnalysis.findMany({
        where: {
          id: { in: missingIds },
          orgId: currentOrg.id,
        },
        select: {
          id: true,
          extractedData: true,
          artifactId: true,
          caseId: true,
          orgId: true,
          extractionMethod: true,
          insuranceCategory: true,
          overallConfidence: true,
          extractedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    // Merge and cast to the expected type
    const allAnalyses = [...analyses, ...quoteAnalyses].map(a => ({
      ...a,
      overallConfidence: Number(a.overallConfidence),
      pageReferences: [],
    })) as unknown as PolicyAnalysis[];

    // 6. Resolve matrix definition for the insurance category
    const matrixDef = resolveMatrixDefinition(comparison.case.insurance_category);

    // 7. Determine locale from request headers
    const acceptLang = _request.headers.get('accept-language') || '';
    const locale: 'es' | 'en' = acceptLang.startsWith('es') ? 'es' : 'en';

    // 8. Build Excel
    const buffer = await buildComparisonMatrix(
      comparisonData,
      matrixDef,
      allAnalyses,
      {
        locale,
        orgName: currentOrg.name ?? undefined,
        caseName: comparison.case.caseName ?? undefined,
        categoryLabel: matrixDef?.categoryLabel ?? undefined,
        date: comparison.createdAt.toISOString().slice(0, 10),
      },
    );

    // 9. Generate filename
    const categorySlug = comparison.case.insurance_category || 'general';
    const dateSlug = comparison.createdAt.toISOString().slice(0, 10);
    const caseName = (comparison.case.caseName || 'caso')
      .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 30);
    const filename = `Briki_Comparativa_${categorySlug}_${dateSlug}_${caseName}.xlsx`;

    // 10. Return binary response
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: unknown) {
    console.error('❌ [API /comparisons/[id]/export] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel export' },
      { status: 500 }
    );
  }
}
