/**
 * GET /api/policies/analyses
 * 
 * Get policy analyses for a case
 * Includes both direct analyses AND linked organization policies via CasePolicyLink
 * 
 * FASE 3: API de Análisis de Pólizas
 * FASE POLICY_LINKS: Extended to include linked org policies
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';

// Force Node.js runtime
export const runtime = 'nodejs';

/**
 * GET handler - Get policy analyses for a case
 * 
 * Query parameters:
 * - caseId: UUID of the case (required)
 * 
 * Returns both:
 * - Direct analyses: PolicyAnalysis records where caseId matches
 * - Linked analyses: PolicyAnalysis records linked via CasePolicyLink table
 * 
 * @param request - Next.js request object
 * @returns List of policy analyses with page references and link metadata
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 GET /api/policies/analyses: Iniciando...');
    
    // 1. Authentication
    const { user, currentOrg } = await getCurrentOrg();
    
    console.log(`👤 Usuario: ${user.id}`);
    console.log(`🏢 Organización: ${currentOrg.id}`);
    
    // 2. Get caseId from query params
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get('caseId');
    
    if (!caseId) {
      return NextResponse.json(
        { error: 'caseId query parameter is required' },
        { status: 400 }
      );
    }
    
    console.log(`📁 Caso ID: ${caseId}`);
    
    // 3. Verify case exists and user has access (RLS)
    const caseExists = await prisma.case.findFirst({
      where: {
        id: caseId,
        orgId: currentOrg.id // RLS: Only cases from user's org
      }
    });
    
    if (!caseExists) {
      console.log('❌ Caso no encontrado o sin acceso');
      return NextResponse.json(
        { error: 'Case not found or access denied' },
        { status: 404 }
      );
    }
    
    console.log(`✅ Caso encontrado: ${caseExists.clientName || caseExists.id}`);
    
    // 4. Get DIRECT policy analyses for this case (original behavior)
    const directAnalyses = await prisma.policyAnalysis.findMany({
      where: {
        caseId: caseId,
        orgId: currentOrg.id // Additional RLS check
      },
      include: {
        artifact: {
          select: {
            id: true,
            fileName: true,
            contentType: true,
            fileId: true,
            createdAt: true
          }
        },
        pageReferences: {
          orderBy: {
            pageNumber: 'asc'
          }
        }
      },
      orderBy: {
        extractedAt: 'desc' // Most recent first
      }
    });
    
    console.log(`✅ Análisis directos encontrados: ${directAnalyses.length}`);
    
    // 5. ✅ FASE POLICY_LINKS: Get LINKED policy analyses via CasePolicyLink
    const linkedPolicyLinks = await prisma.casePolicyLink.findMany({
      where: {
        caseId: caseId,
        orgId: currentOrg.id
      },
      include: {
        policyAnalysis: {
          include: {
            artifact: {
              select: {
                id: true,
                fileName: true,
                contentType: true,
                fileId: true,
                createdAt: true
              }
            },
            pageReferences: {
              orderBy: {
                pageNumber: 'asc'
              }
            }
          }
        }
      },
      orderBy: {
        linkedAt: 'desc'
      }
    });
    
    console.log(`✅ Pólizas vinculadas encontradas: ${linkedPolicyLinks.length}`);
    
    // 5b. ✅ FIX DEFECTO C: Get LINKED quote analyses via CaseQuoteLink
    const linkedQuoteLinks = await prisma.caseQuoteLink.findMany({
      where: {
        caseId: caseId,
        orgId: currentOrg.id
      },
      include: {
        quoteAnalysis: {
          include: {
            artifact: {
              select: {
                id: true,
                fileName: true,
                contentType: true,
                fileId: true,
                createdAt: true
              }
            },
          }
        }
      },
      orderBy: {
        linkedAt: 'desc'
      }
    });
    
    console.log(`✅ Cotizaciones vinculadas encontradas: ${linkedQuoteLinks.length}`);
    
    // 6. Combine and deduplicate analyses
    // Direct analyses take priority; add linkInfo to linked ones
    const directAnalysisIds = new Set(directAnalyses.map(a => a.id));
    
    // Transform direct analyses with linkType = 'direct'
    const directWithMeta = directAnalyses.map(analysis => ({
      ...analysis,
      linkType: 'direct' as const,
      linkId: null as string | null,
      linkedAt: null as Date | null,
      linkedBy: null as string | null
    }));
    
    // Transform linked analyses with linkType = 'linked'
    // Only include if not already in direct (avoid duplicates)
    // ✅ FASE CONTEXTUALIZACIÓN: Incluir contextualizedAt para determinar estado del botón
    const linkedWithMeta = linkedPolicyLinks
      .filter(link => !directAnalysisIds.has(link.policyAnalysis.id))
      .map(link => ({
        ...link.policyAnalysis,
        linkType: 'linked' as const,
        linkId: link.id,
        linkedAt: link.linkedAt,
        linkedBy: link.linkedBy,
        contextualizedAt: link.contextualizedAt ?? null // ✅ Nuevo campo
      }));
    
    // ✅ FIX DEFECTO C: Transform linked QUOTE analyses with linkType = 'linked_quote'
    // QuoteAnalysis tiene estructura similar a PolicyAnalysis con extractedData, artifact, etc.
    const linkedQuotesWithMeta = linkedQuoteLinks
      .map(link => ({
        id: link.quoteAnalysis.id,
        extractedData: link.quoteAnalysis.extractedData,
        overallConfidence: link.quoteAnalysis.overallConfidence,
        extractedAt: link.quoteAnalysis.extractedAt,
        artifactId: link.quoteAnalysis.artifactId,
        caseId: link.quoteAnalysis.caseId,
        orgId: link.quoteAnalysis.orgId,
        artifact: link.quoteAnalysis.artifact,
        pageReferences: [], // QuoteAnalysis no tiene pageReferences directos
        linkType: 'linked_quote' as const,
        linkId: link.id,
        linkedAt: link.linkedAt,
        linkedBy: link.linkedBy,
        contextualizedAt: link.contextualizedAt ?? null
      }));
    
    // Combine: direct first, then linked policies, then linked quotes
    const allAnalyses = [...directWithMeta, ...linkedWithMeta, ...linkedQuotesWithMeta];
    
    console.log(`✅ Total análisis combinados: ${allAnalyses.length} (${directWithMeta.length} directos + ${linkedWithMeta.length} pólizas vinculadas + ${linkedQuotesWithMeta.length} cotizaciones vinculadas)`);
    
    if (allAnalyses.length > 0) {
      const firstAnalysis = allAnalyses[0];
      if (firstAnalysis) {
        console.log(`   Primer análisis: ${firstAnalysis.id} (${firstAnalysis.linkType})`);
        console.log(`   Archivo: ${firstAnalysis.artifact?.fileName ?? 'N/A'}`);
        console.log(`   Confianza: ${firstAnalysis.overallConfidence}`);
        console.log(`   Referencias: ${firstAnalysis.pageReferences?.length ?? 0}`);
      }
    }
    
    // 7. Success response
    return NextResponse.json({
      success: true,
      analyses: allAnalyses,
      count: allAnalyses.length,
      directCount: directWithMeta.length,
      linkedCount: linkedWithMeta.length,
      linkedQuoteCount: linkedQuotesWithMeta.length
    });
    
  } catch (error: any) {
    console.error('❌ Error en GET /api/policies/analyses:', error);
    
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

