import { NextRequest, NextResponse } from 'next/server';
import { getCasesByOrg } from '@/lib/database';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

export async function GET(request: NextRequest) {
  try {
    // Obtener usuario y organización actual
    const { currentOrg, user } = await getCurrentOrg();
    
    // Obtener casos de la organización
    const dbCases = await getCasesByOrg(currentOrg.id);
    
    // FILTRO CRÍTICO: Solo cases creados por el usuario actual
    // Esto es temporal hasta que se implemente RLS o se añada userId al modelo Case
    const userCases = dbCases.filter((dbCase: any) => {
      // Por ahora, filtrar por createdAt reciente (últimos 30 días) como proxy
      // TODO: Añadir userId al modelo Case para filtrado real
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(dbCase.createdAt) > thirtyDaysAgo;
    });
    
    // Transformar los casos de la DB al formato esperado por el UI
    const cases = userCases.map((dbCase: any) => ({
      id: dbCase.id,
      referenceNumber: dbCase.referenceNumber || `CASE-${dbCase.id.slice(-6)}`,
      brief: {
        businessType: dbCase.businessType || "Por definir...",
        employees: dbCase.employees || 0,
        coverage: dbCase.coverage || "Por definir...",
        freeText: dbCase.freeText || ""
      },
      status: dbCase.status || "new",
      channel: dbCase.channel || "web",
      policyIds: dbCase.policyIds || [],
      quoteIds: dbCase.quoteIds || [],
      severity: dbCase.severity || "medium",
      createdAt: dbCase.createdAt,
      updatedAt: dbCase.updatedAt,
      // ✅ NUEVO: Campos del sistema de nombres
      caseName: dbCase.caseName || null,
      clientId: dbCase.clientId || null,
      clientName: dbCase.clientName || null,
      customer: dbCase.customer || null,
      // ✅ FASE CLIENTE/EMPRESA: Campos de empresa
      subjectType: dbCase.subjectType || 'client',
      companyId: dbCase.companyId || null,
      // Nuevos campos del Brief detallado
      insurance_category: dbCase.insurance_category,
      max_budget: dbCase.max_budget,
      budget_currency: dbCase.budget_currency || 'COP',
      required_coverages: dbCase.required_coverages || [],
      client_profile: dbCase.client_profile,
    }));
    
    return NextResponse.json({ cases });
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json({ cases: [] }, { status: 500 });
  }
}
