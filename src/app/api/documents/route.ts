import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsForOrg, findUserById, recordAuditLog, DOCUMENTS } from '@/lib/store';
import { ROLE_PERMISSIONS } from '@/lib/permissions';
import { DocumentRecord } from '@/types/vault';

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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, content, classification, allowedRoles } = body;

    if (!userId || !title || !content || !classification || !allowedRoles) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, content, classification, allowedRoles.' },
        { status: 400 }
      );
    }

    const user = findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User session invalid.' }, { status: 403 });
    }

    const permissions = ROLE_PERMISSIONS[user.role] || [];
    if (!permissions.includes('document:create')) {
      recordAuditLog({
        userId: user.id,
        userEmail: user.email,
        organizationId: user.organizationId,
        action: 'ACCESS_DENIED',
        resourceType: 'DOCUMENT',
        status: 'DENIED',
        details: `Role ${user.role} denied document:create permission.`,
      });

      return NextResponse.json(
        { error: `Forbidden: Role ${user.role} does not possess document:create permissions.` },
        { status: 403 }
      );
    }

    const newDoc: DocumentRecord = {
      id: `doc_${Date.now()}`,
      title,
      content,
      classification,
      ownerId: user.id,
      organizationId: user.organizationId,
      allowedRoles,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    DOCUMENTS.push(newDoc);

    recordAuditLog({
      userId: user.id,
      userEmail: user.email,
      organizationId: user.organizationId,
      action: 'CREATE',
      resourceId: newDoc.id,
      resourceType: 'DOCUMENT',
      status: 'SUCCESS',
      details: `Created document "${newDoc.title}" classified as ${newDoc.classification}.`,
    });

    return NextResponse.json({ document: newDoc }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }
}