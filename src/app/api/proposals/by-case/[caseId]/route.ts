import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { resolveActiveOrg } from "@/lib/helpers/resolveActiveOrg";

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

        // ✅ MULTI-TENANCY: Resolver organización activa usando helper centralizado
        const orgResult = await resolveActiveOrg(user.id, supabase);
        if (!orgResult.ok) {
            return NextResponse.json(
                { success: false, message: orgResult.error },
                { status: orgResult.errorCode }
            );
        }
        const { orgId } = orgResult;

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
