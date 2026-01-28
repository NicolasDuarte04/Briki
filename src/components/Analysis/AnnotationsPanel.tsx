"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquare, Plus, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface AnnotationsPanelProps {
  analysisId: string;
}

interface Annotation {
  id: string;
  text: string;
  author: string;
  createdAt: Date;
}

/**
 * AnnotationsPanel Component - FASE 5
 * 
 * Panel de anotaciones de usuario sobre el análisis:
 * - Lista de anotaciones con timestamps
 * - Agregar nueva anotación
 * - Eliminar anotación
 * 
 * NOTA: Implementación local (solo en memoria).
 * En producción, conectar con sistema de comentarios de la DB.
 * 
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.2.1
 */
export function AnnotationsPanel({ analysisId }: AnnotationsPanelProps) {
  const t = useTranslations('policies.analysis');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newAnnotationText, setNewAnnotationText] = useState('');

  function handleAddAnnotation() {
    if (newAnnotationText.trim()) {
      const newAnnotation: Annotation = {
        id: `ann-${Date.now()}`,
        text: newAnnotationText.trim(),
        author: 'Usuario Actual', // TODO: Obtener del contexto de autenticación
        createdAt: new Date()
      };

      setAnnotations(prev => [newAnnotation, ...prev]);
      setNewAnnotationText('');
      setIsAddingNew(false);
    }
  }

  function handleDeleteAnnotation(id: string) {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
  }

  function handleCancel() {
    setNewAnnotationText('');
    setIsAddingNew(false);
  }

  return (
    <div className="p-4 space-y-4 border-t">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {t('annotations')}
          {annotations.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {annotations.length}
            </Badge>
          )}
        </h3>
        {!isAddingNew && (
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => setIsAddingNew(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Formulario de nueva anotación */}
      {isAddingNew && (
        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
          <Textarea
            placeholder="..."
            value={newAnnotationText}
            onChange={(e) => setNewAnnotationText(e.target.value)}
            className="min-h-[80px] text-sm resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
            >
              <X className="h-3 w-3 mr-1" />
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleAddAnnotation}
              disabled={!newAnnotationText.trim()}
            >
              <Send className="h-3 w-3 mr-1" />
              {t('save')}
            </Button>
          </div>
        </div>
      )}

      {/* Lista de anotaciones */}
      <div className="space-y-3">
        {annotations.length === 0 && !isAddingNew && (
          <div className="text-xs text-muted-foreground text-center py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t('noAnnotationsYet')}</p>
            <p className="mt-1">{t('clickToAddAnnotation')}</p>
          </div>
        )}

        {annotations.map((annotation) => (
          <div
            key={annotation.id}
            className="p-3 bg-background border rounded-lg space-y-2 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-xs font-medium">{annotation.author}</p>
                <p className="text-[10px] text-muted-foreground">
                  {annotation.createdAt.toLocaleString('es-MX', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDeleteAnnotation(annotation.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm whitespace-pre-wrap">{annotation.text}</p>
          </div>
        ))}
      </div>

      {/* Nota sobre persistencia */}
      {annotations.length > 0 && (
        <div className="text-[10px] text-muted-foreground text-center pt-2 border-t">
          <p>💡 Las anotaciones se guardan localmente en esta sesión</p>
          <p className="mt-1">Próximamente: sincronización con equipo</p>
        </div>
      )}
    </div>
  );
}
