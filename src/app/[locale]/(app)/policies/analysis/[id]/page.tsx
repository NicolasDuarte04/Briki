// /src/app/[locale]/(app)/policies/analysis/[id]/page.tsx
/**
 * Página de detalle de póliza individual
 * 
 * Server Component que:
 * 1. Verifica autenticación y organización
 * 2. Obtiene la póliza del contenedor organizacional
 * 3. Pasa datos al componente cliente
 */

import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getOrgPoliciesContainerId } from '@/lib/helpers/getOrgPoliciesContainer';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getUserPins } from '@/lib/data/workspace';
import { PolicyDetailContent } from './PolicyDetailContent';
import type { Locale } from '@/lib/routes/workspace';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

interface PolicyDetailPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export default async function PolicyDetailPage({ params }: PolicyDetailPageProps) {
  const { user, currentOrg } = await getCurrentOrg();
  const { locale, id: policyId } = await params;
  
  // Obtener el contenedor de pólizas de la organización
  const containerId = await getOrgPoliciesContainerId(currentOrg.id);
  
  if (!containerId) {
    notFound();
  }
  
  // Obtener la póliza con todos sus datos
  const policy = await prisma.policyAnalysis.findFirst({
    where: {
      id: policyId,
      caseId: containerId,
      orgId: currentOrg.id,
    },
    include: {
      artifact: {
        select: {
          id: true,
          fileName: true,
          contentType: true,
          fileId: true,
          createdAt: true,
        },
      },
      pageReferences: {
        orderBy: { pageNumber: 'asc' },
      },
      caseLinks: {
        include: {
          case: {
            select: {
              id: true,
              caseName: true,
              clientName: true,
              status: true,
            },
          },
        },
      },
    },
  });
  
  if (!policy) {
    notFound();
  }
  
  // Verificar si está pinneada
  const userPins = await getUserPins(user.id);
  const isPinned = userPins.policies.includes(policyId);
  
  // Serializar datos para el cliente
  const serializedPolicy = {
    id: policy.id,
    extractedData: policy.extractedData as Record<string, unknown> | null,
    overallConfidence: Number(policy.overallConfidence),
    extractionMethod: policy.extractionMethod,
    extractedAt: policy.extractedAt.toISOString(),
    artifact: policy.artifact ? {
      id: policy.artifact.id,
      fileName: policy.artifact.fileName,
      contentType: policy.artifact.contentType,
      fileId: policy.artifact.fileId,
      createdAt: policy.artifact.createdAt.toISOString(),
    } : null,
    pageReferences: policy.pageReferences.map(ref => ({
      id: ref.id,
      fieldName: ref.fieldName,
      pageNumber: ref.pageNumber,
      confidence: ref.confidence,
      createdAt: ref.createdAt.toISOString(),
    })),
    caseLinks: policy.caseLinks.map(link => ({
      id: link.id,
      caseId: link.caseId,
      linkedAt: link.linkedAt.toISOString(),
      linkType: link.linkType,
      case: link.case,
    })),
  };
  
  return (
    <PolicyDetailContent 
      policy={serializedPolicy}
      isPinned={isPinned}
      locale={locale as Locale}
    />
  );
}
