/**
 * Message Helpers
 * 
 * Funciones utilitarias para generar mensajes basados en briefs de casos.
 * 
 * @module lib/helpers/message-helpers
 */

import { CaseBrief } from '@/lib/types';

/**
 * Genera un mensaje inicial basado en los datos del brief del caso.
 * 
 * Esta función toma los datos del formulario de brief y genera un mensaje
 * estructurado que describe toda la información proporcionada por el usuario.
 * 
 * @param brief - Datos parciales del brief del caso
 * @returns Mensaje formateado con toda la información del brief
 * 
 * @example
 * ```typescript
 * const brief = {
 *   clientName: "Radamel Falcao",
 *   insurance_category: "empresarial",
 *   max_budget: 21000,
 *   businessType: "Briki",
 *   employees: 8
 * };
 * 
 * const message = generateInitialMessageFromBrief(brief);
 * // Retorna: "He completado el formulario con la siguiente información:\n\nCliente: Radamel Falcao\n..."
 * ```
 */
export function generateInitialMessageFromBrief(brief: Partial<CaseBrief>): string {
    const parts: string[] = [];
    
    // Información básica
    if (brief.clientName) {
        parts.push(`Cliente: ${brief.clientName}`);
    }
    
    // Categoría de seguro (obligatoria)
    if (brief.insurance_category) {
        parts.push(`Categoría de seguro: ${brief.insurance_category}`);
    }
    
    // Presupuesto
    if (brief.max_budget) {
        const currency = brief.budget_currency || 'COP';
        parts.push(`Presupuesto máximo: ${brief.max_budget.toLocaleString()} ${currency}`);
    }
    
    // Coberturas seleccionadas (desde categoryData)
    const selectedCoverages = (brief.categoryData?.selected_coverages as string[]) || [];
    if (selectedCoverages.length > 0) {
        parts.push(`Coberturas seleccionadas: ${selectedCoverages.join(', ')}`);
    }
    
    // Perfil del cliente
    if (brief.client_profile) {
        parts.push(`Perfil del cliente: ${brief.client_profile}`);
    }
    
    // Número de empleados (solo empresas)
    if (brief.employees) {
        parts.push(`Número de empleados: ${brief.employees}`);
    }
    
    // Notas adicionales
    if (brief.freeText) {
        parts.push(`Notas adicionales: ${brief.freeText}`);
    }
    
    // ✅ FASE BASELINE vs CHALLENGERS: Clasificar PDFs adjuntos por rol
    const tempUploads = (brief as any).tempUploads || [];
    const baselineUploads = tempUploads.filter((u: any) => u.documentRole === 'baseline');
    const challengerUploads = tempUploads.filter((u: any) => u.documentRole !== 'baseline');
    
    // Notificar BASELINE (Condiciones Actuales)
    if (baselineUploads.length > 0) {
        const baselineName = baselineUploads[0].fileName || 'Documento';
        parts.push(`📋 **Póliza actual (baseline):** ${baselineName}`);
        parts.push('(Esta es la póliza que el cliente tiene actualmente)');
    } else {
        parts.push(`⚠️ **Sin póliza baseline:** El cliente no tiene una póliza actual o no fue adjuntada`);
    }
    
    // Notificar CHALLENGERS (Cotizaciones/Alternativas)
    if (challengerUploads.length > 0) {
        const challengerNames = challengerUploads.map((u: any) => u.fileName || 'Documento').join(', ');
        parts.push(`📄 **Cotizaciones (challengers):** ${challengerNames}`);
        parts.push(`(${challengerUploads.length} alternativa(s) para comparar)`);
    }
    
    // ✅ FASE POLICY_LINKS: Pólizas vinculadas de la organización (ya analizadas)
    const linkedPolicyIds = brief.linkedPolicyIds || [];
    if (linkedPolicyIds.length > 0) {
        parts.push(`🔗 **Pólizas de organización vinculadas:** ${linkedPolicyIds.length}`);
        parts.push('(Estas pólizas ya tienen análisis previo - listas para comparación)');
    }
    
    // Si no hay información, retornar mensaje genérico
    if (parts.length === 0) {
        return 'He completado el formulario con la información del caso.';
    }
    
    // ✅ FASE BASELINE vs CHALLENGERS: Mensaje diferenciado según escenario
    const hasLinkedPolicies = linkedPolicyIds.length > 0;
    const hasBaseline = baselineUploads.length > 0;
    const hasChallengers = challengerUploads.length > 0 || hasLinkedPolicies;
    
    let introMessage = 'He completado el formulario con la siguiente información:';
    
    if (hasBaseline && hasChallengers) {
        // CASO A: Tiene baseline Y alternativas - escenario ideal para comparación
        introMessage = 'He completado el formulario con la póliza actual del cliente y alternativas para comparar:';
    } else if (!hasBaseline && hasChallengers) {
        // CASO B: Sin baseline pero con alternativas - cliente sin póliza actual
        introMessage = 'He completado el formulario. El cliente no tiene póliza actual, así que evaluaremos las cotizaciones disponibles:';
    } else if (hasBaseline && !hasChallengers) {
        // CASO C: Solo baseline - necesita cotizaciones
        introMessage = 'He completado el formulario con la póliza actual del cliente. Sube cotizaciones para poder comparar:';
    } else if (hasLinkedPolicies) {
        // CASO D: Solo pólizas de org
        introMessage = 'He completado el formulario y vinculado pólizas de la organización:';
    }
    
    return `${introMessage}\n\n${parts.join('\n')}`;
}

