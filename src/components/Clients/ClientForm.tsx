// /src/components/Clients/ClientForm.tsx
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Shield, CreditCard, User, Building2, Heart } from 'lucide-react';
import type { DecryptedClient } from '@/lib/clientsDb';
import { useLocale, useTranslations } from 'next-intl';

// Tipos de identificación por tipo de persona
const ID_TYPES_NATURAL = ['CC', 'CE', 'PASSPORT', 'TI', 'DNI', 'OTHER'] as const;
const ID_TYPES_JURIDICA = ['NIT', 'RUT', 'RFC', 'OTHER'] as const;
const ALL_ID_TYPES = ['CC', 'CE', 'NIT', 'PASSPORT', 'TI', 'RUT', 'DNI', 'RFC', 'OTHER'] as const;

// Opciones de género
const GENDER_OPTIONS = ['male', 'female', 'other', 'preferNotSay'] as const;

// Opciones de estado civil
const MARITAL_STATUS_OPTIONS = ['single', 'married', 'divorced', 'widowed', 'freeUnion', 'separated', 'other'] as const;

// Países más comunes
const COUNTRIES = [
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'PA', name: 'Panamá', flag: '🇵🇦' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
] as const;

interface ClientFormProps {
  orgId: string;
  client?: DecryptedClient; // Si se proporciona, es modo edición
}

