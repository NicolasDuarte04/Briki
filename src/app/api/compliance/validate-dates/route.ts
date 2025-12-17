import { NextResponse } from "next/server";

/**
 * POST /api/compliance/validate-dates
 * 
 * Valida fechas de vigencia de póliza con dos modos:
 * 1. Validación básica: startDate < endDate, vigencia > 1 día
 * 2. Verificación de vigencia: Si se pasa `checkDate`, verifica si la póliza
 *    está vigente en esa fecha específica
 * 
 * Body:
 * - startDate: string (ISO date) - Fecha de inicio de vigencia
 * - endDate: string (ISO date) - Fecha de fin de vigencia
 * - checkDate?: string (ISO date) - Fecha opcional para verificar vigencia
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { startDate, endDate, checkDate } = body;

        const errors: string[] = [];
        const warnings: string[] = [];

        // Validar que las fechas básicas existan
        if (!startDate || !endDate) {
            return NextResponse.json({ valid: false, errors: ["Fechas de inicio y fin son requeridas"] });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Validar parseo correcto
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json({ valid: false, errors: ["Formato de fecha inválido"] });
        }

        // 1. Validar que fin sea posterior al inicio
        if (end <= start) {
            errors.push("La fecha de fin debe ser posterior a la fecha de inicio.");
        }

        // 2. Calcular días de vigencia
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 1) {
            errors.push("La vigencia debe ser de al menos 1 día.");
        }

        // 3. Warnings opcionales (no bloquean)
        if (diffDays < 30) {
            warnings.push(`Vigencia corta: ${diffDays} días.`);
        }

        // 4. NUEVO: Verificación de vigencia en fecha específica
        let vigencyCheck = null;
        if (checkDate) {
            const check = new Date(checkDate);
            
            if (isNaN(check.getTime())) {
                return NextResponse.json({ 
                    valid: false, 
                    errors: ["Formato de fecha de verificación inválido"] 
                });
            }

            // Normalizar a medianoche para comparación justa
            const checkNormalized = new Date(check.setHours(0, 0, 0, 0));
            const startNormalized = new Date(start.setHours(0, 0, 0, 0));
            const endNormalized = new Date(end.setHours(23, 59, 59, 999));

            const isActive = checkNormalized >= startNormalized && checkNormalized <= endNormalized;
            
            // Calcular días restantes si está vigente
            let daysRemaining = null;
            if (isActive) {
                daysRemaining = Math.ceil((endNormalized.getTime() - checkNormalized.getTime()) / (1000 * 60 * 60 * 24));
            }

            vigencyCheck = {
                date: checkDate,
                isActive,
                daysRemaining,
                message: isActive 
                    ? `✅ La póliza ESTÁ VIGENTE el ${checkDate}${daysRemaining ? ` (${daysRemaining} días restantes)` : ''}`
                    : `❌ La póliza NO está vigente el ${checkDate}`
            };
        }

        return NextResponse.json({
            valid: errors.length === 0,
            errors,
            warnings,
            vigencyDays: diffDays,
            vigencyCheck
        });

    } catch (error) {
        console.error("Error en validate-dates:", error);
        return NextResponse.json({ valid: false, errors: ["Error interno de validación"] }, { status: 500 });
    }
}

