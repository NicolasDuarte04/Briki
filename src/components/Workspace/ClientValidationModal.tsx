/**
 * ClientValidationModal Component
 * 
 * Modal elegante para validar y crear clientes nuevos.
 * Reemplaza el uso de window.confirm() con una experiencia de usuario mejorada.
 * 
 * @module components/Workspace/ClientValidationModal
 */

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * Props para el componente ClientValidationModal
 */
export interface ClientValidationModalProps {
  /** Nombre del cliente a crear */
  clientName: string;
  /** Si el modal está abierto */
  isOpen: boolean;
  /** Callback cuando se cierra el modal (sin crear cliente) */
  onClose: () => void;
  /** Callback cuando se confirma la creación del cliente */
  onConfirm: (clientId: string) => void;
}

/**
 * Modal de validación de cliente.
 * 
 * Muestra un modal elegante cuando un cliente no existe y permite
 * al usuario decidir si crearlo o cancelar la operación.
 * 
 * @example
 * ```tsx
 * <ClientValidationModal
 *   clientName="Radamel Falcao"
 *   isOpen={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   onConfirm={(clientId) => {
 *     console.log('Cliente creado:', clientId);
 *     setIsModalOpen(false);
 *   }}
 * />
 * ```
 */
export function ClientValidationModal({
  clientName,
  isOpen,
  onClose,
  onConfirm,
}: ClientValidationModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Maneja la creación del cliente
   */
  const handleCreate = async () => {
    if (!clientName?.trim()) {
      setError("El nombre del cliente no puede estar vacío");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/clients/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clientName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Error al crear el cliente",
        }));
        throw new Error(errorData.error || "Error al crear el cliente");
      }

      const data = await response.json();
      const clientId = data.id || data.clientId;

      if (!clientId) {
        throw new Error("No se recibió un ID de cliente válido");
      }

      console.log("✅ Cliente creado exitosamente:", clientId);
      onConfirm(clientId);
      onClose();
    } catch (error: any) {
      console.error("❌ Error creando cliente:", error);
      setError(error.message || "Error al crear el cliente. Por favor intenta de nuevo.");
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Maneja el cierre del modal
   */
  const handleClose = () => {
    if (!isCreating) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Cliente no encontrado
          </DialogTitle>
          <DialogDescription>
            El cliente <strong>"{clientName}"</strong> no existe entre tus
            clientes registrados. ¿Deseas crearlo?
            <br />
            <span className="text-xs text-muted-foreground mt-2 block">
              (Deberás completar sus datos en tu gestor de clientes después)
            </span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div
            className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {error}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="min-w-[120px]"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear Cliente"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


