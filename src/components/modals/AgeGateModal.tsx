/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, X, AlertTriangle } from 'lucide-react';

interface AgeGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const AgeGateModal: React.FC<AgeGateModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 z-10 shadow-2xl animate-modal-pop">
        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="text-center space-y-1.5">
          <h2 className="text-base font-bold text-white">Age-Restricted Adult Content</h2>
          <p className="text-xs text-neutral-300 leading-relaxed">
            You are requesting access to characters marked with Mature or NSFW (18+) content ratings. These narratives may contain adult themes, explicit language, or sensual interactions.
          </p>
        </div>

        <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
          <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Platform Content Policy</span>
          </div>
          <p>
            By proceeding, you certify under penalty of account suspension that you are at least 18 years of age (or legal adult age in your jurisdiction) and consent to viewing adult-classified roleplay material.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold"
          >
            I am Under 18 (Return)
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-rose-600/30"
          >
            I am 18 or Older (Confirm)
          </button>
        </div>
      </div>
    </div>
  );
};
