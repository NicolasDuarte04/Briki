// /src/app/[locale]/(app)/workspace/clients/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the Clients list page.
 * 
 * This component is automatically rendered by Next.js App Router
 * while the clients page is loading, providing instant visual feedback.
 * 
 * Matches the layout structure of the actual clients page for seamless transition.
 */
export default function ClientsLoading() {
  return (
    <div className="container mx-auto py-8 px-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-4" />
            </div>
            <Skeleton className="h-8 w-16 mb-1" />
            {i > 1 && <Skeleton className="h-3 w-20" />}
          </div>
        ))}
      </div>
      
      {/* Security Notice */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-card border rounded-lg p-4 shadow-sm">
            {/* Card Header */}
            <div className="flex items-start gap-3 mb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            
            {/* Card Content */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            
            {/* Card Footer */}
            <div className="flex justify-between items-center pt-3 mt-3 border-t">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

