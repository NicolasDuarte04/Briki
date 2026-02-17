import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';
import { createServerSupabase } from '@/lib/supabase/server';

// ✅ Forzar Node.js runtime (hardening para binary streaming)
export const runtime = 'nodejs';

/**
 * Sanitiza un fileName para uso seguro en headers HTTP Content-Disposition.
 * 
 * Problema: Los headers HTTP solo admiten caracteres ISO-8859-1 (0-255).
 * Archivos con nombres Unicode (ej: "Cotización_Pérez.pdf" en NFD) contienen
 * code points > 255 (combining accents) que rompen el constructor Headers.
 * 
 * Solución RFC 5987/6266:
 * - filename="..." → fallback ASCII puro (compatible con todos los clientes)
 * - filename*=UTF-8''... → nombre completo percent-encoded (navegadores modernos)
 * 
 * @param rawName - Nombre original del archivo (puede contener Unicode/NFD)
 * @returns Objeto con ambas variantes del filename para Content-Disposition
 */
function sanitizeFileName(rawName: string | null | undefined): {
  ascii: string;
  utf8Encoded: string;
} {
  const name = (rawName || 'documento.pdf').normalize('NFC');
  // Truncar a 200 chars para evitar headers excesivamente largos
  const truncated = name.length > 200 ? name.slice(0, 196) + '.pdf' : name;
  // ASCII fallback: solo caracteres imprimibles 0x20-0x7E, el resto → _
  const ascii = truncated.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, "'");
  // RFC 5987: percent-encode para filename*
  const utf8Encoded = encodeURIComponent(truncated);
  return { ascii, utf8Encoded };
}

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
    // ✅ FIX: Sanitizar fileName para Content-Disposition (RFC 5987/6266)
    // Previene TypeError: ByteString con caracteres Unicode NFD (> 255)
    const { ascii, utf8Encoded } = sanitizeFileName(artifact.fileName);

    return new NextResponse(data, {
      headers: {
        'Content-Type': artifact.contentType || 'application/pdf',
        'Content-Disposition': `inline; filename="${ascii}"; filename*=UTF-8''${utf8Encoded}`,
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

