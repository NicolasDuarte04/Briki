/**
 * Database operations for Cases, Artifacts, and Audit Logs
 * 
 * This module provides CRUD operations and business logic for managing
 * insurance cases, generated artifacts, and audit trails.
 */

import { prisma } from './prisma';
import type { Prisma, Case } from '@prisma/client';
import { 
  CaseBrief,
  Artifact,
  CurrencyCode
} from './types';
import type {
  BrokerProfileParsed,
  CaseParsed,
  EligibilityParsed,
  PolicyParsed,
  PricingBandParsed,
  ProductParsed,
  ProposalMathCheckParsed,
  ProposalParsed,
  ProposalSelectedPlanParsed,
  ProvenanceParsed,
  RiderParsed,
  RenewalRecordParsed,
} from "./validation";

// Type definitions for CRUD operations
export interface CreateCaseInput {
  brief: CaseBrief;
  clientRef?: string;
  clientName?: string;
  businessType?: string;
  employees?: number;
  status?: 'draft' | 'pending' | 'quoted' | 'active' | 'closed';
  stage?: 'initial' | 'brief' | 'sourcing' | 'quoted' | 'policy_issued';
}

export interface CreateArtifactInput {
  caseId: string;
  sourceType: 'pdf' | 'whatsapp' | 'form' | 'api' | 'email';
  fileId?: string;
  fileName?: string;
  contentType?: string;
  contentText?: string;
  provenance?: Record<string, unknown>;
}

export interface CreateAuditLogInput {
  caseId: string;
  actor: string;
  action: string;
  tool?: string;
  payloadHash?: string;
  payload?: Record<string, unknown>;
}

// Extended types for responses - usando tipos simples por ahora
export interface CaseWithArtifacts {
  id: string;
  orgId: string | null;
  clientRef: string | null;
  clientName: string | null;
  businessType: string | null;
  employees: number | null;
  status: string;
  stage: string;
  briefData: any;
  createdAt: Date;
  updatedAt: Date;
  artifacts: any[];
  auditLogs: any[];
}

/**
 * Error classes for database operations
 */
export class DatabaseError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class CaseNotFoundError extends DatabaseError {
  constructor(caseId: string) {
    super(`Case with ID ${caseId} not found`, 'CASE_NOT_FOUND');
  }
}

