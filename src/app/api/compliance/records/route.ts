import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabase();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { caseId, jurisdiction, checklistData, insuranceType } = body;

        if (!caseId || !jurisdiction || !checklistData) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // 1. Get user's org
        const membership = await prisma.org_members.findFirst({
            where: { user_id: user.id },
            select: { org_id: true },
        });

        if (!membership) {
            return new NextResponse("Organization not found", { status: 403 });
        }

        // 2. Verify case belongs to org
        const caseItem = await prisma.case.findUnique({
            where: { id: caseId },
            select: { orgId: true },
        });

        if (!caseItem || caseItem.orgId !== membership.org_id) {
            return new NextResponse("Case not found or access denied", { status: 404 });
        }

        // 3. Create or Update Compliance Record
        // We use findFirst to check existence because caseId is not unique constraint on generic ID primary key, 
        // although logically 1 case -> many records could exist, active logic implies one active record or we find latest.
        // For now, let's look if one exists for this case/jurisdiction or just create new if we want history.
        // But requirement says "persistence", usually implying "current state".
        // Let's implement upsert-like logic: find existing valid record for this case.

        const existingRecord = await prisma.complianceRecord.findFirst({
            where: {
                caseId: caseId,
                jurisdiction: jurisdiction,
            },
            orderBy: { createdAt: 'desc' }
        });

        let record;
        if (existingRecord) {
            record = await prisma.complianceRecord.update({
                where: { id: existingRecord.id },
                data: {
                    checklistData,
                    insuranceType,
                    updatedAt: new Date(),
                    userId: user.id, // Last modified by
                },
            });
        } else {
            record = await prisma.complianceRecord.create({
                data: {
                    caseId,
                    jurisdiction,
                    insuranceType,
                    checklistData,
                    userId: user.id,
                    orgId: membership.org_id,
                    kycStatus: 'pending',
                },
            });
        }

        // 4. Create Audit Event
        await prisma.complianceAuditEvent.create({
            data: {
                recordId: record.id,
                eventType: existingRecord ? 'RecordUpdated' : 'RecordCreated',
                userId: user.id,
                metadata: {
                    itemCount: Object.keys(checklistData).length,
                    updatedItems: Object.keys(checklistData), // Simplified
                },
            },
        });

        return NextResponse.json(record);
    } catch (error) {
        console.error("[COMPLIANCE_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
