// /src/app/api/cases/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createCaseWithOrg } from '@/lib/database';
import { recordAuditLog } from '@/lib/audit';
import { moveTempToPersistent } from '@/lib/storage/moveTempToPersistent';
import { findDuplicateArtifact } from '@/lib/storage/findDuplicateArtifact';
import { generateCaseName } from '@/lib/case-name-generator'; // ✅ NUEVO: Generador de nombres
import type { Case } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API/cases/create] Received POST request');
    
    // ✅ CORRECCIÓN: Usar createServerSupabase que lee cookies automáticamente
    const supabase = await createServerSupabase();
    
    // Verificar cookies disponibles
    const cookieStore = await import('next/headers').then(m => m.cookies());
    const allCookies = cookieStore.getAll();
    console.log('🍪 [API] Available cookies:', allCookies.map(c => c.name).join(', '));
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ [API] Error getting user:', authError.message);
      return NextResponse.json(
        { error: `Authentication error: ${authError.message}` },
        { status: 401 }
      );
    }
    
    if (!user) {
      console.error('❌ [API] No user found in session');
      return NextResponse.json(
        { error: 'Unauthorized - No user session found' },
        { status: 401 }
      );
    }
    
    console.log('✅ [API] User authenticated:', user.id);
    
    const body = await request.json();
    const {
      orgId: providedOrgId, // orgId puede venir del frontend
      userId,
      clientName,
      clientRef,
      selectedClientId, // ✅ NUEVO: ID del cliente seleccionado (para generar nombre)
      businessType,
      employees,
      status,
      stage,
      priority,
      briefData,
      tempUploads = [], // PDFs temporales del formulario
      // Nuevos campos del Brief detallado
      insurance_category,
      max_budget: rawMaxBudget, // ✅ Validar antes de usar
      budget_currency,
      required_coverages,
      client_profile,
    } = body;
    
    // ✅ CORRECCIÓN CRÍTICA: Asegurar que briefData.freeText esté presente
    // Prioridad: briefData.freeText > briefData.notes > '' (nunca null)
    const finalBriefData = briefData || {};
    if (!finalBriefData.freeText || finalBriefData.freeText.trim() === '') {
      // Si no hay freeText en briefData, intentar obtenerlo de briefData.notes como fallback
      finalBriefData.freeText = finalBriefData.notes || '';
      console.log('📝 [API/cases/create] freeText no encontrado en briefData, usando notes como fallback:', finalBriefData.freeText?.substring(0, 50) + '...');
    }
    console.log('📝 [API/cases/create] briefData final para creación:', {
      freeText: finalBriefData.freeText?.substring(0, 50) + '...',
      notes: finalBriefData.notes?.substring(0, 50) + '...',
      hasFreeText: !!finalBriefData.freeText
    });
    
    // ✅ CORRECCIÓN CRÍTICA: Validar y normalizar max_budget
    // DECIMAL(10,2) permite valores de -99,999,999.99 a 99,999,999.99
    // Usar undefined para compatibilidad con exactOptionalPropertyTypes y firma de createCaseWithOrg
    let max_budget: number | undefined = undefined;
    if (rawMaxBudget !== null && rawMaxBudget !== undefined) {
      const numValue = typeof rawMaxBudget === 'string' ? parseFloat(rawMaxBudget) : rawMaxBudget;
      if (!isNaN(numValue) && isFinite(numValue)) {
        const MAX_VALUE = 99999999.99;
        const MIN_VALUE = -99999999.99;
        // Limitar al rango permitido
        const clampedValue = Math.max(MIN_VALUE, Math.min(MAX_VALUE, numValue));
        // Redondear a 2 decimales
        max_budget = Math.round(clampedValue * 100) / 100;
        
        if (numValue !== clampedValue) {
          console.warn(`⚠️ [API/cases/create] max_budget (${numValue}) ajustado a ${clampedValue} para cumplir con DECIMAL(10,2)`);
        }
      }
    }
    
    // ✅ CORRECCIÓN FASE 1: Obtener orgId del usuario si no se proporciona
    let orgId = providedOrgId;
    
    if (!orgId) {
      // Obtener orgId del usuario desde la BD
      const { prisma } = await import('@/lib/prisma');
      const member = await prisma.org_members.findFirst({
        where: { user_id: user.id },
        select: { org_id: true }
      });
      
      if (!member) {
        return NextResponse.json(
          { error: 'User is not a member of any organization' },
          { status: 403 }
        );
      }
      
      orgId = member.org_id;
      console.log('✅ [API] Resolved orgId from user membership:', orgId);
    }
    
    // ✅ VALIDACIÓN EXPLÍCITA: Asegurar que orgId nunca sea null
    if (!orgId || orgId === null) {
      console.error('❌ [API/cases/create] orgId is null or undefined after resolution');
      return NextResponse.json(
        { error: 'Organization ID is required and could not be resolved from user membership' },
        { status: 400 }
      );
    }
    
    // clientName es opcional - usar valor por defecto si no se proporciona
    const finalClientName = clientName || 'Cliente Nuevo';
    
    // ✅ NUEVO: Generar nombre automático del caso
    let generatedCaseName: string;
    try {
      generatedCaseName = await generateCaseName(
        selectedClientId || null, 
        orgId, 
        finalClientName
      );
      console.log('✅ [API/cases/create] Nombre de caso generado:', generatedCaseName);
    } catch (nameError) {
      console.warn('⚠️ [API/cases/create] Error generando nombre, usando fallback:', nameError);
      generatedCaseName = `Caso de ${finalClientName}`;
    }
    
    // ✅ FASE 1: Validar insurance_category solo si NO es draft
    // Los casos en modo "draft" pueden no tener insurance_category todavía
    if (status !== 'draft' && !insurance_category) {
      return NextResponse.json(
        { error: 'Insurance category is required for active cases' },
        { status: 400 }
      );
    }
    
    // Verificar que el usuario pertenece a la organización
    const { data: membership } = await supabase
      .from('org_members')
      .select('*')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single();
    
    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of this organization' },
        { status: 403 }
      );
    }
    
    // ✅ CORRECCIÓN: Crear el caso con manejo robusto de reconexión de Prisma
    let newCase: Case | undefined;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // ✅ CORRECCIÓN: Construir objeto additionalData de forma condicional
        // para cumplir con exactOptionalPropertyTypes: solo incluir propiedades con valor
        const additionalData: {
          clientName?: string;
          clientId?: string;     // ✅ NUEVO
          caseName?: string;     // ✅ NUEVO
          clientRef?: string;
          businessType?: string;
          employees?: number;
          status?: 'draft' | 'active' | 'completed' | 'archived';
          stage?: 'initial' | 'sourcing' | 'analysis' | 'proposal' | 'negotiation' | 'closed';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          insurance_category?: string;
          max_budget?: number;
          budget_currency?: 'COP' | 'USD';
          required_coverages?: string[];
          client_profile?: string;
        } = {};
        
        // Solo agregar propiedades si tienen valor (no undefined)
        if (finalClientName !== undefined) additionalData.clientName = finalClientName;
        if (selectedClientId !== undefined) additionalData.clientId = selectedClientId; // ✅ NUEVO
        if (generatedCaseName !== undefined) additionalData.caseName = generatedCaseName; // ✅ NUEVO
        if (clientRef !== undefined) additionalData.clientRef = clientRef;
        if (businessType !== undefined) additionalData.businessType = businessType;
        if (employees !== undefined) additionalData.employees = employees;
        if (status !== undefined) additionalData.status = status;
        if (stage !== undefined) additionalData.stage = stage;
        if (priority !== undefined) additionalData.priority = priority;
        if (insurance_category !== undefined) additionalData.insurance_category = insurance_category;
        if (max_budget !== undefined) additionalData.max_budget = max_budget;
        if (budget_currency !== undefined) additionalData.budget_currency = budget_currency;
        if (required_coverages !== undefined) additionalData.required_coverages = required_coverages;
        if (client_profile !== undefined) additionalData.client_profile = client_profile;
        
        newCase = await createCaseWithOrg(
          orgId,
          finalBriefData, // ✅ CORRECCIÓN: Usar finalBriefData que incluye freeText garantizado
          user.id,
          additionalData
        );
        break; // Éxito, salir del loop
      } catch (prismaError: any) {
        retryCount++;
        
        // ✅ CORRECCIÓN: Manejar errores específicos de Prisma
        if (prismaError.code === 'P1001' || prismaError.code === 'P2024') {
          if (retryCount < maxRetries) {
            console.warn(`⚠️ [API/cases/create] Error de conexión a BD (intento ${retryCount}/${maxRetries}), reintentando...`);
            
            // Prisma maneja la reconexión automáticamente con el pool
            // Solo esperamos antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
            continue;
          } else {
            console.error('❌ [API/cases/create] Error de conexión a BD después de todos los reintentos');
            return NextResponse.json(
              { error: 'No se pudo conectar con la base de datos. Por favor, intenta de nuevo en unos segundos.' },
              { status: 503 }
            );
          }
        }
        
        // Si no es un error de conexión, lanzar inmediatamente
        throw prismaError;
      }
    }
    
    // ✅ CORRECCIÓN: Validación explícita después del loop
    // Si llegamos aquí sin que newCase esté asignado, significa que hubo un error
    if (!newCase) {
      console.error('❌ [API/cases/create] Failed to create case after all retries');
      return NextResponse.json(
        { error: 'Failed to create case after multiple attempts. Please try again.' },
        { status: 500 }
      );
    }
    // ✅ Ahora TypeScript sabe que newCase es definitivamente Case, no undefined
    
    // Registrar auditoría explícita (alta prioridad - compliance y trazabilidad)
    try {
      await recordAuditLog({
        caseId: newCase.id,
        actor: user.email || user.id,
        action: 'created_case',
        tool: 'cases_api',
        payload: {
          clientName,
          status: newCase.status,
          stage: newCase.stage,
          priority: newCase.priority,
        }
      });
    } catch (auditError) {
      console.error("Error recording audit log:", auditError);
      // No fallar la solicitud principal si solo falla la auditoría,
      // pero sí registrarlo en el servidor.
    }
    
    // Procesar PDFs temporales si existen
    console.log('📎 [API] Processing tempUploads:', tempUploads?.length || 0);
    if (tempUploads && tempUploads.length > 0) {
      const { prisma } = await import('@/lib/prisma');
      console.log('📎 [API] Creating artifacts for caseId:', newCase.id);
      
      for (const tempUpload of tempUploads) {
        // ✅ VALIDACIÓN EXPLÍCITA: Asegurar que storagePath sea válido
        if (!tempUpload.storagePath || tempUpload.storagePath.trim() === '' || 
            tempUpload.storagePath.includes('null') || tempUpload.storagePath.includes('undefined')) {
          console.error('❌ [API/cases/create] Invalid tempUpload.storagePath:', tempUpload);
          return NextResponse.json(
            { error: `Invalid storage path for file ${tempUpload.fileName}. Please re-upload the file.` },
            { status: 400 }
          );
        }
        
        // ✅ FASE 3: Mover archivo temporal a ruta persistente
        console.log('🔄 [API/cases/create] Moviendo archivo temporal a persistente:', tempUpload.fileName);
        const moveResult = await moveTempToPersistent({
          tempPath: tempUpload.storagePath,
          orgId: orgId,
          caseId: newCase.id,
          fileName: tempUpload.fileName,
          userId: user.id
        });
        
        if (!moveResult.success) {
          console.error('❌ [API/cases/create] Error moviendo archivo temporal:', moveResult.error);
          // ⚠️ FALLBACK: Mantener ruta temporal si falla el movimiento (compatibilidad)
          console.warn('⚠️ [API/cases/create] Usando ruta temporal como fallback');
        }
        
        console.log('📎 [API] Creating artifact:', tempUpload.fileName);
        
        // ✅ FASE 5: Verificar duplicados antes de crear artifact
        if (tempUpload.fileHash) {
          // 1. Verificar duplicado local (mismo caso)
          const localArtifacts = await prisma.artifact.findMany({
            where: { caseId: newCase.id }
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
          const globalDuplicate = await findDuplicateArtifact(tempUpload.fileHash, newCase.id);
          
          if (globalDuplicate.exists && globalDuplicate.artifact) {
            console.log('⚠️ [FASE 5] Archivo duplicado detectado globalmente:', {
              existingArtifactId: globalDuplicate.artifact.id,
              existingCaseId: globalDuplicate.artifact.caseId,
              fileName: tempUpload.fileName
            });
            
            // ✅ FASE 5: Reutilizar archivo existente (crear artifact nuevo apuntando al mismo fileId)
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
                  caseId: newCase.id,
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
            caseId: newCase.id,
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
              migratedToPersistent: moveResult.success, // ✅ Metadata: indica si se movió correctamente
              migrationError: moveResult.error || null,
            },
          },
        });
        
        if (moveResult.success) {
          console.log('✅ [API/cases/create] Archivo movido a ruta persistente:', moveResult.persistentPath);
        }
        console.log('✅ [API] Artifact created successfully');
      }
    }
    
    return NextResponse.json({
      success: true,
      caseId: newCase.id,
      case: newCase
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
