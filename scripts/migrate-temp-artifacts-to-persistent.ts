/**
 * SCRIPT DE MIGRACIÓN: Mover artifacts temporales a rutas persistentes
 * 
 * Este script:
 * 1. Identifica artifacts con file_id apuntando a archivos temporales
 * 2. Mueve cada archivo de temp/ a {orgId}/{caseId}/... usando moveTempToPersistent()
 * 3. Actualiza file_id en cada artifact
 * 4. Reporta resultados detallados
 * 
 * Uso:
 *   pnpm tsx scripts/migrate-temp-artifacts-to-persistent.ts --dry-run  # Modo simulación
 *   pnpm tsx scripts/migrate-temp-artifacts-to-persistent.ts            # Ejecución real
 * 
 * Principios:
 * - Reutilización máxima: Usa función helper moveTempToPersistent()
 * - Separación de responsabilidades: Solo migra artifacts existentes
 * - Manejo robusto de errores: Continúa con otros artifacts si uno falla
 * - Validación exhaustiva: Verifica integridad antes y después
 */

import { prisma } from '../src/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { env } from '../src/lib/env';

// Crear cliente Supabase con Service Role Key para scripts
function createSupabaseForScript() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

interface ArtifactToMigrate {
  id: string;
  fileId: string;
  fileName: string | null;
  caseId: string;
  orgId: string;
  createdAt: Date;
}

interface MigrationResult {
  artifactId: string;
  success: boolean;
  oldPath: string;
  newPath?: string;
  error?: string;
  warning?: string;
}

interface MigrationSummary {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ artifactId: string; error: string }>;
  warnings: Array<{ artifactId: string; warning: string }>;
}

/**
 * Obtener artifacts que apuntan a archivos temporales
 */
async function getTempArtifacts(): Promise<ArtifactToMigrate[]> {
  console.log('🔍 [Migración] Buscando artifacts con file_id temporal...');
  
  const artifacts = await prisma.artifact.findMany({
    where: {
      fileId: {
        startsWith: 'temp/'
      }
    },
    include: {
      case: {
        select: {
          orgId: true
        }
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  });
  
  console.log(`✅ [Migración] Encontrados ${artifacts.length} artifacts temporales`);
  
  return artifacts.map(a => ({
    id: a.id,
    fileId: a.fileId!,
    fileName: a.fileName,
    caseId: a.caseId,
    orgId: a.case.orgId || '', // Puede ser null, manejaremos esto
    createdAt: a.createdAt
  })).filter(a => {
    // Filtrar artifacts sin orgId (no se pueden migrar)
    if (!a.orgId) {
      console.warn(`⚠️ [Migración] Artifact ${a.id} sin orgId, será omitido`);
      return false;
    }
    return true;
  });
}

/**
 * Mover archivo temporal a persistente (versión para scripts)
 * Reutiliza la lógica de moveTempToPersistent pero con cliente Supabase directo
 */
async function moveTempToPersistentForScript(
  supabase: ReturnType<typeof createSupabaseForScript>,
  tempPath: string,
  orgId: string,
  caseId: string,
  fileName: string,
  userId: string
): Promise<{ success: boolean; persistentPath?: string; error?: string; warning?: string }> {
  try {
    // Validar que tempPath es temporal
    if (!tempPath || !tempPath.startsWith('temp/')) {
      return { 
        success: false, 
        error: 'Path is not a temporary path. Expected path starting with "temp/"' 
      };
    }
    
    // Generar ruta persistente
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const persistentPath = `${orgId}/${caseId}/${timestamp}_${sanitizedFileName}`;
    
    // 1. Descargar archivo temporal
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('artifacts')
      .download(tempPath);
    
    if (downloadError || !fileData) {
      return { 
        success: false, 
        error: `Failed to download temp file: ${downloadError?.message || 'File not found'}` 
      };
    }
    
    // Convertir Blob a Buffer para upload
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // 2. Subir archivo a ruta persistente con metadata correcta
    const { error: uploadError } = await supabase.storage
      .from('artifacts')
      .upload(persistentPath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'application/pdf',
        metadata: {
          org_id: String(orgId),
          case_id: String(caseId),
          uploaded_by: String(userId),
          file_name: String(fileName),
          content_type: 'application/pdf',
          uploaded_at: new Date().toISOString(),
          migrated_from_temp: 'true',
          original_temp_path: tempPath,
        }
      });
    
    if (uploadError) {
      return { 
        success: false, 
        error: `Failed to upload to persistent path: ${uploadError.message}` 
      };
    }
    
    // 3. Eliminar archivo temporal original
    const { error: deleteError } = await supabase.storage
      .from('artifacts')
      .remove([tempPath]);
    
    if (deleteError) {
      return { 
        success: true, 
        persistentPath,
        warning: `File moved successfully but temp file could not be deleted: ${deleteError.message}. It will be cleaned up automatically.`
      };
    }
    
    return { success: true, persistentPath };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred during file movement' 
    };
  }
}

