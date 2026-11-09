/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Trash2,
  Sparkles,
  User as UserIcon,
  ChevronDown,
  Lock,
  CheckSquare,
  Square,
  Search
} from 'lucide-react';
import { Character, Conversation, Persona, User } from '../types';

interface ChatsListViewProps {
  conversations: Conversation[];
  characters: Character[];
  personas?: Persona[];
  currentUser: User;
  onResumeConversation: (conv: Conversation) => void;
  onDeleteConversation: (convId: string) => void;
  onStartNewChat?: (char: Character) => void;
  onViewCharacter?: (char: Character) => void;
  onNavigate: (view: string) => void;
}

type SortOption = 'latest' | 'oldest' | 'most_messages';

function replaceMacros(text: string, userName: string, charName: string): string {
  if (!text) return '';
  return text
    .replace(/`?\{\{user\}\}`?|`?\[\[user\]\]`?|<user>/gi, userName)
    .replace(/`?\{\{char\}\}`?|`?\[\[char\]\]`?|<char>/gi, charName);
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'just now';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `about ${diffMins}m ago`;
  if (diffHours < 24) return `about ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getTimeGroupLabel(dateStr?: string): 'Today' | 'This week' | 'This month' | 'Older' {
  if (!dateStr) return 'Today';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffHours / 24;

  if (diffHours < 24 && date.getDate() === now.getDate()) return 'Today';
  if (diffDays <= 7) return 'This week';
  if (diffDays <= 31) return 'This month';
  return 'Older';
}

export const ChatsListView: React.FC<ChatsListViewProps> = ({
  conversations,
  characters,
  personas = [],
  currentUser,
  onResumeConversation,
  onDeleteConversation,
  onStartNewChat,
  onViewCharacter,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Group conversations by characterId, sorted so the character with the most recent chat is on top
  const characterGroups = useMemo(() => {
    const map = new Map<string, Conversation[]>();
    for (const conv of conversations) {
      // Automatically ignore/remove conversations with 0 messages so empty character cards disappear
      if (!conv.messages || conv.messages.length === 0) continue;
      const list = map.get(conv.characterId) || [];
      list.push(conv);
      map.set(conv.characterId, list);
    }

    const groups = Array.from(map.entries()).map(([characterId, charConvs]) => {
      const char = characters.find(c => c.id === characterId);
      const sortedChats = [...charConvs].sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      const latestTimestamp = sortedChats[0]
        ? new Date(sortedChats[0].updatedAt || sortedChats[0].createdAt || 0).getTime()
        : 0;

      return {
        characterId,
        character: char,
        conversations: sortedChats,
        latestTimestamp
      };
    });

    // Sort character cards by most recent chat activity descending
    groups.sort((a, b) => b.latestTimestamp - a.latestTimestamp);

    if (!searchQuery.trim()) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(g => {
      const charName = g.character?.name?.toLowerCase() || '';
      const charSub = g.character?.subtitle?.toLowerCase() || '';
      const hasMatchingMsg = g.conversations.some(c =>
        c.messages.some(m => m.content.toLowerCase().includes(q))
      );
      return charName.includes(q) || charSub.includes(q) || hasMatchingMsg;
    });
  }, [conversations, characters, searchQuery]);

  // Exclusive single-open accordion state: ONLY 1 character card can be expanded at a time
  const [expandedCharId, setExpandedCharId] = useState<string | null>(() => {
    if (conversations.length === 0) return null;
    const newest = [...conversations].sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
    )[0];
    return newest ? newest.characterId : null;
  });

  // Track per-character "Character details" toggle
  const [detailsOpenCharIds, setDetailsOpenCharIds] = useState<Record<string, boolean>>({});

  // Track per-character sort mode ('latest' | 'oldest' | 'most_messages')
  const [sortByCharId, setSortByCharId] = useState<Record<string, SortOption>>({});

  // Track per-character "Select" mode and selected conversation IDs
  const [selectModeByCharId, setSelectModeByCharId] = useState<Record<string, boolean>>({});
  const [selectedConvIds, setSelectedConvIds] = useState<Record<string, boolean>>({});

  // Toggle character card: opening a card automatically closes any previously open card
  const toggleCharacterCard = (charId: string) => {
    setExpandedCharId(prev => (prev === charId ? null : charId));
  };

  const toggleCharacterDetails = (charId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDetailsOpenCharIds(prev => ({ ...prev, [charId]: !prev[charId] }));
  };

  const toggleSelectMode = (charId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectModeByCharId(prev => {
      const next = !prev[charId];
      if (!next) {
        setSelectedConvIds({});
      }
      return { ...prev, [charId]: next };
    });
  };

  const toggleConvSelection = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedConvIds(prev => ({ ...prev, [convId]: !prev[convId] }));
  };

  const handleDeleteSelectedForChar = (charConvs: Conversation[], charId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const toDelete = charConvs.filter(c => selectedConvIds[c.id]);
    if (toDelete.length === 0) return;
    toDelete.forEach(c => onDeleteConversation(c.id));
    setSelectModeByCharId(prev => ({ ...prev, [charId]: false }));
    setSelectedConvIds({});
  };

  const defaultPersona = personas.find(p => p.isDefault) || personas[0];

  return (
    <div className="max-w-3xl mx-auto pb-20 px-3 sm:px-6 space-y-4">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            <span>Your Chats</span>
          </h1>

          <button
            onClick={() => onNavigate('discover')}
            className="sm:hidden px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-purple-600/30"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discover</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {conversations.length > 0 && (
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search characters or messages..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#12151f] border border-[#222738] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/60"
              />
            </div>
          )}

          <button
            onClick={() => onNavigate('discover')}
            className="hidden sm:flex px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-purple-600/30 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Discover Characters</span>
          </button>
        </div>
      </div>

      {/* "All characters" Divider Header (matches Janitor AI layout) */}
      <div className="flex items-center gap-3 pt-1">
        <span className="text-xs sm:text-sm font-semibold text-neutral-300 shrink-0">
          All characters
        </span>
        <div className="h-px bg-[#232736] flex-1" />
      </div>

      {characterGroups.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#12151e]/80 border border-[#1f2434] rounded-2xl p-8">
          <div className="w-12 h-12 rounded-full bg-neutral-800/80 flex items-center justify-center text-neutral-400 mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No Active Roleplay Conversations</h3>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Choose a character from the discover catalog to start your first roleplay chat.
          </p>
          <button
            onClick={() => onNavigate('discover')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Explore Characters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {characterGroups.map(({ characterId, character: char, conversations: charConvs }) => {
            const isExpanded = expandedCharId === characterId;
            const isDetailsOpen = !!detailsOpenCharIds[characterId];
            const sortMode: SortOption = sortByCharId[characterId] || 'latest';
            const isSelectMode = !!selectModeByCharId[characterId];

            // Sort this character's conversations according to the active dropdown option
            const sortedCharConvs = [...charConvs].sort((a, b) => {
              if (sortMode === 'most_messages') {
                return b.messages.length - a.messages.length;
              }
              const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
              const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
              return sortMode === 'oldest' ? timeA - timeB : timeB - timeA;
            });

            // Group this character's conversations by time bucket ('Today', 'This week', 'This month', 'Older')
            const bucketOrder: Array<'Today' | 'This week' | 'This month' | 'Older'> = [
              'Today',
              'This week',
              'This month',
              'Older'
            ];
            const buckets = new Map<string, Conversation[]>();
            for (const c of sortedCharConvs) {
              const label = getTimeGroupLabel(c.updatedAt || c.createdAt);
              const list = buckets.get(label) || [];
              list.push(c);
              buckets.set(label, list);
            }

            const selectedCountForChar = charConvs.filter(c => selectedConvIds[c.id]).length;
            const charDisplayName = char?.name || charConvs[0]?.title || 'Character';
            const displayTitle = char?.subtitle
              ? `${char.name} — ${char.subtitle}`
              : charDisplayName;

            return (
              <div
                key={characterId}
                className={`bg-[#151821] border rounded-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-md ${
                  isExpanded
                    ? 'border-purple-500/40 shadow-lg shadow-purple-950/20'
                    : 'border-[#262b3d] hover:border-[#343b52]'
                }`}
              >
                {/* 1. Character Card Accordion Header */}
                <div
                  onClick={() => toggleCharacterCard(characterId)}
                  className={`p-3 sm:p-3.5 flex items-center justify-between gap-3.5 cursor-pointer select-none transition-colors duration-200 active:scale-[0.99] ${
                    isExpanded
                      ? 'bg-[#1b1f2c] border-b border-[#262b3d]'
                      : 'hover:bg-[#191d29]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <img
                      src={
                        char?.avatarUrl ||
                        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150'
                      }
                      alt={charDisplayName}
                      referrerPolicy="no-referrer"
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover shrink-0 bg-neutral-900 border border-white/10 transition-transform duration-300 ${
                        isExpanded ? 'scale-[1.03] ring-1 ring-purple-400/40' : ''
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-[15px] font-semibold text-white line-clamp-2 leading-snug">
                        {displayTitle}
                      </h3>
                      <p className="text-xs text-neutral-400 mt-1 font-medium">
                        chats: {charConvs.length}
                      </p>
                    </div>
                  </div>

                  <div className="pr-1 flex items-center gap-1.5 text-neutral-400 shrink-0">
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        charConvs.forEach(c => onDeleteConversation(c.id));
                      }}
                      className="p-2 text-neutral-400 hover:text-rose-400 active:text-rose-400 rounded-xl hover:bg-rose-500/15 active:bg-rose-500/20 transition-all cursor-pointer"
                      title="Delete all chats with this character and remove card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        isExpanded ? 'rotate-180 text-purple-300' : 'rotate-0'
                      }`}
                    />
                  </div>
                </div>

                {/* 2. Smoothly Animated Expanded Body (grid-rows-0fr -> grid-rows-1fr) */}
                <div
                  className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isExpanded
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden min-h-0">
                    <div className="p-3.5 sm:p-4 space-y-3.5 bg-[#13161f]">
                      {/* Top Action Row: "Start new chat" + "View character" */}
                      <div className="flex items-center flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            if (char && onStartNewChat) {
                              onStartNewChat(char);
                            }
                          }}
                          className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#df7afe] to-[#c084fc] hover:from-[#e894ff] hover:to-[#d8b4fe] text-[#170926] font-bold text-xs sm:text-sm shadow-md shadow-purple-950/40 transition-all active:scale-95 cursor-pointer"
                        >
                          Start new chat
                        </button>

                        {char && onViewCharacter && (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              onViewCharacter(char);
                            }}
                            className="px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-neutral-200 hover:text-purple-300 transition-colors cursor-pointer"
                          >
                            View character
                          </button>
                        )}
                      </div>

                      {/* Collapsible "Character details" toggle */}
                      {char && (
                        <div>
                          <button
                            type="button"
                            onClick={e => toggleCharacterDetails(characterId, e)}
                            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer py-0.5"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isDetailsOpen ? 'rotate-180 text-purple-300' : ''
                              }`}
                            />
                            <span>Character details</span>
                          </button>

                          <div
                            className={`grid transition-all duration-250 ease-out ${
                              isDetailsOpen
                                ? 'grid-rows-[1fr] opacity-100 mt-2'
                                : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                            }`}
                          >
                            <div className="overflow-hidden min-h-0">
                              <div className="p-3 rounded-xl bg-[#0e1017] border border-[#222738] text-xs text-neutral-300 space-y-2">
                                <p className="leading-relaxed whitespace-pre-wrap">
                                  {replaceMacros(
                                    char.shortDescription || char.background,
                                    defaultPersona?.name || currentUser.displayName,
                                    charDisplayName
                                  )}
                                </p>
                                {char.tagSlugs && char.tagSlugs.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {char.tagSlugs.map(slug => (
                                      <span
                                        key={slug}
                                        className="px-2 py-0.5 rounded-md bg-[#181c29] border border-[#272d42] text-[10px] text-purple-300 capitalize"
                                      >
                                        {slug.replace(/-/g, ' ')}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Sort Dropdown & Select Mode Bar */}
                      <div className="flex items-center justify-between gap-3 pt-0.5">
                        <div className="relative flex-1 max-w-[260px]">
                          <select
                            value={sortMode}
                            onChange={e =>
                              setSortByCharId(prev => ({
                                ...prev,
                                [characterId]: e.target.value as SortOption
                              }))
                            }
                            className="w-full bg-[#0d0f17] border border-[#262b3d] rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-purple-500/60 cursor-pointer"
                          >
                            <option value="latest">Latest</option>
                            <option value="oldest">Oldest</option>
                            <option value="most_messages">Most messages</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          {isSelectMode && selectedCountForChar > 0 && (
                            <button
                              type="button"
                              onClick={e => handleDeleteSelectedForChar(charConvs, characterId, e)}
                              className="px-2.5 py-1 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete ({selectedCountForChar})</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={e => toggleSelectMode(characterId, e)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              isSelectMode
                                ? 'bg-purple-600/25 text-purple-300 border border-purple-500/40'
                                : 'text-purple-400 hover:text-purple-300 hover:bg-white/5'
                            }`}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>{isSelectMode ? 'Done' : 'Select'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Time-Grouped Chat Session Cards */}
                      <div className="space-y-4 pt-1">
                        {bucketOrder.map(bucketLabel => {
                          const bucketConvs = buckets.get(bucketLabel);
                          if (!bucketConvs || bucketConvs.length === 0) return null;

                          return (
                            <div key={bucketLabel} className="space-y-2.5">
                              {/* Time group divider: e.g. "Today ───────────────" */}
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-neutral-400 shrink-0">
                                  {bucketLabel}
                                </span>
                                <div className="h-px bg-[#222738] flex-1" />
                              </div>

                              {/* Individual Chat Session Sub-Cards */}
                              <div className="space-y-2.5">
                                {bucketConvs.map(conv => {
                                  const convPersona =
                                    personas.find(p => p.id === conv.personaId) || defaultPersona;
                                  const personaName =
                                    convPersona?.name || currentUser.displayName || 'User';
                                  const personaAvatar =
                                    convPersona?.avatarUrl || currentUser.avatarUrl;

                                  const lastMsg = conv.messages[conv.messages.length - 1];
                                  const resolvedMsgText = lastMsg
                                    ? replaceMacros(lastMsg.content, personaName, charDisplayName)
                                        .replace(/[*_~`]/g, '')
                                        .replace(/\s+/g, ' ')
                                        .trim()
                                    : '';
                                  const sneakPeek = resolvedMsgText
                                    ? resolvedMsgText.slice(0, 130) +
                                      (resolvedMsgText.length > 130 ? '...' : '')
                                    : 'No messages yet...';

                                  const isChecked = !!selectedConvIds[conv.id];

                                  return (
                                    <div
                                      key={conv.id}
                                      onClick={e => {
                                        if (isSelectMode) {
                                          toggleConvSelection(conv.id, e);
                                        } else {
                                          onResumeConversation(conv);
                                        }
                                      }}
                                      className={`group relative rounded-2xl bg-[#1c202c] hover:bg-[#232838] border transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] p-3.5 pl-4 cursor-pointer shadow-sm ${
                                        isChecked
                                          ? 'border-purple-500 bg-purple-950/20'
                                          : 'border-[#2c3246] hover:border-purple-400/50'
                                      }`}
                                    >
                                      {/* Left Purple Vertical Accent Bar */}
                                      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-purple-400/85" />

                                      {/* Sub-Card Top Metadata Row */}
                                      <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                          {isSelectMode ? (
                                            <button
                                              type="button"
                                              onClick={e => toggleConvSelection(conv.id, e)}
                                              className="text-purple-400 hover:text-purple-300 shrink-0"
                                            >
                                              {isChecked ? (
                                                <CheckSquare className="w-4 h-4" />
                                              ) : (
                                                <Square className="w-4 h-4 text-neutral-500" />
                                              )}
                                            </button>
                                          ) : (
                                            <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                          )}

                                          <span className="text-xs text-neutral-400 shrink-0">
                                            {formatRelativeTime(conv.updatedAt || conv.createdAt)}
                                          </span>

                                          {/* User Persona Pill: "[avatar] as Haru Shinozaki" */}
                                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#2a3042] border border-white/10 max-w-full">
                                            {personaAvatar ? (
                                              <img
                                                src={personaAvatar}
                                                alt={personaName}
                                                className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                                              />
                                            ) : (
                                              <UserIcon className="w-3 h-3 text-purple-300 shrink-0" />
                                            )}
                                            <span className="text-[11px] text-neutral-200 font-medium truncate max-w-[160px]">
                                              as {personaName}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Right side: Message count + Hover Delete */}
                                        <div className="flex items-center gap-2 shrink-0">
                                          <div
                                            className="flex items-center gap-1 text-xs font-bold text-neutral-200"
                                            title={`${conv.messages.length} messages`}
                                          >
                                            <MessageSquare className="w-3.5 h-3.5 text-neutral-400" />
                                            <span>{conv.messages.length}</span>
                                          </div>

                                          {!isSelectMode && (
                                            <button
                                              type="button"
                                              onClick={e => {
                                                e.stopPropagation();
                                                onDeleteConversation(conv.id);
                                              }}
                                              className="opacity-100 p-1.5 text-neutral-400 hover:text-rose-400 active:text-rose-400 rounded-lg hover:bg-rose-500/15 active:bg-rose-500/20 transition-all cursor-pointer"
                                              title="Delete this chat session"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Bottom 2-line Sneak Peek of Last Message */}
                                      <p className="mt-2 text-xs sm:text-[13px] text-neutral-100 line-clamp-2 leading-relaxed font-sans">
                                        {sneakPeek}
                                      </p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
