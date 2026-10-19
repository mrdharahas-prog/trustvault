export type Role = 'Admin' | 'Manager' | 'Viewer';

export type Permission = 
  | 'document:read'
  | 'document:create'
  | 'document:update'
  | 'document:delete'
  | 'document:share'
  | 'audit:read';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  content: string;
  classification: 'Public' | 'Internal' | 'Confidential' | 'Restricted';
  ownerId: string;
  organizationId: string;
  allowedRoles: Role[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  organizationId: string;
  action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE' | 'ACCESS_DENIED' | 'LOGIN';
  resourceId?: string;
  resourceType: 'DOCUMENT' | 'AUTH' | 'PERMISSION';
  status: 'SUCCESS' | 'DENIED' | 'FAILURE';
  ipAddress?: string;
  details?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  organizationId: string;
}