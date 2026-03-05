// src/constants/matrices/rce.matrix.ts

export const RCE_SECCIONES_EXCEL = {
  // 1. ESTRUCTURA BASE Y LÍMITES GLOBALES
  AMPAROS_BASICOS_Y_LIMITES: [
    "Límite Único Combinado (L.U.C.)",
    "Objeto del seguro: Indemnizar reclamaciones por lesiones corporales y/o daños a bienes de terceros en predios, operaciones o trabajos del asegurado",
    "Cobertura A: Responsabilidad civil por lesiones corporales o enfermedad (Muerte)",
    "Cobertura B: Responsabilidad civil para daños a la propiedad",
    "Cobertura C: Gastos médicos (Primeros auxilios dentro de 24h, sin aceptación de RC. Incluye: médicos, cirugía, ambulancia, hospital, enfermeras y drogas)",
    "Cobertura D: Gastos o pagos suplementarios (Defensa, honorarios, primas para embargos, costas)"
  ],

  // 2. RIESGOS PREDIOS Y OPERACIONES (El día a día de la empresa)
  AMPAROS_PREDIOS_Y_OPERACIONES: [
    "Predios, labores y operaciones",
    "Actividades sociales y deportivas",
    "Aeroportuario",
    "Ambiental",
    "Áreas comunales",
    "Ascensores, elevadores y escaleras móviles",
    "Avisos o vallas de propaganda",
    "Bares, restaurantes y comedores",
    "Contaminación accidental y súbita",
    "Equipos móviles, grúas",
    "Estacionamientos y parqueaderos",
    "Montacargas",
    "Responsabilidad civil legal por incendio y explosión, incluyendo daños por humo",
    "Tecles",
    "Transporte de carga y descarga",
    "Vigilantes, guardias y celadores"
  ],

  // 3. RIESGOS ESPECIALIZADOS Y TERCEROS
  AMPAROS_ESPECIALIZADOS: [
    "Contractual",
    "Contratistas y subcontratistas independientes",
    "Cruzada",
    "Cuidado, custodia y control",
    "Patronal en exceso de las prestaciones sociales",
    "Productos",
    "Profesional",
    "Responsabilidad civil vehículos (Si tiene póliza de vehículos, opera como exceso de los mismos)",
    "Retiro de productos",
    "Vehículos en prueba",
    "Vehículos propios y no propios"
  ],

  // 4. CLÁUSULAS ADICIONALES (Letras Pequeñas)
  CLAUSULAS_ADICIONALES: [
    "Adhesión",
    "Amparo automático de nuevas propiedades",
    "Ampliación de aviso de siniestros, 10 días hábiles",
    "Anticipo al valor de indemnización 50%",
    "Arbitraje y mediación",
    "Autorización automática para pago reclamos de responsabilidad civil hasta $5.000",
    "Cancelación de póliza a 30 días",
    "Cancelación anticipada y no individual",
    "Cláusula de pruebas clínicas",
    "Cláusula de reclamos en serie",
    "Designación de ajustadores de mutuo acuerdo",
    "Devolución de prima por buena experiencia",
    "Diversidad de intereses",
    "Errores u omisiones no intencionales",
    "Extensión de vigencia a prorrata, 30 días",
    "Inspección y reparación",
    "Interés asegurable diverso",
    "No-cancelación individual de la póliza o cobertura",
    "Pago de primas 30 días plazo",
    "Pago de siniestros en 8 días desde la entrega del último documento solicitado",
    "Parientes y amigos",
    "Propietarios, arrendatarios y usufructuarios de locales",
    "Reclamaciones",
    "Restitución automática de suma asegurada"
  ],

  // 5. NOTAS ACLARATORIAS
  NOTAS_ACLARATORIAS: [
    "Aclaración término terceros en RCE: se consideran como terceros a los huéspedes y/o turistas y/o clientes y/o proveedores",
    "Extensión a cubrir domicilios de ejecutivos declarados bajo el programa de seguros",
    "Eximir la presentación del informe final de investigaciones para todos los siniestros"
  ]
} as const;

// Exportación aplanada para uso del motor Zod y ExcelJS
export const RCE_MATRIZ_COMPLETA = [
  ...RCE_SECCIONES_EXCEL.AMPAROS_BASICOS_Y_LIMITES,
  ...RCE_SECCIONES_EXCEL.AMPAROS_PREDIOS_Y_OPERACIONES,
  ...RCE_SECCIONES_EXCEL.AMPAROS_ESPECIALIZADOS,
  ...RCE_SECCIONES_EXCEL.CLAUSULAS_ADICIONALES,
  ...RCE_SECCIONES_EXCEL.NOTAS_ACLARATORIAS
] as const;