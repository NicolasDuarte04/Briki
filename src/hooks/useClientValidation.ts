// src/hooks/useClientValidation.ts
import { useState, useCallback } from 'react';

export function useClientValidation() {
    const [isLoading, setIsLoading] = useState(false);

    // Función real de validación y creación de clientes
    const validateAndResolveClient = useCallback(async (clientName?: string): Promise<string | null> => {
        if (!clientName || clientName.trim() === '') {
            return null;
        }

        setIsLoading(true);
        
        try {
            // 1. Buscar cliente existente
            const searchResponse = await fetch('/api/clients/list');
            if (searchResponse.ok) {
                const response = await searchResponse.json();
                const clients = response.clients; // Extraer el array de la propiedad 'clients'
                const existingClient = clients.find((c: any) => 
                    c.name.trim().toLowerCase() === clientName.trim().toLowerCase()
                );
                
                if (existingClient) {
                    console.log('✅ Cliente existente encontrado:', existingClient.name);
                    return existingClient.id;
                }
            }

            // 2. Cliente no existe, mostrar confirmación
            const confirmed = window.confirm(
                `El cliente "${clientName.trim()}" no existe entre tus clientes registrados, ¿Deseas crear a este nuevo cliente? (Deberás completar sus datos en tu gestor de clientes después)`
            );
            
            if (!confirmed) {
                throw new Error('CLIENT_CREATION_CANCELLED');
            }

            // 3. Crear nuevo cliente
            const createResponse = await fetch('/api/clients/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: clientName.trim()
                })
            });

            if (!createResponse.ok) {
                const errorData = await createResponse.json();
                throw new Error(errorData.error || 'Error al crear cliente');
            }

            const data = await createResponse.json();
            console.log('✅ Cliente creado exitosamente:', data.id);
            return data.id;

        } catch (error: any) {
            console.error('Error en validación de cliente:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { validateAndResolveClient, isLoading };
}