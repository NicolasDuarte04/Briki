// /src/components/Policies/PolicyCard.tsx
/**
 * Tarjeta compacta de póliza para listados
 * 
 * Sigue el patrón de CaseCard y ClientCard:
 * - Link a página de detalle
 * - PinButton para anclar/desanclar
 * - Botón de eliminación
 * - Información resumida de la póliza
 */
'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PinButton } from '@/components/Workspace/PinButton';
import { 
  FileText, 
  Building2, 
  Calendar,
  DollarSign,
  Trash2,
  Shield,
  CheckCircle2,
  AlertCircle,
  Info,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface PolicyCardData {
  id: string;
  artifactId?: string;
  extractedData: {
    policy_number?: string | { value?: string };
    insurer?: string | { name?: string };
    policy_type?: string;
    insurance_type?: string;
    sum_insured?: string | number;
    start_date?: string;
    end_date?: string;
    effective_date?: string;
    expiry_date?: string;
    insured_name?: string;
    policyholder?: { name?: string };
  } | null;
  overallConfidence: number | string;
  extractedAt: Date | string;
  artifact?: {
    fileName?: string | null;
  } | null;
}

export interface PolicyCardProps {
  policy: PolicyCardData;
  onDelete?: (policyId: string) => void;
  /** Whether this policy is pinned by the user */
  isPinned?: boolean;
  /** Base path for policy detail (default: /policies/analysis) */
  basePath?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Safely extract string from potentially nested object
 */
function safeString(value: unknown, fallback: string = 'No disponible'): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') return value || fallback;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (obj.name && typeof obj.name === 'string') return obj.name;
    if (obj.value && typeof obj.value === 'string') return obj.value;
    const firstString = Object.values(obj).find(v => typeof v === 'string' && v.length > 0);
    if (typeof firstString === 'string') return firstString;
  }
  return fallback;
}

function formatDate(dateStr: string | Date | undefined): string {
  if (!dateStr) return 'No disponible';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
}

function formatCurrency(value: string | number | undefined): string {
  if (!value) return 'No disponible';
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  if (isNaN(numValue)) return String(value);
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numValue);
}

// ============================================================================
// CONFIDENCE BADGE
// ============================================================================

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percentage = confidence * 100;
  
  if (percentage >= 80) {
    return (
      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200 text-xs">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        {percentage.toFixed(0)}%
      </Badge>
    );
  }
  if (percentage >= 50) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 text-xs">
        <AlertCircle className="h-3 w-3 mr-1" />
        {percentage.toFixed(0)}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200 text-xs">
      <Info className="h-3 w-3 mr-1" />
      {percentage.toFixed(0)}%
    </Badge>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PolicyCard({ 
  policy, 
  onDelete, 
  isPinned = false,
  basePath = '/policies/analysis',
}: PolicyCardProps) {
  const extractedData = policy.extractedData || {};
  const confidence = Number(policy.overallConfidence) || 0;
  
  // Extract display values safely
  const policyNumber = safeString(extractedData.policy_number, 'Sin número');
  const insurer = safeString(extractedData.insurer, 'Sin aseguradora');
  const policyType = safeString(
    extractedData.policy_type || extractedData.insurance_type, 
    'Sin tipo'
  );
  const sumInsured = extractedData.sum_insured;
  const startDate = extractedData.start_date || extractedData.effective_date;
  const endDate = extractedData.end_date || extractedData.expiry_date;
  const fileName = policy.artifact?.fileName || 'Documento sin nombre';
  
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(policy.id);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow h-full relative group overflow-hidden">
      <Link href={`${basePath}/${policy.id}`} className="block h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 w-full overflow-hidden">
            {/* Icon + Title */}
            <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className="font-semibold text-base truncate max-w-full" title={fileName}>
                  {fileName}
                </h3>
                <p className="text-xs text-muted-foreground truncate max-w-full">
                  #{policyNumber}
                </p>
              </div>
            </div>
            
            {/* Actions: Confidence, Pin, Delete */}
            <div className="flex items-center gap-1 shrink-0 flex-nowrap">
              <ConfidenceBadge confidence={confidence} />
              <PinButton
                entityId={policy.id}
                entityType="policy"
                isPinned={isPinned}
              />
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Eliminar póliza"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-2 pt-0">
          {/* Insurer */}
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground truncate" title={insurer}>
              {insurer}
            </span>
          </div>
          
          {/* Policy Type */}
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground truncate" title={policyType}>
              {policyType}
            </span>
          </div>
          
          {/* Sum Insured */}
          {sumInsured && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">
                {formatCurrency(sumInsured)}
              </span>
            </div>
          )}
          
          {/* Dates */}
          {(startDate || endDate) && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">
                {formatDate(startDate)} - {formatDate(endDate)}
              </span>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-3 border-t text-xs text-muted-foreground">
          Analizada el {formatDate(policy.extractedAt)}
        </CardFooter>
      </Link>
    </Card>
  );
}
