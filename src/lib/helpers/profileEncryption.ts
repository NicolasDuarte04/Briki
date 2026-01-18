// /src/lib/helpers/profileEncryption.ts
/**
 * Profile Encryption Helpers
 * 
 * Este módulo maneja la encriptación y desencriptación de campos PII en profiles.
 * Utiliza las funciones encrypt_pii() y decrypt_pii() de PostgreSQL con pgcrypto.
 * 
 * IMPORTANTE: Requiere que APP_ENCRYPTION_KEY esté configurada en .env.local
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Encripta el teléfono de un perfil antes de guardarlo en la BD.
 * 
 * @param phone - Teléfono en texto plano
 * @returns Buffer con el teléfono encriptado, o null si phone es null/undefined
 * 
 * @throws {Error} Si APP_ENCRYPTION_KEY no está configurada
 * 
 * @example
 * const encrypted = await encryptProfilePhone("+52 1234567890");
 * await prisma.profile.update({ data: { phone: encrypted, ... } });
 */
export async function encryptProfilePhone(phone: string | null | undefined): Promise<Buffer | null> {
  if (!phone || phone.trim() === '') {
    return null;
  }

  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    const encrypted = await tx.$queryRaw<Array<{ encrypted: Buffer }>>` 
      SELECT public.encrypt_pii(${phone}) as encrypted
    `;
    
    // Retornar Buffer directamente - compatible con Prisma BYTEA
    return encrypted[0]?.encrypted ?? null;
  }, {
    timeout: 30000,
  });

  return result;
}/**
 * Desencripta el teléfono de un perfil al leerlo de la BD.
 * 
 * @param encrypted - Buffer o Uint8Array con el teléfono encriptado
 * @returns Teléfono en texto plano, o null si encrypted es null/empty
 * 
 * @throws {Error} Si APP_ENCRYPTION_KEY no está configurada
 * 
 * @example
 * const profile = await prisma.profile.findUnique({ where: { id } });
 * const decrypted = profile.phone ? await decryptProfilePhone(profile.phone) : null;
 */
export async function decryptProfilePhone(encrypted: Buffer | Uint8Array | null): Promise<string | null> {
  if (!encrypted || encrypted.length === 0) {
    return null;
  }

  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  // Convertir Uint8Array a Buffer si es necesario
  const contentBuffer = Buffer.isBuffer(encrypted) 
    ? encrypted 
    : Buffer.from(encrypted);

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    const decrypted = await tx.$queryRaw<Array<{ decrypted: string }>>`
      SELECT public.decrypt_pii(${contentBuffer}::bytea) as decrypted
    `;
    
    return decrypted[0]?.decrypted || null;
  }, {
    timeout: 30000,
  });

  return result;
}

/**
 * Encripta el nombre de un perfil antes de guardarlo en la BD.
 * 
 * @param name - Nombre en texto plano
 * @returns Buffer con el nombre encriptado, o null si name es null/undefined
 * 
 * @throws {Error} Si APP_ENCRYPTION_KEY no está configurada
 * 
 * @example
 * const encrypted = await encryptProfileName("Juan Pérez");
 * await prisma.profile.update({ data: { name: encrypted, ... } });
 */
export async function encryptProfileName(name: string | null | undefined): Promise<Buffer | null> {
  if (!name || name.trim() === '') {
    return null;
  }

  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    const encrypted = await tx.$queryRaw<Array<{ encrypted: Buffer }>>` 
      SELECT public.encrypt_pii(${name}) as encrypted
    `;
    
    // Retornar Buffer directamente - compatible con Prisma BYTEA
    return encrypted[0]?.encrypted ?? null;
  }, {
    timeout: 30000,
  });

  return result;
}/**
 * Desencripta el nombre de un perfil al leerlo de la BD.
 * 
 * @param encrypted - Buffer o Uint8Array con el nombre encriptado
 * @returns Nombre en texto plano, o null si encrypted es null/empty
 * 
 * @throws {Error} Si APP_ENCRYPTION_KEY no está configurada
 * 
 * @example
 * const profile = await prisma.profile.findUnique({ where: { id } });
 * const decrypted = profile.name ? await decryptProfileName(profile.name) : null;
 */
export async function decryptProfileName(encrypted: Buffer | Uint8Array | null): Promise<string | null> {
  if (!encrypted || encrypted.length === 0) {
    return null;
  }

  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  // Convertir Uint8Array a Buffer si es necesario
  const contentBuffer = Buffer.isBuffer(encrypted) 
    ? encrypted 
    : Buffer.from(encrypted);

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    const decrypted = await tx.$queryRaw<Array<{ decrypted: string }>>`
      SELECT public.decrypt_pii(${contentBuffer}::bytea) as decrypted
    `;
    
    return decrypted[0]?.decrypted || null;
  }, {
    timeout: 30000,
  });

  return result;
}

