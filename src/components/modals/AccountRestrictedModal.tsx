import React, { useState } from 'react';
import { ShieldAlert, Mail, Copy, Check, ExternalLink } from 'lucide-react';

interface AccountRestrictedModalProps {
  isOpen: boolean;
  reason?: string;
  onResetDemo?: () => void;
}

export const AccountRestrictedModal: React.FC<AccountRestrictedModalProps> = ({
  isOpen,
  reason,
  onResetDemo
}) => {
  const [copied, setCopied] = useState(false);
  const supportEmail = 'wardenai@hyperionid.my.id';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md select-none animate-fade-in">
      <div className="bg-[#11141e] border-2 border-rose-600/80 rounded-2xl max-w-lg w-full p-6 text-center shadow-2xl relative animate-modal-pop">
        <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 mx-auto flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight">
          Account Restricted
        </h2>
        
        <p className="text-xs text-rose-300 font-medium mt-1">
          Child Safety & Minimum Age Policy Violation
        </p>

        <div className="my-4 p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 text-left text-xs space-y-2 text-neutral-300">
          <p>
            <strong className="text-rose-400">Strict Enforcement:</strong> Warden AI maintains a zero-tolerance policy regarding underage depictions or prohibited minors content. All characters, personas, and roleplay scenarios must depict adults aged 18 and older.
          </p>
          {reason && (
            <p className="text-neutral-400">
              <strong className="text-white">Flagged reason:</strong> {reason}
            </p>
          )}
          <p className="text-[11px] text-neutral-400">
            Your account activities and creation permissions have been frozen pending review.
          </p>
        </div>

        {/* Contact Information */}
        <div className="p-3 bg-[#181c28] border border-[#262c3e] rounded-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-300 font-mono text-[11px] truncate">
            <Mail className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="truncate">{supportEmail}</span>
          </div>
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Email'}</span>
          </button>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <a
            href={`mailto:${supportEmail}?subject=Warden%20AI%20Account%20Restriction%20Appeal&body=Hello%20Warden%20AI%20Support,%0D%0A%0D%0AI%20would%20like%20to%20appeal%20my%20account%20restriction.`}
            className="w-full sm:w-auto px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Send Appeal Email</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {onResetDemo && (
            <button
              onClick={onResetDemo}
              className="w-full sm:w-auto px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
            >
              Reset Demo Session
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
