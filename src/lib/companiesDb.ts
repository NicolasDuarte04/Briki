// /src/lib/companiesDb.ts
/**
 * Database operations for Companies with PII Encryption
 * 
 * Este módulo maneja operaciones CRUD para empresas con cifrado de datos PII.
 * Utiliza las funciones encrypt_pii() y decrypt_pii() de PostgreSQL con pgcrypto.
 * Cumple requisitos SARLAFT para Insurtech colombiana.
 * 
 * IMPORTANTE: Requiere que APP_ENCRYPTION_KEY esté configurada en .env.local
 * 
 * Campos encriptados:
 * - legalName (Razón Social)
 * - tradeName (Nombre Comercial)
 * - nit (NIT con DV)
 * - legalRepName, legalRepIdNumber, legalRepEmail, legalRepPhone
 * - annualRevenue, totalAssets, totalLiabilities, totalEquity
 * - shareholders, beneficialOwners (JSON arrays)
 * - complianceNotes
 */

import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { withTransactionRetryOrDefault } from './helpers/withTransactionRetry';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

/** Tipos de empresa según legislación colombiana */
export type CompanyType = 'sas' | 'sa' | 'ltda' | 'eu' | 'cooperativa' | 'fundacion' | 'ong' | 'otro';

/** Clasificación de riesgo SARLAFT */
export type RiskClassification = 'bajo' | 'medio' | 'alto' | 'muy_alto';

/** Estructura de un accionista */
export interface Shareholder {
  name: string;
  idType: string;
  idNumber: string;
  percentage: number;
  isPep: boolean;
}

/** Empresa descifrada (para lectura) */
export interface DecryptedCompany {
  id: string;
  orgId: string;
  
  // Sección A: Identidad Corporativa
  companyType: CompanyType;
  isPinned: boolean;
  legalName: string;
  tradeName: string | null;
  nit: string;
  constitutionDate: Date | null;
  registrationCity: string | null;
  
  // Sección B: Representación Legal
  legalRepName: string | null;
  legalRepIdType: string | null;
  legalRepIdNumber: string | null;
  legalRepEmail: string | null;
  legalRepPhone: string | null;
  legalRepStartDate: Date | null;
  
  // Sección C: Información Financiera
  annualRevenue: string | null;
  totalAssets: string | null;
  totalLiabilities: string | null;
  totalEquity: string | null;
  financialYear: number | null;
  currency: string;
  riskClassification: RiskClassification;
  
  // Sección D: Composición Accionaria
  shareholders: Shareholder[] | null;
  beneficialOwners: Shareholder[] | null;
  
  // Sección E: Datos de Riesgo
  ciiuCode: string | null;
  isPep: boolean;
  isObligatedSubject: boolean;
  lastSarlaftUpdate: Date | null;
  complianceNotes: string | null;
  
  // Auditoría
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  lastEditedBy: string | null;
}

/** Empresa resumida para listados y combobox */
export interface CompanySummary {
  id: string;
  legalName: string;
  tradeName: string | null;
  nit: string;
  companyType: CompanyType;
  isPinned: boolean;
  riskClassification: RiskClassification;
  createdAt: Date;
}

/** Datos para crear una empresa */
export interface CreateCompanyInput {
  // Sección A: Identidad Corporativa (requeridos: legalName, nit)
  companyType?: CompanyType;
  legalName: string;
  tradeName?: string;
  nit: string;
  constitutionDate?: Date;
  registrationCity?: string;
  
  // Sección B: Representación Legal
  legalRepName?: string;
  legalRepIdType?: string;
  legalRepIdNumber?: string;
  legalRepEmail?: string;
  legalRepPhone?: string;
  legalRepStartDate?: Date;
  
  // Sección C: Información Financiera
  annualRevenue?: string;
  totalAssets?: string;
  totalLiabilities?: string;
  totalEquity?: string;
  financialYear?: number;
  currency?: string;
  riskClassification?: RiskClassification;
  