/**
 * Encripta la dirección de un perfil antes de guardarlo en la BD.
 * 
 * @param address - Dirección en texto plano
 * @returns Buffer con la dirección encriptada, o null si address es null/undefined
 * 
 * @throws {Error} Si APP_ENCRYPTION_KEY no está configurada
 * 
 * @example
 * const encrypted = await encryptProfileAddress("Calle Principal 123");
 * await prisma.profile.update({ data: { address: encrypted, ... } });
 */
export async function encryptProfileAddress(address: string | null | undefined): Promise<Buffer | null> {
  if (!address || address.trim() === '') {
    return null;
  }

  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    const encrypted = await tx.$queryRaw<Array<{ encrypted: Buffer }>>` 
      SELECT public.encrypt_pii(${address}) as encrypted
    `;
    
    // Retornar Buffer directamente - compatible con Prisma BYTEA
    return encrypted[0]?.encrypted ?? null;
  }, {
    timeout: 30000,
  });

  return result;
}/**
 * Desencripta la dirección de un perfil al leerlo de la BD.
 * 
 * @param encrypted - Buffer o Uint8Array con la dirección encriptada
 * @returns Dirección en texto plano, o null si encrypted es null/empty
 * 
 * @throws {Error} Si APP_ENCRYPTION_KEY no está configurada
 * 
 * @example
 * const profile = await prisma.profile.findUnique({ where: { id } });
 * const decrypted = profile.address ? await decryptProfileAddress(profile.address) : null;
 */
export async function decryptProfileAddress(encrypted: Buffer | Uint8Array | null): Promise<string | null> {
  if (!encrypted || encrypted.length === 0) {
    return null;
  }

  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  // Convertir Uint8Array a Buffer si es necesario
  const contentBuffer = Buffer.isBuffer(encrypted) 
    ? encrypted 
    : Buffer.from(encrypted);

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    const decrypted = await tx.$queryRaw<Array<{ decrypted: string }>>`
      SELECT public.decrypt_pii(${contentBuffer}::bytea) as decrypted
    `;
    
    return decrypted[0]?.decrypted || null;
  }, {
    timeout: 30000,
  });

  return result;
}

/**
 * Tipo para entrada de desencriptación batch
 */
export interface BatchDecryptInput {
  id: string;
  encryptedName: Buffer | Uint8Array | null;
}

/**
 * Tipo para resultado de desencriptación batch
 */
export interface BatchDecryptResult {
  id: string;
  decryptedName: string | null;
}

/**
 * Desencripta múltiples nombres de perfil en UNA SOLA transacción.
 * Esta función evita el problema de agotamiento del pool de conexiones
 * que ocurre al ejecutar múltiples transacciones en paralelo con Promise.all.
 * 
 * @param inputs - Array de objetos con id y encryptedName
 * @returns Array de objetos con id y decryptedName
 * 
 * @example
 * const members = [
 *   { id: 'member1', encryptedName: buffer1 },
 *   { id: 'member2', encryptedName: buffer2 },
 * ];
 * const results = await decryptProfileNamesBatch(members);
 * // results = [{ id: 'member1', decryptedName: 'Juan' }, { id: 'member2', decryptedName: 'María' }]
 */
export async function decryptProfileNamesBatch(inputs: BatchDecryptInput[]): Promise<BatchDecryptResult[]> {
  // Si no hay inputs o están vacíos, retornar array vacío
  if (!inputs || inputs.length === 0) {
    return [];
  }

  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  // Filtrar inputs que tienen nombre encriptado válido
  const validInputs = inputs.filter(input => input.encryptedName && input.encryptedName.length > 0);
  
  // Si no hay nombres válidos para desencriptar, retornar resultados con null
  if (validInputs.length === 0) {
    return inputs.map(input => ({ id: input.id, decryptedName: null }));
  }

  try {
    // Ejecutar UNA SOLA transacción para desencriptar todos los nombres
    const decryptedMap = await prisma.$transaction(async (tx) => {
      // Configurar la clave de encriptación una sola vez
      await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
      
      // Desencriptar cada nombre secuencialmente dentro de la misma transacción
      const results = new Map<string, string | null>();
      
      for (const input of validInputs) {
        const contentBuffer = Buffer.isBuffer(input.encryptedName) 
          ? input.encryptedName 
          : Buffer.from(input.encryptedName!);
        
        try {
          const decrypted = await tx.$queryRaw<Array<{ decrypted: string }>>`
            SELECT public.decrypt_pii(${contentBuffer}::bytea) as decrypted
          `;
          results.set(input.id, decrypted[0]?.decrypted || null);
        } catch (innerErr) {
          console.warn(`[decryptProfileNamesBatch] Error desencriptando nombre para id ${input.id}:`, innerErr);
          results.set(input.id, null);
        }
      }
      
      return results;
    }, {
      timeout: 60000, // 60 segundos para batch
      maxWait: 10000, // Esperar máximo 10s para obtener conexión
    });

    // Construir resultado final incluyendo inputs sin nombre
    return inputs.map(input => ({
      id: input.id,
      decryptedName: decryptedMap.get(input.id) || null
    }));

  } catch (error) {
    console.error('[decryptProfileNamesBatch] Error en transacción batch:', error);
    
    // En caso de error total, retornar todos como null
    return inputs.map(input => ({ id: input.id, decryptedName: null }));
  }
}

