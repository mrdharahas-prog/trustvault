'use client';

import React, { useState, useEffect } from 'react';
import { User, DocumentRecord, AuditLogEntry } from '@/types/vault';

interface SeedUserSummary {
  id: string;
  name: string;
  role: string;
  org: string;
  desc: string;
}

const PRESET_USERS: SeedUserSummary[] = [
  { id: 'usr_admin_org1', name: 'Alice Admin', role: 'Admin', org: 'Acme Corp', desc: 'Full access to all Acme documents and audit trails' },
  { id: 'usr_mgr_org1', name: 'Bob Manager', role: 'Manager', org: 'Acme Corp', desc: 'Read/write Acme docs, excluding root secret keys' },
  { id: 'usr_view_org1', name: 'Charlie Viewer', role: 'Viewer', org: 'Acme Corp', desc: 'Read-only access to internal documents only' },
  { id: 'usr_admin_org2', name: 'Eve Intruder', role: 'Admin', org: 'Rival Corp', desc: 'External tenant (Used to simulate IDOR cross-tenant exploit)' },
];

export default function TrustVaultDashboard() {
  const [activeUser, setActiveUser] = useState<SeedUserSummary>(PRESET_USERS[0]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [attackResult, setAttackResult] = useState<{ status: number; message: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchDocuments = async (userId: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/documents?userId=${userId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch documents');
      }
      setDocuments(data.documents || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      }
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async (userId: string) => {
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
    fetchDocuments(activeUser.id);
    fetchAuditLogs(activeUser.id);
    setSelectedDoc(null);
    setAttackResult(null);
  }, [activeUser]);

  const handleSimulateIdorAttack = async () => {
    setAttackResult(null);
    try {
      // Intentionally request Acme confidential report while authenticated as current user
      const targetDocId = 'doc_acme_q3_report';
      const res = await fetch(`/api/documents/${targetDocId}?userId=${activeUser.id}`);
      const data = await res.json();
      setAttackResult({
        status: res.status,
        message: res.ok
          ? `SUCCESS (200 OK): Retrieved "${data.document.title}". Content: ${data.document.content}`
          : `BLOCKED (${res.status}): ${data.error}`,
      });
      fetchAuditLogs(activeUser.id);
    } catch {
      setAttackResult({
        status: 500,
        message: 'Request failed to execute.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-10">
      <header className="max-w-7xl mx-auto pb-8 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-tight text-white">TrustVault</span>
            <span className="text-xs font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded">
              Zero-Trust RBAC Active
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise document access control, IDOR boundary defense, and tamper-evident audit logging.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Role Selector & Testing Controls */}
        <section className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
              Select Evaluation Persona
            </h2>
            <div className="space-y-3">
              {PRESET_USERS.map((user) => {
                const isSelected = user.id === activeUser.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => setActiveUser(user)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all text-xs ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10 text-white ring-1 ring-indigo-500'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-slate-200">{user.name}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                          user.role === 'Admin'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : user.role === 'Manager'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {user.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{user.org}</div>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">{user.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive IDOR Testing Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Exploit Simulation Tool
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Trigger a direct request against Acme Corp confidential asset (<code className="text-indigo-400">doc_acme_q3_report</code>) using the active persona.
            </p>
            <button
              onClick={handleSimulateIdorAttack}
              className="w-full py-2.5 px-4 bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold rounded-lg shadow transition"
            >
              Simulate Direct Object Request (IDOR Probe)
            </button>

            {attackResult && (
              <div
                className={`mt-4 p-3 rounded border text-xs font-mono leading-relaxed ${
                  attackResult.status === 200
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}
              >
                {attackResult.message}
              </div>
            )}
          </div>
        </section>

        {/* Center Column: Authorized Document Feed */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Permitted Documents ({documents.length})
            </h2>
            {loading && <span className="text-xs text-slate-400 animate-pulse">Querying...</span>}
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded mb-4">
              {errorMsg}
            </div>
          )}

          <div className="space-y-3">
            {documents.length === 0 && !loading && (
              <div className="text-xs text-slate-400 italic py-6 text-center border border-dashed border-slate-800 rounded">
                No accessible documents found under this tenant or permission level.
              </div>
            )}
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  selectedDoc?.id === doc.id
                    ? 'border-indigo-500 bg-slate-800/80'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <h3 className="text-xs font-semibold text-white">{doc.title}</h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      doc.classification === 'Restricted'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : doc.classification === 'Confidential'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
                    }`}
                  >
                    {doc.classification}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-1">{doc.content}</div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>ID: {doc.id}</span>
                  <span>Roles: {doc.allowedRoles.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>

          {selectedDoc && (
            <div className="mt-6 p-4 rounded-lg bg-slate-950 border border-slate-800">
              <h4 className="text-xs font-semibold uppercase text-indigo-400 mb-2">
                Decrypted Document Payload
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed font-sans">{selectedDoc.content}</p>
              <div className="mt-3 text-[10px] font-mono text-slate-400">
                Created: {new Date(selectedDoc.createdAt).toLocaleTimeString()} | Owner: {selectedDoc.ownerId}
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Immutable Audit Ledger */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Audit Trail (Forensic Log)
            </h2>
            <button
              onClick={() => fetchAuditLogs(activeUser.id)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300"
            >
              Refresh
            </button>
          </div>

          {activeUser.role !== 'Admin' ? (
            <div className="text-xs text-slate-400 italic py-8 text-center border border-dashed border-slate-800 rounded p-4">
              Audit log inspection is restricted. Only Organization Administrators have read access to the tamper-proof ledger.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <div className="text-xs text-slate-400 italic text-center py-4">No audit events logged yet.</div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-[11px] font-mono"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span
                        className={`font-semibold ${
                          log.status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        [{log.action}] {log.status}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-slate-400 truncate">Actor: {log.userEmail}</div>
                    {log.details && (
                      <div className="text-slate-400 text-[10px] mt-1 leading-snug">{log.details}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}