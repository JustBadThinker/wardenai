/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  Play,
  Download,
  Heart,
  MessageSquare,
  Coins,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Loader2,
  BookOpen,
  UserCheck
} from 'lucide-react';
import {
  CommunityCharacter,
  CommunityCharacterDetail,
  communityCatalogService
} from '../../services/communityCatalogService';
import { RichTextRenderer } from '../common/RichTextRenderer';
import { cleanCreatorHandle } from '../../services/aiProviderService';

interface CommunityCharacterModalProps {
  character: CommunityCharacter | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (character: CommunityCharacter, detail?: CommunityCharacterDetail) => void;
  onImport: (character: CommunityCharacter, detail?: CommunityCharacterDetail) => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  blurNsfw: boolean;
  isFollowingCreator?: boolean;
  onToggleFollowCreator?: (creatorName: string, avatarUrl?: string) => void;
  onViewCreatorProfile?: (creatorName: string) => void;
}

export const CommunityCharacterModal: React.FC<CommunityCharacterModalProps> = ({
  character,
  isOpen,
  onClose,
  onStartChat,
  onImport,
  isBookmarked,
  onToggleBookmark,
  blurNsfw,
  isFollowingCreator,
  onToggleFollowCreator,
  onViewCreatorProfile
}) => {
  const [detail, setDetail] = useState<CommunityCharacterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'firstMessage' | 'scenarios'>('overview');
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!character || !isOpen) {
      setDetail(null);
      setError(null);
      setActiveTab('overview');
      setRevealed(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    communityCatalogService
      .getCharacterDetail(character.id)
      .then(d => {
        if (isMounted) {
          setDetail(d);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.warn('[CommunityCharacterModal] Failed to load full detail:', err);
          setError('Could not load extended details; basic preview available.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [character?.id, isOpen]);

  if (!isOpen || !character) return null;

  const shouldBlur = character.isNsfw && blurNsfw && !revealed;

  const formatCount = (num: number) => {
    if (!num) return '0';
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2.5 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-3xl max-h-[92dvh] bg-[#10131c] border border-[#1f2433] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-modal-pop"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Artwork & Info Hero (Compact on mobile so buttons and text are immediately visible) */}
        <div className="relative h-36 sm:h-60 w-full bg-[#0c0e14] shrink-0 overflow-hidden">
          <img
            src={detail?.avatarUrl || character.avatarUrl}
            alt={character.name}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover object-top ${
              shouldBlur ? 'blur-2xl scale-110' : ''
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10131c] via-[#10131c]/60 to-black/40" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Sensitive content reveal */}
          {shouldBlur && (
            <div
              onClick={() => setRevealed(true)}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-10 cursor-pointer"
            >
              <ShieldAlert className="w-8 h-8 text-rose-400 mb-1.5" />
              <span className="text-sm font-semibold text-white">Sensitive Artwork Hidden</span>
              <span className="text-xs text-purple-300 underline mt-0.5">Click to reveal</span>
            </div>
          )}

          {/* Badges in top left */}
          <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2">
            {character.isNsfw ? (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-600/90 text-white shadow-md backdrop-blur-md">
                18+ NSFW
              </span>
            ) : (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600/90 text-white shadow-md backdrop-blur-md">
                SFW
              </span>
            )}

            <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-black/60 text-purple-300 border border-purple-500/30 backdrop-blur-md flex items-center gap-1.5">
              <Coins className="w-3 h-3 text-purple-400" />
              <span>{formatCount(character.totalTokens)} tokens</span>
            </span>

            <span className="hidden sm:inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-900/40 text-purple-300 border border-purple-500/20 backdrop-blur-md">
              JanitorAI / SillyTavern V2
            </span>
          </div>

          {/* Bottom hero character identity */}
          <div className="absolute bottom-3.5 left-4 right-4 z-10">
            <h2 className="text-base sm:text-2xl font-bold text-white drop-shadow-md leading-snug break-words line-clamp-2">
              {character.name}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-300 mt-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span>by</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onViewCreatorProfile) {
                        onClose();
                        onViewCreatorProfile(character.creatorName);
                      }
                    }}
                    className="text-white font-semibold hover:text-purple-300 transition-colors cursor-pointer"
                    title="View creator profile"
                  >
                    @{cleanCreatorHandle(character.creatorName)}
                  </button>
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 fill-purple-400/20" />
                </div>

                {onToggleFollowCreator && (
                  <button
                    type="button"
                    onClick={() => onToggleFollowCreator(character.creatorName, character.avatarUrl)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isFollowingCreator
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white/15 hover:bg-purple-600/80 text-white border border-white/20'
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>{isFollowingCreator ? 'Following Creator' : 'Follow @' + cleanCreatorHandle(character.creatorName)}</span>
                  </button>
                )}
              </div>

              <span>•</span>

              <div className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                <span>{formatCount(character.favoritesCount)} favorites</span>
              </div>

              <span>•</span>

              <div className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                <span>{formatCount(character.chatCount || character.messageCount)} chats</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div
          role="tablist"
          data-horizontal-scroll="true"
          className="px-5 py-2.5 bg-[#12151e] border-b border-[#1b1e28] flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar"
        >
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('firstMessage')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === 'firstMessage'
                  ? 'bg-purple-600 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Greeting Message
            </button>
            {detail?.alternateGreetings && detail.alternateGreetings.length > 0 && (
              <button
                onClick={() => setActiveTab('scenarios')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'scenarios'
                    ? 'bg-purple-600 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Alternates ({detail.alternateGreetings.length})
              </button>
            )}
          </div>

          <a
            href={`https://datacat.run/characters/${character.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 hover:text-purple-300 transition-colors"
          >
            <span>Datacat Source</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-neutral-300">
          {loading && (
            <div className="flex items-center justify-center py-10 gap-2 text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <span>Fetching full JanitorAI card specifications...</span>
            </div>
          )}

          {!loading && activeTab === 'overview' && (
            <>
              {/* Tags */}
              <div className="flex flex-wrap items-center gap-1.5">
                {character.tags.map(tag => (
                  <span
                    key={tag.id || tag.slug}
                    className="px-2.5 py-1 rounded-md bg-[#181c28] border border-[#222736] text-neutral-300 text-[11px] font-medium"
                  >
                    {tag.name.replace(/^[^\w\s]+/, '').trim()}
                  </span>
                ))}
              </div>

              {/* Character Summary / Persona (Supports full HTML/Markdown images like Image 1) */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                  Description & Scenarios
                </h4>
                <div className="p-4 bg-[#141824] border border-[#1e2334] rounded-xl text-neutral-200 leading-relaxed max-h-80 overflow-y-auto">
                  <RichTextRenderer
                    content={
                      detail?.descriptionHtml ||
                      character.shortDescription ||
                      'No description provided.'
                    }
                    allowImages={true}
                  />
                </div>
              </div>

              {/* Scenario Context if available */}
              {detail?.scenario && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                    Roleplay Scenario & Context
                  </h4>
                  <div className="p-4 bg-[#141824] border border-[#1e2334] rounded-xl text-neutral-300 leading-relaxed max-h-56 overflow-y-auto">
                    <RichTextRenderer content={detail.scenario} allowImages={true} />
                  </div>
                </div>
              )}
            </>
          )}

          {!loading && activeTab === 'firstMessage' && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                Default Opening Message
              </h4>
              <div className="p-4 bg-[#141824] border border-[#1e2334] rounded-xl text-neutral-200 leading-relaxed max-h-80 overflow-y-auto font-serif text-[13px]">
                <RichTextRenderer
                  content={
                    detail?.firstMessage ||
                    `*${character.name} looks over at you, their gaze lingering with quiet interest.* "Hello there. What brings you to see me?"`
                  }
                  allowImages={true}
                />
              </div>
            </div>
          )}

          {!loading && activeTab === 'scenarios' && detail?.alternateGreetings && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                Alternate Greetings ({detail.alternateGreetings.length})
              </h4>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {detail.alternateGreetings.map((greet, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#141824] border border-[#1e2334] rounded-xl text-neutral-300 leading-relaxed text-xs"
                  >
                    <span className="text-[10px] font-bold text-purple-400 block mb-1.5">
                      Greeting #{idx + 1}
                    </span>
                    <RichTextRenderer content={greet} allowImages={true} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floating Frosted Modal Action Footer (Always reachable above mobile bottom bars) */}
        <div className="p-3 sm:p-4 bg-[#0d1018]/90 backdrop-blur-2xl border-t border-white/15 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleBookmark(character.id)}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                  : 'bg-[#181c28] text-neutral-300 hover:text-white border-[#222736]'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  isBookmarked ? 'text-purple-400 fill-purple-400' : 'text-neutral-400'
                }`}
              />
              <span className="hidden sm:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>

            <button
              onClick={() => onImport(character, detail || undefined)}
              className="px-3.5 py-2 rounded-xl bg-[#181c28] hover:bg-[#222736] text-neutral-200 hover:text-white border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Import Card</span>
            </button>
          </div>

          <button
            onClick={() => onStartChat(character, detail || undefined)}
            className="flex-1 sm:flex-initial justify-center px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Roleplay Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};

