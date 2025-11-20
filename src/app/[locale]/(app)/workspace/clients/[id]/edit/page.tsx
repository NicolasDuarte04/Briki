// src/app/[locale]/(app)/workspace/clients/[id]/edit/page.tsx
import { getClientById } from '@/lib/clientsDb';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { notFound } from 'next/navigation';
import { ClientEditContent } from './ClientEditContent';

export const dynamic = 'force-dynamic';

interface EditClientPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { currentOrg } = await getCurrentOrg();
  const { id } = await params;
  
  // Obtener el cliente (los datos ya vienen descifrados)
  const client = await getClientById(id, currentOrg.id);
  
  if (!client) {
    notFound();
  }

  return (
    <ClientEditContent
      client={client}
      clientId={id}
      orgId={currentOrg.id}
    />
  );
}

