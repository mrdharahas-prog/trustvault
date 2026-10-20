import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsForOrg, findUserById, recordAuditLog, DOCUMENTS } from '@/lib/store';
import { ROLE_PERMISSIONS } from '@/lib/permissions';
import { DocumentRecord, ClassificationLevel } from '@/types/vault';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
  }

  const user = findUserById(userId);
  if (!user) {
    return NextResponse.json({ error: 'User identity not found' }, { status: 404 });
  }

  const orgDocs = getDocumentsForOrg(user.organizationId);

  const permittedDocs = orgDocs.filter((doc) => {
    return doc.allowedRoles.includes(user.role);
  });

  recordAuditLog({
    action: 'READ',
    status: 'SUCCESS',
    userId: user.id,
    userEmail: user.email,
    organizationId: user.organizationId,
    details: `Retrieved ${permittedDocs.length} vault document records.`,
  });

  return NextResponse.json({ documents: permittedDocs });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, title, content, classification, allowedRoles } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Valid userId is required.' }, { status: 400 });
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
        details: `Role ${user.role} attempted unauthorized document creation.`,
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

    if (content.length > 5000) {
      return NextResponse.json({ error: 'Content payload exceeds maximum limit of 5000 characters.' }, { status: 400 });
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
      organizationId: user.organizationId,
      ownerId: user.id,
      allowedRoles: allowedRoles || ['Admin', 'Manager'],
      createdAt: new Date().toISOString(),
    };

    DOCUMENTS.push(newDoc);

    recordAuditLog({
      action: 'CREATE',
      status: 'SUCCESS',
      userId: user.id,
      userEmail: user.email,
      organizationId: user.organizationId,
      resourceId: newDoc.id,
      details: `Published document "${newDoc.title}" with [${newDoc.classification}] clearance.`,
    });

    return NextResponse.json({ document: newDoc }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Malformed JSON payload.' }, { status: 400 });
  }
}