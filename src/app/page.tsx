'use client';

import React, { useState, useEffect } from 'react';
import { DocumentRecord, AuditLogEntry } from '@/types/vault';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Viewer';
  org: string;
  orgId: string;
  avatar: string;
  roleDescription: string;
}

const ACCOUNTS: UserProfile[] = [
  {
    id: 'usr_admin_org1',
    name: 'Alice Henderson',
    email: 'alice.h@acme.com',
    role: 'Admin',
    org: 'Acme Corporation',
    orgId: 'org_acme',
    avatar: 'AH',
    roleDescription: 'Security Admin • Full audit & cryptographic key management',
  },
  {
    id: 'usr_mgr_org1',
    name: 'Robert Vance',
    email: 'r.vance@acme.com',
    role: 'Manager',
    org: 'Acme Corporation',
    orgId: 'org_acme',
    avatar: 'RV',
    roleDescription: 'Operations Lead • Document authoring & classified record access',
  },
  {
    id: 'usr_view_org1',
    name: 'Charlie Miller',
    email: 'cmiller@acme.com',
    role: 'Viewer',
    org: 'Acme Corporation',
    orgId: 'org_acme',
    avatar: 'CM',
    roleDescription: 'Internal Staff • Read-only access to unclassified policies',
  },
  {
    id: 'usr_admin_org2',
    name: 'Eve Sterling',
    email: 'eve@rivalcorp.io',
    role: 'Admin',
    org: 'Rival Dynamics (External Tenant)',
    orgId: 'org_rival',
    avatar: 'ES',
    roleDescription: 'External Organization Admin • Cross-tenant boundary test persona',
  },
];

