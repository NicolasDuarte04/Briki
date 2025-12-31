// /src/app/[locale]/(app)/agent/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the Agent page.
 * 
 * This component is automatically rendered by Next.js App Router
 * while the agent page is loading or redirecting to a thread.
 * 
 * Shows a chat-like interface skeleton for smooth visual transition.
 */
export default function AgentLoading() {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      {/* Chat header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded" />
          <Skeleton className="h-9 w-9 rounded" />
        </div>
      </div>
      
      {/* Chat messages area */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {/* Welcome message skeleton */}
        <div className="flex gap-3 max-w-2xl">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
        
        {/* Form/input area skeleton */}
        <div className="mt-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
      
      {/* Chat input area */}
      <div className="border-t p-4">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <Skeleton className="h-12 flex-1 rounded-lg" />
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