// ============================================================================
// DESENCRIPTACIÓN BATCH PARA PROFILE (name, phone, address en UNA transacción)
// ============================================================================

/**
 * Tipo para los campos encriptados del profile
 */
export interface ProfileEncryptedFields {
  name: Buffer | Uint8Array | null;
  phone: Buffer | Uint8Array | null;
  address: Buffer | Uint8Array | null;
}

/**
 * Tipo para el resultado de desencriptación del profile
 */
export interface ProfileDecryptedFields {
  name: string | null;
  phone: string | null;
  address: string | null;
}

/**
 * Desencripta los 3 campos PII del profile (name, phone, address) en UNA SOLA transacción.
 * 
 * Esta función optimiza el rendimiento al:
 * - Usar una única conexión del pool
 * - Configurar la clave de encriptación una sola vez
 * - Reducir 3 RTTs a 1 solo RTT
 * 
 * @param fields - Objeto con los campos encriptados (name, phone, address)
 * @returns Objeto con los campos desencriptados
 * 
 * @example
 * const profile = await prisma.profile.findUnique({ where: { id: userId } });
 * const decrypted = await decryptProfileFieldsBatch({
 *   name: profile.name,
 *   phone: profile.phone,
 *   address: profile.address,
 * });
 * // decrypted = { name: 'Juan', phone: '+57123', address: 'Calle 123' }
 */
export async function decryptProfileFieldsBatch(
  fields: ProfileEncryptedFields
): Promise<ProfileDecryptedFields> {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  // Si todos los campos son null o vacíos, retornar nulls sin ir a la BD
  const hasName = fields.name && fields.name.length > 0;
  const hasPhone = fields.phone && fields.phone.length > 0;
  const hasAddress = fields.address && fields.address.length > 0;

  if (!hasName && !hasPhone && !hasAddress) {
    return { name: null, phone: null, address: null };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Configurar la clave de encriptación UNA sola vez
      await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
      
      const decrypted: ProfileDecryptedFields = {
        name: null,
        phone: null,
        address: null,
      };

      // Desencriptar name si existe
      if (hasName) {
        const nameBuffer = Buffer.isBuffer(fields.name) 
          ? fields.name 
          : Buffer.from(fields.name!);
        const nameResult = await tx.$queryRaw<Array<{ decrypted: string }>>`
          SELECT public.decrypt_pii(${nameBuffer}::bytea) as decrypted
        `;
        decrypted.name = nameResult[0]?.decrypted || null;
      }

      // Desencriptar phone si existe
      if (hasPhone) {
        const phoneBuffer = Buffer.isBuffer(fields.phone) 
          ? fields.phone 
          : Buffer.from(fields.phone!);
        const phoneResult = await tx.$queryRaw<Array<{ decrypted: string }>>`
          SELECT public.decrypt_pii(${phoneBuffer}::bytea) as decrypted
        `;
        decrypted.phone = phoneResult[0]?.decrypted || null;
      }

      // Desencriptar address si existe
      if (hasAddress) {
        const addressBuffer = Buffer.isBuffer(fields.address) 
          ? fields.address 
          : Buffer.from(fields.address!);
        const addressResult = await tx.$queryRaw<Array<{ decrypted: string }>>`
          SELECT public.decrypt_pii(${addressBuffer}::bytea) as decrypted
        `;
        decrypted.address = addressResult[0]?.decrypted || null;
      }

      return decrypted;
    }, {
      timeout: 30000, // 30 segundos timeout
      maxWait: 10000, // Esperar máximo 10s para obtener conexión
    });

    return result;

  } catch (error) {
    console.error('[decryptProfileFieldsBatch] Error en transacción batch:', error);
    // En caso de error, retornar nulls en lugar de lanzar excepción
    // Esto permite que la página se renderice con datos parciales
    return { name: null, phone: null, address: null };
  }
}
