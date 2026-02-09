// /src/app/api/companies/[id]/update/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { updateCompany, getCompanyById } from '@/lib/companiesDb';
import type { UpdateCompanyInput, CompanyType, RiskClassification } from '@/lib/companiesDb';

/**
 * POST /api/companies/[id]/update
 * 
 * Updates an existing company with encrypted PII data.
 * Requires authentication, organization membership, and admin/owner role.
 * 
 * Params:
 * - id: Company UUID
 * 
 * Body: Same as create endpoint (all fields optional except required ones)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { orgId } = body;
    
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    // Verificar que el usuario pertenece a la organización y obtener su rol
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single();
    
    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of this organization' },
        { status: 403 }
      );
    }
    
    // Verify user has permission to update (admin or owner)
    if (membership.role !== 'admin' && membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and owners can update companies.' },
        { status: 403 }
      );
    }
    
    // Verify company exists and belongs to the organization
    const existingCompany = await getCompanyById(companyId, orgId);
    if (!existingCompany) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }
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
    
    // Basic validations for required fields
    if (legalName !== undefined && legalName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Legal name cannot be empty' },
        { status: 400 }
      );
    }
    
    if (nit !== undefined && nit.trim().length === 0) {
      return NextResponse.json(
        { error: 'NIT cannot be empty' },
        { status: 400 }
      );
    }
    
    // NIT format validation if provided
    if (nit) {
      const nitRegex = /^\d{9}-\d$/;
      if (!nitRegex.test(nit.trim())) {
        return NextResponse.json(
          { error: 'Invalid NIT format. Expected: 900123456-7' },
          { status: 400 }
        );
      }
    }
    
    // Prepare update data (only include fields that were provided)
    const updateData: UpdateCompanyInput = {};
    
    if (legalName !== undefined) updateData.legalName = legalName.trim();
    if (nit !== undefined) updateData.nit = nit.trim();
    if (companyType !== undefined) updateData.companyType = companyType as CompanyType;
    if (tradeName !== undefined) updateData.tradeName = tradeName?.trim() || undefined;
    if (constitutionDate !== undefined && constitutionDate) updateData.constitutionDate = new Date(constitutionDate);
    if (registrationCity !== undefined) updateData.registrationCity = registrationCity?.trim() || undefined;
    if (legalRepName !== undefined) updateData.legalRepName = legalRepName?.trim() || undefined;
    if (legalRepIdType !== undefined) updateData.legalRepIdType = legalRepIdType?.trim() || undefined;
    if (legalRepIdNumber !== undefined) updateData.legalRepIdNumber = legalRepIdNumber?.trim() || undefined;
    if (legalRepEmail !== undefined) updateData.legalRepEmail = legalRepEmail?.trim() || undefined;
    if (legalRepPhone !== undefined) updateData.legalRepPhone = legalRepPhone?.trim() || undefined;
    if (legalRepStartDate !== undefined && legalRepStartDate) updateData.legalRepStartDate = new Date(legalRepStartDate);
    if (annualRevenue !== undefined) updateData.annualRevenue = annualRevenue?.trim() || undefined;
    if (totalAssets !== undefined) updateData.totalAssets = totalAssets?.trim() || undefined;
    if (totalLiabilities !== undefined) updateData.totalLiabilities = totalLiabilities?.trim() || undefined;
    if (totalEquity !== undefined) updateData.totalEquity = totalEquity?.trim() || undefined;
    if (financialYear !== undefined && financialYear) updateData.financialYear = Number(financialYear);
    if (currency !== undefined) updateData.currency = currency || 'COP';
    if (riskClassification !== undefined) updateData.riskClassification = riskClassification as RiskClassification;
    if (ciiuCode !== undefined) updateData.ciiuCode = ciiuCode?.trim() || undefined;
    if (isPep !== undefined) updateData.isPep = isPep;
    if (isObligatedSubject !== undefined) updateData.isObligatedSubject = isObligatedSubject;
    if (lastSarlaftUpdate !== undefined && lastSarlaftUpdate) updateData.lastSarlaftUpdate = new Date(lastSarlaftUpdate);
    if (complianceNotes !== undefined) updateData.complianceNotes = complianceNotes?.trim() || undefined;
    
    // Update the company (data will be automatically encrypted)
    const success = await updateCompany(companyId, orgId, updateData, user.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update company' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true, id: companyId }, { status: 200 });
    
  } catch (error) {
    console.error('Error updating company:', error);
    
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
