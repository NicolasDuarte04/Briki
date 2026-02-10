// src/app/api/org-quotes/stats/route.ts
/**
 * API para obtener estadísticas de cotizaciones de la organización.
 * 
 * GET: Devuelve estadísticas agregadas:
 * - Total de cotizaciones
 * - Cotizaciones analizadas vs pendientes
 * - Por aseguradora
 * - Por rango de primas
 * - Por mes de subida
 * 
 * NOTA: Los campos se extraen del JSON extractedData.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { getOrgQuotesContainerId } from '@/lib/helpers/getOrgQuotesContainer';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

// Helper para extraer valores de extractedData
function safeExtract(data: Record<string, unknown> | null, key: string): string | null {
  if (!data || !data[key]) return null;
  const value = data[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (obj.name) return String(obj.name);
    if (obj.value) return String(obj.value);
  }
  return null;
}

function safeExtractNumber(data: Record<string, unknown> | null, key: string): number | null {
  if (!data || !data[key]) return null;
  const value = data[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? null : parsed;
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
    // 2. OBTENER CONTENEDOR
    // =========================================================================

    const containerId = await getOrgQuotesContainerId(orgId);

    if (!containerId) {
      // Sin contenedor = stats vacías
      return NextResponse.json({
        total: 0,
        analyzed: 0,
        pending: 0,
        byInsurer: [],
        byMonth: [],
        premiumRange: {
          min: null,
          max: null,
          avg: null,
        },
      });
    }

    // =========================================================================
    // 3. ESTADÍSTICAS BÁSICAS
    // =========================================================================

    const [totalCount, analyzedCount, analyses] = await Promise.all([
      // Total de cotizaciones (artifacts)
      prisma.artifact.count({
        where: {
          caseId: containerId,
          sourceType: 'pdf',
        },
      }),
      // Cotizaciones con análisis
      prisma.artifact.count({
        where: {
          caseId: containerId,
          sourceType: 'pdf',
          quoteAnalyses: {
            some: {},
          },
        },
      }),
      // Análisis para stats detalladas
      prisma.quoteAnalysis.findMany({
        where: {
          caseId: containerId,
        },
        select: {
          extractedData: true,
          createdAt: true,
        },
      }),
    ]);

    // =========================================================================
    // 4. ESTADÍSTICAS POR ASEGURADORA (desde extractedData)
    // =========================================================================

    const insurerMap = new Map<string, number>();
    const premiums: number[] = [];

    for (const analysis of analyses) {
      const extractedData = analysis.extractedData as Record<string, unknown> | null;
      
      // Contar por aseguradora
      const insurer = safeExtract(extractedData, 'insurer') || 'Sin identificar';
      insurerMap.set(insurer, (insurerMap.get(insurer) || 0) + 1);
      
      // Recopilar primas
      const premium = safeExtractNumber(extractedData, 'quoted_premium') 
        || safeExtractNumber(extractedData, 'total_premium');
      if (premium !== null && premium > 0) {
        premiums.push(premium);
      }
    }

    const byInsurer = Array.from(insurerMap.entries())
      .map(([insurer, count]) => ({ insurer, count }))
      .sort((a, b) => b.count - a.count);

    // =========================================================================
    // 5. ESTADÍSTICAS DE PRIMAS
    // =========================================================================

    let premiumRange = {
      min: null as number | null,
      max: null as number | null,
      avg: null as number | null,
    };

    if (premiums.length > 0) {
      premiumRange = {
        min: Math.min(...premiums),
        max: Math.max(...premiums),
        avg: Math.round(premiums.reduce((a, b) => a + b, 0) / premiums.length),
      };
    }

    // =========================================================================
    // 6. ESTADÍSTICAS POR MES
    // =========================================================================

    const monthMap = new Map<string, number>();

    for (const analysis of analyses) {
      const date = analysis.createdAt;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    }

    const byMonth = Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => b.month.localeCompare(a.month)) // Más reciente primero
      .slice(0, 12); // Últimos 12 meses

    // =========================================================================
    // 7. RESPUESTA
    // =========================================================================

    return NextResponse.json({
      total: totalCount,
      analyzed: analyzedCount,
      pending: totalCount - analyzedCount,
      byInsurer,
      byMonth,
      premiumRange,
    });

  } catch (error) {
    console.error('❌ Error en org-quotes/stats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
