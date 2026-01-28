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
    
    // Coberturas imprescindibles
    if (brief.required_coverages && brief.required_coverages.length > 0) {
        parts.push(`Coberturas imprescindibles: ${brief.required_coverages.join(', ')}`);
    }
    
    // Perfil del cliente
    if (brief.client_profile) {
        parts.push(`Perfil del cliente: ${brief.client_profile}`);
    }
    
    // Tipo de negocio
    if (brief.businessType) {
        parts.push(`Tipo de negocio: ${brief.businessType}`);
    }
    
    // Número de empleados
    if (brief.employees) {
        parts.push(`Número de empleados: ${brief.employees}`);
    }
    
    // Notas adicionales
    if (brief.freeText) {
        parts.push(`Notas adicionales: ${brief.freeText}`);
    }
    
    // PDFs adjuntos (locales - subidos desde el computador)
    const tempUploads = (brief as any).tempUploads || [];
    if (tempUploads.length > 0) {
        const pdfNames = tempUploads.map((upload: any) => upload.fileName || 'Documento').join(', ');
        parts.push(`Documentos PDF adjuntos: ${pdfNames}`);
    }
    
    // ✅ FASE POLICY_LINKS: Pólizas vinculadas de la organización (ya analizadas)
    const linkedPolicyIds = brief.linkedPolicyIds || [];
    if (linkedPolicyIds.length > 0) {
        parts.push(`Pólizas de la organización vinculadas: ${linkedPolicyIds.length}`);
        parts.push('(Estas pólizas ya tienen análisis previo - listas para comparación)');
    }
    
    // Si no hay información, retornar mensaje genérico
    if (parts.length === 0) {
        return 'He completado el formulario con la información del caso.';
    }
    
    // ✅ FASE POLICY_LINKS: Mensaje diferenciado según escenario
    const hasLinkedPolicies = linkedPolicyIds.length > 0;
    const hasLocalPdfs = tempUploads.length > 0;
    
    let introMessage = 'He completado el formulario con la siguiente información:';
    
    if (hasLinkedPolicies && !hasLocalPdfs) {
        // CASO A: Solo pólizas de org - sugerir comparación directa
        introMessage = 'He completado el formulario y vinculado pólizas de la organización. Por favor, compáralas y recomienda la mejor opción:';
    } else if (hasLinkedPolicies && hasLocalPdfs) {
        // CASO B: Mezcla - indicar que hay pólizas listas y otras pendientes
        introMessage = 'He completado el formulario con pólizas vinculadas y documentos nuevos para analizar:';
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
    linkedPolicyCount: number = 0
): string {
    const clientName = brief.clientName || 'tu cliente';
    
    let message = `¡Excelente! He creado un nuevo caso para **${clientName}**.\n\n`;
    
    // Construir resumen de detalles
    const details: string[] = [];
    
    if (brief.insurance_category) {
        details.push(`📋 **Categoría:** ${brief.insurance_category}`);
    }
    
    if (brief.businessType) {
        details.push(`🏢 **Tipo de negocio:** ${brief.businessType}`);
    }
    
    if (brief.employees) {
        details.push(`👥 **Empleados:** ${brief.employees}`);
    }
    
    if (brief.max_budget) {
        const currency = brief.budget_currency || 'COP';
        details.push(`💰 **Presupuesto:** ${brief.max_budget.toLocaleString()} ${currency}`);
    }
    
    if (brief.required_coverages && brief.required_coverages.length > 0) {
        details.push(`🛡️ **Coberturas requeridas:** ${brief.required_coverages.join(', ')}`);
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
    
    // Sección de pólizas con lógica diferenciada
    const totalPolicies = artifactCount + linkedPolicyCount;
    
    if (totalPolicies > 0) {
        message += `---\n\n`;
        message += `📄 **Pólizas disponibles para análisis:**\n`;
        
        if (artifactCount > 0) {
            message += `- ${artifactCount} documento(s) subido(s) desde tu computador\n`;
        }
        
        if (linkedPolicyCount > 0) {
            message += `- ${linkedPolicyCount} póliza(s) vinculada(s) de la organización (con análisis previo)\n`;
        }
        
        message += `\n👉 **Siguiente paso:** Ve al tab **"Pólizas"** en el panel derecho y haz clic en `;
        
        if (linkedPolicyCount > 0 && artifactCount === 0) {
            // Solo pólizas de org
            message += `**"Cargar Análisis"** para contextualizar las pólizas existentes con los datos del cliente.`;
        } else if (artifactCount > 0) {
            // Hay pólizas locales
            message += `**"Analizar PDF"** en la póliza que desees revisar primero.`;
        }
    } else {
        message += `📄 No has subido ninguna póliza todavía. `;
        message += `Puedes agregar documentos en cualquier momento desde el formulario del caso.`;
    }
    
    message += `\n\n¿En qué más puedo ayudarte?`;
    
    return message;
}
