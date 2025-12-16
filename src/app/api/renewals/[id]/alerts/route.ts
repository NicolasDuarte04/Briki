/**
 * GET /api/renewals/[id]/alerts - Get alerts for a renewal
 * POST /api/renewals/[id]/alerts - Create an alert
 * PATCH /api/renewals/[id]/alerts/[alertId] - Update an alert (dismiss, acknowledge)
 * 
 * FASE 2: API Endpoints para Renovaciones - Alertas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const runtime = 'nodejs';

// Schema for creating an alert
const CreateAlertSchema = z.object({
  alertType: z.enum(['reminder', 'premium_increase', 'coverage_change', 'expiry_warning', 'document_required']),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  message: z.string().min(1),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET handler - Get alerts for a renewal
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    console.log(`📋 GET /api/renewals/${id}/alerts: Obteniendo alertas...`);
    
    // 1. Authentication
    const { currentOrg, user } = await getCurrentOrg();
    
    // 2. Get query params
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('includeAll') === 'true';
    
    // 3. Verify renewal exists and user has access
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
    
    // 4. Build where clause
    const whereClause: any = { renewalId: id };
    if (!includeAll) {
      whereClause.dismissedAt = null; // Only active alerts
    }
    
    // 5. Get alerts
    const alerts = await prisma.renewalAlert.findMany({
      where: whereClause,
      orderBy: [
        { severity: 'desc' }, // Critical first
        { createdAt: 'desc' }
      ]
    });
    
    // 6. Calculate stats
    const stats = {
      total: alerts.length,
      active: alerts.filter(a => !a.dismissedAt).length,
      critical: alerts.filter(a => a.severity === 'critical' && !a.dismissedAt).length,
      warning: alerts.filter(a => a.severity === 'warning' && !a.dismissedAt).length,
      info: alerts.filter(a => a.severity === 'info' && !a.dismissedAt).length,
    };
    
    console.log(`✅ Alertas encontradas: ${alerts.length} (${stats.active} activas)`);
    
    return NextResponse.json({
      renewal: {
        id: renewal.id,
        planName: renewal.planName,
        carrier: renewal.carrier
      },
      alerts,
      stats
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching alerts:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Create an alert
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    console.log(`📝 POST /api/renewals/${id}/alerts: Creando alerta...`);
    
    // 1. Authentication
    const { currentOrg, user } = await getCurrentOrg();
    
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
    const validationResult = CreateAlertSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // 4. Create alert
    const alert = await prisma.renewalAlert.create({
      data: {
        renewalId: id,
        alertType: data.alertType,
        severity: data.severity,
        message: data.message,
        userId: user.id
      }
    });
    
    console.log(`✅ Alerta creada: ${alert.id} (${data.alertType})`);
    
    return NextResponse.json({ alert }, { status: 201 });
    
  } catch (error: any) {
    console.error('❌ Error creating alert:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler - Update/dismiss an alert
 * Pass action in body: { action: 'acknowledge' | 'dismiss' | 'send' }
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
    // Get alertId from query params
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('alertId');
    
    if (!alertId) {
      return NextResponse.json(
        { error: 'alertId query parameter is required' },
        { status: 400 }
      );
    }
    
    console.log(`📝 PATCH /api/renewals/${id}/alerts?alertId=${alertId}: Actualizando alerta...`);
    
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
    
    // 3. Verify alert exists and belongs to this renewal
    const existingAlert = await prisma.renewalAlert.findFirst({
      where: {
        id: alertId,
        renewalId: id
      }
    });
    
    if (!existingAlert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }
    
    // 4. Parse body for action
    const body = await request.json();
    const action = body.action as string;
    
    if (!action || !['acknowledge', 'dismiss', 'send'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: acknowledge, dismiss, or send' },
        { status: 400 }
      );
    }
    
    // 5. Update based on action
    const updateData: any = {};
    const now = new Date();
    
    switch (action) {
      case 'acknowledge':
        updateData.acknowledgedAt = now;
        break;
      case 'dismiss':
        updateData.dismissedAt = now;
        break;
      case 'send':
        updateData.sentAt = now;
        break;
    }
    
    const updatedAlert = await prisma.renewalAlert.update({
      where: { id: alertId },
      data: updateData
    });
    
    console.log(`✅ Alerta actualizada: ${alertId} (${action})`);
    
    return NextResponse.json({ alert: updatedAlert });
    
  } catch (error: any) {
    console.error('❌ Error updating alert:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
