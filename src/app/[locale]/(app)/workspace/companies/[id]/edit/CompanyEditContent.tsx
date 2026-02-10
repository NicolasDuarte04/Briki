// src/app/[locale]/(app)/workspace/companies/[id]/edit/CompanyEditContent.tsx
'use client';

import { CompanyForm } from '@/components/Companies/CompanyForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { DecryptedCompany } from '@/lib/companiesDb';

interface CompanyEditContentProps {
  company: DecryptedCompany;
  companyId: string;
  orgId: string;
  userId: string;
}

export function CompanyEditContent({ company, companyId, orgId, userId }: CompanyEditContentProps) {
  const locale = useLocale();
  const t = useTranslations('companies.form');

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/${locale}/workspace/companies/${companyId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {t('editTitle')}: {company.legalName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Shield className="h-3 w-3" />
            NIT: {company.nit}
          </p>
        </div>
      </div>

      {/* Formulario de Edición */}
      {/* CompanyForm maneja internamente: submit, error, success, redirección */}
      <CompanyForm 
        orgId={orgId} 
        userId={userId}
        companyId={companyId}
        defaultValues={{
          companyType: company.companyType,
          legalName: company.legalName,
          tradeName: company.tradeName || '',
          nit: company.nit,
          constitutionDate: company.constitutionDate?.toISOString().split('T')[0] || '',
          registrationCity: company.registrationCity || '',
          legalRepName: company.legalRepName || '',
          legalRepIdType: company.legalRepIdType || '',
          legalRepIdNumber: company.legalRepIdNumber || '',
          legalRepEmail: company.legalRepEmail || '',
          legalRepPhone: company.legalRepPhone || '',
          legalRepStartDate: company.legalRepStartDate?.toISOString().split('T')[0] || '',
          annualRevenue: company.annualRevenue || '',
          totalAssets: company.totalAssets || '',
          totalLiabilities: company.totalLiabilities || '',
          totalEquity: company.totalEquity || '',
          financialYear: company.financialYear || new Date().getFullYear(),
          currency: company.currency || 'COP',
          riskClassification: company.riskClassification || 'bajo',
          ciiuCode: company.ciiuCode || '',
          isPep: company.isPep || false,
          isObligatedSubject: company.isObligatedSubject || false,
          lastSarlaftUpdate: company.lastSarlaftUpdate?.toISOString().split('T')[0] || '',
          complianceNotes: company.complianceNotes || '',
        }}
      />
    </div>
  );
}
