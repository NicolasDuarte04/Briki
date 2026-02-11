// /src/components/Companies/CompanyCard.tsx
'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Shield, User, Hash, AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';
import { PinButton } from '@/components/Workspace/PinButton';
import type { CompanySummary, RiskClassification, CompanyType } from '@/lib/companiesDb';
import { cn } from '@/lib/utils';

interface CompanyCardProps {
  company: CompanySummary;
  /** Whether this company is pinned by the user */
  isPinned?: boolean;
}

/**
 * CompanyCard component for displaying company summary information.
 * Features:
 * - Encrypted data indicator (SARLAFT compliance)
 * - Risk classification badge with color coding
 * - Company type badge
 * - Pin/unpin functionality
 */
export function CompanyCard({ company, isPinned = false }: CompanyCardProps) {
  const t = useTranslations('companies');
  const locale = useLocale();
  
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Risk classification badge styling
  const getRiskBadgeProps = (risk: RiskClassification): { 
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
    icon: React.ReactNode;
  } => {
    switch (risk) {
      case 'bajo':
        return {
          variant: 'outline',
          className: 'border-green-500 text-green-700 bg-green-50 dark:border-green-600 dark:text-green-300 dark:bg-green-950/50',
          icon: <ShieldCheck className="h-3 w-3" />,
        };
      case 'medio':
        return {
          variant: 'outline',
          className: 'border-yellow-500 text-yellow-700 bg-yellow-50 dark:border-yellow-600 dark:text-yellow-300 dark:bg-yellow-950/50',
          icon: <AlertTriangle className="h-3 w-3" />,
        };
      case 'alto':
        return {
          variant: 'outline',
          className: 'border-orange-500 text-orange-700 bg-orange-50 dark:border-orange-600 dark:text-orange-300 dark:bg-orange-950/50',
          icon: <AlertCircle className="h-3 w-3" />,
        };
      case 'muy_alto':
        return {
          variant: 'destructive',
          className: '',
          icon: <AlertCircle className="h-3 w-3" />,
        };
      default:
        return {
          variant: 'secondary',
          className: '',
          icon: null,
        };
    }
  };
  
  // Company type display name
  const getCompanyTypeLabel = (type: CompanyType): string => {
    return t(`companyTypes.${type}`);
  };
  
  const riskProps = getRiskBadgeProps(company.riskClassification);
  
  return (
    <Card className="hover:shadow-lg transition-shadow h-full relative group overflow-hidden">
      <Link href={`/${locale}/workspace/companies/${company.id}`} className="block h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 w-full overflow-hidden">
            <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="font-semibold text-lg truncate max-w-full" title={company.legalName}>
                  {company.legalName}
                </h3>
                {company.tradeName && (
                  <p className="text-sm text-muted-foreground truncate" title={company.tradeName}>
                    {company.tradeName}
                  </p>
                )}
              </div>
            </div>
            {/* Risk badge */}
            <Badge 
              variant={riskProps.variant} 
              className={cn("shrink-0 gap-1", riskProps.className)}
            >
              {riskProps.icon}
              {t(`riskLevels.${company.riskClassification}`)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Encrypted data indicator */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3 shrink-0" />
            <span>{t('card.encryptedData')}</span>
          </div>
          
          {/* NIT */}
          <div className="flex items-center gap-2 text-sm">
            <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              <span className="font-medium">{t('card.nit')}:</span> {company.nit}
            </span>
          </div>
          
          {/* Company Type */}
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">
              <span className="font-medium">{t('card.companyType')}:</span> {getCompanyTypeLabel(company.companyType)}
            </span>
          </div>
        </CardContent>
        
        <CardFooter className="pt-3 border-t flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {t('card.created')} {formatDate(company.createdAt)}
          </span>
          
          {/* Pin button - stops propagation to prevent Link activation */}
          <div className="shrink-0">
            <PinButton
              entityId={company.id}
              entityType="company"
              isPinned={isPinned}
            />
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}
