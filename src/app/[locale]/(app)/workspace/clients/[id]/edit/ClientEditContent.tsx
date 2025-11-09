// src/app/[locale]/(app)/workspace/clients/[id]/edit/ClientEditContent.tsx
'use client';

import { ClientForm } from '@/components/Clients/ClientForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { DecryptedClient } from '@/lib/clientsDb';

interface ClientEditContentProps {
  client: DecryptedClient;
  clientId: string;
  orgId: string;
}

export function ClientEditContent({ client, clientId, orgId }: ClientEditContentProps) {
  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/workspace/clients/${clientId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Editar Cliente: {client.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ID: {client.id}
          </p>
        </div>
      </div>

      {/* Formulario de Edición */}
      {/* ClientForm maneja internamente: submit, error, success, redirección */}
      <ClientForm orgId={orgId} client={client} />
    </div>
  );
}

