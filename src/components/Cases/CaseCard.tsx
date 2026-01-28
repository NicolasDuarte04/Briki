// /src/components/Cases/CaseCard.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CaseStatusBadge } from './CaseStatusBadge';
import { CaseNameEditor } from './CaseNameEditor';
import { PinButton } from '@/components/Workspace/PinButton';
import { Clock, FileText, Briefcase, Trash2, Pencil } from 'lucide-react';

interface CaseCardProps {
  caseData: any;
  onDelete?: (caseId: string) => void;
  /** Whether this case is pinned by the user */
  isPinned?: boolean;
}

export function CaseCard({ caseData, onDelete, isPinned = false }: CaseCardProps) {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(
    caseData.caseName || caseData.clientName || 'Sin nombre'
  );

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

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingName(true);
  };

  const handleNameUpdate = (newName: string) => {
    setDisplayName(newName);
    // Refrescar la lista para sincronizar con el servidor
    router.refresh();
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow h-full relative group overflow-hidden">
        <Link href={`/workspace/cases/${caseData.id}`} className="block h-full">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2 w-full overflow-hidden">
              {/* Nombre del caso con botón de edición */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2 overflow-hidden">
                  {/* Botón de edición (lápiz) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditClick}
                    className="h-6 w-6 p-0 flex-shrink-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Editar nombre del caso"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  
                  {/* Nombre con truncado */}
                  <h3 
                    className="font-semibold text-lg truncate max-w-full"
                    title={displayName}
                  >
                    {displayName}
                  </h3>
                </div>
                
                {caseData.clientRef && (
                  <p className="text-sm text-muted-foreground pl-8 truncate">
                    Ref: {caseData.clientRef}
                  </p>
                )}
              </div>
              
              {/* Acciones: Status, Pin, Delete */}
              <div className="flex items-center gap-1 flex-shrink-0 flex-nowrap">
                <CaseStatusBadge status={caseData.status} />
                <PinButton
                  entityId={caseData.id}
                  entityType="case"
                  isPinned={isPinned}
                />
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

      {/* Modal de edición de nombre */}
      <CaseNameEditor
        caseId={caseData.id}
        currentName={displayName}
        open={isEditingName}
        onOpenChange={setIsEditingName}
        onUpdate={handleNameUpdate}
      />
    </>
  );
}
