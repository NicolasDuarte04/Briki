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
        // ✅ FASE 1: CORRECCIÓN CRÍTICA - Guardar TODOS los campos explícitamente
        // Usamos '?? null' o '?? []' para asegurar que si el frontend envía
        // 'undefined' (porque se limpió), la BD reciba 'null' (o '[]')
        // en lugar de que el campo se omita y retenga su valor anterior.
        
        // ✅ CORRECCIÓN CRÍTICA: Validar y normalizar max_budget
        // DECIMAL(10,2) permite valores de -99,999,999.99 a 99,999,999.99
        let normalizedMaxBudget: number | null = null;
        if (briefData.max_budget !== null && briefData.max_budget !== undefined) {
            const numValue = typeof briefData.max_budget === 'string' ? parseFloat(briefData.max_budget) : briefData.max_budget;
            if (!isNaN(numValue) && isFinite(numValue)) {
                const MAX_VALUE = 99999999.99;
                const MIN_VALUE = -99999999.99;
                const clampedValue = Math.max(MIN_VALUE, Math.min(MAX_VALUE, numValue));
                normalizedMaxBudget = Math.round(clampedValue * 100) / 100;
                
                if (numValue !== clampedValue) {
                    console.warn(`⚠️ [API/cases/approve] max_budget (${numValue}) ajustado a ${clampedValue} para cumplir con DECIMAL(10,2)`);
                }
            }
        }
        
        // ✅ FASE CLIENTE/EMPRESA: Determinar nombre del sujeto según tipo
        const isCompanyCase = briefData.subjectType === 'company';
        const resolvedClientName = isCompanyCase
            ? (briefData.companyName || briefData.clientName || null)
            : (briefData.clientName || null);

        const updateData: any = {
            // La acción principal: cambiar el estado y la etapa
            status: 'active',
            stage: 'sourcing',
            
            // ✅ FASE 1: Asignación explícita de TODOS los campos del brief
            // Campos de nivel superior (directos en la tabla cases)
            clientName: resolvedClientName, // ✅ Usa companyName cuando subjectType=company
            clientRef: briefData.selectedClientId ?? null,
            insurance_category: briefData.insurance_category ?? null,
            max_budget: normalizedMaxBudget, // ✅ Validado y normalizado
            budget_currency: briefData.budget_currency ?? 'COP',
            required_coverages: briefData.required_coverages ?? [],
            client_profile: briefData.client_profile ?? null,
            businessType: briefData.businessType ?? null,
            employees: briefData.employees ?? null,
            // ✅ FASE CLIENTE/EMPRESA: Persistir subjectType y companyId
            subjectType: briefData.subjectType ?? 'client',
            companyId: isCompanyCase ? (briefData.selectedCompanyId ?? null) : null,
            
            // Actualizar el briefData JSON también con todos los campos
            briefData: {
                ...briefData, // Incluir todos los campos del briefData
                // Forzar valores limpios si son nulos/undefined en el objeto principal
                clientName: resolvedClientName,
                selectedClientId: briefData.selectedClientId ?? null,
                insurance_category: briefData.insurance_category ?? null,
                max_budget: briefData.max_budget ?? null,
                employees: briefData.employees ?? null,
                businessType: briefData.businessType ?? null,
                client_profile: briefData.client_profile ?? null,
                required_coverages: briefData.required_coverages ?? [],
                budget_currency: briefData.budget_currency ?? 'COP',
                freeText: briefData.freeText ?? null,
                coverage: briefData.coverage ?? null,
            }
        };
        
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
