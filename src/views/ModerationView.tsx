/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Layers,
  Flag,
  User as UserIcon,
  MessageSquare,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Character, ContentReport, User } from '../types';

interface ModerationViewProps {
  currentUser: User;
  characters: Character[];
  reports: ContentReport[];
  onApproveCharacter: (characterId: string) => void;
  onRejectCharacter: (characterId: string, reason: string) => void;
  onRequestChanges: (characterId: string, notes: string) => void;
  onResolveReport: (reportId: string, notes: string) => void;
  onDismissReport: (reportId: string) => void;
}

export const ModerationView: React.FC<ModerationViewProps> = ({
  currentUser,
  characters,
  reports,
  onApproveCharacter,
  onRejectCharacter,
  onRequestChanges,
  onResolveReport,
  onDismissReport
}) => {
  const [activeTab, setActiveTab] = useState<'submissions' | 'reports'>('submissions');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [activeActionModal, setActiveActionModal] = useState<{
    type: 'reject' | 'changes' | 'report_resolve';
    targetId: string;
  } | null>(null);

  // RBAC Server-Enforced check
  const isAuthorized = currentUser.role === 'moderator' || currentUser.role === 'admin';
  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Restricted Staff Boundary</h2>
        <p className="text-xs text-neutral-400 leading-relaxed">
          The Moderation Dashboard is strictly restricted to verified Moderators and Administrators. Frontend route tampering or client storage edits cannot authorize access to this queue.
        </p>
      </div>
    );
  }

  // Pending character submissions
  const pendingSubmissions = characters.filter(
    c => c.publicationStatus === 'pending_review' || c.publicationStatus === 'draft'
  );

  const pendingReports = reports.filter(r => r.status === 'pending');
  const resolvedReports = reports.filter(r => r.status !== 'pending');

  const selectedChar = characters.find(c => c.id === selectedCharacterId);

  const handleExecuteModalAction = () => {
    if (!activeActionModal) return;
    if (activeActionModal.type === 'reject') {
      onRejectCharacter(activeActionModal.targetId, actionNotes);
    } else if (activeActionModal.type === 'changes') {
      onRequestChanges(activeActionModal.targetId, actionNotes);
    } else if (activeActionModal.type === 'report_resolve') {
      onResolveReport(activeActionModal.targetId, actionNotes);
    }
    setActiveActionModal(null);
    setActionNotes('');
  };

  return (
    <div className="max-w-5xl mx-auto pb-16 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <span>Trust & Safety Moderation Dashboard</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Logged in as <strong className="text-white">{currentUser.displayName}</strong> ({currentUser.role.toUpperCase()}). Maintain content ratings, audit submissions, and inspect evidence.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-0.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'submissions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Submissions Queue</span>
            {pendingSubmissions.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-white text-indigo-950 rounded-full font-mono">
                {pendingSubmissions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'reports'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>User Reports</span>
            {pendingReports.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-rose-500 text-white rounded-full font-mono">
                {pendingReports.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {pendingSubmissions.length === 0 ? (
            <div className="py-16 text-center bg-neutral-900/30 border border-neutral-800 rounded-2xl p-6 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Submissions Queue Clear</h3>
              <p className="text-xs text-neutral-400">
                All community character submissions have been reviewed and classified.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSubmissions.map(char => {
                const isExpanded = selectedCharacterId === char.id;

                return (
                  <div
                    key={char.id}
                    className="p-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={char.avatarUrl}
                          alt={char.name}
                          className="w-12 h-12 rounded-xl object-cover ring-1 ring-neutral-700 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">{char.name}</h3>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                              Declared: {char.contentRating}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              {char.publicationStatus.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-400 mt-0.5">
                            Created by @{char.creatorUsername} · {char.scenarios.length} Scenarios · #{char.tagSlugs.join(' #')}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedCharacterId(isExpanded ? null : char.id)}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'Inspect Scenarios'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => setActiveActionModal({ type: 'changes', targetId: char.id })}
                          className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Request Changes
                        </button>

                        <button
                          onClick={() => setActiveActionModal({ type: 'reject', targetId: char.id })}
                          className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => onApproveCharacter(char.id)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-emerald-600/30"
                        >
                          Approve & Publish
                        </button>
                      </div>
                    </div>

                    {/* Detailed Review Breakdown */}
                    {isExpanded && (
                      <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-3 text-xs text-neutral-300 animate-in fade-in">
                        <div>
                          <span className="font-semibold text-neutral-400 block mb-0.5">Short Overview:</span>
                          <p>{char.shortDescription}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-neutral-400 block mb-0.5">Personality & Definition:</span>
                          <p>{char.personality}</p>
                        </div>

                        {/* Scenarios Review */}
                        <div className="space-y-2 pt-2 border-t border-neutral-800">
                          <span className="font-semibold text-indigo-400 block">
                            Attached Scenarios ({char.scenarios.length}):
                          </span>
                          {char.scenarios.map((sc, i) => (
                            <div key={sc.id} className="p-3 bg-neutral-900 rounded-lg border border-neutral-800/80 space-y-1">
                              <div className="font-bold text-white text-[11px]">
                                #{i + 1} {sc.title}
                              </div>
                              <p className="text-[11px] text-neutral-400">{sc.description}</p>
                              <div className="text-[10px] text-neutral-300 italic bg-neutral-950 p-2 rounded border border-neutral-800">
                                {sc.openingMessage}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Pending Reports ({pendingReports.length})
            </span>
          </div>

          {pendingReports.length === 0 ? (
            <div className="py-16 text-center bg-neutral-900/30 border border-neutral-800 rounded-2xl p-6 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">Report Center Clear</h3>
              <p className="text-xs text-neutral-400">
                No active user reports pending investigation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingReports.map(rep => (
                <div
                  key={rep.id}
                  className="p-5 bg-neutral-900/80 border border-neutral-800 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-rose-400" />
                      <h4 className="text-sm font-bold text-white">{rep.targetTitle}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                        {rep.category.toUpperCase()}
                      </span>
                    </div>

                    <span className="text-[11px] text-neutral-500 font-mono">
                      Reported by @{rep.reporterUsername}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                    <strong className="text-neutral-400 block mb-1">User Report Rationale:</strong>
                    {rep.description}
                  </p>

                  {/* Attached Evidence Messages Snapshot (Private Conversation Protection!) */}
                  {rep.evidenceMessages && rep.evidenceMessages.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-neutral-800">
                      <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Attached User-Selected Evidence ({rep.evidenceMessages.length} Messages):</span>
                      </span>
                      <p className="text-[11px] text-neutral-500">
                        Only the messages explicitly submitted as evidence are visible to moderators. The remaining user chat remains private.
                      </p>
                      <div className="space-y-1.5">
                        {rep.evidenceMessages.map((ev, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80 text-xs text-neutral-200"
                          >
                            <span className="text-[10px] font-mono text-neutral-500 block">
                              [{ev.timestamp}] {ev.sender}:
                            </span>
                            <div className="mt-0.5">{ev.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => onDismissReport(rep.id)}
                      className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => setActiveActionModal({ type: 'report_resolve', targetId: rep.id })}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm"
                    >
                      Resolve with Action
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Notes Modal */}
      {activeActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setActiveActionModal(null)}
          />
          <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-4 z-10 shadow-2xl">
            <h3 className="text-sm font-bold text-white">
              {activeActionModal.type === 'reject'
                ? 'Reject Character Submission'
                : activeActionModal.type === 'changes'
                ? 'Request Changes from Creator'
                : 'Resolve User Report'}
            </h3>
            <p className="text-xs text-neutral-400">
              Provide constructive moderator notes that will be recorded in the audit log and delivered to the creator.
            </p>
            <textarea
              rows={4}
              placeholder="Enter explanation or guidance..."
              value={actionNotes}
              onChange={e => setActionNotes(e.target.value)}
              className="w-full p-3 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              required
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveActionModal(null)}
                className="px-3 py-1.5 bg-neutral-800 text-neutral-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteModalAction}
                disabled={!actionNotes.trim()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg disabled:opacity-40"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
