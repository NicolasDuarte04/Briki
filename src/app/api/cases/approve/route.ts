// src/app/api/cases/approve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

export async function PUT(request: NextRequest) {
    try {
        const { user, currentOrg } = await getCurrentOrg();
        const { caseId, briefData } = await request.json();

        if (!caseId || !briefData) {
            return NextResponse.json({ error: 'Case ID and brief data are required' }, { status: 400 });
        }

        // 1. Validar que el caso exista y esté en estado 'draft' antes de actualizar.
        const existingCase = await prisma.case.findFirst({
            where: { id: caseId, orgId: currentOrg.id },
            select: { status: true }
        });

        if (!existingCase) {
            return NextResponse.json({ error: 'Case not found or access denied.' }, { status: 404 });
        }

        if (existingCase.status !== 'draft') {
            // Previene re-aprobar un caso que ya está activo.
            return NextResponse.json({ error: 'Case is not in draft status.' }, { status: 409 }); // 409 Conflict
        }

        // 2. Ejecutar la actualización atómica: guardar datos Y cambiar estado.
        const updateData: any = {
            // Actualizar campos básicos del brief (con valores por defecto si no están presentes)
            businessType: briefData.businessType || 'Por definir',
            employees: briefData.employees || 0,
            briefData: briefData, // Actualizar el campo JSON también

            // La acción principal: cambiar el estado y la etapa
            status: 'active',
            stage: 'sourcing',
        };

        // Actualizar campos opcionales solo si están presentes
        if (briefData.clientName) updateData.clientName = briefData.clientName;
        if (briefData.selectedClientId) updateData.clientRef = briefData.selectedClientId; // CORRECCIÓN: client_id → clientRef
        if (briefData.insurance_category) updateData.insurance_category = briefData.insurance_category;
        if (briefData.max_budget) updateData.max_budget = briefData.max_budget;
        if (briefData.budget_currency) updateData.budget_currency = briefData.budget_currency;
        if (briefData.required_coverages) updateData.required_coverages = briefData.required_coverages;
        if (briefData.client_profile) updateData.client_profile = briefData.client_profile;
        
        console.log('🔧 Updating case with data:', updateData);

        const updatedCase = await prisma.case.update({
            where: {
                id: caseId,
            },
            data: updateData,
        });

        return NextResponse.json({ success: true, case: updatedCase });
    } catch (error: any) {
        console.error('ERROR [API/CASES/APPROVE]:', error);
        
        // Manejo de errores de Prisma más específico
        if (error.code === 'P2025') { // "Record to update not found."
            return NextResponse.json({ error: 'Case not found or access denied.' }, { status: 404 });
        }
        if (error.code === 'P2002') { // "Unique constraint failed."
            return NextResponse.json({ error: 'Case already exists with this data.' }, { status: 409 });
        }
        if (error.code === 'P2003') { // "Foreign key constraint failed."
            return NextResponse.json({ error: 'Invalid client reference.' }, { status: 400 });
        }
        
        return NextResponse.json({ error: 'Failed to approve case' }, { status: 500 });
    }
}
