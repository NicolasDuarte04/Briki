// /src/app/[locale]/(app)/workspace/clients/[id]/ClientDetailContent.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Trash2, Shield, Mail, Phone, MapPin, Calendar, CreditCard, Globe, User, Building2, Heart, Briefcase, Users } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation';
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog';
import { DecryptedClient } from '@/lib/clientsDb';
import { useLocale, useTranslations } from 'next-intl';

// ✅ Helper para obtener nombre de país y bandera
const getCountryInfo = (code: string | null): { name: string; flag: string } => {
  const countries: Record<string, { name: string; flag: string }> = {
    CO: { name: 'Colombia', flag: '🇨🇴' },
    MX: { name: 'México', flag: '🇲🇽' },
    AR: { name: 'Argentina', flag: '🇦🇷' },
    CL: { name: 'Chile', flag: '🇨🇱' },
    PE: { name: 'Perú', flag: '🇵🇪' },
    EC: { name: 'Ecuador', flag: '🇪🇨' },
    US: { name: 'Estados Unidos', flag: '🇺🇸' },
    ES: { name: 'España', flag: '🇪🇸' },
    BR: { name: 'Brasil', flag: '🇧🇷' },
    VE: { name: 'Venezuela', flag: '🇻🇪' },
    PA: { name: 'Panamá', flag: '🇵🇦' },
    CR: { name: 'Costa Rica', flag: '🇨🇷' },
  };
  return code ? countries[code] || { name: code, flag: '🌍' } : { name: 'No especificado', flag: '🌍' };
};

// ✅ Helper para obtener nombre legible del tipo de documento
const getIdTypeName = (type: string | null, t: (key: string) => string): string => {
  if (!type) return 'No especificado';
  const types: Record<string, string> = {
    CC: 'Cédula de Ciudadanía',
    CE: 'Cédula de Extranjería',
    NIT: 'NIT',
    PASSPORT: 'Pasaporte',
    TI: 'Tarjeta de Identidad',
    RUT: 'RUT',
    DNI: 'DNI',
    RFC: 'RFC',
    OTHER: 'Otro',
  };
  return types[type] || type;
};

interface ClientDetailContentProps {
  client: DecryptedClient;
  clientId: string;
  orgId: string;
}

