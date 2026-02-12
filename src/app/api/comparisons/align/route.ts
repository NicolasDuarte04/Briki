
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { alignPoliciesWithAI, sanitizeUserPrompt, MAX_COMPARISONS_PER_CASE } from '@/lib/openai/comparisonAlignment';
import { PolicyAnalysis, PolicyComparison, ComparisonFilters, ComparisonRow, ReformulationOptions } from '@/lib/types';

export const runtime = 'nodejs';

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

        // 2. Fetch Policy Analyses
        const analyses = await prisma.policyAnalysis.findMany({
            where: {
                id: { in: analysisIds },
                orgId: currentOrg.id // RLS
            },
            include: {
                artifact: true // Include artifact for file names if needed
            }
        });

        console.log(`✅ Found ${analyses.length} analyses out of ${analysisIds.length} requested`);

        // ✅ RESILIENCE: Log missing IDs but continue if we have at least 2 valid analyses
        if (analyses.length !== analysisIds.length) {
            const foundIds = analyses.map(a => a.id);
            const missingIds = analysisIds.filter(id => !foundIds.includes(id));
            console.warn(`⚠️  ${missingIds.length} analyses not found (possibly from other org or deleted)`);
            console.warn(`   Missing: ${missingIds.join(', ')}`);
            console.warn(`   Found: ${foundIds.join(', ')}`);
            console.warn(`   Current orgId filter: ${currentOrg.id}`);

            // Only fail if we don't have enough valid analyses
            if (analyses.length < 2) {
                return NextResponse.json(
                    {
                        error: 'At least 2 valid analyses are required for comparison',
                        message: 'Algunas pólizas no están disponibles. Recarga la página para actualizar.',
                        missing: missingIds,
                        found: foundIds.length
                    },
                    { status: 400 }
                );
            }

            console.log(`📊 Proceeding with ${analyses.length} available analyses (${missingIds.length} skipped)`);
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
        const typedAnalyses = analyses.map(a => ({
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

        const comparisonRows = await alignPoliciesWithAI(typedAnalyses, alignOptions);

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
