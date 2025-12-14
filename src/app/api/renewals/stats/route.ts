/**
 * GET /api/renewals/stats - Get renewal statistics for dashboard
 * 
 * FASE 2: API Endpoints para Renovaciones - Estadísticas
 * 
 * Returns aggregate stats for all renewals in the user's organization,
 * useful for dashboard widgets and overview screens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * GET handler - Get renewal statistics
 * 
 * Query parameters:
 * - caseId: Filter by specific case (optional)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📊 GET /api/renewals/stats: Obteniendo estadísticas...');
    
    // 1. Authentication
    const { currentOrg } = await getCurrentOrg();
    console.log(`🏢 Organización: ${currentOrg.id}`);
    
    // 2. Get optional caseId filter
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    
    // 3. Build where clause
    const whereClause: any = { orgId: currentOrg.id };
    if (caseId) {
      whereClause.caseId = caseId;
    }
    
    // 4. Get all renewals for stats
    const renewals = await prisma.renewal.findMany({
      where: whereClause,
      include: {
        alerts: {
          where: { dismissedAt: null }
        }
      }
    });
    
    // 5. Calculate statistics
    const now = new Date();
    
    // Count by status
    const byStatus = {
      pending: 0,
      in_review: 0,
      approved: 0,
      renewed: 0,
      expired: 0
    };
    
    // Count by window status
    const byWindowStatus = {
      ok: 0,
      dueSoon: 0,
      overdue: 0
    };
    
    // Count by urgency (days until renewal)
    const byUrgency = {
      overdue: 0,        // < 0 days
      critical: 0,       // 0-7 days
      urgent: 0,         // 8-14 days
      dueSoon: 0,        // 15-30 days
      upcoming: 0,       // 31-60 days
      future: 0          // > 60 days
    };
    
    // Premium totals
    let totalCurrentPremium = 0;
    let totalProposedPremium = 0;
    let renewalsWithProposal = 0;
    
    // Active alerts
    let totalActiveAlerts = 0;
    let criticalAlerts = 0;
    
    // Process each renewal
    for (const renewal of renewals) {
      // Status counts
      byStatus[renewal.status as keyof typeof byStatus]++;
      
      // Window status counts
      byWindowStatus[renewal.renewalWindowStatus as keyof typeof byWindowStatus]++;
      
      // Calculate days until renewal
      const daysUntil = Math.ceil(
        (new Date(renewal.renewalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Urgency counts
      if (daysUntil < 0) {
        byUrgency.overdue++;
      } else if (daysUntil <= 7) {
        byUrgency.critical++;
      } else if (daysUntil <= 14) {
        byUrgency.urgent++;
      } else if (daysUntil <= 30) {
        byUrgency.dueSoon++;
      } else if (daysUntil <= 60) {
        byUrgency.upcoming++;
      } else {
        byUrgency.future++;
      }
      
      // Premium totals
      totalCurrentPremium += renewal.currentPremiumMinor;
      if (renewal.proposedPremiumMinor) {
        totalProposedPremium += renewal.proposedPremiumMinor;
        renewalsWithProposal++;
      }
      
      // Alert counts
      totalActiveAlerts += renewal.alerts.length;
      criticalAlerts += renewal.alerts.filter(a => a.severity === 'critical').length;
    }
    
    // 6. Get upcoming renewals (next 30 days)
    const upcomingRenewals = await prisma.renewal.findMany({
      where: {
        ...whereClause,
        renewalDate: {
          gte: now,
          lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        },
        status: {
          notIn: ['renewed', 'expired']
        }
      },
      select: {
        id: true,
        carrier: true,
        planName: true,
        renewalDate: true,
        renewalWindowStatus: true,
        currentPremiumMinor: true,
        currency: true
      },
      orderBy: {
        renewalDate: 'asc'
      },
      take: 10
    });
    
    // 7. Calculate average premium change for renewals with proposals
    const avgPremiumChange = renewalsWithProposal > 0 
      ? ((totalProposedPremium - totalCurrentPremium) / totalCurrentPremium) * 100 
      : null;
    
    console.log(`✅ Estadísticas calculadas para ${renewals.length} renovaciones`);
    
    return NextResponse.json({
      summary: {
        total: renewals.length,
        needsAttention: byUrgency.overdue + byUrgency.critical + byUrgency.urgent,
        activeAlerts: totalActiveAlerts,
        criticalAlerts: criticalAlerts
      },
      byStatus,
      byWindowStatus,
      byUrgency,
      financials: {
        totalCurrentPremium: totalCurrentPremium / 100,
        totalProposedPremium: totalProposedPremium / 100,
        avgPremiumChange: avgPremiumChange ? Math.round(avgPremiumChange * 100) / 100 : null,
        renewalsWithProposal
      },
      upcomingRenewals: upcomingRenewals.map(r => ({
        ...r,
        currentPremium: r.currentPremiumMinor / 100,
        daysUntilRenewal: Math.ceil(
          (new Date(r.renewalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      }))
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching stats:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
