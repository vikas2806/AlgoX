# AlgoX — Metadata-Camouflaged Anonymous Workplace Protection

> **Hackathon Round 2 MVP**  
> Total Anonymity • Blind Server Cryptography • Metadata Camouflage • Four-State Status Shield

---

## 🚨 The Problem: Metadata Surveillance

When employees file workplace harassment or misconduct complaints, traditional systems leave them vulnerable to retaliation and silent surveillance.

Even when complaint text is encrypted in transit or at rest:
- **Network Traffic Size Analysis**: A packet delta between a trivial status ("Received", 120B) and an active escalation ("Under Formal Hearing", 480B) reveals case progression to corporate network administrators and proxies.
- **Timing Correlation**: An immediate status change following an HR meeting connects timestamps to investigative actions.
- **Identity Attribution**: Requiring company emails, logins, or phone numbers ties real-world identities to cases.

**AlgoX solves this by eliminating both content visibility AND metadata leakage.**

---

## 🛡️ The 4 Core Pillars of AlgoX

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                           ALGOX 4 PILLARS                              │
  ├───────────────────┬────────────────────┬──────────────────┬────────────┤
  │ 1. TOTAL          │ 2. BLIND           │ 3. METADATA      │ 4. FOUR-   │
  │    ANONYMITY      │    SERVER          │    CAMOUFLAGE    │    STATE   │
  │                   │                    │                  │    PORTAL  │
  │ Random CASE-XXXX  │ AES-256-GCM        │ Constant 1024B   │ Received   │
  │ Zero PII / Email  │ Zero Plaintext     │ Batched Release  │ In Review  │
  │ No Credentials    │ Stored or Logged   │ Random Jitter    │ Update Av. │
  │                   │                    │                  │ Closed     │
  └───────────────────┴────────────────────┴──────────────────┴────────────┘
```

### 1. Total Anonymity
Users authenticate solely using a cryptographically generated one-time Case ID (e.g. `CASE-7K9M2Q`).
- No names, corporate emails, phone numbers, or passwords.
- No session tracking across different devices or IP addresses.

### 2. Blind Server
The backend stores and relays complaint reports without ever possessing the ability to read them.
- All complaint text is encrypted upon ingest using standard **AES-256-GCM** with 96-bit initialization vectors (IV) and 128-bit authentication tags.
- Plaintext is **never** written to database columns, temporary caches, or server logs.
- **Case Immutability & Anti-Overwrite Guard**: Once a report is submitted, its encrypted payload cannot be replaced or overwritten. Duplicate submission attempts are rejected with HTTP `409 Conflict`.

### 3. Metadata Camouflage
Side-channel attacks are defeated through two cryptographic defenses:
- **Constant 1,024-Byte Wire Size**: Every status inquiry response is padded with pseudorandom noise to an exact 1,024-byte boundary (`Content-Length: 1024`). Network packet sniffers see zero size variation across different case statuses.
- **Batched Release with Random Jitter**: Public status updates are held in a release queue and dispatched on delayed intervals with randomized jitter ($\Delta t \pm \text{jitter}$), preventing time-correlation attacks.

### 4. Four-State Status Portal
Regardless of the internal complexity of HR's investigative workflow (e.g., Assigned Investigator, Witness Interviews, Evidence Review), the external victim portal only ever displays one of four standardized states:
1. `Received`
2. `In Review`
3. `Update Available`
4. `Closed`

### 5. Confidential Follow-Up & Evidence Channel
Real ICC proceedings require dynamic two-way communication without compromising anonymity:
- Complainants can submit supplementary incident dates, witness details, or evidence notes at any time.
- ICC Committee members can post confidential inquiries or hearing notices directly to the case thread.
- Every message is individually encrypted with **AES-256-GCM** at rest.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend API**: Node.js, Express 4, TypeScript (`tsx` runtime)
- **Database & ORM**: SQLite with Prisma 6.4
- **Cryptography**: Node.js built-in `crypto` module (AES-256-GCM, standard primitives)

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js v18+ (Node 20+ recommended)
- npm v9+

### 1. Clone & Install
```bash
git clone https://github.com/vikas2806/AlgoX.git
cd AlgoX
npm install
```

### 2. Configure Environment
A default `.env` is pre-configured with a local SQLite database and 256-bit encryption key:
```env
DATABASE_URL="file:./dev.db"
PORT=3001
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

### 3. Initialize SQLite Database
```bash
npx prisma db push
```

### 4. Start Development Server
```bash
npm run dev
```
- **Web Application**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:3001](http://localhost:3001)

---

## 🎬 Live Demo / Evaluation Walkthrough

1. **Victim / User View**:
   - Click **Generate New Case ID** (e.g. `CASE-8M4K2P`) and copy it.
   - Click **Continue to Report Filing**, enter an incident report, and click **Submit Encrypted Report**.
   - Observe the confirmation showing ciphertext byte size and zero-plaintext storage.
2. **HR Admin Portal**:
   - Switch to the **HR Admin Portal** tab in the top navigation.
   - View the encrypted case in the registry.
   - Select an internal investigation stage (e.g., `Witness Interviews Active`) and click **Commit Status Update**.
   - Notice the update entering the **Metadata Camouflage Batch Release Queue** with a random jitter delay countdown.
3. **Metadata Camouflage & Network Inspector**:
   - Switch back to the **User Portal** and click **Check Status**.
   - Inspect the **Metadata Camouflage Telemetry** panel at the bottom:
     - Notice the wire payload is bit-for-bit **1,024 Bytes (Constant)**.
     - Inspect the raw wire buffer to view the data vs camouflage noise byte distribution.
4. **Confidential Follow-Up & Evidence Thread (ICC Back-and-Forth)**:
   - In the **User Portal**, scroll to **Confidential Case Communications & Evidence**.
   - Submit additional incident dates, witness details, or supplementary evidence.
   - In the **Admin Portal**, view the encrypted thread under **Case Follow-Ups & Complainant Thread**, and post confidential inquiries back to the complainant. All messages are encrypted with AES-256-GCM before storage.