/**
 * Genera un mensaje de BIENVENIDA del agente después de crear un caso.
 * 
 * Este mensaje NO dispara análisis de OpenAI - es un mensaje estático del agente
 * que resume la información del formulario y guía al usuario a analizar pólizas manualmente.
 * 
 * @param brief - Datos parciales del brief del caso
 * @param artifactCount - Número de pólizas/documentos adjuntos al caso
 * @param linkedPolicyCount - Número de pólizas vinculadas de la organización
 * @returns Mensaje de bienvenida formateado
 * 
 * @example
 * ```typescript
 * const message = generateWelcomeMessageFromBrief(brief, 3, 1);
 * // Retorna: "¡Excelente! He creado un nuevo caso para **Juan Pérez**..."
 * ```
 */
export function generateWelcomeMessageFromBrief(
    brief: Partial<CaseBrief>, 
    artifactCount: number = 0,
    linkedPolicyCount: number = 0,
    policyInfo?: { baselineCount: number; challengerCount: number; baselineFileName: string; linkedQuoteCount?: number }
): string {
    const clientName = brief.clientName || 'tu cliente';
    
    // ✅ FASE BASELINE vs CHALLENGERS: Usar info de parámetros en lugar de tempUploads
    const baselineCount = policyInfo?.baselineCount ?? 0;
    const challengerCount = policyInfo?.challengerCount ?? 0;
    const baselineFileName = policyInfo?.baselineFileName ?? '';
    const linkedQuoteCount = policyInfo?.linkedQuoteCount ?? 0;
    
    let message = `¡Excelente! He creado un nuevo caso para **${clientName}**.\n\n`;
    
    // Construir resumen de detalles
    const details: string[] = [];
    
    if (brief.insurance_category) {
        details.push(`📋 **Categoría:** ${brief.insurance_category}`);
    }
    
    if (brief.employees) {
        details.push(`👥 **Empleados:** ${brief.employees}`);
    }
    
    if (brief.max_budget) {
        const currency = brief.budget_currency || 'COP';
        details.push(`💰 **Presupuesto:** ${brief.max_budget.toLocaleString()} ${currency}`);
    }
    
    const selectedCoverages2 = (brief.categoryData?.selected_coverages as string[]) || [];
    if (selectedCoverages2.length > 0) {
        details.push(`🛡️ **Coberturas seleccionadas:** ${selectedCoverages2.join(', ')}`);
    }
    
    if (brief.client_profile) {
        details.push(`👤 **Perfil:** ${brief.client_profile}`);
    }
    
    if (brief.freeText) {
        // Limitar notas a 100 caracteres para el resumen
        const truncatedNotes = brief.freeText.length > 100 
            ? brief.freeText.substring(0, 100) + '...' 
            : brief.freeText;
        details.push(`📝 **Notas:** ${truncatedNotes}`);
    }
    
    if (details.length > 0) {
        message += `**Resumen del caso:**\n${details.join('\n')}\n\n`;
    }
    
    // ✅ FASE BASELINE vs CHALLENGERS: Sección de pólizas diferenciada
    // Ahora usa los parámetros pasados desde state.ts (datos reales de artifacts)
    const totalLocalPolicies = baselineCount + challengerCount;
    const totalChallengers = challengerCount + linkedQuoteCount;
    const totalPolicies = artifactCount + linkedPolicyCount + linkedQuoteCount;
    
    message += `---\n\n`;
    
    // Indicar estado de baseline (local + org vinculadas)
    if (baselineCount > 0) {
        message += `🔵 **Póliza actual (baseline):** ${baselineFileName}\n`;
        if (linkedPolicyCount > 0) {
            message += `🔵 **Pólizas org vinculadas (baseline):** ${linkedPolicyCount} póliza(s)\n`;
        }
    } else if (linkedPolicyCount > 0) {
        message += `🔵 **Pólizas de la organización (baseline):** ${linkedPolicyCount} póliza(s) vinculada(s)\n`;
    } else {
        message += `⚠️ **Sin póliza actual:** El cliente no tiene una póliza baseline adjuntada\n`;
    }
    
    // Indicar challengers (locales + cotizaciones org vinculadas)
    if (totalChallengers > 0) {
        message += `🟢 **Alternativas a comparar:**\n`;
        if (challengerCount > 0) {
            message += `  - ${challengerCount} cotización(es) local(es)\n`;
        }
        if (linkedQuoteCount > 0) {
            message += `  - ${linkedQuoteCount} cotización(es) de la organización\n`;
        }
    }
    
    // ✅ CRÍTICO: SIEMPRE indicar ir al tab de Pólizas si hay documentos
    const hasBaseline = baselineCount > 0 || linkedPolicyCount > 0;
    if (totalPolicies > 0) {
        message += `\n👉 **Siguiente paso:** Ve a la pestaña **"Pólizas"** en el panel derecho.\n`;
        
        if (hasBaseline) {
            message += `Te recomiendo analizar primero la **póliza baseline** para establecer el punto de referencia.\n`;
        }
        
        if ((linkedPolicyCount > 0 || linkedQuoteCount > 0) && totalLocalPolicies === 0) {
            message += `Haz clic en **"Cargar Análisis"** para contextualizar los documentos de la organización.`;
        } else if (totalLocalPolicies > 0) {
            message += `Haz clic en **"Analizar PDF"** para iniciar el análisis de cada documento.`;
        }
    } else {
        message += `\n📄 No has subido ninguna póliza todavía.\n`;
        message += `Puedes agregar documentos en cualquier momento desde el formulario del caso.`;
    }
    
    message += `\n\n¿En qué más puedo ayudarte?`;
    
    return message;
}
