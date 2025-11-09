// src/app/api/cases/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

export async function PUT(request: NextRequest) {
    try {
        const { user, currentOrg } = await getCurrentOrg();
        const { caseId, tempUploads, ...updateData } = await request.json();

        if (!caseId) {
            return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
        }

        // ✅ CORRECCIÓN CRÍTICA: Validar y normalizar max_budget
        // DECIMAL(10,2) permite valores de -99,999,999.99 a 99,999,999.99
        let normalizedMaxBudget: number | null = null;
        if (updateData.max_budget !== null && updateData.max_budget !== undefined) {
            const numValue = typeof updateData.max_budget === 'string' ? parseFloat(updateData.max_budget) : updateData.max_budget;
            if (!isNaN(numValue) && isFinite(numValue)) {
                const MAX_VALUE = 99999999.99;
                const MIN_VALUE = -99999999.99;
                const clampedValue = Math.max(MIN_VALUE, Math.min(MAX_VALUE, numValue));
                normalizedMaxBudget = Math.round(clampedValue * 100) / 100;
                
                if (numValue !== clampedValue) {
                    console.warn(`⚠️ [API/cases/update] max_budget (${numValue}) ajustado a ${clampedValue} para cumplir con DECIMAL(10,2)`);
                }
            }
        }
        
        // Mapea los datos del formulario a los campos de la base de datos.
        const caseUpdatePayload: any = {
            insurance_category: updateData.insurance_category,
            max_budget: normalizedMaxBudget, // ✅ Validado y normalizado
            budget_currency: updateData.budget_currency,
            required_coverages: updateData.required_coverages || [],
            client_profile: updateData.client_profile || '',
            clientName: updateData.clientName,
            businessType: updateData.businessType,
            employees: updateData.employees,
            briefData: { // También actualizamos el JSON por coherencia
                freeText: updateData.freeText || updateData.notes || '',
                businessType: updateData.businessType,
                employees: updateData.employees,
                coverage: updateData.coverage || '',
            }
        };
        
        console.log('📝 [API /api/cases/update] Actualizando case con:', caseUpdatePayload);

        const updatedCase = await prisma.case.update({
            where: {
                id: caseId,
                orgId: currentOrg.id, // Medida de seguridad: solo actualizar si el caso pertenece a la org del usuario.
            },
            data: caseUpdatePayload,
        });

        // Procesar PDFs temporales si existen
        console.log(`📎 [API /api/cases/update] Procesando ${tempUploads?.length || 0} tempUploads para caseId: ${caseId}`);
        if (tempUploads && tempUploads.length > 0) {
            for (const tempUpload of tempUploads) {
                console.log(`📎 [API /api/cases/update] Creando artifact: ${tempUpload.fileName}`);
                await prisma.artifact.create({
                    data: {
                        caseId: caseId,
                        sourceType: 'pdf', // ✅ CORRECCIÓN: Cambiar de 'upload' a 'pdf'
                        fileId: tempUpload.storagePath,
                        fileName: tempUpload.fileName,
                        contentType: 'application/pdf',
                        contentText: tempUpload.extractedText || null,
                        provenance: {
                            uploadedBy: user.id,
                            uploadedAt: new Date().toISOString(),
                            fileSize: tempUpload.fileSize,
                            fileHash: tempUpload.fileHash,
                            pageCount: tempUpload.pageCount,
                        },
                    },
                });
                console.log(`✅ [API /api/cases/update] Artifact creado exitosamente`);
            }
        }

        return NextResponse.json({ success: true, case: updatedCase });
    } catch (error: any) {
        console.error('ERROR [API/CASES/UPDATE]:', error);
        return NextResponse.json({ error: 'Failed to update case' }, { status: 500 });
    }
}