  // Sección D: Composición Accionaria
  shareholders?: Shareholder[];
  beneficialOwners?: Shareholder[];
  
  // Sección E: Datos de Riesgo
  ciiuCode?: string;
  isPep?: boolean;
  isObligatedSubject?: boolean;
  lastSarlaftUpdate?: Date;
  complianceNotes?: string;
}

/** Datos para actualizar una empresa */
export interface UpdateCompanyInput extends Partial<CreateCompanyInput> {
  isPinned?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE BASE DE DATOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Crea una nueva empresa cifrando sus datos PII.
 * 
 * @param orgId - ID de la organización
 * @param data - Datos de la empresa a crear
 * @param userId - ID del usuario que crea (para auditoría)
 * @returns El ID de la empresa creada
 * 
 * @example
 * const companyId = await createCompany('org-uuid', {
 *   legalName: 'Seguros ABC S.A.S.',
 *   nit: '900123456-7',
 *   companyType: 'sas'
 * }, 'user-uuid');
 */
export async function createCompany(
  orgId: string, 
  data: CreateCompanyInput,
  userId?: string
): Promise<string> {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Configurar clave de cifrado para esta transacción
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    // Serializar arrays de accionistas a JSON si existen
    const shareholdersJson = data.shareholders ? JSON.stringify(data.shareholders) : null;
    const beneficialOwnersJson = data.beneficialOwners ? JSON.stringify(data.beneficialOwners) : null;
    
    return tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO public.companies (
        org_id,
        company_type,
        legal_name_enc,
        trade_name_enc,
        nit_enc,
        constitution_date,
        registration_city,
        legal_rep_name_enc,
        legal_rep_id_type,
        legal_rep_id_number_enc,
        legal_rep_email_enc,
        legal_rep_phone_enc,
        legal_rep_start_date,
        annual_revenue_enc,
        total_assets_enc,
        total_liabilities_enc,
        total_equity_enc,
        financial_year,
        currency,
        risk_classification,
        shareholders_enc,
        beneficial_owners_enc,
        ciiu_code,
        is_pep,
        is_obligated_subject,
        last_sarlaft_update,
        compliance_notes_enc,
        created_by
      )
      VALUES (
        ${orgId}::uuid,
        ${data.companyType || 'sas'}::public.company_type_enum,
        public.encrypt_pii(${data.legalName}),
        ${data.tradeName ? Prisma.sql`public.encrypt_pii(${data.tradeName})` : Prisma.sql`NULL`},
        public.encrypt_pii(${data.nit}),
        ${data.constitutionDate || null}::date,
        ${data.registrationCity || null},
        ${data.legalRepName ? Prisma.sql`public.encrypt_pii(${data.legalRepName})` : Prisma.sql`NULL`},
        ${data.legalRepIdType || null},
        ${data.legalRepIdNumber ? Prisma.sql`public.encrypt_pii(${data.legalRepIdNumber})` : Prisma.sql`NULL`},
        ${data.legalRepEmail ? Prisma.sql`public.encrypt_pii(${data.legalRepEmail})` : Prisma.sql`NULL`},
        ${data.legalRepPhone ? Prisma.sql`public.encrypt_pii(${data.legalRepPhone})` : Prisma.sql`NULL`},
        ${data.legalRepStartDate || null}::date,
        ${data.annualRevenue ? Prisma.sql`public.encrypt_pii(${data.annualRevenue})` : Prisma.sql`NULL`},
        ${data.totalAssets ? Prisma.sql`public.encrypt_pii(${data.totalAssets})` : Prisma.sql`NULL`},
        ${data.totalLiabilities ? Prisma.sql`public.encrypt_pii(${data.totalLiabilities})` : Prisma.sql`NULL`},
        ${data.totalEquity ? Prisma.sql`public.encrypt_pii(${data.totalEquity})` : Prisma.sql`NULL`},
        ${data.financialYear || null},
        ${data.currency || 'COP'},
        ${data.riskClassification || 'bajo'}::public.risk_classification_enum,
        ${shareholdersJson ? Prisma.sql`public.encrypt_pii(${shareholdersJson})` : Prisma.sql`NULL`},
        ${beneficialOwnersJson ? Prisma.sql`public.encrypt_pii(${beneficialOwnersJson})` : Prisma.sql`NULL`},
        ${data.ciiuCode || null},
        ${data.isPep ?? false},
        ${data.isObligatedSubject ?? false},
        ${data.lastSarlaftUpdate || null}::date,
        ${data.complianceNotes ? Prisma.sql`public.encrypt_pii(${data.complianceNotes})` : Prisma.sql`NULL`},
        ${userId || null}::uuid
      )
      RETURNING id::text
    `;
  }, {
    timeout: 30000,
  });

  if (!result || result.length === 0) {
    throw new Error('La creación de la empresa falló y no devolvió un ID.');
  }

  return result[0]?.id || '';
}

/**
 * Obtiene todas las empresas de una organización (resumidas).
 * Ideal para listados y cards.
 * 
 * @param orgId - ID de la organización
 * @returns Array de empresas resumidas
 */
export async function getCompaniesByOrg(orgId: string): Promise<CompanySummary[]> {
  if (!orgId) {
    throw new Error('Organization ID is required');
  }
  
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('APP_ENCRYPTION_KEY no está configurada.');
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    return tx.$queryRaw<CompanySummary[]>`
      SELECT 
        id::text,
        public.decrypt_pii(legal_name_enc) as "legalName",
        public.decrypt_pii(trade_name_enc) as "tradeName",
        public.decrypt_pii(nit_enc) as nit,
        company_type as "companyType",
        is_pinned as "isPinned",
        risk_classification as "riskClassification",
        created_at as "createdAt"
      FROM public.companies
      WHERE org_id = ${orgId}::uuid
        AND deleted_at IS NULL
      ORDER BY is_pinned DESC, created_at DESC
    `;
  }, {
    timeout: 30000,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN OPTIMIZADA PARA COMBOBOX
// ═══════════════════════════════════════════════════════════════════════════

// Caché en memoria para optimizar consultas repetidas del combobox
const companyComboboxCache = new Map<string, { data: { id: string; name: string }[], timestamp: number }>();
const COMBOBOX_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene empresas optimizadas para el Combobox de BriefForm.
 * Solo retorna ID y nombre (razón social) para máxima eficiencia.
 * Incluye caché en memoria para evitar consultas repetidas.
 * 
 * @param orgId - ID de la organización
 * @returns Array de empresas con solo ID y nombre
 */
export async function getCompaniesForCombobox(orgId: string): Promise<{ id: string; name: string }[]> {
  if (!orgId) {
    throw new Error('Organization ID is required');
  }
  
  const cacheKey = `combobox-companies-${orgId}`;
  const cachedEntry = companyComboboxCache.get(cacheKey);

  // Verificar si la entrada de caché existe y no ha expirado
  if (cachedEntry && (Date.now() - cachedEntry.timestamp < COMBOBOX_CACHE_TTL_MS)) {
    console.log(`[Cache Hit] Serving companies for org ${orgId} from cache.`);
    return cachedEntry.data;
  }

  console.log(`[Cache Miss] Fetching companies for org ${orgId} from database.`);
  
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('APP_ENCRYPTION_KEY no está configurada.');
  }

  const companies = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    // Solo descifrar razón social para el Combobox
    return tx.$queryRaw<{ id: string; name: string }[]>`
      SELECT 
        id::text,
        public.decrypt_pii(legal_name_enc) as name
      FROM public.companies
      WHERE org_id = ${orgId}::uuid
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 100
    `;
  }, {
    timeout: 60000,
    maxWait: 10000,
  });
  
  // Almacenar el resultado en caché con timestamp
  companyComboboxCache.set(cacheKey, { data: companies, timestamp: Date.now() });

  return companies;
}

/**
 * Invalida el caché del combobox de empresas para una organización.
 * Llamar después de crear/editar/eliminar una empresa.
 */
export function invalidateCompanyComboboxCache(orgId: string): void {
  const cacheKey = `combobox-companies-${orgId}`;
  companyComboboxCache.delete(cacheKey);
  console.log(`[Cache Invalidated] Company combobox cache cleared for org ${orgId}`);
}

/**
 * Obtiene las empresas pineadas de una organización.
 * Ideal para el widget del dashboard.
 * 
 * ✅ FASE ESTABILIZACIÓN: Retry logic con backoff exponencial para evitar
 * errores de "Unable to start transaction" por pool saturado.
 * 
 * @param orgId - ID de la organización
 * @param limit - Número máximo de empresas a retornar
 * @returns Array de empresas pineadas resumidas (vacío si falla)
 */
export async function getPinnedCompanies(orgId: string, limit = 5): Promise<CompanySummary[]> {
  if (!orgId) {
    console.error('[getPinnedCompanies] Organization ID is required');
    return [];
  }
  
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  if (!encryptionKey) {
    console.error('[getPinnedCompanies] APP_ENCRYPTION_KEY no está configurada.');
    return [];
  }

  // ✅ Usar retry helper para manejar pool saturation
  return withTransactionRetryOrDefault(
    () => prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
      
      return tx.$queryRaw<CompanySummary[]>`
        SELECT 
          id::text,
          public.decrypt_pii(legal_name_enc) as "legalName",
          public.decrypt_pii(trade_name_enc) as "tradeName",
          public.decrypt_pii(nit_enc) as nit,
          company_type as "companyType",
          is_pinned as "isPinned",
          risk_classification as "riskClassification",
          created_at as "createdAt"
        FROM public.companies
        WHERE org_id = ${orgId}::uuid
          AND is_pinned = TRUE
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;
    }, {
      timeout: 15000, // ✅ Reducido para fallar rápido y reintentar
      isolationLevel: 'ReadCommitted',
    }),
    [], // ✅ Graceful degradation: devolver vacío en lugar de crashear
    { context: 'getPinnedCompanies' }
  );
}

