/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  KeyRound,
  ShieldAlert,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  FileText,
  AlertOctagon,
  Eye,
  Plus,
  Lock,
  X
} from 'lucide-react';
import { AuditLog, Conversation, RestrictedInvestigation, User } from '../types';

interface RestrictedInvestigationViewProps {
  currentUser: User;
  investigations: RestrictedInvestigation[];
  conversations: Conversation[];
  auditLogs: AuditLog[];
  onCreateInvestigation: (inv: RestrictedInvestigation) => void;
  onApproveInvestigation: (id: string, authorityId: string, authorityName: string, decision: 'approved' | 'rejected', hours?: number) => void;
  onCloseInvestigation: (id: string, closerId: string, closerName: string, reason: string) => void;
}

export const RestrictedInvestigationView: React.FC<RestrictedInvestigationViewProps> = ({
  currentUser,
  investigations,
  conversations,
  auditLogs,
  onCreateInvestigation,
  onApproveInvestigation,
  onCloseInvestigation
}) => {
  const [activeTab, setActiveTab] = useState<'cases' | 'audit' | 'request'>('cases');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Form for new request
  const [caseReference, setCaseReference] = useState(`CASE-${new Date().getFullYear()}-SEC-${Math.floor(Math.random() * 900 + 100)}`);
  const [reason, setReason] = useState('');
  const [suspectedViolation, setSuspectedViolation] = useState('Severe terms violation, credential harvesting, or exploitation.');
  const [targetUsername, setTargetUsername] = useState('flagged_account_alpha');
  const [targetConversationId, setTargetConversationId] = useState(conversations[0]?.id || 'conv_target_01');
  const [messageRangeStart, setMessageRangeStart] = useState('msg_01');
  const [messageRangeEnd, setMessageRangeEnd] = useState('msg_10');
  const [errorMessage, setErrorMessage] = useState('');

  const isAuthorized = currentUser.role === 'moderator' || currentUser.role === 'admin';
  const isAdmin = currentUser.role === 'admin';

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Security Restricted Chamber</h2>
        <p className="text-xs text-neutral-400 leading-relaxed">
          The Restricted Investigation Chamber is governed by strict zero-knowledge principles. Only authorized Trust & Safety staff may inspect audited scopes.
        </p>
      </div>
    );
  }

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage('A documented reason and legal/safety justification is mandatory.');
      return;
    }

    const newInv: RestrictedInvestigation = {
      id: 'inv_' + Date.now().toString(36),
      caseReference,
      reason: reason.trim(),
      suspectedViolation,
      requestingInvestigatorId: currentUser.id,
      requestingInvestigatorName: currentUser.displayName,
      targetUserId: 'target_' + targetUsername,
      targetUsername,
      targetConversationId,
      allowedMessageRange: { startMessageId: messageRangeStart, endMessageId: messageRangeEnd },
      status: 'pending_approval',
      createdAt: new Date().toISOString()
    };

    onCreateInvestigation(newInv);
    setActiveTab('cases');
    setReason('');
    setErrorMessage('');
  };

  const handleApproveCase = (invId: string) => {
    try {
      onApproveInvestigation(invId, currentUser.id, currentUser.displayName, 'approved', 24);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message);
    }
  };

  const selectedCase = investigations.find(i => i.id === selectedCaseId);
  const targetConv = selectedCase ? conversations.find(c => c.id === selectedCase.targetConversationId) : null;

  return (
    <div className="max-w-5xl mx-auto pb-16 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-amber-400" />
            <span>Restricted Investigation Protocol</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Zero-leak conversation privacy architecture. Narrowly scoped, two-person verified, time-limited emergency access only.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-0.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('cases')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'cases' ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Inquiry Cases ({investigations.length})
          </button>
          <button
            onClick={() => setActiveTab('request')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1 ${
              activeTab === 'request' ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>File Request</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1 ${
              activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Trail</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tab 1: Cases List */}
      {activeTab === 'cases' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {investigations.map(inv => {
              const isApproved = inv.status === 'approved';
              const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
              const isRequester = inv.requestingInvestigatorId === currentUser.id;

              return (
                <div
                  key={inv.id}
                  className="p-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{inv.caseReference}</span>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            inv.status === 'approved' && !isExpired
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : inv.status === 'pending_approval'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {isExpired ? 'EXPIRED' : inv.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Target User: @{inv.targetUsername} · Conversation: {inv.targetConversationId}
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-neutral-400 font-mono">
                      <div>Requester: {inv.requestingInvestigatorName}</div>
                      {inv.approvingAuthorityName && (
                        <div className="text-emerald-400">Approver: {inv.approvingAuthorityName}</div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300 bg-neutral-950 p-3 rounded-lg border border-neutral-800 leading-relaxed">
                    <strong className="text-neutral-400 block mb-1">Investigation Justification:</strong>
                    {inv.reason}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                    <div className="text-neutral-500 text-[11px] font-mono">
                      {inv.expiresAt && `Access expires: ${new Date(inv.expiresAt).toLocaleString()}`}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Independent approval control (separation of duties!) */}
                      {inv.status === 'pending_approval' && isAdmin && (
                        <>
                          {isRequester ? (
                            <span className="text-[11px] text-rose-400 italic">
                              Separation of Duties: You filed this request and cannot self-approve it.
                            </span>
                          ) : (
                            <button
                              onClick={() => handleApproveCase(inv.id)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-600/30"
                            >
                              Approve Scope (24h)
                            </button>
                          )}
                        </>
                      )}

                      {isApproved && !isExpired && (
                        <button
                          onClick={() => setSelectedCaseId(selectedCaseId === inv.id ? null : inv.id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{selectedCaseId === inv.id ? 'Close Scope' : 'Inspect Authorized Messages'}</span>
                        </button>
                      )}

                      {isApproved && (
                        <button
                          onClick={() => onCloseInvestigation(inv.id, currentUser.id, currentUser.displayName, 'Case closed by review.')}
                          className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium"
                        >
                          Close Case
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scoped Inspection View */}
                  {selectedCaseId === inv.id && (
                    <div className="p-4 bg-neutral-950 rounded-xl border border-amber-500/30 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <AlertOctagon className="w-4 h-4" />
                          <span>Authorized Read-Only Message Scope</span>
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          Scope: {inv.allowedMessageRange?.startMessageId} → {inv.allowedMessageRange?.endMessageId}
                        </span>
                      </div>

                      {targetConv && targetConv.messages.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {targetConv.messages.map(m => (
                            <div key={m.id} className="p-2.5 rounded bg-neutral-900 border border-neutral-800 text-xs">
                              <div className="text-[10px] text-neutral-500 font-mono mb-1">
                                [{m.timestamp}] {m.sender.toUpperCase()}:
                              </div>
                              <div className="text-neutral-200">{m.content}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-neutral-500">
                          Target conversation contains zero stored messages or has been purged according to user retention policies.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: File New Request */}
      {activeTab === 'request' && (
        <form onSubmit={handleCreateRequest} className="p-6 bg-neutral-900/80 border border-neutral-800 rounded-2xl space-y-4">
          <div className="border-b border-neutral-800 pb-3">
            <h2 className="text-sm font-bold text-white">File Restricted Investigation Request</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Strict legal threshold required. An independent Administrator must verify that less intrusive measures are insufficient.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Case Reference</label>
              <input
                type="text"
                value={caseReference}
                onChange={e => setCaseReference(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Target Username</label>
              <input
                type="text"
                value={targetUsername}
                onChange={e => setTargetUsername(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-300">
              Suspected Policy Violation
            </label>
            <input
              type="text"
              value={suspectedViolation}
              onChange={e => setSuspectedViolation(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-300">
              Documented Justification & Evidence Threshold <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Detail why less intrusive measures (e.g. user reports, voluntary evidence) cannot resolve this case..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full p-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Target Conversation ID</label>
              <input
                type="text"
                value={targetConversationId}
                onChange={e => setTargetConversationId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Authorized Message Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Start ID"
                  value={messageRangeStart}
                  onChange={e => setMessageRangeStart(e.target.value)}
                  className="w-1/2 px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono"
                />
                <span className="text-neutral-500">→</span>
                <input
                  type="text"
                  placeholder="End ID"
                  value={messageRangeEnd}
                  onChange={e => setMessageRangeEnd(e.target.value)}
                  className="w-1/2 px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('cases')}
              className="px-3 py-1.5 bg-neutral-800 text-neutral-300 text-xs rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm"
            >
              Submit for Independent Approval
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Security Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl">
            <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Immutable Staff Audit Trail ({auditLogs.length} events)</span>
            </h3>
            <p className="text-[11px] text-neutral-400 leading-relaxed mb-4">
              All authorization grants, investigation approvals, and moderation actions are permanently logged without exposing user message payloads.
            </p>

            <div className="space-y-2">
              {auditLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3 bg-neutral-950 rounded-xl border border-neutral-800/80 text-xs space-y-1 font-mono"
                >
                  <div className="flex items-center justify-between text-[10px] text-neutral-500">
                    <span className="text-indigo-400 font-bold">{log.action}</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-neutral-300 text-[11px]">
                    Actor: <span className="text-white">{log.actorName}</span> ({log.actorRole})
                  </div>
                  <div className="text-neutral-400 text-[11px] font-sans">
                    {log.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
