// src/app/api/org-policies/upload/route.ts
/**
 * API para subir pólizas standalone a la organización.
 * 
 * Diferencia con /api/upload/pdf:
 * - NO requiere un caseId existente
 * - Automáticamente crea o usa el "case contenedor" de la organización
 * - El case contenedor está completamente oculto de la UI normal de cases
 * 
 * Flujo:
 * 1. Autenticar usuario
 * 2. Obtener/crear case contenedor de pólizas de la org
 * 3. Subir archivo a Storage
 * 4. Crear artifact vinculado al case contenedor
 * 5. Retornar artifactId para trigger de análisis
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { tryRecordAuditLog } from '@/lib/audit';
import crypto from 'crypto';
import { getOrCreateOrgPoliciesContainer } from '@/lib/helpers/getOrgPoliciesContainer';
import { extractWithCoordinates } from '@/lib/pdf/extraction';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

// Force Node.js runtime (required for Buffer and pdf2json)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('📋 [org-policies/upload] Iniciando...');

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
    // 3. OBTENER/CREAR CASE CONTENEDOR
    // =========================================================================

    console.log('📦 Obteniendo case contenedor de pólizas...');
    const container = await getOrCreateOrgPoliciesContainer(orgId);
    console.log(`✅ Case contenedor: ${container.id}`);

    // =========================================================================
    // 4. PROCESAR ARCHIVO
    // =========================================================================

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Calcular hash para deduplicación
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    console.log(`🔐 Hash: ${fileHash.substring(0, 16)}...`);

    // Verificar duplicado en el contenedor
    const existingArtifacts = await prisma.artifact.findMany({
      where: { caseId: container.id }
    });

    const duplicate = existingArtifacts.find((a: any) =>
      a.provenance && typeof a.provenance === 'object' &&
      (a.provenance as any).fileHash === fileHash
    );

    if (duplicate) {
      console.log('⚠️ Archivo duplicado detectado');
      return NextResponse.json(
        {
          error: 'Este archivo ya ha sido subido',
          existingArtifactId: duplicate.id,
        },
        { status: 409 }
      );
    }

    // =========================================================================
    // 5. SUBIR A STORAGE
    // =========================================================================

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${orgId}/org-policies/${timestamp}_${sanitizedFileName}`;

    console.log(`☁️ Subiendo a Storage: ${storagePath}`);

    const { error: uploadError } = await supabase.storage
      .from('artifacts')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        metadata: {
          org_id: String(orgId),
          container_id: String(container.id),
          uploaded_by: String(user.id),
          file_name: String(file.name),
          content_type: String(file.type),
          uploaded_at: new Date().toISOString(),
          is_org_policy: 'true',
        }
      });

    if (uploadError) {
      console.error('❌ Error subiendo a Storage:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file: ' + uploadError.message },
        { status: 500 }
      );
    }

    console.log('✅ Archivo subido a Storage');

    // =========================================================================
    // 6. EXTRAER TEXTO DEL PDF
    // =========================================================================

    console.log('📚 Extrayendo texto del PDF...');
    let pdfText = '';
    let pageCount = 0;
    let coordinates: any[] = [];

    try {
      const extracted = await extractWithCoordinates(buffer);
      pdfText = extracted.text;
      pageCount = extracted.pages;
      coordinates = extracted.coordinates;
      console.log(`✅ Extraído: ${pdfText.length} caracteres, ${pageCount} páginas`);
    } catch (extractError) {
      console.warn('⚠️ Error extrayendo texto, continuando:', extractError);
    }

    // =========================================================================
    // 7. CREAR ARTIFACT
    // =========================================================================

    console.log('💾 Creando artifact...');

    // Limpiar bytes nulos del texto
    const cleanedPdfText = pdfText ? pdfText.replace(/\0/g, '') : null;

    const artifact = await prisma.artifact.create({
      data: {
        caseId: container.id, // ✅ Vinculado al case contenedor
        sourceType: 'pdf',
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
          pageCount: pageCount,
          coordinates: coordinates,
          coordinatesCount: coordinates.length,
          isOrgPolicy: true, // ✅ Marca como póliza de organización
        }
      }
    });

    console.log(`✅ Artifact creado: ${artifact.id}`);

    // =========================================================================
    // 8. AUDITORÍA
    // =========================================================================

    await tryRecordAuditLog({
      caseId: container.id,
      actor: user.id,
      action: 'org_policy_uploaded',
      tool: 'org_policies_api',
      payload: {
        artifactId: artifact.id,
        storagePath,
        fileName: file.name,
        fileHash,
        pageCount,
        size: file.size,
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
        fileSize: file.size,
        pageCount: pageCount,
        charactersExtracted: pdfText.length,
        storagePath: storagePath,
        containerId: container.id,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error en org-policies/upload:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
