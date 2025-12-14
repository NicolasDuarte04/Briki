import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { startDate, endDate, insuranceType } = body;

        const errors: string[] = [];

        if (!startDate || !endDate) {
            return NextResponse.json({ valid: false, errors: ["Fechas requeridas"] });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();

        // 1. Validar que fin sea posterior al inicio
        if (end <= start) {
            errors.push("La fecha de fin debe ser posterior a la fecha de inicio.");
        }

        // 2. Validar vigencia mínima (ej. 1 año para la mayoría)
        // Esto es solo un ejemplo, dependería del insuranceType
        const oneYearFromStart = new Date(start);
        oneYearFromStart.setFullYear(start.getFullYear() + 1);

        // Permitimos un margen de error de 1 día
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 30) {
            errors.push("La vigencia de la póliza parece demasiado corta (< 30 días).");
        }

        // 3. Validar retroactividad excesiva
        // Si la fecha de inicio es muy antigua (> 3 meses atrás), warning
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);

        if (start < threeMonthsAgo) {
            errors.push("La fecha de inicio tiene más de 3 meses de retroactividad.");
        }

        return NextResponse.json({
            valid: errors.length === 0,
            errors
        });

    } catch (error) {
        return NextResponse.json({ valid: false, errors: ["Error interno de validación"] }, { status: 500 });
    }
}
