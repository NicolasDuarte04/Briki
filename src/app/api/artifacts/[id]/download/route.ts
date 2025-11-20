import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { createServerSupabase } from '@/lib/supabase/server';

/**
 * GET /api/artifacts/[id]/download
 * 
 * FASE 5: Endpoint para descargar PDFs de artifacts
 * 
 * Descarga un archivo PDF desde Supabase Storage.
 * Verifica permisos del usuario antes de permitir la descarga.
 * 
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md (complementario a Fase 5)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, currentOrg } = await getCurrentOrg();
    const { id } = await params;
    const artifactId = id;

    // Verify artifact exists and belongs to org
    const artifact = await prisma.artifact.findFirst({
      where: {
        id: artifactId,
        case: {
          orgId: currentOrg.id
        }
      },
      select: {
        id: true,
        fileId: true,
        fileName: true,
        contentType: true
      }
    });

    if (!artifact) {
      return NextResponse.json(
        { error: 'Artifact not found or access denied' },
        { status: 404 }
      );
    }

    // ✅ CORRECCIÓN: Validar fileId antes de intentar descarga
    // artifact.fileId puede ser null según el schema Prisma
    if (!artifact.fileId || artifact.fileId.trim() === '') {
      return NextResponse.json(
        { error: 'Artifact fileId is missing or invalid. Cannot download file.' },
        { status: 400 }
      );
    }

    // Download file from Supabase Storage
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.storage
      .from('artifacts')
      .download(artifact.fileId);

    if (error) {
      console.error('Error downloading artifact from storage:', error);
      return NextResponse.json(
        { error: 'Failed to download file from storage' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }

    // Return file as response
    return new NextResponse(data, {
      headers: {
        'Content-Type': artifact.contentType || 'application/pdf',
        'Content-Disposition': `inline; filename="${artifact.fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });

  } catch (error: any) {
    console.error('Error in /api/artifacts/[id]/download:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

