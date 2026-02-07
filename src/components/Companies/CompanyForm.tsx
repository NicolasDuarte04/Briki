// /src/components/Companies/CompanyForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, 
  Shield, 
  Building2, 
  User, 
  DollarSign, 
  Users, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

// Tipos de empresa
const COMPANY_TYPES = ['sas', 'sa', 'ltda', 'eu', 'cooperativa', 'fundacion', 'ong', 'otro'] as const;

// Clasificaciones de riesgo
const RISK_CLASSIFICATIONS = ['bajo', 'medio', 'alto', 'muy_alto'] as const;

// Tipos de documento para representante legal
const ID_TYPES = ['CC', 'CE', 'PASSPORT', 'TI'] as const;

// Monedas
const CURRENCIES = ['COP', 'USD', 'EUR'] as const;

interface CompanyFormProps {
  orgId: string;
  userId?: string;
  companyId?: string; // Para modo edición
}

type TabId = 'identity' | 'legalRep' | 'financial' | 'shareholders' | 'risk';

export function CompanyForm({ orgId, userId, companyId }: CompanyFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('companies.form');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('identity');
  
  // Form state
  const [companyType, setCompanyType] = useState<string>('sas');
  const [riskClassification, setRiskClassification] = useState<string>('bajo');
  const [legalRepIdType, setLegalRepIdType] = useState<string>('');
  const [currency, setCurrency] = useState<string>('COP');
  const [isPep, setIsPep] = useState(false);
  const [isObligatedSubject, setIsObligatedSubject] = useState(false);
  
  const isEditMode = !!companyId;
  const tabs: TabId[] = ['identity', 'legalRep', 'financial', 'shareholders', 'risk'];
  const currentTabIndex = tabs.indexOf(activeTab);
  
  const goToNextTab = () => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1]!);
    }
  };
  
  const goToPreviousTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabs[currentTabIndex - 1]!);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const endpoint = isEditMode 
        ? `/api/companies/${companyId}/update`
        : '/api/companies/create';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgId,
          userId,
          // Sección A: Identidad
          companyType,
          legalName: formData.get('legalName'),
          tradeName: formData.get('tradeName') || undefined,
          nit: formData.get('nit'),
          constitutionDate: formData.get('constitutionDate') || undefined,
          registrationCity: formData.get('registrationCity') || undefined,
          // Sección B: Representante Legal
          legalRepName: formData.get('legalRepName') || undefined,
          legalRepIdType: legalRepIdType || undefined,
          legalRepIdNumber: formData.get('legalRepIdNumber') || undefined,
          legalRepEmail: formData.get('legalRepEmail') || undefined,
          legalRepPhone: formData.get('legalRepPhone') || undefined,
          legalRepStartDate: formData.get('legalRepStartDate') || undefined,
          // Sección C: Financiera
          annualRevenue: formData.get('annualRevenue') || undefined,
          totalAssets: formData.get('totalAssets') || undefined,
          totalLiabilities: formData.get('totalLiabilities') || undefined,
          totalEquity: formData.get('totalEquity') || undefined,
          financialYear: formData.get('financialYear') ? Number(formData.get('financialYear')) : undefined,
          currency,
          riskClassification,
          // Sección E: Riesgo
          ciiuCode: formData.get('ciiuCode') || undefined,
          isPep,
          isObligatedSubject,
          lastSarlaftUpdate: formData.get('lastSarlaftUpdate') || undefined,
          complianceNotes: formData.get('complianceNotes') || undefined,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar la empresa');
      }
      
      const data = await response.json();
      const newCompanyId = isEditMode ? companyId : data.id;
      
      setSuccess(isEditMode ? t('messages.updated') : t('messages.created'));
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        router.push(`/${locale}/workspace/companies/${newCompanyId}`);
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form id="company-form" onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}
      
      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 text-sm">{t('autoEncryption')}</h3>
            <p className="text-xs text-blue-700 mt-1">
              {t('encryptionNote')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Tabs Form */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="identity" className="gap-2">
            <Building2 className="h-4 w-4 hidden sm:block" />
            <span className="text-xs sm:text-sm">{t('tabs.identity')}</span>
          </TabsTrigger>
          <TabsTrigger value="legalRep" className="gap-2">
            <User className="h-4 w-4 hidden sm:block" />
            <span className="text-xs sm:text-sm">{t('tabs.legalRep')}</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <DollarSign className="h-4 w-4 hidden sm:block" />
            <span className="text-xs sm:text-sm">{t('tabs.financial')}</span>
          </TabsTrigger>
          <TabsTrigger value="shareholders" className="gap-2">
            <Users className="h-4 w-4 hidden sm:block" />
            <span className="text-xs sm:text-sm">{t('tabs.shareholders')}</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-2">
            <AlertTriangle className="h-4 w-4 hidden sm:block" />
            <span className="text-xs sm:text-sm">{t('tabs.risk')}</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Tab A: Identidad Corporativa */}
        <TabsContent value="identity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('sectionIdentity')}
              </CardTitle>
              <CardDescription>
                Los campos marcados con * son obligatorios. 🔒 indica cifrado automático.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="legalName">🔒 {t('legalName')} *</Label>
                  <Input
                    id="legalName"
                    name="legalName"
                    placeholder={t('legalNamePlaceholder')}
                    required
                    autoFocus={!isEditMode}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tradeName">🔒 {t('tradeName')}</Label>
                  <Input
                    id="tradeName"
                    name="tradeName"
                    placeholder={t('tradeNamePlaceholder')}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nit">🔒 {t('nit')} *</Label>
                  <Input
                    id="nit"
                    name="nit"
                    placeholder={t('nitPlaceholder')}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyType">{t('companyType')}</Label>
                  <Select value={companyType} onValueChange={setCompanyType}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('companyTypePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`../companyTypes.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="constitutionDate">{t('constitutionDate')}</Label>
                  <Input
                    id="constitutionDate"
                    name="constitutionDate"
                    type="date"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="registrationCity">{t('registrationCity')}</Label>
                  <Input
                    id="registrationCity"
                    name="registrationCity"
                    placeholder={t('registrationCityPlaceholder')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab B: Representación Legal */}
        <TabsContent value="legalRep">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('sectionLegalRep')}
              </CardTitle>
              <CardDescription>
                Información del representante legal de la empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="legalRepName">🔒 {t('legalRepName')}</Label>
                <Input
                  id="legalRepName"
                  name="legalRepName"
                  placeholder={t('legalRepNamePlaceholder')}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="legalRepIdType">{t('legalRepIdType')}</Label>
                  <Select value={legalRepIdType} onValueChange={setLegalRepIdType}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('legalRepIdTypePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {ID_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="legalRepIdNumber">🔒 {t('legalRepIdNumber')}</Label>
                  <Input
                    id="legalRepIdNumber"
                    name="legalRepIdNumber"
                    placeholder={t('legalRepIdNumberPlaceholder')}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="legalRepEmail">🔒 {t('legalRepEmail')}</Label>
                  <Input
                    id="legalRepEmail"
                    name="legalRepEmail"
                    type="email"
                    placeholder={t('legalRepEmailPlaceholder')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="legalRepPhone">🔒 {t('legalRepPhone')}</Label>
                  <Input
                    id="legalRepPhone"
                    name="legalRepPhone"
                    type="tel"
                    placeholder={t('legalRepPhonePlaceholder')}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="legalRepStartDate">{t('legalRepStartDate')}</Label>
                <Input
                  id="legalRepStartDate"
                  name="legalRepStartDate"
                  type="date"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab C: Información Financiera */}
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t('sectionFinancial')}
              </CardTitle>
              <CardDescription>
                Información financiera requerida para cumplimiento SARLAFT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annualRevenue">🔒 {t('annualRevenue')}</Label>
                  <Input
                    id="annualRevenue"
                    name="annualRevenue"
                    placeholder={t('annualRevenuePlaceholder')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="totalAssets">🔒 {t('totalAssets')}</Label>
                  <Input
                    id="totalAssets"
                    name="totalAssets"
                    placeholder={t('totalAssetsPlaceholder')}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalLiabilities">🔒 {t('totalLiabilities')}</Label>
                  <Input
                    id="totalLiabilities"
                    name="totalLiabilities"
                    placeholder={t('totalLiabilitiesPlaceholder')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="totalEquity">🔒 {t('totalEquity')}</Label>
                  <Input
                    id="totalEquity"
                    name="totalEquity"
                    placeholder={t('totalEquityPlaceholder')}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="financialYear">{t('financialYear')}</Label>
                  <Input
                    id="financialYear"
                    name="financialYear"
                    type="number"
                    min="2000"
                    max="2030"
                    placeholder={t('financialYearPlaceholder')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="currency">{t('currency')}</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((curr) => (
                        <SelectItem key={curr} value={curr}>
                          {curr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="riskClassification">{t('riskClassification')}</Label>
                  <Select value={riskClassification} onValueChange={setRiskClassification}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RISK_CLASSIFICATIONS.map((risk) => (
                        <SelectItem key={risk} value={risk}>
                          {t(`../riskLevels.${risk}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab D: Composición Accionaria */}
        <TabsContent value="shareholders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('sectionShareholders')}
              </CardTitle>
              <CardDescription>
                {t('shareholdersDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 border border-dashed rounded-lg p-6 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">{t('shareholders')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  La funcionalidad de composición accionaria estará disponible próximamente.
                  Por ahora, puede agregar esta información en las notas de cumplimiento.
                </p>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900 text-sm">{t('beneficialOwners')}</h3>
                    <p className="text-xs text-amber-700 mt-1">
                      {t('beneficialOwnersDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab E: Datos de Riesgo */}
        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {t('sectionRisk')}
              </CardTitle>
              <CardDescription>
                Información de riesgo y cumplimiento normativo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ciiuCode">{t('ciiuCode')}</Label>
                  <Input
                    id="ciiuCode"
                    name="ciiuCode"
                    placeholder={t('ciiuCodePlaceholder')}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastSarlaftUpdate">{t('lastSarlaftUpdate')}</Label>
                  <Input
                    id="lastSarlaftUpdate"
                    name="lastSarlaftUpdate"
                    type="date"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="isPep" className="font-medium">{t('isPep')}</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('isPepDescription')}
                    </p>
                  </div>
                  <Switch
                    id="isPep"
                    isSelected={isPep}
                    onChange={setIsPep}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="isObligatedSubject" className="font-medium">{t('isObligatedSubject')}</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('isObligatedSubjectDescription')}
                    </p>
                  </div>
                  <Switch
                    id="isObligatedSubject"
                    isSelected={isObligatedSubject}
                    onChange={setIsObligatedSubject}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="complianceNotes">🔒 {t('complianceNotes')}</Label>
                <Textarea
                  id="complianceNotes"
                  name="complianceNotes"
                  placeholder={t('complianceNotesPlaceholder')}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Navigation and Submit */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={goToPreviousTab}
          disabled={currentTabIndex === 0 || isLoading}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          {t('previous')}
        </Button>
        
        <div className="flex gap-2">
          {currentTabIndex < tabs.length - 1 ? (
            <Button
              type="button"
              onClick={goToNextTab}
              disabled={isLoading}
            >
              {t('next')}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditMode ? t('saving') : t('creating')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {isEditMode ? t('save') : t('create')}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
