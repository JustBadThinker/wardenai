/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User as UserIcon,
  Calendar,
  Users,
  Layers,
  Heart,
  MessageSquare,
  Edit3,
  Bookmark,
  Share2,
  Check,
  PlusCircle,
  Lock,
  FileDown,
  Camera
} from 'lucide-react';
import { Character, User } from '../types';
import { CharacterCard } from '../components/character/CharacterCard';
import { RichTextRenderer } from '../components/common/RichTextRenderer';
import { downloadJanitorMarkdown } from '../utils/janitorExport';
import { EditProfileModal } from '../components/modals/EditProfileModal';

interface UserProfileViewProps {
  user: User;
  characters: Character[];
  currentUser: User;
  isFollowing: boolean;
  onToggleFollow: (userId: string) => void;
  onSelectCharacter: (char: Character) => void;
  onStartChat: (char: Character) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onToggleLike: (id: string) => void;
  onUpdateBio?: (newBio: string) => void;
  onUpdateProfile?: (updates: Partial<User>) => void;
  onCreateCharacter?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  user,
  characters,
  currentUser,
  isFollowing,
  onToggleFollow,
  onSelectCharacter,
  onStartChat,
  isBookmarked,
  onToggleBookmark,
  onToggleLike,
  onUpdateBio,
  onUpdateProfile,
  onCreateCharacter
}) => {
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(user.bio);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isOwner = currentUser.id === user.id;

  // Strict privacy filter: only public, published characters are visible on public profiles!
  // If owner, include private/draft characters so creator can test them!
  const userCharacters = characters.filter(
    c =>
      (c.creatorId === user.id ||
        c.creatorUsername?.toLowerCase() === user.username?.toLowerCase() ||
        c.creatorUsername?.toLowerCase() === user.displayName?.toLowerCase()) &&
      (isOwner ? true : c.publicationStatus === 'published' && c.visibility === 'public')
  );

  const handleSaveBio = () => {
    if (onUpdateBio) {
      onUpdateBio(bioText);
    }
    setIsEditingBio(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto pb-16 px-4 sm:px-6 space-y-6">
      {/* Banner & Profile Info */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900">
        <div className="h-44 sm:h-56 w-full relative bg-neutral-950 group">
          <img
            src={user.bannerUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200'}
            alt="Banner"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />
          {isOwner && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95 z-10"
              title="Change banner background"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Change Banner</span>
            </button>
          )}
        </div>

        <div className="relative px-5 pb-5 -mt-14 sm:-mt-16 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="relative group shrink-0">
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                referrerPolicy="no-referrer"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-neutral-900 shadow-xl bg-neutral-950"
              />
              {isOwner && (
                <>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-bold transition-opacity cursor-pointer backdrop-blur-[2px]"
                    title="Change profile avatar"
                  >
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span>Change</span>
                  </button>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="absolute -bottom-1 -right-1 sm:hidden p-1.5 rounded-full bg-purple-600 border-2 border-neutral-900 text-white shadow-lg cursor-pointer"
                    title="Change profile avatar"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {user.displayName}
                </h1>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  {user.role}
                </span>
              </div>
              <div className="text-xs text-neutral-400 font-mono">
                @{user.username}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-neutral-300 pt-1">
                <span>
                  <strong className="text-white">{user.followerCount}</strong> followers
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-white">{user.followingCount}</strong> following
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <strong className="text-white">{userCharacters.length}</strong> creations
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#181d2a] hover:bg-[#202738] border border-purple-500/30 text-purple-300 hover:text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                <span>Edit Profile</span>
              </button>
            )}

            {isOwner && onCreateCharacter && (
              <button
                onClick={onCreateCharacter}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Character</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              title="Share Profile"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {!isOwner && (
              <button
                onClick={() => onToggleFollow(user.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm ${
                  isFollowing
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow Creator'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Biography Card */}
      <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            About Creator
          </span>
          {isOwner && !isEditingBio && (
            <button
              onClick={() => setIsEditingBio(true)}
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit Bio</span>
            </button>
          )}
        </div>

        {isEditingBio ? (
          <div className="space-y-2">
            <textarea
              rows={3}
              value={bioText}
              onChange={e => setBioText(e.target.value)}
              className="w-full p-3 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-white"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsEditingBio(false)}
                className="px-3 py-1 bg-neutral-800 text-neutral-300 text-xs rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBio}
                className="px-3 py-1 bg-indigo-600 text-white text-xs rounded font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="text-xs text-neutral-200 leading-relaxed">
            {user.bio ? (
              <RichTextRenderer content={user.bio} />
            ) : (
              <p>This creator prefers to let their characters speak for themselves.</p>
            )}
          </div>
        )}
      </div>

      {/* Public / Created Character Gallery */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>{isOwner ? 'My Characters' : 'Public Characters'} ({userCharacters.length})</span>
          </h2>

          {isOwner && onCreateCharacter && (
            <button
              onClick={onCreateCharacter}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Character</span>
            </button>
          )}
        </div>

        {userCharacters.length === 0 ? (
          <div className="py-12 text-center bg-neutral-900/30 border border-neutral-800 rounded-2xl p-6 text-xs text-neutral-400 space-y-3">
            <p>No characters created yet.</p>
            {isOwner && onCreateCharacter && (
              <button
                onClick={onCreateCharacter}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Your First Character</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {userCharacters.map(char => (
              <div key={char.id} className="relative group">
                <CharacterCard
                  character={char}
                  variant="grid"
                  onSelect={onSelectCharacter}
                  onStartChat={onStartChat}
                  isBookmarked={isBookmarked(char.id)}
                  onToggleBookmark={onToggleBookmark}
                  onToggleLike={onToggleLike}
                  blurNsfw={currentUser.blurNsfw}
                />
                {isOwner && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      downloadJanitorMarkdown(char);
                    }}
                    className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/80 hover:bg-purple-600/90 text-[10px] text-white font-bold flex items-center gap-1 backdrop-blur-md z-10 border border-white/15 transition-colors cursor-pointer shadow-md"
                    title="Export character as Janitor AI Markdown (.md)"
                  >
                    <FileDown className="w-3 h-3" />
                    <span>.MD</span>
                  </button>
                )}
                {isOwner && char.visibility === 'private' && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-amber-300 font-bold flex items-center gap-1 backdrop-blur-sm pointer-events-none z-10 border border-amber-500/40">
                    <Lock className="w-3 h-3" />
                    <span>Private</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile & Avatar Modal */}
      {isOwner && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={user}
          onSave={(updates) => {
            if (onUpdateProfile) {
              onUpdateProfile(updates);
            }
          }}
        />
      )}
    </div>
  );
};
