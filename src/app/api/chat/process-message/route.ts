import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { analyzeInsuranceDocuments, AnalysisRequest } from '@/lib/openai';
import { CaseBrief } from '@/lib/types';
import { encryptMessageContent, decryptMessages } from '@/lib/helpers/messageEncryption';
import { validateChatResponse } from '@/lib/validation/chatReferences'; // ✅ Importar validación

// ✅ FIX: Configuración de runtime y timeout para Next.js 16+
// vercel.json NO funciona para maxDuration en Next.js >= 13.5
export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutos para prompts largos (~134K chars)

export async function POST(request: NextRequest) {
  try {
    const { user, currentOrg } = await getCurrentOrg(); // Asegura autenticación y org
    const { message, brief, caseId } = await request.json();

    if (!caseId) {
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }

    // ✅ FIX DEFECTO B: Separar tag [BRIEF_UPDATE] del mensaje visible
    // El tag se preserva para el prompt (detectOperationMode), pero se elimina del texto almacenado/mostrado
    const rawMessage = message || '';
    const displayMessage = rawMessage.replace(/\[BRIEF_UPDATE\]\s*|\[POLICY_ANALYSIS\]\s*/gi, '').trim();

    console.log('🔄 API: Procesando mensaje:', displayMessage);
    console.log('📋 API: Brief recibido:', brief);
    console.log('📁 API: Case ID recibido:', caseId);

    // 1. Obtener los artefactos (documentos) del caso actual
    // ✅ FASE 9: Obtener también el ID de análisis asociado si existe
    const artifacts = await prisma.artifact.findMany({
      where: {
        caseId: caseId,
        case: {
          orgId: currentOrg.id // Seguridad: Filtra por orgId a través de la relación case
        }
      },
      select: {
        id: true,
        fileName: true,
        contentText: true,
        provenance: true, // ✅ FIX: Necesario para extraer documentRole
        policyAnalyses: { // ✅ CORREGIDO: Nombre correcto de la relación
          select: { id: true },
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    console.log(`📁 ${artifacts.length} documentos disponibles para análisis`);

    // 1.5 Obtener análisis previos para contexto de comparación (FASE 6B)
    // 1.5 Obtener análisis previos para contexto de comparación (FASE 6B)
    const previousAnalyses = await prisma.policyAnalysis.findMany({
      where: { caseId: caseId },
      select: {
        id: true, // ✅ Necesario para referencias
        extractedData: true,
        artifact: { // ✅ NUEVO: Para obtener nombre del PDF + provenance para documentRole
          select: {
            fileName: true,
            provenance: true // ✅ FIX DEFECTO 3: Traer provenance para extraer documentRole real
          }
        },
        pageReferences: {
          select: {
            fieldName: true,
            fieldValue: true, // ✅ NUEVO: Valor exacto del campo
            pageNumber: true,
            confidence: true // ✅ NUEVO: Para mostrar confianza
          }
        }
      }
    });

    console.log(`📊 API: ${previousAnalyses.length} análisis previos encontrados para contexto`);

    // 1.6 ✅ FIX DEFECTO E: Obtener pólizas y cotizaciones vinculadas via CasePolicyLink/CaseQuoteLink
    // Las pólizas de organización tienen su artifact/analysis en el contenedor de org (caseId diferente).
    // Solo CasePolicyLink las conecta al caso actual. Replicamos el patrón de policies/analyses/route.ts.
    const linkedPolicyLinks = await prisma.casePolicyLink.findMany({
      where: { caseId: caseId, orgId: currentOrg.id },
      include: {
        policyAnalysis: {
          include: {
            artifact: {
              select: { id: true, fileName: true, contentText: true, provenance: true }
            },
            pageReferences: {
              select: { fieldName: true, fieldValue: true, pageNumber: true, confidence: true }
            }
          }
        }
      }
    });

    const linkedQuoteLinks = await prisma.caseQuoteLink.findMany({
      where: { caseId: caseId, orgId: currentOrg.id },
      include: {
        quoteAnalysis: {
          include: {
            artifact: {
              select: { id: true, fileName: true, contentText: true, provenance: true }
            }
          }
        }
      }
    });

    console.log(`🔗 API: ${linkedPolicyLinks.length} pólizas vinculadas, ${linkedQuoteLinks.length} cotizaciones vinculadas`);

    // Deduplicar: si un artifact ya está en directos, no duplicar
    const directArtifactIds = new Set(artifacts.map(a => a.id));
    const directAnalysisIds = new Set(previousAnalyses.map(a => a.id));

    // Construir documents y analyses de pólizas vinculadas
    const linkedPolicyDocuments = linkedPolicyLinks
      .filter(link => link.policyAnalysis.artifact && !directArtifactIds.has(link.policyAnalysis.artifact.id))
      .map(link => {
        const art = link.policyAnalysis.artifact!;
        return {
          fileName: art.fileName || 'Póliza de organización',
          content: art.contentText,
          ...(link.policyAnalysis.id ? { analysisId: link.policyAnalysis.id } : {}),
          documentRole: 'baseline' as const, // Pólizas de org son condiciones actuales
        };
      });

    const linkedPolicyAnalyses = linkedPolicyLinks
      .filter(link => !directAnalysisIds.has(link.policyAnalysis.id))
      .map(link => ({
        id: link.policyAnalysis.id,
        extractedData: link.policyAnalysis.extractedData,
        artifact: link.policyAnalysis.artifact ? {
          fileName: link.policyAnalysis.artifact.fileName,
          provenance: link.policyAnalysis.artifact.provenance
        } : null,
        pageReferences: link.policyAnalysis.pageReferences,
        documentRole: 'baseline' as const,
      }));

    // Construir documents y analyses de cotizaciones vinculadas
    const linkedQuoteDocuments = linkedQuoteLinks
      .filter(link => link.quoteAnalysis.artifact && !directArtifactIds.has(link.quoteAnalysis.artifact.id))
      .map(link => {
        const art = link.quoteAnalysis.artifact!;
        return {
          fileName: art.fileName || 'Cotización de organización',
          content: art.contentText,
          documentRole: 'challenger' as const, // Cotizaciones son alternativas
        };
      });

    const linkedQuoteAnalyses = linkedQuoteLinks
      .filter(link => !directAnalysisIds.has(link.quoteAnalysis.id))
      .map(link => ({
        id: link.quoteAnalysis.id,
        extractedData: link.quoteAnalysis.extractedData,
        artifact: link.quoteAnalysis.artifact ? {
          fileName: link.quoteAnalysis.artifact.fileName,
          provenance: link.quoteAnalysis.artifact.provenance
        } : null,
        pageReferences: [],
        documentRole: 'challenger' as const,
      }));

    // 2. Preparar la solicitud para el servicio OpenAI
    // ✅ FIX DEFECTO B: rawMessage conserva el tag [BRIEF_UPDATE] para detectOperationMode
    const analysisRequest: AnalysisRequest = {
      message: rawMessage,
      brief: brief || {},
      documents: [
        // Documentos directos del caso
        ...artifacts.map(artifact => {
          const prov = artifact.provenance as any;
          return {
            fileName: artifact.fileName || 'Unknown Document',
            content: artifact.contentText,
            ...(artifact.policyAnalyses?.[0]?.id ? { analysisId: artifact.policyAnalyses[0].id } : {}),
            ...(prov?.documentRole ? { documentRole: prov.documentRole as 'baseline' | 'challenger' } : {}),
          };
        }),
        // ✅ FIX DEFECTO E: Documentos de pólizas y cotizaciones vinculadas de la organización
        ...linkedPolicyDocuments,
        ...linkedQuoteDocuments,
      ],
      previousAnalyses: [
        // Análisis directos
        ...previousAnalyses.map(analysis => {
          const prov = analysis.artifact?.provenance as any;
          return {
            ...analysis,
            ...(prov?.documentRole ? { documentRole: prov.documentRole as 'baseline' | 'challenger' } : {}),
          };
        }),
        // ✅ FIX DEFECTO E: Análisis de pólizas y cotizaciones vinculadas de la organización
        ...linkedPolicyAnalyses,
        ...linkedQuoteAnalyses,
      ]
    };

    // 3. Guardar mensaje del usuario en la tabla messages
    // ✅ FASE 3: Usar encriptación para guardar mensajes
    // Verificar si el mensaje ya fue guardado (últimos 10 segundos)
    // Esto previene duplicación cuando createCaseIfNeeded ya guardó el mensaje
    try {
      const tenSecondsAgo = new Date(Date.now() - 10000);
      // Obtener mensajes recientes para comparar contenido desencriptado
      const recentMessages = await prisma.message.findMany({
        where: {
          caseId: caseId,
          role: 'user',
          createdAt: {
            gte: tenSecondsAgo // Últimos 10 segundos
          }
        },
        orderBy: {
          createdAt: 'desc' // El más reciente primero
        },
        select: {
          id: true,
          content: true, // Buffer encriptado
          role: true,
          createdAt: true
        }
      });

      // Desencriptar mensajes para comparar contenido
      const decryptedRecent = await decryptMessages(recentMessages);
      const existingUserMessage = decryptedRecent.find(msg => msg.content === displayMessage);

      if (existingUserMessage) {
        console.log(`⚠️ API: Mensaje de usuario ya existe para caso ${caseId} (ID: ${existingUserMessage.id}), omitiendo creación duplicada.`);
      } else {
        // Encriptar contenido antes de guardar
        // ✅ FIX DEFECTO B: Almacenar displayMessage (sin tag [BRIEF_UPDATE]) en BD
        const encryptedContent = await encryptMessageContent(displayMessage);
        // Solo crear si no existe
        await prisma.message.create({
          data: {
            caseId: caseId,
            role: 'user',
            content: Buffer.from(encryptedContent), // ✅ Contenido encriptado (Buffer)
            metadata: { timestamp: new Date().toISOString() }
          }
        });
        console.log(`✅ API: Mensaje de usuario para caso ${caseId} guardado.`);
      }
    } catch (dbError) {
      console.error(`❌ API: Error guardando mensaje de usuario para caso ${caseId}:`, dbError);
      // Continuar pero loguear el error
    }

    // 4. Llamar al servicio de OpenAI para obtener el análisis
    const analysisResult = await analyzeInsuranceDocuments(analysisRequest);

    console.log('✅ API: Análisis completado con OpenAI');

    // ✅ FASE 10.4: Validar y limpiar respuesta
    const { cleanedResponse, warnings, issuesFound } = validateChatResponse(analysisResult);

    if (issuesFound) {
      console.warn('⚠️ [Chat] Respuesta requirió limpieza:', warnings);
    }

    // 5. Guardar respuesta del asistente en la tabla messages
    try {
      // Encriptar contenido antes de guardar
      const encryptedAssistantContent = await encryptMessageContent(cleanedResponse); // ✅ Usar respuesta limpia
      await prisma.message.create({
        data: {
          caseId: caseId,
          role: 'assistant',
          content: Buffer.from(encryptedAssistantContent), // ✅ Contenido encriptado (Buffer)
          metadata: { timestamp: new Date().toISOString(), agent: 'sourcing' }
        }
      });
      console.log(`✅ API: Respuesta de agente para caso ${caseId} guardada.`);
    } catch (dbError) {
      console.error(`❌ API: Error guardando respuesta de agente para caso ${caseId}:`, dbError);
      // Fallar aquí podría ser problemático si OpenAI ya respondió. Loguear es crucial.
    }

    // 6. Devolver la respuesta generada por OpenAI
    return NextResponse.json({
      response: analysisResult,
      caseId: caseId
    });

  } catch (error: any) {
    console.error('ERROR [API/CHAT/PROCESS-MESSAGE]:', error);
    const errorMessage = error.message || 'Failed to process message';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}