/**
 * Obtiene una empresa específica por ID con todos sus datos descifrados.
 * 
 * @param companyId - ID de la empresa
 * @param orgId - ID de la organización (para seguridad RLS)
 * @returns Empresa completa descifrada o null
 */
export async function getCompanyById(
  companyId: string,
  orgId: string
): Promise<DecryptedCompany | null> {
  if (!companyId || !orgId) {
    throw new Error('Company ID and Organization ID are required');
  }
  
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('APP_ENCRYPTION_KEY no está configurada.');
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    const companies = await tx.$queryRaw<Array<DecryptedCompany & { 
      shareholdersRaw: string | null;
      beneficialOwnersRaw: string | null;
    }>>`
      SELECT 
        id::text,
        org_id::text as "orgId",
        company_type as "companyType",
        is_pinned as "isPinned",
        public.decrypt_pii(legal_name_enc) as "legalName",
        public.decrypt_pii(trade_name_enc) as "tradeName",
        public.decrypt_pii(nit_enc) as nit,
        constitution_date as "constitutionDate",
        registration_city as "registrationCity",
        public.decrypt_pii(legal_rep_name_enc) as "legalRepName",
        legal_rep_id_type as "legalRepIdType",
        public.decrypt_pii(legal_rep_id_number_enc) as "legalRepIdNumber",
        public.decrypt_pii(legal_rep_email_enc) as "legalRepEmail",
        public.decrypt_pii(legal_rep_phone_enc) as "legalRepPhone",
        legal_rep_start_date as "legalRepStartDate",
        public.decrypt_pii(annual_revenue_enc) as "annualRevenue",
        public.decrypt_pii(total_assets_enc) as "totalAssets",
        public.decrypt_pii(total_liabilities_enc) as "totalLiabilities",
        public.decrypt_pii(total_equity_enc) as "totalEquity",
        financial_year as "financialYear",
        currency,
        risk_classification as "riskClassification",
        public.decrypt_pii(shareholders_enc) as "shareholdersRaw",
        public.decrypt_pii(beneficial_owners_enc) as "beneficialOwnersRaw",
        ciiu_code as "ciiuCode",
        is_pep as "isPep",
        is_obligated_subject as "isObligatedSubject",
        last_sarlaft_update as "lastSarlaftUpdate",
        public.decrypt_pii(compliance_notes_enc) as "complianceNotes",
        created_at as "createdAt",
        updated_at as "updatedAt",
        created_by::text as "createdBy",
        last_edited_by::text as "lastEditedBy"
      FROM public.companies
      WHERE id = ${companyId}::uuid 
        AND org_id = ${orgId}::uuid
        AND deleted_at IS NULL
      LIMIT 1
    `;
    
    if (companies.length === 0) {
      return null;
    }

    const company = companies[0]!;
    
    // Parsear los JSON de accionistas
    return {
      ...company,
      shareholders: company.shareholdersRaw ? JSON.parse(company.shareholdersRaw) : null,
      beneficialOwners: company.beneficialOwnersRaw ? JSON.parse(company.beneficialOwnersRaw) : null,
    } as DecryptedCompany;
  }, {
    timeout: 30000,
  });
}

