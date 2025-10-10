/**
 * TrustBadge Component
 * 
 * Displays a single trust badge with an icon and label.
 * 
 * Design System Alignment:
 * - Uses Badge component from ui/badge with outline variant
 * - All colors from CSS design tokens (--briki-*)
 * - Typography via Tailwind scale (text-base, font-medium)
 * - Icon size: w-10 h-10 (40px)
 * - Spacing via Tailwind utilities (h-14, px-6, py-3, gap-3)
 * - No inline styles or hardcoded values
 * 
 * Accessibility:
 * - Icon is decorative (aria-hidden="true") when rendered
 * - Label provides accessible text content
 * - Badge itself is non-interactive (static display)
 * - Inherits focus styles if wrapped in interactive element
 */

import { Badge } from '@/components/ui/badge';

interface TrustBadgeProps {
  icon: React.ReactNode;
  label: string;
  className?: string;
}

export function TrustBadge({ icon, label, className }: TrustBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`h-14 px-6 py-3 gap-3 text-base font-medium text-[var(--briki-text-muted)] border-[var(--briki-border)] ${className || ''}`}
    >
      {typeof icon === 'string' && icon.startsWith('/') ? (
        <img
          src={icon}
          alt=""
          aria-hidden="true"
          className="w-10 h-10"
        />
      ) : typeof icon === 'string' ? (
        <span aria-hidden="true" className="text-3xl leading-none">
          {icon}
        </span>
      ) : (
        <span aria-hidden="true" className="w-10 h-10 flex items-center justify-center">
          {icon}
        </span>
      )}
      <span>{label}</span>
    </Badge>
  );
}

