// src/app/api/cases/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { moveTempToPersistent } from '@/lib/storage/moveTempToPersistent';
import { findDuplicateArtifact } from '@/lib/storage/findDuplicateArtifact';

export async function PUT(request: NextRequest) {
    try {
        const { user, currentOrg } = await getCurrentOrg();
        const { caseId, tempUploads, linkedPolicyIds, linkedQuoteIds, ...updateData } = await request.json();

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
            analysis_reason: updateData.analysis_reason, // ✅ FASE CATEGORÍAS: Motivo del análisis
            max_budget: normalizedMaxBudget, // ✅ Validado y normalizado
            budget_currency: updateData.budget_currency,
            client_profile: updateData.client_profile || '',
            clientName: updateData.clientName,
            employees: updateData.employees,
            // ✅ CORRECCIÓN CRÍTICA: Preservar el status actual - NUNCA cambiar 'active' a 'draft'
            status: existingCase.status, // Preservar el status original
            briefData: { // También actualizamos el JSON por coherencia
                freeText: finalFreeText, // ✅ CORRECCIÓN: Usar finalFreeText que incluye notes como fallback
                employees: updateData.employees,
                categoryData: updateData.categoryData || {}, // ✅ FASE CATEGORÍAS: Datos dinámicos
            }
        };
        
        console.log('📝 [API /api/cases/update] Actualizando case con:', caseUpdatePayload);

        const updatedCase = await prisma.case.update({
            where: {
                id: caseId,
                orgId: currentOrg.id, // Medida de seguridad: solo actualizar si el caso pertenece a la org del usuario.
            },
            data: caseUpdatePayload,
            include: {
                artifacts: true, // ✅ CORRECCIÓN: Incluir artifacts para detección de nuevas pólizas en frontend
            },
        });

        // ✅ FASE 3: Procesar PDFs temporales y moverlos a rutas persistentes
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
                
                // ✅ FASE 3: Mover archivo temporal a ruta persistente
                console.log('🔄 [API/cases/update] Moviendo archivo temporal a persistente:', tempUpload.fileName);
                const moveResult = await moveTempToPersistent({
                    tempPath: tempUpload.storagePath,
                    orgId: currentOrg.id,
                    caseId: caseId,
                    fileName: tempUpload.fileName,
                    userId: user.id
                });
                
                if (!moveResult.success) {
                    console.error('❌ [API/cases/update] Error moviendo archivo temporal:', moveResult.error);
                    // ⚠️ FALLBACK: Mantener ruta temporal si falla el movimiento (compatibilidad)
                    console.warn('⚠️ [API/cases/update] Usando ruta temporal como fallback');
                }
                
                console.log(`📎 [API /api/cases/update] Creando artifact: ${tempUpload.fileName}`);
                
                // ✅ FASE 5: Verificar duplicados antes de crear artifact
                if (tempUpload.fileHash) {
                    // 1. Verificar duplicado local (mismo caso)
                    const localArtifacts = await prisma.artifact.findMany({
                        where: { caseId: caseId }
                    });
                    
                    const localDuplicate = localArtifacts.find((a: any) => 
                        a.provenance && typeof a.provenance === 'object' && 
                        (a.provenance as any).fileHash === tempUpload.fileHash
                    );
                    
                    if (localDuplicate) {
                        console.log('⚠️ [FASE 5] Archivo duplicado detectado en el mismo caso, saltando:', tempUpload.fileName);
                        continue; // Saltar este archivo, continuar con el siguiente
                    }
                    
                    // 2. Verificar duplicado global (otros casos)
                    console.log('🔍 [FASE 5] Verificando duplicado globalmente...');
                    const globalDuplicate = await findDuplicateArtifact(tempUpload.fileHash, caseId);
                    
                    if (globalDuplicate.exists && globalDuplicate.artifact) {
                        console.log('⚠️ [FASE 5] Archivo duplicado detectado globalmente:', {
                            existingArtifactId: globalDuplicate.artifact.id,
                            existingCaseId: globalDuplicate.artifact.caseId,
                            fileName: tempUpload.fileName
                        });
                        
                        // ✅ FASE 5: Reutilizar archivo existente
                        console.log('♻️ [FASE 5] Reutilizando archivo existente...');
                        
                        // Obtener artifact original completo para reutilizar contentText
                        const originalArtifact = await prisma.artifact.findUnique({
                            where: { id: globalDuplicate.artifact.id },
                            select: {
                                contentText: true,
                                contentType: true,
                                provenance: true
                            }
                        });
                        
                        if (originalArtifact && globalDuplicate.artifact.fileId) {
                            // Crear artifact reutilizando el archivo existente
                            await prisma.artifact.create({
                                data: {
                                    caseId: caseId,
                                    sourceType: 'pdf',
                                    fileId: globalDuplicate.artifact.fileId, // ✅ Reutilizar fileId existente
                                    fileName: tempUpload.fileName,
                                    contentType: originalArtifact.contentType || 'application/pdf',
                                    contentText: originalArtifact.contentText, // ✅ Reutilizar contentText
                                    provenance: {
                                        uploadedBy: user.id,
                                        uploadedAt: new Date().toISOString(),
                                        fileSize: tempUpload.fileSize,
                                        fileHash: tempUpload.fileHash,
                                        pageCount: tempUpload.pageCount,
                                        documentRole: tempUpload.documentRole || null, // ✅ FIX DEFECTO A: Persistir baseline/challenger
                                        reusedFrom: globalDuplicate.artifact.id, // ✅ Metadata: indica que es reutilizado
                                        originalFileName: globalDuplicate.artifact.fileName,
                                        originalCaseId: globalDuplicate.artifact.caseId,
                                        originalUploadedAt: globalDuplicate.artifact.createdAt.toISOString(),
                                    },
                                },
                            });
                            
                            console.log('✅ [FASE 5] Artifact creado reutilizando archivo existente');
                            continue; // Saltar movimiento de archivo, ya existe
                        }
                    }
                }
                
                // ✅ Limpiar bytes nulos de contentText para evitar errores de encoding UTF8
                const cleanedContentText = tempUpload.extractedText 
                    ? tempUpload.extractedText.replace(/\0/g, '') 
                    : null;
                
                // ✅ FASE 3: Crear artifact con ruta persistente (o temporal como fallback)
                await prisma.artifact.create({
                    data: {
                        caseId: caseId,
                        sourceType: 'pdf',
                        fileId: moveResult.persistentPath || tempUpload.storagePath, // ✅ Ruta persistente (fallback a temp si falla)
                        fileName: tempUpload.fileName,
                        contentType: 'application/pdf',
                        contentText: cleanedContentText,
                        provenance: {
                            uploadedBy: user.id,
                            uploadedAt: new Date().toISOString(),
                            fileSize: tempUpload.fileSize,
                            fileHash: tempUpload.fileHash,
                            pageCount: tempUpload.pageCount,
                            documentRole: tempUpload.documentRole || null, // ✅ FIX DEFECTO A: Persistir baseline/challenger
                            migratedToPersistent: moveResult.success, // ✅ Metadata: indica si se movió correctamente
                            migrationError: moveResult.error || null,
                        },
                    },
                });
                
                if (moveResult.success) {
                    console.log('✅ [API/cases/update] Archivo movido a ruta persistente:', moveResult.persistentPath);
                }
                console.log(`✅ [API /api/cases/update] Artifact creado exitosamente`);
            }
        }

        // ✅ CORRECCIÓN: Recargar caso con artifacts DESPUÉS de crearlos
        // updatedCase solo incluye artifacts que existían ANTES del update
        // Los nuevos artifacts se crearon después, así que recargamos
        const finalCase = await prisma.case.findUnique({
            where: { id: caseId },
            include: { artifacts: true },
        });

        // =========================================================================
        // ✅ FASE POLICY_LINKS: Vincular pólizas de organización al caso (EDIT MODE)
        // Solo crea enlaces para pólizas que no estén ya vinculadas
        // =========================================================================
        if (linkedPolicyIds && Array.isArray(linkedPolicyIds) && linkedPolicyIds.length > 0) {
            console.log(`🔗 [API/cases/update] Procesando ${linkedPolicyIds.length} pólizas de organización...`);
            
            // 1. Obtener enlaces existentes para este caso
            const existingLinks = await prisma.casePolicyLink.findMany({
                where: {
                    caseId: caseId,
                    orgId: currentOrg.id,
                },
                select: { policyAnalysisId: true },
            });
            const existingPolicyIds = new Set(existingLinks.map(l => l.policyAnalysisId));
            
            // 2. Filtrar solo los nuevos (que no estén ya vinculados)
            const newPolicyIds = linkedPolicyIds.filter((id: string) => !existingPolicyIds.has(id));
            
            if (newPolicyIds.length === 0) {
                console.log(`ℹ️ [API/cases/update] Todas las pólizas ya estaban vinculadas, nada que hacer`);
            } else {
                console.log(`🔗 [API/cases/update] Vinculando ${newPolicyIds.length} pólizas nuevas...`);
                
                // 3. Verificar que las pólizas existen y pertenecen a la organización
                const validPolicies = await prisma.policyAnalysis.findMany({
                    where: {
                        id: { in: newPolicyIds },
                        orgId: currentOrg.id,
                    },
                    select: { id: true },
                });
                
                const validIds = validPolicies.map(p => p.id);
                const invalidIds = newPolicyIds.filter((id: string) => !validIds.includes(id));
                
                if (invalidIds.length > 0) {
                    console.warn(`⚠️ [API/cases/update] ${invalidIds.length} pólizas no encontradas o no pertenecen a la org:`, invalidIds);
                }
                
                // 4. Crear enlaces para las pólizas válidas
                let linkedCount = 0;
                for (const policyAnalysisId of validIds) {
                    try {
                        await prisma.casePolicyLink.create({
                            data: {
                                caseId: caseId,
                                policyAnalysisId,
                                orgId: currentOrg.id,
                                linkedBy: user.id,
                                // contextualizedAt: null - por defecto, se actualiza cuando se contextualiza
                            },
                        });
                        linkedCount++;
                    } catch (linkError: any) {
                        // Ignorar errores de duplicados (constraint unique)
                        if (linkError.code !== 'P2002') {
                            console.error(`❌ [API/cases/update] Error vinculando póliza ${policyAnalysisId}:`, linkError);
                        }
                    }
                }
                
                console.log(`✅ [API/cases/update] Vinculadas ${linkedCount} pólizas de organización al caso`);
            }
        }

        // =========================================================================
        // ✅ FIX DEFECTO C: Vincular COTIZACIONES de organización al caso (EDIT MODE)
        // Espejo de linkedPolicyIds pero para CaseQuoteLink / QuoteAnalysis
        // =========================================================================
        if (linkedQuoteIds && Array.isArray(linkedQuoteIds) && linkedQuoteIds.length > 0) {
            console.log(`🔗 [API/cases/update] Procesando ${linkedQuoteIds.length} cotizaciones de organización...`);
            
            // 1. Obtener enlaces existentes para este caso
            const existingQuoteLinks = await prisma.caseQuoteLink.findMany({
                where: {
                    caseId: caseId,
                    orgId: currentOrg.id,
                },
                select: { quoteAnalysisId: true },
            });
            const existingQuoteIds = new Set(existingQuoteLinks.map(l => l.quoteAnalysisId));
            
            // 2. Filtrar solo los nuevos (que no estén ya vinculados)
            const newQuoteIds = linkedQuoteIds.filter((id: string) => !existingQuoteIds.has(id));
            
            if (newQuoteIds.length === 0) {
                console.log(`ℹ️ [API/cases/update] Todas las cotizaciones ya estaban vinculadas, nada que hacer`);
            } else {
                console.log(`🔗 [API/cases/update] Vinculando ${newQuoteIds.length} cotizaciones nuevas...`);
                
                // 3. Verificar que las cotizaciones existen y pertenecen a la organización
                const validQuotes = await prisma.quoteAnalysis.findMany({
                    where: {
                        id: { in: newQuoteIds },
                        orgId: currentOrg.id,
                    },
                    select: { id: true },
                });
                
                const validQuoteIdsList = validQuotes.map(q => q.id);
                const invalidQuoteIds = newQuoteIds.filter((id: string) => !validQuoteIdsList.includes(id));
                
                if (invalidQuoteIds.length > 0) {
                    console.warn(`⚠️ [API/cases/update] ${invalidQuoteIds.length} cotizaciones no encontradas o no pertenecen a la org:`, invalidQuoteIds);
                }
                
                // 4. Crear enlaces para las cotizaciones válidas
                let linkedQuoteCount = 0;
                for (const quoteAnalysisId of validQuoteIdsList) {
                    try {
                        await prisma.caseQuoteLink.create({
                            data: {
                                caseId: caseId,
                                quoteAnalysisId,
                                orgId: currentOrg.id,
                                linkedBy: user.id,
                            },
                        });
                        linkedQuoteCount++;
                    } catch (linkError: any) {
                        // Ignorar errores de duplicados (constraint unique)
                        if (linkError.code !== 'P2002') {
                            console.error(`❌ [API/cases/update] Error vinculando cotización ${quoteAnalysisId}:`, linkError);
                        }
                    }
                }
                
                console.log(`✅ [API/cases/update] Vinculadas ${linkedQuoteCount} cotizaciones de organización al caso`);
            }
        }

        return NextResponse.json({ success: true, case: finalCase });
    } catch (error: any) {
        console.error('ERROR [API/CASES/UPDATE]:', error);
        return NextResponse.json({ error: 'Failed to update case' }, { status: 500 });
    }
}
