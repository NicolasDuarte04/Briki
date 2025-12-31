// /src/app/[locale]/(app)/workspace/cases/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the Cases list page.
 * 
 * This component is automatically rendered by Next.js App Router
 * while the cases page is loading, providing instant visual feedback.
 * 
 * Matches the layout structure of the actual cases page for seamless transition.
 */
export default function CasesLoading() {
  return (
    <div className="container mx-auto py-8 px-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border rounded-lg p-4">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </div>
      
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Skeleton className="h-10 flex-1 max-w-md" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      
      {/* Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-card border rounded-lg p-4 shadow-sm">
            {/* Card Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            
            {/* Card Content */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            
            {/* Card Footer */}
            <div className="flex justify-between items-center pt-3 border-t">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

