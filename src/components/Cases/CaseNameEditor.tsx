/**
 * CaseNameEditor Component
 * 
 * Modal para editar el nombre de un caso.
 * Se usa en CaseCard y SidebarChatPanel para permitir
 * renombrar casos de manera intuitiva.
 * 
 * @module components/Cases/CaseNameEditor
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Pencil, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

interface CaseNameEditorProps {
  /** ID del caso a renombrar */
  caseId: string;
  /** Nombre actual del caso */
  currentName: string;
  /** Si el modal está abierto */
  open: boolean;
  /** Callback cuando se cierra el modal */
  onOpenChange: (open: boolean) => void;
  /** Callback cuando se actualiza el nombre exitosamente */
  onUpdate?: (newName: string) => void;
}

export function CaseNameEditor({
  caseId,
  currentName,
  open,
  onOpenChange,
  onUpdate,
}: CaseNameEditorProps) {
  const [name, setName] = useState(currentName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resetear estado cuando se abre el modal
  useEffect(() => {
    if (open) {
      setName(currentName);
      setError(null);
      // Focus en el input después de que el modal se abra
      setTimeout(() => {
        inputRef.current?.select();
      }, 100);
    }
  }, [open, currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();

    // Validación local
    if (!trimmedName) {
      setError('El nombre no puede estar vacío');
      return;
    }

    if (trimmedName.length > 255) {
      setError('El nombre no puede exceder 255 caracteres');
      return;
    }

    // Si no cambió, solo cerrar
    if (trimmedName === currentName) {
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/cases/rename', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          caseName: trimmedName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al renombrar el caso');
      }

      toast.success('Caso renombrado exitosamente');
      onUpdate?.(trimmedName);
      onOpenChange(false);

    } catch (err: any) {
      console.error('Error renaming case:', err);
      setError(err.message || 'Error al renombrar el caso');
      toast.error(err.message || 'Error al renombrar el caso');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[425px]"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Editar nombre del caso
          </DialogTitle>
          <DialogDescription>
            Cambia el nombre del caso para identificarlo más fácilmente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="case-name">Nombre del caso</Label>
            <Input
              ref={inputRef}
              id="case-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Ej: Caso de Acme Corp #2"
              maxLength={255}
              disabled={isSubmitting}
              className={error ? 'border-destructive' : ''}
              aria-describedby={error ? 'name-error' : 'name-hint'}
            />
            
            {error && (
              <p id="name-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
            
            <p id="name-hint" className="text-sm text-muted-foreground flex items-start gap-1.5">
              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Puedes usar cualquier nombre personalizado. El nombre aparecerá
                en la lista de casos y en el panel lateral.
              </span>
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CaseNameEditor;
