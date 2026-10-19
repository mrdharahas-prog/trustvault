import { NextRequest, NextResponse } from 'next/server';
import { findUserById, getAuditLogs, recordAuditLog } from '@/lib/store';
import { ROLE_PERMISSIONS } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    );
  }

  const user = findUserById(userId);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized.' },
      { status: 403 }
    );
  }

  const permissions = ROLE_PERMISSIONS[user.role] || [];
  if (!permissions.includes('audit:read')) {
    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      organizationId: user.organizationId,
      action: 'ACCESS_DENIED',
      resourceType: 'PERMISSION',
      status: 'DENIED',
      details: `User with role ${user.role} attempted to access security audit logs.`,
    });

    return NextResponse.json(
      { error: 'Forbidden: Only Organization Administrators can inspect the audit log.' },
      { status: 403 }
    );
  }

  const logs = getAuditLogs(user.organizationId);
  return NextResponse.json({ auditLogs: logs });
}