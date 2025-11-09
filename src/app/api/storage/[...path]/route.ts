import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Obtener el path del parámetro de ruta (Next.js 15+ requiere await)
    const { path } = await params;
    const filePath = path.join('/');
    
    console.log('📎 [API /api/storage] Generating signed URL for:', filePath);
    
    // ✅ FASE 3: Validar acceso por organización
    const { currentOrg } = await getCurrentOrg();
    
    // Verificar formato de path: artifacts/{org_id}/...
    const pathParts = filePath.split('/');
    if (pathParts.length >= 2 && pathParts[0] === 'artifacts') {
      const pathOrgId = pathParts[1];
      
      // Validar que el path pertenece a la organización del usuario
      if (pathOrgId !== currentOrg.id) {
        console.error('❌ [API /api/storage] Access denied: path org_id does not match user org');
        return NextResponse.json(
          { error: 'Access denied to file' },
          { status: 403 }
        );
      }
    }
    
    const supabase = await createServerSupabase();
    
    // Generar URL firmada (válida por 1 hora)
    const { data, error } = await supabase.storage
      .from('artifacts')
      .createSignedUrl(filePath, 3600);
    
    if (error) {
      console.error('❌ [API /api/storage] Error generating signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate URL' },
        { status: 500 }
      );
    }
    
    console.log('✅ [API /api/storage] Signed URL generated successfully');
    
    // Redirigir a la URL firmada
    return NextResponse.redirect(data.signedUrl);
  } catch (error: any) {
    console.error('❌ [API /api/storage] Error in storage route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

