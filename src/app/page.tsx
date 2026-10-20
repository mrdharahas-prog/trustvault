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

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('tv_theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('tv_theme', next);
  };

  const isDark = theme === 'dark';

  // GitHub Primer Color Tokens
  const bgMain = isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-[#ffffff] text-[#24292f]';
  const bgCard = isDark ? 'bg-[#161b22] border-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de]';
  const bgInput = isDark ? 'bg-[#0d1117] border-[#30363d] text-[#c9d1d9] focus:border-[#58a6ff]' : 'bg-[#ffffff] border-[#d0d7de] text-[#24292f] focus:border-[#0969da]';
  const textMuted = isDark ? 'text-[#8b949e]' : 'text-[#57606a]';
  const textHead = isDark ? 'text-[#f0f6fc]' : 'text-[#1f2328]';
  const navActive = isDark ? 'bg-[#21262d] text-[#f0f6fc]' : 'bg-[#eaeef2] text-[#1f2328]';
  const btnPrimary = isDark
    ? 'bg-[#238636] hover:bg-[#2ea043] text-white border border-[rgba(240,246,252,0.1)]'
    : 'bg-[#1f883d] hover:bg-[#1a7f37] text-white border border-[rgba(31,35,40,0.15)]';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [classification, setClassification] = useState<'Internal' | 'Confidential' | 'Restricted'>('Internal');
  const [formFeedback, setFormFeedback] = useState<{ message: string; ok: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

if (!currentUser) {
    return (
      <div className={`min-h-screen ${bgMain} flex flex-col justify-center items-center px-4 py-12 transition-colors`}>
        <div className="absolute top-6 right-6">
          <button
            onClick={toggleTheme}
            className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-2 ${
              isDark ? 'border-[#30363d] bg-[#161b22] text-[#c9d1d9] hover:bg-[#21262d]' : 'border-[#d0d7de] bg-[#f6f8fa] text-[#24292f] hover:bg-[#eaeef2]'
            }`}
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium mb-3 ${
              isDark ? 'bg-[#161b22] border-[#30363d] text-[#58a6ff]' : 'bg-[#f6f8fa] border-[#d0d7de] text-[#0969da]'
            }`}>
              <span className="w-2 h-2 rounded-full bg-[#3fb950]"></span>
              Zero-Trust Identity Portal
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${textHead}`}>TrustVault Identity Access</h1>
            <p className={`text-xs ${textMuted} mt-1.5`}>
              Select an identity to verify tenancy boundaries and role-based permissions.
            </p>
          </div>

          <div className="space-y-3">
            {ACCOUNTS.map((account) => (
              <button
                key={account.id}
                onClick={() => setCurrentUser(account)}
                className={`w-full text-left p-4 rounded-lg border transition-all flex items-start gap-3.5 ${bgCard} hover:border-[#58a6ff]/60`}
              >
                <div className={`w-9 h-9 rounded-md border flex items-center justify-center font-bold text-xs shrink-0 ${
                  isDark ? 'bg-[#21262d] border-[#30363d] text-[#f0f6fc]' : 'bg-[#eaeef2] border-[#d0d7de] text-[#1f2328]'
                }`}>
                  {account.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-semibold text-xs ${textHead}`}>{account.name}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${
                        account.role === 'Admin'
                          ? isDark ? 'bg-[#f85149]/10 text-[#ff7b72] border-[#f85149]/30' : 'bg-[#ffebe9] text-[#cf222e] border-[#ff8182]/40'
                          : account.role === 'Manager'
                          ? isDark ? 'bg-[#d29922]/10 text-[#e3b341] border-[#d29922]/30' : 'bg-[#fff8c5] text-[#9a6700] border-[#d4a72c]/40'
                          : isDark ? 'bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/30' : 'bg-[#ddf4ff] text-[#0969da] border-[#54aeff]/40'
                      }`}
                    >
                      {account.role}
                    </span>
                  </div>
                  <div className={`text-[11px] ${textMuted} mt-0.5`}>{account.email} • {account.org}</div>
                  <p className={`text-[11px] ${textMuted} mt-1.5 leading-snug`}>{account.roleDescription}</p>
                </div>
              </button>
            ))}
          </div>

          <div className={`mt-8 pt-6 border-t ${isDark ? 'border-[#30363d]' : 'border-[#d0d7de]'} text-center`}>
            <span className={`text-[11px] font-mono ${textMuted}`}>
              TrustVault Security Gateway • Enterprise Multi-Tenant Defense
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgMain} flex flex-col transition-colors`}>
      <header className={`border-b ${isDark ? 'bg-[#161b22] border-[#30363d]' : 'bg-[#f6f8fa] border-[#d0d7de]'} sticky top-0 z-20`}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs text-white ${
                isDark ? 'bg-[#238636]' : 'bg-[#1f883d]'
              }`}>
                TV
              </span>
              <span className={`font-semibold text-sm tracking-tight ${textHead}`}>TrustVault</span>
            </div>

            <nav className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === 'documents' ? navActive : `${textMuted} hover:${textHead}`
                }`}
              >
                Documents
              </button>

              {currentUser.role === 'Admin' && (
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    activeTab === 'audit' ? navActive : `${textMuted} hover:${textHead}`
                  }`}
                >
                  Audit Ledger
                </button>
              )}

              <button
                onClick={() => setActiveTab('security')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                  activeTab === 'security' ? navActive : `${textMuted} hover:${textHead}`
                }`}
              >
                Security Sandbox (IDOR)
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              title="Toggle Theme"
              className={`p-1.5 rounded-md border text-xs transition ${
                isDark ? 'border-[#30363d] bg-[#21262d] text-[#c9d1d9] hover:bg-[#30363d]' : 'border-[#d0d7de] bg-[#ffffff] text-[#24292f] hover:bg-[#eaeef2]'
              }`}
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#30363d]/50">
              <div className={`w-7 h-7 rounded-md border flex items-center justify-center text-xs font-semibold ${
                isDark ? 'bg-[#21262d] border-[#30363d] text-[#c9d1d9]' : 'bg-[#ffffff] border-[#d0d7de] text-[#24292f]'
              }`}>
                {currentUser.avatar}
              </div>
              <div className="text-left">
                <div className={`text-xs font-medium leading-none ${textHead} flex items-center gap-1.5`}>
                  {currentUser.name}
                  <span className={`text-[9px] font-mono px-1 rounded uppercase border ${
                    isDark ? 'border-[#30363d] text-[#8b949e]' : 'border-[#d0d7de] text-[#57606a]'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className={`text-[10px] ${textMuted} mt-0.5`}>{currentUser.org}</div>
              </div>
            </div>

            <button
              onClick={() => setCurrentUser(null)}
              className={`text-xs border px-2.5 py-1 rounded-md transition font-medium ${
                isDark ? 'border-[#30363d] text-[#c9d1d9] hover:bg-[#21262d]' : 'border-[#d0d7de] text-[#24292f] hover:bg-[#eaeef2]'
              }`}
            >
              Switch User
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
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
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${bgCard} ${
                      selectedDoc?.id === doc.id
                        ? (isDark ? 'border-[#58a6ff]' : 'border-[#0969da]')
                        : (isDark ? 'hover:border-[#58a6ff]/50' : 'hover:border-[#0969da]/50')
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <span className={`font-medium text-sm ${textHead}`}>{doc.title}</span>
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
<div className={`mt-6 p-5 rounded-xl border ${bgCard}`}>                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
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

            <div className="space-y-6">
<div className={`p-5 rounded-xl border ${bgCard}`}>
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
                <div className={`p-5 rounded-xl border ${bgCard}`}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Create Vault Record
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Authorized document publication to {currentUser.org}.
                  </p>

                  <form onSubmit={handleCreateDocument} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Title</label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Annual Security Assessment"
                        required
className={`w-full text-xs px-3 py-2 rounded-lg border outline-none ${bgInput}`}                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Confidential Payload</label>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Encrypted content..."
                        rows={3}
                        required
className={`w-full text-xs px-3 py-2 rounded-lg border outline-none ${bgInput}`}                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Clearance Level</label>
                      <select
                        value={classification}
                        onChange={(e) => setClassification(e.target.value as 'Internal' | 'Confidential' | 'Restricted')}
className={`w-full text-xs px-3 py-2 rounded-lg border outline-none ${bgInput}`}                      >
                        <option value="Internal">Internal (All Staff)</option>
                        <option value="Confidential">Confidential (Admin & Managers)</option>
                        {currentUser.role === 'Admin' && (
                          <option value="Restricted">Restricted (Admin Only)</option>
                        )}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
className={`w-full py-2 px-3 rounded-md text-xs font-semibold transition ${btnPrimary}`}                    >
                      {isSubmitting ? 'Encrypting & Committing...' : 'Commit to Vault'}
                    </button>
                  </form>

                  {formFeedback && (
                    <div
                      className={`mt-4 p-3 rounded-lg border text-xs font-mono leading-relaxed ${
                        formFeedback.ok
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                          : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      {formFeedback.message}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 rounded-xl border border-slate-800/60 bg-slate-900/20 text-center">
                  <span className="text-xs text-slate-400">
                    Viewer accounts hold read clearance only. Document publication is restricted to Managers and Administrators.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-white">Immutable Security Ledger</h2>
                <p className="text-xs text-slate-400">
                  Forensic audit trail tracking authorization successes, permission rejections, and access boundaries for {currentUser.org}.
                </p>
              </div>
              <button
                onClick={() => loadAuditLogs(currentUser.id)}
                className="text-xs px-3 py-1.5 rounded-md border border-slate-800 hover:border-slate-700 text-slate-300 transition"
              >
                Refresh Log
              </button>
            </div>

           <div className={`rounded-xl border overflow-hidden ${bgCard}`}>
              <div className={`divide-y ${isDark ? 'divide-[#30363d]' : 'divide-[#d0d7de]'}`}>
                {auditLogs.length === 0 ? (
                  <div className={`p-8 text-center text-xs ${textMuted}`}>No events recorded in this audit cycle.</div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-4 space-y-2 text-xs font-mono">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${
                              log.status === 'SUCCESS'
                                ? isDark ? 'bg-[#3fb950]/10 text-[#56d364] border-[#3fb950]/30' : 'bg-[#dafbe1] text-[#1a7f37] border-[#82e599]/40'
                                : isDark ? 'bg-[#f85149]/10 text-[#ff7b72] border-[#f85149]/30' : 'bg-[#ffebe9] text-[#cf222e] border-[#ff8182]/40'
                            }`}
                          >
                            {log.action} • {log.status}
                          </span>
                          <span className={`font-semibold ${textHead}`}>{log.userEmail}</span>
                        </div>
                        <span className={`text-[10px] ${textMuted}`}>
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className={`${textMuted} text-[11px]`}>
                        {log.details || 'Routine authorization check passed.'}
                      </div>

                      <div className={`p-2 rounded border text-[10px] space-y-1 ${
                        isDark ? 'bg-[#0d1117] border-[#30363d]/60 text-[#8b949e]' : 'bg-[#ffffff] border-[#d0d7de] text-[#57606a]'
                      }`}>
                        <div className="flex items-center justify-between truncate">
                          <span>SHA-256 Digest:</span>
                          <span className={`font-semibold ${isDark ? 'text-[#58a6ff]' : 'text-[#0969da]'}`}>
                            {log.hash ? log.hash.substring(0, 32) + '...' : 'UNHASHED'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between truncate opacity-75">
                          <span>Previous Block:</span>
                          <span>{log.previousHash ? log.previousHash.substring(0, 24) + '...' : 'GENESIS'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="pb-3 border-b border-slate-800 text-center">
              <h2 className="text-base font-semibold text-white">IDOR Penetration Test Sandbox</h2>
              <p className="text-xs text-slate-400 mt-1">
                Evaluate server-side tenant boundary enforcement by initiating direct resource access requests across organizations.
              </p>
            </div>

<div className={`p-6 rounded-xl border space-y-4 ${bgCard}`}>              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Target Resource:</span>
                  <code className="text-slate-200">doc_acme_q3_report</code>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Target Tenant:</span>
                  <span className="text-slate-200">Acme Corporation (org_acme)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Current Caller Tenant:</span>
                  <span className="text-slate-200">{currentUser.org} ({currentUser.orgId})</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Caller Identity:</span>
                  <span className="text-slate-200">{currentUser.email}</span>
                </div>
              </div>

              <button
                onClick={handleRunSecurityProbe}
                disabled={isProbing}
className={`w-full py-2 px-3 rounded-md text-xs font-semibold text-white transition ${
    isDark ? 'bg-[#da3633] hover:bg-[#b62324]' : 'bg-[#cf222e] hover:bg-[#a40e26]'
  }`}              >
                {isProbing ? 'Executing Exploit Probe...' : 'Execute Direct Object Reference Probe'}
              </button>

              {probeResult && (
                <div
                  className={`mt-4 p-4 rounded-lg border text-xs font-mono leading-relaxed ${
                    probeResult.status === 200
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {probeResult.text}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-slate-800/60 bg-slate-900/20 text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-300 block mb-1">Expected Evaluator Behavior:</strong>
              When authenticated as <strong>Eve Sterling (Rival Dynamics)</strong>, this request must be intercepted with a <strong>403 Forbidden</strong> response, confirming that tenancy validation occurs before data is queried from memory.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}