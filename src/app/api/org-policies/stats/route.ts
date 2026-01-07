// src/app/api/org-policies/stats/route.ts
/**
 * API para obtener estadísticas de pólizas de la organización.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { 
  getOrgStandalonePolicies, 
  countOrgStandalonePolicies 
} from '@/lib/helpers/getOrgPoliciesContainer';

export const runtime = 'nodejs';

/**
 * Helper para extraer un valor string de campos que pueden ser objetos.
 */
function safeString(value: any, fallback: string = 'No disponible'): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value || fallback;
  }
  if (typeof value === 'object') {
    if (value.name) return String(value.name);
    if (value.value) return String(value.value);
    if (value.text) return String(value.text);
    const firstValue = Object.values(value).find(v => typeof v === 'string' && v.length > 0);
    if (firstValue) return String(firstValue);
    return fallback;
  }
  return String(value);
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [org-policies/stats] Calculando estadísticas...');

    // Autenticación y organización
    const { user, currentOrg } = await getCurrentOrg();
    const orgId = currentOrg.id;

    // Obtener todas las pólizas para calcular estadísticas
    const [total, policies] = await Promise.all([
      countOrgStandalonePolicies(orgId),
      getOrgStandalonePolicies(orgId, { take: 500 }), // Máximo 500 para stats
    ]);

    // Calcular estadísticas
    let totalInsuredValue = 0;
    const confidenceBuckets = { high: 0, medium: 0, low: 0 };
    const coverageTypes: Record<string, number> = {};
    const insurers: Record<string, number> = {};
    const monthlyUploads: Record<string, number> = {};

    policies.forEach((policy) => {
      const data = policy.extractedData as any;
      const confidence = Number(policy.overallConfidence);

      // Confianza
      if (confidence >= 0.8) confidenceBuckets.high++;
      else if (confidence >= 0.5) confidenceBuckets.medium++;
      else confidenceBuckets.low++;

      // Valor asegurado - usar safeString para manejar objetos anidados
      if (data?.sum_insured) {
        const sumStr = safeString(data.sum_insured, '0');
        const value = parseFloat(sumStr.replace(/[^0-9.]/g, ''));
        if (!isNaN(value)) totalInsuredValue += value;
      }

      // Tipo de cobertura - usar safeString para manejar objetos anidados
      const coverageType = safeString(data?.policy_type || data?.insurance_type, 'No especificado');
      coverageTypes[coverageType] = (coverageTypes[coverageType] || 0) + 1;

      // Aseguradora - usar safeString para manejar objetos anidados
      const insurer = safeString(data?.insurer, 'No especificada');
      insurers[insurer] = (insurers[insurer] || 0) + 1;

      // Uploads por mes
      const month = new Date(policy.extractedAt).toISOString().substring(0, 7); // YYYY-MM
      monthlyUploads[month] = (monthlyUploads[month] || 0) + 1;
    });

    // Promedio de confianza
    const avgConfidence = policies.length > 0
      ? policies.reduce((sum, p) => sum + Number(p.overallConfidence), 0) / policies.length
      : 0;

    // Subidas recientes (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUploads = policies.filter(
      (p) => new Date(p.extractedAt) > sevenDaysAgo
    ).length;

    // Top 5 aseguradoras y tipos de cobertura
    const topInsurers = Object.entries(insurers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, percentage: total > 0 ? (count / total) * 100 : 0 }));

    const topCoverageTypes = Object.entries(coverageTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count, percentage: total > 0 ? (count / total) * 100 : 0 }));

    return NextResponse.json({
      success: true,
      stats: {
        total,
        totalInsuredValue,
        averageConfidence: avgConfidence,
        recentUploads,
        confidenceBuckets,
        topInsurers,
        topCoverageTypes,
        monthlyUploads,
        uniqueInsurers: Object.keys(insurers).length,
        uniqueCoverageTypes: Object.keys(coverageTypes).length,
      },
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/org-policies/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
