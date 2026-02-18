// /src/hooks/useDeleteConfirmation.ts
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

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
  const locale = useLocale();
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
      
      if (deleteApiEndpoint.includes('cases')) {
        requestBody = { caseId: itemToDelete };
      } else {
        // Para companies, clients y otros recursos multi-tenant,
        // enviar 'current' para resolver la org server-side
        requestBody = { orgId: 'current' };
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
      router.push(`/${locale}${redirectPath}`);
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
