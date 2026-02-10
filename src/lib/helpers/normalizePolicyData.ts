// src/lib/helpers/normalizePolicyData.ts
/**
 * Normaliza los datos extraídos de pólizas por IA a una estructura plana
 * para consumo uniforme en vistas de detalle.
 * 
 * PROBLEMA RESUELTO:
 * - La IA extrae datos estructurados (insurer.name, financials.premium_total)
 * - Las vistas legacy buscaban campos planos (insurer, premium)
 * - Este mapper traduce entre ambas estructuras
 * 
 * FUENTE DE VERDAD:
 * - Interface PolicyExtractedData en src/lib/openai/policyAnalysis.ts
 * - Lógica probada en src/components/Workspace/Policies.tsx
 */

/**
 * Estructura normalizada para vistas de pólizas
 * Campos planos con fallbacks seguros
 */
export interface NormalizedPolicyData {
  // Información básica
  policyNumber: string | null;
  insurer: string | null;
  insurerCode: string | null;
  insurerPhone: string | null;
  insurerEmail: string | null;
  
  // Tipo de seguro
  policyType: string | null;
  jurisdiction: string | null;
  currency: string | null;
  
  // Datos financieros
  premiumNet: number | null;
  premiumTaxes: number | null;
  premiumFees: number | null;
  premiumTotal: number | null;
  
  // Suma asegurada (agregada de coberturas)
  sumInsured: number | null;
  sumInsuredDescription: string | null;
  
  // Deducible general
  deductibleAmount: number | null;
  deductibleUnit: string | null;
  deductibleDescription: string | null;
  
  // Vigencia
  effectiveFrom: string | null;
  effectiveTo: string | null;
  
  // Datos del asegurado
  insuredName: string | null;
  insuredId: string | null;
  insuredAddress: string | null;
  
  // Coberturas (normalizadas a strings para display simple)
  coverages: Array<{
    name: string;
    description: string | null;
    limitAmount: number | null;
    limitCurrency: string | null;
    limitDescription: string | null;
    deductibleAmount: number | null;
    deductibleUnit: string | null;
    waitingPeriod: number | null;
    confidence: number | null;
    sublimits: Array<{ name: string; amount: number; unit: string }>;
  }>;
  
  // Exclusiones (normalizadas)
  exclusions: Array<{
    name: string;
    description: string | null;
    confidence: number | null;
  }>;
  
  // Deducibles específicos
  deductibles: Array<{
    type: string;
    amount: number;
    unit: string;
    appliesTo: string | null;
    confidence: number | null;
  }>;
  
  // Endosos
  endorsements: Array<{
    number: string | null;
    name: string;
    description: string | null;
    effectiveDate: string | null;
    confidence: number | null;
  }>;
  
  // Proceso de reclamación
  claimsPhone: string | null;
  claimsEmail: string | null;
  claimsSteps: string[];
  claimsTimeLimitDays: number | null;
}

/**
 * Extrae un valor string de forma segura de un campo que puede ser
 * string, objeto con propiedad name/value, o null
 */
function safeExtractString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value || null;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // Prioridad: name > value > text > primer string encontrado
    if (obj.name && typeof obj.name === 'string') return obj.name;
    if (obj.value && typeof obj.value === 'string') return obj.value;
    if (obj.text && typeof obj.text === 'string') return obj.text;
    // Buscar primer valor string
    const firstString = Object.values(obj).find(v => typeof v === 'string' && v.length > 0);
    if (typeof firstString === 'string') return firstString;
  }
  return null;
}

/**
 * Extrae un valor numérico de forma segura
 */
function safeExtractNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    // Intentar parsear removiendo caracteres no numéricos excepto punto y signo
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Normaliza los datos extraídos de una póliza a estructura plana
 * 
 * @param extractedData - Datos crudos del campo JSONB extractedData
 * @returns Estructura normalizada con todos los campos disponibles
 * 
 * @example
 * ```typescript
 * const policy = await prisma.policyAnalysis.findUnique({ ... });
 * const normalized = normalizePolicyData(policy.extractedData);
 * console.log(normalized.insurer); // "AXA Seguros S.A."
 * console.log(normalized.premiumTotal); // 15234.50
 * ```
 */
