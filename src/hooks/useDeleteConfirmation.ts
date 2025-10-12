// /src/hooks/useDeleteConfirmation.ts
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UseDeleteConfirmationProps {
  deleteApiEndpoint: string;
  redirectPath: string;
  itemName: string; // Para el mensaje de confirmación
}

export function useDeleteConfirmation({
  deleteApiEndpoint,
  redirectPath,
  itemName
}: UseDeleteConfirmationProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (itemId: string) => {
    setItemToDelete(itemId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    setIsDeleting(true);
    try {
      let requestBody = {};
      
      if (deleteApiEndpoint.includes('clients')) {
        // Para clientes, necesitamos obtener el orgId del contexto actual
        // Por ahora usamos un valor placeholder que se manejará en el servidor
        requestBody = { orgId: 'current' };
      } else if (deleteApiEndpoint.includes('cases')) {
        requestBody = { caseId: itemToDelete };
      } else {
        requestBody = { id: itemToDelete };
      }

      const response = await fetch(deleteApiEndpoint, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`Error al eliminar el ${itemName}`);
      }
      
      // Refrescar la página para mostrar los cambios
      router.refresh();
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      
      // Redirigir a la lista
      router.push(redirectPath);
    } catch (error) {
      console.error(`Error deleting ${itemName}:`, error);
      // Aquí podrías mostrar un toast de error
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteDialogOpen,
    setDeleteDialogOpen,
    itemToDelete,
    isDeleting,
    handleDeleteClick,
    handleDeleteConfirm
  };
}
