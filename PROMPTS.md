# TrustVault AI Collaboration & Prompt Audit Trail

This log documents key AI interactions during the architecture and construction of TrustVault, emphasizing technical corrections, rejected suggestions, and intentional design pivots.

---

## Entry 1: Drive Partitioning & Environment Configuration
* **Prompt Intent:** Resolve critical space limitations preventing package installation on the primary OS drive.
* **AI Initial Proposal:** Attempted to move default Windows `Program Files` junctions and global node installations across volumes.
* **Human Rejection / Fix:** Intercepted Windows system parameter error `0x80070057`. Rejected modifying system volume junctions; cleanly relocated development workspace to dedicated secondary partition (`D:\projects\trustvault`), reconfigured PATH variables, and updated PowerShell execution policies (`RemoteSigned`).

---

## Entry 2: Authorization Architecture Design
* **Prompt Intent:** Design the document access control and permission checking pipeline for multi-tenant users.
* **AI Initial Proposal:** Proposed performing client-side permission checks inside React components to toggle view states and using standard REST CRUD endpoints on the backend without explicit tenant boundary filters.
* **Human Rejection / Fix:** Rejected client-side authorization as fundamentally vulnerable to IDOR and traffic interception. Designed and enforced strict server-side dual-layer verification in `src/lib/permissions.ts`:
  1. Tenant boundary check (`user.organizationId !== doc.organizationId`) to stop horizontal privilege escalation.
  2. Role classification check (`doc.allowedRoles.includes(user.role)`) to stop vertical privilege escalation.

---

## Entry 3: Routing Architecture and Dynamic Parameter Handling
* **Prompt Intent:** Scaffold Next.js dynamic routing for single-document inspection.
* **AI Initial Proposal:** Combined file generation scripts that created invalid path string literals on Windows environments (`api\documents`).
* **Human Rejection / Fix:** Restructured directory hierarchy using forward-slash POSIX conventions (`src/app/api/documents/[id]/route.ts`), resolved asynchronous route params for Next.js 15 compatibility (`Promise<{ id: string }>`), and verified zero-error builds via `npm run build`.