/**
 * Actualiza una empresa existente.
 * 
 * @param companyId - ID de la empresa
 * @param orgId - ID de la organización
 * @param data - Datos a actualizar
 * @param userId - ID del usuario que actualiza
 * @returns true si se actualizó correctamente
 */
export async function updateCompany(
  companyId: string,
  orgId: string,
  data: UpdateCompanyInput,
  userId?: string
): Promise<boolean> {
  if (!companyId || !orgId) {
    throw new Error('Company ID and Organization ID are required');
  }
  
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('APP_ENCRYPTION_KEY no está configurada.');
  }

  if (Object.keys(data).length === 0) {
    return false;
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    // Construir partes del UPDATE dinámicamente
    const updateParts: string[] = [];
    
    // Campos encriptados
    if (data.legalName !== undefined) {
      updateParts.push(`legal_name_enc = public.encrypt_pii('${data.legalName.replace(/'/g, "''")}')`);
    }
    if (data.tradeName !== undefined) {
      updateParts.push(data.tradeName 
        ? `trade_name_enc = public.encrypt_pii('${data.tradeName.replace(/'/g, "''")}')`
        : `trade_name_enc = NULL`);
    }
    if (data.nit !== undefined) {
      updateParts.push(`nit_enc = public.encrypt_pii('${data.nit.replace(/'/g, "''")}')`);
    }
    if (data.legalRepName !== undefined) {
      updateParts.push(data.legalRepName
        ? `legal_rep_name_enc = public.encrypt_pii('${data.legalRepName.replace(/'/g, "''")}')`
        : `legal_rep_name_enc = NULL`);
    }
    if (data.legalRepIdNumber !== undefined) {
      updateParts.push(data.legalRepIdNumber
        ? `legal_rep_id_number_enc = public.encrypt_pii('${data.legalRepIdNumber.replace(/'/g, "''")}')`
        : `legal_rep_id_number_enc = NULL`);
    }
    if (data.legalRepEmail !== undefined) {
      updateParts.push(data.legalRepEmail
        ? `legal_rep_email_enc = public.encrypt_pii('${data.legalRepEmail.replace(/'/g, "''")}')`
        : `legal_rep_email_enc = NULL`);
    }
    if (data.legalRepPhone !== undefined) {
      updateParts.push(data.legalRepPhone
        ? `legal_rep_phone_enc = public.encrypt_pii('${data.legalRepPhone.replace(/'/g, "''")}')`
        : `legal_rep_phone_enc = NULL`);
    }
    if (data.annualRevenue !== undefined) {
      updateParts.push(data.annualRevenue
        ? `annual_revenue_enc = public.encrypt_pii('${data.annualRevenue.replace(/'/g, "''")}')`
        : `annual_revenue_enc = NULL`);
    }
    if (data.totalAssets !== undefined) {
      updateParts.push(data.totalAssets
        ? `total_assets_enc = public.encrypt_pii('${data.totalAssets.replace(/'/g, "''")}')`
        : `total_assets_enc = NULL`);
    }
    if (data.totalLiabilities !== undefined) {
      updateParts.push(data.totalLiabilities
        ? `total_liabilities_enc = public.encrypt_pii('${data.totalLiabilities.replace(/'/g, "''")}')`
        : `total_liabilities_enc = NULL`);
    }
    if (data.totalEquity !== undefined) {
      updateParts.push(data.totalEquity
        ? `total_equity_enc = public.encrypt_pii('${data.totalEquity.replace(/'/g, "''")}')`
        : `total_equity_enc = NULL`);
    }
    if (data.shareholders !== undefined) {
      updateParts.push(data.shareholders
        ? `shareholders_enc = public.encrypt_pii('${JSON.stringify(data.shareholders).replace(/'/g, "''")}')`
        : `shareholders_enc = NULL`);
    }
    if (data.beneficialOwners !== undefined) {
      updateParts.push(data.beneficialOwners
        ? `beneficial_owners_enc = public.encrypt_pii('${JSON.stringify(data.beneficialOwners).replace(/'/g, "''")}')`
        : `beneficial_owners_enc = NULL`);
    }
    if (data.complianceNotes !== undefined) {
      updateParts.push(data.complianceNotes
        ? `compliance_notes_enc = public.encrypt_pii('${data.complianceNotes.replace(/'/g, "''")}')`
        : `compliance_notes_enc = NULL`);
    }
    
    // Campos no encriptados
    if (data.companyType !== undefined) {
      updateParts.push(`company_type = '${data.companyType}'::public.company_type_enum`);
    }
    if (data.isPinned !== undefined) {
      updateParts.push(`is_pinned = ${data.isPinned}`);
    }
    if (data.constitutionDate !== undefined) {
      updateParts.push(data.constitutionDate 
        ? `constitution_date = '${data.constitutionDate.toISOString().split('T')[0]}'::date`
        : `constitution_date = NULL`);
    }
    if (data.registrationCity !== undefined) {
      updateParts.push(data.registrationCity
        ? `registration_city = '${data.registrationCity.replace(/'/g, "''")}'`
        : `registration_city = NULL`);
    }
    if (data.legalRepIdType !== undefined) {
      updateParts.push(data.legalRepIdType
        ? `legal_rep_id_type = '${data.legalRepIdType}'`
        : `legal_rep_id_type = NULL`);
    }
    if (data.legalRepStartDate !== undefined) {
      updateParts.push(data.legalRepStartDate
        ? `legal_rep_start_date = '${data.legalRepStartDate.toISOString().split('T')[0]}'::date`
        : `legal_rep_start_date = NULL`);
    }
    if (data.financialYear !== undefined) {
      updateParts.push(data.financialYear
        ? `financial_year = ${data.financialYear}`
        : `financial_year = NULL`);
    }
    if (data.currency !== undefined) {
      updateParts.push(`currency = '${data.currency}'`);
    }
    if (data.riskClassification !== undefined) {
      updateParts.push(`risk_classification = '${data.riskClassification}'::public.risk_classification_enum`);
    }
    if (data.ciiuCode !== undefined) {
      updateParts.push(data.ciiuCode
        ? `ciiu_code = '${data.ciiuCode}'`
        : `ciiu_code = NULL`);
    }
    if (data.isPep !== undefined) {
      updateParts.push(`is_pep = ${data.isPep}`);
    }
    if (data.isObligatedSubject !== undefined) {
      updateParts.push(`is_obligated_subject = ${data.isObligatedSubject}`);
    }
    if (data.lastSarlaftUpdate !== undefined) {
      updateParts.push(data.lastSarlaftUpdate
        ? `last_sarlaft_update = '${data.lastSarlaftUpdate.toISOString().split('T')[0]}'::date`
        : `last_sarlaft_update = NULL`);
    }
    
    // Auditoría
    if (userId) {
      updateParts.push(`last_edited_by = '${userId}'::uuid`);
    }

    if (updateParts.length === 0) {
      return false;
    }

    const query = `
      UPDATE public.companies
      SET ${updateParts.join(', ')}
      WHERE id = '${companyId}'::uuid
        AND org_id = '${orgId}'::uuid
        AND deleted_at IS NULL
    `;

    const result = await tx.$executeRawUnsafe(query);
    return result > 0;
  }, {
    timeout: 30000,
  });
}

