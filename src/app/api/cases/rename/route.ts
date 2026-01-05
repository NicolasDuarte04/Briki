/**
 * API Route: Rename Case
 * 
 * PUT /api/cases/rename
 * 
 * Permite renombrar un caso existente. El nombre es editable por el usuario
 * y puede ser cualquier texto válido (máx 255 caracteres).
 * 
 * @module api/cases/rename
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { validateCaseName } from '@/lib/case-name-generator';

export async function PUT(request: NextRequest) {
  try {
    // 1. Autenticación y autorización
    const { user, currentOrg } = await getCurrentOrg();
    
    if (!user || !currentOrg) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // 2. Parsear body
    const body = await request.json();
    const { caseId, caseName } = body;

    // 3. Validar campos requeridos
    if (!caseId) {
      return NextResponse.json(
        { error: 'El ID del caso es requerido' },
        { status: 400 }
      );
    }

    // 4. Validar nombre
    const validation = validateCaseName(caseName);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const trimmedName = caseName.trim();

    // 5. Verificar que el caso existe y pertenece a la organización
    const existingCase = await prisma.case.findFirst({
      where: {
        id: caseId,
        orgId: currentOrg.id,
      },
      select: {
        id: true,
        caseName: true,
      },
    });

    if (!existingCase) {
      return NextResponse.json(
        { error: 'Caso no encontrado o sin acceso' },
        { status: 404 }
      );
    }

    // 6. Si el nombre es el mismo, no hacer nada
    if (existingCase.caseName === trimmedName) {
      return NextResponse.json({
        success: true,
        message: 'El nombre no ha cambiado',
        case: existingCase,
      });
    }

    // 7. Actualizar el nombre del caso
    const updatedCase = await prisma.case.update({
      where: {
        id: caseId,
      },
      data: {
        caseName: trimmedName,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        caseName: true,
        clientName: true,
        updatedAt: true,
      },
    });

    console.log(`✅ [API/cases/rename] Caso renombrado: ${existingCase.caseName} → ${trimmedName}`);

    // 8. Registrar en auditoría (opcional, no bloquea)
    try {
      await prisma.auditLog.create({
        data: {
          caseId: caseId,
          orgId: currentOrg.id,
          userId: user.id,
          actor: user.email || 'Sistema',
          action: 'case_renamed',
          tool: 'manual',
          resourceType: 'case',
          resourceId: caseId,
          severity: 'info',
          payload: {
            oldName: existingCase.caseName,
            newName: trimmedName,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (auditError) {
      // No fallar si la auditoría falla
      console.warn('⚠️ [API/cases/rename] Error registrando auditoría:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Caso renombrado exitosamente',
      case: updatedCase,
    });

  } catch (error: any) {
    console.error('❌ [API/cases/rename] Error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Error al renombrar el caso' },
      { status: 500 }
    );
  }
}
