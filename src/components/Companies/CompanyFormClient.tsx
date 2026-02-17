'use client';

import dynamic from 'next/dynamic';

// Importación dinámica para el componente client-side
const CompanyForm = dynamic(() => import('./CompanyForm').then(mod => ({ default: mod.CompanyForm })), {
  ssr: false,
  loading: () => (
    <div className="space-y-6">
      {/* Security Notice Skeleton */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3 items-center">
          <div className="h-5 w-5 rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent animate-spin" />
          <div>
            <div className="h-4 w-48 bg-blue-200 dark:bg-blue-800 rounded animate-pulse" />
            <div className="h-3 w-64 bg-blue-100 dark:bg-blue-900 rounded mt-2 animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Tabs Skeleton */}
      <div className="h-12 w-full bg-muted rounded-lg animate-pulse" />
      
      {/* Form Card Skeleton */}
      <div className="border rounded-lg p-6 space-y-4">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Navigation Skeleton */}
      <div className="flex justify-between pt-4 border-t">
        <div className="h-10 w-24 bg-muted rounded animate-pulse" />
        <div className="h-10 w-32 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
});

interface CompanyFormClientProps {
  orgId: string;
  userId?: string;
  companyId?: string; // Para modo edición
}

export function CompanyFormClient({ orgId, userId, companyId }: CompanyFormClientProps) {
  return (
    <CompanyForm 
      orgId={orgId} 
      {...(userId && { userId })}
      {...(companyId && { companyId })}
    />
  );
}
