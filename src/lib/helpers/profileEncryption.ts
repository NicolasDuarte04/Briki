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
    
    const buffer = encrypted[0]?.encrypted || Buffer.from('');
    // Prisma Bytes acepta Buffer directamente
    return buffer;
  }, {
    timeout: 30000,
  });

  return result;
}

/**
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
    
    const buffer = encrypted[0]?.encrypted || Buffer.from('');
    // Prisma Bytes acepta Buffer directamente
    return buffer;
  }, {
    timeout: 30000,
  });

  return result;
}

/**
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
    
    const buffer = encrypted[0]?.encrypted || Buffer.from('');
    // Prisma Bytes acepta Buffer directamente
    return buffer;
  }, {
    timeout: 30000,
  });

  return result;
}

/**
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

