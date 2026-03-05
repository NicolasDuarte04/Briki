// src/constants/matrices/riesgos_financieros.matrix.ts

export const RIESGOS_FINANCIEROS_SECCIONES_EXCEL = {
  // 1. OBJETO DEL SEGURO Y LÍMITES
  LIMITES_Y_OBJETO: [
    "Fidelidad de los empleados y/o funcionarios del asegurado (En rol de pagos o cualquier tipo de relación laboral o de servicios)",
    "Límite Individual y Colusorio"
  ],

  // 2. COBERTURAS PRINCIPALES (Tipificación del delito interno)
  COBERTURAS_PRINCIPALES: [
    "Acto fraudulento o ímprobo",
    "Desfalco",
    "Falsificación",
    "Robo",
    "Ratería",
    "Hurto",
    "Malversación",
    "Sustracción fraudulenta",
    "Mal uso premeditado",
    "Falta de integridad o de fidelidad",
    "Cualesquier otro acto punible según la ley que produzca perjuicios económicos comprobables"
  ],

  // 3. CLÁUSULAS ADICIONALES (Desglosadas 1:1)
  CLAUSULAS_ADICIONALES: [
    "Adhesión",
    "Amparo automático de nuevos empleados",
    "Ampliación de aviso y prueba, 30 días",
    "Arbitraje",
    "Cancelación de la póliza a prorrata, 30 días calendario",
    "Cobertura para información patentada, secretos comerciales y propiedad intelectual",
    "Comprobación de pérdidas",
    "Contabilidad y prueba",
    "Contratos temporales",
    "Designación de ajustadores de mutuo acuerdo",
    "Devolución de prima por buena experiencia",
    "Exclusión de todo tipo de garantías",
    "Extensión de vigencia a prorrata, 30 días",
    "Gastos para ajuste de pérdidas",
    "Interés asegurable diverso",
    "No cancelación individual de la póliza o cobertura",
    "Pago de primas 30 días plazo",
    "Pago de siniestros en 8 días desde la entrega del último documento solicitado",
    "Período de descubrimiento 180 días",
    "Personas no identificadas",
    "Restitución automática de suma asegurada",
    "Salvamento",
    "Seguros anteriores"
  ],

  // 4. NOTAS ACLARATORIAS Y METODOLOGÍA DE TRAMITE
  NOTAS_ACLARATORIAS_Y_METODOLOGIA: [
    "Cobertura adicional al personal contratado bajo cualquier otro contrato",
    "Póliza contratada bajo la modalidad blanket",
    "Indemnización únicamente con la denuncia con reconocimiento de firma (No se exigirá dictamen fiscal acusatorio ni sentencia judicial)",
    "Período de descubrimiento de 180 días y período de indemnización de 1 año",
    "Concurrencia: En caso de existir póliza Crime Manager, se presentará el siniestro a ambas pólizas obteniendo indemnización en ambas",
    "Reclamos hasta $5.000: Indemnización con valorización de la pérdida y despido del empleado infiel",
    "Reclamos $5.001 a $10.000: Indemnización con valoración de la pérdida y acusación particular",
    "Reclamos $10.001 en adelante: Indemnización con valoración de la pérdida y dictamen fiscal acusatorio"
  ]
} as const;

// Exportación aplanada para uso del motor Zod y ExcelJS
export const RIESGOS_FINANCIEROS_MATRIZ_COMPLETA = [
  ...RIESGOS_FINANCIEROS_SECCIONES_EXCEL.LIMITES_Y_OBJETO,
  ...RIESGOS_FINANCIEROS_SECCIONES_EXCEL.COBERTURAS_PRINCIPALES,
  ...RIESGOS_FINANCIEROS_SECCIONES_EXCEL.CLAUSULAS_ADICIONALES,
  ...RIESGOS_FINANCIEROS_SECCIONES_EXCEL.NOTAS_ACLARATORIAS_Y_METODOLOGIA
] as const;