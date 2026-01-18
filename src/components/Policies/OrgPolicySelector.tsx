// src/components/Policies/OrgPolicySelector.tsx
/**
 * Selector de pólizas de la organización para vincular a casos.
 * 
 * Permite:
 * - Ver pólizas disponibles de la organización (desde el contenedor virtual)
 * - Buscar/filtrar pólizas
 * - Seleccionar múltiples pólizas
 * - Preview de datos extraídos
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Shield,
  Search,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  User,
  Check,
  X,
  Loader2,
  AlertCircle,
  LinkIcon,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface LinkablePolicy {
  id: string;
  artifactId: string;
  fileName: string;
  fileId?: string;
  extractedAt: string;
  overallConfidence: number;
  policyNumber: string | null;
  insurer: string | null;
  policyType: string | null;
  sumInsured: string | null;
  startDate: string | null;
  endDate: string | null;
  insuredName: string | null;
}

interface OrgPolicySelectorProps {
  orgId: string;
  excludeCaseId?: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OrgPolicySelector({
  orgId,
  excludeCaseId,
  selectedIds,
  onSelectionChange,
  disabled = false,
}: OrgPolicySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<LinkablePolicy[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);

  // Sincronizar selección local con props
  useEffect(() => {
    setLocalSelectedIds(selectedIds);
  }, [selectedIds]);

  // Cargar pólizas cuando se abre el dialog
  const loadPolicies = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (excludeCaseId) {
        params.set('excludeCaseId', excludeCaseId);
      }
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }

      const response = await fetch(`/api/org-policies/linkable?${params.toString()}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cargar pólizas');
      }

      const data = await response.json();
      setPolicies(data.policies || []);
    } catch (err: any) {
      console.error('❌ Error cargando pólizas:', err);
      setError(err.message || 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  }, [excludeCaseId, searchTerm]);

  // Cargar al abrir
  useEffect(() => {
    if (isOpen) {
      loadPolicies();
    }
  }, [isOpen, loadPolicies]);

  // Toggle selección de una póliza
  const togglePolicy = (policyId: string) => {
    setLocalSelectedIds(prev => {
      if (prev.includes(policyId)) {
        return prev.filter(id => id !== policyId);
      }
      return [...prev, policyId];
    });
  };

  // Confirmar selección
  const handleConfirm = () => {
    onSelectionChange(localSelectedIds);
    setIsOpen(false);
  };

  // Cancelar y restaurar selección original
  const handleCancel = () => {
    setLocalSelectedIds(selectedIds);
    setIsOpen(false);
  };

  // Filtrar pólizas por búsqueda local
  const filteredPolicies = policies.filter(policy => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      policy.fileName?.toLowerCase().includes(term) ||
      policy.insurer?.toLowerCase().includes(term) ||
      policy.policyNumber?.toLowerCase().includes(term) ||
      policy.policyType?.toLowerCase().includes(term) ||
      policy.insuredName?.toLowerCase().includes(term)
    );
  });

  // Obtener datos de pólizas seleccionadas para mostrar badges
  const selectedPolicies = policies.filter(p => selectedIds.includes(p.id));

  return (
    <div className="space-y-3">
      {/* Badges de pólizas seleccionadas */}
      {selectedPolicies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedPolicies.map(policy => (
            <Badge
              key={policy.id}
              variant="secondary"
              className="flex items-center gap-1.5 py-1 px-2"
            >
              <LinkIcon className="h-3 w-3" />
              <span className="truncate max-w-[150px]">
                {policy.insurer || policy.fileName}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onSelectionChange(selectedIds.filter(id => id !== policy.id))}
                  className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Botón para abrir selector */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-start gap-2"
          >
            <Shield className="h-4 w-4" />
            {selectedIds.length > 0
              ? `${selectedIds.length} póliza(s) de organización seleccionada(s)`
              : 'Seleccionar pólizas de la organización'}
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Pólizas de la Organización
            </DialogTitle>
            <DialogDescription>
              Selecciona pólizas previamente cargadas para vincularlas a este caso.
              Las pólizas seleccionadas estarán disponibles para análisis y comparación.
            </DialogDescription>
          </DialogHeader>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por aseguradora, número, tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Lista de pólizas */}
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Cargando pólizas...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-destructive">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{error}</span>
              </div>
            ) : filteredPolicies.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No hay pólizas disponibles</p>
                <p className="text-sm">
                  {searchTerm ? 'Intenta con otro término de búsqueda' : 'Carga pólizas desde /policies primero'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPolicies.map(policy => (
                  <PolicyCard
                    key={policy.id}
                    policy={policy}
                    isSelected={localSelectedIds.includes(policy.id)}
                    onToggle={() => togglePolicy(policy.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer con conteo y botones */}
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {localSelectedIds.length} de {filteredPolicies.length} seleccionadas
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-2" />
                Confirmar ({localSelectedIds.length})
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// POLICY CARD SUBCOMPONENT
// ============================================================================

interface PolicyCardProps {
  policy: LinkablePolicy;
  isSelected: boolean;
  onToggle: () => void;
}

function PolicyCard({ policy, isSelected, onToggle }: PolicyCardProps) {
  return (
    <div
      onClick={onToggle}
      className={`
        flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
        ${isSelected 
          ? 'bg-primary/5 border-primary' 
          : 'bg-card hover:bg-muted/50 border-border'
        }
      `}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggle}
        className="mt-1"
      />

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        {/* Header: Aseguradora y número */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium truncate">
              {policy.insurer || 'Aseguradora no identificada'}
            </span>
          </div>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {policy.policyType || 'Tipo N/D'}
          </Badge>
        </div>

        {/* Número de póliza */}
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span>Nº: {policy.policyNumber || 'Sin número'}</span>
        </div>

        {/* Grid de datos */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
          {/* Asegurado */}
          {policy.insuredName && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              <span className="truncate">{policy.insuredName}</span>
            </div>
          )}

          {/* Suma asegurada */}
          {policy.sumInsured && (
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3 w-3" />
              <span className="truncate">{policy.sumInsured}</span>
            </div>
          )}

          {/* Fechas */}
          {(policy.startDate || policy.endDate) && (
            <div className="flex items-center gap-1.5 col-span-2">
              <Calendar className="h-3 w-3" />
              <span>
                {policy.startDate || '?'} → {policy.endDate || '?'}
              </span>
            </div>
          )}
        </div>

        {/* Archivo origen */}
        <div className="mt-2 text-xs text-muted-foreground/70 truncate">
          📄 {policy.fileName}
        </div>
      </div>
    </div>
  );
}

export default OrgPolicySelector;
