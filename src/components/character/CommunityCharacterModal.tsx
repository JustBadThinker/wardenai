/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
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
import { CatPulsingLoader } from '../common/CatPulsingLoader';
import { ImageLightboxModal } from '../common/ImageLightboxModal';
import { getHighResImageUrl, getFallbackImageUrl } from '../../utils/imageUtils';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'firstMessage' | 'scenarios' | 'gallery'>('overview');
  const [revealed, setRevealed] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string>('');
  const [lightboxImageTitle, setLightboxImageTitle] = useState<string>('');
  const [bannerSrc, setBannerSrc] = useState<string>('');

  useEffect(() => {
    if (character) {
      const raw = detail?.avatarUrl || character.avatarUrl || '';
      setBannerSrc(getHighResImageUrl(raw));
    }
  }, [detail?.avatarUrl, character?.avatarUrl]);

  const handleBannerImgError = () => {
    const fallback = getFallbackImageUrl(bannerSrc);
    if (fallback && fallback !== bannerSrc) {
      setBannerSrc(fallback);
    } else if (character?.avatarUrl && bannerSrc !== character.avatarUrl) {
      setBannerSrc(character.avatarUrl);
    }
  };

  // Extract all media images for character (Avatar, Description banners, Scenario illustrations)
  const communityGallery = useMemo(() => {
    if (!character) return [];
    const items: Array<{ id: string; url: string; title: string; source: string }> = [];
    const seen = new Set<string>();

    const add = (rawUrl: string | undefined | null, title: string, source: string) => {
      if (!rawUrl) return;
      const url = rawUrl.trim();
      if (!url || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/')) || seen.has(url)) return;
      seen.add(url);
      items.push({ id: `${source.toLowerCase()}_${items.length}`, url, title, source });
    };

    if (detail?.avatarUrl) add(detail.avatarUrl, `${character.name} (Artwork)`, 'Avatar');
    if (character.avatarUrl) add(character.avatarUrl, `${character.name} (Card)`, 'Avatar');

    const corpus = [
      detail?.descriptionHtml,
      character.shortDescription,
      detail?.scenario,
      detail?.firstMessage,
      ...(detail?.alternateGreetings || [])
    ].filter(Boolean).join('\n\n');

    const mdRegex = /!\[([^\]]*)\]\(\s*(https?:\/\/[^\s)]+|data:image\/[^\s)]+)\s*\)/gi;
    let match: RegExpExecArray | null;
    while ((match = mdRegex.exec(corpus)) !== null) {
      add(match[2]?.trim(), match[1]?.trim() || `${character.name} illustration`, 'Description');
    }

    const htmlRegex = /<img[^>]+src=["'](https?:\/\/[^"'>]+|data:image\/[^"'>]+)["'][^>]*>/gi;
    while ((match = htmlRegex.exec(corpus)) !== null) {
      add(match[1]?.trim(), `${character.name} media`, 'Media');
    }

    const standaloneRegex = /(?:^|\s)(https?:\/\/[^\s<>"']+\.(?:png|jpe?g|webp|gif)(?:\?[^\s<>"']*)?)(?:\s|$)/gi;
    while ((match = standaloneRegex.exec(corpus)) !== null) {
      add(match[1]?.trim(), `${character.name} scene`, 'Illustration');
    }

    return items;
  }, [character, detail]);

  useEffect(() => {
    if (!character || !isOpen) {
      setDetail(null);
      setError(null);
      setActiveTab('overview');
      setRevealed(false);
      setIsLightboxOpen(false);
      setLightboxImageUrl('');
      setLightboxImageTitle('');
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
  if (typeof document === 'undefined') return null;

  const shouldBlur = character.isNsfw && blurNsfw && !revealed;

  const formatCount = (num: number) => {
    if (!num) return '0';
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  return createPortal(
    <>
      <AnimatePresence>
        {isOpen && character && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-2.5 sm:p-6"
            onClick={onClose}
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', damping: 30, stiffness: 380, mass: 0.8 }}
              className="relative w-full max-w-3xl max-h-[92dvh] bg-[#10131c] border border-[#1f2433] rounded-2xl shadow-2xl overflow-hidden flex flex-col transform-gpu z-10"
              onClick={e => e.stopPropagation()}
            >
              {/* Header Artwork & Info Hero (Compact on mobile so buttons and text are immediately visible) */}
              <div
                onClick={() => {
                  if (!shouldBlur) {
                    setLightboxImageUrl(detail?.avatarUrl || character.avatarUrl);
                    setLightboxImageTitle(character.name);
                    setIsLightboxOpen(true);
                  }
                }}
                className={`relative h-36 sm:h-60 w-full bg-[#0c0e14] shrink-0 overflow-hidden ${
                  !shouldBlur ? 'cursor-pointer group' : ''
                }`}
                title={!shouldBlur ? 'Click to view & download HD artwork' : undefined}
              >
                <img
                  src={bannerSrc || getHighResImageUrl(detail?.avatarUrl || character.avatarUrl)}
                  alt={character.name}
                  referrerPolicy="no-referrer"
                  onError={handleBannerImgError}
                  className={`w-full h-full object-cover object-top transition-transform duration-500 ${
                    !shouldBlur ? 'group-hover:scale-105' : ''
                  } ${shouldBlur ? 'blur-2xl scale-110' : ''}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#10131c] via-[#10131c]/60 to-black/40" />

                {/* Top Actions: Quick Send Message / Chat, Download HD Artwork, and Close Button */}
                <div
                  className="absolute top-3.5 right-3.5 z-20 flex items-center gap-1.5 sm:gap-2"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Quick Send Message / Roleplay button on top */}
                  <button
                    type="button"
                    onClick={() => onStartChat(character, detail || undefined)}
                    className="px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/40 backdrop-blur-md border border-white/20 active:scale-95 transition-all cursor-pointer"
                    title="Start roleplay immediately without scrolling"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Chat</span>
                  </button>

                  {/* Quick Download HD Image button */}
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxImageUrl(getHighResImageUrl(detail?.avatarUrl || character.avatarUrl));
                      setLightboxImageTitle(character.name);
                      setIsLightboxOpen(true);
                    }}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95"
                    title="View & Download HD Artwork"
                  >
                    <Download className="w-4 h-4 text-purple-300" />
                  </button>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95"
                    title="Close modal"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

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
            {communityGallery.length > 0 && (
              <button
                onClick={() => setActiveTab('gallery')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'gallery'
                    ? 'bg-purple-600 text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>Gallery</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-purple-300 font-semibold">
                  {communityGallery.length}
                </span>
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
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-neutral-400">
              <CatPulsingLoader size="md" label="Fetching full JanitorAI card specifications..." />
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
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-purple-400">
                        Greeting #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const baseDetail: CommunityCharacterDetail = detail || {
                            id: character.id,
                            firstMessage: greet,
                            personality: character.shortDescription || '',
                            scenario: '',
                            descriptionHtml: '',
                            alternateGreetings: []
                          };
                          const modifiedDetail: CommunityCharacterDetail = {
                            ...baseDetail,
                            firstMessage: greet
                          };
                          onStartChat(character, modifiedDetail);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                        title="Start chat immediately with this alternate opening greeting"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Chat with this Greeting</span>
                      </button>
                    </div>
                    <RichTextRenderer content={greet} allowImages={true} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && activeTab === 'gallery' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
                  Character Media Gallery ({communityGallery.length})
                </h4>
                <span className="text-[11px] text-neutral-400">
                  Tap to preview in HD & download
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {communityGallery.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => {
                      setLightboxImageUrl(img.url);
                      setLightboxImageTitle(img.title);
                      setIsLightboxOpen(true);
                    }}
                    className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-[#141824] border border-[#1e2334] hover:border-purple-500/50 shadow-md cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <img
                      src={img.url}
                      alt={img.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-purple-300 border border-white/10 shadow-sm">
                      {img.source}
                    </span>
                    <div className="absolute bottom-2 inset-x-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white line-clamp-1 drop-shadow-md">
                        {img.title}
                      </span>
                      <Download className="w-3.5 h-3.5 text-purple-300" />
                    </div>
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
        </motion.div>
      </div>
    )}
  </AnimatePresence>

  {/* Lightbox Modal for HD character preview & download */}
  <ImageLightboxModal
    isOpen={isLightboxOpen}
    onClose={() => setIsLightboxOpen(false)}
    imageUrl={lightboxImageUrl || detail?.avatarUrl || character?.avatarUrl || ''}
    title={lightboxImageTitle || character?.name}
  />
</>,
document.body
);
};

