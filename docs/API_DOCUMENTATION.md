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

### Clients
- POST /api/clients/create
- PATCH /api/clients/[id]/update
- DELETE /api/clients/[id]/delete


