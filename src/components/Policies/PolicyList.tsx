// /src/components/Policies/PolicyList.tsx
/**
 * Lista de pólizas con grid, búsqueda y filtros
 * 
 * Sigue el patrón de CaseList:
 * - Grid responsive de tarjetas
 * - Búsqueda por texto
 * - Filtros por tipo y confianza
 * - Diálogo de confirmación para eliminación
 */
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PolicyCard, type PolicyCardData } from './PolicyCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, FileText } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================================
// TYPES
// ============================================================================

export interface PolicyListProps {
  policies: PolicyCardData[];
  orgId: string;
  /** Set of pinned policy IDs */
  pinnedPolicyIds?: Set<string>;
  /** Base path for policy detail links */
  basePath?: string;
  /** Show filters (default: true) */
  showFilters?: boolean;
}

// ============================================================================
// HELPERS
// ============================================================================

function safeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.name && typeof obj.name === 'string') return obj.name;
    if (obj.value && typeof obj.value === 'string') return obj.value;
  }
  return '';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PolicyList({ 
  policies, 
  orgId, 
  pinnedPolicyIds = new Set(),
  basePath = '/policies/analysis',
  showFilters = true,
}: PolicyListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Extract unique policy types for filter
  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    policies.forEach(policy => {
      const type = safeString(
        policy.extractedData?.policy_type || policy.extractedData?.insurance_type
      );
      if (type) types.add(type);
    });
    return Array.from(types).sort();
  }, [policies]);
  
  // Filter policies
  const filteredPolicies = useMemo(() => {
    return policies.filter(policy => {
      const extractedData = policy.extractedData || {};
      const searchLower = searchTerm.toLowerCase();
      
      // Search match
      const matchesSearch = !searchTerm || 
        safeString(extractedData.policy_number).toLowerCase().includes(searchLower) ||
        safeString(extractedData.insurer).toLowerCase().includes(searchLower) ||
        safeString(extractedData.policy_type).toLowerCase().includes(searchLower) ||
        safeString(extractedData.insurance_type).toLowerCase().includes(searchLower) ||
        safeString(extractedData.insured_name).toLowerCase().includes(searchLower) ||
        policy.artifact?.fileName?.toLowerCase().includes(searchLower);
      
      // Confidence filter
      const confidence = Number(policy.overallConfidence) || 0;
      let matchesConfidence = true;
      if (confidenceFilter === 'high') {
        matchesConfidence = confidence >= 0.8;
      } else if (confidenceFilter === 'medium') {
        matchesConfidence = confidence >= 0.5 && confidence < 0.8;
      } else if (confidenceFilter === 'low') {
        matchesConfidence = confidence < 0.5;
      }
      
      // Type filter
      const policyType = safeString(
        extractedData.policy_type || extractedData.insurance_type
      );
      const matchesType = typeFilter === 'all' || policyType === typeFilter;
      
      return matchesSearch && matchesConfidence && matchesType;
    });
  }, [policies, searchTerm, confidenceFilter, typeFilter]);

  const handleDeleteClick = (policyId: string) => {
    setPolicyToDelete(policyId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!policyToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch('/api/org-policies/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ policyId: policyToDelete }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar la póliza');
      }
      
      // Refresh the page to show changes
      router.refresh();
      setDeleteDialogOpen(false);
      setPolicyToDelete(null);
    } catch (error) {
      console.error('Error deleting policy:', error);
      // Could show a toast here
      alert(error instanceof Error ? error.message : 'Error al eliminar la póliza');
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      {showFilters && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, aseguradora, tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            {/* Confidence Filter */}
            <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Confianza" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="high">Alta (&ge;80%)</SelectItem>
                <SelectItem value="medium">Media (50-79%)</SelectItem>
                <SelectItem value="low">Baja (&lt;50%)</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Type Filter */}
            {uniqueTypes.length > 0 && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo de seguro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {uniqueTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}
      
      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Mostrando {filteredPolicies.length} de {policies.length} pólizas
      </div>
      
      {/* Policies Grid */}
      {filteredPolicies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.map((policy) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              onDelete={handleDeleteClick}
              isPinned={pinnedPolicyIds.has(policy.id)}
              basePath={basePath}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            {searchTerm || confidenceFilter !== 'all' || typeFilter !== 'all'
              ? 'No se encontraron pólizas con los filtros aplicados'
              : 'No hay pólizas todavía. Sube tu primera póliza para comenzar.'}
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar póliza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el análisis
              de la póliza y sus vínculos con casos existentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
