// /src/components/Companies/CompanyList.tsx
'use client';

import { useState } from 'react';
import { CompanyCard } from './CompanyCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Search, Building2 } from 'lucide-react';
import type { CompanySummary } from '@/lib/companiesDb';
import { useTranslations, useLocale } from 'next-intl';

interface CompanyListProps {
  companies: CompanySummary[];
  orgId: string;
  /** Set of pinned company IDs */
  pinnedCompanyIds?: Set<string>;
}

/**
 * CompanyList component for displaying and filtering companies.
 * Features:
 * - Search by legal name, trade name, or NIT
 * - Pin indication
 * - Empty state with CTA
 */
export function CompanyList({ companies, orgId, pinnedCompanyIds = new Set() }: CompanyListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const t = useTranslations('companies.list');
  const locale = useLocale();
  
  // Filter companies by search term
  const filteredCompanies = companies.filter(company => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      company.legalName.toLowerCase().includes(searchLower) ||
      company.tradeName?.toLowerCase().includes(searchLower) ||
      company.nit.toLowerCase().includes(searchLower)
    );
  });
  
  // Sort: pinned first, then by createdAt
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    const aPinned = pinnedCompanyIds.has(a.id);
    const bPinned = pinnedCompanyIds.has(b.id);
    
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {t('showingCount', { count: filteredCompanies.length, total: companies.length })}
      </div>
      
      {/* Companies Grid */}
      {sortedCompanies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCompanies.map((company) => (
            <CompanyCard 
              key={company.id} 
              company={company} 
              isPinned={pinnedCompanyIds.has(company.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {searchTerm ? t('noResults') : t('empty')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? t('noResults')
              : t('emptyDescription')}
          </p>
          {!searchTerm && (
            <Button asChild>
              <Link href={`/${locale}/workspace/companies/new`}>
                {t('createFirst')}
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
