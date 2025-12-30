// /src/components/Workspace/PinButton.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PinnableEntityType } from '@/lib/data/workspace';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface PinButtonProps {
  /** ID of the entity to pin/unpin */
  entityId: string;
  /** Type of entity ('case' | 'client' | 'policy') */
  entityType: PinnableEntityType;
  /** Initial pinned state */
  isPinned: boolean;
  /** Optional callback after toggle */
  onToggle?: (newState: boolean) => void;
  /** Optional className for additional styling */
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * PinButton - Reusable button for pinning/unpinning entities
 * 
 * Visual behavior:
 * - When NOT pinned: Shows on hover only (opacity-0 → opacity-100 on group-hover)
 * - When pinned: Always visible with subtle background
 * 
 * @example
 * <div className="group"> {/* Parent must have 'group' class *\/}
 *   <PinButton
 *     entityId={case.id}
 *     entityType="case"
 *     isPinned={false}
 *   />
 * </div>
 */
export function PinButton({
  entityId,
  entityType,
  isPinned: initialPinned,
  onToggle,
  className,
}: PinButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isPinned, setIsPinned] = useState(initialPinned);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Sync local state with server state after refresh
  useEffect(() => {
    setIsPinned(initialPinned);
  }, [initialPinned]);
  
  const handleClick = async (e: React.MouseEvent) => {
    // Prevent click from propagating to parent Link
    e.preventDefault();
    e.stopPropagation();
    
    // Clear previous errors
    setError(null);
    
    // Start transition state (blocks hover effects)
    setIsTransitioning(true);
    
    // Optimistic update
    const previousState = isPinned;
    setIsPinned(!isPinned);
    
    try {
      const response = await fetch('/api/pins/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityId,
          entityType,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        // Revert optimistic update on error
        setIsPinned(previousState);
        setIsTransitioning(false);
        setError(data.error || 'Error al anclar');
        return;
      }
      
      // Sync with server state
      setIsPinned(data.isPinned);
      
      // Call optional callback
      onToggle?.(data.isPinned);
      
      // Refresh to update dashboard
      startTransition(() => {
        router.refresh();
        // End transition after refresh completes
        setTimeout(() => setIsTransitioning(false), 300);
      });
      
    } catch (err) {
      // Revert optimistic update on network error
      setIsPinned(previousState);
      setIsTransitioning(false);
      setError('Error de conexión');
      console.error('[PinButton] Error:', err);
    }
  };
  
  // Determine button styles based on pinned state
  const buttonClasses = cn(
    // Base styles
    'h-8 w-8 p-0 transition-all duration-200',
    // Pinned state: always visible with consistent background
    isPinned && !isTransitioning && [
      'opacity-100',
      'bg-primary/15 hover:bg-primary/25',
      'dark:bg-primary/15 dark:hover:bg-primary/25',
      'border border-primary/20',
      'text-primary',
    ],
    // Not pinned + transitioning: force hidden (prevents hover ghost)
    !isPinned && isTransitioning && [
      'opacity-0',
    ],
    // Not pinned + not transitioning: hover only
    !isPinned && !isTransitioning && [
      'opacity-0 group-hover:opacity-100',
      'hover:bg-muted',
      'text-muted-foreground hover:text-foreground',
    ],
    // Loading state
    isPending && 'opacity-50 cursor-wait',
    // Custom classes
    className
  );
  
  const iconClasses = cn(
    'h-4 w-4 transition-all duration-200',
    // Pinned: filled icon with slight scale
    isPinned && [
      'fill-primary stroke-primary',
      'scale-110',
    ],
    // Not pinned: outline icon
    !isPinned && [
      'fill-none stroke-current',
    ],
    // Loading: subtle animation
    isPending && 'animate-pulse scale-95'
  );
  
  // Tooltip text
  const title = isPinned 
    ? 'Desanclar' 
    : 'Anclar al dashboard';
  
  const ariaLabel = isPinned
    ? `Desanclar ${entityType}`
    : `Anclar ${entityType} al dashboard`;
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      className={buttonClasses}
      title={error || title}
      aria-label={ariaLabel}
      aria-pressed={isPinned}
    >
      <Pin className={iconClasses} />
    </Button>
  );
}