export class ArtifactNotFoundError extends DatabaseError {
  constructor(artifactId: string) {
    super(`Artifact with ID ${artifactId} not found`, 'ARTIFACT_NOT_FOUND');
  }
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Creates a new case in the database
 * @param input - Case creation data
 * @returns Promise<Case> - The created case
 */
export async function createCase(input: CreateCaseInput) {
  try {
    console.log('Hola, esto es un easter egg');
    const newCase = await prisma.case.create({
      data: {
        clientRef: input.clientRef || null,
        clientName: input.clientName || null,
        businessType: input.businessType || input.brief.businessType || null,
        employees: input.employees || input.brief.employees || null,
        status: input.status || 'draft',
        stage: input.stage || 'initial',
        briefData: JSON.parse(JSON.stringify(input.brief)), // Convertir a JSON válido
      }
    });

    return newCase;
  } catch (error) {
    console.error('Error creating case:', error);
    throw new DatabaseError('Failed to create case');
  }
}

/**
 * Creates a new artifact in the database
 * @param input - Artifact creation data
 * @returns Promise<Artifact> - The created artifact
 */
export async function createArtifact(input: CreateArtifactInput) {
  try {
    const newArtifact = await prisma.artifact.create({
      data: {
        caseId: input.caseId,
        sourceType: input.sourceType,
        fileId: input.fileId || null,
        fileName: input.fileName || null,
        contentType: input.contentType || null,
        contentText: input.contentText || null,
        provenance: input.provenance ? JSON.parse(JSON.stringify(input.provenance)) : null,
      }
    });

    return newArtifact;
  } catch (error) {
    console.error('Error creating artifact:', error);
    throw new DatabaseError('Failed to create artifact');
  }
}

/**
 * Creates a new audit log entry in the database
 * @param input - Audit log creation data
 * @returns Promise<AuditLog> - The created audit log entry
 */
export async function createAuditLog(input: CreateAuditLogInput) {
  try {
    const newAuditLog = await prisma.auditLog.create({
      data: {
        caseId: input.caseId,
        actor: input.actor,
        action: input.action,
        tool: input.tool || null,
        payloadHash: input.payloadHash || null,
        payload: input.payload ? JSON.parse(JSON.stringify(input.payload)) : null,
      }
    });

    return newAuditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw new DatabaseError('Failed to create audit log');
  }
}

/**
 * Gets a case with all its artifacts and audit logs
 * @param caseId - The case ID to retrieve
 * @returns Promise<CaseWithArtifacts | null> - The case with relations or null if not found
 */
export async function getCaseWithArtifacts(caseId: string): Promise<CaseWithArtifacts | null> {
  try {
    const caseWithRelations = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        artifacts: {
          orderBy: { createdAt: 'desc' }
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return caseWithRelations;
  } catch (error) {
    console.error('Error getting case with artifacts:', error);
    throw new DatabaseError('Failed to get case with artifacts');
  }
}

// ============================================================================
// BUSINESS LOGIC - Agent Processing
// ============================================================================

/**
 * @deprecated Esta función crea un caso NUEVO por cada mensaje (comportamiento legacy).
 * Para el nuevo flujo, usar:
 * - /api/chat/start para crear el caso inicial
 * - /api/chat/process-message para mensajes subsecuentes del mismo caso
 * 
 * Processes a chat message and creates case, artifacts, and audit logs
 * @param userMessage - The user's message content
 * @param userId - Optional user ID for tracking
 * @param existingBrief - Optional existing brief from the UI state
 * @returns Promise<{caseId: string, response: string}> - Created case ID and agent response
 */
export async function processChatMessage(userMessage: string, userId?: string, existingBrief?: any) {
  try {
    console.log('🔄 Procesando mensaje:', userMessage);
    console.log('📋 Brief existente:', existingBrief);
    
    // Combinar el brief existente con el nuevo mensaje
    const brief: CaseBrief = {
      freeText: userMessage
    };
    
    // Si hay un brief existente, usar esos datos como base
    if (existingBrief) {
      if (existingBrief.businessType) brief.businessType = existingBrief.businessType;
      if (existingBrief.employees) brief.employees = existingBrief.employees;
      if (existingBrief.coverage) brief.coverage = existingBrief.coverage;
      // Si ya había un freeText previo, combinarlo
      if (existingBrief.freeText) {
        brief.freeText = `${existingBrief.freeText} | Usuario pregunta: ${userMessage}`;
      }
    }
    
    console.log('📝 Brief combinado:', brief);
    
    const newCase = await createCase({
      brief,
      clientName: `Cliente ${new Date().getTime()}`, // Temporal
      status: 'draft',
      stage: 'initial'
    });
    
    console.log('✅ Caso creado:', newCase.id);

    // Generar respuesta contextual que combine ambos
    const agentResponse = generateContextualResponse(userMessage, existingBrief);

    console.log('🤖 Respuesta generada:', agentResponse);

    return {
      caseId: newCase.id,
      response: agentResponse
    };

  } catch (error) {
    console.error('❌ Error procesando mensaje:', error);
    throw new DatabaseError(`Failed to process chat message: ${error}`);
  }
}

/**
 * Genera una respuesta contextual basada en el mensaje y el brief existente
 */
function generateContextualResponse(userMessage: string, existingBrief?: any): string {
  const hasExistingContext = existingBrief && (existingBrief.businessType || existingBrief.employees || existingBrief.coverage);
  
  if (hasExistingContext) {
    // Si hay contexto previo, hacer referencia a él
    const businessInfo = existingBrief.businessType ? `tu ${existingBrief.businessType}` : 'tu negocio';
    const employeeInfo = existingBrief.employees ? `con ${existingBrief.employees} empleados` : '';
    
    return `Perfecto, entiendo tu consulta sobre ${businessInfo} ${employeeInfo}. Basándome en la información que ya tenía y tu nueva pregunta: "${userMessage}", he creado un caso para buscar las mejores opciones de seguros que se adapten a tus necesidades específicas.`;
  } else {
    // Si no hay contexto previo, respuesta estándar
    return `Gracias por tu consulta: "${userMessage}". He registrado tu caso y comenzaré a buscar las mejores opciones de seguros para ti.`;
  }
}

// ============================================================================
// HELPER FUNCTIONS - Simple AI simulation
// ============================================================================

function extractBusinessType(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('restaurant') || lowerMessage.includes('comida')) return 'Restaurant';
  if (lowerMessage.includes('tienda') || lowerMessage.includes('shop')) return 'Retail';
  if (lowerMessage.includes('consultoria') || lowerMessage.includes('consulting')) return 'Consulting';
  return undefined;
}

function extractEmployeeCount(message: string): number | undefined {
  const numbers = message.match(/\d+/g);
  if (numbers) {
    const num = parseInt(numbers[0]);
    if (num > 0 && num < 10000) return num;
  }
  return undefined;
}

function extractCoverage(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('seguro') || lowerMessage.includes('insurance')) return 'General Insurance';
  if (lowerMessage.includes('salud') || lowerMessage.includes('health')) return 'Health Insurance';
  return undefined;
}

