// /src/components/Cases/CaseStatusBadge.tsx
import { Badge } from '@/components/ui/badge';
import { Circle } from 'lucide-react';

interface CaseStatusBadgeProps {
  status: string;
}

export function CaseStatusBadge({ status }: CaseStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Borrador',
          variant: 'secondary' as const,
          color: 'text-muted-foreground'
        };
      case 'active':
        return {
          label: 'Activo',
          variant: 'default' as const,
          color: 'text-primary'
        };
      case 'completed':
        return {
          label: 'Completado',
          variant: 'outline' as const,
          color: 'text-green-500 dark:text-green-400'
        };
      case 'archived':
        return {
          label: 'Archivado',
          variant: 'secondary' as const,
          color: 'text-muted-foreground/70'
        };
      default:
        return {
          label: status,
          variant: 'outline' as const,
          color: 'text-muted-foreground'
        };
    }
  };
  
  const config = getStatusConfig(status);
  
  return (
    <Badge variant={config.variant} className="gap-1">
      <Circle className={`h-2 w-2 fill-current ${config.color}`} />
      {config.label}
    </Badge>
  );
}
