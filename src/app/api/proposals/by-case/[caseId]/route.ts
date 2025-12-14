import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/proposals/by-case/[caseId]
 * 
 * Fetches the latest proposal for a given case ID.
 * This is used to load proposals for historical cases.
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

        // Fetch latest proposal for this case
        const proposal = await prisma.generatedProposal.findFirst({
            where: { 
                caseId,
                orgId, // RLS check
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!proposal) {
            // Return success with null proposal - no proposal exists yet
            return NextResponse.json({
                success: true,
                proposal: null,
            });
        }

        return NextResponse.json({
            success: true,
            proposal: {
                id: proposal.id,
                caseId: proposal.caseId,
                comparisonId: proposal.comparisonId,
                version: proposal.version,
                content: proposal.content,
                createdAt: proposal.createdAt,
                updatedAt: proposal.updatedAt,
            },
        });
    } catch (error) {
        console.error("Error fetching proposal by case:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to fetch proposal",
            },
            { status: 500 }
        );
    }
}
