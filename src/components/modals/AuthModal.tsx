/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { firebaseAuthService, DEMO_ACCOUNTS } from '../../services/firebaseAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsLoading(true);

    try {
      if (isResetMode) {
        await firebaseAuthService.sendPasswordReset(email);
        setStatusMessage({
          text: 'If an account exists for this email, password reset instructions have been dispatched.',
          isError: false
        });
      } else if (isRegister) {
        if (!username.trim()) {
          setStatusMessage({ text: 'Please enter a username.', isError: true });
          setIsLoading(false);
          return;
        }
        const user = await firebaseAuthService.register(email, password, username);
        onSuccess(user);
        onClose();
      } else {
        const user = await firebaseAuthService.signInWithEmail(email, password);
        onSuccess(user);
        onClose();
      }
    } catch (err: unknown) {
      setStatusMessage({ text: (err as Error).message, isError: true });
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const user = await firebaseAuthService.signInWithGoogle();
      onSuccess(user);
      onClose();
    } catch (e: unknown) {
      setStatusMessage({ text: (e as Error).message, isError: true });
    }
    setIsLoading(false);
  };

  const handleSelectDemo = (role: UserRole) => {
    const user = firebaseAuthService.switchDemoAccount(role);
    onSuccess(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-5 z-10 shadow-2xl animate-modal-pop">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
              W
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">
                {isResetMode
                  ? 'Password Recovery'
                  : isRegister
                  ? 'Join Warden AI'
                  : 'Sign in to Warden AI'}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {isResetMode
                  ? 'Enter your verified account email'
                  : isRegister
                  ? 'Create your roleplay creator account'
                  : 'Continue your character conversations'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Continue with Google Button */}
        {!isResetMode && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-neutral-800" />
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-mono">
                or with email
              </span>
              <div className="flex-1 h-px bg-neutral-800" />
            </div>
          </div>
        )}

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="roleplay_creator"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                placeholder="creator@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {!isResetMode && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300">Password</label>
                <button
                  type="button"
                  onClick={() => setIsResetMode(true)}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-neutral-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-neutral-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                statusMessage.isError
                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {statusMessage.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 disabled:opacity-40 cursor-pointer active:scale-98"
          >
            {isLoading
              ? 'Authenticating...'
              : isResetMode
              ? 'Send Reset Token'
              : isRegister
              ? 'Create Free Account'
              : 'Sign In'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="text-center text-xs text-neutral-400 pt-1">
          {isResetMode ? (
            <button
              onClick={() => setIsResetMode(false)}
              className="text-indigo-400 hover:underline font-semibold"
            >
              Back to Sign In
            </button>
          ) : isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                onClick={() => setIsRegister(false)}
                className="text-indigo-400 hover:underline font-semibold"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                onClick={() => setIsRegister(true)}
                className="text-indigo-400 hover:underline font-semibold"
              >
                Sign Up
              </button>
            </span>
          )}
        </div>

        {/* Instant Demo Role Switcher */}
        <div className="pt-3 border-t border-neutral-800/80 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block">
            Instant Test Accounts (1-Click Login):
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSelectDemo('user')}
              className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-left cursor-pointer group"
            >
              <div className="text-[11px] font-semibold text-white group-hover:text-indigo-400">Ren (Creator)</div>
              <div className="text-[9px] text-neutral-500 font-mono">Regular User</div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectDemo('moderator')}
              className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-left cursor-pointer group"
            >
              <div className="text-[11px] font-semibold text-white group-hover:text-amber-400">Marcus (Mod)</div>
              <div className="text-[9px] text-neutral-500 font-mono">Moderator</div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectDemo('admin')}
              className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-left cursor-pointer group"
            >
              <div className="text-[11px] font-semibold text-white group-hover:text-rose-400">Elena (Admin)</div>
              <div className="text-[9px] text-neutral-500 font-mono">Administrator</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
