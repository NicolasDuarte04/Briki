// src/constants/matrices/vida.matrix.ts

export const VIDA_SECCIONES_EXCEL = {
  // 1. COBERTURA BÁSICA Y VALORES (El núcleo de la póliza)
  COBERTURA_BASICA: [
    "Muerte por cualquier causa (Enfermedad natural o Accidente)",
    "Capital asegurado base (Suma Asegurada Principal)",
    "Componente de Ahorro / Supervivencia (Valor de rescate o fondo de acumulación)",
    "Tasa de interés garantizada (Para pólizas universales o con componente de ahorro)",
    "Flexibilidad para incremento o disminución de suma asegurada durante la vigencia"
  ],

  // 2. AMPAROS ADICIONALES POR ACCIDENTE (Riders de Muerte Accidental)
  AMPAROS_POR_ACCIDENTE: [
    "Muerte Accidental (Doble indemnización del capital principal)",
    "Muerte Accidental Especial (Triple indemnización si ocurre en transporte público, ascensores o edificios públicos)",
    "Desmembración o pérdida de órganos por accidente (Según tabla porcentual de indemnizaciones)",
    "Reembolso de gastos médicos por accidente (Anexo adicional)"
  ],

  // 3. BENEFICIOS EN VIDA: INVALIDEZ Y ENFERMEDADES GRAVES
  BENEFICIOS_EN_VIDA: [
    "Invalidez Total y Permanente por enfermedad o accidente (Anticipo del 100% del capital)",
    "Invalidez Total y Permanente (Pago en cuotas o renta mensual)",
    "Exoneración del pago de primas por Incapacidad Total y Permanente",
    "Anticipo de capital por Enfermedades Graves (Cáncer, Infarto, Derrame cerebral, Insuficiencia renal, etc.)",
    "Porcentaje de anticipo por Enfermedades Graves (Ej. 25%, 50% o 100% del capital base)",
    "Anticipo por enfermedades terminales (Esperanza de vida menor a 12 meses)",
    "Renta diaria por hospitalización (Por enfermedad o accidente)"
  ],

  // 4. ASISTENCIAS Y BENEFICIOS FAMILIARES
  ASISTENCIAS_Y_BENEFICIOS: [
    "Gastos de sepelio / Exequias (Indemnización adicional o reembolso)",
    "Asistencia Exequial (Prestación del servicio funerario directo)",
    "Asistencia psicológica para familiares en caso de duelo",
    "Segunda opinión médica internacional para el asegurado titular",
    "Orientación médica telefónica o telemedicina",
    "Asistencia legal y testamentaria para los beneficiarios",
    "Cobertura automática para hijos recién nacidos (Sublímite por fallecimiento)"
  ],

  // 5. CONDICIONES DE PÓLIZA, EDADES Y RENOVACIÓN (Reglas de Suscripción)
  CONDICIONES_Y_RENOVACION: [
    "Edad mínima de ingreso",
    "Edad máxima de ingreso (Ej. 65 o 70 años)",
    "Edad máxima de permanencia para cobertura de Muerte (Ej. 80, 85 años o Vitalicia)",
    "Edad máxima de permanencia para coberturas por Accidente e Invalidez (Usualmente 65 años)",
    "Periodo de gracia para el pago de primas (30 días u otros)",
    "Cláusula de Indisputabilidad / Incontestabilidad (La aseguradora no puede anular la póliza por errores no intencionales después de 1 o 2 años)",
    "Rehabilitación de la póliza (Plazo para reactivarla tras cancelación por no pago)",
    "Designación libre y modificación de beneficiarios en cualquier momento"
  ],

  // 6. EXCLUSIONES PRINCIPALES Y CARENCIAS
  EXCLUSIONES_Y_CARENCIAS: [
    "Suicidio (Periodo de carencia usual de 1 a 2 años ininterrumpidos)",
    "Enfermedades preexistentes no declaradas en la solicitud inicial",
    "Muerte por participación en actos delictivos, riñas o motines",
    "Fallecimiento a causa de deportes extremos, de alto riesgo o profesionales (Si no fueron declarados y extra-primados)",
    "Muerte por actos de guerra, fisión o fusión nuclear",
    "Muerte como tripulante de vuelos no comerciales o experimentales"
  ]
} as const;

// Exportación aplanada para uso del motor Zod y ExcelJS
export const VIDA_MATRIZ_COMPLETA = [
  ...VIDA_SECCIONES_EXCEL.COBERTURA_BASICA,
  ...VIDA_SECCIONES_EXCEL.AMPAROS_POR_ACCIDENTE,
  ...VIDA_SECCIONES_EXCEL.BENEFICIOS_EN_VIDA,
  ...VIDA_SECCIONES_EXCEL.ASISTENCIAS_Y_BENEFICIOS,
  ...VIDA_SECCIONES_EXCEL.CONDICIONES_Y_RENOVACION,
  ...VIDA_SECCIONES_EXCEL.EXCLUSIONES_Y_CARENCIAS
] as const;