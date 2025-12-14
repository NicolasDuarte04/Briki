/**
 * GET /api/renewals/[id] - Get a specific renewal
 * PATCH /api/renewals/[id] - Update a renewal
 * DELETE /api/renewals/[id] - Delete a renewal
 * 
 * FASE 2: API Endpoints para Renovaciones
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const runtime = 'nodejs';

// Zod schema for updating a renewal
const UpdateRenewalSchema = z.object({
  carrier: z.string().min(1).optional(),
  policyNumber: z.string().optional().nullable(),
  planName: z.string().min(1).optional(),
  currentStartDate: z.string().datetime().optional(),
  currentEndDate: z.string().datetime().optional(),
  renewalDate: z.string().datetime().optional(),
  currentPremiumMinor: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
  proposedPremiumMinor: z.number().int().positive().optional().nullable(),
  premiumChangePct: z.number().optional().nullable(),
  status: z.enum(['pending', 'in_review', 'approved', 'renewed', 'expired']).optional(),
  reminderSet: z.boolean().optional(),
  reminderDate: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
}).partial();

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET handler - Get a specific renewal by ID
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    console.log(`📋 GET /api/renewals/${id}: Obteniendo renovación...`);
    
    // 1. Authentication
    const { user, currentOrg } = await getCurrentOrg();
    console.log(`👤 Usuario: ${user.id}`);
    
    // 2. Get renewal with full details
    const renewal = await prisma.renewal.findFirst({
      where: {
        id: id,
        orgId: currentOrg.id
      },
      include: {
        case: {
          select: {
            id: true,
            clientName: true,
            clientRef: true,
            status: true
          }
        },
        policyAnalysis: {
          select: {
            id: true,
            artifactId: true,
            extractedData: true,
            overallConfidence: true,
            extractedAt: true,
            artifact: {
              select: {
                id: true,
                fileName: true,
                fileId: true,
                contentType: true
              }
            }
          }
        },
        history: {
          orderBy: {
            periodEnd: 'desc'
          }
        },
        alerts: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    if (!renewal) {
      return NextResponse.json(
        { error: 'Renewal not found or access denied' },
        { status: 404 }
      );
    }
    
    // 3. Calculate additional fields
    const daysUntilRenewal = Math.ceil(
      (new Date(renewal.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    console.log(`✅ Renovación encontrada: ${renewal.planName}`);
    
    return NextResponse.json({
      renewal: {
        ...renewal,
        currentPremium: renewal.currentPremiumMinor / 100,
        proposedPremium: renewal.proposedPremiumMinor ? renewal.proposedPremiumMinor / 100 : null,
        daysUntilRenewal,
        activeAlertsCount: renewal.alerts.filter(a => !a.dismissedAt).length
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching renewal:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler - Update a renewal
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    console.log(`📝 PATCH /api/renewals/${id}: Actualizando renovación...`);
    
    // 1. Authentication
    const { user, currentOrg } = await getCurrentOrg();
    console.log(`👤 Usuario: ${user.id}`);
    
    // 2. Verify renewal exists and user has access
    const existingRenewal = await prisma.renewal.findFirst({
      where: {
        id: id,
        orgId: currentOrg.id
      }
    });
    
    if (!existingRenewal) {
      return NextResponse.json(
        { error: 'Renewal not found or access denied' },
        { status: 404 }
      );
    }
    
    // 3. Parse and validate body
    const body = await request.json();
    const validationResult = UpdateRenewalSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // 4. Prepare update data
    const updateData: any = {};
    
    if (data.carrier !== undefined) updateData.carrier = data.carrier;
    if (data.policyNumber !== undefined) updateData.policyNumber = data.policyNumber;
    if (data.planName !== undefined) updateData.planName = data.planName;
    if (data.currentStartDate !== undefined) updateData.currentStartDate = new Date(data.currentStartDate);
    if (data.currentEndDate !== undefined) updateData.currentEndDate = new Date(data.currentEndDate);
    if (data.renewalDate !== undefined) updateData.renewalDate = new Date(data.renewalDate);
    if (data.currentPremiumMinor !== undefined) updateData.currentPremiumMinor = data.currentPremiumMinor;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.proposedPremiumMinor !== undefined) updateData.proposedPremiumMinor = data.proposedPremiumMinor;
    if (data.premiumChangePct !== undefined) updateData.premiumChangePct = data.premiumChangePct;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.reminderSet !== undefined) updateData.reminderSet = data.reminderSet;
    if (data.reminderDate !== undefined) updateData.reminderDate = data.reminderDate ? new Date(data.reminderDate) : null;
    if (data.notes !== undefined) updateData.notes = data.notes;
    
    // 5. Recalculate renewal window status if renewal date changed
    if (data.renewalDate !== undefined) {
      const renewalDate = new Date(data.renewalDate);
      const now = new Date();
      const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil < 0) {
        updateData.renewalWindowStatus = 'overdue';
      } else if (daysUntil <= 30) {
        updateData.renewalWindowStatus = 'dueSoon';
      } else {
        updateData.renewalWindowStatus = 'ok';
      }
    }
    
    // 6. Update renewal
    const updatedRenewal = await prisma.renewal.update({
      where: { id: id },
      data: updateData,
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
        },
        alerts: {
          where: { dismissedAt: null }
        }
      }
    });
    
    console.log(`✅ Renovación actualizada: ${updatedRenewal.id}`);
    
    // 7. Create alert if status changed to approved or renewed
    if (data.status && ['approved', 'renewed'].includes(data.status)) {
      await prisma.renewalAlert.create({
        data: {
          renewalId: id,
          alertType: 'reminder',
          severity: 'info',
          message: data.status === 'approved' 
            ? `La renovación de ${updatedRenewal.planName} ha sido aprobada.`
            : `La póliza ${updatedRenewal.planName} ha sido renovada exitosamente.`,
          userId: user.id,
          sentAt: new Date()
        }
      });
    }
    
    const daysUntilRenewal = Math.ceil(
      (new Date(updatedRenewal.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    
    return NextResponse.json({
      renewal: {
        ...updatedRenewal,
        currentPremium: updatedRenewal.currentPremiumMinor / 100,
        proposedPremium: updatedRenewal.proposedPremiumMinor ? updatedRenewal.proposedPremiumMinor / 100 : null,
        daysUntilRenewal,
        activeAlertsCount: updatedRenewal.alerts.length
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error updating renewal:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Delete a renewal
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    console.log(`🗑️ DELETE /api/renewals/${id}: Eliminando renovación...`);
    
    // 1. Authentication
    const { user, currentOrg } = await getCurrentOrg();
    console.log(`👤 Usuario: ${user.id}`);
    
    // 2. Verify renewal exists and user has access
    const existingRenewal = await prisma.renewal.findFirst({
      where: {
        id: id,
        orgId: currentOrg.id
      }
    });
    
    if (!existingRenewal) {
      return NextResponse.json(
        { error: 'Renewal not found or access denied' },
        { status: 404 }
      );
    }
    
    // 3. Delete renewal (cascade will delete history and alerts)
    await prisma.renewal.delete({
      where: { id: id }
    });
    
    console.log(`✅ Renovación eliminada: ${id}`);
    
    return NextResponse.json({ 
      success: true,
      message: 'Renewal deleted successfully',
      deletedId: id
    });
    
  } catch (error: any) {
    console.error('❌ Error deleting renewal:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
