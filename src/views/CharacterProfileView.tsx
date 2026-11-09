/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  MoreVertical,
  Heart,
  MessageSquare,
  Bookmark,
  Calendar,
  Clock,
  Shield,
  Share2,
  Flag,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Image as ImageIcon,
  MessageCircle,
  Play,
  User as UserIcon,
  Download,
  Copy,
  Check,
  X,
  Star,
  GitFork,
  Trash2,
  Loader2,
  FileText,
  ZoomIn
} from 'lucide-react';
import { Character, CharacterScenario, CharacterReview, Persona, User as UserModel } from '../types';
import { RichTextRenderer } from '../components/common/RichTextRenderer';
import { cleanCreatorHandle } from '../services/aiProviderService';
import { storageService } from '../services/storageService';
import { ImageLightboxModal } from '../components/common/ImageLightboxModal';
import {
  buildJanitorCreationFields,
  downloadJanitorMarkdown
} from '../utils/janitorExport';
import {
  buildCharacterCardV2,
  generateSillyTavernPngCard,
  downloadFile
} from '../utils/cardExport';

export interface GalleryMediaItem {
  id: string;
  url: string;
  title: string;
  source: 'Avatar' | 'Cover' | 'Scenario' | 'Description' | 'Illustration';
}

/**
 * Extracts and aggregates all images associated with a character:
 * Avatar, Cover, Scenario images, and inline Markdown/HTML/URL illustrations in descriptions & scenarios.
 */
