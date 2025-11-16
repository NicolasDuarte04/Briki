"use client";

import React from 'react';
import { MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnnotationsPanelProps {
  analysisId: string;
}

/**
 * AnnotationsPanel Component - FASE 5
 * 
 * Panel de anotaciones de usuario sobre el análisis:
 * - Anotaciones con timestamps
 * - Menciones a otros miembros del equipo (@mentions)
 * - Agregar nueva anotación
 * 
 * NOTA: Implementación simplificada para FASE 5.
 * En producción, conectar con sistema de comentarios/anotaciones de la DB.
 * 
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.2.1
 */
export function AnnotationsPanel({ analysisId }: AnnotationsPanelProps) {
  // TODO: Implementar sistema de anotaciones completo en próxima fase
  // Por ahora, solo muestra UI estática
  
  return (
    <div className="p-4 space-y-4 border-t">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Anotaciones
        </h3>
        <Button size="sm" variant="ghost">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-xs text-muted-foreground text-center py-8">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No hay anotaciones aún</p>
        <p className="mt-1">Haz clic en el botón + para agregar una</p>
      </div>

      {/* TODO: Implementar lista de anotaciones */}
      {/* TODO: Implementar formulario de nueva anotación */}
      {/* TODO: Implementar @mentions */}
    </div>
  );
}

