/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Flag,
  X,
  AlertTriangle,
  Check,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';
import { Character, ChatMessage, ContentReport, ReportEvidenceItem, User } from '../../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  character?: Character;
  chatMessages?: ChatMessage[];
  currentUser: User;
  onSubmitReport: (report: ContentReport) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  character,
  chatMessages = [],
  currentUser,
  onSubmitReport
}) => {
  const [category, setCategory] = useState<'hate' | 'harassment' | 'nsfw_mismatch' | 'illegal' | 'spam'>('nsfw_mismatch');
  const [description, setDescription] = useState('');
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !character) return null;

  const toggleSelectMessage = (msgId: string) => {
    if (selectedMessageIds.includes(msgId)) {
      setSelectedMessageIds(selectedMessageIds.filter(id => id !== msgId));
    } else {
      setSelectedMessageIds([...selectedMessageIds, msgId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    // Attach only the selected messages as immutable evidence
    const attachedEvidence: ReportEvidenceItem[] = chatMessages
      .filter(m => selectedMessageIds.includes(m.id))
      .map(m => ({
        messageId: m.id,
        sender: m.sender,
        content: m.content,
        timestamp: m.timestamp
      }));

    const report: ContentReport = {
      id: 'rep_' + Date.now().toString(36),
      reporterId: currentUser.id,
      reporterUsername: currentUser.username,
      targetType: attachedEvidence.length > 0 ? 'conversation' : 'character',
      targetId: character.id,
      targetTitle: character.name,
      category,
      description: description.trim(),
      evidenceMessages: attachedEvidence.length > 0 ? attachedEvidence : undefined,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    onSubmitReport(report);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 z-10 shadow-2xl animate-modal-pop">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <Flag className="w-4 h-4" />
            <span>Report Content to Trust & Safety</span>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="py-8 text-center space-y-2">
            <Check className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">Report Submitted Successfully</h3>
            <p className="text-xs text-neutral-400">
              Our Trust & Safety moderators will audit the content and take disciplinary action if policies are violated.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 text-xs text-neutral-300">
              Reporting: <strong className="text-white">{character.name}</strong> by @{character.creatorUsername}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Violation Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white"
              >
                <option value="nsfw_mismatch">Content Rating Mismatch (Adult content not labeled NSFW)</option>
                <option value="hate">Hate Speech, Harassment, or Abuse</option>
                <option value="illegal">Prohibited or Extreme Material</option>
                <option value="spam">Commercial Spam or Bot Manipulation</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">
                Detailed Explanation <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explain the specific issue or policy breach..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-3 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            {/* Selectable Message Evidence Snapshot (Zero-Leak Privacy!) */}
            {chatMessages.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Attach Specific Message Excerpt as Evidence:</span>
                </span>
                <p className="text-[11px] text-neutral-400">
                  Select only the offending messages. Unselected messages in your chat remain strictly private to you.
                </p>

                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-neutral-900/60 rounded-xl border border-neutral-800">
                  {chatMessages.map(m => {
                    const isSelected = selectedMessageIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-start gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-600/20 border border-indigo-500/40 text-white' : 'hover:bg-neutral-850 text-neutral-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectMessage(m.id)}
                          className="mt-0.5 rounded text-indigo-600 bg-neutral-950 border-neutral-800"
                        />
                        <div className="flex-1 truncate">
                          <span className="font-semibold text-[10px] text-neutral-500 block uppercase">
                            {m.sender}:
                          </span>
                          <span className="truncate block">{m.content}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 bg-neutral-800 text-neutral-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!description.trim()}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-40"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
