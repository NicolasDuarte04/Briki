import { createServerSupabase } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ caseId: string }> }
) {
    try {
        const supabase = await createServerSupabase();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { caseId } = await params;

        // 1. Verify access
        const membership = await prisma.org_members.findFirst({
            where: { user_id: user.id },
            select: { org_id: true },
        });

        if (!membership) {
            return new NextResponse("Organization not found", { status: 403 });
        }

        const caseItem = await prisma.case.findUnique({
            where: { id: caseId },
            select: { orgId: true, clientName: true },
        });

        if (!caseItem || caseItem.orgId !== membership.org_id) {
            return new NextResponse("Case not found", { status: 404 });
        }

        // 2. Fetch Record
        const record = await prisma.complianceRecord.findFirst({
            where: { caseId: caseId },
            orderBy: { createdAt: 'desc' },
            take: 1
        });

        if (!record) {
            return new NextResponse("No compliance record found", { status: 404 });
        }

        // 3. Prepare Data for HTML Report
        const checklist = record.checklistData && typeof record.checklistData === 'object'
            ? record.checklistData as Record<string, { checked: boolean }>
            : {};

        const totalItems = Object.keys(checklist).length;
        const checkedItems = Object.values(checklist).filter(v => v.checked).length;
        const percentage = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

        const checklistItems = Object.entries(checklist).map(([key, value]) => ({
            id: key,
            checked: value.checked
        }));

        const validatedDates = record.validatedDates as { startDate?: string; endDate?: string } | null;

        // 4. Generate HTML Report (Printable as PDF)
        const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe de Cumplimiento - ${caseItem.clientName || 'Sin Nombre'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            color: #333;
            line-height: 1.6;
        }
        .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 28px;
            color: #1e40af;
            margin-bottom: 8px;
        }
        .header .subtitle {
            color: #6b7280;
            font-size: 14px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e5e7eb;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 10px;
        }
        .info-label {
            font-weight: 600;
            color: #4b5563;
        }
        .info-value {
            color: #1f2937;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-verified {
            background: #dcfce7;
            color: #166534;
        }
        .status-pending {
            background: #fef3c7;
            color: #92400e;
        }
        .status-passed {
            background: #dcfce7;
            color: #166534;
        }
        .checklist {
            list-style: none;
        }
        .checklist-item {
            padding: 12px;
            margin-bottom: 8px;
            background: white;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .check-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        .check-yes {
            background: #dcfce7;
            color: #166534;
        }
        .check-no {
            background: #f3f4f6;
            color: #9ca3af;
        }
        .progress-bar {
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(to right, #2563eb, #3b82f6);
            border-radius: 4px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
        }
        @media print {
            body { padding: 20px; }
            .section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Informe de Cumplimiento</h1>
        <p class="subtitle">Generado el: ${new Date().toLocaleString('es-CO')}</p>
    </div>

    <div class="section">
        <h2 class="section-title">Información del Caso</h2>
        <div class="info-grid">
            <span class="info-label">Cliente:</span>
            <span class="info-value">${caseItem.clientName || 'Sin Nombre'}</span>
            
            <span class="info-label">Jurisdicción:</span>
            <span class="info-value">${record.jurisdiction.toUpperCase()}</span>
            
            <span class="info-label">Tipo de Seguro:</span>
            <span class="info-value">${record.insuranceType || 'No especificado'}</span>
            
            <span class="info-label">Generado por:</span>
            <span class="info-value">${user.email || 'Sistema'}</span>
            
            ${validatedDates?.startDate ? `
            <span class="info-label">Inicio Vigencia:</span>
            <span class="info-value">${validatedDates.startDate}</span>
            ` : ''}
            
            ${validatedDates?.endDate ? `
            <span class="info-label">Fin Vigencia:</span>
            <span class="info-value">${validatedDates.endDate}</span>
            ` : ''}
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">Estado General</h2>
        <div class="info-grid">
            <span class="info-label">Estado KYC:</span>
            <span class="info-value">
                <span class="status-badge ${record.kycStatus === 'verified' ? 'status-verified' : 'status-pending'}">
                    ${record.kycStatus === 'verified' ? 'Verificado' : 'Pendiente'}
                </span>
            </span>
            
            <span class="info-label">Cumplimiento:</span>
            <span class="info-value">
                <span class="status-badge ${percentage === 100 ? 'status-passed' : 'status-pending'}">
                    ${percentage === 100 ? 'Aprobado' : 'En Proceso'}
                </span>
            </span>
            
            <span class="info-label">Progreso:</span>
            <span class="info-value">${checkedItems} de ${totalItems} items (${percentage}%)</span>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">Detalle de Verificación</h2>
        <ul class="checklist">
            ${checklistItems.map(item => `
                <li class="checklist-item">
                    <span class="check-icon ${item.checked ? 'check-yes' : 'check-no'}">
                        ${item.checked ? '✓' : '○'}
                    </span>
                    <span>${item.id}</span>
                    <span style="margin-left: auto; font-size: 12px; color: ${item.checked ? '#166534' : '#9ca3af'}">
                        ${item.checked ? 'Completado' : 'Pendiente'}
                    </span>
                </li>
            `).join('')}
        </ul>
    </div>

    <div class="footer">
        <p>Documento generado automáticamente por Briki Platform</p>
        <p>ID del Caso: ${caseId}</p>
        <p style="margin-top: 10px;">Para guardar como PDF: Ctrl+P (o Cmd+P) → Guardar como PDF</p>
    </div>
</body>
</html>
        `;

        return new NextResponse(html, {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
            },
        });

    } catch (error) {
        console.error("[COMPLIANCE_REPORT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
