// src/app/api/org-quotes/linkable/route.ts
/**
 * API para obtener cotizaciones que pueden vincularse a un case.
 * 
 * GET: Devuelve lista de cotizaciones analizadas disponibles para vincular.
 * 
 * Query params:
 * - caseId (opcional): Si se provee, excluye cotizaciones ya vinculadas a ese case
 * - search: búsqueda en nombre de archivo (la búsqueda en extractedData no es eficiente)
 * 
 * NOTA: Los campos se extraen del JSON extractedData.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { getOrgQuotesContainerId } from '@/lib/helpers/getOrgQuotesContainer';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

// Helper para extraer valores de extractedData
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
    // 2. PARÁMETROS
    // =========================================================================

    const searchParams = request.nextUrl.searchParams;
    const caseId = searchParams.get('caseId');
    const search = searchParams.get('search') || '';

    // =========================================================================
    // 3. OBTENER CONTENEDOR
    // =========================================================================

    const containerId = await getOrgQuotesContainerId(orgId);

    if (!containerId) {
      return NextResponse.json({ quotes: [] });
    }

    // =========================================================================
    // 4. OBTENER COTIZACIONES CON ANÁLISIS
    // =========================================================================

    // Si hay caseId, obtener las ya vinculadas para excluirlas
    let excludeAnalysisIds: string[] = [];
    if (caseId) {
      const existingLinks = await prisma.caseQuoteLink.findMany({
        where: { caseId },
        select: { quoteAnalysisId: true },
      });
      excludeAnalysisIds = existingLinks.map(l => l.quoteAnalysisId);
    }

    // Construir where para análisis
    const analysisWhere: any = {
      caseId: containerId,
      orgId: orgId,
    };

    // Excluir ya vinculadas
    if (excludeAnalysisIds.length > 0) {
      analysisWhere.id = {
        notIn: excludeAnalysisIds,
      };
    }

    // Query principal
    const analyses = await prisma.quoteAnalysis.findMany({
      where: analysisWhere,
      include: {
        artifact: {
          select: {
            id: true,
            fileName: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100, // Obtener más para filtrar en memoria
    });

    // =========================================================================
    // 5. FILTRAR Y FORMATEAR RESPUESTA
    // =========================================================================

    let filtered = analyses;

    // Filtro por búsqueda (en extractedData y fileName)
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = analyses.filter(analysis => {
        const extractedData = analysis.extractedData as Record<string, unknown> | null;
        const insurer = safeExtract(extractedData, 'insurer')?.toLowerCase() || '';
        const product = safeExtract(extractedData, 'product')?.toLowerCase() || '';
        const fileName = analysis.artifact.fileName?.toLowerCase() || '';
        
        return insurer.includes(searchLower) 
          || product.includes(searchLower)
          || fileName.includes(searchLower);
      });
    }

    // Limitar resultados finales
    const limitedResults = filtered.slice(0, 50);

    const quotes = limitedResults.map(analysis => {
      const extractedData = analysis.extractedData as Record<string, unknown> | null;
      
      const insurer = safeExtract(extractedData, 'insurer');
      const product = safeExtract(extractedData, 'product');
      const quotedPremium = safeExtract(extractedData, 'quoted_premium') || safeExtract(extractedData, 'total_premium');
      
      return {
        id: analysis.id,
        artifactId: analysis.artifactId,
        insurer,
        product,
        quotedPremium,
        effectiveDate: safeExtractDate(extractedData, 'effective_date') || safeExtractDate(extractedData, 'start_date'),
        expirationDate: safeExtractDate(extractedData, 'expiration_date') || safeExtractDate(extractedData, 'end_date'),
        status: 'analyzed',
        // Info del archivo
        fileName: analysis.artifact.fileName,
        uploadedAt: analysis.artifact.createdAt.toISOString(),
        // Resumen para mostrar en selector
        displayLabel: [
          insurer || 'Aseguradora desconocida',
          product ? `- ${product}` : '',
          quotedPremium ? `($${quotedPremium})` : '',
        ].filter(Boolean).join(' '),
      };
    });

    return NextResponse.json({ quotes });

  } catch (error) {
    console.error('❌ Error en org-quotes/linkable:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
