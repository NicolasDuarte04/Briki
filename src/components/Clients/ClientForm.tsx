// /src/components/Clients/ClientForm.tsx
'use client';

import { useState } from 'react';
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
import { Loader2, Shield, CreditCard } from 'lucide-react';
import type { DecryptedClient } from '@/lib/clientsDb';
import { useLocale, useTranslations } from 'next-intl';

// ✅ Tipos de identificación soportados
const ID_TYPES = ['CC', 'CE', 'NIT', 'PASSPORT', 'TI', 'RUT', 'DNI', 'RFC', 'OTHER'] as const;

// ✅ Países más comunes (se puede expandir)
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
  
  // ✅ NUEVO: Estado para campos de identificación (Select no usa name nativo)
  const [idType, setIdType] = useState<string>(client?.idType || '');
  const [idCountry, setIdCountry] = useState<string>(client?.idCountry || '');
  
  const isEditMode = !!client;
  
  const resetForm = () => {
    const form = document.getElementById('client-form') as HTMLFormElement;
    if (form) {
      form.reset();
    }
    setIdType('');
    setIdCountry('');
    setError(null);
    setSuccess(null);
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    const formData = new FormData(e.currentTarget);
    
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
          // ✅ NUEVO: Campos de identificación
          idType: idType || undefined,
          idNumber: formData.get('idNumber') || undefined,
          idCountry: idCountry || undefined,
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
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 text-sm">Cifrado Automático</h3>
            <p className="text-xs text-blue-700 mt-1">
              Todos los datos que ingreses serán automáticamente cifrados antes de ser almacenados en la base de datos.
            </p>
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('clientInfo')}</CardTitle>
          <CardDescription>
            Los campos marcados con * son obligatorios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('fullName')} *</Label>
            <Input
              id="name"
              name="name"
              placeholder={t('fullNamePlaceholder')}
              defaultValue={client?.name}
              required
              autoFocus={!isEditMode}
            />
            <p className="text-xs text-muted-foreground">
              Nombre completo del cliente o empresa
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* ✅ NUEVO: Sección de Identificación */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t('identificationSection')}</CardTitle>
          </div>
          <CardDescription>
            Información del documento de identidad del cliente
          </CardDescription>
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
                  {ID_TYPES.map((type) => (
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
            <p className="text-xs text-muted-foreground">
              Este campo se cifra automáticamente
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Información de Contacto */}
      <Card>
        <CardHeader>
          <CardTitle>Información de Contacto</CardTitle>
          <CardDescription>
            Datos de contacto del cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('emailLabel')}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              defaultValue={client?.email || ''}
            />
            <p className="text-xs text-muted-foreground">
              Email principal de contacto
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">{t('phoneLabel')}</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder={t('phonePlaceholder')}
              defaultValue={client?.phone || ''}
            />
            <p className="text-xs text-muted-foreground">
              Número de teléfono con código de país
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">{t('addressLabel')}</Label>
            <Textarea
              id="address"
              name="address"
              placeholder={t('addressPlaceholder')}
              rows={3}
              defaultValue={client?.address || ''}
            />
            <p className="text-xs text-muted-foreground">
              Dirección completa del cliente
            </p>
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
