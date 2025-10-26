## API Documentation (Esqueleto)

- Autenticación: Supabase Auth vía cookies.
- Cabeceras: `Content-Type: application/json` salvo uploads.

### POST /api/upload/pdf
- Body: form-data { file: File(PDF), caseId: string, orgId: string }
- Respuesta 201: { success, artifact { id, fileName, fileSize, pageCount, charactersExtracted, storagePath } }

### GET /api/stats
- Respuesta 200: { stats: { total, byStatus, byStage, byPriority, totalArtifacts } }

### POST /api/cases/create
- Body: { briefData, clientName?, status?, stage?, ... }
- Respuesta 200: { id, ...case }
- **Update (2025-10-26):** Se corrigió el bug de `sourceType` para artifacts (de 'upload' a 'pdf') y se añadió registro de auditoría explícito (`action: 'created_case'`, `tool: 'cases_api'`).

### Clients
- POST /api/clients/create
- PATCH /api/clients/[id]/update
- DELETE /api/clients/[id]/delete


