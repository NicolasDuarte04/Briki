// /src/app/api/cases/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createCaseWithOrg } from '@/lib/database';

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
    
    if (!clientName) {
      return NextResponse.json(
        { error: 'Client name is required' },
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
        clientName,
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
    
    // Procesar PDFs temporales si existen
    if (tempUploads && tempUploads.length > 0) {
      const { prisma } = await import('@/lib/prisma');
      
      for (const tempUpload of tempUploads) {
        await prisma.artifact.create({
          data: {
            caseId: newCase.id,
            sourceType: 'upload',
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
      }
    }
    
    return NextResponse.json(newCase, { status: 201 });
    
  } catch (error) {
    console.error('Error creating case:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
