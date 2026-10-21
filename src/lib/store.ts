import crypto from 'crypto';
import { User, DocumentRecord, AuditLogEntry } from '@/types/vault';

export const USERS: User[] = [
  {
    id: 'usr_admin_org1',
    name: 'Alice Henderson',
    email: 'alice.h@acme.com',
    role: 'Admin',
    organizationId: 'org_acme',
  },
  {
    id: 'usr_mgr_org1',
    name: 'Robert Vance',
    email: 'r.vance@acme.com',
    role: 'Manager',
    organizationId: 'org_acme',
  },
  {
    id: 'usr_view_org1',
    name: 'Charlie Miller',
    email: 'cmiller@acme.com',
    role: 'Viewer',
    organizationId: 'org_acme',
  },
  {
    id: 'usr_admin_org2',
    name: 'Eve Sterling',
    email: 'eve@rivalcorp.io',
    role: 'Admin',
    organizationId: 'org_rival',
  },
];

export const DOCUMENTS: DocumentRecord[] = [
  {
    id: 'doc_acme_q3_report',
    title: 'Acme Q3 Financial Performance',
    content: 'CONFIDENTIAL: Acme Corp quarterly gross profit exceeded target by 18%. Operating margin at 34%.',
    classification: 'Confidential',
    organizationId: 'org_acme',
    ownerId: 'usr_mgr_org1',
    allowedRoles: ['Admin', 'Manager'],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'doc_acme_handbook',
    title: 'Acme Employee Handbook',
    content: 'Standard operating guidelines, leave policies, and office code of conduct.',
    classification: 'Internal',
    organizationId: 'org_acme',
    ownerId: 'usr_admin_org1',
    allowedRoles: ['Admin', 'Manager', 'Viewer'],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'doc_acme_security_keys',
    title: 'Master Root Key Manifest',
    content: 'TOP SECRET: Production KMS ARN and root rotation schedule.',
    classification: 'Restricted',
    organizationId: 'org_acme',
    ownerId: 'usr_admin_org1',
    allowedRoles: ['Admin'],
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
];

export const AUDIT_LOGS: AuditLogEntry[] = [];

function calculateEntryHash(
  previousHash: string,
  timestamp: string,
  action: string,
  status: string,
  userId: string,
  resourceId?: string
): string {
  const payload = `${previousHash}|${timestamp}|${action}|${status}|${userId}|${resourceId || ''}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function recordAuditLog(params: {
  action: 'READ' | 'CREATE' | 'ACCESS_DENIED' | 'PROBE';
  status: 'SUCCESS' | 'DENIED';
  userId: string;
  userEmail: string;
  organizationId: string;
  resourceId?: string;
  resourceType?: string;
  details?: string;
}): AuditLogEntry {
  const timestamp = new Date().toISOString();
  const previousHash =
    AUDIT_LOGS.length > 0 ? AUDIT_LOGS[AUDIT_LOGS.length - 1].hash : 'GENESIS_ROOT_HASH_00000000000000000000';

  const hash = calculateEntryHash(
    previousHash,
    timestamp,
    params.action,
    params.status,
    params.userId,
    params.resourceId
  );

  const entry: AuditLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp,
    action: params.action,
    status: params.status,
    userId: params.userId,
    userEmail: params.userEmail,
    organizationId: params.organizationId,
    resourceId: params.resourceId,
    resourceType: params.resourceType,
    details: params.details,
    previousHash,
    hash,
  };

  AUDIT_LOGS.push(entry);
  return entry;
}

export function findUserById(id: string): User | undefined {
  return USERS.find((u) => u.id === id);
}

export function getDocumentsForOrg(orgId: string): DocumentRecord[] {
  return DOCUMENTS.filter((doc) => doc.organizationId === orgId);
}

export function findDocumentById(id: string): DocumentRecord | undefined {
  return DOCUMENTS.find((doc) => doc.id === id);
}

export function getAuditLogs(orgId: string): AuditLogEntry[] {
  return AUDIT_LOGS.filter((log) => log.organizationId === orgId);
}