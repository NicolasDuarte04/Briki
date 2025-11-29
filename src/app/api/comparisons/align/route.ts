
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { alignPoliciesWithAI } from '@/lib/openai/comparisonAlignment';
import { PolicyAnalysis, PolicyComparison, ComparisonFilters } from '@/lib/types';

export const runtime = 'nodejs';

interface AlignRequest {
    analysisIds: string[];
    caseId: string;
}

export async function POST(request: NextRequest) {
    try {
        console.log('⚖️ POST /api/comparisons/align: Starting alignment...');

        // 1. Auth & Validation
        const { user, currentOrg } = await getCurrentOrg();

        const body = await request.json() as AlignRequest;
        const { analysisIds, caseId } = body;

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

        console.log(`📊 Comparing ${analysisIds.length} analyses for Case ${caseId}`);

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

        if (analyses.length !== analysisIds.length) {
            return NextResponse.json(
                { error: 'Some analyses could not be found or you do not have access' },
                { status: 404 }
            );
        }

        // 3. Align with AI
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

        const comparisonRows = await alignPoliciesWithAI(typedAnalyses);

        // 4. Save to Database
        const defaultFilters: ComparisonFilters = {
            categories: [],
            onlyDifferences: false,
            onlyMandatory: false,
            searchQuery: ""
        };

        const comparison = await prisma.comparison.create({
            data: {
                caseId,
                analysisIds,
                result: JSON.parse(JSON.stringify({ rows: comparisonRows })), // Proper Json serialization
                filters: JSON.parse(JSON.stringify(defaultFilters)),
                userId: user.id
            }
        });

        console.log(`✅ Comparison saved: ${comparison.id}`);

        // 5. Return Result
        // Construct full PolicyComparison object
        const response: PolicyComparison = {
            id: comparison.id,
            caseId: comparison.caseId,
            analysisIds: comparison.analysisIds,
            rows: comparisonRows,
            alignmentMethod: 'semantic',
            filters: defaultFilters,
            createdAt: comparison.createdAt.toISOString()
        };

        return NextResponse.json({
            success: true,
            comparison: response
        });

    } catch (error: any) {
        console.error('❌ Error in /api/comparisons/align:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
