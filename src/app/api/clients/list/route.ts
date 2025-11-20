// src/app/api/clients/list/route.ts
import { NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getClientsForCombobox } from '@/lib/clientsDb'; // Función optimizada para el Combobox

export async function GET() {
    try {
        // getCurrentOrg maneja la autenticación y obtención de la organización actual.
        const { currentOrg } = await getCurrentOrg();

        // getClientsForCombobox obtiene solo ID y nombre (más eficiente)
        const clientList = await getClientsForCombobox(currentOrg.id);

        return NextResponse.json({ clients: clientList });

    } catch (error: any) {
        console.error('ERROR [API/CLIENTS/LIST]: Failed to fetch clients -', error);
        // Evita exponer detalles del error al cliente en producción.
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Failed to fetch clients';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
