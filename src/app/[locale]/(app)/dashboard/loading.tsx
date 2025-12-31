// /src/app/[locale]/(app)/dashboard/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the Dashboard page.
 * 
 * This component is automatically rendered by Next.js App Router
 * while the dashboard page is loading, providing instant visual feedback.
 * 
 * Matches the layout structure of the actual dashboard for seamless transition.
 */
export default function DashboardLoading() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 animate-in fade-in duration-300">
      {/* Header */}
      <Skeleton className="h-10 w-48 mb-8" />
      
      {/* Main grid - matches dashboard layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Row 1: Continue Card (2/3) + Quick Actions (1/3) */}
        <div className="md:col-span-8">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <Skeleton className="h-5 w-40 mb-4" />
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>
        
        <div className="md:col-span-4">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <Skeleton className="h-5 w-36 mb-4" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        </div>
        
        {/* Row 2: Recent Cases + Recent Policies */}
        <div className="md:col-span-6">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
        
        <div className="md:col-span-6">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </div>
        
        {/* Row 3-5: Pinned sections */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="md:col-span-12">
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-36" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-28 rounded-full" />
                <Skeleton className="h-8 w-36 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

