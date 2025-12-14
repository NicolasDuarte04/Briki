import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

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

        // 1. Get user's org
        const membership = await prisma.org_members.findFirst({
            where: { user_id: user.id },
            select: { org_id: true },
        });

        if (!membership) {
            return new NextResponse("Organization not found", { status: 403 });
        }

        // 2. Verify case access
        const caseItem = await prisma.case.findUnique({
            where: { id: caseId },
            select: { orgId: true },
        });

        if (!caseItem || caseItem.orgId !== membership.org_id) {
            return new NextResponse("Case not found or access denied", { status: 404 });
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

        const membership = await prisma.org_members.findFirst({
            where: { user_id: user.id },
            select: { org_id: true },
        });

        if (!membership) {
            return new NextResponse("Organization not found", { status: 403 });
        }

        const caseItem = await prisma.case.findUnique({
            where: { id: caseId },
            select: { orgId: true },
        });

        if (!caseItem || caseItem.orgId !== membership.org_id) {
            return new NextResponse("Case not found or access denied", { status: 404 });
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
            result = await prisma.complianceRecord.create({
                data: {
                    caseId: caseId,
                    userId: user.id, // Mandatory field
                    orgId: membership.org_id,
                    jurisdiction: 'colombia',
                    kycStatus: kycStatus || 'pending',
                    checklistData: safeChecklistData,
                    validatedDates: validatedDates || {},
                }
            });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error("[COMPLIANCE_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
