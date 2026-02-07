// /src/app/api/companies/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { createCompany } from '@/lib/companiesDb';
import type { CreateCompanyInput, CompanyType, RiskClassification } from '@/lib/companiesDb';

/**
 * POST /api/companies/create
 * 
 * Creates a new company with encrypted PII data.
 * Requires authentication and organization membership.
 * 
 * Body:
 * - legalName: string (required)
 * - nit: string (required)
 * - companyType?: string
 * - tradeName?: string
 * - constitutionDate?: string (ISO date)
 * - registrationCity?: string
 * - legalRepName?: string
 * - legalRepIdType?: string
 * - legalRepIdNumber?: string
 * - legalRepEmail?: string
 * - legalRepPhone?: string
 * - legalRepStartDate?: string (ISO date)
 * - annualRevenue?: string
 * - totalAssets?: string
 * - totalLiabilities?: string
 * - totalEquity?: string
 * - financialYear?: number
 * - currency?: string
 * - riskClassification?: string
 * - ciiuCode?: string
 * - isPep?: boolean
 * - isObligatedSubject?: boolean
 * - lastSarlaftUpdate?: string (ISO date)
 * - complianceNotes?: string
 */
export async function POST(request: NextRequest) {
  try {
    // getCurrentOrg handles authentication and organization validation
    const { currentOrg, user } = await getCurrentOrg();
    
    const body = await request.json();
    const { 
      legalName, 
      nit, 
      companyType,
      tradeName,
      constitutionDate,
      registrationCity,
      legalRepName,
      legalRepIdType,
      legalRepIdNumber,
      legalRepEmail,
      legalRepPhone,
      legalRepStartDate,
      annualRevenue,
      totalAssets,
      totalLiabilities,
      totalEquity,
      financialYear,
      currency,
      riskClassification,
      ciiuCode,
      isPep,
      isObligatedSubject,
      lastSarlaftUpdate,
      complianceNotes,
    } = body;
    
    // Basic validations
    if (!legalName || legalName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Legal name is required' },
        { status: 400 }
      );
    }
    
    if (!nit || nit.trim().length === 0) {
      return NextResponse.json(
        { error: 'NIT is required' },
        { status: 400 }
      );
    }
    
    // NIT format validation (Colombian format: 900123456-7)
    const nitRegex = /^\d{9}-\d$/;
    if (!nitRegex.test(nit.trim())) {
      return NextResponse.json(
        { error: 'Invalid NIT format. Expected: 900123456-7' },
        { status: 400 }
      );
    }
    
    // Prepare input data
    const companyData: CreateCompanyInput = {
      legalName: legalName.trim(),
      nit: nit.trim(),
      ...(companyType && { companyType: companyType as CompanyType }),
      ...(tradeName && { tradeName: tradeName.trim() }),
      ...(constitutionDate && { constitutionDate: new Date(constitutionDate) }),
      ...(registrationCity && { registrationCity: registrationCity.trim() }),
      ...(legalRepName && { legalRepName: legalRepName.trim() }),
      ...(legalRepIdType && { legalRepIdType: legalRepIdType.trim() }),
      ...(legalRepIdNumber && { legalRepIdNumber: legalRepIdNumber.trim() }),
      ...(legalRepEmail && { legalRepEmail: legalRepEmail.trim() }),
      ...(legalRepPhone && { legalRepPhone: legalRepPhone.trim() }),
      ...(legalRepStartDate && { legalRepStartDate: new Date(legalRepStartDate) }),
      ...(annualRevenue && { annualRevenue: annualRevenue.trim() }),
      ...(totalAssets && { totalAssets: totalAssets.trim() }),
      ...(totalLiabilities && { totalLiabilities: totalLiabilities.trim() }),
      ...(totalEquity && { totalEquity: totalEquity.trim() }),
      ...(financialYear && { financialYear: Number(financialYear) }),
      ...(currency && { currency }),
      ...(riskClassification && { riskClassification: riskClassification as RiskClassification }),
      ...(ciiuCode && { ciiuCode: ciiuCode.trim() }),
      isPep: isPep ?? false,
      isObligatedSubject: isObligatedSubject ?? false,
      ...(lastSarlaftUpdate && { lastSarlaftUpdate: new Date(lastSarlaftUpdate) }),
      ...(complianceNotes && { complianceNotes: complianceNotes.trim() }),
    };
    
    // Create the company (data will be automatically encrypted)
    const companyId = await createCompany(currentOrg.id, companyData, user.id);
    
    return NextResponse.json({ id: companyId }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating company:', error);
    
    // Handle encryption key not configured error
    if (error instanceof Error && error.message.includes('APP_ENCRYPTION_KEY')) {
      return NextResponse.json(
        { error: 'Encryption key not configured. Please contact administrator.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
