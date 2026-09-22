# AlgoX — Requirements & Product Specification

## 1. Problem Statement
Employees filing sensitive workplace harassment reports face risks of retaliation and silent surveillance. Even when report content is encrypted, **network metadata** (packet sizes, timing of updates, frequency of notifications) allows network administrators, managers, or adversaries to infer case severity and progress.

---

## 2. Core Solution Pillars

### Pillar 1: Total Anonymity
- Users authenticate solely via randomly generated Case IDs (`CASE-XXXXXX`).
- Zero collection of names, emails, employee IDs, IP addresses, or phone numbers.
- One-click copy with warnings regarding secure local retention.

### Pillar 2: Blind Server
- Ingested complaint text is encrypted immediately with `AES-256-GCM`.
- The SQLite database only stores hex ciphertexts, IVs, and GCM authentication tags.
- Zero plaintext logging or storage.
- **Anti-Overwrite Guard (Problem 4)**: Existing complaints are immutable; duplicate submissions to the same Case ID are rejected with HTTP `409 Conflict`.

### Pillar 3: Metadata Camouflage
- All status responses are uniformly padded to an exact 1,024-byte wire size with pseudorandom noise.
- Prevents packet size side-channel inference.
- Status updates are released in batched intervals with randomized jitter.

### Pillar 4: Four-State Status Portal
- All internal investigation statuses are projected strictly to 4 public states:
  1. `Received`
  2. `In Review`
  3. `Update Available`
  4. `Closed`

### Pillar 5: Confidential Follow-Up & Evidence Channel (Problem 6)
- Enables continuous asynchronous communication between the anonymous complainant and the ICC committee.
- Complainant can provide supplementary evidence, incident dates, or witness names.
- ICC committee can post inquiries or hearing notices directly to the case thread.
- All messages are individually encrypted with `AES-256-GCM`.

---

## 3. Threat Model & Mitigations

| Threat | Attacker | Mitigation in AlgoX |
| :--- | :--- | :--- |
| Network Packet Sniffing | IT Admin / Network Proxy | Uniform 1024-Byte Response Padding |
| Timing Analysis | Rogue HR / Boss observing updates | Batched Releases with Random Jitter |
| Database Breach | Compromised Server DB | AES-256-GCM Ciphertext Storage |
| Identity Attribution | Corporate Access Logs | Random Case-ID Login (Zero PII) |
| Workflow Eavesdropping | Side-Channel Snooper | Strict 4-State Public Projection |
| Report Overwrite / Tampering | Rogue Actor Re-using Case ID | Case Immutability Guard (HTTP 409) |
| Lack of Evidence / Follow-Up | Stalled ICC Investigations | End-to-End Encrypted Message Thread |
