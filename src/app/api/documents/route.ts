import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsForOrg, findUserById, recordAuditLog } from '@/lib/store';
import { ROLE_PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required. Provide a valid userId.' },
      { status: 401 }
    );
  }

  const user = findUserById(userId);
  if (!user) {
    return NextResponse.json(
      { error: 'User not found or session invalid.' },
      { status: 403 }
    );
  }

  const permissions = ROLE_PERMISSIONS[user.role] || [];
  if (!permissions.includes('document:read')) {
    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      organizationId: user.organizationId,
      action: 'ACCESS_DENIED',
      resourceType: 'DOCUMENT',
      status: 'DENIED',
      details: `Role ${user.role} denied document:read permission listing vault items.`,
    });

    return NextResponse.json(
      { error: 'Forbidden: Insufficient privileges to view document index.' },
      { status: 403 }
    );
  }

  const orgDocs = getDocumentsForOrg(user.organizationId);
  const accessibleDocs = orgDocs.filter(doc => doc.allowedRoles.includes(user.role));

  recordAuditLog({
    userId: user.id,
    userEmail: user.email,
    organizationId: user.organizationId,
    action: 'READ',
    resourceType: 'DOCUMENT',
    status: 'SUCCESS',
    details: `Retrieved ${accessibleDocs.length} vault document records.`,
  });

  return NextResponse.json({
    user: {
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
    },
    documents: accessibleDocs,
  });
}