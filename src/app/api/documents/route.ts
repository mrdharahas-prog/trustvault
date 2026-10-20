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
    const { userId, title, content, classification, allowedRoles, fileName, fileType, fileData } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Valid userId is required .' },
        { status: 400 }
      );
    }

    const user = findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User identity does not exist.' }, { status: 404 });
    }

    const permissions = ROLE_PERMISSIONS[user.role];
    if (!permissions.includes('document:create')) {
      recordAuditLog({
        action: 'ACCESS_DENIED',
        status: 'DENIED',
        userId: user.id,
        userEmail: user.email,
        organizationId: user.organizationId,
        details: `Role ${user.role} attempted an unauthorised document creation.`,
      });

      return NextResponse.json(
        { error: `Forbidden: Role ${user.role} does not possess document:create permissions.` },
        { status: 403 }
      );
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required and cannot be empty.' }, { status: 400 });
    }

    if (title.length > 120) {
      return NextResponse.json({ error: 'Title exceeds maximum limit of 120 characters.' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content payload is required.' }, { status: 400 });
    }

    // Maximum payload limit (4.5MB base64 limit to safely stay within Vercel's 4.5MB request limit)
    if (fileData && typeof fileData === 'string' && fileData.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds maximum 3.5MB limit.' }, { status: 400 });
    }

    const validClassifications: ClassificationLevel[] = ['Internal', 'Confidential', 'Restricted'];
    if (!validClassifications.includes(classification)) {
      return NextResponse.json({ error: 'Invalid classification level specified.' }, { status: 400 });
    }

    if (classification === 'Restricted' && user.role !== 'Admin') {
      return NextResponse.json({ error: 'Only Administrators can publish Restricted assets.' }, { status: 403 });
    }

    const newDoc: DocumentRecord = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      content: content.trim(),
      classification: classification as ClassificationLevel,
      ownerId: user.id,
      organizationId: user.organizationId,
      allowedRoles: allowedRoles || ['Admin', 'Manager'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
      fileName: fileName || undefined,
      fileType: fileType || undefined,
      fileData: fileData || undefined,,
    };

    DOCUMENTS.push(newDoc);

recordAuditLog({
      action: 'CREATE',
      status: 'SUCCESS',
      userId: user.id,
      userEmail: user.email,
      organizationId: user.organizationId,
      resourceId: newDoc.id,
      details: `Published document "${newDoc.title}" [${newDoc.classification}]${fileName ? ` with attachment (${fileName})` : ''}.`,
    });

    return NextResponse.json({ document: newDoc }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
  }
}