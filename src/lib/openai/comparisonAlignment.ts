import { getOpenAIClient, parseAIResponse } from './policyAnalysis';
import { PolicyAnalysis, ComparisonRow } from '@/lib/types';

/**
 * Aligns multiple policy analyses into a unified comparison matrix using AI.
 * 
 * @param analyses - List of policy analyses to compare
 * @returns List of normalized comparison rows
 */
export async function alignPoliciesWithAI(analyses: PolicyAnalysis[]): Promise<ComparisonRow[]> {
  console.log(`🤖 Aligning ${analyses.length} policies with AI...`);

  const openai = getOpenAIClient();
  const prompt = buildAlignmentPrompt(analyses);

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_POLICY_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Eres un actuario experto y analista de seguros. Tu tarea es comparar múltiples pólizas de seguros, normalizar sus coberturas a una ontología común y resaltar las diferencias clave.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2, // Low temperature for consistency
      response_format: { type: 'json_object' }
    });

    const resultText = response.choices[0]?.message?.content || '{}';
    const parsedResult = parseAIResponse(resultText);

    if (!parsedResult.rows || !Array.isArray(parsedResult.rows)) {
      throw new Error('Invalid AI response structure: missing "rows" array');
    }

    // Post-process and validate rows
    const rows: ComparisonRow[] = parsedResult.rows.map((row: any) => ({
      id: row.id || `row-${Math.random().toString(36).substr(2, 9)}`,
      coverageName: row.coverageName,
      category: row.category,
      isMandatory: row.isMandatory || false,
      status: row.status || 'all_present',
      values: row.values // Map of analysisId -> ComparisonCell
    }));

    console.log(`✅ Alignment complete: ${rows.length} rows generated`);
    return rows;

  } catch (error: any) {
    console.error('❌ Error aligning policies:', error);
    throw new Error(`Failed to align policies: ${error.message}`);
  }
}

function buildAlignmentPrompt(analyses: PolicyAnalysis[]): string {
  // Prepare simplified input for the LLM to save tokens
  const inputs = analyses.map(a => ({
    id: a.id,
    insurer: (a.extractedData as any)?.insurer?.name || 'Unknown Insurer',
    coverages: (a.extractedData as any)?.coverages || [],
    deductibles: (a.extractedData as any)?.deductibles || [],
    financials: (a.extractedData as any)?.financials || {}
  }));

  const analysisIdsStr = analyses.map(a => a.id).join('", "');

  return `
Analiza y alinea las siguientes ${analyses.length} pólizas de seguro para crear una tabla comparativa unificada.

INPUT DATA:
${JSON.stringify(inputs, null, 2)}

INSTRUCCIONES:
1. **Normalización**: Identifica coberturas equivalentes que tengan nombres diferentes y agrúpalas bajo un nombre canónico estandarizado.
2. **Estructura**: Genera una lista de filas ("rows"). Cada fila representa una cobertura o característica comparada.
3. **Valores**: Para cada fila, extrae el valor correspondiente de cada póliza.
4. **Status**: Determina si una póliza es "better", "worse", o "equal" en comparación con las demás.

FORMATO DE RESPUESTA (JSON):
{
  "rows": [
    {
      "id": "coverage-rc",
      "coverageName": "Responsabilidad Civil",
      "category": "coverage",
      "isMandatory": true,
      "status": "all_present",
      "values": {
        "${analyses[0]?.id || 'analysis-1'}": {
          "value": {
            "name": "Responsabilidad Civil",
            "limit Amount": 2000000,
            "limitUnit": "MXN",
            "description": "Cobertura de daños a terceros"
          },
          "reference": null,
          "status": "equal",
          "userNote": null
        }
      }
    }
  ]
}

REGLAS CRÍTICAS:
- Si una póliza no tiene la cobertura, "value" debe ser null y "status": "missing".
- Normaliza los montos a una moneda común si es posible.
- Agrupa inteligentemente: No crees filas duplicadas para la misma cobertura.
- Prioriza las coberturas más importantes (RC, Gastos Médicos, Muerte Accidental) al principio.
- IMPORTANTE: En "values", usa los IDs exactos de los análisis: ${analysisIdsStr}
`.trim();
}
