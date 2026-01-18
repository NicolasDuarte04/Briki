import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let caseId: string | undefined;
  try {
    const { user, currentOrg } = await getCurrentOrg();
    const { id } = await params;
    caseId = id;

    if (!caseId) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }

    // Obtener caso con sus relaciones
    const caseData = await prisma.case.findUnique({
      where: { 
        id: caseId,
        orgId: currentOrg.id // RLS check
      },
      include: {
        artifacts: {
          orderBy: { createdAt: 'asc' },
        },
        // ✅ FASE POLICY_LINKS: Incluir pólizas vinculadas de la organización
        linkedPolicies: {
          include: {
            policyAnalysis: {
              include: {
                artifact: {
                  select: {
                    id: true,
                    fileName: true,
                    fileId: true,
                  },
                },
              },
            },
          },
          orderBy: { linkedAt: 'desc' },
        },
      },
    });

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    return NextResponse.json({ case: caseData });
  } catch (error: any) {
    console.error(`❌ [API/CASES/${caseId || 'unknown'}]:`, error);
    return NextResponse.json({ error: 'Failed to fetch case data' }, { status: 500 });
  }
}
