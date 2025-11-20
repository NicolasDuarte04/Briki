// /src/components/Workspace/QuickActions.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Equal, FileSignature, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PdfUploader } from '@/components/Upload/PdfUploader';
import { trackDashboardActionFirst } from '@/lib/telemetry';
import { pathForNewEntity, pathForAnalysis, type Locale } from '@/lib/routes/workspace';
import { useUI } from '@/lib/ui/state';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface QuickActionsProps {
  orgId: string; // Required for PdfUploader
  locale: Locale;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * QuickActions - Core workspace actions for instant workflow entry
 * 
 * Provides four primary actions: Analizar PDF, Nueva comparación,
 * Crear propuesta, and Nuevo cliente. Each action includes proper
 * accessibility features and event tracking.
 */
export function QuickActions({ orgId, locale }: QuickActionsProps) {
  const router = useRouter();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const dashboardViewTime = useUI((s) => s.dashboardViewTime);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleActionClick = (actionType: 'analyze_pdf' | 'new_comparison' | 'new_proposal' | 'new_client') => {
    const msFromView = dashboardViewTime ? Date.now() - dashboardViewTime : 0;
    trackDashboardActionFirst({
      actionType: actionType,
      msFromView: msFromView,
    });
  };

  const handleAnalyzePdfClick = () => {
    handleActionClick('analyze_pdf');
    setUploadDialogOpen(true);
  };

  const handleComparisonClick = () => {
    handleActionClick('new_comparison');
  };

  const handleProposalClick = () => {
    handleActionClick('new_proposal');
  };

  const handleClientClick = () => {
    handleActionClick('new_client');
  };

  const handleUploadComplete = (upload: any) => {
    // Navigate to analysis detail or comparison seed flow
    // For now, we'll close the dialog and refresh
    // TODO: Navigate to analysis detail using pathForAnalysis(upload.id, locale) when route exists
    setUploadDialogOpen(false);
    router.refresh();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* Action Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Analizar PDF */}
        <Button
          onClick={handleAnalyzePdfClick}
          variant="outline"
          className="h-auto flex-col gap-3 p-6 rounded-card shadow-elev-sm hover:shadow-elev-md transition-shadow bg-card border-border"
          aria-label="Analizar PDF de póliza"
          title="Analizar PDF de póliza"
        >
          <FileText className="size-8 text-primary" aria-hidden="true" />
          <span className="text-base font-semibold text-foreground">Analizar PDF</span>
        </Button>

        {/* Nueva comparación */}
        <Button
          asChild
          variant="outline"
          className="h-auto flex-col gap-3 p-6 rounded-card shadow-elev-sm hover:shadow-elev-md transition-shadow bg-card border-border"
          aria-label="Crear nueva comparación de pólizas"
          title="Crear nueva comparación de pólizas"
        >
          <Link 
            href={pathForNewEntity('comparison', locale)}
            onClick={handleComparisonClick}
          >
            <Equal className="size-8 text-primary" aria-hidden="true" />
            <span className="text-base font-semibold text-foreground">Nueva comparación</span>
          </Link>
        </Button>

        {/* Crear propuesta */}
        <Button
          asChild
          variant="outline"
          className="h-auto flex-col gap-3 p-6 rounded-card shadow-elev-sm hover:shadow-elev-md transition-shadow bg-card border-border"
          aria-label="Crear nueva propuesta"
          title="Crear nueva propuesta"
        >
          <Link 
            href={pathForNewEntity('proposal', locale)}
            onClick={handleProposalClick}
          >
            <FileSignature className="size-8 text-primary" aria-hidden="true" />
            <span className="text-base font-semibold text-foreground">Crear propuesta</span>
          </Link>
        </Button>

        {/* Nuevo cliente */}
        <Button
          asChild
          variant="outline"
          className="h-auto flex-col gap-3 p-6 rounded-card shadow-elev-sm hover:shadow-elev-md transition-shadow bg-card border-border"
          aria-label="Añadir nuevo cliente"
          title="Añadir nuevo cliente"
        >
          <Link 
            href={pathForNewEntity('client', locale)}
            onClick={handleClientClick}
          >
            <UserPlus className="size-8 text-primary" aria-hidden="true" />
            <span className="text-base font-semibold text-foreground">Nuevo cliente</span>
          </Link>
        </Button>
      </div>

      {/* PDF Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent 
          className="max-w-2xl bg-card rounded-card"
          aria-describedby="upload-description"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Analizar PDF de póliza</DialogTitle>
          </DialogHeader>
          <p id="upload-description" className="text-sm text-muted-foreground mb-4">
            Sube un archivo PDF para analizar la póliza y extraer información relevante.
          </p>
          <PdfUploader
            orgId={orgId}
            onUploadComplete={handleUploadComplete}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

