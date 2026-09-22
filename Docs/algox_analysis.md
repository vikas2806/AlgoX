# AlgoX — Problem Statement Gap Analysis & Feature Status

## Problem Statement Summary

Build a **secure, anonymous case-tracking portal** for Internal Complaints Committees (ICC) that:
1. Preserves confidentiality of complainants
2. Surfaces status updates to complainants (so they know things are moving)
3. **Twist**: Defends against side-channel attacks — status update patterns must NOT leak information about case severity or outcome to an observer watching the complainant's activity

---

## ✅ Core Features & Solutions Built

| Requirement / Threat | Status | Implementation Details |
|:---|:---:|:---|
| Anonymous case tracking (no PII) | ✅ | Random `CASE-XXXXXX` IDs via `server/lib/generateCaseId.ts` |
| Status updates visible to complainant | ✅ | `GET /api/cases/:caseId/status` + `StatusPortal.tsx` |
| Complaint text kept confidential | ✅ | AES-256-GCM encryption in `server/lib/crypto.ts` |
| Plaintext never stored | ✅ | Only `encryptedContent`, `iv`, `authTag` in DB |
| 4-state public status abstraction | ✅ | `statusMapping.ts` maps 8 internal states → 4 public states |
| Side-channel: constant response size | ✅ | 1024-byte padding in `server/lib/padding.ts` |
| Side-channel: timing attack defense | ✅ | Jitter batching in `server/lib/batchWorker.ts` |
| HR admin can view/update cases | ✅ | `AdminPortal.tsx` + admin routes in `server/index.ts` |
| Network metadata telemetry (demo) | ✅ | `NetworkInspector.tsx` shows constant wire sizes |
| **Problem 4: Duplicate Submission Guard** | ✅ **BUILT** | Rejects overwrite attempts with HTTP 409 + dedicated UI card |
| **Problem 5: Official Status Update Note Channel** | ✅ **BUILT** | Encrypted status note stored with Case & Queue + padded delivery + dedicated card |
| **Problem 6: Two-Way Encrypted Follow-Up Thread** | ✅ **BUILT** | `CaseMessage` model + AES-256-GCM encrypted Complainant & ICC thread |

---

## 🛠️ Status of Identified Gaps

### 1. Problem 4: Complaint Overwrite Protection
- **Status**: **RESOLVED & BUILT** ✅
- **Resolution**:
  - `POST /api/complaints/submit` checks if `encryptedContent` exists for the given `Case ID`.
  - If a complaint already exists, returns HTTP `409 Conflict`:
    ```json
    { "success": false, "alreadySubmitted": true, "error": "A complaint has already been filed under this Case ID. Duplicate submissions are not allowed." }
    ```
  - Frontend renders a prominent `ShieldAlert` card reassuring the user their report is safe and preventing duplicates.

### 2. Problem 5: Secure Message Channel Back to Complainant for "Update Available"
- **Status**: **RESOLVED & BUILT** ✅
- **Resolution**:
  - Added encrypted status note fields to `Case` and `StatusUpdateQueue` (`statusNoteEncrypted`, `statusNoteIv`, `statusNoteAuthTag`).
  - Added `statusNote` field to `POST /api/admin/cases/update-status` enabling HR to attach an official directive or notice encrypted with AES-256-GCM.
  - Queued status notes release simultaneously with the delayed/jittered public status release.
  - Complainants receive the decrypted official notice inside the constant 1024-byte padded `/status` response and via `GET /api/cases/:caseId/status-note`.
  - In `StatusPortal.tsx`, a dedicated **"Official Committee Update Notice"** card displays the directive when new information is available.

### 3. Problem 6: Complainant Follow-Up & Dynamic ICC Communication
- **Status**: **RESOLVED & BUILT** ✅
- **Resolution**:
  - Added `CaseMessage` schema in Prisma (`id`, `caseId`, `sender`, `encryptedContent`, `iv`, `authTag`, `createdAt`).
  - Added `GET /api/cases/:caseId/messages` and `POST /api/cases/:caseId/messages`.
  - In `StatusPortal.tsx`, complainants can submit additional evidence (dates, witness names) or answer committee questions.
  - In `AdminPortal.tsx`, ICC Committee members can inspect the decrypted message thread and post confidential inquiries back to the complainant.
  - Every message is individually encrypted with AES-256-GCM at rest.

---

### 🟡 Remaining Items (Future Milestones)

1. **Admin Authentication**: Add role-based authentication or API key for `/api/admin/*` endpoints.
2. **Rate Limiting**: Add Express `rate-limit` middleware on `/api/cases/verify-id` and status endpoints.
3. **Remove `hasPendingBatchedUpdate` from status response**: Eliminate the minor telemetry side-channel in production mode.
4. **Audit Log Model**: Add a dedicated `CaseAuditLog` table for POSH Act compliance tracking of status transitions.
