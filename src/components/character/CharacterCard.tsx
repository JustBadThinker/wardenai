/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  MessageSquare,
  Heart,
  Bookmark,
  Play,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { Character } from '../../types';

interface CharacterCardProps {
  character: Character;
  onSelect: (character: Character) => void;
  onStartChat: (character: Character) => void;
  isBookmarked: boolean;
  onToggleBookmark: (characterId: string) => void;
  onToggleLike: (characterId: string) => void;
  blurNsfw: boolean;
  variant?: 'featured' | 'grid' | 'compact';
  onTagClick?: (tag: string) => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onSelect,
  onStartChat,
  isBookmarked,
  onToggleBookmark,
  onToggleLike,
  blurNsfw,
  variant = 'grid',
  onTagClick
}) => {
  const isMature = character.contentRating === 'Mature' || character.contentRating === 'NSFW';
  const [revealed, setRevealed] = useState(false);
  const shouldBlur = isMature && blurNsfw && !revealed;

  const formatCount = (num: number) => {
    if (!num) return '0';
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  // Visible tag chips logic (up to 4, then +N)
  const displayTags = character.tagSlugs.slice(0, 4);
  const remainingTagCount = character.tagSlugs.length - displayTags.length;

  // Compact horizontal card (for sidebar / recent picks)
  if (variant === 'compact') {
    return (
      <div
        onClick={() => onSelect(character)}
        className="group relative bg-[#12151e] hover:bg-[#161a26] border border-[#1b1e28] hover:border-purple-500/40 rounded-xl p-3 flex items-center gap-3.5 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-purple-950/20"
      >
        <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-[#0c0e14] border border-[#1f2433]">
          <img
            src={character.avatarUrl}
            alt={character.name}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              shouldBlur ? 'blur-md' : ''
            }`}
            loading="lazy"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
              {character.name}
            </h3>
            <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-medium">
              <Heart className="w-3 h-3 text-neutral-500 fill-neutral-500" />
              <span>{formatCount(character.likeCount)}</span>
            </div>
          </div>

          <p className="text-xs text-neutral-400 truncate mt-0.5">
            {character.subtitle || character.shortDescription}
          </p>

          <div className="flex items-center gap-1.5 mt-1.5 overflow-hidden">
            {character.tagSlugs.slice(0, 3).map(slug => (
              <span
                key={slug}
                className="text-[10px] bg-[#181c28] text-neutral-300 px-2 py-0.5 rounded-md capitalize shrink-0 border border-[#222736]"
              >
                {slug.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const [imgSrc, setImgSrc] = useState(character.avatarUrl || character.coverUrl || '');
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgSrc(character.avatarUrl || character.coverUrl || '');
    setImgError(false);
  }, [character.avatarUrl, character.coverUrl]);

  const handleImgError = () => {
    if (imgSrc === character.avatarUrl && character.coverUrl && character.coverUrl !== character.avatarUrl) {
      setImgSrc(character.coverUrl);
    } else if (imgSrc.includes('card.webp')) {
      setImgSrc(imgSrc.replace('card.webp', 'thumb.webp'));
    } else if (imgSrc.includes('thumb.webp')) {
      setImgSrc(imgSrc.replace('thumb.webp', 'avatar.webp'));
    } else {
      setImgError(true);
    }
  };

  // Standard Discord/Warden Community Card (matches Panel 1 & Panel 5 exactly)
  return (
    <div
      onClick={() => onSelect(character)}
      className="group relative bg-[#12151e] hover:bg-[#151924] border border-[#1b1e28] hover:border-purple-500/40 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-1.5 active:scale-[0.98] flex flex-col shadow-md hover:shadow-2xl hover:shadow-purple-950/40 transform-gpu animate-fade-in"
    >
      {/* Artwork Banner with Rating Badge & Bookmark */}
      <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#0c0e14]">
        {!imgError && imgSrc ? (
          <img
            src={imgSrc}
            alt={character.name}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] ${
              shouldBlur ? 'blur-xl scale-110' : ''
            }`}
            loading="lazy"
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

        {/* Gradient Scrim for subtle bottom shadow */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12151e] via-transparent to-black/30 pointer-events-none" />

        {/* Rating Badge (18+ in crimson / SFW in emerald) */}
        <div className="absolute top-2.5 left-2.5 z-10">
          {isMature ? (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-600/90 text-white tracking-wide shadow-sm backdrop-blur-md">
              18+
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-600/90 text-white tracking-wide shadow-sm backdrop-blur-md">
              SFW
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
          className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md flex items-center justify-center text-neutral-300 hover:text-white transition-all border border-white/10"
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
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-10"
          >
            <ShieldAlert className="w-6 h-6 text-rose-400 mb-1" />
            <span className="text-xs font-semibold text-white">Sensitive Content</span>
            <span className="text-[10px] text-purple-300 underline mt-0.5">Click to reveal</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Character Name */}
          <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors truncate">
            {character.name}
          </h3>

          {/* Subtitle / Archetype */}
          {character.subtitle && (
            <p className="text-xs text-neutral-400 font-normal truncate mt-0.5">
              {character.subtitle}
            </p>
          )}

          {/* Creator Attribution with Verified Check */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1">
            <span>by</span>
            <span className="text-neutral-300 font-medium hover:text-purple-300 truncate">
              @{character.creatorUsername || 'creator'}
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 fill-purple-400/20" />
          </div>

          {/* Short Description */}
          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed mt-2.5">
            {character.shortDescription}
          </p>

          {/* Tags Row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {displayTags.map(slug => (
              <span
                key={slug}
                onClick={e => {
                  if (onTagClick) {
                    e.stopPropagation();
                    onTagClick(slug);
                  }
                }}
                className="text-[11px] bg-[#181c28] hover:bg-[#202536] text-neutral-300 border border-[#222736] px-2.5 py-0.5 rounded-md capitalize font-medium transition-colors"
              >
                {slug.replace(/-/g, ' ')}
              </span>
            ))}
            {remainingTagCount > 0 && (
              <span className="text-[11px] bg-[#181c28] text-purple-300/90 border border-purple-500/20 px-2 py-0.5 rounded-md font-semibold">
                +{remainingTagCount}
              </span>
            )}
          </div>
        </div>

        {/* Card Footer: Likes, Chats, and Purple Circular Play/Chat Button */}
        <div className="pt-3 border-t border-[#1b1e28] flex items-center justify-between text-xs text-neutral-400 font-medium">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onToggleLike(character.id);
              }}
              className="flex items-center gap-1 hover:text-neutral-200 transition-colors"
              title="Like"
            >
              <Heart className="w-3.5 h-3.5 text-neutral-400 hover:text-rose-400 hover:fill-rose-400 transition-colors" />
              <span>{formatCount(character.likeCount)}</span>
            </button>

            <span className="flex items-center gap-1 text-neutral-400">
              <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
              <span>{character.chatCount || 0}</span>
            </span>
          </div>

          {/* Purple circular Play button */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onStartChat(character);
            }}
            className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-purple-600/40 hover:scale-105"
            title={`Chat with ${character.name}`}
          >
            <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
