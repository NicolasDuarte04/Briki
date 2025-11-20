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
    
    // PDFs adjuntos
    const tempUploads = (brief as any).tempUploads || [];
    if (tempUploads.length > 0) {
        const pdfNames = tempUploads.map((upload: any) => upload.fileName || 'Documento').join(', ');
        parts.push(`Documentos PDF adjuntos: ${pdfNames}`);
    }
    
    // Si no hay información, retornar mensaje genérico
    if (parts.length === 0) {
        return 'He completado el formulario con la información del caso.';
    }
    
    return `He completado el formulario con la siguiente información:\n\n${parts.join('\n')}`;
}


