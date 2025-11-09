// /src/app/api/cases/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createCaseWithOrg } from '@/lib/database';
import { recordAuditLog } from '@/lib/audit';

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
    
    // ✅ CORRECCIÓN CRÍTICA: Validar y normalizar max_budget
    // DECIMAL(10,2) permite valores de -99,999,999.99 a 99,999,999.99
    let max_budget: number | null = null;
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
    
    // clientName es opcional - usar valor por defecto si no se proporciona
    const finalClientName = clientName || 'Cliente Nuevo';
    
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
    let newCase;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        newCase = await createCaseWithOrg(
          orgId,
          briefData || {},
          user.id,
          {
            clientName: finalClientName,  // Usar el valor final (con fallback)
            clientRef,
            businessType,
            employees,
            status,
            stage,
            priority,
            // Nuevos campos del Brief detallado
            insurance_category,
            max_budget,
            budget_currency,
            required_coverages,
            client_profile,
          }
        );
        break; // Éxito, salir del loop
      } catch (prismaError: any) {
        retryCount++;
        
        // ✅ CORRECCIÓN: Manejar errores específicos de Prisma
        if (prismaError.code === 'P1001' || prismaError.code === 'P2024') {
          if (retryCount < maxRetries) {
            console.warn(`⚠️ [API/cases/create] Error de conexión a BD (intento ${retryCount}/${maxRetries}), reintentando...`);
            
            // Intentar reconexión si es el primer intento
            if (retryCount === 1) {
              const { reconnectPrisma } = await import('@/lib/prisma');
              await reconnectPrisma(2); // 2 intentos de reconexión
            }
            
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
        console.log('📎 [API] Creating artifact:', tempUpload.fileName);
        await prisma.artifact.create({
          data: {
            caseId: newCase.id,
            sourceType: 'pdf',
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
