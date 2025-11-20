# Esquema de Provenance para Artifacts

## Estructura JSONB Esperada

El campo `provenance` en la tabla `artifacts` es un JSONB que almacena metadatos sobre el origen y procesamiento del artifact.

### Estructura Base

```json
{
  "uploadedBy": "uuid-usuario",
  "uploadedAt": "2025-02-02T12:00:00Z",
  "fileHash": "sha256-hash",
  "fileSize": 123456,
  "pageCount": 15,
  "charactersExtracted": 45230
}
```

### Estructura Completa (con migración)

```json
{
  "uploadedBy": "uuid-usuario",
  "uploadedAt": "2025-02-02T12:00:00Z",
  "fileHash": "sha256-hash",
  "fileSize": 123456,
  "pageCount": 15,
  "charactersExtracted": 45230,
  "migratedToPersistent": true,
  "migrationError": null,
  "migratedFromTemp": true,
  "originalTempPath": "temp/{userId}/..."
}
```

### Estructura con Reutilización

```json
{
  "uploadedBy": "uuid-usuario",
  "uploadedAt": "2025-02-02T12:00:00Z",
  "fileHash": "sha256-hash",
  "fileSize": 123456,
  "pageCount": 15,
  "reusedFrom": "uuid-artifact-original",
  "originalFileName": "original.pdf",
  "originalCaseId": "uuid-case-original",
  "originalUploadedAt": "2025-02-01T10:00:00Z"
}
```

## Campos Requeridos vs Opcionales

### Campos Requeridos:
- `uploadedBy`: UUID del usuario que subió el archivo (string)
- `uploadedAt`: ISO 8601 timestamp de cuando se subió (string)

### Campos Opcionales:
- `fileHash`: SHA-256 hash para deduplicación (string)
- `fileSize`: Tamaño en bytes (number)
- `pageCount`: Número de páginas para PDFs (number)
- `charactersExtracted`: Número de caracteres extraídos (number)
- `migratedToPersistent`: Boolean indicando si se migró de temporal a persistente (boolean)
- `migrationError`: Mensaje de error si la migración falló (string | null)
- `migratedFromTemp`: Boolean indicando si proviene de archivo temporal (boolean)
- `originalTempPath`: Ruta original del archivo temporal (string)
- `reusedFrom`: UUID del artifact original si se reutilizó archivo (string)
- `originalFileName`: Nombre del archivo original si se reutilizó (string)
- `originalCaseId`: UUID del caso original si se reutilizó (string)
- `originalUploadedAt`: Timestamp del upload original si se reutilizó (string)
- `userAgent`: User agent del navegador (string)
- `origin`: Origen del upload ('landing_temp', 'workspace', etc.) (string)

## Ejemplos de Uso

### Crear Artifact con Provenance Básico

```typescript
await prisma.artifact.create({
  data: {
    caseId: caseId,
    sourceType: 'pdf',
    fileId: storagePath,
    fileName: 'documento.pdf',
    provenance: {
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
      fileHash: fileHash,
      fileSize: file.size,
      pageCount: pageCount
    }
  }
});
```

### Crear Artifact con Provenance de Migración

```typescript
await prisma.artifact.create({
  data: {
    caseId: caseId,
    sourceType: 'pdf',
    fileId: persistentPath,
    fileName: 'documento.pdf',
    provenance: {
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
      fileHash: fileHash,
      fileSize: file.size,
      pageCount: pageCount,
      migratedToPersistent: true,
      migratedFromTemp: true,
      originalTempPath: tempPath
    }
  }
});
```

## Validación

El campo `provenance` es JSONB flexible, pero se recomienda seguir esta estructura para:
- Consistencia en el código
- Facilidad de consultas
- Trazabilidad completa

## Consultas Útiles

### Buscar artifacts por hash (deduplicación)

```sql
SELECT * FROM artifacts
WHERE provenance->>'fileHash' = 'sha256-hash';
```

### Buscar artifacts migrados

```sql
SELECT * FROM artifacts
WHERE provenance->>'migratedToPersistent' = 'true';
```

### Buscar artifacts reutilizados

```sql
SELECT * FROM artifacts
WHERE provenance->>'reusedFrom' IS NOT NULL;
```

### Buscar artifacts por usuario

```sql
SELECT * FROM artifacts
WHERE provenance->>'uploadedBy' = 'uuid-usuario';
```

### Contar artifacts por origen

```sql
SELECT 
  provenance->>'origin' as origin,
  COUNT(*) as count
FROM artifacts
WHERE provenance->>'origin' IS NOT NULL
GROUP BY provenance->>'origin';
```

