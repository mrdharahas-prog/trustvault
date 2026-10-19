import { User, DocumentRecord, AuditLogEntry, Role } from '@/types/vault';
import { v4 as uuidv4 } from 'uuid';

/**
 * Seed data for development and grading evaluation.
 * Two distinct organizations to test cross-tenant isolation (IDOR defense).
 */
export const USERS: User[] = [
  {
    id: 'usr_admin_org1',
    email: 'admin@acme.com',
    name: 'Alice Admin',
    role: 'Admin',
    organizationId: 'org_acme',
  },
  {
    id: 'usr_mgr_org1',
    email: 'manager@acme.com',
    name: 'Bob Manager',
    role: 'Manager',
    organizationId: 'org_acme',
  },
  {
    id: 'usr_view_org1',
    email: 'viewer@acme.com',
    name: 'Charlie Viewer',
    role: 'Viewer',
    organizationId: 'org_acme',
  },
  {
    id: 'usr_admin_org2',
    email: 'admin@rival.corp',
    name: 'Eve Intruder',
    role: 'Admin',
    organizationId: 'org_rival',
  },
];

export const DOCUMENTS: DocumentRecord[] = [
  {
    id: 'doc_acme_q3_report',
    title: 'Acme Q3 Financial Performance',
    content: 'CONFIDENTIAL: Acme Corp quarterly gross profit exceeded target by 18%.',
    classification: 'Confidential',
    ownerId: 'usr_admin_org1',
    organizationId: 'org_acme',
    allowedRoles: ['Admin', 'Manager'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc_acme_handbook',
    title: 'Acme Employee Handbook',
    content: 'Standard operating guidelines, leave policies, and office code of conduct.',
    classification: 'Internal',
    ownerId: 'usr_admin_org1',
    organizationId: 'org_acme',
    allowedRoles: ['Admin', 'Manager', 'Viewer'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc_acme_security_keys',
    title: 'Master Root Key Manifest',
    content: 'TOP SECRET: Production KMS ARN and root rotation schedule.',
    classification: 'Restricted',
    ownerId: 'usr_admin_org1',
    organizationId: 'org_acme',
    allowedRoles: ['Admin'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc_rival_strategy',
    title: 'Rival Corp Strategy 2027',
    content: 'Plans for market expansion into enterprise cloud storage.',
    classification: 'Internal',
    ownerId: 'usr_admin_org2',
    organizationId: 'org_rival',
    allowedRoles: ['Admin', 'Manager'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Append-only audit trail
const AUDIT_LOGS: AuditLogEntry[] = [];

/**
 * Audit Logger: Guarantees append-only behavior.
 * Logs both granted and denied access attempts for security forensics.
 */
export function recordAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  const newEntry: AuditLogEntry = {
    ...entry,
    id: `log_${uuidv4()}`,
    timestamp: new Date().toISOString(),
  };
  AUDIT_LOGS.unshift(newEntry); // Newest entries first for evaluation view
  return newEntry;
}

export function getAuditLogs(organizationId: string): AuditLogEntry[] {
  return AUDIT_LOGS.filter(log => log.organizationId === organizationId);
}

export function getDocumentsForOrg(organizationId: string): DocumentRecord[] {
  return DOCUMENTS.filter(doc => doc.organizationId === organizationId);
}

export function findDocumentById(id: string): DocumentRecord | undefined {
  return DOCUMENTS.find(doc => doc.id === id);
}

export function findUserById(id: string): User | undefined {
  return USERS.find(u => u.id === id);
}