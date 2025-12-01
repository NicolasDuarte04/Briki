import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // ✅ FASE 31.3: Await params for Next.js 15 compatibility
        const { id: proposalId } = await params;
        
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

        // Fetch proposal
        const proposal = await prisma.generatedProposal.findUnique({
            where: { id: proposalId },
        });

        if (!proposal) {
            return NextResponse.json(
                { success: false, message: "Proposal not found" },
                { status: 404 }
            );
        }

        // Verify access (RLS check)
        if (proposal.orgId !== orgId) {
            return NextResponse.json(
                { success: false, message: "Access denied" },
                { status: 403 }
            );
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
        console.error("Error fetching proposal:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to fetch proposal",
            },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // ✅ FASE 31.3: Await params for Next.js 15 compatibility
        const { id: proposalId } = await params;
        
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

        // Parse request body
        const body = await request.json();
        const { customNotes } = body;

        // Fetch existing proposal
        const existingProposal = await prisma.generatedProposal.findUnique({
            where: { id: proposalId },
        });

        if (!existingProposal) {
            return NextResponse.json(
                { success: false, message: "Proposal not found" },
                { status: 404 }
            );
        }

        // Verify access
        if (existingProposal.orgId !== orgId) {
            return NextResponse.json(
                { success: false, message: "Access denied" },
                { status: 403 }
            );
        }

        // Update proposal content
        const updatedContent = {
            ...(existingProposal.content as any),
            customNotes,
        };

        const updatedProposal = await prisma.generatedProposal.update({
            where: { id: proposalId },
            data: { content: updatedContent },
        });

        return NextResponse.json({
            success: true,
            proposal: {
                id: updatedProposal.id,
                caseId: updatedProposal.caseId,
                comparisonId: updatedProposal.comparisonId,
                version: updatedProposal.version,
                content: updatedProposal.content,
                createdAt: updatedProposal.createdAt,
                updatedAt: updatedProposal.updatedAt,
            },
        });
    } catch (error) {
        console.error("Error updating proposal:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to update proposal",
            },
            { status: 500 }
        );
    }
}
