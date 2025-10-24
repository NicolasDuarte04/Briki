// /src/components/Cases/CaseCard.tsx
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CaseStatusBadge } from './CaseStatusBadge';
import { Clock, FileText, Briefcase, Calendar, Trash2 } from 'lucide-react';
import { useLocale } from 'next-intl';
import { pathForCase, type Locale } from '@/lib/routes/workspace';

interface CaseCardProps {
  caseData: any;
  onDelete?: (caseId: string) => void;
}

export function CaseCard({ caseData, onDelete }: CaseCardProps) {
  const locale = useLocale() as Locale;
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(caseData.id);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow h-full relative group">
      <Link href={pathForCase(caseData.id, locale)} className="block h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg line-clamp-1">
                {caseData.clientName || 'Sin nombre'}
              </h3>
              {caseData.clientRef && (
                <p className="text-sm text-muted-foreground">
                  Ref: {caseData.clientRef}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <CaseStatusBadge status={caseData.status} />
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {caseData.businessType && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{caseData.businessType}</span>
            </div>
          )}
          
          {caseData.employees && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {caseData.employees} empleados
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {caseData.artifacts?.length || 0} documentos
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {caseData.stage}
            </Badge>
            <Badge 
              variant={
                caseData.priority === 'urgent' ? 'destructive' :
                caseData.priority === 'high' ? 'default' :
                'secondary'
              }
              className="text-xs"
            >
              {caseData.priority}
            </Badge>
          </div>
        </CardContent>
        
        <CardFooter className="pt-3 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Actualizado {formatDate(caseData.updatedAt)}</span>
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}
