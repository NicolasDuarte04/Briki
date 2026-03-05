// src/constants/matrices/flota.matrix.ts

export const FLOTA_SECCIONES_EXCEL = {
  // 1. COBERTURAS TODO RIESGO Y PÉRDIDA TOTAL
  COBERTURAS_PRINCIPALES: [
    "Pérdida parcial por robo: Hasta el valor del casco",
    "Pérdida parcial por daño: Hasta el valor del casco",
    "Pérdida total por robo: Hasta el valor del casco",
    "Pérdida total por daño: Hasta el valor del casco",
    "Pérdida total a consecuencia de choque, robo y daño, incendio o explosión, daño malicioso, caída de aeronaves y sus partes, caída de objetos extraños, desplome de edificios, fenómenos de la naturaleza, derrumbes, deslaves, impacto de proyectiles"
  ],

  // 2. AMPAROS ADICIONALES (Desglosados 1:1)
  AMPAROS_ADICIONALES: [
    "Cobertura para daños consecuenciales por rotura accidental de carter",
    "Renta diaria por siniestro",
    "Flete expreso",
    "Gastos de ambulancia terrestre",
    "Gastos de recuperacion",
    "Gastos de remolque en exceso o remplazo de asistencia vehicular por accidente o avería para vehículos pesados",
    "Gastos de remolque para el tercero (s) afectado(s)",
    "Gastos legales (incluye honorarios en caso de defensa en juicio, gastos por libertad del conductor y/o vehículo)",
    "Gastos medicos",
    "Muerte accidental y/o invalidez total y permanente",
    "Responsabilidad civil (LUC)"
  ],

  // 3. CLÁUSULAS ADICIONALES
  CLAUSULAS_ADICIONALES: [
    "Accesorios",
    "Adhesión",
    "Amparo de accesorios extras u originales",
    "Amparo patrimonial incluyendo estado etílico",
    "Ampliacion de aviso de siniestros, 15 días hábiles",
    "Anticipo de siniestros hasta un 50% en un plazo de 8 días una vez aceptado el reclamo, de común acuerdo con la aseguradora",
    "Asistencia en viajes vehiculos livianos 24 horas", // Se mantiene literal al PDF aunque sea flota pesada
    "Asistencia legal telefonica a nivel nacional, 24 horas, 365 dias al año",
    "Autoridad civil",
    "Autorización automática para reclamos de responsabilidad civil",
    "Avisos y letreros",
    "Caminos vecinales",
    "Cancelación de la póliza a prorrata, 30 dias de aviso",
    "Cláusula de ajuste de suma asegurada",
    "Cobertura automática de nuevas unidades, 30 dias",
    "Cobertura automática de unidades usadas, 10 días",
    "Cobertura automática para accesorios extras (Nuevos), 30 dias",
    "Cobertura automática para accesorios extras (Usados), 10 días",
    "Cobertura para los países del Pacto Andino (Ecuador, Colombia, Perú, excluye responsabilidad civil)",
    "Designación de ajustadores de mutuo acuerdo",
    "Designación de taller de mutuo acuerdo",
    "Devolución de deducible en caso de subrogación positiva",
    "Devolución de prima por buena experiencia",
    "Errores u omisiones no intencionales",
    "Exclusión de todo tipo de garantías",
    "Extension de vigencia a prorrata, 30 dias",
    "Gastos adicionales por recuperacion del vehiculo hurtado hasta por un límite del 3% con respecto a la suma asegurada",
    "Gastos legales y judiciales hasta USD. 2 000,00, en limite agregado anual (Debidamente justificados y razonables)",
    "Gastos para aminorar pérdidas",
    "Inspección y reparación",
    "Interés asegurable diverso",
    "Licencias caducadas 90 días",
    "No cancelación individual de la póliza o cobertura",
    "No depreciación en partes y piezas",
    "Pago de primas 30 dias plazo con respecto a la fecha de emision de la póliza",
    "Pago de siniestros en 8 días desde la entrega del último documento solicitado",
    "Par y juego",
    "Paso de puentes y gabarras",
    "Primera opción de compra",
    "Reparaciones inmediatas",
    "Restitución automática de suma asegurada sin costo",
    "Robo o tentativa de robo a consecuencia de siniestro",
    "Salvamento",
    "Tolerancia 10%"
  ],

  // 4. NOTAS ACLARATORIAS Y CONDICIONES ESPECÍFICAS
  NOTAS_ACLARATORIAS: [
    "El valor asegurado del vehículo debera ser el que corresponda al valor real comercial del mercado",
    "Para la cobertura de responsabilidad civil no se consideran terceros al cónyugue, parientes del asegurado de hasta el tercer grado de consaguinidad o afinidad, asi como los socios, gerentes o empleados subalternos",
    "Queda aclarado y convenido, que se amparan radios originales hasta el 100% de su valor de reposición",
    "Cobertura para conductores menores a 18 años",
    "Cobertura para Air-bags al 100%",
    "Cobertura para choques durante robo, así mismo el robo durante el siniestro, aplicándose para tal efecto un solo deducible",
    "Queda aclarado y convenido que se cubren los daños en el motor por haberlo hecho trabajar en condiciones no aptas de funcionamiento, incluyendo la falta de agua y/o aceite e incluso la consecuencia por rotura de cárter",
    "Cobertura de daños mecánicos a consecuencia de accidente",
    "Cobertura para vehículos que remolquen o que sean remolcados",
    "Cobertura para los vehículos en un taller o en poder de las autoridades",
    "Excluir el parte policial para siniestros de hasta USD. 5.000,00 a consecuencia de choque",
    "Plazo de 30 días para la instalación de dispositivos satelitales, sin perder cobertura",
    "Eximir la presentación del informe final de investigaciones para todos los siniestros",
    "Reposición de piezas inexistentes: La compañía pagará el importe en efectivo en un plazo de 45 días, de acuerdo con el precio promedio de venta de importadores más costo de instalación. Gastos adicionales de aceleración no serán responsabilidad de la aseguradora",
    "En caso de pérdida total de vehículos nuevos, para personas naturales y empresas que no tengan crédito fiscal, se indemnizará con IVA hasta los 6 meses posteriores a la fecha de compra",
    "Reclamos en provincias: Trámite mediante fotografías y autorización inmediata hasta USD. 2.000,00, salvo las ciudades donde la aseguradora tenga oficinas",
    "En caso de pérdidas totales por robo y choque, los contratos compra-venta se entregarán posteriormente a la entrega de la indemnización",
    "Se cubre el tránsito en playas y esteros",
    "La cobertura de Responsabilidad Civil incluye colisión si es que es responsabilidad del asegurado o vehículos en cadena o en serie"
  ]
} as const;

// Exportación aplanada para uso del motor Zod y ExcelJS
export const FLOTA_MATRIZ_COMPLETA = [
  ...FLOTA_SECCIONES_EXCEL.COBERTURAS_PRINCIPALES,
  ...FLOTA_SECCIONES_EXCEL.AMPAROS_ADICIONALES,
  ...FLOTA_SECCIONES_EXCEL.CLAUSULAS_ADICIONALES,
  ...FLOTA_SECCIONES_EXCEL.NOTAS_ACLARATORIAS
] as const;