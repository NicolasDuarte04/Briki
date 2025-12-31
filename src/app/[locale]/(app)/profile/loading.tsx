// /src/app/[locale]/(app)/profile/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton for the Profile page.
 * 
 * This component is automatically rendered by Next.js App Router
 * while the profile page is loading.
 * 
 * Matches the layout structure of the actual profile page for seamless transition.
 */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background animate-in fade-in duration-300">
      {/* Profile Nav skeleton */}
      <div className="border-b">
        <div className="mx-auto w-full max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="mx-auto w-full max-w-4xl px-6 py-8">
        {/* Account Settings Section */}
        <div className="space-y-8">
          {/* Section header */}
          <div>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          
          {/* Profile form */}
          <div className="bg-card border rounded-lg p-6 space-y-6">
            {/* Avatar and name */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            
            {/* Form fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name field */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              {/* Email field */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              {/* Phone field */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              
              {/* Language field */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            
            {/* Address field (full width) */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            
            {/* Save button */}
            <div className="flex justify-end">
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          
          {/* Notifications section */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <Skeleton className="h-6 w-36 mb-4" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            </div>
          </div>
          
          {/* Danger zone (dev) */}
          <div className="border border-destructive/30 rounded-lg p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-80" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
      </div>
    </div>
  );
}

