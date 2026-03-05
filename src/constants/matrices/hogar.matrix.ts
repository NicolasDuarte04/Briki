// src/constants/matrices/hogar.matrix.ts

export const HOGAR_SECCIONES_EXCEL = {
  // 1. OBJETOS ASEGURADOS Y LÍMITES (Estructura y Contenidos)
  VALORES_ASEGURADOS_Y_LIMITES: [
    "Edificio (Estructura física, anexos, muros, parqueaderos y áreas comunes proporcionales)",
    "Contenidos Generales (Muebles, enseres, electrodomésticos, ropa y artículos personales)",
    "Equipo Electrónico y Eléctrico (TVs, computadoras, consolas, línea blanca)",
    "Equipos móviles fuera del hogar (Laptops, tablets, cámaras, bicicletas, scooters)",
    "Joyas, relojes y metales preciosos (Con listado valorado)",
    "Joyas, relojes y metales preciosos (Sin listado valorado / Sublímite a primer riesgo)",
    "Obras de arte, antigüedades y colecciones",
    "Dinero en efectivo en permanencia (Dentro de caja fuerte o predios)",
    "Bienes a la intemperie (Muebles de jardín, antenas, paneles solares)"
  ],

  // 2. COBERTURAS PRINCIPALES (Riesgos Nombrados y Catastróficos)
  COBERTURAS_PRINCIPALES: [
    "Incendio y/o rayo",
    "Explosión e implosión (Por gas doméstico, calentadores, ollas de presión)",
    "Terremoto, temblor y erupción volcánica",
    "Lluvia, inundación y daños por agua (Incluye desbordamiento, rotura de tuberías y filtraciones súbitas)",
    "Motín, huelga, asonada, conmoción civil y actos mal intencionados de terceros (AMIT)",
    "Terrorismo",
    "Impacto de aeronaves, vehículos terrestres y caída de árboles o postes",
    "Daños eléctricos a equipos por variación de voltaje, cortocircuito o arco voltaico",
    "Rotura de vidrios, cristales, espejos, domos y unidades sanitarias",
    "Robo con fuerza en las cosas o violencia en las personas (Asalto)",
    "Hurto / Desaparición misteriosa (Sustracción sin violencia ni fuerza)",
    "Robo de bienes del servicio doméstico o de huéspedes"
  ],

  // 3. AMPAROS ADICIONALES Y ASISTENCIAS (Enfoque Residencial B2C)
  AMPAROS_ADICIONALES_Y_ASISTENCIAS: [
    "Responsabilidad Civil Extracontractual Familiar (L.U.C.)",
    "Responsabilidad Civil por daños por agua a vecinos",
    "Responsabilidad Civil por tenencia de mascotas",
    "Gastos de alojamiento temporal (En caso de inhabitabilidad por siniestro cubierto)",
    "Pérdida de canon de arrendamiento (Si el asegurado es el propietario y arrendador)",
    "Gastos de mudanza y bodegaje de bienes rescatados",
    "Remoción de escombros y limpieza",
    "Gastos para extinción del siniestro y preservación de bienes",
    "Honorarios de profesionales (Arquitectos, ingenieros para reconstrucción)",
    "Accidentes Personales para empleados del servicio doméstico (Muerte e invalidez)",
    "Gastos médicos por accidentes en el hogar para servicio doméstico",
    "Asistencia Domiciliaria 24/7: Plomería (Rotura de tubos)",
    "Asistencia Domiciliaria 24/7: Cerrajería (Pérdida de llaves o daño en chapa)",
    "Asistencia Domiciliaria 24/7: Electricidad (Cortocircuito en la red interna)",
    "Asistencia Domiciliaria 24/7: Vidriería (Rotura de vidrios de fachada)"
  ],

  // 4. CLÁUSULAS ADICIONALES (Reglas del Contrato)
  CLAUSULAS_ADICIONALES: [
    "Amparo automático de nuevas adquisiciones (Electrodomésticos, muebles) hasta 30 días",
    "Anticipo de indemnización (50%) en caso de siniestros mayores",
    "Arbitraje y designación de ajustadores de mutuo acuerdo",
    "Cancelación de la póliza a prorrata con 30 días de previo aviso",
    "Cláusula de errores u omisiones no intencionales",
    "Extensión de vigencia a prorrata por 30 días",
    "Pago de primas con 30 días de gracia",
    "Pago de siniestros en un plazo máximo de 8 a 15 días tras entrega de documentos",
    "Valor de reposición o reemplazo a nuevo (Sin aplicar depreciación por uso para contenidos)"
  ],

  // 5. NOTAS ACLARATORIAS, GARANTÍAS Y EXCLUSIONES (Letras pequeñas residenciales)
  NOTAS_ACLARATORIAS_Y_EXCLUSIONES: [
    "Seguro a Valor de Reposición: La indemnización de electrodomésticos y muebles no sufre depreciación si se reponen por uno nuevo de similares características",
    "No aplicación de regla proporcional (Infraseguro) si la diferencia entre valor real y asegurado es menor al 10% o 20%",
    "Cobertura de joyas y obras de arte requiere que permanezcan en caja fuerte o lugares cerrados bajo llave si la vivienda queda deshabitada",
    "Exclusión: Daños por falta de mantenimiento, desgaste normal, humedad prolongada, filtraciones crónicas o vicios de construcción",
    "Exclusión: Hundimiento paulatino del suelo o agrietamiento normal de paredes",
    "Garantía de inhabitabilidad: La póliza suspende la cobertura de robo si la vivienda permanece deshabitada por más de 30 a 60 días consecutivos sin aviso",
    "Aclaración de cobertura de mascotas: Aplica únicamente para razas domésticas y excluye responsabilidad por razas legalmente catalogadas como peligrosas sin los debidos permisos"
  ]
} as const;

// Exportación aplanada para uso del motor Zod y ExcelJS
export const HOGAR_MATRIZ_COMPLETA = [
  ...HOGAR_SECCIONES_EXCEL.VALORES_ASEGURADOS_Y_LIMITES,
  ...HOGAR_SECCIONES_EXCEL.COBERTURAS_PRINCIPALES,
  ...HOGAR_SECCIONES_EXCEL.AMPAROS_ADICIONALES_Y_ASISTENCIAS,
  ...HOGAR_SECCIONES_EXCEL.CLAUSULAS_ADICIONALES,
  ...HOGAR_SECCIONES_EXCEL.NOTAS_ACLARATORIAS_Y_EXCLUSIONES
] as const;