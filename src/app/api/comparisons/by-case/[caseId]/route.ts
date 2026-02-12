import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { resolveActiveOrg } from "@/lib/helpers/resolveActiveOrg";
import { MAX_COMPARISONS_PER_CASE } from "@/lib/openai/comparisonAlignment";
import { ComparisonRow, PolicyComparison } from "@/lib/types";

/**
 * GET /api/comparisons/by-case/[caseId]
 * 
 * Fetches ALL comparisons for a given case ID, ordered by creation date descending.
 * ✅ REFORMULATION: Returns array instead of single comparison for accumulation support.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ caseId: string }> }
) {
    try {
        const { caseId } = await params;

        const supabase = await createServerSupabase();

        // Check authentication
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, message: "Not authenticated" },
                { status: 401 }
            );
        }

        // ✅ MULTI-TENANCY: Resolver organización activa usando helper centralizado
        const orgResult = await resolveActiveOrg(user.id, supabase);
        if (!orgResult.ok) {
            return NextResponse.json(
                { success: false, message: orgResult.error },
                { status: orgResult.errorCode }
            );
        }
        const { orgId } = orgResult;

        // Verify case access
        const caseItem = await prisma.case.findUnique({
            where: { id: caseId },
            select: { orgId: true },
        });

        if (!caseItem || caseItem.orgId !== orgId) {
            return NextResponse.json(
                { success: false, message: "Case not found or access denied" },
                { status: 404 }
            );
        }

        // ✅ REFORMULATION: Fetch ALL comparisons for this case, ordered by newest first
        const comparisonRecords = await prisma.comparison.findMany({
            where: { caseId },
            orderBy: { createdAt: 'desc' },
            take: MAX_COMPARISONS_PER_CASE,
        });

        if (!comparisonRecords.length) {
            // Return success with empty array — no comparisons exist yet
            return NextResponse.json({
                success: true,
                comparisons: [],
            });
        }

        // ✅ Transform each Prisma record to PolicyComparison
        const comparisons: PolicyComparison[] = comparisonRecords.map(record => {
            const resultData = record.result as { rows?: ComparisonRow[] } | null;
            const rows = resultData?.rows || [];

            return {
                id: record.id,
                caseId: record.caseId,
                analysisIds: record.analysisIds,
                rows,
                alignmentMethod: 'semantic' as const,
                filters: record.filters as PolicyComparison['filters'],
                createdAt: record.createdAt.toISOString(),
                ...(record.label ? { label: record.label } : {}),
                focusAspects: (record.focusAspects || []) as ComparisonRow['category'][],
                ...(record.userPrompt ? { userPrompt: record.userPrompt } : {}),
                parentComparisonIds: record.parentComparisonIds || [],
            };
        });

        return NextResponse.json({
            success: true,
            comparisons,
            // ✅ Backward compatibility: also return latest as "comparison" for old clients
            comparison: comparisons[0] || null,
        });
    } catch (error) {
        console.error("Error fetching comparisons by case:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to fetch comparisons",
            },
            { status: 500 }
        );
    }
}
