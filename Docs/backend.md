# AlgoX — Backend Architecture & Cryptography

This document details the backend architectural design, cryptographic storage protocols, metadata defenses, and database models of AlgoX.

---

## 1. Architectural Overview

```
[ Victim Client ]            [ Corporate Network / Eavesdroppers ]            [ AlgoX Server ]
       |                                      |                                      |
       |--- 1. Generate Anonymous ID -------->| (Sees only uniform packet sizes) --->| Generates CASE-XXXXXX
       |                                      |                                      |
       |--- 2. POST /complaints/submit ------>| (Encrypted in transit) ------------->| AES-256-GCM Encrypt
       |                                      |                                      | SQLite (Ciphertext Only)
       |                                      |                                      | Zero Plaintext In DB/Logs
       |                                      |                                      |
       |<-- 3. GET /status (Padded 1024B) ----|<-------------------------------------| Padded with Noise
       |                                      |                                      | 4-State Public Shield
```

---

## 2. Cryptographic Protocol (Blind Server — Pillar 2)

- **Algorithm**: `AES-256-GCM` (Galois/Counter Mode) via Node's native `crypto` module.
- **Key Management**: 256-bit symmetric key (`ENCRYPTION_KEY`).
- **Initialization Vector (IV)**: Fresh 96-bit (12-byte) cryptographically secure IV generated per complaint.
- **Integrity Authentication Tag**: 128-bit (16-byte) GCM authentication tag stored to verify ciphertext tamper-resistance.
- **Zero Plaintext Invariant**: Plaintext is never written to disk, SQLite columns, temporary caches, or console logs.

---

## 3. Metadata Camouflage & Padding Engine (Pillar 3)

- **Problem**: Network observers (network routers, IT packet sniffers) can analyze response size deltas and timing to determine complaint severity or investigation status.
- **Solution**:
  - `server/lib/padding.ts` wraps all status query responses into fixed 1,024-byte wire payloads.
  - Variable-length fields are padded with pseudorandom hexadecimal noise.
  - `Content-Length: 1024` HTTP header is strictly enforced.

---

## 4. Four-State Lifecycle Engine (Pillar 4)

Internal HR investigations can have numerous sensitive sub-stages:
- `RECEIVED`
- `ASSIGNED_INVESTIGATOR`
- `WITNESS_INTERVIEWS`
- `LEGAL_ASSESSMENT`
- `ACTION_RECOMMENDED`
- `MEDIATION_SCHEDULED`
- `RESOLVED` / `DISMISSED`

The public API strictly abstracts all internal activity into 4 discrete public states:
1. `Received`
2. `In Review`
3. `Update Available`
4. `Closed`

---

## 5. Database Schema (Prisma & SQLite)

### Model: `Case`
- `id`: UUID Primary Key
- `caseId`: Unique Anonymous Identifier (`CASE-XXXXXX`)
- `encryptedContent`: AES-256-GCM Hex Ciphertext
- `iv`: 12-byte Hex IV
- `authTag`: 16-byte Hex Authentication Tag
- `internalStatus`: Detailed HR Workflow Stage
- `publicStatus`: Four-State Projected Public Label
- `createdAt` / `updatedAt`: Timestamps

### Model: `StatusUpdateQueue`
- `id`: UUID Primary Key
- `caseId`: Foreign key to `Case.caseId`
- `targetStatus`: Scheduled public status
- `scheduledReleaseAt`: Target release timestamp with jitter
- `released`: Boolean flag indicating execution status
