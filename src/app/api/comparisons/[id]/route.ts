import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

/**
 * DELETE /api/comparisons/[id]
 * 
 * Deletes a specific comparison by ID.
 * ✅ Security: Validates org access via case → org_members chain.
 * ✅ Integrity: If comparison has linked proposals, sets their comparisonId to null (orphan-safe).
 */
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: 'Comparison ID is required' },
                { status: 400 }
            );
        }

        // 1. Auth
        const { currentOrg } = await getCurrentOrg();

        // 2. Fetch comparison and verify access via case → org
        const comparison = await prisma.comparison.findUnique({
            where: { id },
            select: {
                id: true,
                caseId: true,
                case: {
                    select: { orgId: true }
                }
            }
        });

        if (!comparison) {
            return NextResponse.json(
                { error: 'Comparison not found' },
                { status: 404 }
            );
        }

        // ✅ Defense in depth: verify org access even though RLS covers this
        if (comparison.case.orgId !== currentOrg.id) {
            return NextResponse.json(
                { error: 'Access denied' },
                { status: 403 }
            );
        }

        // 3. ✅ Integrity: Orphan-safe — nullify proposals referencing this comparison
        await prisma.generatedProposal.updateMany({
            where: { comparisonId: id },
            data: { comparisonId: null }
        });

        // 4. Delete the comparison
        await prisma.comparison.delete({
            where: { id }
        });

        console.log(`🗑️ Comparison ${id} deleted from case ${comparison.caseId}`);

        return NextResponse.json({
            success: true,
            deletedId: id,
            caseId: comparison.caseId,
        });

    } catch (error: any) {
        console.error('❌ Error deleting comparison:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
