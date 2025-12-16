/**
 * Compliance Context Metadata
 * FASE 2: Contexto legal y operativo para cada item del checklist
 * 
 * Proporciona información adicional para el modal de confirmación:
 * - Descripción detallada del requisito
 * - Referencia legal/regulatoria
 * - Documentos típicamente requeridos
 * - Consecuencias de incumplimiento
 */

export interface ComplianceItemMeta {
  /** Descripción detallada del requisito */
  description: string;
  /** Referencia legal o regulatoria */
  legalReference?: string;
  /** Documentos típicamente requeridos */
  requiredDocs?: string[];
  /** Consecuencias de no cumplir */
  consequences?: string;
  /** Nivel de criticidad: 'critical' | 'high' | 'medium' */
  criticality: 'critical' | 'high' | 'medium';
  /** Link a documentación externa (opcional) */
  externalLink?: string;
}

export type ComplianceContextMap = Record<string, ComplianceItemMeta>;

/**
 * Contexto para items de Colombia (co)
 */
export const coComplianceContext: ComplianceContextMap = {
  co_item_kyc: {
    description: 'Verificación de identidad del cliente mediante entrevista presencial o virtual, validando documentos de identidad y confirmando datos personales.',
    legalReference: 'Circular Básica Jurídica 029/2014 - Superintendencia Financiera de Colombia',
    requiredDocs: ['Cédula de ciudadanía', 'RUT actualizado', 'Certificado de existencia y representación legal (empresas)'],
    consequences: 'Multas de hasta 200 SMLMV y posible cancelación de licencia del intermediario.',
    criticality: 'critical',
  },
  co_item_rut: {
    description: 'Verificación del Registro Único Tributario (RUT) del cliente para confirmar su situación fiscal y actividad económica.',
    legalReference: 'Estatuto Tributario Art. 555-2 y Resolución DIAN 000139/2012',
    requiredDocs: ['RUT actualizado (no mayor a 30 días)'],
    consequences: 'Imposibilidad de facturación y riesgo de sanciones tributarias.',
    criticality: 'high',
  },
  co_item_sarlaft: {
    description: 'Cumplimiento del Sistema de Administración del Riesgo de Lavado de Activos y Financiación del Terrorismo.',
    legalReference: 'Circular Externa 055/2016 - Superintendencia Financiera',
    requiredDocs: ['Formulario de conocimiento del cliente', 'Declaración de origen de fondos', 'Lista de verificación en OFAC/ONU'],
    consequences: 'Sanciones penales, cierre de operaciones y reporte a UIAF.',
    criticality: 'critical',
  },
  co_item_pila: {
    description: 'Validación del pago de aportes al Sistema de Seguridad Social Integral (salud, pensión, ARL).',
    legalReference: 'Ley 100/1993 y Decreto 1406/1999',
    requiredDocs: ['Planilla PILA de los últimos 3 meses', 'Certificado de afiliación a ARL'],
    consequences: 'Invalidez de la póliza en caso de siniestro laboral.',
    criticality: 'high',
  },
  co_item_beneficiary: {
    description: 'Actualización y verificación de la lista de beneficiarios designados en la póliza.',
    legalReference: 'Código de Comercio Art. 1137-1162 (Contrato de Seguro)',
    requiredDocs: ['Formato de designación de beneficiarios firmado', 'Copia de documentos de identidad de beneficiarios'],
    consequences: 'Demoras o disputas en el pago de indemnizaciones.',
    criticality: 'medium',
  },
};

/**
 * Contexto para items de México (mx)
 */
export const mxComplianceContext: ComplianceContextMap = {
  mx_item_kyc: {
    description: 'Conocimiento del cliente según normativa de prevención de lavado de dinero.',
    legalReference: 'Ley Federal para la Prevención e Identificación de Operaciones con Recursos de Procedencia Ilícita',
    requiredDocs: ['INE/Pasaporte', 'Comprobante de domicilio', 'Acta constitutiva (empresas)'],
    consequences: 'Sanciones de la CNBV y posible responsabilidad penal.',
    criticality: 'critical',
  },
  mx_item_constanciaFiscal: {
    description: 'Verificación de la Constancia de Situación Fiscal del cliente.',
    legalReference: 'Código Fiscal de la Federación Art. 27',
    requiredDocs: ['Constancia de Situación Fiscal vigente del SAT'],
    consequences: 'Imposibilidad de deducción fiscal y problemas de facturación.',
    criticality: 'high',
  },
  mx_item_imss: {
    description: 'Confirmación de registro patronal y cumplimiento de obligaciones con el IMSS.',
    legalReference: 'Ley del Seguro Social Arts. 12-15',
    requiredDocs: ['Opinión de cumplimiento IMSS', 'Registro patronal'],
    consequences: 'Exclusión de cobertura por accidentes laborales.',
    criticality: 'high',
  },
  mx_item_infonavit: {
    description: 'Validación del cumplimiento de aportaciones al INFONAVIT.',
    legalReference: 'Ley del INFONAVIT Art. 29',
    requiredDocs: ['Constancia de situación fiscal INFONAVIT'],
    consequences: 'Sanciones administrativas y recargos.',
    criticality: 'medium',
  },
  mx_item_beneficiary: {
    description: 'Actualización de beneficiarios en póliza de seguro.',
    legalReference: 'Ley sobre el Contrato de Seguro Arts. 163-167',
    requiredDocs: ['Designación de beneficiarios notariada (si aplica)', 'INE de beneficiarios'],
    consequences: 'Disputas legales en caso de siniestro.',
    criticality: 'medium',
  },
};

