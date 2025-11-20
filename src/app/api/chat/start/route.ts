import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { tryRecordAuditLog } from '@/lib/audit';
import { moveTempToPersistent } from '@/lib/storage/moveTempToPersistent';
import { findDuplicateArtifact } from '@/lib/storage/findDuplicateArtifact';

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

    // ✅ VALIDACIÓN EXPLÍCITA: Asegurar que orgId nunca sea null
    if (!orgId || orgId === null) {
      console.error('❌ [API/chat/start] orgId is null after resolution');
      return NextResponse.json(
        { error: 'Organization ID is required and could not be resolved from user membership' },
        { status: 400 }
      );
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

    // ✅ FASE 3: Mover archivos temporales a rutas persistentes y registrar artifacts
    for (const t of tempUploads) {
      // ✅ VALIDACIÓN EXPLÍCITA: Asegurar que storagePath sea válido
      if (!t.storagePath || t.storagePath.trim() === '' || 
          t.storagePath.includes('null') || t.storagePath.includes('undefined')) {
        console.error('❌ [API/chat/start] Invalid tempUpload.storagePath:', t);
        return NextResponse.json(
          { error: `Invalid storage path for file ${t.fileName}. Please re-upload the file.` },
          { status: 400 }
        );
      }
      
      // ✅ FASE 3: Mover archivo temporal a ruta persistente
      console.log('🔄 [API/chat/start] Moviendo archivo temporal a persistente:', t.fileName);
      const moveResult = await moveTempToPersistent({
        tempPath: t.storagePath,
        orgId: orgId,
        caseId: newCase.id,
        fileName: t.fileName,
        userId: user.id
      });
      
      if (!moveResult.success) {
        console.error('❌ [API/chat/start] Error moviendo archivo temporal:', moveResult.error);
        // ⚠️ FALLBACK: Mantener ruta temporal si falla el movimiento (compatibilidad)
        // En producción, podrías decidir fallar o retry
        console.warn('⚠️ [API/chat/start] Usando ruta temporal como fallback');
      }
      
      // ✅ FASE 5: Verificar duplicados antes de crear artifact
      if (t.fileHash) {
        // 1. Verificar duplicado local (mismo caso)
        const localArtifacts = await prisma.artifact.findMany({
          where: { caseId: newCase.id }
        });
        
        const localDuplicate = localArtifacts.find((a: any) => 
          a.provenance && typeof a.provenance === 'object' && 
          (a.provenance as any).fileHash === t.fileHash
        );
        
        if (localDuplicate) {
          console.log('⚠️ [FASE 5] Archivo duplicado detectado en el mismo caso, saltando:', t.fileName);
          continue; // Saltar este archivo, continuar con el siguiente
        }
        
        // 2. Verificar duplicado global (otros casos)
        console.log('🔍 [FASE 5] Verificando duplicado globalmente...');
        const globalDuplicate = await findDuplicateArtifact(t.fileHash, newCase.id);
        
        if (globalDuplicate.exists && globalDuplicate.artifact) {
          console.log('⚠️ [FASE 5] Archivo duplicado detectado globalmente:', {
            existingArtifactId: globalDuplicate.artifact.id,
            existingCaseId: globalDuplicate.artifact.caseId,
            fileName: t.fileName
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
                caseId: newCase.id,
                sourceType: 'pdf',
                fileId: globalDuplicate.artifact.fileId, // ✅ Reutilizar fileId existente
                fileName: t.fileName,
                contentType: originalArtifact.contentType || 'application/pdf',
                contentText: originalArtifact.contentText, // ✅ Reutilizar contentText
                provenance: {
                  uploadedBy: user.id,
                  origin: 'landing_temp',
                  fileHash: t.fileHash,
                  fileSize: t.fileSize,
                  pageCount: t.pageCount || null,
                  charactersExtracted: t.charactersExtracted || 0,
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
      const cleanedContentText = t.extractedText 
        ? t.extractedText.replace(/\0/g, '') 
        : null;
      
      // ✅ FASE 3: Crear artifact con ruta persistente (o temporal como fallback)
      await prisma.artifact.create({
        data: {
          caseId: newCase.id,
          sourceType: 'pdf',
          fileId: moveResult.persistentPath || t.storagePath, // ✅ Ruta persistente (fallback a temp si falla)
          fileName: t.fileName,
          contentType: 'application/pdf',
          contentText: cleanedContentText,
          provenance: {
            uploadedBy: user.id,
            origin: 'landing_temp',
            fileHash: t.fileHash,
            fileSize: t.fileSize,
            pageCount: t.pageCount || null,
            charactersExtracted: t.charactersExtracted || 0,
            migratedToPersistent: moveResult.success, // ✅ Metadata: indica si se movió correctamente
            migrationError: moveResult.error || null,
          },
        },
      });
      
      if (moveResult.success) {
        console.log('✅ [API/chat/start] Archivo movido a ruta persistente:', moveResult.persistentPath);
      }
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


