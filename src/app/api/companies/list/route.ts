// src/app/api/companies/list/route.ts
/**
 * API endpoint para listar empresas en el Combobox de BriefForm
 * Retorna solo ID y nombre (razón social) para máxima eficiencia
 */
import { NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { getCompaniesForCombobox } from '@/lib/companiesDb';

export async function GET() {
    try {
        // getCurrentOrg maneja la autenticación y obtención de la organización actual
        const { currentOrg } = await getCurrentOrg();

        // getCompaniesForCombobox obtiene solo ID y nombre (con caché)
        const companyList = await getCompaniesForCombobox(currentOrg.id);

        return NextResponse.json({ companies: companyList });

    } catch (error: any) {
        console.error('ERROR [API/COMPANIES/LIST]: Failed to fetch companies -', error);
        const errorMessage = process.env.NODE_ENV === 'development' ? error.message : 'Failed to fetch companies';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
