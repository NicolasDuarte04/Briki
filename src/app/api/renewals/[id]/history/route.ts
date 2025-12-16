/**
 * GET /api/renewals/[id]/history - Get history for a renewal
 * POST /api/renewals/[id]/history - Add history entry
 * 
 * FASE 2: API Endpoints para Renovaciones - Historial
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const runtime = 'nodejs';

// Schema for creating history entry
const CreateHistorySchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  premiumMinor: z.number().int().positive(),
  currency: z.string().length(3).default('COP'),
  changes: z.object({
    premiumChange: z.number().optional(),
    coveragesAdded: z.array(z.string()).optional(),
    coveragesRemoved: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }).optional().nullable(),
  policyAnalysisId: z.string().uuid().optional().nullable(),
  artifactId: z.string().uuid().optional().nullable(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET handler - Get history for a renewal
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    console.log(`📋 GET /api/renewals/${id}/history: Obteniendo historial...`);
    
    // 1. Authentication
    const { currentOrg } = await getCurrentOrg();
    
    // 2. Verify renewal exists and user has access
    const renewal = await prisma.renewal.findFirst({
      where: {
        id: id,
        orgId: currentOrg.id
      },
      select: {
        id: true,
        planName: true,
        carrier: true
      }
    });
    
    if (!renewal) {
      return NextResponse.json(
        { error: 'Renewal not found or access denied' },
        { status: 404 }
      );
    }
    
    // 3. Get history entries
    const history = await prisma.renewalHistory.findMany({
      where: {
        renewalId: id
      },
      orderBy: {
        periodEnd: 'desc'
      }
    });
    
    // 4. Calculate trends
    const trends = calculateTrends(history);
    
    console.log(`✅ Historial encontrado: ${history.length} registros`);
    
    return NextResponse.json({
      renewal: {
        id: renewal.id,
        planName: renewal.planName,
        carrier: renewal.carrier
      },
      history: history.map(h => ({
        ...h,
        premium: h.premiumMinor / 100
      })),
      trends,
      count: history.length
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching history:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Add history entry
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    console.log(`📝 POST /api/renewals/${id}/history: Añadiendo historial...`);
    
    // 1. Authentication
    const { currentOrg } = await getCurrentOrg();
    
    // 2. Verify renewal exists and user has access
    const renewal = await prisma.renewal.findFirst({
      where: {
        id: id,
        orgId: currentOrg.id
      }
    });
    
    if (!renewal) {
      return NextResponse.json(
        { error: 'Renewal not found or access denied' },
        { status: 404 }
      );
    }
    
    // 3. Parse and validate body
    const body = await request.json();
    const validationResult = CreateHistorySchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // 4. Get previous period to calculate changes if not provided
    let changesData: Prisma.InputJsonValue | null = data.changes 
      ? (data.changes as Prisma.InputJsonValue) 
      : null;
    
    if (!changesData) {
      const previousPeriod = await prisma.renewalHistory.findFirst({
        where: { renewalId: id },
        orderBy: { periodEnd: 'desc' }
      });
      
      if (previousPeriod && previousPeriod.premiumMinor > 0) {
        const premiumChange = ((data.premiumMinor - previousPeriod.premiumMinor) / previousPeriod.premiumMinor) * 100;
        changesData = {
          premiumChange: Math.round(premiumChange * 100) / 100, // 2 decimal places
          coveragesAdded: [],
          coveragesRemoved: [],
          notes: `Variación automática desde período anterior`
        };
      }
    }
    
    // 5. Create history entry
    const historyEntry = await prisma.renewalHistory.create({
      data: {
        renewalId: id,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        premiumMinor: data.premiumMinor,
        currency: data.currency || 'COP',
        changes: changesData ?? Prisma.JsonNull,
        policyAnalysisId: data.policyAnalysisId || null,
        artifactId: data.artifactId || null,
      }
    });
    
    console.log(`✅ Historial añadido: ${historyEntry.id}`);
    
    return NextResponse.json({
      history: {
        ...historyEntry,
        premium: historyEntry.premiumMinor / 100
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('❌ Error creating history:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate premium trends from history
 */
function calculateTrends(history: any[]) {
  if (history.length < 2) {
    return {
      averageChange: null,
      totalChange: null,
      trend: 'stable' as const,
      periods: history.length
    };
  }
  
  // Sort by period end date (oldest first for calculations)
  const sorted = [...history].sort((a, b) => 
    new Date(a.periodEnd).getTime() - new Date(b.periodEnd).getTime()
  );
  
  // Calculate period-over-period changes
  const premiumChanges: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.premiumMinor > 0) {
      const change = ((curr.premiumMinor - prev.premiumMinor) / prev.premiumMinor) * 100;
      premiumChanges.push(change);
    }
  }
  
  // Calculate average change
  const averageChange = premiumChanges.length > 0 
    ? premiumChanges.reduce((a, b) => a + b, 0) / premiumChanges.length 
    : 0;
  
  // Calculate total change from first to last
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalChange = first.premiumMinor > 0 
    ? ((last.premiumMinor - first.premiumMinor) / first.premiumMinor) * 100 
    : 0;
  
  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (averageChange > 2) trend = 'increasing';
  if (averageChange < -2) trend = 'decreasing';
  
  return {
    averageChange: Math.round(averageChange * 100) / 100,
    totalChange: Math.round(totalChange * 100) / 100,
    trend,
    periods: history.length,
    firstPeriodPremium: first.premiumMinor / 100,
    lastPeriodPremium: last.premiumMinor / 100
  };
}