export function ClientForm({ orgId, client }: ClientFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('clients.form');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // State for Select fields (Select doesn't use native name)
  const [personType, setPersonType] = useState<string>(client?.personType || 'natural');
  const [idType, setIdType] = useState<string>(client?.idType || '');
  const [idCountry, setIdCountry] = useState<string>(client?.idCountry || '');
  const [gender, setGender] = useState<string>(client?.gender || '');
  const [maritalStatus, setMaritalStatus] = useState<string>(client?.maritalStatus || '');
  
  const isEditMode = !!client;
  const isNatural = personType === 'natural';
  
  // Filter ID types based on person type
  const filteredIdTypes = useMemo(() => {
    return isNatural ? ID_TYPES_NATURAL : ID_TYPES_JURIDICA;
  }, [isNatural]);
  
  // Calculate age from birth date
  const calculateAge = (dateStr: string): number | null => {
    if (!dateStr) return null;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };
  
  const [calculatedAge, setCalculatedAge] = useState<number | null>(() => {
    if (client?.birthDate) {
      const d = client.birthDate instanceof Date ? client.birthDate : new Date(client.birthDate);
      return calculateAge(d.toISOString().split('T')[0]!);
    }
    return null;
  });
  
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCalculatedAge(calculateAge(e.target.value));
  };
  
  // When personType changes, reset idType if it's not valid for the new type
  const handlePersonTypeChange = (value: string) => {
    setPersonType(value);
    const newValidTypes = value === 'natural' ? ID_TYPES_NATURAL : ID_TYPES_JURIDICA;
    if (idType && !(newValidTypes as readonly string[]).includes(idType)) {
      setIdType('');
    }
    // Clear natural-only fields when switching to juridica
    if (value === 'juridica') {
      setGender('');
      setMaritalStatus('');
      setCalculatedAge(null);
    }
  };
  
  const resetForm = () => {
    const form = document.getElementById('client-form') as HTMLFormElement;
    if (form) {
      form.reset();
    }
    setPersonType('natural');
    setIdType('');
    setIdCountry('');
    setGender('');
    setMaritalStatus('');
    setCalculatedAge(null);
    setError(null);
    setSuccess(null);
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    const formData = new FormData(e.currentTarget);
    const birthDateStr = formData.get('birthDate') as string;
    
    try {
      const endpoint = isEditMode 
        ? `/api/clients/${client.id}/update`
        : '/api/clients/create';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orgId,
          name: formData.get('name'),
          email: formData.get('email') || undefined,
          phone: formData.get('phone') || undefined,
          address: formData.get('address') || undefined,
          idType: idType || undefined,
          idNumber: formData.get('idNumber') || undefined,
          idCountry: idCountry || undefined,
          personType: personType,
          lastName: isNatural ? (formData.get('lastName') || undefined) : undefined,
          birthDate: isNatural && birthDateStr ? birthDateStr : undefined,
          gender: isNatural ? (gender || undefined) : undefined,
          occupation: isNatural ? (formData.get('occupation') || undefined) : undefined,
          maritalStatus: isNatural ? (maritalStatus || undefined) : undefined,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar el cliente');
      }
      
      const data = await response.json();
      const clientId = isEditMode ? client.id : data.id;
      
      setSuccess(isEditMode ? '¡Cliente actualizado exitosamente!' : '¡Cliente creado exitosamente!');
      if (!isEditMode) {
        resetForm();
      }
      
      // Redirigir después de 2 segundos para que el usuario vea el mensaje
      setTimeout(() => {
        router.push(`/${locale}/workspace/clients/${clientId}`);
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}
      
      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950/30 dark:border-blue-800">
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">{t('autoEncryption')}</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              {t('encryptionNote')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Card 1: Person Type + Identity */}
      <Card>
        <CardHeader>
          <CardTitle>{t('clientInfo')}</CardTitle>
          <CardDescription>
            {t('encryptionNote')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Person Type Selector */}
          <div className="space-y-2">
            <Label>{t('personTypeLabel')}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={isNatural ? 'default' : 'outline'}
                className="w-full justify-start gap-2"
                onClick={() => handlePersonTypeChange('natural')}
              >
                <User className="h-4 w-4" />
                {t('personTypeNatural')}
              </Button>
              <Button
                type="button"
                variant={!isNatural ? 'default' : 'outline'}
                className="w-full justify-start gap-2"
                onClick={() => handlePersonTypeChange('juridica')}
              >
                <Building2 className="h-4 w-4" />
                {t('personTypeJuridica')}
              </Button>
            </div>
          </div>
          
          {/* Name fields */}
          {isNatural ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('namesLabel')} * 🔒</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t('namesPlaceholder')}
                  defaultValue={client?.name}
                  required
                  autoFocus={!isEditMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('lastNameLabel')} 🔒</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder={t('lastNamePlaceholder')}
                  defaultValue={client?.lastName || ''}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="name">{t('businessNameLabel')} * 🔒</Label>
              <Input
                id="name"
                name="name"
                placeholder={t('businessNamePlaceholder')}
                defaultValue={client?.name}
                required
                autoFocus={!isEditMode}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Card 2: Identification */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t('identificationSection')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="idType">{t('idTypeLabel')}</Label>
              <Select value={idType} onValueChange={setIdType}>
                <SelectTrigger>
                  <SelectValue placeholder={t('idTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {filteredIdTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`idTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="idCountry">{t('idCountryLabel')}</Label>
              <Select value={idCountry} onValueChange={setIdCountry}>
                <SelectTrigger>
                  <SelectValue placeholder={t('idCountryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.flag} {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="idNumber">{t('idNumberLabel')} 🔒</Label>
            <Input
              id="idNumber"
              name="idNumber"
              placeholder={t('idNumberPlaceholder')}
              defaultValue={client?.idNumber || ''}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Card 3: Personal Data (only for natural persons) */}
      {isNatural && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{t('personalDataSection')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Birth Date + Age */}
              <div className="space-y-2">
                <Label htmlFor="birthDate">{t('birthDateLabel')}</Label>
                <div className="flex gap-2 items-end">
                  <Input
                    id="birthDate"
                    name="birthDate"
                    type="date"
                    className="flex-1"
                    defaultValue={
                      client?.birthDate
                        ? (client.birthDate instanceof Date
                            ? client.birthDate.toISOString().split('T')[0]
                            : new Date(client.birthDate).toISOString().split('T')[0])
                        : ''
                    }
                    onChange={handleBirthDateChange}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {calculatedAge !== null && (
                    <span className="text-sm text-muted-foreground whitespace-nowrap pb-2">
                      {t('calculatedAge', { years: calculatedAge })}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Gender */}
              <div className="space-y-2">
                <Label htmlFor="gender">{t('genderLabel')}</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('genderPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {t(`genderOptions.${opt}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Occupation */}
              <div className="space-y-2">
                <Label htmlFor="occupation">{t('occupationLabel')} 🔒</Label>
                <Input
                  id="occupation"
                  name="occupation"
                  placeholder={t('occupationPlaceholder')}
                  defaultValue={client?.occupation || ''}
                />
              </div>
              
              {/* Marital Status */}
              <div className="space-y-2">
                <Label htmlFor="maritalStatus">{t('maritalStatusLabel')}</Label>
                <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('maritalStatusPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {MARITAL_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {t(`maritalStatusOptions.${opt}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Card 4: Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('emailLabel').replace(/Email/i, '') ? 'Información de Contacto' : 'Contact Information'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('emailLabel')} 🔒</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              defaultValue={client?.email || ''}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">{t('phoneLabel')} 🔒</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder={t('phonePlaceholder')}
              defaultValue={client?.phone || ''}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">{t('addressLabel')} 🔒</Label>
            <Textarea
              id="address"
              name="address"
              placeholder={t('addressPlaceholder')}
              rows={3}
              defaultValue={client?.address || ''}
            />
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditMode ? 'Guardando...' : t('creating')}
            </>
          ) : (
            isEditMode ? 'Guardar Cambios' : t('create')
          )}
        </Button>
      </div>
    </form>
  );
}
