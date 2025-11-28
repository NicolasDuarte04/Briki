/**
 * Validación de referencias en respuestas del chat
 * 
 * Detecta y corrige errores comunes de la IA al generar referencias
 */

export interface ValidationResult {
    cleanedResponse: string;
    warnings: string[];
    issuesFound: boolean;
}

/**
 * Valida y limpia una respuesta del chat
 * 
 * Detecta:
 * - Uso incorrecto de [[PAGE_X]]
 * - Referencias mal formadas
 * - Menciones de páginas sin formato correcto
 */
export function validateChatResponse(response: string): ValidationResult {
    const warnings: string[] = [];
    let cleaned = response;
    let issuesFound = false;

    // 1. Detectar uso de marcadores de página [[PAGE_X]]
    const pageMarkerRegex = /\[\[PAGE_(\d+)\]\]/g;
    const pageMarkerMatches = response.match(pageMarkerRegex);

    if (pageMarkerMatches && pageMarkerMatches.length > 0) {
        issuesFound = true;
        warnings.push(
            `⚠️ IA usó ${pageMarkerMatches.length} marcador(es) de página crudos: ${pageMarkerMatches.slice(0, 3).join(', ')}${pageMarkerMatches.length > 3 ? '...' : ''}`
        );

        // Reemplazar patrones comunes
        cleaned = cleaned.replace(
            /\(Detalles en \[\[PAGE_(\d+)\]\]\)/gi,
            '(Consulta el análisis completo en la pestaña "Análisis")'
        );

        cleaned = cleaned.replace(
            /\(Ver \[\[PAGE_(\d+)\]\]\)/gi,
            '(Consulta la pestaña "Análisis")'
        );

        cleaned = cleaned.replace(
            /ver \[\[PAGE_(\d+)\]\]/gi,
            'consultar el análisis completo'
        );

        cleaned = cleaned.replace(
            /página \[\[PAGE_(\d+)\]\]/gi,
            'el análisis completo'
        );

        // Si aún quedan marcadores, removerlos completamente
        cleaned = cleaned.replace(/\[\[PAGE_\d+\]\]/g, '[análisis completo]');
    }

    // 2. Detectar menciones de "página X" sin referencia correcta
    const pageNumberMentionRegex = /\bpágina\s+(\d+)\b/gi;
    const mentionMatches = cleaned.match(pageNumberMentionRegex);

    if (mentionMatches && mentionMatches.length > 0) {
        // Verificar si también hay referencias válidas
        const validRefRegex = /\[Ver en PDF\]\(#ref:[^)]+\)/g;
        const hasValidRefs = cleaned.match(validRefRegex);

        if (!hasValidRefs) {
            warnings.push(
                `ℹ️ Respuesta menciona páginas pero sin referencias clicables. ` +
                `Esto puede confundir al usuario.`
            );
        }
    }

    // 3. Log para debugging
    if (issuesFound && process.env.NODE_ENV === 'development') {
        console.warn('🔍 [Validación Chat] Issues encontrados en respuesta:');
        warnings.forEach(w => console.warn(`   ${w}`));
    }

    return {
        cleanedResponse: cleaned,
        warnings,
        issuesFound
    };
}

/**
 * Extrae estadísticas de referencias en una respuesta
 * 
 * Útil para métricas y debugging
 */
export function getReferencesStats(response: string): {
    validReferencesCount: number;
    invalidMarkersCount: number;
    pageNumberMentionsCount: number;
} {
    const validRefRegex = /\[Ver en PDF\]\(#ref:[^)]+\)/g;
    const pageMarkerRegex = /\[\[PAGE_\d+\]\]/g;
    const pageNumberMentionRegex = /\bpágina\s+\d+\b/gi;

    return {
        validReferencesCount: (response.match(validRefRegex) || []).length,
        invalidMarkersCount: (response.match(pageMarkerRegex) || []).length,
        pageNumberMentionsCount: (response.match(pageNumberMentionRegex) || []).length
    };
}