export function extractCharacterGallery(character: Character): GalleryMediaItem[] {
  const items: GalleryMediaItem[] = [];
  const seenUrls = new Set<string>();

  const pushItem = (
    rawUrl: string | undefined | null,
    title: string,
    source: GalleryMediaItem['source']
  ) => {
    if (!rawUrl) return;
    const url = rawUrl.trim();
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/'))) return;
    if (seenUrls.has(url)) return;
    seenUrls.add(url);
    items.push({
      id: `${source.toLowerCase()}_${items.length}_${url.slice(-8)}`,
      url,
      title,
      source
    });
  };

  // 1. Character Avatar
  pushItem(character.avatarUrl, `${character.name} (Avatar)`, 'Avatar');

  // 2. Character Cover Banner
  pushItem(character.coverUrl, `${character.name} (Cover Artwork)`, 'Cover');

  // 3. Scenario Image fields
  if (character.scenarios && Array.isArray(character.scenarios)) {
    character.scenarios.forEach((sc, idx) => {
      if (sc.imageUrl) {
        pushItem(sc.imageUrl, sc.title || `Scenario #${idx + 1}`, 'Scenario');
      }
    });
  }

  // 4. Text corpus extraction from descriptions, backgrounds, scenarios, & notes
  const textCorpus = [
    (character as any).description,
    character.shortDescription,
    character.background,
    character.personality,
    character.firstMessage,
    character.creatorNotes,
    ...(character.scenarios || []).map(
      s => `${s.title}\n${s.description}\n${s.openingMessage}\n${s.scenarioInstructions}`
    )
  ]
    .filter(Boolean)
    .join('\n\n');

  // Markdown images: ![alt](url)
  const mdRegex = /!\[([^\]]*)\]\(\s*(https?:\/\/[^\s)]+|data:image\/[^\s)]+)\s*\)/gi;
  let match: RegExpExecArray | null;
  while ((match = mdRegex.exec(textCorpus)) !== null) {
    const alt = match[1]?.trim() || `${character.name} illustration`;
    const url = match[2]?.trim();
    pushItem(url, alt, 'Description');
  }

  // HTML images: <img src="url" ...>
  const htmlRegex = /<img[^>]+src=["'](https?:\/\/[^"'>]+|data:image\/[^"'>]+)["'][^>]*>/gi;
  while ((match = htmlRegex.exec(textCorpus)) !== null) {
    const url = match[1]?.trim();
    pushItem(url, `${character.name} scene`, 'Description');
  }

  // Standalone image links in text: https://...png/jpg/webp/gif
  const standaloneRegex = /(?:^|\s)(https?:\/\/[^\s<>"']+\.(?:png|jpe?g|webp|gif)(?:\?[^\s<>"']*)?)(?:\s|$)/gi;
  while ((match = standaloneRegex.exec(textCorpus)) !== null) {
    const url = match[1]?.trim();
    pushItem(url, `${character.name} artwork`, 'Illustration');
  }

  // 5. Extra gallery property if card carries an explicit array
  if ((character as any).gallery && Array.isArray((character as any).gallery)) {
    (character as any).gallery.forEach((g: any, idx: number) => {
      const url = typeof g === 'string' ? g : g?.url;
      const title = typeof g === 'object' && g?.title ? g.title : `Artwork #${idx + 1}`;
      pushItem(url, title, 'Illustration');
    });
  }

  return items;
}

interface CharacterProfileViewProps {
  character: Character;
  personas: Persona[];
  activePersona?: Persona;
  currentUser: UserModel;
  isFollowingCreator: boolean;
  onToggleFollow: (creatorId: string) => void;
  isBookmarked: boolean;
  onToggleBookmark: (charId: string) => void;
  onToggleLike: (charId: string) => void;
  onStartChatWithScenario: (character: Character, scenario?: CharacterScenario, persona?: Persona) => void;
  onBack: () => void;
  onOpenReportModal: (character: Character) => void;
  onViewCreatorProfile: (creatorId: string) => void;
  onForkCharacter?: (character: Character) => void;
}

type ProfileTab = 'about' | 'scenarios' | 'gallery' | 'lorebook' | 'comments';

export const CharacterProfileView: React.FC<CharacterProfileViewProps> = ({
  character,
  personas,
  activePersona,
  currentUser,
  isFollowingCreator,
  onToggleFollow,
  isBookmarked,
  onToggleBookmark,
  onToggleLike,
  onStartChatWithScenario,
  onBack,
  onOpenReportModal,
  onViewCreatorProfile,
  onForkCharacter
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('about');
  const [isFollowing, setIsFollowing] = useState(isFollowingCreator);
  const [showMenu, setShowMenu] = useState(false);

  // Ensure view resets to the top when opening a character
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
  }, [character.id]);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'ccv2' | 'warden' | 'janitor'>('png');
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<CharacterScenario | undefined>(
    character.scenarios?.[0]
  );
  const galleryImages = useMemo(() => extractCharacterGallery(character), [character]);

  // Reviews & Ratings State
  const [reviews, setReviews] = useState<CharacterReview[]>(() =>
    storageService.getCharacterReviews(character.id)
  );
  const [ratingStats, setRatingStats] = useState(() =>
    storageService.getCharacterRatingStats(character.id)
  );
  const [newRating, setNewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      storageService.saveCharacterReview({
        characterId: character.id,
        userId: currentUser.id,
        username: currentUser.displayName,
        userAvatar: currentUser.avatarUrl,
        rating: newRating,
        comment: reviewComment.trim()
      });
      setReviews(storageService.getCharacterReviews(character.id));
      setRatingStats(storageService.getCharacterRatingStats(character.id));
      setReviewComment('');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = (revId: string) => {
    storageService.deleteCharacterReview(revId, character.id);
    setReviews(storageService.getCharacterReviews(character.id));
    setRatingStats(storageService.getCharacterRatingStats(character.id));
  };

  const handleExportPng = async () => {
    setIsExportingPng(true);
    try {
      const blob = await generateSillyTavernPngCard(character);
      const cleanName = character.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadFile(`${cleanName}_card.png`, blob, 'image/png');
    } catch (err: any) {
      alert(`PNG Card export failed: ${err.message}`);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleExportCCv2Json = () => {
    const ccv2 = buildCharacterCardV2(character);
    const cleanName = character.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadFile(`${cleanName}_v2.json`, JSON.stringify(ccv2, null, 2), 'application/json');
  };

  const handleExportWardenJson = () => {
    const cleanName = character.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadFile(`${cleanName}_warden.json`, JSON.stringify(character, null, 2), 'application/json');
  };

  const janitorFields = buildJanitorCreationFields(character);

  const handleCopyField = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const cleanSubtitle = (sub?: string) => {
    if (!sub) return '';
    const cleaned = sub
      .replace(/^#+\s*/g, '')
      .replace(/##+\s*/g, ' · ')
      .replace(/\[\s*CORE\s*PERSONALITY\s*\]/gi, '')
      .replace(/\[.*?\]/g, '')
      .replace(/["“”]/g, '')
      .trim();
    if (!cleaned || cleaned.toLowerCase() === character.name.toLowerCase()) return '';
    return cleaned;
  };

  const formatCount = (num: number) => {
    if (!num) return '0';
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
  };

  const handleStartChat = () => {
    const persona = activePersona || personas[0];
    onStartChatWithScenario(character, selectedScenario || character.scenarios[0], persona);
  };

  const isMature = character.contentRating === 'Mature' || character.contentRating === 'NSFW';

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#0c0e14] pb-24 text-neutral-200 select-none">
      {/* Top Banner Image with Back & Actions */}
      <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden bg-[#090b10]">
        <img
          src={character.coverUrl || character.avatarUrl}
          alt={character.name}
          referrerPolicy="no-referrer"
          onClick={() => setLightboxImage({ url: character.coverUrl || character.avatarUrl, title: character.name })}
          className="w-full h-full object-cover object-top cursor-pointer hover:scale-105 transition-transform duration-500"
          title="Click to view full HD artwork"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e14] via-[#0c0e14]/40 to-black/50" />

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer border border-white/10"
            title="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Top-Right Actions: Quick Chat + Download HD Art + Menu */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {/* Quick Chat */}
          <button
            onClick={handleStartChat}
            className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-600/40 backdrop-blur-md border border-white/20 active:scale-95 transition-all cursor-pointer"
            title="Start chat immediately"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Chat</span>
          </button>

          {/* Download HD Artwork */}
          <button
            onClick={() => setLightboxImage({ url: character.coverUrl || character.avatarUrl, title: character.name })}
            className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer border border-white/10 active:scale-95"
            title="View & Download HD Artwork"
          >
            <Download className="w-4 h-4 text-purple-300" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer border border-white/10"
              title="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-11 w-52 bg-[#141722] border border-[#232838] rounded-xl shadow-2xl py-1.5 z-30">
                {onForkCharacter && (
                  <button
                    onClick={() => {
                      onForkCharacter(character);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-purple-300 hover:text-white hover:bg-[#1c2232] flex items-center gap-2 cursor-pointer"
                  >
                    <GitFork className="w-3.5 h-3.5 text-purple-400" />
                    <span>Fork / Duplicate Character</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsExportModalOpen(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-neutral-300 hover:text-white hover:bg-[#1c2232] flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Export Character Card...</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-neutral-300 hover:text-white hover:bg-[#1c2232] flex items-center gap-2 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Character</span>
                </button>
                <button
                  onClick={() => {
                    onOpenReportModal(character);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-950/20 flex items-center gap-2 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report Character</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 relative z-10 -mt-16 sm:-mt-20 space-y-6 overflow-x-hidden">
        {/* Header Block with Overlapping Avatar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 w-full min-w-0">
          <div className="flex items-end gap-3.5 sm:gap-4 w-full min-w-0 flex-1">
            {/* Square Overlapping Avatar */}
            <div
              onClick={() => setLightboxImage({ url: character.avatarUrl, title: character.name })}
              className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#0c0e14] border-2 border-[#1b1e28] shadow-2xl shrink-0 cursor-pointer group"
              title="Click to view & download HD avatar"
            >
              <img
                src={character.avatarUrl}
                alt={character.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>

            {/* Name, Subtitle & Creator (Wraps long titles cleanly on mobile) */}
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug break-words">
                {character.name}
              </h1>
              {cleanSubtitle(character.subtitle) && (
                <p className="text-xs sm:text-sm text-purple-300/90 font-semibold break-words mt-0.5">
                  {cleanSubtitle(character.subtitle).slice(0, 90)}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1 min-w-0">
                <span className="shrink-0">by</span>
                <button
                  onClick={() => onViewCreatorProfile(character.creatorId)}
                  className="text-neutral-200 font-medium hover:text-purple-300 transition-colors truncate max-w-[180px] sm:max-w-xs"
                >
                  @{cleanCreatorHandle(character.creatorUsername)}
                </button>
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 fill-purple-400/20" />
              </div>
            </div>
          </div>

          {/* Action Row: Start Chat (Primary) + Fork + Export + Follow Button + 3-dots */}
          <div className="flex items-center flex-wrap gap-2 self-start sm:self-end shrink-0">
            {/* Primary Action: Start Chat Now */}
            <button
              onClick={handleStartChat}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/35 transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Chat</span>
            </button>

            {onForkCharacter && (
              <button
                onClick={() => onForkCharacter(character)}
                className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/35 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
                title="Fork this character to customize your own copy in Studio"
              >
                <GitFork className="w-3.5 h-3.5 text-purple-400" />
                <span>Fork Card</span>
              </button>
            )}

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#161926] hover:bg-[#1e2336] text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Export Character Card (PNG Card, CCv2 JSON, Janitor Markdown)"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Export</span>
            </button>

            <button
              onClick={() => {
                setIsFollowing(!isFollowing);
                onToggleFollow(character.creatorId);
              }}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-180 flex items-center gap-1.5 cursor-pointer ${
                isFollowing
                  ? 'bg-[#1b1f2e] text-purple-300 border border-purple-500/30'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30'
              }`}
            >
              {isFollowing ? (
                <>
                  <span>Following</span>
                  <span className="text-purple-400 text-xs">✓</span>
                </>
              ) : (
                <span>Follow</span>
              )}
            </button>

            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-xl bg-[#12151e] border border-[#1b1e28] hover:bg-[#181c28] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Row & Bookmark */}
        <div className="flex items-center gap-4 sm:gap-5 text-xs text-neutral-400 font-medium pt-1">
          <button
            onClick={() => onToggleLike(character.id)}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          >
            <Heart className="w-4 h-4 text-neutral-400 hover:text-rose-400 hover:fill-rose-400 transition-colors" />
            <span>{formatCount(character.likeCount)}</span>
          </button>

          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-neutral-400" />
            <span>{character.chatCount || 0}</span>
          </span>

          <button
            onClick={() => setActiveTab('comments')}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors font-semibold cursor-pointer"
            title={`Rated ${ratingStats.average.toFixed(1)} stars by ${ratingStats.count} users (Click to view reviews)`}
          >
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{ratingStats.average.toFixed(1)}</span>
            <span className="text-[11px] text-neutral-400 font-normal">({ratingStats.count})</span>
          </button>

          <button
            onClick={() => onToggleBookmark(character.id)}
            className="flex items-center gap-1 hover:text-purple-400 transition-colors cursor-pointer"
            title="Bookmark"
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'text-purple-400 fill-purple-400' : ''}`} />
          </button>
        </div>

        {/* Tag Chips Row */}
        <div className="flex flex-wrap items-center gap-2">
          {character.tagSlugs.map(slug => (
            <span
              key={slug}
              className="text-xs bg-[#12151e] hover:bg-[#181c28] text-neutral-300 border border-[#1b1e28] px-3 py-1 rounded-md capitalize font-medium transition-colors"
            >
              {slug.replace(/-/g, ' ')}
            </span>
          ))}
        </div>

        {/* Navigation Tabs (About, Scenarios, Gallery, Lorebook, Reviews) */}
        <div
          role="tablist"
          data-horizontal-scroll="true"
          className="border-b border-[#1b1e28] flex items-center gap-5 sm:gap-8 text-xs sm:text-sm font-semibold overflow-x-auto no-scrollbar w-full"
        >
          <button
            onClick={() => setActiveTab('about')}
            className={`pb-3 transition-colors relative cursor-pointer shrink-0 ${
              activeTab === 'about'
                ? 'text-white border-b-2 border-purple-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            About
          </button>

          <button
            onClick={() => setActiveTab('scenarios')}
            className={`pb-3 transition-colors relative cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'scenarios'
                ? 'text-white border-b-2 border-purple-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Scenarios</span>
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-[#181c28] text-neutral-400">
              {character.scenarios?.length || 1}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`pb-3 transition-colors relative cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'gallery'
                ? 'text-white border-b-2 border-purple-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Gallery</span>
            <span className="text-xs px-1.5 py-0.2 rounded-full bg-[#181c28] text-neutral-400 font-semibold">
              {galleryImages.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('lorebook')}
            className={`pb-3 transition-colors relative cursor-pointer shrink-0 ${
              activeTab === 'lorebook'
                ? 'text-white border-b-2 border-purple-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Lorebook
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-3 transition-colors relative cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'comments'
                ? 'text-white border-b-2 border-purple-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            <span>Reviews ({ratingStats.count})</span>
          </button>
        </div>

        {/* Tab Content: About */}
        {activeTab === 'about' && (
          <div className="space-y-6 w-full min-w-0 break-words">
            {/* Description Text & Rich Media (Supports Images, Links & Markdown) */}
            <div className="text-sm leading-relaxed text-neutral-300 space-y-4 font-normal">
              <RichTextRenderer content={character.shortDescription} allowImages={true} />
              {character.background && (
                <div className="pt-1 text-neutral-300/90 border-t border-[#1b1e28]/60">
                  <RichTextRenderer content={character.background} allowImages={true} />
                </div>
              )}
              {character.personality && (
                <div className="p-3.5 bg-[#12151e] border border-[#1b1e28] rounded-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                    Personality
                  </h4>
                  <RichTextRenderer content={character.personality} className="text-xs text-neutral-300" />
                </div>
              )}
            </div>

            {/* Metadata Box matching Reference */}
            <div className="p-4 bg-[#12151e] border border-[#1b1e28] rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                  <UserIcon className="w-3.5 h-3.5" />
                  Creator
                </span>
                <p className="text-purple-400 font-semibold truncate">
                  @{cleanCreatorHandle(character.creatorUsername) || 'astra'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  Created
                </span>
                <p className="text-neutral-200 font-semibold">
                  {character.createdAt ? new Date(character.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Jan 12, 2024'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  Last Updated
                </span>
                <p className="text-neutral-200 font-semibold">
                  {character.updatedAt ? new Date(character.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Oct 30, 2026'}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-neutral-500 flex items-center gap-1.5 font-medium">
                  <Shield className="w-3.5 h-3.5" />
                  Content Rating
                </span>
                <div>
                  {isMature ? (
                    <span className="px-2 py-0.5 rounded-md bg-rose-600/20 text-rose-400 font-bold border border-rose-500/30 text-[11px]">
                      Mature
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600/20 text-emerald-400 font-bold border border-emerald-500/30 text-[11px]">
                      SFW
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Prominent Action Bar (Shown in content on desktop, sticky bottom bar on mobile) */}
            <div className="pt-2 hidden sm:flex items-center gap-3">
              <button
                onClick={handleStartChat}
                className="flex-1 py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Start Chat</span>
              </button>

              <button
                onClick={() => onToggleBookmark(character.id)}
                className="w-12 h-12 rounded-xl bg-[#12151e] border border-[#1b1e28] hover:bg-[#181c28] flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
                title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-purple-400 text-purple-400' : ''}`} />
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Scenarios */}
        {activeTab === 'scenarios' && (
          <div className="space-y-3">
            {character.scenarios?.map((sc, idx) => (
              <div
                key={sc.id}
                onClick={() => setSelectedScenario(sc)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedScenario?.id === sc.id
                    ? 'bg-[#181c28] border-purple-500/50'
                    : 'bg-[#12151e] border-[#1b1e28] hover:bg-[#161a26]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{sc.title}</span>
                    {selectedScenario?.id === sc.id && (
                      <span className="text-[10px] bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded font-semibold border border-purple-500/30">
                        Selected
                      </span>
                    )}
                  </h4>
                </div>
                {/* Scenario Illustration / Art Preview if available */}
                {sc.imageUrl && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImage({ url: sc.imageUrl!, title: sc.title });
                    }}
                    className="my-3 relative w-full sm:max-w-md h-48 rounded-xl overflow-hidden border border-purple-500/30 bg-[#0c0e14] cursor-pointer group shadow-lg"
                    title="Click to view & download HD scenario artwork"
                  >
                    <img
                      src={sc.imageUrl}
                      alt={sc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ZoomIn className="w-3.5 h-3.5 text-purple-300" />
                        <span>View Full HD Artwork</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-black/60 text-[10px] text-purple-300 border border-white/10 font-bold">
                        HD
                      </span>
                    </div>
                  </div>
                )}
                <div className="text-xs text-neutral-300 mt-1">
                  <RichTextRenderer content={sc.description} allowImages={true} />
                </div>
                {selectedScenario?.id === sc.id && sc.openingMessage && (
                  <div className="mt-3 pt-3 border-t border-[#252b3d] text-xs text-neutral-200 font-serif">
                    <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-purple-400 block mb-1.5">
                      Opening Message Preview
                    </span>
                    <RichTextRenderer content={sc.openingMessage} allowImages={true} />
                  </div>
                )}
              </div>
            ))}

            <div className="pt-2">
              <button
                onClick={handleStartChat}
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Start Chat with Selected Scenario</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Gallery */}
        {activeTab === 'gallery' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                  Character Media Gallery
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-950/40 text-purple-300 border border-purple-800/30 text-xs font-bold">
                  {galleryImages.length} {galleryImages.length === 1 ? 'artwork' : 'artworks'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Tap any artwork to open high-definition lightbox preview and download
              </p>
            </div>

            {galleryImages.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-400 bg-[#12151e] border border-[#1b1e28] rounded-2xl">
                No gallery artwork available for this character.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {galleryImages.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => setLightboxImage({ url: img.url, title: img.title })}
                    className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-[#12151e] border border-[#1b1e28] hover:border-purple-500/50 shadow-lg cursor-pointer transition-all duration-300 hover:shadow-purple-900/20 active:scale-[0.98]"
                  >
                    <img
                      src={img.url}
                      alt={img.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

                    {/* Top Source Badge */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-purple-300 border border-white/10 shadow-sm">
                        {img.source}
                      </span>
                    </div>

                    {/* Bottom Info & Download Action */}
                    <div className="absolute bottom-2.5 inset-x-2.5 z-10 flex items-end justify-between gap-1.5">
                      <span className="text-[11px] font-bold text-white line-clamp-1 drop-shadow-md">
                        {img.title}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxImage({ url: img.url, title: img.title });
                        }}
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-purple-600/90 text-white backdrop-blur-md transition-colors"
                        title="Preview & Download HD"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Lorebook */}
        {activeTab === 'lorebook' && (
          <div className="p-4 bg-[#12151e] border border-[#1b1e28] rounded-xl space-y-2 text-xs text-neutral-300">
            <p className="text-neutral-400">
              Attached Lorebooks enhance world-building triggers during roleplay conversations.
            </p>
            <div className="p-3 bg-[#0c0e14] rounded-lg border border-[#1b1e28] flex items-center justify-between">
              <span className="font-medium text-white">{character.name} Lorebook & World Index</span>
              <span className="text-purple-400 font-semibold">Active in Context</span>
            </div>
          </div>
        )}

        {/* Tab Content: Reviews & Ratings */}
        {activeTab === 'comments' && (
          <div className="space-y-6 animate-fade-in">
            {/* 1. Rating Summary & Breakdown Card */}
            <div className="p-4 sm:p-6 bg-[#12151e] border border-[#1b1e28] rounded-2xl shadow-lg">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                {/* Left: Overall Score */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center sm:border-r border-[#1e2334] sm:pr-6 text-center">
                  <div className="text-4xl sm:text-5xl font-black text-white tracking-tight flex items-baseline gap-1">
                    <span>{ratingStats.average.toFixed(1)}</span>
                    <span className="text-sm font-semibold text-neutral-400">/ 5.0</span>
                  </div>
                  <div className="flex items-center gap-1 my-2">
                    {[1, 2, 3, 4, 5].map(star => {
                      const isFull = star <= Math.round(ratingStats.average);
                      return (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            isFull ? 'fill-amber-400 text-amber-400' : 'text-neutral-600'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-neutral-400 font-medium">
                    Based on <strong className="text-white">{ratingStats.count}</strong> community {ratingStats.count === 1 ? 'review' : 'reviews'}
                  </p>
                </div>

                {/* Right: 5-Star Breakdown Bars */}
                <div className="sm:col-span-7 space-y-2">
                  {[5, 4, 3, 2, 1].map(stars => {
                    const count = ratingStats.breakdown[stars] || 0;
                    const pct = ratingStats.count > 0 ? Math.round((count / ratingStats.count) * 100) : 0;
                    return (
                      <div key={stars} className="flex items-center gap-2 text-xs">
                        <span className="w-7 text-neutral-400 font-mono text-right flex items-center justify-end gap-0.5">
                          <span>{stars}</span>
                          <Star className="w-3 h-3 text-amber-400/80 fill-amber-400/80 inline" />
                        </span>
                        <div className="flex-1 h-2.5 bg-[#1a1e2d] rounded-full overflow-hidden border border-white/5">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-[11px] text-neutral-400 text-right font-mono">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. Leave a Review Form */}
            <div className="p-4 sm:p-5 bg-[#12151e] border border-[#1b1e28] rounded-2xl shadow-md">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-400" />
                <span>Write a Review for {character.name}</span>
              </h3>
              <form onSubmit={handleSaveReview} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-300 font-medium">Your Rating:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => {
                      const active = star <= (hoverRating !== null ? hoverRating : newRating);
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(null)}
                          onClick={() => setNewRating(star)}
                          className="p-1 text-neutral-600 hover:text-amber-400 transition-colors cursor-pointer active:scale-90"
                          title={`${star} Star${star > 1 ? 's' : ''}`}
                        >
                          <Star
                            className={`w-5 h-5 transition-transform ${
                              active ? 'fill-amber-400 text-amber-400 scale-110 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]' : ''
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {hoverRating !== null ? `${hoverRating} Stars` : `${newRating} Stars`}
                  </span>
                </div>

                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder={`Share your thoughts on ${character.name}'s roleplay style, personality fidelity, and dialogue nuance...`}
                  className="w-full bg-[#0c0e14] border border-[#202536] focus:border-purple-500 rounded-xl p-3 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none resize-none leading-relaxed"
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-500">
                    Posting as <strong className="text-neutral-300">@{currentUser.displayName}</strong>
                  </span>
                  <button
                    type="submit"
                    disabled={!reviewComment.trim() || isSubmittingReview}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmittingReview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Submit Review</span>
                  </button>
                </div>
              </form>
            </div>

            {/* 3. Community Reviews Feed */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
                Community Feedback ({reviews.length})
              </h4>
              {reviews.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-[#1b1e28] rounded-xl">
                  No reviews yet. Be the first to share your roleplay experience with {character.name}!
                </div>
              ) : (
                reviews.map(rev => (
                  <div
                    key={rev.id}
                    className="p-4 bg-[#12151e] border border-[#1b1e28] hover:border-[#262c3e] rounded-xl transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={rev.userAvatar}
                          alt={rev.username}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 rounded-full object-cover bg-neutral-800 border border-white/10 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{rev.username}</p>
                          <p className="text-[10px] text-neutral-500">
                            {new Date(rev.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-700'
                              }`}
                            />
                          ))}
                        </div>
                        {rev.userId === currentUser.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev.id)}
                            className="p-1 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete your review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-neutral-200 leading-relaxed font-sans whitespace-pre-wrap pl-9">
                      {rev.comment}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Multi-Format Advanced Export Modal */}
      {isExportModalOpen && (
        <div
          onClick={() => setIsExportModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[88vh] bg-[#10131d] border border-[#242a3d] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-modal-pop"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#1e2334] flex items-center justify-between bg-[#131724]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-purple-400" />
                  <span>Export Character — {character.name}</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Export in universal formats: SillyTavern PNG Card, Character Card V2 JSON, or Janitor AI.
                </p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Format Switcher Tabs */}
            <div className="flex border-b border-[#1e2334] bg-[#0c0e14] px-4 pt-2 gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setExportFormat('png')}
                className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
                  exportFormat === 'png'
                    ? 'bg-[#151926] text-purple-300 border-t-2 border-purple-500'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                SillyTavern PNG Card
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('ccv2')}
                className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
                  exportFormat === 'ccv2'
                    ? 'bg-[#151926] text-purple-300 border-t-2 border-purple-500'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                CCv2 JSON
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('warden')}
                className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
                  exportFormat === 'warden'
                    ? 'bg-[#151926] text-purple-300 border-t-2 border-purple-500'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Warden AI Native
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('janitor')}
                className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
                  exportFormat === 'janitor'
                    ? 'bg-[#151926] text-purple-300 border-t-2 border-purple-500'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Janitor AI (.MD)
              </button>
            </div>

            {/* Modal Body per Format */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {/* 1. SillyTavern PNG Card Tab */}
              {exportFormat === 'png' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#151926] border border-[#23293d] flex flex-col sm:flex-row items-center gap-5">
                    <img
                      src={character.avatarUrl || character.coverUrl}
                      alt={character.name}
                      referrerPolicy="no-referrer"
                      className="w-32 h-44 object-cover rounded-xl border border-white/15 shadow-xl shrink-0"
                    />
                    <div className="space-y-2 text-center sm:text-left">
                      <h4 className="text-sm font-bold text-white">{character.name}</h4>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        This PNG image contains embedded Character Card V2 JSON metadata in its internal <code className="text-purple-300 bg-black/40 px-1 py-0.5 rounded font-mono">tEXt</code> chunks.
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        Compatible with <strong>SillyTavern, TavernAI, Agnaistic, RisuAI</strong>, and any app that supports standard character card images. Drag & drop the downloaded PNG directly into your client!
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleExportPng}
                      disabled={isExportingPng}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95 transition-all"
                    >
                      {isExportingPng ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span>Download SillyTavern PNG Card</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 2. CCv2 JSON Tab */}
              {exportFormat === 'ccv2' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400">Standard Character Card V2 Specification JSON:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyField('ccv2_raw', JSON.stringify(buildCharacterCardV2(character), null, 2))}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedField === 'ccv2_raw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'ccv2_raw' ? 'Copied!' : 'Copy JSON'}</span>
                    </button>
                  </div>
                  <pre className="p-3 bg-[#0c0e14] border border-[#1e2334] rounded-xl text-[11px] text-neutral-300 font-mono whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                    {JSON.stringify(buildCharacterCardV2(character), null, 2)}
                  </pre>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleExportCCv2Json}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download CCv2 .JSON File</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Warden AI Native Package Tab */}
              {exportFormat === 'warden' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#151926] border border-[#23293d] text-xs text-neutral-300">
                    Full Warden AI native format preserving multi-scenario definitions ({character.scenarios?.length || 0} scenarios), attached lorebooks, and custom moderation metadata.
                  </div>
                  <pre className="p-3 bg-[#0c0e14] border border-[#1e2334] rounded-xl text-[11px] text-neutral-300 font-mono whitespace-pre-wrap max-h-72 overflow-y-auto leading-relaxed">
                    {JSON.stringify(character, null, 2)}
                  </pre>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleExportWardenJson}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Warden AI Package</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Janitor AI Tab */}
              {exportFormat === 'janitor' && (
                <div className="space-y-4">
                  {[
                    {
                      key: 'name',
                      title: '1. Character Name',
                      hint: 'Displayed on the public bot card',
                      value: janitorFields.characterName
                    },
                    {
                      key: 'chatName',
                      title: 'Character Chat Name',
                      hint: 'The name the bot uses inside roleplay chats',
                      value: janitorFields.chatName
                    },
                    {
                      key: 'bio',
                      title: '2. Character Bio (Public Description & Images)',
                      hint: 'Supports Markdown/HTML & banners — NOT read by AI',
                      value: janitorFields.characterBio
                    },
                    {
                      key: 'personality',
                      title: '3. Personality (Core AI Definition)',
                      hint: 'Read by the AI on every message turn',
                      value: janitorFields.personality
                    },
                    {
                      key: 'scenario',
                      title: '4. Scenario (Setting & Context)',
                      hint: 'Persistent setting anchor for {{char}} and {{user}}',
                      value: janitorFields.scenario
                    },
                    {
                      key: 'initialMessage',
                      title: '5. Initial Message (First Message)',
                      hint: 'Opening greeting that starts the roleplay',
                      value: janitorFields.initialMessage
                    },
                    {
                      key: 'exampleDialogs',
                      title: '6. Example Dialogs',
                      hint: '<START> formatted dialogue examples',
                      value: janitorFields.exampleDialogs
                    }
                  ].map(item => (
                    <div
                      key={item.key}
                      className="p-3.5 rounded-xl bg-[#151926] border border-[#23293d] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-white">{item.title}</div>
                          <div className="text-[10px] text-neutral-400">{item.hint}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyField(item.key, item.value)}
                          className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-200 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {copiedField === item.key ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-300">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Box</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-2.5 rounded-lg bg-[#0c0e14] border border-[#1c2132] text-[11px] text-neutral-300 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                        {item.value}
                      </pre>
                    </div>
                  ))}
                  <div className="p-4 border-t border-[#1e2334] bg-[#131724] flex items-center justify-between gap-3 rounded-xl mt-4">
                    <span className="text-[11px] text-neutral-400">
                      Rating: <strong className="text-purple-300">{janitorFields.rating}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => downloadJanitorMarkdown(character)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Full .MD File</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating Sticky Bottom Chat Bar */}
      <div className="fixed bottom-0 inset-x-0 p-3 bg-[#0d1018]/95 backdrop-blur-xl border-t border-white/10 z-30 flex items-center gap-2.5 sm:hidden">
        <button
          onClick={() => onToggleBookmark(character.id)}
          className="w-10 h-10 rounded-xl bg-[#161a26] border border-[#222736] flex items-center justify-center text-neutral-300 active:scale-95 transition-all"
          title={isBookmarked ? 'Bookmarked' : 'Bookmark'}
        >
          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-purple-400 text-purple-400' : ''}`} />
        </button>
        <button
          onClick={handleStartChat}
          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/35 active:scale-95 transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Start Chat</span>
        </button>
      </div>

      {/* Lightbox Modal for HD character preview & download */}
      <ImageLightboxModal
        isOpen={Boolean(lightboxImage)}
        onClose={() => setLightboxImage(null)}
        imageUrl={lightboxImage?.url || ''}
        title={lightboxImage?.title}
      />
    </div>
  );
};
