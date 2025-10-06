/**
 * Database operations for Cases, Artifacts, and Audit Logs
 * 
 * This module provides CRUD operations and business logic for managing
 * insurance cases, generated artifacts, and audit trails.
 */

import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';
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
 * Processes a chat message and creates case, artifacts, and audit logs
 * @param userMessage - The user's message content
 * @param userId - Optional user ID for tracking
 * @returns Promise<{caseId: string, response: string}> - Created case ID and agent response
 */
export async function processChatMessage(userMessage: string, userId?: string) {
  try {
    console.log('🔄 Procesando mensaje:', userMessage);
    
    // 1. Crear el caso basado en el mensaje del usuario
    const brief: CaseBrief = {
      freeText: userMessage
    };
    
    console.log('📝 Brief creado:', brief);
    
    const newCase = await createCase({
      brief,
      clientName: `Cliente ${new Date().getTime()}`, // Temporal
      status: 'draft',
      stage: 'initial'
    });
    
    console.log('✅ Caso creado:', newCase.id);

    // 4. Generar respuesta del agente (simplificada)
    const agentResponse = `Perfecto, he recibido tu consulta sobre: "${userMessage}". He creado el caso ${newCase.id} y comenzaré a buscar las mejores opciones para ti.`;

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