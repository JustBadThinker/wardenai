/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Heart,
  Bookmark,
  Play,
  CheckCircle2,
  ShieldAlert,
  Download,
  Sparkles,
  Coins
} from 'lucide-react';
import { CommunityCharacter } from '../../services/communityCatalogService';
import { cleanCreatorHandle } from '../../services/aiProviderService';
import { getHighResImageUrl, getFallbackImageUrl, isDefaultPlaceholderAvatar } from '../../utils/imageUtils';

interface CommunityCharacterCardProps {
  character: CommunityCharacter;
  onSelect: (character: CommunityCharacter) => void;
  onStartChat: (character: CommunityCharacter) => void;
  onImport: (character: CommunityCharacter) => void;
  isBookmarked: boolean;
  onToggleBookmark: (characterId: string) => void;
  blurNsfw: boolean;
  onTagClick?: (tagId: string, tagName: string) => void;
  isFollowingCreator?: boolean;
  onToggleFollowCreator?: (creatorName: string, avatarUrl?: string) => void;
  onCreatorClick?: (creatorName: string) => void;
}

export const CommunityCharacterCard: React.FC<CommunityCharacterCardProps> = ({
  character,
  onSelect,
  onStartChat,
  onImport,
  isBookmarked,
  onToggleBookmark,
  blurNsfw,
  onTagClick,
  isFollowingCreator,
  onToggleFollowCreator,
  onCreatorClick
}) => {
  const isPlaceholder = isDefaultPlaceholderAvatar(character.avatarUrl);
  const [imgSrc, setImgSrc] = useState(
    isPlaceholder ? '' : getHighResImageUrl(character.avatarUrl || '')
  );
  const [imgError, setImgError] = useState(isPlaceholder);
  const [revealed, setRevealed] = useState(false);
  const shouldBlur = character.isNsfw && blurNsfw && !revealed;

  useEffect(() => {
    const isPh = isDefaultPlaceholderAvatar(character.avatarUrl);
    if (isPh) {
      setImgSrc('');
      setImgError(true);
    } else {
      setImgSrc(getHighResImageUrl(character.avatarUrl || ''));
      setImgError(false);
    }
  }, [character.avatarUrl]);

  const handleImgError = () => {
    const fallback = getFallbackImageUrl(imgSrc);
    if (fallback && fallback !== imgSrc) {
      setImgSrc(fallback);
    } else {
      setImgError(true);
    }
  };

  const formatCount = (num: number) => {
    if (!num) return '0';
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  const displayTags = character.tags.slice(0, 4);
  const remainingTagCount = character.tags.length - displayTags.length;

  return (
    <div
      onClick={() => onSelect(character)}
      className="group relative bg-[#12151e] hover:bg-[#151924] border border-[#1b1e28] hover:border-purple-500/40 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 active:scale-[0.97] flex flex-col shadow-md hover:shadow-2xl hover:shadow-purple-950/40 transform-gpu animate-card-enter"
    >
      {/* Artwork Banner with Badges & Action Buttons */}
      <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#0c0e14]">
        {!imgError && imgSrc ? (
          <img
            src={imgSrc}
            alt={character.name}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03] ${
              shouldBlur ? 'blur-xl scale-110' : ''
            }`}
            loading="lazy"
            decoding="async"
            onError={handleImgError}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-950/60 via-[#12151e] to-black flex flex-col items-center justify-center p-4">
            <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mb-1">
              <span className="text-2xl font-bold text-purple-300">
                {character.name.charAt(0)}
              </span>
            </div>
            <span className="text-xs text-neutral-400 font-medium truncate max-w-[150px]">
              {character.name}
            </span>
          </div>
        )}

        {/* Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12151e] via-transparent to-black/40 pointer-events-none" />

        {/* Top Badges Row */}
        <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5">
          {character.isNsfw ? (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-600 text-white tracking-wide shadow-sm border border-rose-400/30">
              18+
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-600 text-white tracking-wide shadow-sm border border-emerald-400/30">
              SFW
            </span>
          )}

          {character.totalTokens > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-black/80 text-purple-300 border border-purple-500/40 flex items-center gap-1 shadow-sm">
              <Coins className="w-2.5 h-2.5" />
              <span>{formatCount(character.totalTokens)}</span>
            </span>
          )}
        </div>

        {/* Bookmark glass button */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onToggleBookmark(character.id);
          }}
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-neutral-300 hover:text-white transition-all border border-white/15"
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark character'}
        >
          <Bookmark
            className={`w-4 h-4 transition-transform group-active:scale-90 ${
              isBookmarked ? 'fill-purple-400 text-purple-400' : ''
            }`}
          />
        </button>

        {/* Blur reveal overlay if sensitive */}
        {shouldBlur && (
          <div
            onClick={e => {
              e.stopPropagation();
              setRevealed(true);
            }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md z-10 p-4 text-center"
          >
            <ShieldAlert className="w-6 h-6 text-rose-400 mb-1" />
            <span className="text-xs font-semibold text-white">Sensitive Character Art</span>
            <span className="text-[10px] text-purple-300 underline mt-0.5 cursor-pointer">
              Click to reveal preview
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3 min-w-0">
        <div className="min-w-0">
          {/* Character Name */}
          <h3 className="text-xs sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors truncate">
            {character.name}
          </h3>

          {/* Subtitle / Role */}
          {character.chatName && character.chatName !== character.name && (
            <p className="text-[10px] sm:text-xs text-purple-400/90 font-medium truncate mt-0.5">
              {character.chatName}
            </p>
          )}

          {/* Creator Attribution with Verified Check & Quick Follow */}
          <div className="flex items-center justify-between gap-1.5 text-[10px] sm:text-xs text-neutral-400 mt-1">
            <div
              onClick={e => {
                if (onCreatorClick) {
                  e.stopPropagation();
                  onCreatorClick(character.creatorName);
                }
              }}
              className="flex items-center gap-1 min-w-0 hover:text-purple-300 transition-colors"
              title={`View characters by @${character.creatorName}`}
            >
              <span className="hidden sm:inline">by</span>
              <span className="text-purple-300/90 hover:text-purple-200 font-semibold truncate">
                @{cleanCreatorHandle(character.creatorName)}
              </span>
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400 shrink-0 fill-purple-400/20" />
            </div>

            {onToggleFollowCreator && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onToggleFollowCreator(character.creatorName, character.avatarUrl);
                }}
                className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
                  isFollowingCreator
                    ? 'bg-purple-600/25 text-purple-200 border border-purple-500/40'
                    : 'bg-[#181c28] hover:bg-purple-950/50 text-neutral-300 hover:text-purple-200 border border-[#262c3f]'
                }`}
              >
                {isFollowingCreator ? 'Following' : '+ Follow'}
              </button>
            )}
          </div>

          {/* Short Description */}
          <p className="text-[11px] sm:text-xs text-neutral-400 line-clamp-2 leading-relaxed mt-1.5 sm:mt-2.5">
            {character.shortDescription || 'JanitorAI-compatible character ready to roleplay.'}
          </p>

          {/* Tags Row */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mt-2 sm:mt-3">
            {displayTags.slice(0, 3).map(tag => (
              <span
                key={tag.id || tag.slug}
                onClick={e => {
                  if (onTagClick) {
                    e.stopPropagation();
                    onTagClick(String(tag.id), tag.name);
                  }
                }}
                className="text-[9px] sm:text-[11px] bg-[#181c28] hover:bg-[#202536] text-neutral-300 border border-[#222736] px-1.5 sm:px-2.5 py-0.5 rounded-md capitalize font-medium transition-colors truncate max-w-[90px] sm:max-w-none"
              >
                {tag.name.replace(/^[^\w\s]+/, '').trim()}
              </span>
            ))}
            {character.tags.length > 3 && (
              <span className="text-[9px] sm:text-[11px] bg-[#181c28] text-purple-300/90 border border-purple-500/20 px-1.5 sm:px-2 py-0.5 rounded-md font-semibold">
                +{character.tags.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Card Footer: Favorites, Chats, and Quick Actions */}
        <div className="pt-2 sm:pt-3 border-t border-[#1b1e28] flex items-center justify-between text-[10px] sm:text-xs text-neutral-400 font-medium gap-1">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span
              className="flex items-center gap-1 hover:text-neutral-200 transition-colors"
              title="Community Favorites"
            >
              <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-400 hover:text-rose-400 transition-colors shrink-0" />
              <span>{formatCount(character.favoritesCount)}</span>
            </span>

            <span
              className="flex items-center gap-1 text-neutral-400"
              title="Community Chats"
            >
              <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-400 shrink-0" />
              <span>{formatCount(character.chatCount || character.messageCount)}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Quick Import Button */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onImport(character);
              }}
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-[#181c28] hover:bg-[#222736] text-neutral-300 hover:text-white border border-[#222736] flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer"
              title="Import into My Library"
            >
              <Download className="w-3 h-3 text-purple-400" />
              <span className="hidden sm:inline">Import</span>
            </button>

            {/* Glowing Purple Circular Play Button */}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onStartChat(character);
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-purple-600/40 hover:scale-105 cursor-pointer"
              title={`Direct Chat with ${character.name}`}
            >
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

