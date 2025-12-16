import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/comparisons/by-case/[caseId]
 * 
 * Fetches the latest comparison for a given case ID.
 * This is used to load comparisons for historical cases.
 */
export async function GET(
    request: NextRequest,
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

        // ✅ CORRECCIÓN: Obtener TODAS las membresías del usuario (soporta multi-org)
        const { data: memberships, error: membershipError } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id);

        if (membershipError || !memberships || memberships.length === 0) {
            return NextResponse.json(
                { success: false, message: "User not associated with any organization" },
                { status: 403 }
            );
        }

        // ✅ Leer preferencia de organización activa
        let activeOrgId: string | null = null;
        try {
            const { data: preferences } = await supabase
                .from("user_preferences")
                .select("active_org_id")
                .eq("user_id", user.id)
                .single();
            activeOrgId = preferences?.active_org_id || null;
        } catch {
            // Sin preferencias, usar fallback
        }

        // ✅ Seleccionar membresía: activa preferida o primera disponible
        let selectedMembership = memberships[0];
        if (activeOrgId) {
            const activeMembership = memberships.find(m => m.org_id === activeOrgId);
            if (activeMembership) {
                selectedMembership = activeMembership;
            }
        }

        const orgId = selectedMembership.org_id;

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
