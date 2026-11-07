/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { Character, CharacterScenario, Persona, User as UserModel } from '../types';
import { RichTextRenderer } from '../components/common/RichTextRenderer';
import { cleanCreatorHandle } from '../services/aiProviderService';
import {
  buildJanitorCreationFields,
  downloadJanitorMarkdown
} from '../utils/janitorExport';

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
  onViewCreatorProfile
}) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('about');
  const [isFollowing, setIsFollowing] = useState(isFollowingCreator);
  const [showMenu, setShowMenu] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<CharacterScenario | undefined>(
    character.scenarios?.[0]
  );

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
          className="w-full h-full object-cover object-top"
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

        {/* Top-Right Menu */}
        <div className="absolute top-4 right-4 z-10">
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer border border-white/10"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-11 w-52 bg-[#141722] border border-[#232838] rounded-xl shadow-2xl py-1.5 z-30">
                <button
                  onClick={() => {
                    downloadJanitorMarkdown(character);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-purple-300 hover:text-white hover:bg-[#1c2232] flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Export Janitor AI (.md)</span>
                </button>
                <button
                  onClick={() => {
                    setIsExportModalOpen(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-neutral-300 hover:text-white hover:bg-[#1c2232] flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-purple-400" />
                  <span>Janitor AI Form Sheet</span>
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
            <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#0c0e14] border-2 border-[#1b1e28] shadow-2xl shrink-0">
              <img
                src={character.avatarUrl}
                alt={character.name}
                className="w-full h-full object-cover"
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

          {/* Action Row: Export .MD + Follow Button + 3-dots */}
          <div className="flex items-center flex-wrap gap-2 self-start sm:self-end shrink-0">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#161926] hover:bg-[#1e2336] text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Export Character as Janitor AI Markdown (.md)"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Export .MD</span>
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
        <div className="flex items-center gap-5 text-xs text-neutral-400 font-medium pt-1">
          <button
            onClick={() => onToggleLike(character.id)}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Heart className="w-4 h-4 text-neutral-400 hover:text-rose-400 hover:fill-rose-400 transition-colors" />
            <span>{formatCount(character.likeCount)}</span>
          </button>

          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-neutral-400" />
            <span>{character.chatCount || 0}</span>
          </span>

          <button
            onClick={() => onToggleBookmark(character.id)}
            className="flex items-center gap-1 hover:text-purple-400 transition-colors"
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

        {/* Navigation Tabs (About, Scenarios, Gallery, Lorebook, Comments) */}
        <div className="border-b border-[#1b1e28] flex items-center gap-5 sm:gap-8 text-xs sm:text-sm font-semibold overflow-x-auto no-scrollbar w-full">
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
            className={`pb-3 transition-colors relative cursor-pointer shrink-0 ${
              activeTab === 'gallery'
                ? 'text-white border-b-2 border-purple-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Gallery
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
            className={`pb-3 transition-colors relative cursor-pointer shrink-0 ${
              activeTab === 'comments'
                ? 'text-white border-b-2 border-purple-500'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Comments
          </button>
        </div>

        {/* Tab Content: About */}
        {activeTab === 'about' && (
          <div className="space-y-6 w-full min-w-0 break-words">
            {/* Description Text & Rich Media (Supports Images, Links & Markdown) */}
            <div className="text-sm leading-relaxed text-neutral-300 space-y-4 font-normal">
              <RichTextRenderer content={character.shortDescription} />
              {character.background && (
                <div className="pt-1 text-neutral-300/90 border-t border-[#1b1e28]/60">
                  <RichTextRenderer content={character.background} />
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

            {/* Prominent Action Bar */}
            <div className="pt-2 flex items-center gap-3">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#12151e] border border-[#1b1e28]">
              <img src={character.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            {character.coverUrl && (
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-[#12151e] border border-[#1b1e28]">
                <img src={character.coverUrl} alt="Cover" className="w-full h-full object-cover" />
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

        {/* Tab Content: Comments */}
        {activeTab === 'comments' && (
          <div className="p-8 text-center text-xs text-neutral-500 border border-dashed border-[#1b1e28] rounded-xl">
            Community discussion and user reviews will appear here. Be respectful and follow community guidelines.
          </div>
        )}
      </div>

      {/* Janitor AI Export & Form Copy Sheet Modal */}
      {isExportModalOpen && (
        <div
          onClick={() => setIsExportModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[88vh] bg-[#10131d] border border-[#242a3d] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-modal-pop"
          >
            <div className="px-5 py-4 border-b border-[#1e2334] flex items-center justify-between bg-[#131724]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Janitor AI Creation Export — {character.name}</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Download as a `.md` file or copy each field directly into Janitor AI’s character creation boxes.
                </p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
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
            </div>

            <div className="p-4 border-t border-[#1e2334] bg-[#131724] flex items-center justify-between gap-3">
              <span className="text-[11px] text-neutral-400">
                Rating: <strong className="text-purple-300">{janitorFields.rating}</strong>
              </span>
              <button
                onClick={() => downloadJanitorMarkdown(character)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Full .MD File</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
