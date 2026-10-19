# TrustVault Threat Model & Security Posture (STRIDE)

This document formalizes the threat model for TrustVault, analyzing attack vectors, potential risks, and verified mitigations implemented at the application and network layers.

---

## 1. STRIDE Threat Analysis

| Threat Category | Target | Vector / Vulnerability | Severity | Mitigation Implemented |
|---|---|---|---|---|
| **Spoofing** | Session Tokens & User Identity | Forging user IDs or tampering with headers to impersonate organizational officers. | **High** | Cryptographic identity verification; user context resolved server-side; identity boundaries strictly validated before dispatching database queries. |
| **Tampering** | In-flight Payloads & Access Logs | Altering document content or rewriting historical audit logs to conceal unauthorized access. | **Critical** | Append-only audit logger (`recordAuditLog`); no update/delete primitives exposed on audit records; JSON data payload immutability. |
| **Repudiation** | Document Access Operations | Disputing that a sensitive document was accessed or extracted by an authorized account. | **Medium** | Automated forensic logging capturing actor ID, actor email, organization context, timestamp, action type, resource ID, and transaction result (`SUCCESS` / `DENIED`). |
| **Information Disclosure (IDOR)** | Cross-Tenant Documents | Directly querying `/api/documents/[id]` using known or guessed UUIDs belonging to another organization. | **Critical** | Dual-layer authorization: hard tenant boundary verification (`user.orgId === doc.orgId`) executed prior to role evaluations. Violations return immediate `403 Forbidden` and log a security alert. |
| **Elevation of Privilege** | Document Classification Boundaries | A `Viewer` attempting to retrieve `Confidential` or `Restricted` documents within their own tenant. | **High** | Multi-tier RBAC matrix (`ROLE_PERMISSIONS` + `allowedRoles` array on each document). Access is rejected server-side if caller role is absent from allowed roles. |
| **Denial of Service (DoS)** | Document Streaming & API Endpoints | Flooding endpoints with unauthorized document traversal requests. | **Medium** | Early authorization rejection (fails fast before expensive resource lookups); structured status codes (`401` / `403`). |

---

## 2. Key Attack Scenarios & Mitigations

### Scenario A: Insecure Direct Object References (IDOR)
* **Attack Path:** An attacker from Organization B logs in legitimately, inspects network traffic, discovers a document ID belonging to Organization A (`doc_acme_q3_report`), and sends `GET /api/documents/doc_acme_q3_report`.
* **TrustVault Defense:** The endpoint extracts `organizationId` from the caller's server session and compares it against the target document's `organizationId`. If they do not match, the request halts with `403 Forbidden` before data leaves the memory store.

### Scenario B: Role Bypass via Parameter Manipulation
* **Attack Path:** A user with role `Viewer` attempts to fetch internal API keys or edit document content by modifying client-side state flags.
* **TrustVault Defense:** Zero trust in client state. Permissions are calculated exclusively on the server against the canonical `ROLE_PERMISSIONS` matrix. UI hides unavailable actions, but backend routes independently re-evaluate permissions for every incoming request.