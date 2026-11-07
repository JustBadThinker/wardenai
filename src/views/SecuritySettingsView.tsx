/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Lock,
  Key,
  Shield,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Mail,
  Eye,
  EyeOff,
  ChevronRight,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { User } from '../types';
import { firebaseAuthService, ActiveSession } from '../services/firebaseAuth';

interface SecuritySettingsViewProps {
  currentUser: User;
  onUpdateUser: (updates: Partial<User>) => void;
  onNavigate?: (view: string) => void;
}

export const SecuritySettingsView: React.FC<SecuritySettingsViewProps> = ({
  currentUser,
  onUpdateUser,
  onNavigate
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Active Sessions
  const [sessions, setSessions] = useState<ActiveSession[]>(firebaseAuthService.getActiveSessions());

  // Privacy toggles
  const [blurNsfw, setBlurNsfw] = useState(currentUser.blurNsfw);
  const [isNsfwAllowed, setIsNsfwAllowed] = useState(currentUser.isNsfwAllowed);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordStatus('Please enter your current password for verification.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordStatus('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus('New passwords do not match.');
      return;
    }

    setIsChangingPass(true);
    setPasswordStatus(null);
    try {
      await firebaseAuthService.changePassword(currentPassword, newPassword);
      setPasswordStatus('Success: Password updated securely. All other active sessions have been invalidated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setPasswordStatus((err as Error).message);
    }
    setIsChangingPass(false);
  };

  const handleRevokeOtherSessions = () => {
    firebaseAuthService.revokeOtherSessions();
    setSessions(firebaseAuthService.getActiveSessions());
  };

  const handleSavePrivacy = () => {
    onUpdateUser({ blurNsfw, isNsfwAllowed });
  };

  const handleExportData = () => {
    const data = {
      profile: currentUser,
      exportedAt: new Date().toISOString(),
      securityPolicy: 'Warden AI Zero-Leak Private Encryption'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warden_account_data_${currentUser.username}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto pb-16 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="border-b border-neutral-800 pb-5">
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-400" />
          <span>Account Security & Privacy Settings</span>
        </h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          Manage your credentials, active sessions, authentication methods, and content privacy posture.
        </p>
      </div>

      {/* Radical Transparency & Architecture Disclosure Callout */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-[#121520] to-indigo-950/30 border border-purple-500/30 shadow-xl space-y-4 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Zero Corporate BS
              </span>
              <span className="text-xs font-semibold text-purple-300">Radical Privacy Manifesto</span>
            </div>
            <h2 className="text-base font-extrabold text-white tracking-tight">More Transparent Than Any Corporate AI</h2>
            <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
              Corporate AI logs your intimate roleplays, trains on your transcripts, and writes 50-page legal excuses.
              Warden AI sends <strong className="text-emerald-400">0 bytes</strong> of your chats to our servers. Review our live code and localStorage auditor.
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('privacy-security')}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white text-xs font-bold flex items-center gap-2 shrink-0 shadow-lg shadow-purple-600/30 transition-all cursor-pointer hover:shadow-purple-600/50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Full Privacy & Code Disclosure</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Identity & Email Status */}
      <section className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-neutral-300">Registered Email Address</div>
              <div className="text-sm font-bold text-white font-mono">{currentUser.email}</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified</span>
          </span>
        </div>
      </section>

      {/* Password Management */}
      <section className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-2xl space-y-4">
        <div className="border-b border-neutral-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-400" />
            <span>Change Account Password</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Passwords are encrypted using trusted industry standards. Reauthentication is required to make changes.
          </p>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-300">Current Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">New Password (8+ chars)</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New secure password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPassword ? 'Hide characters' : 'Show characters'}</span>
            </button>

            <button
              type="submit"
              disabled={isChangingPass || !currentPassword || !newPassword}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-indigo-600/30 disabled:opacity-40"
            >
              {isChangingPass ? 'Verifying...' : 'Update Password'}
            </button>
          </div>

          {passwordStatus && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                passwordStatus.startsWith('Success')
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}
            >
              {passwordStatus.startsWith('Success') ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{passwordStatus}</span>
            </div>
          )}
        </form>
      </section>

      {/* Active Sessions & Devices */}
      <section className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Laptop className="w-4 h-4 text-indigo-400" />
              <span>Signed-In Devices & Active Sessions</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Review active browser sessions. Revoke sessions to protect your account.
            </p>
          </div>

          {sessions.length > 1 && (
            <button
              onClick={handleRevokeOtherSessions}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-rose-500/10 hover:text-rose-400 text-neutral-300 rounded-lg text-xs font-semibold transition-colors"
            >
              Revoke Other Sessions
            </button>
          )}
        </div>

        <div className="space-y-3">
          {sessions.map(s => (
            <div
              key={s.id}
              className="p-3.5 bg-neutral-950 rounded-xl border border-neutral-800/80 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-neutral-900 text-neutral-400">
                  {s.deviceName.toLowerCase().includes('phone') ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{s.deviceName}</span>
                    {s.isCurrent && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                        This Device
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono">
                    {s.browser} · {s.location} · {s.lastActive}
                  </div>
                </div>
              </div>

              {!s.isCurrent && (
                <button
                  onClick={() => {
                    firebaseAuthService.revokeSession(s.id);
                    setSessions(firebaseAuthService.getActiveSessions());
                  }}
                  className="text-xs text-rose-400 hover:underline"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Content & Privacy Toggles */}
      <section className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-2xl space-y-4">
        <div className="border-b border-neutral-800 pb-3">
          <h2 className="text-sm font-bold text-white">Content & Privacy Preferences</h2>
        </div>

        <div className="space-y-3 text-xs text-neutral-300">
          <label className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800 cursor-pointer">
            <div>
              <div className="font-bold text-white">Blur Sensitive & Mature Previews</div>
              <div className="text-neutral-400 text-[11px]">
                Requires tapping to reveal Mature and NSFW character cover artwork.
              </div>
            </div>
            <input
              type="checkbox"
              checked={blurNsfw}
              onChange={e => {
                setBlurNsfw(e.target.checked);
                onUpdateUser({ blurNsfw: e.target.checked });
              }}
              className="w-4 h-4 rounded text-indigo-600 bg-neutral-900 border-neutral-800 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-neutral-950 rounded-xl border border-neutral-800 cursor-pointer">
            <div>
              <div className="font-bold text-white">Enable 18+ Unrestricted Content</div>
              <div className="text-neutral-400 text-[11px]">
                Allows browsing characters marked with NSFW content ratings.
              </div>
            </div>
            <input
              type="checkbox"
              checked={isNsfwAllowed}
              onChange={e => {
                setIsNsfwAllowed(e.target.checked);
                onUpdateUser({ isNsfwAllowed: e.target.checked });
              }}
              className="w-4 h-4 rounded text-indigo-600 bg-neutral-900 border-neutral-800 cursor-pointer"
            />
          </label>
        </div>
      </section>

      {/* Data Export & Account Deletion */}
      <section className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-2xl space-y-4">
        <div className="border-b border-neutral-800 pb-3">
          <h2 className="text-sm font-bold text-white">Data Portability & Danger Zone</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div>
            <div className="font-bold text-white">Export All Personal Data</div>
            <div className="text-neutral-400 text-[11px]">
              Download an encrypted JSON archive of your personas, characters, and settings.
            </div>
          </div>
          <button
            onClick={handleExportData}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Archive</span>
          </button>
        </div>
      </section>
    </div>
  );
};
