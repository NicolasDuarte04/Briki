// /src/app/[locale]/(app)/workspace/clients/page.tsx
import { getClientsByOrg, getClientStatsByOrg } from '@/lib/clientsDb';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { ClientList } from '@/components/Clients/ClientList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Users, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { pathForNewEntity, type Locale } from '@/lib/routes/workspace';

export const dynamic = 'force-dynamic';

export default async function ClientsPage({ params }: { params: { locale: Locale } }) {
  const { currentOrg } = await getCurrentOrg();
  
  // Obtener clientes y estadísticas
  const clients = await getClientsByOrg(currentOrg.id);
  const stats = await getClientStatsByOrg(currentOrg.id);
  
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la información de tus clientes de forma segura
          </p>
        </div>
        <Link href={pathForNewEntity('client', params.locale)}>
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Nuevo Cliente
          </Button>
        </Link>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withEmail}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.withEmail / stats.total) * 100) : 0}% del total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Teléfono</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withPhone}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.withPhone / stats.total) * 100) : 0}% del total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Con Dirección</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withAddress}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.withAddress / stats.total) * 100) : 0}% del total
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
            <h3 className="font-semibold text-blue-900">Datos Cifrados</h3>
            <p className="text-sm text-blue-700 mt-1">
              Toda la información personal de tus clientes está cifrada en la base de datos usando encriptación AES-256.
            </p>
          </div>
        </div>
      </div>
      
      {/* Clients List */}
      <ClientList clients={clients} orgId={currentOrg.id} locale={params.locale} />
    </div>
  );
}
