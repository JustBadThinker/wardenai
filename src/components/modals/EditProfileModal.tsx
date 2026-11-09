/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Check,
  User as UserIcon,
  Image as ImageIcon
} from 'lucide-react';
import { User } from '../../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSave: (updates: Partial<User>) => void;
}

const AVATAR_PRESETS = [
  { name: 'Warden Cat (New)', url: '/warden-cat-logo.png' },
  { name: 'Glowing Cat Mascot', url: '/glowing-cat-icon.png' },
  { name: 'Astra (Original)', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80' },
  { name: 'Cyberpunk Noir', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80' },
  { name: 'Mystic Rogue', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80' },
  { name: 'Neon Storyteller', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80' }
];

const BANNER_PRESETS = [
  { name: 'Dark Fantasy Castle', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Ambient Violet', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Cyberpunk Rain', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80' },
  { name: 'Neon Metropolis', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop&q=80' }
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave
}) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [bannerUrl, setBannerUrl] = useState(user.bannerUrl || '');
  const [tab, setTab] = useState<'avatar' | 'banner' | 'details'>('avatar');

  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBannerUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      displayName: displayName.trim() || 'User',
      username: username.trim().toLowerCase().replace(/^@+/, '') || 'user',
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim() || user.avatarUrl,
      bannerUrl: bannerUrl.trim() || user.bannerUrl
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0e111a] border border-[#222838] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1c2232] flex items-center justify-between bg-[#121622]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">Edit Profile & Appearance</h2>
              <p className="text-[11px] text-neutral-400">Customize your avatar, banner image, and profile details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#1c2232] bg-[#0c0f17] px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('avatar')}
            className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
              tab === 'avatar'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Profile Picture
          </button>
          <button
            type="button"
            onClick={() => setTab('banner')}
            className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
              tab === 'banner'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Header Banner
          </button>
          <button
            type="button"
            onClick={() => setTab('details')}
            className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
              tab === 'details'
                ? 'border-purple-500 text-purple-300'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            Name & Bio
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === 'avatar' && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="flex items-center gap-4 p-3.5 rounded-xl bg-[#141824] border border-[#23293d]">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-black ring-2 ring-purple-500/50 shrink-0">
                  <img
                    src={avatarUrl || user.avatarUrl}
                    alt="Avatar Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">Avatar Live Preview</p>
                  <p className="text-[11px] text-neutral-400">
                    Upload a local image or choose the new Warden Cat mascot below.
                  </p>
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-purple-900/30 active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload from Device</span>
                  </button>
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Avatar Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Choose from Quick Presets</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVATAR_PRESETS.map(preset => {
                    const isSelected = avatarUrl === preset.url;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-900/30 border-purple-500 ring-1 ring-purple-500'
                            : 'bg-[#131722] border-[#222838] hover:border-purple-500/40'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-white/10">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-200 truncate">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom URL Input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-neutral-300">
                  Or Paste Custom Image URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs bg-[#121622] border border-[#222838] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {tab === 'banner' && (
            <div className="space-y-4">
              {/* Banner Preview */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-white">Banner Live Preview</p>
                <div className="relative h-32 w-full rounded-xl overflow-hidden bg-black border border-[#23293d]">
                  <img
                    src={bannerUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200'}
                    alt="Banner Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Banner Image</span>
                  </button>
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleBannerFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Banner Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Choose Preset Banners</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {BANNER_PRESETS.map(preset => {
                    const isSelected = bannerUrl === preset.url;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setBannerUrl(preset.url)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-900/30 border-purple-500 ring-1 ring-purple-500'
                            : 'bg-[#131722] border-[#222838] hover:border-purple-500/40'
                        }`}
                      >
                        <div className="w-10 h-7 rounded overflow-hidden bg-neutral-900 shrink-0 border border-white/10">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-[11px] font-medium text-neutral-200 truncate">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Banner URL */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-neutral-300">
                  Or Paste Custom Banner URL
                </label>
                <input
                  type="url"
                  value={bannerUrl}
                  onChange={e => setBannerUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-xs bg-[#121622] border border-[#222838] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {tab === 'details' && (
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your Name or Persona"
                  className="w-full px-3 py-2 text-xs bg-[#121622] border border-[#222838] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300">
                  Username / Handle
                </label>
                <div className="flex items-center bg-[#121622] border border-[#222838] rounded-xl px-3 text-xs focus-within:border-purple-500">
                  <span className="text-neutral-500 select-none">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="handle"
                    className="w-full py-2 pl-1 bg-transparent text-white placeholder-neutral-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-300">
                  Bio / Storyteller Notes
                </label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="A few words about your roleplay interests and character ideas..."
                  className="w-full px-3 py-2 text-xs bg-[#121622] border border-[#222838] rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-[#1c2232] bg-[#121622] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};
