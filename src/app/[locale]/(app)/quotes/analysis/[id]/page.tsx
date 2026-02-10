// /src/app/[locale]/(app)/quotes/analysis/[id]/page.tsx
/**
 * Página de detalle de cotización individual
 * 
 * Server Component que:
 * 1. Verifica autenticación y organización
 * 2. Obtiene la cotización del contenedor organizacional
 * 3. Pasa datos al componente cliente
 * 
 * Nota: Los campos específicos (insurer, product, etc.) se extraen del JSON
 * extractedData que tiene estructura anidada de la IA.
 */

import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getOrgQuotesContainerId } from '@/lib/helpers/getOrgQuotesContainer';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getUserPins } from '@/lib/data/workspace';
import { QuoteDetailContent } from './QuoteDetailContent';
import type { Locale } from '@/lib/routes/workspace';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

// ============================================================================
// HELPER: Extraer valor de extractedData con soporte para paths anidados
// ============================================================================

/**
 * Extrae valor de estructura anidada de forma segura.
 * Maneja paths como "insurer.name", "quote.number", "financials.quoted_premium"
 */
function getNestedValue(data: Record<string, unknown> | null, path: string): unknown {
  if (!data) return null;
  
  const keys = path.split('.');
  let current: unknown = data;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }
  
  return current ?? null;
}

/**
 * Extrae string de datos anidados, buscando múltiples paths posibles
 */
function safeExtract(data: Record<string, unknown> | null, ...paths: string[]): string | null {
  for (const path of paths) {
    const value = getNestedValue(data, path);
    if (value !== null && value !== undefined) {
      if (typeof value === 'string' && value.trim()) return value;
      if (typeof value === 'number') return String(value);
      if (typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        // Si es objeto, buscar .name o .value
        if (obj.name && typeof obj.name === 'string') return obj.name;
        if (obj.value && typeof obj.value === 'string') return obj.value;
      }
    }
  }
  return null;
}

/**
 * Extrae número de datos anidados
 */
function safeExtractNumber(data: Record<string, unknown> | null, ...paths: string[]): number | null {
  for (const path of paths) {
    const value = getNestedValue(data, path);
    if (value !== null && value !== undefined) {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) return num;
      }
    }
  }
  return null;
}

/**
 * Extrae fecha de datos anidados
 */
function safeExtractDate(data: Record<string, unknown> | null, ...paths: string[]): string | null {
  for (const path of paths) {
    const value = getNestedValue(data, path);
    if (value !== null && value !== undefined && typeof value === 'string') {
      // Intentar parsear como fecha
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date.toISOString();
    }
  }
  return null;
}

