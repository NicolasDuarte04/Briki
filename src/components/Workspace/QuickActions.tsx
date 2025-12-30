// /src/components/Workspace/QuickActions.tsx
'use client';

import Link from 'next/link';
import { FileText, UserPlus, MessageSquare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackDashboardActionFirst } from '@/lib/telemetry';
import { pathForNewEntity, pathForAgent, getProfilePath, type Locale } from '@/lib/routes/workspace';
import { useUI } from '@/lib/ui/state';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface QuickActionsProps {
  orgId: string;
  locale: Locale;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * QuickActions - Core workspace actions for instant workflow entry
 * 
 * Provides four primary actions: Crear Caso, Analizar Póliza,
 * Nuevo Cliente, and Gestionar Perfil. Each action includes proper
 * accessibility features and event tracking.
 */
export function QuickActions({ orgId, locale }: QuickActionsProps) {
  const dashboardViewTime = useUI((s) => s.dashboardViewTime);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleActionClick = (actionType: 'create_case' | 'analyze_policy' | 'new_client' | 'manage_profile') => {
    const msFromView = dashboardViewTime ? Date.now() - dashboardViewTime : 0;
    trackDashboardActionFirst({
      actionType: actionType,
      msFromView: msFromView,
    });
  };

  const handleCreateCaseClick = () => {
    handleActionClick('create_case');
  };

  const handleAnalyzePolicyClick = () => {
    handleActionClick('analyze_policy');
  };

  const handleClientClick = () => {
    handleActionClick('new_client');
  };

  const handleProfileClick = () => {
    handleActionClick('manage_profile');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Botón 1: Crear Caso */}
      <Button
        asChild
        variant="outline"
        className="h-auto flex-col gap-3 p-6 rounded-card shadow-elev-sm hover:shadow-elev-md transition-shadow bg-card border-border"
        aria-label="Crear nuevo caso con el agente"
        title="Crear nuevo caso con el agente"
      >
        <Link 
          href={pathForAgent(locale)}
          onClick={handleCreateCaseClick}
        >
          <MessageSquare className="size-8 text-primary" aria-hidden="true" />
          <span className="text-base font-semibold text-foreground">Crear Caso</span>
        </Link>
      </Button>

      {/* Botón 2: Analizar Póliza */}
      <Button
        asChild
        variant="outline"
        className="h-auto flex-col gap-3 p-6 rounded-card shadow-elev-sm hover:shadow-elev-md transition-shadow bg-card border-border"
        aria-label="Analizar póliza individual"
        title="Analizar póliza individual"
      >
        <Link 
          href="#"
          onClick={handleAnalyzePolicyClick}
        >
          <FileText className="size-8 text-primary" aria-hidden="true" />
          <span className="text-base font-semibold text-foreground">Analizar Póliza</span>
        </Link>
      </Button>

      {/* Botón 3: Nuevo Cliente */}
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
          <span className="text-base font-semibold text-foreground">Nuevo Cliente</span>
        </Link>
      </Button>

      {/* Botón 4: Gestionar Perfil */}
      <Button
        asChild
        variant="outline"
        className="h-auto flex-col gap-3 p-6 rounded-card shadow-elev-sm hover:shadow-elev-md transition-shadow bg-card border-border"
        aria-label="Configuración de perfil"
        title="Configuración de perfil"
      >
        <Link 
          href={getProfilePath(locale)}
          onClick={handleProfileClick}
        >
          <Settings className="size-8 text-primary" aria-hidden="true" />
          <span className="text-base font-semibold text-foreground">Gestionar Perfil</span>
        </Link>
      </Button>
    </div>
  );
}
