import { Role, Permission, User, DocumentRecord } from '@/types/vault';

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Admin: [
    'document:read',
    'document:create',
    'document:update',
    'document:delete',
    'document:share',
    'audit:read',
  ],
  Manager: [
    'document:read',
    'document:create',
    'document:update',
    'document:share',
  ],
  Viewer: [
    'document:read',
  ],
};

/**
 * Enforces dual-layer authorization:
 * 1. Multi-tenant boundary check (IDOR mitigation)
 * 2. Role-based permission evaluation
 */
export function canAccessDocument(
  user: User,
  doc: DocumentRecord,
  action: 'read' | 'update' | 'delete' | 'share'
): { allowed: boolean; reason?: string } {
  // Tenant Boundary Check: Never allow access across organizations
  if (user.organizationId !== doc.organizationId) {
    return { allowed: false, reason: 'Cross-tenant access forbidden' };
  }

  // Action mapping to required permission
  const requiredPermission: Permission = `document:${action}` as Permission;
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];

  if (!userPermissions.includes(requiredPermission)) {
    return { allowed: false, reason: `Role ${user.role} lacks ${requiredPermission}` };
  }

  // Document-level role restriction check
  if (!doc.allowedRoles.includes(user.role)) {
    return { allowed: false, reason: `Role ${user.role} not permitted for classification ${doc.classification}` };
  }

  return { allowed: true };
}