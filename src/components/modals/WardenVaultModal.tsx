/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Shield,
  Lock,
  Unlock,
  Download,
  Upload,
  Check,
  AlertCircle,
  FileText,
  Key,
  Eye,
  EyeOff,
  Sparkles,
  X,
  MessageSquare,
  User as UserIcon,
  BookOpen,
  Sliders,
  CheckCircle2,
  Copy,
  Share2
} from 'lucide-react';
import {
  wardenVaultService,
  VaultExportStats,
  VaultImportStats
} from '../../services/wardenVaultService';
import { CatPulsingLoader } from '../common/CatPulsingLoader';

interface WardenVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialMode?: 'export' | 'import';
  onVaultImported?: (stats: VaultImportStats) => void;
}

export const WardenVaultModal: React.FC<WardenVaultModalProps> = ({
  isOpen,
  onClose,
  userId,
  initialMode = 'export',
  onVaultImported
}) => {
  const [mode, setMode] = useState<'export' | 'import'>(initialMode);

  // Export State
  const [exportPassword, setExportPassword] = useState('');
  const [showExportPassword, setShowExportPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<VaultExportStats | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [exportedRaw, setExportedRaw] = useState<string | null>(null);
  const [exportedBlob, setExportedBlob] = useState<{ blob: Blob; filename: string } | null>(null);
  const [hasCopiedBackup, setHasCopiedBackup] = useState(false);

  // Import State
  const [isPasteMode, setIsPasteMode] = useState(false);
  const [pastedBackupText, setPastedBackupText] = useState('');
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [hasCustomPassword, setHasCustomPassword] = useState(false);
  const [importPassword, setImportPassword] = useState('');
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<VaultImportStats | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setExportPassword('');
      setExportSuccess(null);
      setSavedPath(null);
      setExportedRaw(null);
      setExportedBlob(null);
      setHasCopiedBackup(false);
      setIsPasteMode(false);
      setPastedBackupText('');
      setImportFileContent(null);
      setImportFileName('');
      setImportPassword('');
      setImportError(null);
      setImportSuccess(null);
    }
  }, [isOpen, initialMode]);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(null);
    setSavedPath(null);
    setExportError(null);
    try {
      const { blob, filename, stats, rawContent } = await wardenVaultService.exportVault(
        userId,
        exportPassword.trim() || undefined
      );
      setExportedRaw(rawContent);
      setExportedBlob({ blob, filename });
      const downloadRes = await wardenVaultService.downloadVaultFile(blob, filename, rawContent);
      if (downloadRes?.path) {
        setSavedPath(downloadRes.path);
      }
      setExportSuccess(stats);
    } catch (err: any) {
      setExportError(err?.message || 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyBackupText = async () => {
    if (!exportedRaw) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(exportedRaw);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = exportedRaw;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setHasCopiedBackup(true);
      setTimeout(() => setHasCopiedBackup(false), 2500);
    } catch (err) {
      console.error('Failed to copy backup text:', err);
    }
  };

  const handleShareAgain = async () => {
    if (!exportedBlob) return;
    await wardenVaultService.downloadVaultFile(
      exportedBlob.blob,
      exportedBlob.filename,
      exportedRaw || undefined
    );
  };

  const handlePastedTextChange = (text: string) => {
    setPastedBackupText(text);
    setImportError(null);
    setImportSuccess(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setImportFileContent(null);
      return;
    }
    const inspection = wardenVaultService.inspectVaultFile(trimmed);
    if (!inspection.isValid) {
      setImportError(inspection.error || 'Invalid backup text format.');
      setHasCustomPassword(false);
      setImportFileContent(null);
    } else {
      setImportFileContent(trimmed);
      setImportFileName('Pasted Backup Text');
      setHasCustomPassword(inspection.hasCustomPassword);
      setImportError(null);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      setImportFileContent(content);

      const inspection = wardenVaultService.inspectVaultFile(content);
      if (!inspection.isValid) {
        setImportError(inspection.error || 'Invalid .warden file format.');
        setHasCustomPassword(false);
      } else {
        setHasCustomPassword(inspection.hasCustomPassword);
        setImportError(null);
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFileContent) return;
    setIsDecrypting(true);
    setImportError(null);

    try {
      const res = await wardenVaultService.importVault(
        importFileContent,
        userId,
        importPassword.trim() || undefined
      );

      if (!res.success) {
        setImportError(res.error || 'Decryption failed.');
      } else {
        setImportSuccess(res.stats);
        if (onVaultImported) {
          onVaultImported(res.stats);
        }
      }
    } catch (err: any) {
      setImportError(err?.message || 'Failed to import vault.');
    } finally {
      setIsDecrypting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[#0e111a] border border-[#22283a] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-modal-pop"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Title and Mode Tabs */}
        <div className="p-4 sm:p-5 border-b border-[#1b2030] bg-[#121622] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                <span>Warden Encrypted Vault</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                  .warden
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                AES-GCM-256 encrypted local backup & merge
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector: Export / Import */}
        <div className="px-5 pt-3.5 bg-[#0e111a] flex gap-2 border-b border-[#181c2a]">
          <button
            type="button"
            onClick={() => {
              setMode('export');
              setImportError(null);
            }}
            className={`pb-2.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'export'
                ? 'text-purple-300 border-b-2 border-purple-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Vault (.warden)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('import');
              setExportSuccess(null);
            }}
            className={`pb-2.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              mode === 'import'
                ? 'text-purple-300 border-b-2 border-purple-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import & Merge (.warden)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-neutral-300">
          {/* ================= MODE: EXPORT ================= */}
          {mode === 'export' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#141824] border border-[#1e2334] space-y-2">
                <span className="font-bold text-white block text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>What is included in your .warden vault:</span>
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-neutral-300 pt-1">
                  <li className="flex items-center gap-1.5 bg-[#0d1018] p-2 rounded-lg border border-white/5">
                    <UserIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>All User Personas</span>
                  </li>
                  <li className="flex items-center gap-1.5 bg-[#0d1018] p-2 rounded-lg border border-white/5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>All Chats & History</span>
                  </li>
                  <li className="flex items-center gap-1.5 bg-[#0d1018] p-2 rounded-lg border border-white/5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Custom Rules & Prompts</span>
                  </li>
                  <li className="flex items-center gap-1.5 bg-[#0d1018] p-2 rounded-lg border border-white/5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Characters & Lorebooks</span>
                  </li>
                </ul>
              </div>

              {/* Security Guarantee Notice */}
              <div className="p-3 rounded-xl bg-purple-950/25 border border-purple-500/20 text-[11px] text-purple-200/90 leading-relaxed flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">Zero API Credential Exposure</strong>
                  <span>
                    Provider API keys are strictly excluded. The file is encrypted using 256-bit AES-GCM and PBKDF2 with 100,000 hash iterations.
                  </span>
                </div>
              </div>

              {/* Password Protection (Optional) */}
              <div className="space-y-1.5">
                <label className="text-neutral-300 font-semibold block text-[11px] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  <span>Vault Passphrase (Optional):</span>
                </label>
                <div className="relative">
                  <input
                    type={showExportPassword ? 'text' : 'password'}
                    placeholder="Leave blank for automatic secure vault encryption"
                    value={exportPassword}
                    onChange={e => setExportPassword(e.target.value)}
                    className="w-full bg-[#12151e] border border-[#222736] focus:border-purple-500 rounded-xl px-3 py-2.5 pr-10 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowExportPassword(!showExportPassword)}
                    className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
                  >
                    {showExportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500">
                  {exportPassword.trim()
                    ? '⚠️ Make sure you remember this passphrase to restore your vault on other devices.'
                    : 'If left blank, the vault is encrypted with the built-in app key for 1-click restore.'}
                </p>
              </div>

              {/* Error Notice */}
              {exportError && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{exportError}</span>
                </div>
              )}

              {/* Success Result Box */}
              {exportSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs space-y-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <strong className="block text-white font-bold">
                        {savedPath ? 'Vault Saved to Downloads!' : 'Vault Encrypted Successfully!'}
                      </strong>
                      <span className="text-[11px] text-emerald-300/80 block">
                        Exported {exportSuccess.personasCount} personas, {exportSuccess.conversationsCount} chats ({exportSuccess.messagesCount} messages), and {exportSuccess.rulesCount} custom rules.
                      </span>
                      {savedPath && (
                        <span className="text-[10px] text-purple-300 font-mono block mt-1.5 bg-[#0a0d14] px-2.5 py-1.5 rounded-lg border border-purple-500/30">
                          📁 Lokasi File: <strong>{savedPath}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleShareAgain}
                      className="px-3 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Save / Share File Again</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyBackupText}
                      className="px-3 py-2 rounded-xl bg-[#1b2234] hover:bg-[#252f47] border border-white/10 text-neutral-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                    >
                      {hasCopiedBackup ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Copied to Clipboard!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-purple-400" />
                          <span>Copy Backup Text</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[10px] text-neutral-400 leading-normal">
                    {savedPath ? (
                      <>
                        💡 <strong>Tersimpan Langsung:</strong> File backup otomatis tersimpan di folder <code>{savedPath}</code> pada memori perangkat Anda. Anda dapat membuka atau memindahkannya kapan saja melalui File Manager.
                      </>
                    ) : (
                      <>
                        💡 <strong>Android / Mobile note:</strong> Tap <em>Save / Share File Again</em> untuk memilih lokasi download (Downloads, Files by Google, Drive), atau copy teks backup untuk transfer cepat.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Export Action Button */}
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <CatPulsingLoader size="sm" label="Encrypting Vault..." glow={false} />
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Encrypt & Export .warden Vault</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* ================= MODE: IMPORT ================= */}
          {mode === 'import' && (
            <div className="space-y-4">
              {/* Import Method Toggle: File vs Text Paste */}
              <div className="flex bg-[#12151e] p-1 rounded-xl border border-[#202535]">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasteMode(false);
                    setImportError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    !isPasteMode
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>File (.warden)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPasteMode(true);
                    setImportError(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isPasteMode
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Paste Backup Text</span>
                </button>
              </div>

              {!isPasteMode ? (
                /* File Selector */
                <div className="space-y-1.5">
                  <label className="text-neutral-300 font-semibold block text-[11px] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Select Encrypted .warden Vault File:</span>
                  </label>
                  <label className="w-full p-4 border-2 border-dashed border-[#262c3e] hover:border-purple-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer bg-[#12151e]/50 hover:bg-[#141824] transition-all">
                    <Upload className="w-6 h-6 text-purple-400" />
                    <span className="text-xs font-bold text-white">
                      {importFileName || 'Click to browse or drop .warden file'}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Supported: .warden vault backups
                    </span>
                    <input
                      type="file"
                      accept=".warden,application/octet-stream,application/json,text/plain"
                      className="hidden"
                      onChange={handleFileSelected}
                    />
                  </label>
                </div>
              ) : (
                /* Paste Text Input */
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-neutral-300 font-semibold block text-[11px] flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5 text-purple-400" />
                      <span>Paste Encrypted Backup Text:</span>
                    </label>
                    {pastedBackupText && (
                      <button
                        type="button"
                        onClick={() => handlePastedTextChange('')}
                        className="text-[10px] text-neutral-400 hover:text-rose-400 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={pastedBackupText}
                    onChange={e => handlePastedTextChange(e.target.value)}
                    placeholder='Paste the entire encrypted backup text here (starts with {"magic":"WARDEN_ENCRYPTED_VAULT"...)...'
                    className="w-full bg-[#12151e] border border-[#222736] focus:border-purple-500 rounded-xl p-3 text-[11px] font-mono text-white placeholder-neutral-500 outline-none transition-colors resize-none"
                  />
                  {importFileContent && isPasteMode && (
                    <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Valid backup payload recognized.</span>
                    </p>
                  )}
                </div>
              )}

              {/* Merge Guarantee Notice */}
              <div className="p-3 rounded-xl bg-[#141824] border border-[#1e2334] text-[11px] text-neutral-300 leading-relaxed flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block mb-0.5">Safe Non-Destructive Merge:</strong>
                  <span>
                    Importing will <strong>ADD</strong> all personas, conversation history, and custom prompt rules into your account. Existing personas and chats will <strong>NEVER be deleted</strong>.
                  </span>
                </div>
              </div>

              {/* Password Requirement for Decryption */}
              {hasCustomPassword && (
                <div className="space-y-1.5 p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30">
                  <label className="text-purple-300 font-semibold block text-[11px] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-purple-400" />
                    <span>Enter Vault Decryption Password:</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showImportPassword ? 'text' : 'password'}
                      placeholder="Enter passphrase used when exporting"
                      value={importPassword}
                      onChange={e => setImportPassword(e.target.value)}
                      className="w-full bg-[#0c0e14] border border-purple-500/40 focus:border-purple-400 rounded-xl px-3 py-2.5 pr-10 text-xs text-white placeholder-neutral-500 outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowImportPassword(!showImportPassword)}
                      className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
                    >
                      {showImportPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {importError && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Success Result Box */}
              {importSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <strong className="text-white text-sm">Vault Successfully Restored & Merged!</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-emerald-200/90 pt-1">
                    <div>• <strong>+{importSuccess.personasAdded}</strong> Personas added</div>
                    <div>• <strong>+{importSuccess.conversationsAdded}</strong> Chats added</div>
                    <div>• <strong>+{importSuccess.messagesAdded}</strong> Messages restored</div>
                    <div>• <strong>+{importSuccess.rulesAdded}</strong> Custom Rules added</div>
                  </div>
                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        window.location.reload();
                      }}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md"
                    >
                      Reload to Refresh Library
                    </button>
                  </div>
                </div>
              )}

              {/* Decrypt & Import Button */}
              {!importSuccess && (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!importFileContent || isDecrypting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                >
                  {isDecrypting ? (
                    <CatPulsingLoader size="sm" label="Decrypting & Merging Vault..." glow={false} />
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Decrypt & Merge .warden Vault</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

