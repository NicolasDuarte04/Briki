import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { resolveActiveOrg } from "@/lib/helpers/resolveActiveOrg";

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

        // ✅ CORRECCIÓN MULTI-TENANCY: Usar resolveActiveOrg para obtener la org correcta
        const orgResult = await resolveActiveOrg(user.id, supabase);
        if (!orgResult.ok) {
            return new NextResponse(orgResult.error || "Organization error", { 
                status: orgResult.errorCode || 403 
            });
        }
        
        const { orgId: activeOrgId, membership } = orgResult;

        // 2. Verify case belongs to the user's ACTIVE org
        const caseItem = await prisma.case.findUnique({
            where: { id: caseId },
            select: { orgId: true },
        });

        if (!caseItem) {
            return new NextResponse("Case not found", { status: 404 });
        }
        
        // ✅ CORRECCIÓN: Verificar que el case pertenece a la org ACTIVA del usuario
        if (caseItem.orgId !== activeOrgId) {
            console.warn(`[COMPLIANCE_POST] Org mismatch: case.orgId=${caseItem.orgId}, user.activeOrgId=${activeOrgId}`);
            return new NextResponse("Case belongs to a different organization. Please switch to the correct organization.", { status: 403 });
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
                    orgId: activeOrgId!, // ✅ Usar org activa resuelta
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
