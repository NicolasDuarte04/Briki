// src/constants/matrices/salud.matrix.ts

export const SALUD_SECCIONES_EXCEL = {
  // 1. ESTRUCTURA DEL PLAN Y LÍMITES FINANCIEROS GLOBALES
  LIMITES_Y_CONDICIONES_GENERALES: [
    "Límite Máximo Anual por Asegurado",
    "Límite Vitalicio por Asegurado (Lifetime Maximum)",
    "Ámbito Geográfico de Cobertura (Nacional, Regional, Mundial, Mundial excepto USA)",
    "Deducible Anual Individual (Dentro de red)",
    "Deducible Anual Individual (Fuera de red / Reembolso)",
    "Deducible Anual Familiar Máximo (Ej. 2 o 3 deducibles por familia)",
    "Coaseguro / Copago en Hospitalización (Porcentaje a cargo del asegurado)",
    "Coaseguro / Copago Ambulatorio (Porcentaje a cargo del asegurado)",
    "Tope Máximo de Coaseguro (Stop Loss / Out-of-pocket maximum)",
    "Sistema de atención (Crédito hospitalario directo / Red de prestadores)",
    "Libre Elección de Médicos (Sistema de reembolso)"
  ],

  // 2. COBERTURAS HOSPITALARIAS Y QUIRÚRGICAS (Inpatient)
  COBERTURAS_HOSPITALARIAS: [
    "Habitación y alimentación (Cuarto estándar o privado) - Sin límite de días",
    "Unidad de Cuidados Intensivos (UCI) e Intermedios",
    "Honorarios médicos y quirúrgicos (Cirujano, ayudante, anestesiólogo, instrumentista)",
    "Derechos de sala de operaciones, quirófano y sala de recuperación",
    "Medicamentos e insumos administrados durante la hospitalización",
    "Exámenes de laboratorio, rayos X e imagenología durante la hospitalización",
    "Material de osteosíntesis, prótesis e implantes (Médicamente necesarios, no estéticos)",
    "Honorarios por visitas médicas intrahospitalarias (Tratamiento clínico no quirúrgico)",
    "Cirugía ambulatoria (Procedimientos quirúrgicos sin noche de internamiento)",
    "Gastos de acompañante para pacientes pediátricos (Menores de 12 años)"
  ],

  // 3. COBERTURAS AMBULATORIAS Y DE DIAGNÓSTICO (Outpatient)
  COBERTURAS_AMBULATORIAS: [
    "Consultas médicas (Medicina general y especialistas)",
    "Exámenes de laboratorio clínico y patología",
    "Imagenología básica (Rayos X, Ecografías)",
    "Imagenología especializada o de alta tecnología (TAC, Resonancia Magnética, PET Scan)",
    "Medicamentos de receta o prescripción médica (Uso ambulatorio)",
    "Fisioterapia, rehabilitación y terapias respiratorias (Límite de sesiones por año)",
    "Terapias alternativas (Acupuntura, quiropraxia, homeopatía - Sublimitado)",
    "Atención en sala de Emergencias (Por accidente o enfermedad súbita)",
    "Tratamientos psiquiátricos o psicológicos (Límite de sesiones o valor anual)"
  ],

  // 4. MATERNIDAD Y RECIÉN NACIDO (Riders específicos)
  MATERNIDAD_Y_RECIEN_NACIDO: [
    "Parto normal o natural (Sujeto a periodo de carencia)",
    "Cesárea médicamente necesaria",
    "Complicaciones del embarazo y complicaciones del parto",
    "Aborto involuntario / terapéutico",
    "Cuidado del recién nacido sano (Nursery / Retén)",
    "Inclusión automática del recién nacido (Si se notifica en los primeros 30 días)",
    "Enfermedades congénitas, hereditarias o prematuridad del recién nacido"
  ],

  // 5. ENFERMEDADES CATASTRÓFICAS Y TRATAMIENTOS ESPECIALES
  TRATAMIENTOS_ESPECIALES_Y_CATASTROFICOS: [
    "Oncología: Tratamiento de Cáncer (Quimioterapia, radioterapia, inmunoterapia y medicamentos)",
    "Insuficiencia Renal: Diálisis y Hemodiálisis",
    "Trasplante de órganos (Corazón, riñón, hígado, médula ósea, pulmón)",
    "Gastos de procuración del órgano y atención médica del donante",
    "Tratamiento de VIH / SIDA (Sujeto a periodo de espera)",
    "Enfermedades cardiovasculares (Cateterismo, bypass, stents)",
    "Prótesis externas (Extremidades artificiales, ojos artificiales)",
    "Equipos de soporte vital ambulatorio (Sillas de ruedas, muletas, camas hospitalarias, oxígeno)"
  ],

  // 6. AMPAROS ADICIONALES, ODONTOLOGÍA Y ASISTENCIAS
  AMPAROS_ADICIONALES_Y_ASISTENCIAS: [
    "Ambulancia terrestre local (Emergencia médica o por accidente)",
    "Ambulancia aérea (Traslado por riesgo de muerte si no hay equipamiento local)",
    "Repatriación sanitaria o funeraria",
    "Segunda opinión médica internacional (Telemedicina)",
    "Asistencia médica en viajes internacionales (Cobertura de urgencias en el extranjero)",
    "Cobertura Odontológica preventiva (Profilaxis, fluorización, calzas)",
    "Cobertura Odontológica correctiva (Endodoncia, periodoncia, extracciones)",
    "Cobertura Oftalmológica / Visión (Examen visual, aros y lentes con medida)",
    "Medicina Preventiva (Chequeo ejecutivo anual / Exámenes de rutina)"
  ],

  // 7. PERIODOS DE CARENCIA (Waiting Periods) Y PREEXISTENCIAS
  CARENCIAS_Y_PREEXISTENCIAS: [
    "Cobertura para enfermedades preexistentes declaradas al inicio de la póliza (Sublímite temporal o periodo de espera de 12 a 24 meses)",
    "Periodo de carencia para maternidad (Típicamente 10 a 12 meses)",
    "Periodo de carencia para cirugías electivas o programadas (Ej. hernias, amígdalas, vesícula - 3 a 6 meses)",
    "Periodo de carencia para VIH/SIDA o enfermedades catastróficas (Típicamente 24 a 48 meses)",
    "Exención de periodos de carencia por accidente (Cobertura inmediata)"
  ],

  // 8. EXCLUSIONES PRINCIPALES (Auditoría de letra pequeña)
  EXCLUSIONES_PRINCIPALES: [
    "Tratamientos o cirugías estéticas, plásticas o cosméticas",
    "Tratamientos experimentales o no reconocidos por la comunidad médica internacional",
    "Enfermedades preexistentes NO declaradas en la solicitud original",
    "Tratamientos para la infertilidad, fertilización in vitro o disfunción sexual",
    "Curación de lesiones por intento de suicidio o autoinfligidas",
    "Lesiones sufridas por participación profesional en deportes de alto riesgo",
    "Gastos no médicos (Ej. artículos de aseo personal en el hospital, TV, acompañantes extra)"
  ]
} as const;

// Exportación aplanada para uso del motor Zod y ExcelJS
export const SALUD_MATRIZ_COMPLETA = [
  ...SALUD_SECCIONES_EXCEL.LIMITES_Y_CONDICIONES_GENERALES,
  ...SALUD_SECCIONES_EXCEL.COBERTURAS_HOSPITALARIAS,
  ...SALUD_SECCIONES_EXCEL.COBERTURAS_AMBULATORIAS,
  ...SALUD_SECCIONES_EXCEL.MATERNIDAD_Y_RECIEN_NACIDO,
  ...SALUD_SECCIONES_EXCEL.TRATAMIENTOS_ESPECIALES_Y_CATASTROFICOS,
  ...SALUD_SECCIONES_EXCEL.AMPAROS_ADICIONALES_Y_ASISTENCIAS,
  ...SALUD_SECCIONES_EXCEL.CARENCIAS_Y_PREEXISTENCIAS,
  ...SALUD_SECCIONES_EXCEL.EXCLUSIONES_PRINCIPALES
] as const;