/**
 * Migrar un artifact individual
 */
async function migrateArtifact(
  supabase: ReturnType<typeof createSupabaseForScript>,
  artifact: ArtifactToMigrate,
  dryRun: boolean
): Promise<MigrationResult> {
  console.log(`\n🔄 [Migración] Procesando artifact ${artifact.id}:`);
  console.log(`   - Archivo: ${artifact.fileName || 'N/A'}`);
  console.log(`   - Path temporal: ${artifact.fileId}`);
  console.log(`   - Caso: ${artifact.caseId}`);
  console.log(`   - Organización: ${artifact.orgId}`);
  
  // Validar que tenemos todos los datos necesarios
  if (!artifact.fileName) {
    return {
      artifactId: artifact.id,
      success: false,
      oldPath: artifact.fileId,
      error: 'Artifact sin fileName, no se puede determinar nombre del archivo'
    };
  }
  
  if (!artifact.orgId) {
    return {
      artifactId: artifact.id,
      success: false,
      oldPath: artifact.fileId,
      error: 'Artifact sin orgId, no se puede determinar organización'
    };
  }
  
  // En modo dry-run, solo simular
  if (dryRun) {
    console.log('   🔍 [DRY-RUN] Simulando movimiento...');
    const timestamp = Date.now();
    const sanitizedFileName = artifact.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const simulatedPath = `${artifact.orgId}/${artifact.caseId}/${timestamp}_${sanitizedFileName}`;
    
    return {
      artifactId: artifact.id,
      success: true,
      oldPath: artifact.fileId,
      newPath: simulatedPath,
      warning: 'DRY-RUN: No se realizó movimiento real'
    };
  }
  
  // Extraer userId del path temporal (formato: temp/{userId}/...)
  const pathParts = artifact.fileId.split('/');
  if (pathParts.length < 3) {
    return {
      artifactId: artifact.id,
      success: false,
      oldPath: artifact.fileId,
      error: `Path temporal inválido: ${artifact.fileId}`
    };
  }
  
  const userId = pathParts[1]; // temp/{userId}/...
  
  // Mover archivo usando función helper para scripts
  try {
    const moveResult = await moveTempToPersistentForScript(
      supabase,
      artifact.fileId,
      artifact.orgId,
      artifact.caseId,
      artifact.fileName,
      userId
    );
    
    if (!moveResult.success) {
      return {
        artifactId: artifact.id,
        success: false,
        oldPath: artifact.fileId,
        error: moveResult.error || 'Error desconocido al mover archivo'
      };
    }
    
    // Actualizar artifact con nueva ruta
    await prisma.artifact.update({
      where: { id: artifact.id },
      data: { fileId: moveResult.persistentPath! }
    });
    
    console.log(`   ✅ [Migración] Artifact actualizado con nueva ruta: ${moveResult.persistentPath}`);
    
    return {
      artifactId: artifact.id,
      success: true,
      oldPath: artifact.fileId,
      newPath: moveResult.persistentPath,
      warning: moveResult.warning
    };
  } catch (error: any) {
    console.error(`   ❌ [Migración] Error inesperado:`, error);
    return {
      artifactId: artifact.id,
      success: false,
      oldPath: artifact.fileId,
      error: error.message || 'Error inesperado'
    };
  }
}