export function ClientDetailContent({ client, clientId, orgId }: ClientDetailContentProps) {
  const locale = useLocale();
  const t = useTranslations('clients.detail');
  const {
    deleteDialogOpen,
    setDeleteDialogOpen,
    isDeleting,
    handleDeleteClick,
    handleDeleteConfirm
  } = useDeleteConfirmation({
    deleteApiEndpoint: `/api/clients/${clientId}/delete`,
    redirectPath: '/workspace/clients',
    itemName: 'cliente'
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
  
  const isNatural = client.personType !== 'juridica';
  const displayName = isNatural && client.lastName
    ? `${client.name} ${client.lastName}`
    : client.name;
  
  const calculateAge = (date: Date | string): number | null => {
    const birth = new Date(date);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };
  
  // Translation helpers for gender and marital status
  const getGenderLabel = (gender: string | null): string => {
    if (!gender) return t('notRegistered');
    const map: Record<string, string> = {
      male: locale === 'es' ? 'Masculino' : 'Male',
      female: locale === 'es' ? 'Femenino' : 'Female',
      other: locale === 'es' ? 'Otro' : 'Other',
      preferNotSay: locale === 'es' ? 'Prefiere no decir' : 'Prefer not to say',
    };
    return map[gender] || gender;
  };
  
  const getMaritalStatusLabel = (status: string | null): string => {
    if (!status) return t('notRegistered');
    const map: Record<string, string> = {
      single: locale === 'es' ? 'Soltero/a' : 'Single',
      married: locale === 'es' ? 'Casado/a' : 'Married',
      divorced: locale === 'es' ? 'Divorciado/a' : 'Divorced',
      widowed: locale === 'es' ? 'Viudo/a' : 'Widowed',
      freeUnion: locale === 'es' ? 'Unión Libre' : 'Common-law',
      separated: locale === 'es' ? 'Separado/a' : 'Separated',
      other: locale === 'es' ? 'Otro' : 'Other',
    };
    return map[status] || status;
  };
  
  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/${locale}/workspace/clients`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {displayName}
              </h1>
              <Badge variant="outline" className="text-xs">
                {isNatural ? (
                  <><User className="h-3 w-3 mr-1" />{t('personNatural')}</>
                ) : (
                  <><Building2 className="h-3 w-3 mr-1" />{t('personJuridica')}</>
                )}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Shield className="h-3 w-3" />
              {t('encryptedInfo')}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/${locale}/workspace/clients/${clientId}/edit`}>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Editar
              </Button>
            </Link>
            <Button 
              variant="destructive" 
              size="sm" 
              className="gap-2"
              onClick={() => handleDeleteClick(clientId)}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          </div>
        </div>
        
        {/* Client Information Card */}
        <div className="space-y-6">
          {/* ✅ NUEVO: Tarjeta de Identificación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('identificationInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.idNumber ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t('idType')}</div>
                      <div className="font-medium">{getIdTypeName(client.idType, t)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t('idNumber')} 🔒</div>
                      <div className="font-medium font-mono">{client.idNumber}</div>
                    </div>
                  </div>
                  
                  {client.idCountry && (
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Globe className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">{t('idCountry')}</div>
                        <div className="font-medium">
                          {getCountryInfo(client.idCountry).flag} {getCountryInfo(client.idCountry).name}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{t('idNumber')}</div>
                    <div className="text-muted-foreground italic">{t('notRegistered')}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Personal Data Card (only for natural persons) */}
          {isNatural && (client.birthDate || client.gender || client.occupation || client.maritalStatus) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  {t('personalDataInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.birthDate && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-pink-100 dark:bg-pink-950/30 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t('birthDate')}</div>
                      <div className="font-medium">
                        {new Date(client.birthDate).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                        {(() => {
                          const age = calculateAge(client.birthDate!);
                          return age !== null ? ` (${t('ageYears', { years: age })})` : '';
                        })()}
                      </div>
                    </div>
                  </div>
                )}
                
                {client.gender && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-950/30 flex items-center justify-center">
                      <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t('gender')}</div>
                      <div className="font-medium">{getGenderLabel(client.gender)}</div>
                    </div>
                  </div>
                )}
                
                {client.occupation && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t('occupation')} 🔒</div>
                      <div className="font-medium">{client.occupation}</div>
                    </div>
                  </div>
                )}
                
                {client.maritalStatus && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-950/30 flex items-center justify-center">
                      <Users className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">{t('maritalStatus')}</div>
                      <div className="font-medium">{getMaritalStatusLabel(client.maritalStatus)}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* Información de Contacto */}
          <Card>
            <CardHeader>
              <CardTitle>{t('contactInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {client.email ? (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium">{client.email}</div>
                    <a 
                      href={`mailto:${client.email}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Enviar correo
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="text-muted-foreground italic">No registrado</div>
                  </div>
                </div>
              )}
              
              {client.phone ? (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Teléfono</div>
                    <div className="font-medium">{client.phone}</div>
                    <a 
                      href={`tel:${client.phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Llamar
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Teléfono</div>
                    <div className="text-muted-foreground italic">No registrado</div>
                  </div>
                </div>
              )}
              
              {client.address ? (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Dirección</div>
                    <div className="font-medium">{client.address}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Dirección</div>
                    <div className="text-muted-foreground italic">No registrada</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Registro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Creado:</span>
                <span className="font-medium">{formatDate(client.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Última actualización:</span>
                <span className="font-medium">{formatDate(client.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
          
          {/* Security Notice */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground text-sm">Seguridad de Datos</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Todos los datos personales de este cliente están cifrados en la base de datos usando encriptación AES-256. 
                  Solo los miembros autorizados de tu organización pueden acceder a esta información.
                </p>
              </div>
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
        itemName={client.name}
        itemType="cliente"
      />
    </>
  );
}
