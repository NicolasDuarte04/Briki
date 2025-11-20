'use client';

import dynamic from 'next/dynamic';

// Importación dinámica para el componente client-side
const ClientForm = dynamic(() => import('./ClientForm').then(mod => ({ default: mod.ClientForm })), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="animate-pulse bg-muted h-32 rounded-lg"></div>
      <div className="animate-pulse bg-muted h-20 rounded-lg"></div>
      <div className="animate-pulse bg-muted h-20 rounded-lg"></div>
    </div>
  )
});

interface ClientFormClientProps {
  orgId: string;
}

export function ClientFormClient({ orgId }: ClientFormClientProps) {
  return <ClientForm orgId={orgId} />;
}
