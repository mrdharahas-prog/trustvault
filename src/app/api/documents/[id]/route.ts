import { NextRequest, NextResponse } from 'next/server';
import { findDocumentById, findUserById, recordAuditLog } from '@/lib/store';
import { canAccessDocument } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
      { error: 'User session invalid.' },
      { status: 403 }
    );
  }

  const doc = findDocumentById(id);
  if (!doc) {
    return NextResponse.json(
      { error: 'Document not found.' },
      { status: 404 }
    );
  }

  const accessCheck = canAccessDocument(user, doc, 'read');

  if (!accessCheck.allowed) {
    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      organizationId: user.organizationId,
      action: 'ACCESS_DENIED',
      resourceId: doc.id,
      resourceType: 'DOCUMENT',
      status: 'DENIED',
      details: accessCheck.reason,
    });

    return NextResponse.json(
      { error: `Forbidden: ${accessCheck.reason}` },
      { status: 403 }
    );
  }

  recordAuditLog({
    userId: user.id,
    userEmail: user.email,
    organizationId: user.organizationId,
    action: 'READ',
    resourceId: doc.id,
    resourceType: 'DOCUMENT',
    status: 'SUCCESS',
    details: `Accessed document "${doc.title}" under classification ${doc.classification}.`,
  });

  return NextResponse.json({ document: doc });
}