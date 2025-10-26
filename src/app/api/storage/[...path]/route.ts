import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filePath = resolvedParams.path.join('/');
    
    console.log('📎 [API /api/storage] Generating signed URL for:', filePath);
    
    const supabase = await createServerSupabase();
    
    // Generar URL firmada (válida por 1 hora)
    const { data, error } = await supabase.storage
      .from('artifacts')
      .createSignedUrl(filePath, 3600);
    
    if (error) {
      console.error('❌ [API /api/storage] Error generating signed URL:', error);
      return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 });
    }
    
    console.log('✅ [API /api/storage] Signed URL generated successfully');
    
    // Redirigir a la URL firmada
    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    console.error('❌ [API /api/storage] Error in storage route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

