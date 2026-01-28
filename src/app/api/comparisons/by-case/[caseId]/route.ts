import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { resolveActiveOrg } from "@/lib/helpers/resolveActiveOrg";

/**
 * GET /api/comparisons/by-case/[caseId]
 * 
 * Fetches the latest comparison for a given case ID.
 * This is used to load comparisons for historical cases.
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

        // Fetch latest comparison for this case
        const comparison = await prisma.comparison.findFirst({
            where: { caseId },
            orderBy: { createdAt: 'desc' }
        });

        if (!comparison) {
            // Return success with null comparison - no comparison exists yet
            return NextResponse.json({
                success: true,
                comparison: null,
            });
        }

        // ✅ CORRECCIÓN CRÍTICA: Extraer rows de result para mantener consistencia con /api/comparisons/align
        // El campo 'result' en BD contiene { rows: ComparisonRow[] }
        // Pero PolicyComparison interface espera 'rows' directamente
        const resultData = comparison.result as { rows?: unknown[] } | null;
        const rows = resultData?.rows || [];

        return NextResponse.json({
            success: true,
            comparison: {
                id: comparison.id,
                caseId: comparison.caseId,
                analysisIds: comparison.analysisIds,
                rows: rows,  // ✅ Extraer rows de result
                alignmentMethod: 'semantic' as const,
                filters: comparison.filters,
                createdAt: comparison.createdAt,
            },
        });
    } catch (error) {
        console.error("Error fetching comparison by case:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to fetch comparison",
            },
            { status: 500 }
        );
    }
}
