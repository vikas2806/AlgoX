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

**Security Guard — Duplicate Submission Prevention (Problem 4)**:
If a complaint has already been submitted for the specified `caseId`, the request is rejected with HTTP `409 Conflict` to prevent overwriting existing report evidence.

- **Request Body**:
```json
{
  "caseId": "CASE-7K9M2Q",
  "category": "Workplace Harassment",
  "complaintText": "Detailed incident notes..."
}
```
- **Success Response**: `200 OK`
```json
{
  "success": true,
  "caseId": "CASE-7K9M2Q",
  "publicStatus": "Received",
  "submittedAt": "2026-09-20T18:35:00.000Z",
  "ciphertextSize": 218
}
```
- **Duplicate Error Response**: `409 Conflict`
```json
{
  "success": false,
  "alreadySubmitted": true,
  "error": "A complaint has already been filed under this Case ID. Duplicate submissions are not allowed."
}
```

---

### `GET /api/cases/:caseId/messages`
Fetches all confidential follow-up messages and committee inquiries for a case. Ciphertexts stored in SQLite are decrypted in-memory using AES-256-GCM.
- **Parameters**: `caseId` (string, URL path)
- **Response**: `200 OK`
```json
{
  "success": true,
  "caseId": "CASE-7K9M2Q",
  "messages": [
    {
      "id": "c7a8b9e1-...",
      "sender": "COMPLAINANT",
      "text": "Incident occurred outside conference room B on March 12 at 4:30 PM.",
      "createdAt": "2026-09-20T19:00:00.000Z"
    },
    {
      "id": "d8b9c0f2-...",
      "sender": "ICC",
      "text": "Thank you for the clarification. Are there any witnesses you wish to name?",
      "createdAt": "2026-09-20T19:15:00.000Z"
    }
  ]
}
```

---

### `POST /api/cases/:caseId/messages`
Sends a confidential follow-up message, supplementary evidence note, or ICC inquiry. Encrypts message text using AES-256-GCM prior to storage.
- **Parameters**: `caseId` (string, URL path)
- **Request Body**:
```json
{
  "sender": "COMPLAINANT", // or "ICC"
  "messageText": "Witnesses present were Alex and Jordan from Marketing."
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "messageId": "e9c0d1a3-...",
  "sender": "COMPLAINANT",
  "createdAt": "2026-09-20T19:20:00.000Z",
  "ciphertextSize": 68
}
```

---

### `GET /api/cases/:caseId/status`
Fetches the current 4-state public lifecycle status of a case and any official committee status update note.
- **Camouflage Protocol**: Wire response is padded to **exactly 1024 bytes** with pseudorandom noise regardless of the status or error state.
- **4 States Returned**: `Received` | `In Review` | `Update Available` | `Closed`
- **Official Update Note (Problem 5)**: When HR attaches an official status update note or directive (especially during "Update Available"), it is decrypted in-memory from AES-256-GCM and delivered inside this constant-padded response.
- **Response**: `200 OK` (Padded to 1024 bytes)
- **Headers**: `X-Metadata-Camouflage: active`, `Content-Length: 1024`
```json
{
  "success": true,
  "caseId": "CASE-7K9M2Q",
  "publicStatus": "Update Available",
  "statusNote": "Preliminary review concluded. Formal inquiry scheduled for Friday at 2:00 PM. Please review protective accommodations...",
  "statusNoteUpdatedAt": "2026-09-20T18:45:00.000Z",
  "updatedAt": "2026-09-20T18:40:00.000Z",
  "hasPendingBatchedUpdate": false,
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
Updates the internal investigative status and schedules/applies the public 4-state mapping with an optional encrypted status note/directive for the complainant.
- **Request Body**:
```json
{
  "caseId": "CASE-7K9M2Q",
  "internalStatus": "ACTION_RECOMMENDED",
  "customPublicStatus": "Update Available", // Optional override
  "immediate": false, // Optional: bypass jitter queue
  "statusNote": "Preliminary review complete. Formal committee meeting set for Friday at 2:00 PM." // Optional encrypted directive
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "caseId": "CASE-7K9M2Q",
  "internalStatus": "ACTION_RECOMMENDED",
  "targetPublicStatus": "Update Available",
  "currentPublicStatus": "In Review",
  "hasAttachedNote": true,
  "batchedRelease": {
    "queueId": "uuid",
    "scheduledReleaseAt": "2026-09-20T18:45:22.000Z",
    "delaySeconds": 22,
    "jitterSeconds": 7,
    "releasedNow": false
  },
  "updatedAt": "2026-09-20T18:45:00.000Z"
}
```

---

### `GET /api/admin/queue`
Retrieves pending and recent public status updates held in the metadata camouflage jitter queue.
- **Response**: `200 OK`
```json
{
  "success": true,
  "queue": [
    {
      "id": "uuid",
      "caseId": "CASE-7K9M2Q",
      "targetStatus": "In Review",
      "scheduledReleaseAt": "2026-09-20T18:45:22.000Z",
      "released": false,
      "createdAt": "2026-09-20T18:45:00.000Z"
    }
  ]
}
```

---

### `POST /api/admin/queue/flush`
Testing and evaluation tool: immediately flushes and releases all pending queued status updates to public view.
- **Response**: `200 OK`
```json
{
  "success": true,
  "flushedCount": 2
}
```

---

## 3. System & Health Endpoints

---

### `GET /api/cases/:caseId/status-note` (Problem 5: Official Status Update Note)
Fetches the decrypted official committee status note / directive attached by HR for a case. Responses are padded to exactly 1024 bytes with pseudorandom noise to maintain metadata camouflage on wire inspection.
- **Parameters**: `caseId` (string, URL path)
- **Response**: `200 OK` (Padded to 1024 bytes)
- **Headers**: `X-Metadata-Camouflage: active`, `Content-Length: 1024`
```json
{
  "success": true,
  "caseId": "CASE-7K9M2Q",
  "publicStatus": "Update Available",
  "hasNote": true,
  "statusNote": "The Internal Complaints Committee has reviewed the evidence submitted. A formal hearing is scheduled for Friday at 2:00 PM in Conference Room C. Please confirm attendance.",
  "updatedAt": "2026-09-20T18:45:00.000Z",
  "_camouflage": { "targetSize": 1024, "wireConstant": true },
  "_padding": "7f8b9a2c..."
}
```