function generateAgentResponse(message: string): string {
  const responses = [
    "Entiendo que necesitas asesoría en seguros. He registrado tu caso y comenzaré a buscar las mejores opciones para ti.",
    "Perfecto, he creado un caso para tu consulta. Te ayudaré a encontrar la cobertura más adecuada.",
    "Gracias por tu mensaje. He guardado la información y procederé a analizar las mejores opciones de seguros para tu situación."
  ];
  
  const randomIndex = Math.floor(Math.random() * responses.length);
  return responses[randomIndex]!; // El ! asegura que existe
}

// ============================================================================
// CRUD OPERATIONS - EXTENDED (Multi-tenant support)
// ============================================================================

/**
 * Obtiene todos los casos de una organización con sus relaciones.
 * @param orgId - El ID de la organización.
 * @returns Promise<Case[]> - Array de casos con artifacts incluidos.
 */
export async function getCasesByOrg(orgId: string) {
  if (!orgId) throw new DatabaseError("Organization ID is required.");
  
  const cases = await prisma.case.findMany({
    where: { orgId },
    include: { 
      artifacts: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  // Convertir Decimal a Number para serialización
  return cases.map(caseItem => ({
    ...caseItem,
    max_budget: caseItem.max_budget ? Number(caseItem.max_budget) : null
  }));
}

/**
 * Obtiene un caso específico por ID, verificando que pertenezca a la organización.
 * @param caseId - El ID del caso.
 * @param orgId - El ID de la organización (para seguridad adicional).
 * @returns Promise<Case | null> - El caso con sus relaciones o null.
 */
export async function getCaseById(caseId: string, orgId: string) {
  if (!caseId || !orgId) throw new DatabaseError("Case ID and Organization ID are required.");
  
  const caseData = await prisma.case.findFirst({
    where: { 
      id: caseId, 
      orgId // RLS ya protege, pero es buena práctica añadir orgId
    },
    include: { 
      artifacts: {
        orderBy: { createdAt: 'desc' }
      },
      auditLogs: {
        orderBy: { createdAt: 'desc' },
        take: 50 // Limitar a los últimos 50 logs
      }
    }
  });

  if (!caseData) return null;

  // Convertir Decimal a Number para serialización
  return {
    ...caseData,
    max_budget: caseData.max_budget ? Number(caseData.max_budget) : null
  };
}

/**
 * Crea un nuevo caso vinculado a una organización.
 * @param orgId - El ID de la organización.
 * @param briefData - Los datos del brief del caso.
 * @param userId - El ID del usuario que crea el caso.
 * @param additionalData - Datos adicionales opcionales del caso.
 * @returns Promise<Case> - El caso creado.
 */
/**
 * Valida y normaliza max_budget para DECIMAL(10,2)
 * Rango permitido: -99,999,999.99 a 99,999,999.99
 */
function validateAndNormalizeMaxBudget(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  
  // Convertir a número si es string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Validar que sea un número válido
  if (isNaN(numValue) || !isFinite(numValue)) {
    return null;
  }
  
  // Rango máximo para DECIMAL(10,2): -99,999,999.99 a 99,999,999.99
  const MAX_VALUE = 99999999.99;
  const MIN_VALUE = -99999999.99;
  
  // Limitar al rango permitido
  if (numValue > MAX_VALUE) {
    console.warn(`⚠️ max_budget (${numValue}) excede el máximo permitido (${MAX_VALUE}). Se limitará al máximo.`);
    return MAX_VALUE;
  }
  
  if (numValue < MIN_VALUE) {
    console.warn(`⚠️ max_budget (${numValue}) es menor que el mínimo permitido (${MIN_VALUE}). Se limitará al mínimo.`);
    return MIN_VALUE;
  }
  
  // Redondear a 2 decimales para cumplir con la escala
  return Math.round(numValue * 100) / 100;
}

export async function createCaseWithOrg(
  orgId: string,
  briefData: any,
  userId: string,
  additionalData: {
    clientRef?: string;
    clientName?: string;
    businessType?: string;
    employees?: number;
    status?: 'draft' | 'active' | 'completed' | 'archived';
    stage?: 'initial' | 'sourcing' | 'analysis' | 'proposal' | 'negotiation' | 'closed';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    // Nuevos campos del Brief detallado
    insurance_category?: string;
    max_budget?: number;
    budget_currency?: 'COP' | 'USD';
    required_coverages?: string[];
    client_profile?: string;
  } = {} // <-- Añadir valor por defecto para seguridad
) {
  if (!orgId) throw new DatabaseError("Organization ID is required.");
  if (!userId) throw new DatabaseError("User ID is required.");
  
  // ✅ CORRECCIÓN CRÍTICA: Validar y normalizar max_budget antes de guardar
  const normalizedMaxBudget = validateAndNormalizeMaxBudget(additionalData.max_budget);
  
  // ✅ CORRECCIÓN: Construir objeto de datos sin undefined para cumplir con exactOptionalPropertyTypes
  const caseData: any = {
      orgId,
      briefData: briefData || {},
    status: additionalData.status || 'draft',
    stage: additionalData.stage || 'initial',
    priority: additionalData.priority || 'medium',
      budget_currency: additionalData.budget_currency || 'COP',
      required_coverages: additionalData.required_coverages || [],
  };
  
  // Solo agregar campos si tienen valor (evitar undefined)
  if (additionalData.clientRef !== undefined) caseData.clientRef = additionalData.clientRef;
  if (additionalData.clientName !== undefined) caseData.clientName = additionalData.clientName;
  if (additionalData.businessType !== undefined) caseData.businessType = additionalData.businessType;
  if (additionalData.employees !== undefined) caseData.employees = additionalData.employees;
  if (additionalData.insurance_category !== undefined) caseData.insurance_category = additionalData.insurance_category;
  if (normalizedMaxBudget !== null) caseData.max_budget = normalizedMaxBudget;
  if (additionalData.client_profile !== undefined) caseData.client_profile = additionalData.client_profile;
  
  return prisma.case.create({
    data: caseData
  });
}

/**
 * Actualiza un caso existente.
 * @param caseId - El ID del caso.
 * @param orgId - El ID de la organización (para seguridad).
 * @param data - Los datos a actualizar.
 * @returns Promise<Case> - El caso actualizado.
 */
export async function updateCaseById(caseId: string, orgId: string, data: Partial<Case>) {
  if (!caseId || !orgId) throw new DatabaseError("Case ID and Organization ID are required.");
  
  // Remover campos que no deben ser actualizados directamente
  const { id, createdAt, ...updateData } = data as any;
  
  return prisma.case.update({
    where: { id: caseId },
    data: updateData
  });
}

/**
 * Elimina un caso y todos sus artefactos asociados (CASCADE).
 * @param caseId - El ID del caso.
 * @param orgId - El ID de la organización (para seguridad).
 * @returns Promise<Case> - El caso eliminado.
 */
export async function deleteCaseById(caseId: string, orgId: string) {
  if (!caseId || !orgId) throw new DatabaseError("Case ID and Organization ID are required.");
  
  // Verificar que el caso pertenece a la organización antes de eliminar
  const caseToDelete = await prisma.case.findFirst({
    where: { id: caseId, orgId }
  });
  
  if (!caseToDelete) {
    throw new CaseNotFoundError(caseId);
  }
  
  return prisma.case.delete({
    where: { id: caseId }
  });
}

/**
 * Asigna un cliente a un caso.
 * @param caseId - El ID del caso.
 * @param clientId - El ID del cliente.
 * @param orgId - El ID de la organización (para seguridad).
 * @returns Promise<Case> - El caso actualizado.
 */
export async function assignClientToCase(caseId: string, clientId: string, orgId: string) {
  if (!caseId || !clientId || !orgId) {
    throw new DatabaseError("Case ID, Client ID and Organization ID are required.");
  }
  
  // ✅ CORRECCIÓN: clientId no existe en el schema, usar clientRef en su lugar
  return prisma.case.update({
    where: { id: caseId },
    data: { clientRef: clientId } // Usar clientRef que es el campo correcto
  });
}

/**
 * Obtiene estadísticas de casos por organización.
 * @param orgId - El ID de la organización.
 * @returns Promise<object> - Estadísticas de casos.
 */
export async function getCaseStatsByOrg(orgId: string) {
  if (!orgId) throw new DatabaseError("Organization ID is required.");
  
  const cases = await prisma.case.findMany({
    where: { orgId },
    include: { artifacts: true }
  });
  
  return {
    total: cases.length,
    byStatus: {
      draft: cases.filter(c => c.status === 'draft').length,
      active: cases.filter(c => c.status === 'active').length,
      completed: cases.filter(c => c.status === 'completed').length,
      archived: cases.filter(c => c.status === 'archived').length,
    },
    byStage: {
      initial: cases.filter(c => c.stage === 'initial').length,
      sourcing: cases.filter(c => c.stage === 'sourcing').length,
      analysis: cases.filter(c => c.stage === 'analysis').length,
      proposal: cases.filter(c => c.stage === 'proposal').length,
      negotiation: cases.filter(c => c.stage === 'negotiation').length,
      closed: cases.filter(c => c.stage === 'closed').length,
    },
    byPriority: {
      low: cases.filter(c => c.priority === 'low').length,
      medium: cases.filter(c => c.priority === 'medium').length,
      high: cases.filter(c => c.priority === 'high').length,
      urgent: cases.filter(c => c.priority === 'urgent').length,
    },
    totalArtifacts: cases.reduce((sum, c) => sum + (c.artifacts?.length || 0), 0),
  };
}