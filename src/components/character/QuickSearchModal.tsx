/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Warden AI — Global Quick Search & Command Palette Modal
 * Fast searching across local library and online community characters,
 * with quick shortcuts to jump to views and scroll to top.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  X,
  MessageSquare,
  ArrowUp,
  Sparkles,
  Compass,
  Bookmark,
  ExternalLink,
  Flame,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Character } from '../../types';
import {
  CommunityCharacter,
  communityCatalogService
} from '../../services/communityCatalogService';
import { CatPulsingLoader } from '../common/CatPulsingLoader';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  onSelectCharacter: (char: Character) => void;
  onStartChat: (char: Character) => void;
  onNavigateToDiscover: () => void;
  onScrollDiscoverTop?: () => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  characters,
  onSelectCharacter,
  onStartChat,
  onNavigateToDiscover,
  onScrollDiscoverTop
}) => {
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'library' | 'community'>('all');
  const [communityResults, setCommunityResults] = useState<CommunityCharacter[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCommunityResults([]);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Global keyboard shortcut: Esc to close, Cmd+K / Ctrl+K / / to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter local library characters instantly
  const filteredLocalChars = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return characters.slice(0, 8);
    return characters.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.shortDescription?.toLowerCase().includes(q) ||
        c.creatorUsername?.toLowerCase().includes(q) ||
        c.tagSlugs?.some(t => t.toLowerCase().includes(q))
    ).slice(0, 12);
  }, [characters, query]);

  // Debounced search for community catalog
  useEffect(() => {
    const q = query.trim();
    if (!q || filterMode === 'library') {
      setCommunityResults([]);
      setIsLoadingCommunity(false);
      return;
    }

    setIsLoadingCommunity(true);
    const debounceTimer = setTimeout(() => {
      let active = true;
      communityCatalogService
        .getCharacters({ search: q, limit: 10 })
        .then(res => {
          if (active) {
            setCommunityResults(res.characters);
            setIsLoadingCommunity(false);
          }
        })
        .catch(() => {
          if (active) {
            setCommunityResults([]);
            setIsLoadingCommunity(false);
          }
        });
      return () => {
        active = false;
      };
    }, 280);

    return () => clearTimeout(debounceTimer);
  }, [query, filterMode]);

  const handleScrollTopAndClose = () => {
    onNavigateToDiscover();
    if (onScrollDiscoverTop) {
      onScrollDiscoverTop();
    }
    // Also dispatch global event
    window.dispatchEvent(new CustomEvent('warden:scroll-discover-top'));
    onClose();
  };

  const handleSelectLocal = (char: Character) => {
    onSelectCharacter(char);
    onClose();
  };

  const handleChatLocal = (char: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    onStartChat(char);
    onClose();
  };

  const handleSelectCommunity = (commChar: CommunityCharacter) => {
    // Open in Discover or convert
    onNavigateToDiscover();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-start sm:justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in">
        {/* Backdrop click area */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -16 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-[#0e1017] border-b sm:border border-[#222738] sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85dvh] overflow-hidden z-10"
          onClick={e => e.stopPropagation()}
        >
          {/* Header & Search Input */}
          <div className="p-3 sm:p-4 border-b border-[#1b1f2e] bg-[#121520] flex items-center gap-3">
            <Search className="w-5 h-5 text-purple-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Quick search characters, tags, creators..."
              className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-neutral-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer text-xs font-semibold px-2.5"
            >
              Cancel
            </button>
          </div>

          {/* Quick Action Bar (Filter pills & Auto Scroll to Top) */}
          <div className="px-3 sm:px-4 py-2 border-b border-[#1b1f2e] bg-[#0c0e14] flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#151824] text-neutral-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('library')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  filterMode === 'library'
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#151824] text-neutral-400 hover:text-white'
                }`}
              >
                <Bookmark className="w-3 h-3" />
                <span>My Library</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('community')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  filterMode === 'community'
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#151824] text-neutral-400 hover:text-white'
                }`}
              >
                <Compass className="w-3 h-3" />
                <span>Community</span>
              </button>
            </div>

            {/* Quick Auto Scroll to Top Shortcut */}
            <button
              type="button"
              onClick={handleScrollTopAndClose}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold cursor-pointer active:scale-95 transition-all"
              title="Jump to Explore page and scroll directly to the top"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Scroll Explore to Top</span>
            </button>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 divide-y divide-[#181c2b]">
            {/* Section 1: My Library Characters */}
            {(filterMode === 'all' || filterMode === 'library') && (
              <div className="space-y-2 pt-2 first:pt-0">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-purple-400" />
                    <span>My Library ({filteredLocalChars.length})</span>
                  </span>
                </div>

                {filteredLocalChars.length === 0 ? (
                  <div className="text-xs text-neutral-500 py-2">
                    {query ? 'No matching characters in library' : 'Library is empty'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredLocalChars.map(char => (
                      <div
                        key={char.id}
                        onClick={() => handleSelectLocal(char)}
                        className="group flex items-center gap-3 p-2.5 rounded-xl bg-[#131622] hover:bg-[#1a1e2e] border border-[#202538] hover:border-purple-500/50 transition-all cursor-pointer"
                      >
                        <img
                          src={char.avatarUrl}
                          alt={char.name}
                          className="w-11 h-11 rounded-lg object-cover bg-neutral-900 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">
                              {char.name}
                            </span>
                            {(char.contentRating === 'NSFW' || char.contentRating === 'Mature') && (
                              <span className="px-1 py-0.2 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded text-[9px] font-bold">
                                18+
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate">
                            {char.shortDescription || `@${char.creatorUsername || 'creator'}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={e => handleChatLocal(char, e)}
                          className="p-2 rounded-lg bg-purple-600/25 hover:bg-purple-600 text-purple-300 hover:text-white transition-colors cursor-pointer shrink-0"
                          title="Start Chat"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section 2: Online Community Characters */}
            {(filterMode === 'all' || filterMode === 'community') && query.trim() && (
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Online Community ({communityResults.length})</span>
                  </span>
                  {isLoadingCommunity && (
                    <span className="flex items-center gap-1.5 text-[11px] text-purple-400 font-normal lowercase">
                      <CatPulsingLoader size="xs" glow={false} />
                      searching...
                    </span>
                  )}
                </div>

                {communityResults.length === 0 && !isLoadingCommunity ? (
                  <div className="text-xs text-neutral-500 py-2">
                    No community characters found for "{query}"
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {communityResults.map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCommunity(c)}
                        className="group flex items-center gap-3 p-2.5 rounded-xl bg-[#131622] hover:bg-[#1a1e2e] border border-[#202538] hover:border-cyan-500/50 transition-all cursor-pointer"
                      >
                        <img
                          src={c.avatarUrl}
                          alt={c.name}
                          className="w-11 h-11 rounded-lg object-cover bg-neutral-900 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white truncate">
                              {c.name}
                            </span>
                            {c.isNsfw && (
                              <span className="px-1 py-0.2 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded text-[9px] font-bold">
                                18+
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400 truncate">
                            @{c.creatorName} • {(c.totalTokens || 0).toLocaleString()} tokens
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-cyan-400 transition-colors shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="p-2.5 px-4 bg-[#0a0c12] border-t border-[#181c2b] flex items-center justify-between text-[11px] text-neutral-500">
            <span className="hidden sm:inline">Press ESC to dismiss</span>
            <span className="text-neutral-400">
              Tip: Tapping <b>Scroll Explore to Top</b> instantly resets your feed view.
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
