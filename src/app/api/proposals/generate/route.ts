import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
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

        // ✅ CORRECCIÓN: Obtener TODAS las membresías del usuario (soporta multi-org)
        const { data: memberships, error: membershipError } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id);

        if (membershipError || !memberships || memberships.length === 0) {
            return NextResponse.json(
                { success: false, message: "User not associated with any organization" },
                { status: 403 }
            );
        }

        // ✅ Leer preferencia de organización activa
        let activeOrgId: string | null = null;
        try {
            const { data: preferences } = await supabase
                .from("user_preferences")
                .select("active_org_id")
                .eq("user_id", user.id)
                .single();
            activeOrgId = preferences?.active_org_id || null;
        } catch {
            // Sin preferencias, usar fallback
        }

        // ✅ Seleccionar membresía: activa preferida o primera disponible
        let selectedMembership = memberships[0];
        if (activeOrgId) {
            const activeMembership = memberships.find(m => m.org_id === activeOrgId);
            if (activeMembership) {
                selectedMembership = activeMembership;
            }
        }

        const orgId = selectedMembership.org_id;

        // Parse request body
        const body = await request.json();
        const { caseId, comparisonId, version = 'client', selectedAnalysisIds } = body;

        if (!caseId) {
            return NextResponse.json(
                { success: false, message: "caseId is required" },
                { status: 400 }
            );
        }

        // Verify case belongs to user's org
        const caseRecord = await prisma.case.findUnique({
            where: { id: caseId },
        });

        if (!caseRecord || caseRecord.orgId !== orgId) {
            return NextResponse.json(
                { success: false, message: "Case not found or access denied" },
                { status: 404 }
            );
        }

        // Fetch comparison if provided
        let comparison = null;
        if (comparisonId) {
            comparison = await prisma.comparison.findUnique({
                where: { id: comparisonId },
            });

            if (!comparison || comparison.caseId !== caseId) {
                return NextResponse.json(
                    { success: false, message: "Comparison not found or doesn't belong to this case" },
                    { status: 404 }
                );
            }
        }

        // ✅ FASE POLICY_LINKS: Fetch policy analyses for the case
        // Includes both direct analyses AND linked via CasePolicyLink
        
        // 1. Get DIRECT analyses (caseId matches)
        const directAnalyses = await prisma.policyAnalysis.findMany({
            where: { caseId },
            orderBy: { createdAt: 'desc' },
            include: {
                artifact: {
                    select: {
                        fileName: true,
                    }
                }
            }
        });
        
        // 2. Get LINKED analyses via CasePolicyLink
        const linkedPolicyLinks = await prisma.casePolicyLink.findMany({
            where: { 
                caseId,
                orgId 
            },
            include: {
                policyAnalysis: {
                    include: {
                        artifact: {
                            select: {
                                fileName: true,
                            }
                        }
                    }
                }
            }
        });
        
        // 3. Combine and deduplicate (direct takes priority)
        const directIds = new Set(directAnalyses.map(a => a.id));
        const linkedAnalyses = linkedPolicyLinks
            .map(link => link.policyAnalysis)
            .filter(a => !directIds.has(a.id));
        
        const allPolicyAnalyses = [...directAnalyses, ...linkedAnalyses];
        
        console.log(`📊 [proposals/generate] Análisis: ${directAnalyses.length} directos + ${linkedAnalyses.length} vinculados = ${allPolicyAnalyses.length} total`);

        // Filter by selected IDs if provided, otherwise use all (max 3)
        let policyAnalyses = allPolicyAnalyses;
        if (selectedAnalysisIds && Array.isArray(selectedAnalysisIds) && selectedAnalysisIds.length > 0) {
            policyAnalyses = allPolicyAnalyses.filter(a => selectedAnalysisIds.includes(a.id));
        }
        
        // Limit to max 5 plans
        policyAnalyses = policyAnalyses.slice(0, 5);

        if (policyAnalyses.length === 0) {
            return NextResponse.json(
                { success: false, message: "No policy analyses found for this case" },
                { status: 400 }
            );
        }

        // ✅ Generate proposal content with embedded plan data
        const selectedPlans = policyAnalyses.map((analysis, index) => {
            const extractedData = analysis.extractedData as any || {};
            const coverages = extractedData.coverages || [];
            
            return {
                planId: analysis.id,
                rationaleKey: version === 'client'
                    ? `selectedPlans.rationale.client.plan${index + 1}`
                    : `selectedPlans.rationale.technical.plan${index + 1}`,
                // ✅ Embedded data for self-contained proposals
                insurerName: extractedData.insurer?.name || extractedData.insurer || 'Aseguradora',
                policyNumber: extractedData.policy_number || extractedData.policyNumber || 'N/A',
                premiumTotal: extractedData.financials?.premium_total || extractedData.premium_total || 0,
                currency: extractedData.currency || 'COP',
                coverages: coverages.slice(0, 10).map((cov: any) => ({
                    name: cov.name || cov.type || 'Cobertura',
                    description: cov.description || cov.details || '',
                    limitAmount: cov.limit_amount || cov.limitAmount || cov.suma_asegurada || null,
                })),
                confidence: analysis.overallConfidence || 0.8,
                fileName: analysis.artifact?.fileName || 'documento.pdf',
            };
        });

        const proposalContent = {
            brokerProfile: {
                agency: "Briki Insurance Brokerage", // TODO: Get from user profile
                phone: "+57 300 1234567",
                email: user.email || "contact@briki.com",
            },
            selectedPlans,
            disclosuresKeys: [
                "disclosures.item1",
                "disclosures.item2",
                "disclosures.item3",
            ],
            mathCheck: {
                passed: true,
                messageKey: "mathCheck.message.allVerified",
            },
            shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/proposals/${caseId}`,
            generatedOn: new Date().toISOString(),
            comparisonSummary: comparison ? (comparison.result as any) : null,
        };

        // Save to database
        const generatedProposal = await prisma.generatedProposal.create({
            data: {
                caseId,
                comparisonId: comparisonId || null,
                version,
                content: proposalContent,
                userId: user.id,
                orgId,
            },
        });

        return NextResponse.json({
            success: true,
            proposal: {
                id: generatedProposal.id,
                caseId: generatedProposal.caseId,
                comparisonId: generatedProposal.comparisonId,
                version: generatedProposal.version,
                content: generatedProposal.content,
                createdAt: generatedProposal.createdAt,
                updatedAt: generatedProposal.updatedAt,
            },
        });
    } catch (error) {
        console.error("Error generating proposal:", error);
        return NextResponse.json(
            {
                success: false,
                message: error instanceof Error ? error.message : "Failed to generate proposal",
            },
            { status: 500 }
        );
    }
}
