// src/hooks/useClientValidation.ts
import { useState, useEffect } from 'react';
import { useUI } from '@/lib/ui/state';

type ClientOption = { id: string; name: string };

export function useClientValidation() {
    const { brief, setBrief } = useUI();
    const [clientList, setClientList] = useState<ClientOption[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Carga inicial de clientes
    useEffect(() => {
        setIsLoading(true);
        fetch('/api/clients/list')
            .then(res => res.json())
            .then(data => setClientList(data.clients || []))
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    const validateAndResolveClient = async (): Promise<string | null> => {
        const { clientName, selectedClientId } = brief;

        // Escenario 1: Ya hay un ID seleccionado o el nombre está vacío (cliente opcional).
        if (selectedClientId || !clientName || clientName.trim() === '') {
            return selectedClientId || null;
        }

        // Escenario 2: Hay un nombre pero no ID. Verificar si coincide con uno existente.
        const existingClient = clientList.find(c => c.name.trim().toLowerCase() === clientName.trim().toLowerCase());
        if (existingClient) {
            setBrief({ ...brief, selectedClientId: existingClient.id }); // Corregir estado global
            return existingClient.id;
        }

        // Escenario 3: Nombre nuevo. Confirmar creación.
        const confirmCreation = window.confirm(
            `El cliente "${clientName.trim()}" no existe. ¿Deseas crearlo ahora? (Podrás añadir más detalles después)`
        );
        if (!confirmCreation) {
            // Lanza un error específico para que el llamador lo maneje (ej. mostrar mensaje)
            throw new Error("CLIENT_CREATION_CANCELLED");
        }

        // Escenario 4: Crear nuevo cliente.
        try {
            setIsLoading(true);
            const response = await fetch('/api/clients/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: clientName.trim() }) // La API debe obtener orgId del user
            });
            if (!response.ok) throw new Error('Failed to create client via API');
            const newClient = await response.json();

            if (!newClient || !newClient.id) throw new Error('API did not return a valid client ID');

            setBrief({ ...brief, selectedClientId: newClient.id }); // Actualizar estado global
            return newClient.id; // Retorna el ID del nuevo cliente
        } catch (error) {
            console.error("Error creating new client:", error);
            throw new Error("CLIENT_CREATION_FAILED"); // Lanza error específico
        } finally {
            setIsLoading(false);
        }
    };

    return { validateAndResolveClient, isLoading };
}
