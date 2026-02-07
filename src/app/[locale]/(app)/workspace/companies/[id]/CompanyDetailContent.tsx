// /src/app/[locale]/(app)/workspace/companies/[id]/CompanyDetailContent.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Shield, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Building2, 
  User,
  CreditCard,
  FileText,
  Users,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  FileCheck
} from 'lucide-react';
import Link from 'next/link';
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { DecryptedCompany } from '@/lib/companiesDb';
import { useLocale, useTranslations } from 'next-intl';

// Helper para obtener nombre legible del tipo de empresa
const getCompanyTypeName = (type: string | null, t: (key: string) => string): string => {
  if (!type) return t('notSpecified');
  const types: Record<string, string> = {
    sas: 'Sociedad por Acciones Simplificada (S.A.S.)',
    sa: 'Sociedad Anónima (S.A.)',
    ltda: 'Sociedad Limitada (Ltda.)',
    eu: 'Empresa Unipersonal (E.U.)',
    cooperativa: 'Cooperativa',
    fundacion: 'Fundación',
    ong: 'ONG',
    otro: 'Otro',
  };
  return types[type] || type;
};

// Helper para obtener el badge de clasificación de riesgo
const getRiskBadge = (risk: string | null, t: (key: string) => string) => {
  if (!risk) return null;
  
  const riskStyles: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
    bajo: { variant: 'secondary', color: 'bg-green-100 text-green-800 border-green-200' },
    medio: { variant: 'outline', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    alto: { variant: 'destructive', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    muy_alto: { variant: 'destructive', color: 'bg-red-100 text-red-800 border-red-200' },
  };
  
  const riskLabels: Record<string, string> = {
    bajo: t('riskLow'),
    medio: t('riskMedium'),
    alto: t('riskHigh'),
    muy_alto: t('riskVeryHigh'),
  };
  
  const style = riskStyles[risk] ?? riskStyles['bajo']!;
  
  return (
    <Badge className={style.color}>
      {riskLabels[risk] || risk}
    </Badge>
  );
};

interface CompanyDetailContentProps {
  company: DecryptedCompany;
  companyId: string;
  orgId: string;
}

export function CompanyDetailContent({ company, companyId }: CompanyDetailContentProps) {
  const locale = useLocale();
  const t = useTranslations('companies');
  const {
    deleteDialogOpen,
    setDeleteDialogOpen,
    isDeleting,
    handleDeleteClick,
    handleDeleteConfirm
  } = useDeleteConfirmation({
    deleteApiEndpoint: `/api/companies/${companyId}/delete`,
    redirectPath: '/workspace/companies',
    itemName: 'empresa'
  });

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/${locale}/workspace/companies`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {company.legalName}
              </h1>
              {company.riskClassification && getRiskBadge(company.riskClassification, t)}
            </div>
            {company.tradeName && company.tradeName !== company.legalName && (
              <p className="text-lg text-muted-foreground mt-1">
                {company.tradeName}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Shield className="h-3 w-3" />
              {t('detail.encryptedData')}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/${locale}/workspace/companies/${companyId}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                {t('detail.edit')}
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              size="sm" 
              className="gap-2"
              onClick={() => handleDeleteClick(companyId)}
            >
              <Trash2 className="h-4 w-4" />
              {t('detail.delete')}
            </Button>
          </div>
        </div>
        
        {/* Tabs for company information */}
        <Tabs defaultValue="identity" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="identity" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('form.tabs.identity')}</span>
            </TabsTrigger>
            <TabsTrigger value="legalRep" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t('form.tabs.legalRep')}</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">{t('form.tabs.financial')}</span>
            </TabsTrigger>
            <TabsTrigger value="shareholders" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t('form.tabs.shareholders')}</span>
            </TabsTrigger>
            <TabsTrigger value="risk" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">{t('form.tabs.risk')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab: Identity */}
          <TabsContent value="identity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t('detail.companyIdentity')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Legal Name */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('form.legalName')} 🔒</div>
                    <div className="font-medium">{company.legalName}</div>
                  </div>
                </div>

                {/* Trade Name */}
                {company.tradeName && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t('form.tradeName')} 🔒</div>
                      <div className="font-medium">{company.tradeName}</div>
                    </div>
                  </div>
                )}

                {/* NIT */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('form.nit')} 🔒</div>
                    <div className="font-medium font-mono">{company.nit}</div>
                  </div>
                </div>

                {/* Company Type */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('form.companyType')}</div>
                    <div className="font-medium">{getCompanyTypeName(company.companyType, t)}</div>
                  </div>
                </div>

                {/* Registration City */}
                {company.registrationCity && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t('detail.registrationCity')}</div>
                      <div className="font-medium">{company.registrationCity}</div>
                    </div>
                  </div>
                )}

                {/* Constitution Date */}
                {company.constitutionDate && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t('detail.constitutionDate')}</div>
                      <div className="font-medium">{formatDate(company.constitutionDate)}</div>
                    </div>
                  </div>
                )}

                {/* CIIU Code */}
                {company.ciiuCode && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <FileCheck className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t('detail.ciiuCode')}</div>
                      <div className="font-medium font-mono">{company.ciiuCode}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Legal Representative */}
          <TabsContent value="legalRep" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('detail.legalRepresentative')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.legalRepName ? (
                  <>
                    {/* Name */}
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">{t('form.legalRepName')} 🔒</div>
                        <div className="font-medium">{company.legalRepName}</div>
                      </div>
                    </div>

                    {/* ID Type & Number */}
                    {company.legalRepIdNumber && (
                      <>
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">{t('form.legalRepIdType')}</div>
                            <div className="font-medium">{company.legalRepIdType || 'CC'}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">{t('form.legalRepIdNumber')} 🔒</div>
                            <div className="font-medium font-mono">{company.legalRepIdNumber}</div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Email */}
                    {company.legalRepEmail && (
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Mail className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">{t('form.legalRepEmail')} 🔒</div>
                          <div className="font-medium">{company.legalRepEmail}</div>
                          <a 
                            href={`mailto:${company.legalRepEmail}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {t('detail.sendEmail')}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Phone */}
                    {company.legalRepPhone && (
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Phone className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">{t('form.legalRepPhone')} 🔒</div>
                          <div className="font-medium">{company.legalRepPhone}</div>
                          <a 
                            href={`tel:${company.legalRepPhone}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {t('detail.call')}
                          </a>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>{t('detail.noLegalRep')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Financial Information */}
          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t('detail.financialInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.annualRevenue || company.totalAssets || company.totalLiabilities || company.totalEquity ? (
                  <>
                    {/* Annual Revenue */}
                    {company.annualRevenue && (
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">{t('detail.annualRevenue')} 🔒</div>
                          <div className="font-medium text-lg">{company.annualRevenue} {company.currency}</div>
                        </div>
                      </div>
                    )}

                    {/* Total Assets */}
                    {company.totalAssets && (
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">{t('detail.totalAssets')} 🔒</div>
                          <div className="font-medium">{company.totalAssets} {company.currency}</div>
                        </div>
                      </div>
                    )}

                    {/* Total Liabilities */}
                    {company.totalLiabilities && (
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">{t('detail.totalLiabilities')} 🔒</div>
                          <div className="font-medium">{company.totalLiabilities} {company.currency}</div>
                        </div>
                      </div>
                    )}

                    {/* Total Equity */}
                    {company.totalEquity && (
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">{t('detail.totalEquity')} 🔒</div>
                          <div className="font-medium">{company.totalEquity} {company.currency}</div>
                        </div>
                      </div>
                    )}

                    {/* Financial Year */}
                    {company.financialYear && (
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">{t('detail.financialYear')}</div>
                          <div className="font-medium">{company.financialYear}</div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>{t('detail.noFinancialInfo')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Shareholders */}
          <TabsContent value="shareholders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('detail.shareholdersInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Shareholders */}
                {company.shareholders && company.shareholders.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">{t('detail.shareholders')} 🔒</h4>
                    <div className="grid gap-3">
                      {company.shareholders.map((shareholder, idx) => (
                        <div key={idx} className="p-3 border rounded-lg bg-muted/50">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{shareholder.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {shareholder.idType}: {shareholder.idNumber}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="font-mono">
                                {shareholder.percentage}%
                              </Badge>
                              {shareholder.isPep && (
                                <Badge variant="destructive" className="ml-2">PEP</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>{t('detail.noShareholders')}</p>
                  </div>
                )}

                {/* Beneficial Owners */}
                {company.beneficialOwners && company.beneficialOwners.length > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium text-sm text-muted-foreground">{t('detail.beneficialOwners')} 🔒</h4>
                    <div className="grid gap-3">
                      {company.beneficialOwners.map((owner, idx) => (
                        <div key={idx} className="p-3 border rounded-lg bg-amber-50/50 border-amber-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{owner.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {owner.idType}: {owner.idNumber}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="font-mono bg-amber-100">
                                {owner.percentage}%
                              </Badge>
                              {owner.isPep && (
                                <Badge variant="destructive" className="ml-2">PEP</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!company.shareholders || company.shareholders.length === 0) && 
                 (!company.beneficialOwners || company.beneficialOwners.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>{t('detail.noShareholders')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Risk & Compliance */}
          <TabsContent value="risk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {t('detail.riskCompliance')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Risk Classification */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('detail.riskClassification')}</div>
                    <div className="mt-1">
                      {company.riskClassification ? getRiskBadge(company.riskClassification, t) : (
                        <span className="text-muted-foreground italic">{t('detail.notClassified')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* PEP Status */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('detail.isPep')}</div>
                    <div className="font-medium mt-1">
                      {company.isPep ? (
                        <Badge variant="destructive">{t('detail.pepYes')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('detail.pepNo')}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Obligated Subject Status */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('detail.isObligatedSubject')}</div>
                    <div className="font-medium mt-1">
                      {company.isObligatedSubject ? (
                        <Badge variant="default">{t('detail.yes')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('detail.no')}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Last SARLAFT Update */}
                {company.lastSarlaftUpdate && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t('detail.lastSarlaftUpdate')}</div>
                      <div className="font-medium">{formatDate(company.lastSarlaftUpdate)}</div>
                    </div>
                  </div>
                )}

                {/* Compliance Notes */}
                {company.complianceNotes && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">{t('detail.complianceNotes')} 🔒</div>
                      <div className="mt-2 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                        {company.complianceNotes}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Metadata Card - always visible */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{t('detail.registrationInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('detail.createdAt')}:</span>
              <span className="font-medium">{formatDate(company.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t('detail.updatedAt')}:</span>
              <span className="font-medium">{formatDate(company.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Security Notice */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-6">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold text-foreground text-sm">{t('detail.securityTitle')}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {t('detail.securityDescription')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        itemName={company.legalName}
        itemType="empresa"
      />
    </>
  );
}
