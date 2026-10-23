# TrustVault — Enterprise Zero-Trust Document Vault

TrustVault is a multi-tenant document security platform built with Next.js and TypeScript, styled with the GitHub Primer design system. It implements defensive client-side controls and cryptographically verifiable audit logging designed for high-assurance enterprise workflows.

**Live Deployment:** [https://trustvault-three.vercel.app](https://trustvault-three.vercel.app)

---

## Architectural Defense Layers

### 1. Multi-Tenant Scoping & Identity Isolation
- Strict boundary separation between internal tenant (`org_acme`) and external competitor (`org_rival`).
- Contextual identity switching across four role profiles (Admin, Manager, Viewer, External Admin).
- Client-side data scoping preventing cross-tenant document and metadata leakage in the DOM.

### 2. In-Memory Binary Magic-Byte Inspection
- Bypasses unreliable client-supplied MIME headers and file extensions.
- Evaluates raw byte signatures via `ArrayBuffer` slices:
  - **PDF:** `%PDF-` (`0x25 0x50 0x44 0x46`)
  - **PNG:** `\x89PNG\r\n\x1a\n` (`0x89 0x50 0x4E 0x47`)
  - **JPEG:** `\xFF\xD8\xFF` (`0xFF 0xD8 0xFF`)
- Blocks disguised payloads, renaming attacks, and polyglot files prior to processing.

### 3. Monotonically Chained SHA-256 Audit Ledger
- Immutable event chaining linked to an initial Genesis Block (`#00000000`).
- Every user action generates a cryptographic block where:
  $$\text{currentHash} = \text{SHA-256}(\text{index} + \text{prevHash} + \text{timestamp} + \text{payload})$$
- Enforces single-session non-repudiation and detects historical tampering.

### 4. Air-Gapped Cryptographic Proof Export
- One-click export bundling the ledger array alongside an independent, zero-dependency Node.js CLI verifier (`verify.js`).
- Auditors can verify mathematical continuity offline:
  ```bash
  node verify.js