export function normalizePolicyData(extractedData: Record<string, unknown> | null): NormalizedPolicyData {
  if (!extractedData) {
    return createEmptyNormalizedData();
  }

  const data = extractedData as Record<string, any>;

  // ──────────────────────────────────────────────────────────────────────────
  // INFORMACIÓN DE ASEGURADORA
  // Estructura IA: { insurer: { name, code, contact: { phone, email } } }
  // ──────────────────────────────────────────────────────────────────────────
  const insurerObj = data.insurer;
  const insurer = typeof insurerObj === 'object' && insurerObj !== null
    ? safeExtractString(insurerObj.name)
    : safeExtractString(insurerObj); // Fallback si es string directo
  
  const insurerCode = typeof insurerObj === 'object' && insurerObj !== null
    ? safeExtractString(insurerObj.code)
    : null;
  
  const insurerContact = typeof insurerObj === 'object' && insurerObj?.contact
    ? insurerObj.contact
    : null;
  
  const insurerPhone = insurerContact ? safeExtractString(insurerContact.phone) : null;
  const insurerEmail = insurerContact ? safeExtractString(insurerContact.email) : null;

  // ──────────────────────────────────────────────────────────────────────────
  // INFORMACIÓN BÁSICA
  // ──────────────────────────────────────────────────────────────────────────
  const policyNumber = safeExtractString(data.policy_number);
  
  // Tipo de seguro: puede estar como policy_type, insurance_type, o type
  const policyType = safeExtractString(data.policy_type) 
    || safeExtractString(data.insurance_type)
    || safeExtractString(data.type);
  
  const jurisdiction = safeExtractString(data.jurisdiction);
  const currency = safeExtractString(data.currency);

  // ──────────────────────────────────────────────────────────────────────────
  // DATOS FINANCIEROS
  // Estructura IA: { financials: { premium_net, taxes, fees, premium_total } }
  // ──────────────────────────────────────────────────────────────────────────
  const financials = data.financials || {};
  const premiumNet = safeExtractNumber(financials.premium_net);
  const premiumTaxes = safeExtractNumber(financials.taxes);
  const premiumFees = safeExtractNumber(financials.fees);
  const premiumTotal = safeExtractNumber(financials.premium_total) 
    || safeExtractNumber(data.premium_total) // Fallback campo plano
    || safeExtractNumber(data.premium);

  // ──────────────────────────────────────────────────────────────────────────
  // SUMA ASEGURADA
  // Puede estar como sum_insured o agregada de la cobertura principal
  // ──────────────────────────────────────────────────────────────────────────
  let sumInsured = safeExtractNumber(data.sum_insured);
  let sumInsuredDescription: string | null = null;
  
  // Si no hay sum_insured directo, buscar en coberturas
  if (sumInsured === null && Array.isArray(data.coverages) && data.coverages.length > 0) {
    // Buscar cobertura principal o la de mayor límite
    const mainCoverage = data.coverages.find((c: any) => 
      c.name?.toLowerCase().includes('principal') || 
      c.name?.toLowerCase().includes('básica') ||
      c.name?.toLowerCase().includes('main')
    ) || data.coverages.reduce((max: any, c: any) => 
      (c.limit_amount || 0) > (max?.limit_amount || 0) ? c : max
    , data.coverages[0]);
    
    if (mainCoverage) {
      sumInsured = safeExtractNumber(mainCoverage.limit_amount);
      sumInsuredDescription = mainCoverage.name || null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DEDUCIBLE GENERAL
  // Estructura IA: { deductibles: [{ type, amount, unit, applies_to }] }
  // ──────────────────────────────────────────────────────────────────────────
  const deductibles = Array.isArray(data.deductibles) ? data.deductibles : [];
  const generalDeductible = deductibles.find((d: any) => 
    d.type === 'general' || d.applies_to === 'general' || d.type === 'único'
  ) || deductibles[0];
  
  const deductibleAmount = generalDeductible 
    ? safeExtractNumber(generalDeductible.amount) 
    : safeExtractNumber(data.deductible);
  const deductibleUnit = generalDeductible 
    ? safeExtractString(generalDeductible.unit) 
    : null;
  const deductibleDescription = generalDeductible
    ? safeExtractString(generalDeductible.applies_to)
    : null;

  // ──────────────────────────────────────────────────────────────────────────
  // VIGENCIA
  // Estructura IA: { effective_from, effective_to }
  // Fallbacks: start_date/end_date, effective_date/expiry_date
  // ──────────────────────────────────────────────────────────────────────────
  const effectiveFrom = safeExtractString(data.effective_from) 
    || safeExtractString(data.start_date)
    || safeExtractString(data.effective_date);
  
  const effectiveTo = safeExtractString(data.effective_to)
    || safeExtractString(data.end_date)
    || safeExtractString(data.expiry_date);

  // ──────────────────────────────────────────────────────────────────────────
  // DATOS DEL ASEGURADO
  // Estructura IA: { insured_name } o { policyholder: { name, address, id } }
  // ──────────────────────────────────────────────────────────────────────────
  const policyholder = data.policyholder || {};
  const insuredName = safeExtractString(data.insured_name) 
    || safeExtractString(policyholder.name)
    || safeExtractString(data.policy_holder_name);
  
  const insuredId = safeExtractString(data.insured_id)
    || safeExtractString(policyholder.id)
    || safeExtractString(policyholder.tax_id)
    || safeExtractString(data.insured_rfc);
  
  const insuredAddress = safeExtractString(data.insured_address)
    || safeExtractString(policyholder.address);

  // ──────────────────────────────────────────────────────────────────────────
  // COBERTURAS
  // Estructura IA: { coverages: [{ name, description, limit_amount, ... }] }
  // ──────────────────────────────────────────────────────────────────────────
  const rawCoverages = Array.isArray(data.coverages) ? data.coverages : 
    Array.isArray(data.coverage_details) ? data.coverage_details : [];
  
  const coverages = rawCoverages.map((c: any) => ({
    name: safeExtractString(c.name) || safeExtractString(c.type) || 'Cobertura sin nombre',
    description: safeExtractString(c.description),
    limitAmount: safeExtractNumber(c.limit_amount),
    limitCurrency: safeExtractString(c.limit_currency),
    limitDescription: safeExtractString(c.limit_description) || safeExtractString(c.limit_unit),
    deductibleAmount: safeExtractNumber(c.deductible_amount),
    deductibleUnit: safeExtractString(c.deductible_unit),
    waitingPeriod: safeExtractNumber(c.waiting_period),
    confidence: safeExtractNumber(c.confidence),
    sublimits: Array.isArray(c.sublimits) ? c.sublimits.map((s: any) => ({
      name: safeExtractString(s.name) || '',
      amount: safeExtractNumber(s.amount) || 0,
      unit: safeExtractString(s.unit) || ''
    })) : []
  }));

  // ──────────────────────────────────────────────────────────────────────────
  // EXCLUSIONES
  // Estructura IA: { exclusions: [{ name, description, confidence }] }
  // ──────────────────────────────────────────────────────────────────────────
  const rawExclusions = Array.isArray(data.exclusions) ? data.exclusions : [];
  const exclusions = rawExclusions.map((e: any) => ({
    name: safeExtractString(e.name) || safeExtractString(e) || 'Exclusión sin nombre',
    description: safeExtractString(e.description),
    confidence: safeExtractNumber(e.confidence)
  }));

  // ──────────────────────────────────────────────────────────────────────────
  // DEDUCIBLES (todos)
  // ──────────────────────────────────────────────────────────────────────────
  const normalizedDeductibles = deductibles.map((d: any) => ({
    type: safeExtractString(d.type) || 'general',
    amount: safeExtractNumber(d.amount) || 0,
    unit: safeExtractString(d.unit) || '',
    appliesTo: safeExtractString(d.applies_to),
    confidence: safeExtractNumber(d.confidence)
  }));

  // ──────────────────────────────────────────────────────────────────────────
  // ENDOSOS
  // Estructura IA: { endorsements: [{ number, name, description, effective_date }] }
  // ──────────────────────────────────────────────────────────────────────────
  const rawEndorsements = Array.isArray(data.endorsements) ? data.endorsements : [];
  const endorsements = rawEndorsements.map((e: any) => ({
    number: safeExtractString(e.number),
    name: safeExtractString(e.name) || 'Endoso sin nombre',
    description: safeExtractString(e.description),
    effectiveDate: safeExtractString(e.effective_date),
    confidence: safeExtractNumber(e.confidence)
  }));

  // ──────────────────────────────────────────────────────────────────────────
  // PROCESO DE RECLAMACIÓN
  // Estructura IA: { claims_process: { phone, email, steps, time_limit_days } }
  // ──────────────────────────────────────────────────────────────────────────
  const claimsProcess = data.claims_process || {};
  const claimsPhone = safeExtractString(claimsProcess.phone);
  const claimsEmail = safeExtractString(claimsProcess.email);
  const claimsSteps = Array.isArray(claimsProcess.steps) 
    ? claimsProcess.steps.map((s: any) => safeExtractString(s) || '').filter(Boolean)
    : [];
  const claimsTimeLimitDays = safeExtractNumber(claimsProcess.time_limit_days);

  return {
    policyNumber,
    insurer,
    insurerCode,
    insurerPhone,
    insurerEmail,
    policyType,
    jurisdiction,
    currency,
    premiumNet,
    premiumTaxes,
    premiumFees,
    premiumTotal,
    sumInsured,
    sumInsuredDescription,
    deductibleAmount,
    deductibleUnit,
    deductibleDescription,
    effectiveFrom,
    effectiveTo,
    insuredName,
    insuredId,
    insuredAddress,
    coverages,
    exclusions,
    deductibles: normalizedDeductibles,
    endorsements,
    claimsPhone,
    claimsEmail,
    claimsSteps,
    claimsTimeLimitDays
  };
}

/**
 * Crea una estructura vacía con todos los campos en null/[]
 * Útil para casos donde no hay datos extraídos
 */
function createEmptyNormalizedData(): NormalizedPolicyData {
  return {
    policyNumber: null,
    insurer: null,
    insurerCode: null,
    insurerPhone: null,
    insurerEmail: null,
    policyType: null,
    jurisdiction: null,
    currency: null,
    premiumNet: null,
    premiumTaxes: null,
    premiumFees: null,
    premiumTotal: null,
    sumInsured: null,
    sumInsuredDescription: null,
    deductibleAmount: null,
    deductibleUnit: null,
    deductibleDescription: null,
    effectiveFrom: null,
    effectiveTo: null,
    insuredName: null,
    insuredId: null,
    insuredAddress: null,
    coverages: [],
    exclusions: [],
    deductibles: [],
    endorsements: [],
    claimsPhone: null,
    claimsEmail: null,
    claimsSteps: [],
    claimsTimeLimitDays: null
  };
}

/**
 * Formatea un número como moneda
 */
export function formatCurrency(amount: number | null, currency: string | null, locale: string = 'es-CO'): string {
  if (amount === null) return '';
  
  const currencyCode = currency || 'COP';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    // Fallback si el código de moneda no es válido
    return `${currencyCode} ${amount.toLocaleString(locale)}`;
  }
}

/**
 * Formatea una fecha ISO a formato legible
 */
export function formatPolicyDate(dateStr: string | null, locale: string = 'es-CO', fallback: string = ''): string {
  if (!dateStr) return fallback;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Devolver original si no es parseable
    return date.toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
