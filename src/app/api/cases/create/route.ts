// /src/app/api/cases/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createCaseWithOrg } from '@/lib/database';
import { recordAuditLog } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const {
      orgId,
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
      max_budget,
      budget_currency,
      required_coverages,
      client_profile,
    } = body;
    
    // Validaciones básicas
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    // clientName es opcional - usar valor por defecto si no se proporciona
    const finalClientName = clientName || 'Cliente Nuevo';
    
    // Validar que el caso tenga al menos insurance_category
    if (!insurance_category) {
      return NextResponse.json(
        { error: 'Insurance category is required' },
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
    
    // Crear el caso
    const newCase = await createCaseWithOrg(
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
