// src/app/api/org-quotes/upload/route.ts
/**
 * API para subir cotizaciones standalone a la organización.
 * 
 * Diferencia con /api/upload/pdf:
 * - NO requiere un caseId existente
 * - Automáticamente crea o usa el "case contenedor" de cotizaciones de la organización
 * - El case contenedor está completamente oculto de la UI normal de cases
 * 
 * Flujo:
 * 1. Autenticar usuario
 * 2. Obtener/crear case contenedor de cotizaciones de la org
 * 3. Subir archivo a Storage
 * 4. Crear artifact vinculado al case contenedor
 * 5. Retornar artifactId para trigger de análisis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { tryRecordAuditLog } from '@/lib/audit';
import crypto from 'crypto';
import { getOrCreateOrgQuotesContainer } from '@/lib/helpers/getOrgQuotesContainer';
import { extractWithCoordinates } from '@/lib/pdf/extraction';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

// Force Node.js runtime (required for Buffer and pdf2json)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('📋 [org-quotes/upload] Iniciando...');

    // =========================================================================
    // 1. AUTENTICACIÓN
    // =========================================================================
    
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Obtener organización actual
    const { currentOrg } = await getCurrentOrg();
    const orgId = currentOrg.id;

    console.log(`👤 Usuario: ${user.id}`);
    console.log(`🏢 Organización: ${orgId}`);

    // =========================================================================
    // 2. VALIDAR ARCHIVO
    // =========================================================================

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Validar tamaño (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    console.log(`📄 Archivo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // =========================================================================
    // 3. OBTENER/CREAR CASE CONTENEDOR DE COTIZACIONES
    // =========================================================================

    console.log('📦 Obteniendo case contenedor de cotizaciones...');
    const container = await getOrCreateOrgQuotesContainer(orgId);
    console.log(`✅ Case contenedor: ${container.id}`);

    // =========================================================================
    // 4. PROCESAR ARCHIVO
    // =========================================================================

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generar hash del contenido para detectar duplicados
    const contentHash = crypto
      .createHash('sha256')
      .update(buffer)
      .digest('hex');

    // Verificar si ya existe un artifact con el mismo hash en el contenedor
    const existingArtifact = await prisma.artifact.findFirst({
      where: {
        caseId: container.id,
        provenance: {
          path: ['contentHash'],
          equals: contentHash,
        },
      },
    });

    if (existingArtifact) {
      console.log(`⚠️  Cotización duplicada detectada: ${existingArtifact.id}`);
      return NextResponse.json({
        success: true,
        artifact: {
          id: existingArtifact.id,
          fileName: existingArtifact.fileName,
          fileId: existingArtifact.fileId,
        },
        duplicate: true,
        message: 'Esta cotización ya fue subida anteriormente',
      });
    }

    // =========================================================================
    // 5. SUBIR A STORAGE
    // =========================================================================

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `quotes/${orgId}/${timestamp}_${safeFileName}`;

    console.log(`📤 Subiendo a Storage: ${storagePath}`);

    const { data: storageData, error: storageError } = await supabase.storage
      .from('artifacts')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (storageError) {
      console.error('❌ Error de Storage:', storageError);
      return NextResponse.json(
        { error: `Storage error: ${storageError.message}` },
        { status: 500 }
      );
    }

    console.log(`✅ Archivo subido: ${storageData.path}`);

    // =========================================================================
    // 6. EXTRAER TEXTO PARA PREVIEW (opcional, mejora UX)
    // =========================================================================

    let extractedText: string | null = null;
    try {
      const extraction = await extractWithCoordinates(buffer);
      extractedText = extraction.text.substring(0, 5000); // Solo primeros 5000 chars
      console.log(`📝 Texto extraído: ${extractedText.length} chars`);
    } catch (extractError) {
      console.warn('⚠️  No se pudo extraer texto preview:', extractError);
    }

    // =========================================================================
    // 7. CREAR ARTIFACT
    // =========================================================================

    const artifact = await prisma.artifact.create({
      data: {
        caseId: container.id,
        sourceType: 'pdf',
        fileId: storageData.path,
        fileName: file.name,
        contentType: 'application/pdf',
        contentText: extractedText,
        provenance: {
          uploadedBy: user.id,
          uploadedAt: new Date().toISOString(),
          contentHash: contentHash,
          originalSize: file.size,
          source: 'org-quotes-upload',
        },
      },
    });

    console.log(`✅ Artifact creado: ${artifact.id}`);

    // =========================================================================
    // 8. AUDIT LOG (usando la interfaz correcta)
    // =========================================================================

    await tryRecordAuditLog({
      caseId: container.id,
      actor: user.email || user.id,
      action: 'quote.upload',
      payload: {
        fileName: file.name,
        fileSize: file.size,
        storagePath: storageData.path,
        artifactId: artifact.id,
        orgId: orgId,
      },
    });

    // =========================================================================
    // 9. RESPUESTA
    // =========================================================================

    return NextResponse.json({
      success: true,
      artifact: {
        id: artifact.id,
        fileName: artifact.fileName,
        fileId: artifact.fileId,
        contentType: artifact.contentType,
        createdAt: artifact.createdAt.toISOString(),
      },
      containerId: container.id,
      message: 'Cotización subida correctamente. Procede al análisis.',
    });

  } catch (error) {
    console.error('❌ Error en org-quotes/upload:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