interface QuoteDetailPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const { user, currentOrg } = await getCurrentOrg();
  const { locale, id: quoteId } = await params;
  
  // Obtener el contenedor de cotizaciones de la organización
  const containerId = await getOrgQuotesContainerId(currentOrg.id);
  
  if (!containerId) {
    notFound();
  }
  
  // Obtener la cotización con todos sus datos
  const quote = await prisma.quoteAnalysis.findFirst({
    where: {
      id: quoteId,
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
  
  if (!quote) {
    notFound();
  }
  
  // Verificar si está pinneada - getUserPins retorna objeto con arrays por tipo
  const userPins = await getUserPins(user.id);
  const isPinned = userPins.quotes.includes(quoteId);
  
  // Extraer datos del JSON extractedData (estructura anidada de la IA)
  const extractedData = quote.extractedData as Record<string, unknown> | null;
  
  // Serializar datos para el cliente
  // La IA retorna estructura anidada: { insurer: { name: "AXA" }, quote: { number: "123" }, financials: { quoted_premium: 15000 }, ... }
  const serializedQuote = {
    id: quote.id,
    artifactId: quote.artifactId,
    
    // Core fields - extraídos de estructura anidada de extractedData
    insurer: safeExtract(extractedData, 'insurer.name', 'insurer'),
    product: safeExtract(extractedData, 'quote.product_name', 'quote.product', 'product'),
    branchType: safeExtract(extractedData, 'quote.branch_type', 'branch_type', 'insurance_type'),
    quoteNumber: safeExtract(extractedData, 'quote.number', 'quote_number'),
    quoteDate: safeExtractDate(extractedData, 'quote.date', 'quote_date'),
    validUntil: safeExtractDate(extractedData, 'quote.valid_until', 'valid_until', 'validity_end'),
    
    // Financial - extraídos de financials anidado
    quotedPremium: safeExtractNumber(extractedData, 'financials.quoted_premium', 'financials.total_premium', 'quoted_premium', 'total_premium'),
    netPremium: safeExtractNumber(extractedData, 'financials.net_premium', 'net_premium'),
    taxes: safeExtractNumber(extractedData, 'financials.taxes', 'taxes'),
    fees: safeExtractNumber(extractedData, 'financials.fees', 'fees'),
    currency: safeExtract(extractedData, 'financials.currency', 'currency') || 'MXN',
    paymentFrequency: safeExtract(extractedData, 'financials.payment_frequency', 'payment_frequency'),
    
    // Term - extraídos de proposed_term anidado
    effectiveDate: safeExtractDate(extractedData, 'proposed_term.start_date', 'effective_date', 'start_date'),
    expirationDate: safeExtractDate(extractedData, 'proposed_term.end_date', 'expiration_date', 'end_date'),
    durationMonths: safeExtractNumber(extractedData, 'proposed_term.duration_months', 'duration_months'),
    
    // Prospect - extraídos de prospect anidado
    prospectName: safeExtract(extractedData, 'prospect.name', 'prospect_name', 'insured_name'),
    prospectId: safeExtract(extractedData, 'prospect.id', 'prospect_id', 'insured_id'),
    prospectCompany: safeExtract(extractedData, 'prospect.company', 'company'),
    
    // Insured object - extraídos de insured_object anidado
    insuredObjectType: safeExtract(extractedData, 'insured_object.type', 'insured_object_type'),
    insuredObjectDescription: safeExtract(extractedData, 'insured_object.description', 'insured_object_description'),
    insuredValue: safeExtractNumber(extractedData, 'insured_object.value', 'insured_value', 'sum_insured'),
    insuredLocation: safeExtract(extractedData, 'insured_object.location', 'location'),
    
    // Full extracted data (para coberturas, exclusiones, etc.)
    extractedData: extractedData,
    
    // Analysis metadata
    status: 'analyzed', // Las cotizaciones en quote_analyses ya fueron analizadas
    confidence: quote.overallConfidence ? Number(quote.overallConfidence) : null,
    extractionMethod: quote.extractionMethod,
    analyzedAt: quote.extractedAt?.toISOString() || null,
    
    // Timestamps
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
    
    // Related data
    artifact: quote.artifact ? {
      id: quote.artifact.id,
      fileName: quote.artifact.fileName,
      contentType: quote.artifact.contentType,
      fileId: quote.artifact.fileId,
      createdAt: quote.artifact.createdAt.toISOString(),
    } : null,
    pageReferences: quote.pageReferences.map((ref: any) => ({
      id: ref.id,
      fieldName: ref.fieldName,
      fieldValue: ref.fieldValue,
      pageNumber: ref.pageNumber,
      boundingBox: ref.boundingBox,
      confidence: ref.confidence ? Number(ref.confidence) : null,
    })),
    caseLinks: quote.caseLinks.map((link: any) => ({
      id: link.id,
      caseId: link.caseId,
      linkedAt: link.linkedAt.toISOString(),
      status: link.linkType || 'reference',
      case: link.case ? {
        id: link.case.id,
        title: link.case.caseName,
        clientName: link.case.clientName,
        status: link.case.status,
      } : null,
    })),
  };
  
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <QuoteDetailContent 
        quote={serializedQuote}
        isPinned={isPinned}
        locale={locale as Locale}
      />
    </div>
  );
}