/**
 * Contexto para items de Chile (cl)
 */
export const clComplianceContext: ComplianceContextMap = {
  cl_item_kyc: {
    description: 'Identificación y verificación de clientes según normativa antilavado.',
    legalReference: 'Ley 19.913 - UAF Chile',
    requiredDocs: ['Cédula de identidad', 'Declaración jurada de PEP', 'Certificado de vigencia (empresas)'],
    consequences: 'Multas de hasta 5.000 UTM y sanciones penales.',
    criticality: 'critical',
  },
  cl_item_rut: {
    description: 'Verificación del RUT empresarial o personal.',
    legalReference: 'Código Tributario Art. 66',
    requiredDocs: ['Certificado de RUT vigente del SII'],
    consequences: 'Problemas de facturación y tributación.',
    criticality: 'high',
  },
  cl_item_afp: {
    description: 'Validación de cotizaciones previsionales en AFP.',
    legalReference: 'DL 3500 - Sistema de AFP',
    requiredDocs: ['Cartola AFP últimos 12 meses', 'Certificado de cotizaciones'],
    consequences: 'Exclusión de beneficios previsionales asociados.',
    criticality: 'high',
  },
  cl_item_previred: {
    description: 'Descarga y verificación de comprobantes de pago Previred.',
    legalReference: 'Ley 17.322 sobre Cobranza Judicial de Cotizaciones',
    requiredDocs: ['Planillas Previred últimos 3 meses'],
    consequences: 'Multas y recargos por morosidad.',
    criticality: 'medium',
  },
  cl_item_beneficiary: {
    description: 'Actualización de beneficiarios según normativa de seguros.',
    legalReference: 'DFL 251 - Ley de Seguros Chile',
    requiredDocs: ['Formulario de beneficiarios firmado', 'Cédulas de beneficiarios'],
    consequences: 'Litigios en liquidación de siniestros.',
    criticality: 'medium',
  },
};

/**
 * Contexto para items de Brasil (br)
 */
export const brComplianceContext: ComplianceContextMap = {
  br_item_kyc: {
    description: 'Conheça Seu Cliente - verificação de identidade e análise de risco.',
    legalReference: 'Circular BACEN 3.978/2020 e Lei 9.613/1998',
    requiredDocs: ['CPF/CNPJ', 'Comprovante de endereço', 'Contrato social (empresas)'],
    consequences: 'Multas de até R$ 20 milhões e responsabilização criminal.',
    criticality: 'critical',
  },
  br_item_cnpj: {
    description: 'Verificação do Cadastro Nacional de Pessoa Jurídica.',
    legalReference: 'IN RFB 1.863/2018',
    requiredDocs: ['Comprovante de inscrição CNPJ', 'Certidão negativa de débitos'],
    consequences: 'Impedimento de emissão de notas fiscais.',
    criticality: 'high',
  },
  br_item_susep: {
    description: 'Conformidade com registro na Superintendência de Seguros Privados.',
    legalReference: 'Resolução CNSP 382/2020',
    requiredDocs: ['Comprovante de registro SUSEP', 'Documentação do produto'],
    consequences: 'Anulação da apólice e sanções administrativas.',
    criticality: 'critical',
  },
  br_item_fgts: {
    description: 'Validação de recolhimento do FGTS.',
    legalReference: 'Lei 8.036/1990',
    requiredDocs: ['CRF - Certificado de Regularidade do FGTS'],
    consequences: 'Multas trabalhistas e impedimento de participar de licitações.',
    criticality: 'high',
  },
  br_item_beneficiary: {
    description: 'Atualização de beneficiários na apólice de seguro.',
    legalReference: 'Código Civil Arts. 791-802 (Seguro)',
    requiredDocs: ['Formulário de designação de beneficiários', 'Documentos dos beneficiários'],
    consequences: 'Atrasos na liquidação de sinistros.',
    criticality: 'medium',
  },
};

/**
 * Mapa consolidado de todo el contexto de compliance por jurisdicción
 */
export const complianceContextByJurisdiction: Record<string, ComplianceContextMap> = {
  co: coComplianceContext,
  mx: mxComplianceContext,
  cl: clComplianceContext,
  br: brComplianceContext,
};

/**
 * Obtiene el contexto de un item específico
 */
export function getComplianceItemContext(
  jurisdiction: string,
  itemId: string
): ComplianceItemMeta | null {
  const jurisdictionContext = complianceContextByJurisdiction[jurisdiction];
  if (!jurisdictionContext) return null;
  return jurisdictionContext[itemId] ?? null;
}

/**
 * Obtiene el color del badge según criticidad
 */
export function getCriticalityColor(criticality: ComplianceItemMeta['criticality']): string {
  switch (criticality) {
    case 'critical':
      return 'destructive';
    case 'high':
      return 'secondary';
    case 'medium':
    default:
      return 'outline';
  }
}

/**
 * Obtiene el label de criticidad en español
 */
export function getCriticalityLabel(criticality: ComplianceItemMeta['criticality']): string {
  switch (criticality) {
    case 'critical':
      return 'Crítico';
    case 'high':
      return 'Alto';
    case 'medium':
    default:
      return 'Medio';
  }
}