export default function TrustVaultApp() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'documents' | 'audit' | 'security'>('documents');
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(false);

  // Document creation form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [classification, setClassification] = useState<'Internal' | 'Confidential' | 'Restricted'>('Internal');
  const [formFeedback, setFormFeedback] = useState<{ message: string; ok: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // IDOR probe state
  const [probeResult, setProbeResult] = useState<{ status: number; text: string } | null>(null);
  const [isProbing, setIsProbing] = useState(false);

  const loadDocuments = async (userId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents?userId=${userId}`);
      const data = await res.json();
      if (res.ok) {
        setDocuments(data.documents || []);
      } else {
        setDocuments([]);
      }
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async (userId: string) => {
    try {
      const res = await fetch(`/api/audit?userId=${userId}`);
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.auditLogs || []);
      } else {
        setAuditLogs([]);
      }
    } catch {
      setAuditLogs([]);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadDocuments(currentUser.id);
      if (currentUser.role === 'Admin') {
        loadAuditLogs(currentUser.id);
      }
      setSelectedDoc(null);
      setProbeResult(null);
      setFormFeedback(null);
      setActiveTab('documents');
    }
  }, [currentUser]);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSubmitting(true);
    setFormFeedback(null);

    const roleMap: Record<string, ('Admin' | 'Manager' | 'Viewer')[]> = {
      Internal: ['Admin', 'Manager', 'Viewer'],
      Confidential: ['Admin', 'Manager'],
      Restricted: ['Admin'],
    };

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          title,
          content,
          classification,
          allowedRoles: roleMap[classification],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormFeedback({ message: data.error || 'Authorization rejected by security boundary.', ok: false });
      } else {
        setFormFeedback({ message: `Document "${data.document.title}" encrypted and committed to ledger.`, ok: true });
        setTitle('');
        setContent('');
        loadDocuments(currentUser.id);
        if (currentUser.role === 'Admin') loadAuditLogs(currentUser.id);
      }
    } catch {
      setFormFeedback({ message: 'Transport error dispatching payload.', ok: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunSecurityProbe = async () => {
    if (!currentUser) return;
    setIsProbing(true);
    setProbeResult(null);

    try {
      const targetDocumentId = 'doc_acme_q3_report';
      const res = await fetch(`/api/documents/${targetDocumentId}?userId=${currentUser.id}`);
      const data = await res.json();

      setProbeResult({
        status: res.status,
        text: res.ok
          ? `200 OK — Decryption Successful: "${data.document.title}" (${data.document.content})`
          : `${res.status} FORBIDDEN — Server Boundary Intercept: ${data.error}`,
      });

      if (currentUser.role === 'Admin') {
        loadAuditLogs(currentUser.id);
      }
    } catch {
      setProbeResult({ status: 500, text: 'Probe execution failed at network tier.' });
    } finally {
      setIsProbing(false);
    }
  };

  // 1. Sign-In Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-medium tracking-wide mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Identity & Access Governance
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">TrustVault</h1>
            <p className="text-sm text-slate-400 mt-2">
              Select an identity profile to enter the vault with its associated tenancy and cryptographic privileges.
            </p>
          </div>

          <div className="space-y-3">
            {ACCOUNTS.map((account) => (
              <button
                key={account.id}
                onClick={() => setCurrentUser(account)}
                className="w-full text-left p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 transition-all group flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center font-semibold text-xs text-slate-200 shrink-0 group-hover:border-slate-600 transition">
                  {account.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-slate-200 group-hover:text-white transition">
                      {account.name}
                    </span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${
                        account.role === 'Admin'
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                          : account.role === 'Manager'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                      }`}
                    >
                      {account.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{account.email} • {account.org}</div>
                  <p className="text-xs text-slate-400 mt-2">{account.roleDescription}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <span className="text-xs text-slate-400">
              Evaluator Environment • Multi-Tenant RBAC & IDOR Verification Suite
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated Portal
  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-[#0f141e]/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                TV
              </div>
              <span className="font-semibold text-sm tracking-tight text-white">TrustVault</span>
            </div>

            <nav className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === 'documents'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vault Documents
              </button>

              {currentUser.role === 'Admin' && (
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    activeTab === 'audit'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Audit Ledger
                </button>
              )}

              <button
                onClick={() => setActiveTab('security')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === 'security'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Security Sandbox (IDOR Probe)
              </button>
            </nav>
          </div>

          {/* Active Identity Pill & Sign Out */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium text-slate-200">
                {currentUser.avatar}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium text-slate-200 flex items-center gap-2">
                  {currentUser.name}
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono uppercase bg-slate-800 border border-slate-700 text-slate-300">
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">{currentUser.org}</div>
              </div>
            </div>

            <button
              onClick={() => setCurrentUser(null)}
              className="text-xs text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-md transition"
            >
              Switch User
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* VIEW 1: VAULT DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-semibold text-white">Accessible Assets</h2>
                  <p className="text-xs text-slate-400">
                    Authorized files filtered by your organization boundary (<code className="text-slate-300">{currentUser.orgId}</code>) and role clearance.
                  </p>
                </div>
                {loading && <span className="text-xs text-slate-400">Syncing...</span>}
              </div>

              {documents.length === 0 && !loading && (
                <div className="p-12 text-center border border-dashed border-slate-800/80 rounded-xl bg-slate-900/20 text-slate-400 text-xs">
                  No records matching your clearance classification.
                </div>
              )}

              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedDoc?.id === doc.id
                        ? 'border-indigo-500/80 bg-slate-900/90 shadow-sm'
                        : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <span className="font-medium text-sm text-slate-100">{doc.title}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase shrink-0 ${
                          doc.classification === 'Restricted'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                            : doc.classification === 'Confidential'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        }`}
                      >
                        {doc.classification}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{doc.content}</p>
                    <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>ID: {doc.id}</span>
                      <span>Authorized: {doc.allowedRoles.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>

              {selectedDoc && (
                <div className="mt-6 p-5 rounded-xl border border-slate-800 bg-[#0e131d]">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Decrypted Asset Inspector
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{selectedDoc.id}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{selectedDoc.title}</h3>
                  <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                    {selectedDoc.content}
                  </div>
                  <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                    <span>Classification: {selectedDoc.classification}</span>
                    <span>Created: {new Date(selectedDoc.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right Pane: Role Capabilities & Document Creation */}
            <div className="space-y-6">
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Account Capabilities
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Read Clearance</span>
                    <span className="font-medium text-emerald-400">Granted</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Create Records</span>
                    <span className={`font-medium ${currentUser.role === 'Viewer' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {currentUser.role === 'Viewer' ? 'Restricted' : 'Granted'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Audit Ledger Access</span>
                    <span className={`font-medium ${currentUser.role === 'Admin' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {currentUser.role === 'Admin' ? 'Granted' : 'Restricted'}
                    </span>
                  </div>
                </div>
              </div>

              {currentUser.role !== 'Viewer' ? (
                <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/4