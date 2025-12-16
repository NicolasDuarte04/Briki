import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";
import { resolveActiveOrg } from "@/lib/helpers/resolveActiveOrg";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ caseId: string }> }
) {
    try {
        const supabase = await createServerSupabase();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { caseId } = await params;

        if (!caseId) {
            return new NextResponse("Case ID required", { status: 400 });
        }

        // ✅ CORRECCIÓN MULTI-TENANCY: Usar resolveActiveOrg
        const orgResult = await resolveActiveOrg(user.id, supabase);
        if (!orgResult.ok) {
            return new NextResponse(orgResult.error || "Organization error", { 
                status: orgResult.errorCode || 403 
            });
        }
        
        const { orgId: activeOrgId } = orgResult;

        // 2. Verify case access against ACTIVE org
        const caseItem = await prisma.case.findUnique({
            where: { id: caseId },
            select: { orgId: true },
        });

        if (!caseItem) {
            return new NextResponse("Case not found", { status: 404 });
        }
        
        if (caseItem.orgId !== activeOrgId) {
            console.warn(`[COMPLIANCE_GET] Org mismatch: case.orgId=${caseItem.orgId}, user.activeOrgId=${activeOrgId}`);
            return new NextResponse("Case belongs to a different organization", { status: 403 });
        }

        // 3. Get latest compliance record
        const record = await prisma.complianceRecord.findFirst({
            where: { caseId: caseId },
            orderBy: { createdAt: 'desc' },
            take: 1
        });

        if (!record) {
            // Return null successfully if no record exists yet (fresh case)
            return NextResponse.json(null);
        }

        return NextResponse.json(record);
    } catch (error) {
        console.error("[COMPLIANCE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ caseId: string }> }
) {
    try {
        const supabase = await createServerSupabase();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { caseId } = await params;

        if (!caseId) {
            return new NextResponse("Case ID required", { status: 400 });
        }

        // ✅ CORRECCIÓN MULTI-TENANCY: Usar resolveActiveOrg
        const orgResult = await resolveActiveOrg(user.id, supabase);
        if (!orgResult.ok) {
            return new NextResponse(orgResult.error || "Organization error", { 
                status: orgResult.errorCode || 403 
            });
        }
        
        const { orgId: activeOrgId } = orgResult;

        const caseItem = await prisma.case.findUnique({
            where: { id: caseId },
            select: { orgId: true },
        });

        if (!caseItem) {
            return new NextResponse("Case not found", { status: 404 });
        }
        
        if (caseItem.orgId !== activeOrgId) {
            console.warn(`[COMPLIANCE_PUT] Org mismatch: case.orgId=${caseItem.orgId}, user.activeOrgId=${activeOrgId}`);
            return new NextResponse("Case belongs to a different organization", { status: 403 });
        }

        const json = await req.json();
        const { checklistData, kycStatus, policyStartDate, policyEndDate } = json as {
            checklistData?: any;
            kycStatus?: string;
            policyStartDate?: string;
            policyEndDate?: string;
        };

        // Ensure checklistData is a valid object if present
        const safeChecklistData = checklistData && typeof checklistData === 'object' ? checklistData : {};

        // Prepare validatedDates if provided
        const validatedDates = (policyStartDate || policyEndDate) ? {
            startDate: policyStartDate,
            endDate: policyEndDate
        } : undefined;

        // 3. Update or Create compliance record
        // We do this manually instead of upsert because caseId might not have a UNIQUE constraint in schema

        const existingRecord = await prisma.complianceRecord.findFirst({
            where: { caseId: caseId },
            orderBy: { createdAt: 'desc' }
        });

        let result;

        if (existingRecord) {
            result = await prisma.complianceRecord.update({
                where: { id: existingRecord.id },
                data: {
                    ...(checklistData ? { checklistData: safeChecklistData } : {}),
                    ...(kycStatus ? { kycStatus } : {}),
                    ...(validatedDates ? { validatedDates } : {}),
                }
            });
        } else {
            // ✅ UPSERT: Crear registro si no existe (soluciona casos nuevos)
            // Obtener jurisdiction del body o usar default 'co' (Colombia)
            const jurisdiction = json.jurisdiction || 'co';
            
            result = await prisma.complianceRecord.create({
                data: {
                    caseId: caseId,
                    userId: user.id, // Mandatory field
                    orgId: activeOrgId!, // ✅ Usar org activa resuelta
                    jurisdiction: jurisdiction,
                    kycStatus: kycStatus || 'pending',
                    checklistData: safeChecklistData,
                    validatedDates: validatedDates || {},
                }
            });
            console.log(`[COMPLIANCE_PUT] Created new compliance record for case ${caseId}`);
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error("[COMPLIANCE_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
