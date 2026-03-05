// src/constants/matrices/accidentes-personales.matrix.ts

export const ACCIDENTES_PERSONALES_SECCIONES_EXCEL = {
  // 1. COBERTURAS PRINCIPALES (Riesgo Biométrico)
  COBERTURAS_PRINCIPALES: [
    "Muerte Accidental",
    "Invalidez total permanente",
    "Desmembración accidental",
    "Gastos Médicos",
    "Doble indemnización",
    "Renta diaria por accidente (No aplica deducible ni periodo de carencia)"
  ],

  // 2. AMPAROS ADICIONALES
  AMPAROS_ADICIONALES: [
    "Ambulancia terrestre",
    "Ambulancia aérea",
    "Beca estudiantil",
    "Gastos de sepelio",
    "Gastos dentales"
  ],

  // 3. EVENTOS ACCIDENTALES CUBIERTOS ESPECÍFICAMENTE (24h / 365 días / Mundial)
  EVENTOS_CUBIERTOS: [
    "Riñas, peleas",
    "Motin y huelga",
    "Eventos de la naturaleza",
    "Estado de embriaguez",
    "Por picaduras o mordeduras de insectos",
    "Por violencia y amenaza",
    "Ampliación de vuelos comerciales",
    "Ampliación de vuelos no comerciales"
  ],

  // 4. CLÁUSULAS ADICIONALES
  CLAUSULAS_ADICIONALES: [
    "Adhesión",
    "Amparo automático de nuevas personas, 30 días",
    "Amparo automático ocasional",
    "Ampliación de aviso de siniestros, 15 días hábiles",
    "Anticipo de siniestros hasta un 50% en un plazo de 8 días, una vez aceptado el reclamo y de común acuerdo con la aseguradora",
    "Cancelación de la póliza, 30 días a prorrata en cualquier caso",
    "Designación de ajustador de mutuo acuerdo",
    "Devolución de prima por buena experiencia",
    "Errores u omisiones",
    "Extensión de vigencia a prorrata, 30 días",
    "Gastos para ajuste de pérdidas",
    "Interés asegurable diverso",
    "No cancelación individual de la póliza o cobertura",
    "Pago de primas, 30 días plazo",
    "Pago de siniestros en 8 días desde la entrega del último documento solicitado",
    "Restitución automática de suma asegurada (Únicamente para gastos médicos)"
  ],

  // 5. NOTAS ACLARATORIAS Y CONDICIONES DEL GRUPO
  NOTAS_ACLARATORIAS: [
    "No se exigirán listados (Tipo blanket)",
    "Para los colegios la restitución automática de valor asegurado es sin costo",
    "Cubre a personas desde los 18 años de edad hasta los 70 años de edad",
    "Límite Catastrófico",
    "En caso de fallecimiento de cualquier funcionario no será necesario presentar las planillas de pago al IESS, pero si algún documento de relación de dependencia o relación de servicios",
    "En la renta diaria por accidente no se deberá aplicar deducible ni período de carencia",
    "Eximir la presentación del informe final de investigaciones para todos los siniestros",
    "La indemnización se entrtegará al contratante, antes del envío de la posesión efectiva y con previo acuerdo formal escrito de no entregar a los deudos hasta que dicho documento no sea emitido",
    "Se cubren accidentes de transito aunque los vehículos y/o conductores causantes no cumplan con la ley de transito"
  ]
} as const;

// Exportación aplanada para uso del motor Zod y ExcelJS
export const ACCIDENTES_PERSONALES_MATRIZ_COMPLETA = [
  ...ACCIDENTES_PERSONALES_SECCIONES_EXCEL.COBERTURAS_PRINCIPALES,
  ...ACCIDENTES_PERSONALES_SECCIONES_EXCEL.AMPAROS_ADICIONALES,
  ...ACCIDENTES_PERSONALES_SECCIONES_EXCEL.EVENTOS_CUBIERTOS,
  ...ACCIDENTES_PERSONALES_SECCIONES_EXCEL.CLAUSULAS_ADICIONALES,
  ...ACCIDENTES_PERSONALES_SECCIONES_EXCEL.NOTAS_ACLARATORIAS
] as const;