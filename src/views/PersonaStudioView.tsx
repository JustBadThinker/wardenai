/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Star,
  Check,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  BookOpen,
  Upload,
  Download
} from 'lucide-react';
import { Persona, User } from '../types';

interface PersonaStudioViewProps {
  personas: Persona[];
  currentUser: User;
  onSavePersona: (persona: Persona) => void;
  onDeletePersona: (id: string) => void;
  onSetDefaultPersona: (id: string) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'
];

export const PersonaStudioView: React.FC<PersonaStudioViewProps> = ({
  personas,
  currentUser,
  onSavePersona,
  onDeletePersona,
  onSetDefaultPersona
}) => {
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Simplified Form Fields: Name, Pronouns/Title, Avatar, and 1 Unified Long Text
  const [name, setName] = useState('');
  const [genderPronouns, setGenderPronouns] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [personaDetails, setPersonaDetails] = useState('');

  // Expandable context preview in cards
  const [expandedPersonaIds, setExpandedPersonaIds] = useState<Record<string, boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  /**
   * Compresses & resizes uploaded mobile photos to a crisp 256x256 JPEG (~15-25KB)
   * so mobile camera/gallery uploads never exceed the browser's 5MB localStorage quota!
   */
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => {
        const rawDataUrl = String(reader.result || '');
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 256;
            let width = img.width || MAX_SIZE;
            let height = img.height || MAX_SIZE;
            if (width > height) {
              if (width > MAX_SIZE) {
                height = Math.round((height * MAX_SIZE) / width);
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width = Math.round((width * MAX_SIZE) / height);
                height = MAX_SIZE;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressed = canvas.toDataURL('image/jpeg', 0.82);
              resolve(compressed);
              return;
            }
          } catch {
            // fallback
          }
          resolve(rawDataUrl);
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
      };
      reader.onerror = () => resolve(AVATAR_PRESETS[0]);
      reader.readAsDataURL(file);
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedPersonaIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingPersona(null);
    setName('');
    setGenderPronouns('He/Him');
    setAvatarUrl(AVATAR_PRESETS[0]);
    setPersonaDetails('');
  };

  const handleStartEdit = (p: Persona) => {
    setEditingPersona(p);
    setIsCreating(false);
    setName(p.name);
    setGenderPronouns(p.genderPronouns || '');
    setAvatarUrl(p.avatarUrl);
    // Merge all existing fields into one unified details text
    const unified =
      p.roleInstructions ||
      [p.appearance, p.personality, p.background, p.shortDescription]
        .filter(Boolean)
        .join('\n\n') ||
      '';
    setPersonaDetails(unified);
  };

  const handleSave = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setSaveError(null);

    const finalName = name.trim();
    if (!finalName) {
      setSaveError('Please enter a Persona Name before saving.');
      return;
    }

    const trimmedDetails = personaDetails.trim();
    // Derive a clean, concise short description from the first sentence or first 120 chars
    const firstLine = trimmedDetails.split('\n')[0] || '';
    const cleanShortDesc =
      firstLine.length > 130 ? firstLine.slice(0, 127) + '...' : firstLine || 'Custom user roleplay persona.';

    const personaToSave: Persona = {
      id: editingPersona?.id || 'per_' + Date.now().toString(36),
      userId: currentUser.id,
      name: finalName,
      avatarUrl: avatarUrl.trim() || AVATAR_PRESETS[0],
      genderPronouns: genderPronouns.trim(),
      shortDescription: cleanShortDesc,
      // Store the comprehensive character prompt so AI prompts receive all context
      roleInstructions: trimmedDetails,
      appearance: trimmedDetails,
      personality: trimmedDetails,
      background: trimmedDetails,
      isDefault: editingPersona ? editingPersona.isDefault : personas.length === 0,
      createdAt: editingPersona?.createdAt || new Date().toISOString()
    };

    try {
      onSavePersona(personaToSave);
      setIsCreating(false);
      setEditingPersona(null);
    } catch (err: any) {
      console.error('Failed to save persona:', err);
      setSaveError(err?.message || 'Could not save persona to device storage.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 px-4 sm:px-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b1e28] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-purple-400" />
            <span>Persona Studio</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Create your roleplay identities, appearance, and backstory. AI bots will perceive and address you based on your active persona.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <label className="px-3.5 py-2 bg-[#141824] hover:bg-[#1b2030] border border-purple-500/30 text-purple-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95">
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            <span>Import Local File</span>
            <input
              type="file"
              accept=".json,.md,.txt,image/*"
              className="hidden"
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.type.startsWith('image/')) {
                  const compressed = await compressImageFile(file);
                  setIsCreating(true);
                  setEditingPersona(null);
                  setName(file.name.replace(/\.[^.]+$/, ''));
                  setGenderPronouns('They/Them');
                  setAvatarUrl(compressed);
                  setPersonaDetails('');
                } else {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const raw = String(reader.result || '');
                    try {
                      const parsed = JSON.parse(raw);
                      setIsCreating(true);
                      setEditingPersona(null);
                      setName(parsed.name || file.name.replace(/\.[^.]+$/, ''));
                      setGenderPronouns(parsed.genderPronouns || parsed.pronouns || '');
                      setAvatarUrl(parsed.avatarUrl || parsed.avatar || AVATAR_PRESETS[0]);
                      setPersonaDetails(
                        parsed.roleInstructions ||
                          parsed.description ||
                          parsed.personality ||
                          parsed.background ||
                          ''
                      );
                    } catch {
                      setIsCreating(true);
                      setEditingPersona(null);
                      setName(file.name.replace(/\.[^.]+$/, ''));
                      setGenderPronouns('');
                      setAvatarUrl(AVATAR_PRESETS[0]);
                      setPersonaDetails(raw);
                    }
                  };
                  reader.readAsText(file);
                }
                e.target.value = '';
              }}
            />
          </label>

          <button
            onClick={handleStartCreate}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-purple-600/30 hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Persona</span>
          </button>
        </div>
      </div>

      {/* ── Simplified Persona Editor Form (1 Unified Long Text) ── */}
      {(isCreating || editingPersona) && (
        <div className="p-5 sm:p-6 bg-[#12151e] border border-[#222736] rounded-2xl space-y-5 animate-scale-in shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#1b1e28] pb-3.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-white">
                {editingPersona ? `Edit Persona: ${editingPersona.name}` : 'Create Persona'}
              </h2>
            </div>
            <button
              onClick={() => {
                setIsCreating(false);
                setEditingPersona(null);
              }}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-[#1a1f2e] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Row 1: Name & Pronouns/Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Persona Name <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rei Kurose, Vesper, Jack..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#0c0e14] border border-[#1b1e28] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Pronouns or Title <span className="text-neutral-500 text-[11px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. he/him • 24yo quiet Japanese man"
                  value={genderPronouns}
                  onChange={e => setGenderPronouns(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-[#0c0e14] border border-[#1b1e28] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* Row 2: Avatar URL + Local Device Upload + Quick Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300">Avatar Portrait</label>
                <label className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Upload className="w-3 h-3 text-purple-400" />
                  <span>Upload from Device</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const compressed = await compressImageFile(file);
                      setAvatarUrl(compressed);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <label
                    className="relative group cursor-pointer shrink-0"
                    title="Click to upload avatar from local device"
                  >
                    <img
                      src={avatarUrl}
                      alt="Avatar Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-purple-500/40 bg-[#0c0e14] shadow-sm group-hover:opacity-75 transition-opacity"
                      onError={e => {
                        (e.target as HTMLImageElement).src = AVATAR_PRESETS[0];
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-xl">
                      <Upload className="w-4 h-4 text-white" />
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const compressed = await compressImageFile(file);
                        setAvatarUrl(compressed);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <input
                    type="text"
                    placeholder="Paste image URL (https://...) or upload from device"
                    value={avatarUrl}
                    onChange={e => setAvatarUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-[#0c0e14] border border-[#1b1e28] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors font-mono"
                  />
                </div>

                {/* Quick Avatar Presets */}
                <div className="flex items-center gap-1.5 pt-1 sm:pt-0">
                  <span className="text-[11px] text-neutral-500 hidden sm:inline">Presets:</span>
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(preset)}
                      className={`w-7 h-7 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                        avatarUrl === preset ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-[#1b1e28] hover:border-neutral-500'
                      }`}
                    >
                      <img src={preset} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 3: 1 UNIFIED COMPREHENSIVE TEXTAREA */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  <span>Persona Details, Appearance, Personality & Backstory</span>
                </label>
                <span className="text-[10px] text-purple-400 font-mono">1 unified prompt</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-tight">
                Put everything about your character here in one place. Include their visual appearance, personality traits, speech mannerisms, backstory, and instructions for how the AI characters should perceive or interact with you.
              </p>
              <textarea
                rows={9}
                placeholder={`Example:
Rei Kurose (黒瀬 怜) is a 24-year-old Japanese man with a quiet, understated appearance. Standing at 175 cm tall, he has a slender build, faded violet hair, and silver piercings. He wears oversized hoodies and dark trousers.

He speaks in a low, gentle voice and rarely raises his volume. Observant and patient, he can hold normal conversations without revealing much about himself. Due to childhood neglect and financial hardship, he struggles to distinguish genuine kindness from transactional relationships and keeps his true emotions carefully guarded.

Instructions for AI: Characters should notice his tired, grayish-violet eyes and calm yet guarded demeanor. They may try to draw him out or notice his hesitation when asked personal questions.`}
                value={personaDetails}
                onChange={e => setPersonaDetails(e.target.value)}
                className="w-full p-3.5 text-xs bg-[#0c0e14] border border-[#1b1e28] rounded-xl text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-purple-500 transition-colors leading-relaxed font-sans"
              />
            </div>

            {saveError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
                {saveError}
              </div>
            )}

            {/* Form Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b1e28]">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingPersona(null);
                  setSaveError(null);
                }}
                className="px-4 py-2 bg-[#181c28] hover:bg-[#202536] text-neutral-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSave}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/30 cursor-pointer"
              >
                Save Persona
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Personas Grid with Clean, Clamped Preview ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {personas.map(p => {
          const isExpanded = Boolean(expandedPersonaIds[p.id]);
          const promptText = p.roleInstructions || p.appearance || p.personality || p.background || '';
          const isLong = promptText.length > 180;

          return (
            <div
              key={p.id}
              className={`p-5 rounded-2xl border transition-all duration-200 space-y-3.5 bg-[#12151e] hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-950/20 ${
                p.isDefault
                  ? 'border-purple-500/50 ring-1 ring-purple-500/20 bg-[#141824]'
                  : 'border-[#1b1e28] hover:border-[#2a3044]'
              }`}
            >
              {/* Card Top: Avatar, Name, Pronouns & Action Buttons */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={p.avatarUrl}
                    alt={p.name}
                    className="w-12 h-12 rounded-xl object-cover border border-purple-500/30 shrink-0 bg-[#0c0e14]"
                    onError={e => {
                      (e.target as HTMLImageElement).src = AVATAR_PRESETS[0];
                    }}
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
                      <span className="truncate">{p.name}</span>
                      {p.isDefault && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30 shrink-0">
                          Active
                        </span>
                      )}
                    </h3>
                    <div className="text-[11px] text-purple-400 font-medium truncate mt-0.5">
                      {p.genderPronouns || 'Roleplay Identity'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onSetDefaultPersona(p.id)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      p.isDefault
                        ? 'text-amber-400 bg-amber-400/10'
                        : 'text-neutral-500 hover:text-amber-400 hover:bg-[#181c28]'
                    }`}
                    title={p.isDefault ? 'Active Default Persona' : 'Set as Active Default'}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(p, null, 2)], {
                        type: 'application/json'
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-persona.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="p-1.5 text-neutral-400 hover:text-purple-300 rounded-lg hover:bg-[#181c28] transition-colors cursor-pointer"
                    title="Export Persona (.json)"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleStartEdit(p)}
                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-[#181c28] transition-colors cursor-pointer"
                    title="Edit Persona"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {personas.length > 1 && (
                    <button
                      onClick={() => onDeletePersona(p.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-[#181c28] transition-colors cursor-pointer"
                      title="Delete Persona"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Persona Context Preview (Clean, Short & Clamped — Fixes Image 2) */}
              {promptText && (
                <div className="p-3 bg-[#0c0e14] rounded-xl border border-[#1b1e28] text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="font-semibold text-purple-300 flex items-center gap-1 text-[10px] uppercase tracking-wider">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Persona Context</span>
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {promptText.length} chars
                    </span>
                  </div>

                  <p
                    className={`text-neutral-300 leading-relaxed ${
                      isExpanded ? 'whitespace-pre-line' : 'line-clamp-3'
                    }`}
                  >
                    {promptText}
                  </p>

                  {isLong && (
                    <button
                      onClick={() => toggleExpand(p.id)}
                      className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 pt-0.5 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <span>Collapse preview</span>
                          <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <span>Show full context</span>
                          <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
