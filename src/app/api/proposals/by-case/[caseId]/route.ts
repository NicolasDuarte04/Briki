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

        // Get user's org_id
        const { data: orgMember } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .single();

        if (!orgMember) {
            return NextResponse.json(
                { success: false, message: "User not associated with any organization" },
                { status: 403 }
            );
        }

        const orgId = orgMember.org_id;

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
