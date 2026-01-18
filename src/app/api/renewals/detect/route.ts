/**
 * POST /api/renewals/detect - Auto-detect renewals from PolicyAnalysis
 * 
 * FASE 2: API Endpoints para Renovaciones
 * 
 * This endpoint analyzes existing PolicyAnalysis records and creates
 * Renewal entries for policies that are approaching their renewal date.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const runtime = 'nodejs';

// Schema for detection request
const DetectRenewalsSchema = z.object({
  caseId: z.string().uuid(),
  daysAhead: z.number().int().min(1).max(365).default(90), // Look ahead window
  skipExisting: z.boolean().default(true), // Skip if renewal already exists
});

// Type for extracted policy data (from PolicyAnalysis.extractedData)
// ✅ CORRECCIÓN: Incluir todos los posibles nombres de campos que el prompt de IA puede generar
interface ExtractedPolicyData {
  carrier?: string;
  insurer?: { name?: string } | string;
  aseguradora?: string;
  policyNumber?: string;
  policy_number?: string;
  numeroPoliza?: string;
  planName?: string;
  product?: string;
  plan?: string;
  producto?: string;
  // Fechas - múltiples nombres posibles del prompt de IA
  effective_from?: string; // ✅ Campo del prompt de IA
  effective_to?: string;   // ✅ Campo del prompt de IA  
  effectiveDate?: string;
  expirationDate?: string;
  startDate?: string;
  endDate?: string;
  fechaInicio?: string;
  fechaFin?: string;
  vigenciaDesde?: string;
  vigenciaHasta?: string;
  // Financials
  premium?: number;
  annualPremium?: number;
  monthlyPremium?: number;
  prima?: number;
  primaAnual?: number;
  primaMensual?: number;
  financials?: {
    premium_total?: number;
    premium_net?: number;
  };
  currency?: string;
  [key: string]: any;
}

/**
 * POST handler - Auto-detect renewals from policy analyses
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST /api/renewals/detect: Auto-detectando renovaciones...');
    
    // 1. Authentication
    const { user, currentOrg } = await getCurrentOrg();
    console.log(`👤 Usuario: ${user.id}`);
    console.log(`🏢 Organización: ${currentOrg.id}`);
    
    // 2. Parse and validate body
    const body = await request.json();
    const validationResult = DetectRenewalsSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }
    
    const { caseId, daysAhead, skipExisting } = validationResult.data;
    
    // 3. Verify case exists and user has access
    const caseExists = await prisma.case.findFirst({
      where: {
        id: caseId,
        orgId: currentOrg.id
      }
    });
    
    if (!caseExists) {
      return NextResponse.json(
        { error: 'Case not found or access denied' },
        { status: 404 }
      );
    }
    
    // ✅ FASE POLICY_LINKS: Get all policy analyses for this case
    // Includes both direct analyses AND linked via CasePolicyLink
    
    // 4a. Get DIRECT analyses (caseId matches)
    const directAnalyses = await prisma.policyAnalysis.findMany({
      where: {
        caseId: caseId,
        orgId: currentOrg.id
      },
      include: {
        artifact: {
          select: {
            id: true,
            fileName: true
          }
        }
      }
    });
    
    // 4b. Get LINKED analyses via CasePolicyLink
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
                fileName: true
              }
            }
          }
        }
      }
    });
    
    // 4c. Combine and deduplicate (direct takes priority)
    const directIds = new Set(directAnalyses.map(a => a.id));
    const linkedAnalyses = linkedPolicyLinks
      .map(link => link.policyAnalysis)
      .filter(a => !directIds.has(a.id));
    
    const analyses = [...directAnalyses, ...linkedAnalyses];
    
    console.log(`📄 Análisis de pólizas: ${directAnalyses.length} directos + ${linkedAnalyses.length} vinculados = ${analyses.length} total`);
    
    if (analyses.length === 0) {
      return NextResponse.json({
        message: 'No policy analyses found for this case',
        created: [],
        skipped: [],
        errors: []
      });
    }
    
    // 5. Get existing renewals to avoid duplicates
    const existingRenewals = skipExisting 
      ? await prisma.renewal.findMany({
          where: {
            caseId: caseId,
            orgId: currentOrg.id
          },
          select: {
            policyAnalysisId: true,
            policyNumber: true
          }
        })
      : [];
    
    const existingPolicyAnalysisIds = new Set(
      existingRenewals.map(r => r.policyAnalysisId).filter(Boolean)
    );
    const existingPolicyNumbers = new Set(
      existingRenewals.map(r => r.policyNumber).filter(Boolean)
    );
    
    // 6. Process each analysis and detect renewals
    const created: any[] = [];
    const skipped: any[] = [];
    const errors: any[] = [];
    
    const now = new Date();
    const lookAheadDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    for (const analysis of analyses) {
      try {
        const extractedData = analysis.extractedData as ExtractedPolicyData;
        
        // Skip if already has renewal linked
        if (skipExisting && existingPolicyAnalysisIds.has(analysis.id)) {
          skipped.push({
            analysisId: analysis.id,
            reason: 'Renewal already exists for this analysis'
          });
          continue;
        }
        
        // Extract relevant fields (handle various field naming conventions)
        // ✅ CORRECCIÓN: insurer puede ser un objeto {name: string} o string
        let carrier = 'Desconocido';
        if (extractedData.carrier) {
          carrier = extractedData.carrier;
        } else if (extractedData.insurer) {
          carrier = typeof extractedData.insurer === 'object' 
            ? extractedData.insurer.name || 'Desconocido'
            : extractedData.insurer;
        } else if (extractedData.aseguradora) {
          carrier = extractedData.aseguradora;
        }
        
        const policyNumber = extractedData.policyNumber || extractedData.policy_number || extractedData.numeroPoliza;
        const planName = extractedData.planName || extractedData.product || extractedData.plan || extractedData.producto || 'Plan sin nombre';
        
        // Skip if policy number already exists
        if (skipExisting && policyNumber && existingPolicyNumbers.has(policyNumber)) {
          skipped.push({
            analysisId: analysis.id,
            policyNumber,
            reason: 'Policy number already has a renewal'
          });
          continue;
        }
        
        // Parse dates - try multiple field names
        // ✅ CORRECCIÓN: Priorizar effective_from/effective_to que son los campos del prompt de IA
        const startDateStr = extractedData.effective_from || extractedData.effectiveDate || 
                            extractedData.startDate || extractedData.fechaInicio || 
                            extractedData.vigenciaDesde;
        const endDateStr = extractedData.effective_to || extractedData.expirationDate || 
                          extractedData.endDate || extractedData.fechaFin || 
                          extractedData.vigenciaHasta;
        
        if (!startDateStr || !endDateStr) {
          skipped.push({
            analysisId: analysis.id,
            reason: 'Missing start or end date in extracted data'
          });
          continue;
        }
        
        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);
        
        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          skipped.push({
            analysisId: analysis.id,
            reason: `Invalid dates: start=${startDateStr}, end=${endDateStr}`
          });
          continue;
        }
        
        // Check if renewal date (end date) is within the look-ahead window
        // or if it's already past (needs immediate attention)
        const isPastDue = endDate < now;
        const isWithinWindow = endDate <= lookAheadDate;
        
        if (!isPastDue && !isWithinWindow) {
          skipped.push({
            analysisId: analysis.id,
            renewalDate: endDate.toISOString(),
            reason: `Renewal date is more than ${daysAhead} days away`
          });
          continue;
        }
        
        // Parse premium - try multiple field names and formats
        // ✅ CORRECCIÓN: Incluir financials.premium_total que es el campo del prompt de IA
        let premiumMinor = 0;
        const rawPremium = extractedData.financials?.premium_total || 
                       extractedData.premium || extractedData.annualPremium || 
                       extractedData.prima || extractedData.primaAnual ||
                       (extractedData.monthlyPremium ? extractedData.monthlyPremium * 12 : null) ||
                       (extractedData.primaMensual ? extractedData.primaMensual * 12 : null);
        
        if (rawPremium != null) {
          if (typeof rawPremium === 'number') {
            premiumMinor = Math.round(rawPremium * 100); // Convert to minor units (centavos)
          } else {
            // Handle string case (e.g., "$1,500.00")
            const premiumStr = String(rawPremium);
            const parsedPremium = parseFloat(premiumStr.replace(/[^0-9.]/g, ''));
            if (!isNaN(parsedPremium)) {
              premiumMinor = Math.round(parsedPremium * 100);
            }
          }
        }
        
        // If no premium found, set a default or skip
        if (premiumMinor <= 0) {
          premiumMinor = 0; // We'll still create the renewal, but without premium
        }
        
        const currency = extractedData.currency || extractedData.moneda || 'COP';
        
        // Calculate renewal window status
        const daysUntil = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        let renewalWindowStatus: 'ok' | 'dueSoon' | 'overdue' = 'ok';
        if (daysUntil < 0) {
          renewalWindowStatus = 'overdue';
        } else if (daysUntil <= 30) {
          renewalWindowStatus = 'dueSoon';
        }
        
        // 7. Create the renewal
        const renewal = await prisma.renewal.create({
          data: {
            caseId: caseId,
            policyAnalysisId: analysis.id,
            orgId: currentOrg.id,
            carrier: carrier,
            policyNumber: policyNumber || null,
            planName: planName,
            currentStartDate: startDate,
            currentEndDate: endDate,
            renewalDate: endDate, // Renewal date = end date by default
            currentPremiumMinor: premiumMinor,
            currency: currency.substring(0, 3).toUpperCase(),
            status: 'pending',
            renewalWindowStatus: renewalWindowStatus,
            notes: `Auto-detectado desde ${analysis.artifact?.fileName || 'análisis de póliza'}`,
          }
        });
        
        // 8. Create alert if needed
        if (renewalWindowStatus !== 'ok') {
          await prisma.renewalAlert.create({
            data: {
              renewalId: renewal.id,
              alertType: renewalWindowStatus === 'overdue' ? 'expiry_warning' : 'reminder',
              severity: renewalWindowStatus === 'overdue' ? 'critical' : 'warning',
              message: renewalWindowStatus === 'overdue'
                ? `⚠️ La póliza ${planName} (${carrier}) ha VENCIDO. Requiere acción inmediata.`
                : `📅 La póliza ${planName} (${carrier}) vence en ${daysUntil} días.`,
              userId: user.id
            }
          });
        }
        
        created.push({
          renewalId: renewal.id,
          analysisId: analysis.id,
          carrier: carrier,
          planName: planName,
          policyNumber: policyNumber,
          renewalDate: endDate.toISOString(),
          renewalWindowStatus: renewalWindowStatus,
          daysUntilRenewal: daysUntil
        });
        
        console.log(`✅ Renovación creada: ${planName} (${carrier}) - vence en ${daysUntil} días`);
        
      } catch (analysisError: any) {
        console.error(`❌ Error procesando análisis ${analysis.id}:`, analysisError);
        errors.push({
          analysisId: analysis.id,
          error: analysisError.message
        });
      }
    }
    
    console.log(`📊 Resultado: ${created.length} creadas, ${skipped.length} omitidas, ${errors.length} errores`);
    
    return NextResponse.json({
      message: `Detection complete. Created ${created.length} renewals.`,
      summary: {
        totalAnalyses: analyses.length,
        created: created.length,
        skipped: skipped.length,
        errors: errors.length
      },
      created,
      skipped,
      errors
    }, { status: created.length > 0 ? 201 : 200 });
    
  } catch (error: any) {
    console.error('❌ Error detecting renewals:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
