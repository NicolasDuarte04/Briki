// /src/app/[locale]/(app)/workspace/clients/page.tsx
import { getClientsByOrg } from '@/lib/clientsDb';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getUserPins } from '@/lib/data/workspace';
import { ClientList } from '@/components/Clients/ClientList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Users, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranslations, getLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const { user, currentOrg } = await getCurrentOrg();
  const t = await getTranslations('clients');
  const locale = await getLocale();
  
  // Obtener clientes y pins del usuario en paralelo
  // NOTA: Stats se calculan en memoria para evitar transacciones duplicadas
  const [clients, userPins] = await Promise.all([
    getClientsByOrg(currentOrg.id),
    getUserPins(user.id),
  ]);
  
  // Calcular stats en memoria (evita llamada duplicada a getClientsByOrg)
  const stats = {
    total: clients.length,
    withEmail: clients.filter(c => c.email).length,
    withPhone: clients.filter(c => c.phone).length,
    withAddress: clients.filter(c => c.address).length,
  };
  
  // Convertir a Set para búsqueda eficiente
  const pinnedClientIds = new Set(userPins.clients);
  
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Link href={`/${locale}/workspace/clients/new`}>
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            {t('newClient')}
          </Button>
        </Link>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.total')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.withEmail')}</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withEmail}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0}% {t('stats.ofTotal')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.withPhone')}</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withPhone}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.withPhone / stats.total) * 100) : 0}% {t('stats.ofTotal')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.withAddress')}</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withAddress}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.withAddress / stats.total) * 100) : 0}% {t('stats.ofTotal')}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <div className="text-blue-600 mt-0.5">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">{t('security.title')}</h3>
            <p className="text-sm text-blue-700 mt-1">
              {t('security.description')}
            </p>
          </div>
        </div>
      </div>
      
      {/* Clients List */}
      <ClientList clients={clients} orgId={currentOrg.id} pinnedClientIds={pinnedClientIds} />
    </div>
  );
}
