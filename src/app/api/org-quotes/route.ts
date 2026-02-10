// src/app/api/org-quotes/route.ts
/**
 * API para listar cotizaciones standalone de la organización.
 * 
 * GET: Devuelve lista paginada de cotizaciones con sus análisis (si existen).
 * 
 * Query params:
 * - page (default 1)
 * - limit (default 20, max 100)
 * - status: 'all' | 'analyzed' | 'pending'
 * - search: búsqueda en nombre de archivo
 * 
 * NOTA: Los campos específicos (insurer, product, etc.) se extraen del JSON
 * extractedData, igual que en PolicyAnalysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { getOrgQuotesContainerId } from '@/lib/helpers/getOrgQuotesContainer';
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
    // 1. AUTENTICACIÓN
    // =========================================================================
    
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obtener organización actual
    const { currentOrg } = await getCurrentOrg();
    const orgId = currentOrg.id;

    // =========================================================================
    // 2. PARÁMETROS DE QUERY
    // =========================================================================

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // =========================================================================
    // 3. OBTENER CASE CONTENEDOR
    // =========================================================================

    const containerId = await getOrgQuotesContainerId(orgId);

    if (!containerId) {
      // No hay contenedor = no hay cotizaciones
      return NextResponse.json({
        quotes: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    // =========================================================================
    // 4. CONSTRUIR QUERY
    // =========================================================================

    // Base where clause
    const baseWhere: any = {
      caseId: containerId,
      sourceType: 'pdf',
    };

    // Filtro por búsqueda
    if (search) {
      baseWhere.fileName = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Filtro por status de análisis
    if (status === 'analyzed') {
      baseWhere.quoteAnalyses = {
        some: {},
      };
    } else if (status === 'pending') {
      baseWhere.quoteAnalyses = {
        none: {},
      };
    }

    // =========================================================================
    // 5. EJECUTAR QUERIES
    // =========================================================================

    const [artifacts, total] = await Promise.all([
      prisma.artifact.findMany({
        where: baseWhere,
        include: {
          quoteAnalyses: {
            orderBy: { updatedAt: 'desc' },
            take: 1, // Solo el análisis más reciente
            include: {
              pageReferences: {
                select: {
                  id: true,
                  pageNumber: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.artifact.count({ where: baseWhere }),
    ]);

    // =========================================================================
    // 6. FORMATEAR RESPUESTA
    // =========================================================================

    const quotes = artifacts.map(artifact => {
      const latestAnalysis = artifact.quoteAnalyses[0] || null;
      
      // Extraer datos del JSON extractedData
      const extractedData = latestAnalysis?.extractedData as Record<string, unknown> | null;
      
      return {
        id: artifact.id,
        fileName: artifact.fileName,
        fileId: artifact.fileId,
        contentType: artifact.contentType,
        createdAt: artifact.createdAt.toISOString(),
        // Datos del análisis (si existe) - extraídos de extractedData
        analysis: latestAnalysis ? {
          id: latestAnalysis.id,
          insurer: safeExtract(extractedData, 'insurer'),
          product: safeExtract(extractedData, 'product'),
          quotedPremium: safeExtract(extractedData, 'quoted_premium') || safeExtract(extractedData, 'total_premium'),
          effectiveDate: safeExtractDate(extractedData, 'effective_date') || safeExtractDate(extractedData, 'start_date'),
          expirationDate: safeExtractDate(extractedData, 'expiration_date') || safeExtractDate(extractedData, 'end_date'),
          status: 'analyzed', // Si existe análisis, está analizado
          confidence: latestAnalysis.overallConfidence ? Number(latestAnalysis.overallConfidence) : null,
          updatedAt: latestAnalysis.updatedAt.toISOString(),
          pageCount: latestAnalysis.pageReferences.length,
        } : null,
        // Metadatos adicionales
        provenance: artifact.provenance as Record<string, unknown>,
        hasAnalysis: !!latestAnalysis,
      };
    });

    return NextResponse.json({
      quotes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('❌ Error en org-quotes GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
