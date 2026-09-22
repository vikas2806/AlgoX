# AlgoX — API Reference Documentation

AlgoX provides a zero-PII, metadata-camouflaged REST API built on Express and Node.js.

---

## 1. Public & User Endpoints

### `GET /api/cases/generate-id`
Generates a cryptographically random, collision-tested anonymous Case ID (`CASE-XXXXXX`).
- **Headers**: None required
- **Response**: `200 OK`
```json
{
  "success": true,
  "caseId": "CASE-7K9M2Q"
}
```

---

### `POST /api/cases/verify-id`
Verifies if an existing Case ID is registered in the database. Padded to constant 1024 bytes.
- **Request Body**:
```json
{
  "caseId": "CASE-7K9M2Q"
}
```
- **Response**: `200 OK` (Padded to 1024 bytes)
- **Headers**: `X-Metadata-Camouflage: active`, `Content-Length: 1024`
```json
{
  "success": true,
  "exists": true,
  "caseId": "CASE-7K9M2Q",
  "publicStatus": "Received",
  "createdAt": "2026-09-20T18:30:00.000Z",
  "_camouflage": { "targetSize": 1024, "wireConstant": true },
  "_padding": "..."
}
```

---

### `POST /api/complaints/submit`
Ingests a confidential harassment report. **Encrypts payload with AES-256-GCM before saving to database**. Server never stores or logs the plaintext content.
- **Request Body**:
```json
{
  "caseId": "CASE-7K9M2Q",
  "category": "Workplace Harassment",
  "complaintText": "Detailed incident notes..."
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "caseId": "CASE-7K9M2Q",
  "publicStatus": "Received",
  "submittedAt": "2026-09-20T18:35:00.000Z",
  "ciphertextSize": 218
}
```

---

### `GET /api/cases/:caseId/status`
Fetches the current 4-state public lifecycle status of a case.
- **Camouflage Protocol**: Wire response is padded to **exactly 1024 bytes** with pseudorandom noise regardless of the status or error state.
- **4 States Returned**: `Received` | `In Review` | `Update Available` | `Closed`
- **Response**: `200 OK` (Padded to 1024 bytes)
- **Headers**: `X-Metadata-Camouflage: active`, `Content-Length: 1024`
```json
{
  "success": true,
  "caseId": "CASE-7K9M2Q",
  "publicStatus": "In Review",
  "updatedAt": "2026-09-20T18:40:00.000Z",
  "_camouflage": { "targetSize": 1024, "wireConstant": true },
  "_padding": "a8f39b40..."
}
```

---

## 2. HR Admin Endpoints

### `GET /api/admin/cases`
Lists all cases for authorized HR administrators. Ciphertext is never decrypted in the listing.
- **Response**: `200 OK`
```json
{
  "success": true,
  "cases": [
    {
      "id": "uuid",
      "caseId": "CASE-7K9M2Q",
      "internalStatus": "ASSIGNED_INVESTIGATOR",
      "publicStatus": "In Review",
      "ciphertextSize": 218,
      "createdAt": "2026-09-20T18:35:00.000Z",
      "updatedAt": "2026-09-20T18:40:00.000Z"
    }
  ]
}
```

---

### `POST /api/admin/cases/decrypt`
Authorized on-demand decryption of a specific complaint for HR investigation. Decrypts the stored AES-256-GCM ciphertext using the server's master key and returns the plaintext report details. **Plaintext is never re-stored after this call.**
- **Request Body**:
```json
{
  "caseId": "CASE-7K9M2Q"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "caseId": "CASE-7K9M2Q",
  "internalStatus": "ASSIGNED_INVESTIGATOR",
  "category": "Workplace Harassment",
  "complaintText": "Detailed incident notes...",
  "submittedAt": "2026-09-20T18:35:00.000Z",
  "decryptedAt": "2026-09-20T18:50:00.000Z",
  "ciphertextSize": 218
}
```

---

### `POST /api/admin/cases/update-status`
Updates the internal investigative status and schedules/applies the public 4-state mapping.
- **Request Body**:
```json
{
  "caseId": "CASE-7K9M2Q",
  "internalStatus": "WITNESS_INTERVIEWS",
  "customPublicStatus": "In Review" // Optional override
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "caseId": "CASE-7K9M2Q",
  "internalStatus": "WITNESS_INTERVIEWS",
  "publicStatus": "In Review",
  "updatedAt": "2026-09-20T18:45:00.000Z"
}
```

---

## 3. System & Health Endpoints

### `GET /api/health`
Health check and server timestamp.
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2026-09-20T18:50:00.000Z"
}
```
