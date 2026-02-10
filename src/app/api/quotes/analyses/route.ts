// src/app/api/quotes/analyses/route.ts
/**
 * API para listar análisis de cotizaciones.
 * 
 * GET: Devuelve lista paginada de análisis con opciones de filtrado.
 * 
 * Query params:
 * - page (default 1)
 * - limit (default 20, max 100)
 * - search: búsqueda general (nombre archivo)
 * - sortBy: 'date' | 'confidence'
 * - sortOrder: 'asc' | 'desc'
 * 
 * NOTA: Los campos específicos se extraen del JSON extractedData.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

// ============================================================================
// HELPER: Extraer valor de extractedData de forma segura
// ============================================================================

function safeExtract(data: Record<string, unknown> | null, key: string, fallback: string | null = null): string | null {
  if (!data || !data[key]) return fallback;
  const value = data[key];
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.name) return String(obj.name);
    if (obj.value) return String(obj.value);
  }
  return fallback;
}

function safeExtractDate(data: Record<string, unknown> | null, key: string): string | null {
  if (!data || !data[key]) return null;
  const value = data[key];
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // =========================================================================
    // 1. AUTHENTICATION
    // =========================================================================
    
    const { user, currentOrg } = await getCurrentOrg();

    // =========================================================================
    // 2. QUERY PARAMETERS
    // =========================================================================

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // =========================================================================
    // 3. BUILD WHERE CLAUSE
    // =========================================================================

    const where: any = {
      orgId: currentOrg.id,
    };

    // =========================================================================
    // 4. BUILD ORDER BY
    // =========================================================================

    let orderBy: any = { extractedAt: 'desc' };

    switch (sortBy) {
      case 'date':
        orderBy = { extractedAt: sortOrder };
        break;
      case 'confidence':
        orderBy = { overallConfidence: sortOrder };
        break;
    }

    // =========================================================================
    // 5. EXECUTE QUERIES
    // =========================================================================

    const [analyses, total] = await Promise.all([
      prisma.quoteAnalysis.findMany({
        where,
        include: {
          artifact: {
            select: {
              id: true,
              fileName: true,
              fileId: true,
              createdAt: true,
            },
          },
          pageReferences: {
            select: {
              id: true,
              fieldName: true,
              pageNumber: true,
            },
          },
          caseLinks: {
            select: {
              id: true,
              caseId: true,
              linkType: true,
              linkedAt: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.quoteAnalysis.count({ where }),
    ]);

    // =========================================================================
    // 6. FILTER BY SEARCH (in memory, since extractedData is JSON)
    // =========================================================================

    let filteredAnalyses = analyses;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredAnalyses = analyses.filter(analysis => {
        const extractedData = analysis.extractedData as Record<string, unknown> | null;
        const insurer = safeExtract(extractedData, 'insurer')?.toLowerCase() || '';
        const product = safeExtract(extractedData, 'product')?.toLowerCase() || '';
        const fileName = analysis.artifact?.fileName?.toLowerCase() || '';
        
        return insurer.includes(searchLower) 
          || product.includes(searchLower)
          || fileName.includes(searchLower);
      });
    }

    // =========================================================================
    // 7. FORMAT RESPONSE
    // =========================================================================

    const formattedAnalyses = filteredAnalyses.map(analysis => {
      const extractedData = analysis.extractedData as Record<string, unknown> | null;
      
      return {
        id: analysis.id,
        artifactId: analysis.artifactId,
        
        // Core fields - extraídos de extractedData
        insurer: safeExtract(extractedData, 'insurer'),
        product: safeExtract(extractedData, 'product'),
        branchType: safeExtract(extractedData, 'branch_type') || safeExtract(extractedData, 'insurance_type'),
        quoteNumber: safeExtract(extractedData, 'quote_number'),
        quoteDate: safeExtractDate(extractedData, 'quote_date'),
        validUntil: safeExtractDate(extractedData, 'valid_until') || safeExtractDate(extractedData, 'validity_end'),
        
        // Financial - extraídos de extractedData
        quotedPremium: safeExtract(extractedData, 'quoted_premium') || safeExtract(extractedData, 'total_premium'),
        netPremium: safeExtract(extractedData, 'net_premium'),
        currency: safeExtract(extractedData, 'currency', 'MXN'),
        paymentFrequency: safeExtract(extractedData, 'payment_frequency'),
        
        // Term - extraídos de extractedData
        effectiveDate: safeExtractDate(extractedData, 'effective_date') || safeExtractDate(extractedData, 'start_date'),
        expirationDate: safeExtractDate(extractedData, 'expiration_date') || safeExtractDate(extractedData, 'end_date'),
        
        // Prospect - extraídos de extractedData
        prospectName: safeExtract(extractedData, 'prospect_name') || safeExtract(extractedData, 'insured_name'),
        
        // Insured object - extraídos de extractedData
        insuredObjectType: safeExtract(extractedData, 'insured_object_type'),
        insuredObjectDescription: safeExtract(extractedData, 'insured_object_description'),
        insuredValue: safeExtract(extractedData, 'insured_value') || safeExtract(extractedData, 'sum_insured'),
        
        // Analysis metadata
        status: 'analyzed', // Si existe, está analizado
        confidence: analysis.overallConfidence ? Number(analysis.overallConfidence) : null,
        extractionMethod: analysis.extractionMethod,
        analyzedAt: analysis.extractedAt?.toISOString() || null,
        
        // Related data
        artifact: analysis.artifact ? {
          id: analysis.artifact.id,
          fileName: analysis.artifact.fileName,
          fileId: analysis.artifact.fileId,
          createdAt: analysis.artifact.createdAt.toISOString(),
        } : null,
        
        // Summary counts
        pageReferenceCount: analysis.pageReferences.length,
        linkedCases: analysis.caseLinks.length,
        
        // Full extracted data (optional, can be large)
        extractedData: extractedData,
      };
    });

    // =========================================================================
    // 8. RESPONSE
    // =========================================================================

    return NextResponse.json({
      analyses: formattedAnalyses,
      pagination: {
        page,
        limit,
        total: search ? filteredAnalyses.length : total, // Adjust if filtered
        totalPages: Math.ceil((search ? filteredAnalyses.length : total) / limit),
      },
    });

  } catch (error) {
    console.error('❌ Error en /api/quotes/analyses:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
