// /src/lib/clientsDb.ts
/**
 * Database operations for Clients with PII Encryption
 * 
 * Este módulo maneja operaciones CRUD para clientes con cifrado de datos PII.
 * Utiliza las funciones encrypt_pii() y decrypt_pii() de PostgreSQL con pgcrypto.
 * 
 * IMPORTANTE: Requiere que APP_ENCRYPTION_KEY esté configurada en .env.local
 */

import { prisma } from './prisma';
import { Prisma } from '@prisma/client';

// Tipo para clientes descifrados
export interface DecryptedClient {
  id: string;
  orgId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Tipo para crear un cliente
export interface CreateClientInput {
  orgId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

// Tipo para actualizar un cliente
export interface UpdateClientInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

// La función 'setEncryptionKey' ya no es necesaria y debe ser eliminada.

/**
 * Crea un nuevo cliente cifrando sus datos PII.
 * 
 * @param clientData - Datos del cliente a crear
 * @returns El ID del cliente creado
 * 
 * @example
 * const clientId = await createClient({
 *   orgId: 'org-uuid',
 *   name: 'Juan Pérez',
 *   email: 'juan@example.com',
 *   phone: '+52 1234567890'
 * });
 */
export async function createClient(orgId: string, clientData: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}): Promise<string> {
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;

  if (!encryptionKey || encryptionKey === 'REPLACE_WITH_A_SECURE_KEY_GENERATED_BY_OPENSSL') {
    throw new Error(
      'CRITICAL: APP_ENCRYPTION_KEY no está configurada correctamente en tu archivo .env.local. ' +
      'Por favor, genera una clave segura y reinicia el servidor.'
    );
  }

  // Usamos una transacción de Prisma. Esto asegura que la configuración de la clave
  // y la inserción del cliente ocurran en la misma sesión de la base de datos,
  // garantizando que `encrypt_pii` tenga acceso a la clave.
  const result = await prisma.$transaction(async (tx) => {
    // Paso 1: Configurar la clave de cifrado para esta transacción específica.
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    // Paso 2: Ejecutar la inserción usando la función de cifrado de la BD.
    return tx.$queryRaw<Array<{ id: string }>>`
      INSERT INTO public.clients (org_id, name_enc, email_enc, phone_enc, address_enc)
      VALUES (
        ${orgId}::uuid,
        public.encrypt_pii(${clientData.name}),
        ${clientData.email ? Prisma.sql`public.encrypt_pii(${clientData.email})` : Prisma.sql`NULL`},
        ${clientData.phone ? Prisma.sql`public.encrypt_pii(${clientData.phone})` : Prisma.sql`NULL`},
        ${clientData.address ? Prisma.sql`public.encrypt_pii(${clientData.address})` : Prisma.sql`NULL`}
      )
      RETURNING id
    `;
  });

  if (!result || result.length === 0) {
    throw new Error('La creación del cliente falló y no devolvió un ID.');
  }

  return result[0].id;
}

/**
 * Obtiene y descifra todos los clientes de una organización.
 * 
 * @param orgId - El ID de la organización
 * @returns Array de clientes descifrados
 * 
 * @example
 * const clients = await getClientsByOrg('org-uuid');
 * clients.forEach(client => {
 *   console.log(client.name, client.email); // Datos descifrados
 * });
 */
export async function getClientsByOrg(orgId: string): Promise<DecryptedClient[]> {
  if (!orgId) {
    throw new Error('Organization ID is required');
  }
  
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('APP_ENCRYPTION_KEY no está configurada.');
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    // Obtener y descifrar clientes usando raw SQL
    return tx.$queryRaw<DecryptedClient[]>`
      SELECT 
        id::text,
        org_id::text as "orgId",
        public.decrypt_pii(name_enc) as name,
        public.decrypt_pii(email_enc) as email,
        public.decrypt_pii(phone_enc) as phone,
        public.decrypt_pii(address_enc) as address,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM public.clients
      WHERE org_id = ${orgId}::uuid
      ORDER BY created_at DESC
    `;
  });
}

/**
 * Obtiene un cliente específico por ID y lo descifra.
 * 
 * @param clientId - El ID del cliente
 * @param orgId - El ID de la organización (para seguridad)
 * @returns Cliente descifrado o null si no existe
 */
export async function getClientById(
  clientId: string,
  orgId: string
): Promise<DecryptedClient | null> {
  if (!clientId || !orgId) {
    throw new Error('Client ID and Organization ID are required');
  }
  
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('APP_ENCRYPTION_KEY no está configurada.');
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    // Obtener y descifrar el cliente
    const clients = await tx.$queryRaw<DecryptedClient[]>`
      SELECT 
        id::text,
        org_id::text as "orgId",
        public.decrypt_pii(name_enc) as name,
        public.decrypt_pii(email_enc) as email,
        public.decrypt_pii(phone_enc) as phone,
        public.decrypt_pii(address_enc) as address,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM public.clients
      WHERE id = ${clientId}::uuid AND org_id = ${orgId}::uuid
      LIMIT 1
    `;
    
    return clients.length > 0 ? clients[0] : null;
  });
}

