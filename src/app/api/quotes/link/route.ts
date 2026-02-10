// src/app/api/quotes/link/route.ts
/**
 * API para vincular/desvincular cotizaciones a/de casos.
 * 
 * POST: Vincular una cotización a un caso
 * DELETE: Desvincular una cotización de un caso
 * 
 * NOTA: Los campos específicos se extraen del JSON extractedData.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { tryRecordAuditLog } from '@/lib/audit';

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

// =========================================================================
// POST - Vincular cotización a caso
// =========================================================================

export async function POST(request: NextRequest) {
  try {
    const { user, currentOrg } = await getCurrentOrg();

    const body = await request.json();
    const { quoteAnalysisId, caseId, notes } = body;

    if (!quoteAnalysisId || !caseId) {
      return NextResponse.json(
        { error: 'quoteAnalysisId and caseId are required' },
        { status: 400 }
      );
    }

    // Verify quote analysis exists and belongs to org
    const quoteAnalysis = await prisma.quoteAnalysis.findFirst({
      where: {
        id: quoteAnalysisId,
        orgId: currentOrg.id,
      },
    });

    if (!quoteAnalysis) {
      return NextResponse.json(
        { error: 'Quote analysis not found' },
        { status: 404 }
      );
    }

    // Verify case exists and belongs to org (exclude system containers)
    const targetCase = await prisma.case.findFirst({
      where: {
        id: caseId,
        orgId: currentOrg.id,
        // Exclude system cases
        NOT: {
          AND: [
            { status: '__org_quotes_container__' },
            { stage: '__system__' },
          ],
        },
      },
    });

    if (!targetCase) {
      return NextResponse.json(
        { error: 'Target case not found' },
        { status: 404 }
      );
    }

    // Check if link already exists
    const existingLink = await prisma.caseQuoteLink.findFirst({
      where: {
        quoteAnalysisId,
        caseId,
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: 'Quote is already linked to this case' },
        { status: 409 }
      );
    }

    // Create link
    const link = await prisma.caseQuoteLink.create({
      data: {
        quoteAnalysisId,
        caseId,
        orgId: currentOrg.id,
        linkedBy: user.id,
        linkType: 'reference',
        notes: notes || null,
      },
      include: {
        case: {
          select: {
            id: true,
            caseName: true,
          },
        },
        quoteAnalysis: true,
      },
    });

    // Extraer datos de extractedData para el log
    const extractedData = link.quoteAnalysis.extractedData as Record<string, unknown> | null;

    // Audit log
    await tryRecordAuditLog({
      caseId: caseId,
      actor: user.email || user.id,
      action: 'quote.linked',
      payload: {
        linkId: link.id,
        quoteAnalysisId,
        caseTitle: link.case.caseName,
        quoteInsurer: safeExtract(extractedData, 'insurer'),
        quoteProduct: safeExtract(extractedData, 'product'),
        orgId: currentOrg.id,
      },
    });

    return NextResponse.json({
      success: true,
      link: {
        id: link.id,
        quoteAnalysisId: link.quoteAnalysisId,
        caseId: link.caseId,
        linkType: link.linkType,
        linkedAt: link.linkedAt.toISOString(),
      },
      message: 'Quote linked to case successfully',
    });

  } catch (error) {
    console.error('❌ Error en POST /api/quotes/link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =========================================================================
// DELETE - Desvincular cotización de caso
// =========================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { user, currentOrg } = await getCurrentOrg();

    const body = await request.json();
    const { linkId } = body;

    if (!linkId) {
      return NextResponse.json(
        { error: 'linkId is required' },
        { status: 400 }
      );
    }

    // Verify link exists and belongs to org
    const link = await prisma.caseQuoteLink.findFirst({
      where: {
        id: linkId,
        orgId: currentOrg.id,
      },
      include: {
        quoteAnalysis: true,
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Delete link
    await prisma.caseQuoteLink.delete({
      where: { id: linkId },
    });

    // Extraer datos de extractedData para el log
    const extractedData = link.quoteAnalysis.extractedData as Record<string, unknown> | null;

    // Audit log
    await tryRecordAuditLog({
      caseId: link.caseId,
      actor: user.email || user.id,
      action: 'quote.unlinked',
      payload: {
        linkId,
        quoteAnalysisId: link.quoteAnalysisId,
        insurer: safeExtract(extractedData, 'insurer'),
        product: safeExtract(extractedData, 'product'),
        orgId: currentOrg.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Quote unlinked from case successfully',
    });

  } catch (error) {
    console.error('❌ Error en DELETE /api/quotes/link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