/**
 * Toggle pin status de una empresa.
 * 
 * @param companyId - ID de la empresa
 * @param orgId - ID de la organización
 * @returns El nuevo estado de pin
 */
export async function toggleCompanyPin(
  companyId: string,
  orgId: string
): Promise<boolean> {
  if (!companyId || !orgId) {
    throw new Error('Company ID and Organization ID are required');
  }

  const result = await prisma.$queryRaw<Array<{ is_pinned: boolean }>>`
    UPDATE public.companies
    SET is_pinned = NOT is_pinned
    WHERE id = ${companyId}::uuid
      AND org_id = ${orgId}::uuid
      AND deleted_at IS NULL
    RETURNING is_pinned
  `;

  if (!result || result.length === 0) {
    throw new Error('Company not found or access denied');
  }

  return result[0]?.is_pinned ?? false;
}

/**
 * Soft delete de una empresa.
 * 
 * @param companyId - ID de la empresa
 * @param orgId - ID de la organización
 * @param userId - ID del usuario que elimina
 * @returns true si se eliminó correctamente
 */
export async function deleteCompany(
  companyId: string,
  orgId: string,
  userId?: string
): Promise<boolean> {
  if (!companyId || !orgId) {
    throw new Error('Company ID and Organization ID are required');
  }

  const result = await prisma.$executeRaw`
    UPDATE public.companies
    SET 
      deleted_at = NOW(),
      deleted_by = ${userId || null}::uuid
    WHERE id = ${companyId}::uuid
      AND org_id = ${orgId}::uuid
      AND deleted_at IS NULL
  `;

  return result > 0;
}

/**
 * Restaura una empresa eliminada (soft delete).
 * 
 * @param companyId - ID de la empresa
 * @param orgId - ID de la organización
 * @returns true si se restauró correctamente
 */
export async function restoreCompany(
  companyId: string,
  orgId: string
): Promise<boolean> {
  if (!companyId || !orgId) {
    throw new Error('Company ID and Organization ID are required');
  }

  const result = await prisma.$executeRaw`
    UPDATE public.companies
    SET 
      deleted_at = NULL,
      deleted_by = NULL
    WHERE id = ${companyId}::uuid
      AND org_id = ${orgId}::uuid
      AND deleted_at IS NOT NULL
  `;

  return result > 0;
}

/**

 */
export async function countCompaniesByOrg(orgId: string): Promise<number> {
  if (!orgId) {
    throw new Error('Organization ID is required');
  }

  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint as count
    FROM public.companies
    WHERE org_id = ${orgId}::uuid
      AND deleted_at IS NULL
  `;

  return Number(result[0]?.count ?? 0);
}
