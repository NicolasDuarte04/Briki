'use client';

import dynamic from 'next/dynamic';

// Importación dinámica para el componente client-side
const CompanyForm = dynamic(() => import('./CompanyForm').then(mod => ({ default: mod.CompanyForm })), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="animate-pulse bg-muted h-12 rounded-lg"></div>
      <div className="animate-pulse bg-muted h-64 rounded-lg"></div>
      <div className="animate-pulse bg-muted h-20 rounded-lg"></div>
    </div>
  )
});

interface CompanyFormClientProps {
  orgId: string;
  userId?: string;
  companyId?: string; // Para modo edición
}

export function CompanyFormClient({ orgId, userId, companyId }: CompanyFormClientProps) {
  // exactOptionalPropertyTypes: spread conditional para evitar pasar undefined
  return (
    <CompanyForm 
      orgId={orgId} 
      {...(userId && { userId })}
      {...(companyId && { companyId })}
    />
  );
}
