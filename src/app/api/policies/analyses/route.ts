/**
 * GET /api/policies/analyses
 * 
 * Get policy analyses for a case
 * 
 * FASE 3: API de Análisis de Pólizas
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
 * @param request - Next.js request object
 * @returns List of policy analyses with page references
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
    
    console.log(`✅ Caso encontrado: ${caseExists.name}`);
    
    // 4. Get all policy analyses for this case
    const analyses = await prisma.policyAnalysis.findMany({
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
    
    console.log(`✅ Análisis encontrados: ${analyses.length}`);
    
    if (analyses.length > 0) {
      console.log(`   Primer análisis: ${analyses[0].id}`);
      console.log(`   Archivo: ${analyses[0].artifact.fileName}`);
      console.log(`   Confianza: ${analyses[0].overallConfidence}`);
      console.log(`   Referencias: ${analyses[0].pageReferences.length}`);
    }
    
    // 5. Success response
    return NextResponse.json({
      success: true,
      analyses: analyses,
      count: analyses.length
    });
    
  } catch (error: any) {
    console.error('❌ Error en GET /api/policies/analyses:', error);
    
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

