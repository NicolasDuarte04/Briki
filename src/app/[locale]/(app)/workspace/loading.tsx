// /src/app/[locale]/(app)/workspace/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Generic loading skeleton for workspace routes.
 * 
 * This component serves as a fallback for any workspace child route
 * that doesn't have its own loading.tsx file.
 * 
 * Provides a clean, minimal loading state that works for most list/detail pages.
 */
export default function WorkspaceLoading() {
  return (
    <div className="container mx-auto py-8 px-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <Skeleton className="h-9 w-40 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      
      {/* Stats or summary section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border rounded-lg p-4 shadow-sm">
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      
      {/* Main content area */}
      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48 mb-6" />
          
          {/* Content rows */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="flex-1">
                <Skeleton className="h-5 w-1/3 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