/**
 * Actualiza un cliente existente cifrando los nuevos datos.
 * 
 * @param clientId - El ID del cliente
 * @param orgId - El ID de la organización (para seguridad)
 * @param updateData - Datos a actualizar (solo los campos proporcionados)
 * @returns true si se actualizó correctamente
 */
export async function updateClient(
  clientId: string,
  orgId: string,
  updateData: UpdateClientInput
): Promise<boolean> {
  if (!clientId || !orgId) {
    throw new Error('Client ID and Organization ID are required');
  }
  
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('APP_ENCRYPTION_KEY no está configurada.');
  }

  // Verificar que hay datos para actualizar
  if (Object.keys(updateData).length === 0) {
    return false; // No hay nada que actualizar
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
    
    // Construir la query de actualización usando Prisma.sql para evitar inyección SQL
    const updateFields: Prisma.Sql[] = [];
    
    if (updateData.name !== undefined) {
      updateFields.push(Prisma.sql`name_enc = public.encrypt_pii(${updateData.name})`);
    }
    if (updateData.email !== undefined) {
      if (updateData.email) {
        updateFields.push(Prisma.sql`email_enc = public.encrypt_pii(${updateData.email})`);
      } else {
        updateFields.push(Prisma.sql`email_enc = NULL`);
      }
    }
    if (updateData.phone !== undefined) {
      if (updateData.phone) {
        updateFields.push(Prisma.sql`phone_enc = public.encrypt_pii(${updateData.phone})`);
      } else {
        updateFields.push(Prisma.sql`phone_enc = NULL`);
      }
    }
    if (updateData.address !== undefined) {
      if (updateData.address) {
        updateFields.push(Prisma.sql`address_enc = public.encrypt_pii(${updateData.address})`);
      } else {
        updateFields.push(Prisma.sql`address_enc = NULL`);
      }
    }
    
    // Ejecutar la actualización usando Prisma.sql
    await tx.$executeRaw`
      UPDATE public.clients 
      SET ${Prisma.join(updateFields, Prisma.sql`, `)}, updated_at = NOW()
      WHERE id = ${clientId}::uuid AND org_id = ${orgId}::uuid
    `;
    
    return true;
  });
}

/**
 * Elimina un cliente de la base de datos.
 * 
 * @param clientId - El ID del cliente
 * @param orgId - El ID de la organización (para seguridad)
 * @returns true si se eliminó correctamente
 */
export async function deleteClient(clientId: string, orgId: string): Promise<boolean> {
  if (!clientId || !orgId) {
    throw new Error('Client ID and Organization ID are required');
  }
  
  // Verificar que el cliente existe y pertenece a la organización
  const client = await getClientById(clientId, orgId);
  
  if (!client) {
    throw new Error('Client not found or does not belong to this organization');
  }
  
  // Eliminar el cliente
  await prisma.$executeRaw`
    DELETE FROM public.clients 
    WHERE id = ${clientId}::uuid AND org_id = ${orgId}::uuid
  `;
  
  return true;
}

/**
 * Busca clientes por nombre (búsqueda descifrada).
 * Nota: Esta operación puede ser lenta con muchos clientes.
 * 
 * @param orgId - El ID de la organización
 * @param searchTerm - Término de búsqueda
 * @returns Array de clientes que coinciden con la búsqueda
 */
export async function searchClientsByName(
  orgId: string,
  searchTerm: string
): Promise<DecryptedClient[]> {
  if (!orgId || !searchTerm) {
    return [];
  }
  
  // Obtener todos los clientes y filtrar en memoria
  // (No podemos buscar directamente en campos cifrados)
  const allClients = await getClientsByOrg(orgId);
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  return allClients.filter(client => 
    client.name.toLowerCase().includes(lowerSearchTerm) ||
    client.email?.toLowerCase().includes(lowerSearchTerm) ||
    client.phone?.toLowerCase().includes(lowerSearchTerm)
  );
}

/**
 * Obtiene estadísticas de clientes por organización.
 * 
 * @param orgId - El ID de la organización
 * @returns Estadísticas de clientes
 */
export async function getClientStatsByOrg(orgId: string) {
  if (!orgId) {
    throw new Error('Organization ID is required');
  }
  
  const clients = await getClientsByOrg(orgId);
  
  return {
    total: clients.length,
    withEmail: clients.filter(c => c.email).length,
    withPhone: clients.filter(c => c.phone).length,
    withAddress: clients.filter(c => c.address).length,
  };
}
