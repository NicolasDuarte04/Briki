// /src/components/Cases/CaseList.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CaseCard } from './CaseCard';
import { CaseFilters } from './CaseFilters';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslations } from 'next-intl';

interface CaseListProps {
  cases: any[];
  orgId: string;
  /** Set of pinned case IDs */
  pinnedCaseIds?: Set<string>;
}

export function CaseList({ cases, orgId, pinnedCaseIds = new Set() }: CaseListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const t = useTranslations('cases');
  const tCommon = useTranslations('common');
  
  // Filtrar casos
  const filteredCases = cases.filter(caseItem => {
    const matchesSearch = !searchTerm || 
      caseItem.caseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.clientRef?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || caseItem.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleDeleteClick = (caseId: string) => {
    setCaseToDelete(caseId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!caseToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch('/api/cases/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseId: caseToDelete }),
      });
      
      if (!response.ok) {
        throw new Error('Error deleting case');
      }
      
      // Refrescar la página para mostrar los cambios
      router.refresh();
      setDeleteDialogOpen(false);
      setCaseToDelete(null);
    } catch (error) {
      console.error('Error deleting case:', error);
      // Aquí podrías mostrar un toast de error
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('list.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <CaseFilters
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
        />
      </div>
      
      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {t('list.showingCount', { count: filteredCases.length, total: cases.length })}
      </div>
      
      {/* Cases Grid */}
      {filteredCases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCases.map((caseItem) => (
            <CaseCard 
              key={caseItem.id} 
              caseData={caseItem} 
              onDelete={handleDeleteClick}
              isPinned={pinnedCaseIds.has(caseItem.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
              ? t('list.noResults')
              : t('list.emptyDescription')}
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('delete.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t('delete.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? tCommon('actions.deleting') : t('delete.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
