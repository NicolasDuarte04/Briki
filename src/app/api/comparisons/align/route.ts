
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { alignPoliciesWithAI, sanitizeUserPrompt, MAX_COMPARISONS_PER_CASE } from '@/lib/openai/comparisonAlignment';
import { PolicyAnalysis, PolicyComparison, ComparisonFilters, ComparisonRow, ReformulationOptions } from '@/lib/types';
import { resolveStrategy } from '@/lib/prompts/strategies';
import { sanitizeCategoryData } from '@/lib/prompts/strategies/pii-sanitizer';
import { serializeBriefDataToYaml } from '@/lib/prompts/strategies/yaml-serializer';
import { getCategoryDef } from '@/lib/insurance-categories';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutos para alineación AI con múltiples pólizas

interface AlignRequest {
    analysisIds: string[];
    caseId: string;
    // ✅ REFORMULATION FIELDS
    label?: string;
    focusAspects?: string[];
    userPrompt?: string;
    referenceComparisonIds?: string[];
}

export async function POST(request: NextRequest) {
    try {
        console.log('⚖️ POST /api/comparisons/align: Starting alignment...');

        // 1. Auth & Validation
        const { user, currentOrg } = await getCurrentOrg();

        const body = await request.json() as AlignRequest;
        const { analysisIds, caseId, label, focusAspects, userPrompt, referenceComparisonIds } = body;

        if (!analysisIds || !Array.isArray(analysisIds) || analysisIds.length < 2) {
            return NextResponse.json(
                { error: 'At least 2 analysisIds are required for comparison' },
                { status: 400 }
            );
        }

        if (!caseId) {
            return NextResponse.json(
                { error: 'caseId is required' },
                { status: 400 }
            );
        }

        // ── Fetch insurance_category + brief data from the Case for strategy-aware comparison ──
        const caseRecord = await prisma.case.findUnique({
            where: { id: caseId },
            select: { insurance_category: true, orgId: true, briefData: true, budget_currency: true, max_budget: true },
        });

        // Security: Verify case belongs to current org (defense-in-depth with RLS)
        if (!caseRecord || caseRecord.orgId !== currentOrg.id) {
            return NextResponse.json(
                { error: 'Case not found or access denied' },
                { status: 404 }
            );
        }

        const insuranceCategory = caseRecord.insurance_category;

        // ── Serialize brief data for comparison context ──
        let briefContext: string | undefined;
        const categoryData = caseRecord.briefData as Record<string, string | number | boolean | string[] | null> | null;
        if (insuranceCategory && categoryData && Object.keys(categoryData).length > 0) {
            const strategy = resolveStrategy(insuranceCategory);
            const sanitizedData = sanitizeCategoryData(categoryData, strategy.getPiiClassification());
            const fieldLabels = strategy.getFieldLabels();
            const catDef = getCategoryDef(insuranceCategory);
            const currencyFields = new Set(
                catDef?.fields.filter(f => f.isCurrency).map(f => f.id) ?? []
            );
            const yamlStr = serializeBriefDataToYaml(sanitizedData, fieldLabels, {
                currency: caseRecord.budget_currency || 'COP',
                currencyFields,
            });
            if (yamlStr) {
                briefContext = yamlStr;
            }
        }

        // ✅ LÍMITE DE COMPARACIONES: Prevenir crecimiento ilimitado
        const existingCount = await prisma.comparison.count({
            where: { caseId }
        });

        if (existingCount >= MAX_COMPARISONS_PER_CASE) {
            return NextResponse.json(
                { 
                    error: `Maximum ${MAX_COMPARISONS_PER_CASE} comparisons per case reached. Delete old comparisons to create new ones.`,
                    code: 'MAX_COMPARISONS_REACHED',
                    currentCount: existingCount,
                    maxAllowed: MAX_COMPARISONS_PER_CASE
                },
                { status: 429 }
            );
        }

        // ✅ SANITIZACIÓN DE PROMPT: Prevenir prompt injection
        const sanitizedUserPrompt = userPrompt ? sanitizeUserPrompt(userPrompt) : undefined;

        console.log(`📊 Comparing ${analysisIds.length} analyses for Case ${caseId} (${existingCount}/${MAX_COMPARISONS_PER_CASE} comparisons)`);

        // 2. Fetch analyses from BOTH tables (PolicyAnalysis + QuoteAnalysis)
        // ✅ FIX: analysisIds can contain IDs from either policy_analyses or quote_analyses tables.
        // Query policy_analyses first, then quote_analyses for any missing IDs.
        const policyResults = await prisma.policyAnalysis.findMany({
            where: {
                id: { in: analysisIds },
                orgId: currentOrg.id // RLS — multi-tenant isolation
            },
            include: {
                artifact: true
            }
        });

        const foundPolicyIds = new Set(policyResults.map(a => a.id));
        const missingFromPolicies = analysisIds.filter(id => !foundPolicyIds.has(id));

        // ✅ Query quote_analyses only for IDs not found in policy_analyses (avoid unnecessary DB call)
        const quoteResults = missingFromPolicies.length > 0
            ? await prisma.quoteAnalysis.findMany({
                where: {
                    id: { in: missingFromPolicies },
                    orgId: currentOrg.id // RLS — same multi-tenant constraint
                },
                include: {
                    artifact: true
                }
            })
            : [];

        if (missingFromPolicies.length > 0) {
            console.log(`📋 Found ${quoteResults.length} quote analyses for ${missingFromPolicies.length} IDs not in policy_analyses`);
        }

        // ✅ Unify both result sets — both include { artifact: true }
        const analyses = [...policyResults, ...quoteResults];
        console.log(`✅ Found ${analyses.length} analyses (${policyResults.length} policies + ${quoteResults.length} quotes) out of ${analysisIds.length} requested`);

        // ✅ RESILIENCE: Log truly missing IDs (not in either table)
        if (analyses.length !== analysisIds.length) {
            const allFoundIds = analyses.map(a => a.id);
            const trulyMissingIds = analysisIds.filter(id => !allFoundIds.includes(id));
            if (trulyMissingIds.length > 0) {
                console.warn(`⚠️  ${trulyMissingIds.length} analyses not found in either table (possibly from other org or deleted)`);
                console.warn(`   Missing: ${trulyMissingIds.join(', ')}`);
                console.warn(`   Current orgId filter: ${currentOrg.id}`);
            }

            // Only fail if we don't have enough valid analyses
            if (analyses.length < 2) {
                return NextResponse.json(
                    {
                        error: 'At least 2 valid analyses are required for comparison',
                        message: 'Algunos análisis no están disponibles. Recarga la página para actualizar.',
                        missing: trulyMissingIds,
                        found: allFoundIds.length
                    },
                    { status: 400 }
                );
            }

            console.log(`📊 Proceeding with ${analyses.length} available analyses (${trulyMissingIds.length} skipped)`);
        }

        // 3. ✅ REFORMULATION: Fetch reference comparison rows if provided
        let referenceRows: ComparisonRow[] | undefined;
        if (referenceComparisonIds?.length) {
            const refComparisons = await prisma.comparison.findMany({
                where: {
                    id: { in: referenceComparisonIds },
                    caseId // Security: only same case
                },
                select: { result: true }
            });
            referenceRows = refComparisons.flatMap(c => {
                const data = c.result as { rows?: ComparisonRow[] } | null;
                return data?.rows || [];
            });
            console.log(`📚 Loaded ${referenceRows.length} reference rows from ${refComparisons.length} previous comparisons`);
        }

        // 4. Align with AI
        // Cast Prisma type to application type (Json -> PolicyExtractedData, Date -> string, Decimal -> number)
        // Both PolicyAnalysis and QuoteAnalysis queries include { artifact: true }
        // Type the callback as policyResults element to access the artifact relation
        type AnalysisWithArtifact = (typeof policyResults)[number];
        const typedAnalyses = analyses.map((a: AnalysisWithArtifact) => ({
            id: a.id,
            artifactId: a.artifactId,
            caseId: a.caseId,
            orgId: a.orgId,
            extractedData: a.extractedData as Record<string, any>,
            extractionMethod: a.extractionMethod as 'manual' | 'ocr' | 'hybrid',
            overallConfidence: Number(a.overallConfidence),  // Decimal -> number
            extractedAt: a.extractedAt.toISOString(),
            createdAt: a.createdAt.toISOString(),
            updatedAt: a.updatedAt.toISOString(),
            artifact: a.artifact ? {
                id: a.artifact.id,
                fileName: a.artifact.fileName,
                contentType: a.artifact.contentType || 'application/pdf',
                fileId: a.artifact.fileId || '',
                createdAt: a.artifact.createdAt.toISOString()
            } : undefined,
            pageReferences: [] // We don't need page refs for alignment prompt, saves memory
        })) as PolicyAnalysis[];

        const alignOptions: ReformulationOptions & { referenceRows?: ComparisonRow[] } = {
            focusAspects: focusAspects as ComparisonRow['category'][],
        };
        if (sanitizedUserPrompt) alignOptions.userPrompt = sanitizedUserPrompt;
        if (referenceRows) alignOptions.referenceRows = referenceRows;

        const comparisonRows = await alignPoliciesWithAI(typedAnalyses, alignOptions, insuranceCategory, briefContext);

        // 5. Save to Database — ✅ ACUMULACIÓN: NO deleteMany, simplemente crear nueva
        const defaultFilters: ComparisonFilters = {
            categories: [],
            onlyDifferences: false,
            onlyMandatory: false,
            searchQuery: ""
        };

        // ✅ Auto-generate label if not provided
        const autoLabel = label || `Comparación #${existingCount + 1}`;

        // ✅ Save with actual found analysis IDs (not the originally requested ones)
        const foundAnalysisIds = analyses.map(a => a.id);
        
        const comparison = await prisma.comparison.create({
            data: {
                caseId,
                analysisIds: foundAnalysisIds,
                result: JSON.parse(JSON.stringify({ rows: comparisonRows })), // Proper Json serialization
                filters: JSON.parse(JSON.stringify(defaultFilters)),
                userId: user.id,
                label: autoLabel,
                focusAspects: (focusAspects as string[]) || [],
                userPrompt: sanitizedUserPrompt || null,
                parentComparisonIds: referenceComparisonIds || [],
            }
        });

        console.log(`✅ Comparison saved: ${comparison.id} (label: ${autoLabel})`);

        // 6. Return Result
        // Construct full PolicyComparison object
        const response: PolicyComparison = {
            id: comparison.id,
            caseId: comparison.caseId,
            analysisIds: comparison.analysisIds,
            rows: comparisonRows,
            alignmentMethod: 'semantic',
            filters: defaultFilters,
            createdAt: comparison.createdAt.toISOString(),
            ...(comparison.label ? { label: comparison.label } : {}),
            focusAspects: comparison.focusAspects as ComparisonRow['category'][],
            ...(comparison.userPrompt ? { userPrompt: comparison.userPrompt } : {}),
            parentComparisonIds: comparison.parentComparisonIds,
        };

        return NextResponse.json({
            success: true,
            comparison: response,
            meta: {
                totalComparisons: existingCount + 1,
                maxAllowed: MAX_COMPARISONS_PER_CASE,
            }
        });

    } catch (error: any) {
        console.error('❌ Error in /api/comparisons/align:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
