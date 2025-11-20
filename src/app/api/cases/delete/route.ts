// /src/app/api/cases/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [API/CASES/DELETE]: Petición de eliminación recibida.');
    
    const { user, currentOrg } = await getCurrentOrg();
    const { caseId } = await request.json();

    if (!caseId) {
      console.error('🗑️ [API/CASES/DELETE]: Error - No se proporcionó caseId.');
      return NextResponse.json({ error: 'Case ID is required' }, { status: 400 });
    }
    console.log(`🗑️ [API/CASES/DELETE]: Solicitud para eliminar caso ID: ${caseId} por usuario ${user.id} en Org ${currentOrg.id}`);

    // Búsqueda previa para asegurar que el caso existe y pertenece a la organización
    const caseToDelete = await prisma.case.findFirst({
      where: {
        id: caseId,
        orgId: currentOrg.id,
      },
    });

    if (!caseToDelete) {
        console.warn(`🗑️ [API/CASES/DELETE]: Intento de eliminación fallido. El caso ${caseId} no existe o no pertenece a la organización ${currentOrg.id}.`);
        return NextResponse.json({ error: 'Case not found or access denied.' }, { status: 404 });
    }

    console.log(`🗑️ [API/CASES/DELETE]: Caso encontrado. Procediendo a eliminar.`);
    const deletedCase = await prisma.case.delete({
      where: {
        id: caseId,
      },
    });
    console.log('🗑️ [API/CASES/DELETE]: Caso eliminado exitosamente de la base de datos:', deletedCase);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('🗑️ [API/CASES/DELETE]: Ocurrió un error inesperado durante la eliminación:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
