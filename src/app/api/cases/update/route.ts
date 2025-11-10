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
        
        // ✅ CORRECCIÓN CRÍTICA: Obtener el caso actual para preservar el status
        // REGLA DE NEGOCIO: Un caso aprobado (status='active') NUNCA puede volverse 'draft'
        const existingCase = await prisma.case.findUnique({
            where: {
                id: caseId,
                orgId: currentOrg.id,
            },
            select: {
                status: true,
            },
        });
        
        if (!existingCase) {
            return NextResponse.json({ error: 'Case not found or access denied' }, { status: 404 });
        }
        
        // ✅ CORRECCIÓN CRÍTICA: Asegurar que freeText se incluya correctamente
        // Prioridad: updateData.freeText > updateData.notes > '' (nunca null)
        const finalFreeText = updateData.freeText || updateData.notes || '';
        console.log('📝 [API/cases/update] freeText final para actualización:', {
          freeText: updateData.freeText?.substring(0, 50) + '...',
          notes: updateData.notes?.substring(0, 50) + '...',
          finalFreeText: finalFreeText.substring(0, 50) + '...'
        });
        
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
            // ✅ CORRECCIÓN CRÍTICA: Preservar el status actual - NUNCA cambiar 'active' a 'draft'
            status: existingCase.status, // Preservar el status original
            briefData: { // También actualizamos el JSON por coherencia
                freeText: finalFreeText, // ✅ CORRECCIÓN: Usar finalFreeText que incluye notes como fallback
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
                // ✅ VALIDACIÓN EXPLÍCITA: Asegurar que storagePath sea válido
                if (!tempUpload.storagePath || tempUpload.storagePath.trim() === '' || 
                    tempUpload.storagePath.includes('null') || tempUpload.storagePath.includes('undefined')) {
                    console.error('❌ [API/cases/update] Invalid tempUpload.storagePath:', tempUpload);
                    return NextResponse.json(
                        { error: `Invalid storage path for file ${tempUpload.fileName}. Please re-upload the file.` },
                        { status: 400 }
                    );
                }
                
                console.log(`📎 [API /api/cases/update] Creando artifact: ${tempUpload.fileName}`);
                // ✅ Limpiar bytes nulos de contentText para evitar errores de encoding UTF8
                const cleanedContentText = tempUpload.extractedText 
                    ? tempUpload.extractedText.replace(/\0/g, '') 
                    : null;
                
                await prisma.artifact.create({
                    data: {
                        caseId: caseId,
                        sourceType: 'pdf', // ✅ CORRECCIÓN: Cambiar de 'upload' a 'pdf'
                        fileId: tempUpload.storagePath,
                        fileName: tempUpload.fileName,
                        contentType: 'application/pdf',
                        contentText: cleanedContentText,
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
