// /src/app/api/upload/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import PDFParser from 'pdf2json';
import { tryRecordAuditLog } from '@/lib/audit';
import crypto from 'crypto';
import { findDuplicateArtifact } from '@/lib/storage/findDuplicateArtifact';

// Force Node.js runtime (required for Buffer and pdf2json)
export const runtime = 'nodejs';

/**
 * Extrae texto de un PDF usando pdf2json
 */
async function extractTextFromPDF(buffer: Buffer): Promise<{text: string, pages: number}> {
  return new Promise((resolve, reject) => {
    const pdfParser = new (PDFParser as any)(null, true);
    
    pdfParser.on('pdfParser_dataError', (errData: any) => {
      reject(new Error('Failed to parse PDF'));
    });
    
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      let fullText = '';
      pdfData.Pages.forEach((page: any) => {
        page.Texts.forEach((textBlock: any) => {
          textBlock.R.forEach((run: any) => {
            const decodedText = decodeURIComponent(run.T);
            fullText += decodedText + ' ';
          });
        });
        fullText += '\n';
      });
      
      resolve({
        text: fullText.trim(),
        pages: pdfData.Meta.Pages
      });
    });
    
    pdfParser.parseBuffer(buffer);
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('📄 Upload PDF: Iniciando...');
    
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Extraer FormData
    const formData = await request.formData();
    const file = (formData.get('file') as File) || (formData.get('pdf') as File);
    const caseId = formData.get('caseId') as string | null;
    const orgId = formData.get('orgId') as string | null;
    
    // Validaciones
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // MODO TEMPORAL: Si no hay caseId/orgId, subimos a una ruta temporal y devolvemos un identificador
    if (!caseId || !orgId) {
      // Convertir archivo a buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Calcular hash del archivo (para deduplicación y tracking)
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
      console.log('🔐 Hash calculado (temp):', fileHash.substring(0, 16) + '...');

      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `temp/${user.id}/${timestamp}_${sanitizedFileName}`;

      console.log('☁️ Subiendo TEMP a Storage:', storagePath);
      // ✅ FASE 4 CORREGIDA: Incluir metadata incluso para archivos temporales con conversión explícita
      // CRÍTICO: Todos los valores de metadata deben ser strings explícitos
      // Nota: org_id no se incluye en modo temporal (no está disponible), pero user_id sí
      const { error: uploadError } = await supabase.storage
        .from('artifacts')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            uploaded_by: String(user.id), // ✅ CRÍTICO: Conversión explícita a string
            file_name: String(file.name), // ✅ Ya es string, pero explícito para consistencia
            content_type: String(file.type), // ✅ Ya es string, pero explícito para consistencia
            uploaded_at: new Date().toISOString(), // ✅ Ya es string (ISO format)
            is_temporary: 'true', // ✅ Ya es string literal
          }
        });

      if (uploadError) {
        console.error('❌ Error subiendo a Storage (temp):', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload file to storage: ' + uploadError.message },
          { status: 500 }
        );
      }

      // Intentar extraer texto (opcional en temp)
      let pdfText = '';
      let pageCount = 0;
      try {
        const extracted = await extractTextFromPDF(buffer);
        pdfText = extracted.text;
        pageCount = extracted.pages;
      } catch (e) {
        console.warn('⚠️ Extracción opcional fallida (temp), continuando...');
      }

      // Generar un identificador temporal (no persistente en DB)
      const tempId = crypto.createHash('sha256').update(storagePath + ':' + Date.now().toString()).digest('hex');

      return NextResponse.json({
        success: true,
        mode: 'temp',
        tempUpload: {
          id: tempId,
          storagePath,
          fileName: file.name,
          fileSize: file.size,
          pageCount,
          charactersExtracted: pdfText.length,
          fileHash,
          uploadedBy: user.id,
          extractedText: pdfText,  // ← AÑADIDO: Texto completo del PDF
        }
      }, { status: 201 });
    }
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }
    
    console.log('📄 Archivo:', file.name, 'Tamaño:', file.size);
    
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
    
    // Verificar que el caso existe y pertenece a la organización
    const caseExists = await prisma.case.findFirst({
      where: {
        id: caseId,
        orgId: orgId
      }
    });
    
    if (!caseExists) {
      return NextResponse.json(
        { error: 'Case not found or does not belong to this organization' },
        { status: 404 }
      );
    }
    
    // Convertir archivo a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Calcular hash del archivo (para deduplicación)
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    console.log('🔐 Hash calculado:', fileHash.substring(0, 16) + '...');
    
    // ✅ FASE 5: Verificación de duplicados (local primero, luego global)
    // 1. Verificar duplicado en el mismo caso (comportamiento actual - fallback)
    const localArtifacts = await prisma.artifact.findMany({
      where: {
        caseId: caseId
      }
    });
    
    const localDuplicate = localArtifacts.find((a: any) => 
      a.provenance && typeof a.provenance === 'object' && 
      (a.provenance as any).fileHash === fileHash
    );
    
    if (localDuplicate) {
      console.log('⚠️ [FASE 5] Archivo duplicado detectado en el mismo caso');
      return NextResponse.json(
        { 
          error: 'This file has already been uploaded to this case',
          existingArtifactId: localDuplicate.id,
          duplicateType: 'local'
        },
        { status: 409 }
      );
    }
    
    // 2. ✅ FASE 5: Verificar duplicado globalmente (en otros casos)
    console.log('🔍 [FASE 5] Verificando duplicado globalmente...');
    const globalDuplicate = await findDuplicateArtifact(fileHash, caseId);
    
    if (globalDuplicate.exists && globalDuplicate.artifact) {
      console.log('⚠️ [FASE 5] Archivo duplicado detectado globalmente:', {
        existingArtifactId: globalDuplicate.artifact.id,
        existingCaseId: globalDuplicate.artifact.caseId,
        existingFileName: globalDuplicate.artifact.fileName
      });
      
      // ✅ FASE 5: Comportamiento configurable
      // Por defecto: Rechazar upload (comportamiento seguro)
      // Opción futura: Reutilizar archivo existente (crear artifact nuevo apuntando al mismo fileId)
      const reuseExisting = formData.get('reuseExisting') === 'true'; // Opción desde frontend
      
      if (reuseExisting) {
        // ✅ OPCIÓN: Reutilizar archivo existente
        // Crear nuevo artifact apuntando al mismo fileId del artifact existente
        console.log('♻️ [FASE 5] Reutilizando archivo existente...');
        
        // Obtener artifact original completo para reutilizar contentText y otros datos
        const originalArtifact = await prisma.artifact.findUnique({
          where: { id: globalDuplicate.artifact.id },
          select: {
            contentText: true,
            contentType: true,
            provenance: true
          }
        });
        
        if (!originalArtifact || !globalDuplicate.artifact.fileId) {
          console.warn('⚠️ [FASE 5] Artifact original no encontrado o sin fileId, subiendo nuevo...');
          // Continuar con upload normal
        } else {
          // ✅ Crear artifact reutilizando el archivo existente
          // Reutiliza: fileId, contentText, contentType del artifact original
          const reusedArtifact = await prisma.artifact.create({
            data: {
              caseId: caseId,
              sourceType: 'pdf',
              fileId: globalDuplicate.artifact.fileId, // ✅ Reutilizar fileId existente
              fileName: file.name, // Usar nombre nuevo (puede ser diferente)
              contentType: originalArtifact.contentType || file.type, // ✅ Reutilizar contentType original
              contentText: originalArtifact.contentText, // ✅ Reutilizar contentText del artifact original
              provenance: {
                uploadedBy: user.id,
                uploadedAt: new Date().toISOString(),
                userAgent: request.headers.get('user-agent') || 'unknown',
                fileHash: fileHash,
                fileSize: file.size,
                reusedFrom: globalDuplicate.artifact.id, // ✅ Metadata: indica que es reutilizado
                originalFileName: globalDuplicate.artifact.fileName,
                originalCaseId: globalDuplicate.artifact.caseId,
                originalUploadedAt: globalDuplicate.artifact.createdAt.toISOString(),
              }
            }
          });
          
          console.log('✅ [FASE 5] Artifact creado reutilizando archivo existente:', reusedArtifact.id);
          
          // Auditoría
          await tryRecordAuditLog({
            caseId: caseId,
            actor: user.id,
            action: 'artifact_uploaded_reused',
            tool: 'upload_api',
            payload: {
              artifactId: reusedArtifact.id,
              reusedFromArtifactId: globalDuplicate.artifact.id,
              reusedFromCaseId: globalDuplicate.artifact.caseId,
              fileName: file.name,
              fileHash,
            },
          });
          
          return NextResponse.json({
            success: true,
            artifact: {
              id: reusedArtifact.id,
              fileName: reusedArtifact.fileName,
              fileSize: file.size,
              storagePath: reusedArtifact.fileId,
              reused: true, // ✅ Indicar que es reutilizado
              reusedFrom: {
                artifactId: globalDuplicate.artifact.id,
                caseId: globalDuplicate.artifact.caseId,
                fileName: globalDuplicate.artifact.fileName
              }
            }
          }, { status: 201 });
        }
      } else {
        // ✅ OPCIÓN POR DEFECTO: Rechazar upload (comportamiento seguro)
        return NextResponse.json(
          { 
            error: 'This file has already been uploaded to another case',
            existingArtifactId: globalDuplicate.artifact.id,
            existingCaseId: globalDuplicate.artifact.caseId,
            existingFileName: globalDuplicate.artifact.fileName,
            duplicateType: 'global',
            suggestion: 'If you want to reuse this file, set reuseExisting=true in the request'
          },
          { status: 409 }
        );
      }
    }
    
    console.log('✅ [FASE 5] No se encontraron duplicados, procediendo con upload normal');
    
    // Generar path seguro para el archivo en Storage
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${orgId}/${caseId}/${timestamp}_${sanitizedFileName}`;
    
    console.log('☁️ Subiendo a Storage:', storagePath);
    
    // ✅ FASE 4 CORREGIDA: Incluir org_id en metadata con conversión explícita a strings
    // CRÍTICO: Supabase Storage requiere que TODOS los valores de metadata sean strings
    // Los UUIDs deben convertirse explícitamente usando String() para evitar valores null
    const { error: uploadError } = await supabase.storage
      .from('artifacts')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        metadata: {
          org_id: String(orgId),        // ✅ CRÍTICO: Conversión explícita a string
          case_id: String(caseId),      // ✅ CRÍTICO: Conversión explícita a string
          uploaded_by: String(user.id), // ✅ CRÍTICO: Conversión explícita a string
          file_name: String(file.name), // ✅ Ya es string, pero explícito para consistencia
          content_type: String(file.type), // ✅ Ya es string, pero explícito para consistencia
          uploaded_at: new Date().toISOString(), // ✅ Ya es string (ISO format)
        }
      });
    
    if (uploadError) {
      console.error('❌ Error subiendo a Storage:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage: ' + uploadError.message },
        { status: 500 }
      );
    }
    
    console.log('✅ Archivo subido a Storage');
    
    // ✅ VALIDACIÓN EXPLÍCITA: Asegurar que storagePath sea válido antes de crear artifact
    if (!storagePath || storagePath.trim() === '' || storagePath.includes('null') || storagePath.includes('undefined')) {
      console.error('❌ [API/upload/pdf] Invalid storagePath:', storagePath);
      return NextResponse.json(
        { error: 'Invalid storage path generated. Please try again.' },
        { status: 500 }
      );
    }
    
    // Extraer texto del PDF
    console.log('📚 Extrayendo texto del PDF...');
    let pdfText = '';
    let pageCount = 0;
    
    try {
      const extracted = await extractTextFromPDF(buffer);
      pdfText = extracted.text;
      pageCount = extracted.pages;
      console.log('✅ Texto extraído:', pdfText.length, 'caracteres,', pageCount, 'páginas');
    } catch (extractError) {
      console.warn('⚠️ Error extrayendo texto, continuando sin texto:', extractError);
      // No fallar la operación completa si la extracción falla
    }
    
    // Crear registro en la tabla artifacts
    console.log('💾 Creando registro en artifacts...');
    
    // ✅ Limpiar bytes nulos de contentText para evitar errores de encoding UTF8
    const cleanedPdfText = pdfText ? pdfText.replace(/\0/g, '') : null;
    
    const artifact = await prisma.artifact.create({
      data: {
        caseId: caseId,
        sourceType: 'pdf', // ✅ CORRECCIÓN: Cambiar de 'upload' a 'pdf'
        fileId: storagePath,
        fileName: file.name,
        contentType: file.type,
        contentText: cleanedPdfText,
        provenance: {
          uploadedBy: user.id,
          uploadedAt: new Date().toISOString(),
          userAgent: request.headers.get('user-agent') || 'unknown',
          fileHash: fileHash,
          fileSize: file.size,
          pageCount: pageCount
        }
      }
    });
    
    console.log('✅ Artifact creado:', artifact.id);

    // Auditoría
    await tryRecordAuditLog({
      caseId: caseId,
      actor: user.id,
      action: 'artifact_uploaded',
      tool: 'upload_api',
      payload: {
        artifactId: artifact.id,
        storagePath,
        fileName: file.name,
        contentType: file.type,
        fileHash,
        pageCount,
        size: file.size,
      },
    });
    
    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      artifact: {
        id: artifact.id,
        fileName: artifact.fileName,
        fileSize: file.size,
        pageCount: pageCount,
        charactersExtracted: pdfText.length,
        storagePath: storagePath
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error en upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}