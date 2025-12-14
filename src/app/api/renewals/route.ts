/**
 * GET /api/renewals - List renewals for a case
 * POST /api/renewals - Create a new renewal
 * 
 * FASE 2: API Endpoints para Renovaciones
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const runtime = 'nodejs';

// Zod schema for creating a renewal
const CreateRenewalSchema = z.object({
  caseId: z.string().uuid(),
  policyAnalysisId: z.string().uuid().optional().nullable(),
  carrier: z.string().min(1, 'Carrier is required'),
  policyNumber: z.string().optional().nullable(),
  planName: z.string().min(1, 'Plan name is required'),
  currentStartDate: z.string().datetime(),
  currentEndDate: z.string().datetime(),
  renewalDate: z.string().datetime(),
  currentPremiumMinor: z.number().int().positive('Premium must be positive'),
  currency: z.string().length(3).default('COP'),
  proposedPremiumMinor: z.number().int().positive().optional().nullable(),
  premiumChangePct: z.number().optional().nullable(),
  status: z.enum(['pending', 'in_review', 'approved', 'renewed', 'expired']).default('pending'),
  reminderSet: z.boolean().default(false),
  reminderDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * GET handler - List renewals for a case
 * 
 * Query parameters:
 * - caseId: UUID of the case (required)
 * - status: Filter by status (optional)
 * - windowStatus: Filter by renewal window status (optional)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 GET /api/renewals: Iniciando...');
    
    // 1. Authentication
    const { user, currentOrg } = await getCurrentOrg();
    console.log(`👤 Usuario: ${user.id}`);
    console.log(`🏢 Organización: ${currentOrg.id}`);
    
    // 2. Get query params
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    const status = searchParams.get('status');
    const windowStatus = searchParams.get('windowStatus');
    
    if (!caseId) {
      return NextResponse.json(
        { error: 'caseId query parameter is required' },
        { status: 400 }
      );
    }
    
    console.log(`📁 Caso ID: ${caseId}`);
    
    // 3. Verify case exists and user has access
    const caseExists = await prisma.case.findFirst({
      where: {
        id: caseId,
        orgId: currentOrg.id
      }
    });
    
    if (!caseExists) {
      console.log('❌ Caso no encontrado o sin acceso');
      return NextResponse.json(
        { error: 'Case not found or access denied' },
        { status: 404 }
      );
    }
    
    // 4. Build filters
    const whereClause: any = {
      caseId: caseId,
      orgId: currentOrg.id
    };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (windowStatus) {
      whereClause.renewalWindowStatus = windowStatus;
    }
    
    // 5. Get renewals with relations
    const renewals = await prisma.renewal.findMany({
      where: whereClause,
      include: {
        policyAnalysis: {
          select: {
            id: true,
            artifactId: true,
            extractedData: true,
            overallConfidence: true,
            artifact: {
              select: {
                id: true,
                fileName: true,
                fileId: true
              }
            }
          }
        },
        history: {
          orderBy: {
            periodEnd: 'desc'
          },
          take: 5 // Last 5 historical periods
        },
        alerts: {
          where: {
            dismissedAt: null // Only active alerts
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        renewalDate: 'asc' // Soonest first
      }
    });
    
    console.log(`✅ Renovaciones encontradas: ${renewals.length}`);
    
    // 6. Transform response
    const transformedRenewals = renewals.map(r => ({
      ...r,
      // Convert minor units to display format
      currentPremium: r.currentPremiumMinor / 100,
      proposedPremium: r.proposedPremiumMinor ? r.proposedPremiumMinor / 100 : null,
      // Calculate days until renewal
      daysUntilRenewal: Math.ceil(
        (new Date(r.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      ),
      // Active alerts count
      activeAlertsCount: r.alerts.length
    }));
    
    return NextResponse.json({ 
      renewals: transformedRenewals,
      count: renewals.length 
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching renewals:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Create a new renewal
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📝 POST /api/renewals: Creando renovación...');
    
    // 1. Authentication
    const { user, currentOrg } = await getCurrentOrg();
    console.log(`👤 Usuario: ${user.id}`);
    console.log(`🏢 Organización: ${currentOrg.id}`);
    
    // 2. Parse and validate body
    const body = await request.json();
    const validationResult = CreateRenewalSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.log('❌ Validación fallida:', validationResult.error.issues);
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // 3. Verify case exists and user has access
    const caseExists = await prisma.case.findFirst({
      where: {
        id: data.caseId,
        orgId: currentOrg.id
      }
    });
    
    if (!caseExists) {
      return NextResponse.json(
        { error: 'Case not found or access denied' },
        { status: 404 }
      );
    }
    
    // 4. If policyAnalysisId provided, verify it exists
    if (data.policyAnalysisId) {
      const analysisExists = await prisma.policyAnalysis.findFirst({
        where: {
          id: data.policyAnalysisId,
          caseId: data.caseId,
          orgId: currentOrg.id
        }
      });
      
      if (!analysisExists) {
        return NextResponse.json(
          { error: 'Policy analysis not found or access denied' },
          { status: 404 }
        );
      }
    }
    
    // 5. Calculate renewal window status
    const renewalDate = new Date(data.renewalDate);
    const now = new Date();
    const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let renewalWindowStatus: 'ok' | 'dueSoon' | 'overdue' = 'ok';
    if (daysUntil < 0) {
      renewalWindowStatus = 'overdue';
    } else if (daysUntil <= 30) {
      renewalWindowStatus = 'dueSoon';
    }
    
    // 6. Create renewal
    const renewal = await prisma.renewal.create({
      data: {
        caseId: data.caseId,
        policyAnalysisId: data.policyAnalysisId || null,
        orgId: currentOrg.id,
        carrier: data.carrier,
        policyNumber: data.policyNumber || null,
        planName: data.planName,
        currentStartDate: new Date(data.currentStartDate),
        currentEndDate: new Date(data.currentEndDate),
        renewalDate: renewalDate,
        currentPremiumMinor: data.currentPremiumMinor,
        currency: data.currency,
        proposedPremiumMinor: data.proposedPremiumMinor || null,
        premiumChangePct: data.premiumChangePct || null,
        status: data.status,
        renewalWindowStatus: renewalWindowStatus,
        reminderSet: data.reminderSet,
        reminderDate: data.reminderDate ? new Date(data.reminderDate) : null,
        notes: data.notes || null,
      },
      include: {
        policyAnalysis: {
          select: {
            id: true,
            artifactId: true,
            artifact: {
              select: {
                fileName: true
              }
            }
          }
        }
      }
    });
    
    console.log(`✅ Renovación creada: ${renewal.id}`);
    
    // 7. Create initial alert if due soon or overdue
    if (renewalWindowStatus !== 'ok') {
      await prisma.renewalAlert.create({
        data: {
          renewalId: renewal.id,
          alertType: renewalWindowStatus === 'overdue' ? 'expiry_warning' : 'reminder',
          severity: renewalWindowStatus === 'overdue' ? 'critical' : 'warning',
          message: renewalWindowStatus === 'overdue' 
            ? `La póliza ${data.planName} ha vencido. Requiere acción inmediata.`
            : `La póliza ${data.planName} vence en ${daysUntil} días.`,
          userId: user.id
        }
      });
      console.log('⚠️ Alerta creada automáticamente');
    }
    
    return NextResponse.json({ 
      renewal: {
        ...renewal,
        currentPremium: renewal.currentPremiumMinor / 100,
        proposedPremium: renewal.proposedPremiumMinor ? renewal.proposedPremiumMinor / 100 : null,
        daysUntilRenewal: daysUntil
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('❌ Error creating renewal:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
