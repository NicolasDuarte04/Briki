// /src/lib/helpers/messageEncryption.ts
/**
 * Message Encryption Helpers
 * 
 * Este módulo maneja la encriptación y desencriptación de mensajes.
 * Utiliza las funciones encrypt_pii() y decrypt_pii() de PostgreSQL con pgcrypto.
 * 
 * IMPORTANTE: Requiere que APP_ENCRYPTION_KEY esté configurada en .env.local
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Encripta el contenido de un mensaje antes de guardarlo en la BD.
 * 
 * @param content - Contenido del mensaje en texto plano
 * @returns Buffer con el contenido encriptado (compatible con Prisma Bytes)
 * 
 * @throws {Error} Si APP_ENCRYPTION_KEY no está configurada
 * 
 * @example
 * const encrypted = await encryptMessageContent("Hola, necesito ayuda");
 * await prisma.message.create({ data: { content: encrypted, ... } });
 */
export async function encryptMessageContent(content: string): Promise<Buffer> {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  // Usamos una transacción de Prisma para asegurar que la configuración de la clave
  // y la encriptación ocurran en la misma sesión de la base de datos
  const result = await prisma.$transaction(async (tx) => {
    // Paso 1: Configurar la clave de cifrado para esta transacción específica
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    // Paso 2: Ejecutar la encriptación usando la función de cifrado de la BD
    const encrypted = await tx.$queryRaw<Array<{ encrypted: Buffer }>>`
      SELECT public.encrypt_pii(${content}) as encrypted
    `;
    
    const buffer = encrypted[0]?.encrypted || Buffer.from('');
    // Prisma Bytes acepta tanto Buffer como Uint8Array
    // Retornamos Buffer directamente para evitar problemas de tipos
    return buffer;
  }, {
    timeout: 30000, // 30 segundos timeout para operaciones de cifrado
  });

  return result;
}

/**
 * Desencripta el contenido de un mensaje al leerlo de la BD.
 * 
 * @param encrypted - Buffer o Uint8Array con el contenido encriptado
 * @returns Contenido del mensaje en texto plano
 * 
 * @throws {Error} Si APP_ENCRYPTION_KEY no está configurada
 * 
 * @example
 * const message = await prisma.message.findUnique({ where: { id } });
 * const decrypted = await decryptMessageContent(message.content);
 */
export async function decryptMessageContent(encrypted: Buffer | Uint8Array): Promise<string> {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  // Si el buffer está vacío o es null, retornar string vacío
  if (!encrypted || encrypted.length === 0) {
    return '';
  }

  // Convertir Uint8Array a Buffer si es necesario
  const contentBuffer = Buffer.isBuffer(encrypted) 
    ? encrypted 
    : Buffer.from(encrypted);

  // Usamos una transacción de Prisma para asegurar que la configuración de la clave
  // y la desencriptación ocurran en la misma sesión de la base de datos
  const result = await prisma.$transaction(async (tx) => {
    // Paso 1: Configurar la clave de cifrado para esta transacción específica
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    // Paso 2: Ejecutar la desencriptación usando la función de descifrado de la BD
    const decrypted = await tx.$queryRaw<Array<{ decrypted: string }>>`
      SELECT public.decrypt_pii(${contentBuffer}::bytea) as decrypted
    `;
    
    return decrypted[0]?.decrypted || '';
  }, {
    timeout: 30000, // 30 segundos timeout para operaciones de cifrado
  });

  return result;
}

/**
 * Desencripta múltiples mensajes de forma eficiente.
 * 
 * @param messages - Array de mensajes con contenido encriptado
 * @returns Array de mensajes con contenido desencriptado
 * 
 * @example
 * const messages = await prisma.message.findMany({ where: { caseId } });
 * const decrypted = await decryptMessages(messages);
 */
export async function decryptMessages<T extends { content: Buffer | Uint8Array }>(
  messages: T[]
): Promise<Array<Omit<T, 'content'> & { content: string }>> {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  // Si no hay mensajes, retornar array vacío
  if (messages.length === 0) {
    return [];
  }

  // Usamos una transacción para desencriptar todos los mensajes de una vez
  const decryptedMessages = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    // Desencriptar todos los mensajes en paralelo
    const decryptionPromises = messages.map(async (msg) => {
      if (!msg.content || msg.content.length === 0) {
        return {
          ...msg,
          content: '' as string,
        };
      }

      // Convertir Uint8Array a Buffer si es necesario
      const contentBuffer = Buffer.isBuffer(msg.content) 
        ? msg.content 
        : Buffer.from(msg.content);

      const decrypted = await tx.$queryRaw<Array<{ decrypted: string }>>`
        SELECT public.decrypt_pii(${contentBuffer}::bytea) as decrypted
      `;
      
      return {
        ...msg,
        content: decrypted[0]?.decrypted || '',
      };
    });

    return Promise.all(decryptionPromises);
  }, {
    timeout: 60000, // 60 segundos timeout para múltiples desencriptaciones
  });

  return decryptedMessages;
}

