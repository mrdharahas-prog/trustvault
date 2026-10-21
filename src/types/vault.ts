export type Role = 'Admin' | 'Manager' | 'Viewer';

export type ClassificationLevel = 'Internal' | 'Confidential' | 'Restricted';

export type Permission = 
  | 'document:read'
  | 'document:create'
  | 'document:delete'
  | 'document:update'
  | 'document:share'
  | 'audit:read';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  classification: ClassificationLevel;
  organizationId: string;
  ownerId: string;
  allowedRoles: Role[];
  createdAt: string;
  updatedAt?: string;
  fileName?: string;
  fileType?: string;
  fileData?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: 'READ' | 'CREATE' | 'ACCESS_DENIED' | 'PROBE';
  status: 'SUCCESS' | 'DENIED';
  userId: string;
  userEmail: string;
  organizationId: string;
  resourceId?: string;
  resourceType?: string;
  details?: string;
  previousHash: string;
  hash: string;
}