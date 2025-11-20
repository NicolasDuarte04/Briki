// /src/app/[locale]/(app)/workspace/clients/[id]/page.tsx
import { getClientById } from '@/lib/clientsDb';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { notFound } from 'next/navigation';
import { ClientDetailContent } from './ClientDetailContent';

export const dynamic = 'force-dynamic';

interface ClientDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { currentOrg } = await getCurrentOrg();
  const { id } = await params;
  
  // Obtener el cliente (los datos ya vienen descifrados)
  const client = await getClientById(id, currentOrg.id);
  
  if (!client) {
    notFound();
  }
  
  return <ClientDetailContent client={client} clientId={id} orgId={currentOrg.id} />;
}