/**
 * Función principal de migración
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  
  console.log('=====================================================');
  console.log('MIGRACIÓN DE ARTIFACTS TEMPORALES A PERSISTENTES');
  console.log('=====================================================');
  console.log('');
  
  if (dryRun) {
    console.log('🔍 MODO DRY-RUN: No se realizarán cambios reales');
    console.log('');
  } else {
    console.log('⚠️  MODO REAL: Se realizarán cambios en la base de datos y Storage');
    console.log('⚠️  Asegúrate de tener backup antes de continuar');
    console.log('');
  }
  
  try {
    // 1. Verificar conexión a BD
    console.log('🔌 [Migración] Verificando conexión a base de datos...');
    await prisma.$connect();
    console.log('✅ [Migración] Conexión establecida');
    console.log('');
    
    // 2. Obtener artifacts a migrar
    const artifacts = await getTempArtifacts();
    
    if (artifacts.length === 0) {
      console.log('✅ [Migración] No hay artifacts temporales para migrar');
      await prisma.$disconnect();
      return;
    }
    
    console.log(`📊 [Migración] Total de artifacts a migrar: ${artifacts.length}`);
    console.log('');
    
    // 3. Crear cliente Supabase para scripts
    const supabase = createSupabaseForScript();
    console.log('✅ [Migración] Cliente Supabase creado');
    console.log('');
    
    // 4. Migrar cada artifact
    const results: MigrationResult[] = [];
    let processed = 0;
    
    for (const artifact of artifacts) {
      processed++;
      console.log(`\n[${processed}/${artifacts.length}] Procesando artifact...`);
      
      const result = await migrateArtifact(supabase, artifact, dryRun);
      results.push(result);
      
      // Pequeño delay para no sobrecargar Storage
      if (!dryRun && processed < artifacts.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // 5. Generar resumen
    const summary: MigrationSummary = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      skipped: 0,
      errors: results.filter(r => !r.success).map(r => ({
        artifactId: r.artifactId,
        error: r.error || 'Error desconocido'
      })),
      warnings: results.filter(r => r.warning).map(r => ({
        artifactId: r.artifactId,
        warning: r.warning!
      }))
    };
    
    // 6. Mostrar resumen
    console.log('\n');
    console.log('=====================================================');
    console.log('RESUMEN DE MIGRACIÓN');
    console.log('=====================================================');
    console.log(`Total procesados: ${summary.total}`);
    console.log(`✅ Exitosos: ${summary.successful}`);
    console.log(`❌ Fallidos: ${summary.failed}`);
    console.log(`⚠️  Advertencias: ${summary.warnings.length}`);
    console.log('');
    
    if (summary.errors.length > 0) {
      console.log('❌ ERRORES:');
      summary.errors.forEach(e => {
        console.log(`   - Artifact ${e.artifactId}: ${e.error}`);
      });
      console.log('');
    }
    
    if (summary.warnings.length > 0) {
      console.log('⚠️  ADVERTENCIAS:');
      summary.warnings.forEach(w => {
        console.log(`   - Artifact ${w.artifactId}: ${w.warning}`);
      });
      console.log('');
    }
    
    if (dryRun) {
      console.log('🔍 MODO DRY-RUN: No se realizaron cambios reales');
      console.log('   Ejecuta sin --dry-run para aplicar cambios');
    } else {
      console.log('✅ Migración completada');
      
      // 7. Verificación post-migración
      console.log('');
      console.log('🔍 [Migración] Verificando integridad post-migración...');
      const remainingTemp = await prisma.artifact.count({
        where: {
          fileId: {
            startsWith: 'temp/'
          }
        }
      });
      
      if (remainingTemp === 0) {
        console.log('✅ [Migración] Todos los artifacts fueron migrados exitosamente');
      } else {
        console.log(`⚠️ [Migración] Quedan ${remainingTemp} artifacts temporales`);
      }
    }
    
    console.log('');
    console.log('=====================================================');
    
  } catch (error: any) {
    console.error('❌ [Migración] Error fatal:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script
main().catch(error => {
  console.error('❌ Error no manejado:', error);
  process.exit(1);
});

