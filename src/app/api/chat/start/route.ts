import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { tryRecordAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

/**
 * POST /api/chat/start
 * Body: { message: string, tempUploads?: Array<{ storagePath: string; fileName: string; fileSize: number; pageCount?: number; charactersExtracted?: number; fileHash?: string }>, orgId?: string }
 * Crea un Case asociado al usuario y org activa (o primera), mueve los tempUploads a artifacts del case.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    
    // ✅ CORRECCIÓN CRÍTICA: Intentar autenticación con cookies primero, luego con header
    let user;
    
    // Método 1: Autenticación con cookies (método estándar)
    const { data: { user: cookieUser } } = await supabase.auth.getUser();
    user = cookieUser;
    
    // Método 2: Si no hay usuario con cookies, intentar con header Authorization
    if (!user) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: { user: tokenUser } } = await supabase.auth.getUser(token);
        user = tokenUser;
      }
    }
    
    if (!user) {
      console.error('❌ No user found with cookies or token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.id);

    const body = await req.json();
    const message = (body?.message || '').toString();
    const tempUploads = Array.isArray(body?.tempUploads) ? body.tempUploads : [];
    const orgIdFromBody = body?.orgId as string | undefined;

    // Obtener org activa (de membership) si no viene orgId
    let orgId = orgIdFromBody;
    if (!orgId) {
      const { data: memberships, error } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1);
      if (error || !memberships || memberships.length === 0) {
        return NextResponse.json({ error: 'No organization found for user' }, { status: 400 });
      }
      orgId = memberships[0]?.org_id as string;
    }

    // Crear Case
    const newCase = await prisma.case.create({
      data: {
        orgId,
        status: 'draft',
        stage: 'initial',
        clientName: null,
        briefData: message ? { freeText: message } : {},
      },
    });

    // Mover/registrar artifacts desde temp
    for (const t of tempUploads) {
      await prisma.artifact.create({
        data: {
          caseId: newCase.id,
          sourceType: 'pdf',
          fileId: t.storagePath, // mantenemos la ruta; si luego quieres mover, podemos copiar en Storage
          fileName: t.fileName,
          contentType: 'application/pdf',
          contentText: t.extractedText || null,  // ← MODIFICADO: Usar texto extraído
          provenance: {
            uploadedBy: user.id,
            origin: 'landing_temp',
            fileHash: t.fileHash,
            fileSize: t.fileSize,
            pageCount: t.pageCount || null,
            charactersExtracted: t.charactersExtracted || 0,
          },
        },
      });
    }

    await tryRecordAuditLog({
      caseId: newCase.id,
      actor: user.id,
      action: 'chat_started',
      tool: 'chat_start_api',
      payload: { messageLength: message.length, tempUploadsCount: tempUploads.length },
    });

    return NextResponse.json({ success: true, caseId: newCase.id }, { status: 201 });
  } catch (err) {
    console.error('chat/start error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


