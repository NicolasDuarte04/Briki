
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const caseId = searchParams.get('caseId');

        if (!caseId) {
            return NextResponse.json(
                { error: 'caseId is required' },
                { status: 400 }
            );
        }

        // 1. Auth & Validation
        const { currentOrg } = await getCurrentOrg();

        // 2. Fetch latest comparison for the case
        // RLS is handled by Prisma query filtering (although RLS is on DB level, we filter by orgId implicitly via case relation if needed, 
        // but since we query Comparison directly, we rely on the DB RLS policies we created or explicit checks)
        // Since we are using Prisma, we should ensure the user has access to the case.

        // Check access to case first (optional but good practice)
        const caseExists = await prisma.case.findFirst({
            where: {
                id: caseId,
                orgId: currentOrg.id
            }
        });

        if (!caseExists) {
            return NextResponse.json(
                { error: 'Case not found or access denied' },
                { status: 404 }
            );
        }

        const comparison = await prisma.comparison.findFirst({
            where: {
                caseId: caseId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!comparison) {
            return NextResponse.json(
                { comparison: null },
                { status: 404 }
            );
        }

        return NextResponse.json({ comparison });

    } catch (error: any) {
        console.error('Error fetching comparison:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
