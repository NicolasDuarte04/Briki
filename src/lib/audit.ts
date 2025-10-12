// Helper de auditoría centralizado
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export interface RecordAuditLogInput {
  caseId: string;
  actor: string; // user id o email
  action: string; // e.g., 'artifact_uploaded', 'case_created'
  tool?: string; // e.g., 'upload_api'
  payload?: Record<string, unknown> | null;
}

export async function recordAuditLog(input: RecordAuditLogInput) {
  const payloadJson = input.payload ? JSON.stringify(input.payload) : null;
  const payloadHash = payloadJson
    ? crypto.createHash('sha256').update(payloadJson).digest('hex')
    : null;

  return prisma.auditLog.create({
    data: {
      caseId: input.caseId,
      actor: input.actor,
      action: input.action,
      tool: input.tool ?? null,
      payloadHash,
      payload: input.payload ? JSON.parse(payloadJson!) : null,
    },
  });
}

// Atajo con manejo seguro de errores (no lanza, registra en consola)
export async function tryRecordAuditLog(input: RecordAuditLogInput) {
  try {
    await recordAuditLog(input);
  } catch (err) {
    console.warn('Audit log failed:', err);
  }
}


