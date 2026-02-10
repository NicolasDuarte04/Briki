// src/app/api/quotes/analyses/[id]/route.ts
/**
 * API para obtener, actualizar o eliminar un análisis de cotización específico.
 * 
 * GET: Obtener análisis completo con referencias de página
 * PATCH: Actualizar campos del análisis (correcciones manuales en extractedData)
 * DELETE: Eliminar análisis (mantiene el artifact)
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

function safeExtractDate(data: Record<string, unknown> | null, key: string): string | null {
  if (!data || !data[key]) return null;
  const value = data[key];
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

// =========================================================================
// GET - Obtener análisis específico
// =========================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, currentOrg } = await getCurrentOrg();

    // Fetch analysis with all related data
    const analysis = await prisma.quoteAnalysis.findFirst({
      where: {
        id,
        orgId: currentOrg.id, // Security: only from user's org
      },
      include: {
        artifact: {
          select: {
            id: true,
            fileName: true,
            fileId: true,
            contentType: true,
            createdAt: true,
            provenance: true,
          },
        },
        pageReferences: {
          orderBy: { pageNumber: 'asc' },
        },
        caseLinks: {
          include: {
            case: {
              select: {
                id: true,
                caseName: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { error: 'Quote analysis not found' },
        { status: 404 }
      );
    }

    // Extraer datos del JSON extractedData
    const extractedData = analysis.extractedData as Record<string, unknown> | null;

    // Format response
    return NextResponse.json({
      analysis: {
        id: analysis.id,
        artifactId: analysis.artifactId,
        orgId: analysis.orgId,
        
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
        prospectId: safeExtract(extractedData, 'prospect_id') || safeExtract(extractedData, 'insured_id'),
        
        // Insured object - extraídos de extractedData
        insuredObjectType: safeExtract(extractedData, 'insured_object_type'),
        insuredObjectDescription: safeExtract(extractedData, 'insured_object_description'),
        insuredValue: safeExtract(extractedData, 'insured_value') || safeExtract(extractedData, 'sum_insured'),
        
        // Full extracted data
        extractedData: extractedData,
        
        // Analysis metadata
        status: 'analyzed',
        confidence: analysis.overallConfidence ? Number(analysis.overallConfidence) : null,
        extractionMethod: analysis.extractionMethod,
        analyzedAt: analysis.extractedAt?.toISOString() || null,
        
        // Timestamps
        createdAt: analysis.createdAt.toISOString(),
        updatedAt: analysis.updatedAt.toISOString(),
        
        // Related data
        artifact: analysis.artifact,
        pageReferences: analysis.pageReferences.map((ref: any) => ({
          id: ref.id,
          fieldName: ref.fieldName,
          fieldValue: ref.fieldValue,
          pageNumber: ref.pageNumber,
          boundingBox: ref.boundingBox,
          confidence: ref.confidence ? Number(ref.confidence) : null,
        })),
        caseLinks: analysis.caseLinks.map((link: any) => ({
          id: link.id,
          caseId: link.caseId,
          caseTitle: link.case?.caseName || 'Sin título',
          caseStatus: link.case?.status,
          linkType: link.linkType,
          linkedAt: link.linkedAt.toISOString(),
          contextualizedAt: link.contextualizedAt?.toISOString() || null,
        })),
      },
    });

  } catch (error) {
    console.error('❌ Error en GET /api/quotes/analyses/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =========================================================================
// PATCH - Actualizar análisis (correcciones manuales en extractedData)
// =========================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, currentOrg } = await getCurrentOrg();

    // Verify analysis exists and belongs to org
    const existing = await prisma.quoteAnalysis.findFirst({
      where: {
        id,
        orgId: currentOrg.id,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Quote analysis not found' },
        { status: 404 }
      );
    }

    // Parse update body
    const body = await request.json();

    // Campos que se pueden actualizar en extractedData
    const allowedFields = [
      'insurer',
      'product',
      'branch_type',
      'quote_number',
      'quote_date',
      'valid_until',
      'quoted_premium',
      'net_premium',
      'currency',
      'payment_frequency',
      'effective_date',
      'expiration_date',
      'prospect_name',
      'prospect_id',
      'insured_object_type',
      'insured_object_description',
      'insured_value',
    ];

    // Build updated extractedData
    const currentExtractedData = (existing.extractedData as Record<string, unknown>) || {};
    const newExtractedData = { ...currentExtractedData };
    const changes: Record<string, { old: any; new: any }> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const oldValue = currentExtractedData[field];
        const newValue = body[field];
        
        newExtractedData[field] = newValue;
        changes[field] = { old: oldValue, new: newValue };
      }
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update analysis - solo actualizamos extractedData
    const updated = await prisma.quoteAnalysis.update({
      where: { id },
      data: {
        extractedData: newExtractedData as any,
      },
    });

    // Audit log
    await tryRecordAuditLog({
      caseId: existing.caseId,
      actor: user.email || user.id,
      action: 'quote.analysis.updated',
      payload: { 
        analysisId: id,
        changes,
        orgId: currentOrg.id,
      },
    });

    return NextResponse.json({
      success: true,
      analysis: updated,
      message: 'Quote analysis updated successfully',
    });

  } catch (error) {
    console.error('❌ Error en PATCH /api/quotes/analyses/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// =========================================================================
// DELETE - Eliminar análisis
// =========================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, currentOrg } = await getCurrentOrg();

    // Verify analysis exists and belongs to org
    const existing = await prisma.quoteAnalysis.findFirst({
      where: {
        id,
        orgId: currentOrg.id,
      },
      include: {
        pageReferences: true,
        caseLinks: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Quote analysis not found' },
        { status: 404 }
      );
    }

    // Delete in order: page references, case links, then analysis
    await prisma.quotePageReference.deleteMany({
      where: { quoteAnalysisId: id },
    });

    await prisma.caseQuoteLink.deleteMany({
      where: { quoteAnalysisId: id },
    });

    await prisma.quoteAnalysis.delete({
      where: { id },
    });

    // Audit log
    await tryRecordAuditLog({
      caseId: existing.caseId,
      actor: user.email || user.id,
      action: 'quote.analysis.deleted',
      payload: {
        analysisId: id,
        artifactId: existing.artifactId,
        insurer: safeExtract(existing.extractedData as Record<string, unknown>, 'insurer'),
        orgId: currentOrg.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Quote analysis deleted successfully. The artifact file remains available.',
    });

  } catch (error) {
    console.error('❌ Error en DELETE /api/quotes/analyses/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
