/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  Flame,
  Heart,
  Compass,
  Bookmark,
  RefreshCw,
  Loader2,
  AlertCircle,
  Globe,
  Eye,
  EyeOff,
  Users,
  UserCheck,
  CheckCircle2,
  ArrowUp
} from 'lucide-react';
import { Character, ContentRating, Tag } from '../types';
import { CharacterCard } from '../components/character/CharacterCard';
import { TagFilterDrawer } from '../components/character/TagFilterDrawer';
import { DatacatHubView } from '../components/character/DatacatHubView';
import { CustomSelect } from '../components/common/CustomSelect';
import { ImportedCardData } from '../services/characterImportService';
import {
  CommunityCharacter,
  CommunityCharacterDetail,
  POPULAR_COMMUNITY_CATEGORIES,
  communityCatalogService,
  CommunityCatalogSource
} from '../services/communityCatalogService';
import { CommunityCharacterCard } from '../components/character/CommunityCharacterCard';
import { CommunityCharacterModal } from '../components/character/CommunityCharacterModal';
import { storageService } from '../services/storageService';
import { CatPulsingLoader } from '../components/common/CatPulsingLoader';

interface DiscoverViewProps {
  characters: Character[];
  allTags: Tag[];
  selectedTagSlugs: string[];
  onToggleTag: (slug: string) => void;
  onClearTags: () => void;
  onSelectCharacter: (char: Character) => void;
  onStartChat: (char: Character) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onToggleLike: (id: string) => void;
  contentRating: ContentRating;
  onChangeContentRating: (rating: ContentRating) => void;
  blurNsfw: boolean;
  onAddNewTag: (name: string, category: any) => void;
  onOpenImportModal?: () => void;
  onImportCard?: (card: ImportedCardData) => void;
  currentUserId?: string;
  onViewCreatorProfile?: (creatorIdentifier: string) => void;
  /** When true, switch to Explore All, scroll to top and focus the search input */
  focusSearchRequest?: boolean;
  onSearchFocusHandled?: () => void;
}

type DiscoverTab = 'community' | 'library' | 'webhub';
type EntityMode = 'characters' | 'creators';
type ScopeMode = 'all' | 'following' | 'favorites';
type CatalogSort = 'latest' | 'trending' | 'popular';

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  characters,
  allTags,
  selectedTagSlugs,
  onToggleTag,
  onClearTags,
  onSelectCharacter,
  onStartChat,
  isBookmarked,
  onToggleBookmark,
  onToggleLike,
  contentRating,
  onChangeContentRating,
  blurNsfw,
  onAddNewTag,
  onOpenImportModal,
  onImportCard,
  currentUserId = 'default',
  onViewCreatorProfile,
  focusSearchRequest = false,
  onSearchFocusHandled
}) => {
  // Main view tab
  const [activeTab, setActiveTab] = useState<DiscoverTab>('community');
  const communityScrollRef = useRef<HTMLDivElement | null>(null);
  const communitySearchInputRef = useRef<HTMLInputElement | null>(null);

  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  // Global listener: jump to Explore All and scroll directly to top
  useEffect(() => {
    const handleScrollTop = () => {
      setActiveTab('community');
      if (communityScrollRef.current) {
        communityScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('warden:scroll-discover-top', handleScrollTop);
    return () => window.removeEventListener('warden:scroll-discover-top', handleScrollTop);
  }, []);

  // Header Search button: jump to Explore All, scroll to top, focus search box
  useEffect(() => {
    if (!focusSearchRequest) return;
    setActiveTab('community');
    const t = setTimeout(() => {
      communityScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      communitySearchInputRef.current?.focus({ preventScroll: true });
      onSearchFocusHandled?.();
    }, 60);
    return () => clearTimeout(t);
  }, [focusSearchRequest, onSearchFocusHandled]);

  // Community State
  const [communityCharacters, setCommunityCharacters] = useState<CommunityCharacter[]>([]);
  const [communityTotalCount, setCommunityTotalCount] = useState<number>(214520);
  const [communityHasMore, setCommunityHasMore] = useState<boolean>(true);
  const [communityLoading, setCommunityLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // Image 3 Segmented Controls State
  const [entityMode, setEntityMode] = useState<EntityMode>('characters');
  const [isSwitchingEntity, setIsSwitchingEntity] = useState<boolean>(false);

  const handleSwitchEntityMode = (mode: EntityMode) => {
    if (mode === entityMode) return;
    setEntityMode(mode);
    setIsSwitchingEntity(true);
    setTimeout(() => {
      setIsSwitchingEntity(false);
    }, 220);
  };

  const [sfwOnly, setSfwOnly] = useState<boolean>(false);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('all');
  const [communitySort, setCommunitySort] = useState<CatalogSort>('latest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [tagsExpanded, setTagsExpanded] = useState<boolean>(false);

  // Community Search & Tag Selection
  const [communitySearch, setCommunitySearch] = useState<string>('');
  const [communitySearchInput, setCommunitySearchInput] = useState<string>('');
  const [communitySelectedCategories, setCommunitySelectedCategories] = useState<string[]>(['all']);
  const [selectedCommunityChar, setSelectedCommunityChar] = useState<CommunityCharacter | null>(null);

  // Followed creators state (synced with storageService)
  const [followedCreators, setFollowedCreators] = useState(() =>
    storageService.getFollowedCreators(currentUserId)
  );

  useEffect(() => {
    const refreshFollows = () => {
      setFollowedCreators(storageService.getFollowedCreators(currentUserId));
    };
    window.addEventListener('warden-follows-updated', refreshFollows);

    const handleSearchTagEvent = (e: any) => {
      const tag = e.detail?.tag;
      if (tag) {
        setActiveTab('community');
        setScopeMode('all');
        setCommunitySelectedCategories(['all']);
        setCommunitySearchInput(tag);
        setCommunitySearch(tag);
        setCurrentPage(1);
      }
    };
    window.addEventListener('warden-search-tag', handleSearchTagEvent);

    return () => {
      window.removeEventListener('warden-follows-updated', refreshFollows);
      window.removeEventListener('warden-search-tag', handleSearchTagEvent);
    };
  }, [currentUserId]);

  const tagStripRef = useRef<HTMLDivElement>(null);

  const scrollTagStrip = (dir: 'left' | 'right') => {
    if (!tagStripRef.current) return;
    tagStripRef.current.scrollBy({
      left: dir === 'left' ? -280 : 280,
      behavior: 'smooth'
    });
  };

  const handleToggleCategory = (val: string) => {
    setCurrentPage(1);
    if (val === 'all') {
      setCommunitySelectedCategories(['all']);
      return;
    }
    setCommunitySelectedCategories(prev => {
      const withoutAll = prev.filter(c => c !== 'all');
      if (withoutAll.includes(val)) {
        const next = withoutAll.filter(c => c !== val);
        return next.length === 0 ? ['all'] : next;
      } else {
        return [...withoutAll, val];
      }
    });
  };

  // Local library filter & search states
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCategory, setLibraryCategory] = useState<string>('all');
  const [librarySort, setLibrarySort] = useState<'trending' | 'latest' | 'popular'>('trending');
  const [isTagDrawerOpen, setIsTagDrawerOpen] = useState(false);
  const [catalogSource, setCatalogSource] = useState<CommunityCatalogSource>(() =>
    communityCatalogService.getActiveSource()
  );

  const handleSourceChange = (source: CommunityCatalogSource) => {
    communityCatalogService.setActiveSource(source);
    setCatalogSource(source);
    setCurrentPage(1);
  };

  useEffect(() => {
    const handleSourceChanged = (e: any) => {
      if (e.detail?.source && e.detail.source !== catalogSource) {
        setCatalogSource(e.detail.source);
        setCurrentPage(1);
      }
    };
    window.addEventListener('warden:catalog-source-changed', handleSourceChanged);
    return () => window.removeEventListener('warden:catalog-source-changed', handleSourceChanged);
  }, [catalogSource]);

  // Toast notification for imports & follows
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleFollowCreator = (creatorName: string, avatarUrl?: string) => {
    // Gather known character IDs for this creator so future uploads can be diffed
    const knownIds = communityCharacters
      .filter(c => c.creatorName.toLowerCase() === creatorName.toLowerCase())
      .map(c => c.id);

    const isNowFollowing = storageService.toggleFollowCreator(
      currentUserId,
      creatorName,
      avatarUrl,
      knownIds
    );
    setFollowedCreators(storageService.getFollowedCreators(currentUserId));
    showToast(
      isNowFollowing
        ? `🔔 Following @${creatorName}! You'll be notified when they upload new bots.`
        : `Unfollowed @${creatorName}`
    );
  };

  const handleToggleCommunityFavorite = (char: CommunityCharacter) => {
    const prefixedId = `datacat_${char.id}`;
    onToggleBookmark(prefixedId);
    storageService.toggleSavedCommunityFavorite(char);
  };

  // ─── Fetch Community Characters ───────────────────────────────────────────
  const PAGE_SIZE = 24;

  const fetchCommunityCharacters = useCallback(
    async (pageNum = currentPage, forceRefresh = false) => {
      try {
        if (pageNum === 1) {
          setCommunityLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setCommunityError(null);

        // Scope 1: Favorites (saved locally)
        if (scopeMode === 'favorites') {
          let favs: CommunityCharacter[] = storageService.getSavedCommunityFavorites();
          if (sfwOnly) {
            favs = favs.filter(c => !c.isNsfw);
          }
          if (communitySearch.trim()) {
            const q = communitySearch.toLowerCase();
            favs = favs.filter(
              c =>
                c.name.toLowerCase().includes(q) ||
                c.creatorName.toLowerCase().includes(q) ||
                (c.shortDescription || '').toLowerCase().includes(q)
            );
          }
          setCommunityCharacters(favs);
          setCommunityTotalCount(favs.length);
          setCommunityHasMore(false);
          setCommunityLoading(false);
          setIsLoadingMore(false);
          return;
        }

        // Scope 2: Following (fetch bots from followed @creators)
        if (scopeMode === 'following') {
          const currentFollows = storageService.getFollowedCreators(currentUserId);
          if (currentFollows.length === 0) {
            setCommunityCharacters([]);
            setCommunityTotalCount(0);
            setCommunityHasMore(false);
            setCommunityLoading(false);
            setIsLoadingMore(false);
            return;
          }

          const handlesCsv = currentFollows.map(f => f.creatorName).join(',');
          const result = await communityCatalogService.getCharacters({
            creators: handlesCsv,
            search: communitySearch,
            limit: PAGE_SIZE,
            offset: (pageNum - 1) * PAGE_SIZE,
            sort: communitySort,
            sfwOnly,
            source: catalogSource,
            forceRefresh
          });

          // Automatically check for new uploads from followed creators & push bell notification!
          storageService.recordAndNotifyCreatorUploads(currentUserId, result.characters);

          setCommunityCharacters(prev =>
            pageNum === 1
              ? result.characters
              : [...prev, ...result.characters.filter(n => !prev.some(p => p.id === n.id))]
          );
          setCommunityTotalCount(result.totalCount);
          setCommunityHasMore(result.hasMore);
          setCommunityLoading(false);
          setIsLoadingMore(false);
          return;
        }

        // Scope 3: All Community Characters
        const activeCategories = POPULAR_COMMUNITY_CATEGORIES.filter(
          c => communitySelectedCategories.includes(c.value) && c.tagId
        );
        const tagIds = activeCategories.map(c => c.tagId).join(',');
        const offset = (pageNum - 1) * PAGE_SIZE;

        const result = await communityCatalogService.getCharacters({
          search: communitySearch,
          tagIds,
          limit: PAGE_SIZE,
          offset,
          sort: communitySort,
          sfwOnly,
          source: catalogSource,
          forceRefresh
        });

        // Also run background upload diff check if any followed creator appears in feed
        storageService.recordAndNotifyCreatorUploads(currentUserId, result.characters);

        setCommunityCharacters(prev =>
          pageNum === 1
            ? result.characters
            : [...prev, ...result.characters.filter(n => !prev.some(p => p.id === n.id))]
        );
        setCommunityTotalCount(result.totalCount);
        setCommunityHasMore(result.hasMore);
      } catch (err: any) {
        console.error('[DiscoverView] Error fetching community cards:', err);
        setCommunityError(
          err?.message || 'Could not load community catalog. Please verify server is running.'
        );
      } finally {
        setCommunityLoading(false);
        setIsLoadingMore(false);
      }
    },
    [
      currentPage,
      scopeMode,
      sfwOnly,
      communitySearch,
      communitySelectedCategories,
      communitySort,
      catalogSource,
      currentUserId
    ]
  );

  // Trigger fetch on filter/page changes
  useEffect(() => {
    if (activeTab === 'community') {
      fetchCommunityCharacters(currentPage);
    }
  }, [
    communitySearch,
    communitySelectedCategories,
    communitySort,
    catalogSource,
    scopeMode,
    sfwOnly,
    currentPage,
    activeTab
  ]);

  // Unlimited Infinite Scroll Observer
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || activeTab !== 'community' || entityMode !== 'characters' || scopeMode === 'favorites') {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        if (
          entry?.isIntersecting &&
          communityHasMore &&
          !communityLoading &&
          !isLoadingMore &&
          communityCharacters.length > 0
        ) {
          setCurrentPage(prev => prev + 1);
        }
      },
      { rootMargin: '420px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    activeTab,
    entityMode,
    scopeMode,
    communityHasMore,
    communityLoading,
    isLoadingMore,
    communityCharacters.length
  ]);

  const handleCommunitySearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setCommunitySearch(communitySearchInput);
  };

  // ─── Direct Import & Chat Handlers ─────────────────────────────────────────
  const handleImportCommunityChar = async (
    char: CommunityCharacter,
    detail?: CommunityCharacterDetail
  ) => {
    try {
      let fullDetail = detail;
      if (!fullDetail) {
        fullDetail = await communityCatalogService.getCharacterDetail(char.id);
      }
      const importedData = communityCatalogService.toImportedCardData(char, fullDetail);
      if (onImportCard) {
        onImportCard(importedData);
      }
      showToast(`✨ Successfully imported "${char.name}" into My Library!`);
      setSelectedCommunityChar(null);
    } catch (err: any) {
      console.error('[DiscoverView] Import error:', err);
      const importedData = communityCatalogService.toImportedCardData(char);
      if (onImportCard) {
        onImportCard(importedData);
      }
      showToast(`✨ Imported "${char.name}" into My Library!`);
      setSelectedCommunityChar(null);
    }
  };

  const handleStartChatCommunityChar = async (
    char: CommunityCharacter,
    detail?: CommunityCharacterDetail
  ) => {
    try {
      let fullDetail = detail;
      if (!fullDetail) {
        fullDetail = await communityCatalogService.getCharacterDetail(char.id);
      }
      const importedData = communityCatalogService.toImportedCardData(char, fullDetail);
      if (onImportCard) {
        onImportCard(importedData);
      }
      setSelectedCommunityChar(null);
      const localChar = characters.find(c => c.name.toLowerCase() === char.name.toLowerCase());
      if (localChar) {
        onStartChat(localChar);
      }
    } catch (err: any) {
      console.error('[DiscoverView] Start chat error:', err);
      const importedData = communityCatalogService.toImportedCardData(char);
      if (onImportCard) {
        onImportCard(importedData);
      }
      setSelectedCommunityChar(null);
    }
  };

  // Aggregate unique creators from current community feed + followed creators for "Creators" view mode
  const creatorProfiles = useMemo(() => {
    const map = new Map<
      string,
      {
        creatorName: string;
        avatarUrl: string;
        botCount: number;
        totalChats: number;
        sampleBots: string[];
      }
    >();

    // Include followed creators first
    for (const fc of followedCreators) {
      map.set(fc.creatorName.toLowerCase(), {
        creatorName: fc.creatorName,
        avatarUrl:
          fc.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        botCount: Math.max(fc.knownCharacterIds?.length || 1, 1),
        totalChats: 0,
        sampleBots: []
      });
    }

    for (const c of communityCharacters) {
      const key = (c.creatorName || 'Community Creator').toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.botCount += 1;
        existing.totalChats += c.chatCount || c.messageCount || 0;
        if (existing.sampleBots.length < 3 && !existing.sampleBots.includes(c.name)) {
          existing.sampleBots.push(c.name);
        }
      } else {
        map.set(key, {
          creatorName: c.creatorName || 'Community Creator',
          avatarUrl: c.avatarUrl,
          botCount: 1,
          totalChats: c.chatCount || c.messageCount || 0,
          sampleBots: [c.name]
        });
      }
    }

    return Array.from(map.values());
  }, [communityCharacters, followedCreators]);

  // ─── Filter and sort local characters ─────────────────────────────────────
  const filteredLocalCharacters = useMemo(() => {
    let list = characters.filter(char => {
      if (char.publicationStatus !== 'published' || char.visibility === 'private') {
        return false;
      }

      if (libraryCategory !== 'all') {
        const matchesTag = char.tagSlugs.some(
          t =>
            t.toLowerCase() === libraryCategory.toLowerCase() ||
            t.toLowerCase().includes(libraryCategory.toLowerCase())
        );
        if (!matchesTag) return false;
      }

      if (librarySearch.trim()) {
        const query = librarySearch.toLowerCase();
        const matchesName = char.name.toLowerCase().includes(query);
        const matchesDesc = (char.shortDescription || '').toLowerCase().includes(query);
        const matchesSubtitle = (char.subtitle || '').toLowerCase().includes(query);
        const matchesCreator = (char.creatorUsername || '').toLowerCase().includes(query);
        const matchesTags = char.tagSlugs.some(t => t.toLowerCase().includes(query));

        if (!matchesName && !matchesDesc && !matchesSubtitle && !matchesCreator && !matchesTags) {
          return false;
        }
      }

      if (selectedTagSlugs.length > 0) {
        const hasAny = selectedTagSlugs.some(slug => char.tagSlugs.includes(slug));
        if (!hasAny) return false;
      }

      return true;
    });

    if (librarySort === 'trending') {
      list = [...list].sort((a, b) => b.chatCount - a.chatCount);
    } else if (librarySort === 'latest') {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (librarySort === 'popular') {
      list = [...list].sort((a, b) => b.likeCount - a.likeCount);
    }

    return list;
  }, [characters, libraryCategory, librarySearch, selectedTagSlugs, librarySort]);

  const totalPages = Math.max(1, Math.min(295, Math.ceil(communityTotalCount / PAGE_SIZE)));

  const getVisiblePageNumbers = () => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0b0e] overflow-hidden relative min-h-0">
      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-purple-950/95 border border-purple-500/50 text-purple-200 text-xs font-semibold rounded-xl shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Top Header Toolbar ── */}
      <div className="h-13 px-4 sm:px-6 bg-[#0c0e14] border-b border-[#1b1e28] flex items-center justify-between shrink-0 z-20">
        {/* Left: Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#12151e] border border-[#1b1e28] rounded-xl">
          <button
            onClick={() => setActiveTab('community')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'community'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Explore All</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'library'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>My Library</span>
            <span className="px-1.5 py-0.2 bg-[#1b1e28] text-neutral-300 rounded text-[10px] font-semibold">
              {characters.length}
            </span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {activeTab === 'community' && (
            <>
              {/* Catalog Source Switcher: JanitorAI <-> Chub.ai with Framer Motion layoutId */}
              <div className="relative inline-flex items-center bg-[#12151e] p-0.5 rounded-lg border border-[#1b1e28] select-none">
                <button
                  type="button"
                  onClick={() => handleSourceChange('janitor')}
                  className="relative px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer"
                  title="Browse JanitorAI characters"
                >
                  {catalogSource === 'janitor' && (
                    <motion.span
                      layoutId="discoverCatalogPill"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      className="absolute inset-0 bg-purple-600 rounded-md shadow-xs"
                    />
                  )}
                  <span className={`relative z-10 transition-colors ${catalogSource === 'janitor' ? 'text-white' : 'text-neutral-400 hover:text-white'}`}>
                    JanitorAI
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSourceChange('chub')}
                  className="relative px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer"
                  title="Browse Chub.ai / Charhub characters"
                >
                  {catalogSource === 'chub' && (
                    <motion.span
                      layoutId="discoverCatalogPill"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      className="absolute inset-0 bg-purple-600 rounded-md shadow-xs"
                    />
                  )}
                  <span className={`relative z-10 transition-colors ${catalogSource === 'chub' ? 'text-white' : 'text-neutral-400 hover:text-white'}`}>
                    Chub.ai
                  </span>
                </button>
              </div>

              {onOpenImportModal && (
                <button
                  onClick={onOpenImportModal}
                  className="px-3 py-1.5 rounded-lg bg-[#1b1e28] hover:bg-[#252a39] text-xs font-semibold text-neutral-200 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Upload custom PNG Card or JSON"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline">Upload PNG Card</span>
                </button>
              )}

              <button
                onClick={() => fetchCommunityCharacters(currentPage, true)}
                disabled={communityLoading}
                className="p-1.5 rounded-lg bg-[#12151e] hover:bg-[#1b1e28] border border-[#1b1e28] text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh Catalog Feed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${communityLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={() => setActiveTab('webhub')}
                className="p-1.5 rounded-lg bg-[#12151e] hover:bg-[#1b1e28] border border-[#1b1e28] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Switch to Raw Web Hub View"
              >
                <Globe className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {activeTab === 'library' && onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-purple-950/40 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Import Card</span>
            </button>
          )}

          {activeTab === 'webhub' && (
            <button
              onClick={() => setActiveTab('community')}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Back to Native View</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 w-full min-h-0 overflow-hidden flex flex-col">
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: EXPLORE ALL CATALOG (Image 3 Layout) */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'community' && (
          <div
            ref={communityScrollRef}
            onScroll={e => setShowScrollTop(e.currentTarget.scrollTop > 350)}
            className="w-full h-full overflow-y-auto px-3 sm:px-6 py-4 space-y-4 pb-28 max-w-7xl mx-auto"
          >
            {/* Search Bar */}
            <form onSubmit={handleCommunitySearchSubmit} className="flex items-center gap-2.5">
              <div className="flex-1 relative flex items-center">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
                <input
                  ref={communitySearchInputRef}
                  type="text"
                  value={communitySearchInput}
                  onChange={e => setCommunitySearchInput(e.target.value)}
                  placeholder="Search characters, tags, or @creator (e.g. #slowburn, #romance, @Mayu0910)..."
                  className="w-full bg-[#131620] border border-[#222738] rounded-xl pl-10 pr-16 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                {communitySearchInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCommunitySearchInput('');
                      setCommunitySearch('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 p-1 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="absolute right-3 text-[10px] font-mono text-neutral-400 bg-[#1a1f2e] border border-[#262d42] px-2 py-0.5 rounded">
                    Enter
                  </span>
                )}
              </div>
            </form>

            {/* ROW 1: Horizontal #Tag Strip with Scroll & Expand Controls (Matches Image 3) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTagsExpanded(prev => !prev)}
                className={`p-2 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                  !communitySelectedCategories.includes('all')
                    ? 'bg-purple-600/25 border-purple-500/50 text-purple-300'
                    : 'bg-[#171a26] border-[#262b3d] text-neutral-300 hover:text-white'
                }`}
                title="Toggle tag list view"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              <div
                ref={tagStripRef}
                data-horizontal-scroll="true"
                role="tablist"
                className={`flex-1 flex items-center gap-2 ${
                  tagsExpanded ? 'flex-wrap' : 'overflow-x-auto scrollbar-none'
                } py-0.5`}
              >
                {POPULAR_COMMUNITY_CATEGORIES.map((chip, idx) => {
                  const isSelected = communitySelectedCategories.includes(chip.value);
                  // Alternating subtle border tint like Janitor AI's #tag strip
                  const borderColors = [
                    'border-[#3b3454] text-purple-200',
                    'border-[#2b4c59] text-cyan-200',
                    'border-[#52344e] text-pink-200',
                    'border-[#364f3e] text-emerald-200'
                  ];
                  const accentClass = borderColors[idx % borderColors.length];

                  return (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => handleToggleCategory(chip.value)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border active:scale-95 ${
                        isSelected
                          ? 'bg-purple-600/40 border-purple-400 text-white font-bold shadow-sm shadow-purple-950/50'
                          : `bg-[#151822]/90 hover:bg-[#1d2230] ${accentClass}`
                      }`}
                    >
                      {chip.value === 'all' ? 'All Tags' : `#${chip.value}`}
                    </button>
                  );
                })}
              </div>

              {!tagsExpanded && (
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => scrollTagStrip('left')}
                    className="p-1.5 rounded-lg bg-[#171a26] hover:bg-[#222738] border border-[#262b3d] text-neutral-300 cursor-pointer"
                    title="Scroll tags left"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollTagStrip('right')}
                    className="p-1.5 rounded-lg bg-[#171a26] hover:bg-[#222738] border border-[#262b3d] text-neutral-300 cursor-pointer"
                    title="Scroll tags right"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setTagsExpanded(prev => !prev)}
                className="p-1.5 rounded-lg bg-[#171a26] hover:bg-[#222738] border border-[#262b3d] text-neutral-300 cursor-pointer shrink-0"
                title={tagsExpanded ? 'Collapse tags' : 'Expand all tags'}
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    tagsExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>

            {/* ROW 2: Segmented Pill Filters + Sort Dropdown (Matches Image 3) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Pill Group 1: Characters | Creators with Framer Motion layoutId */}
                <div className="relative inline-flex items-center p-1 rounded-full bg-[#151823] border border-[#262b3d] select-none">
                  <button
                    type="button"
                    onClick={() => handleSwitchEntityMode('characters')}
                    className="relative px-3.5 py-1 text-xs font-bold transition-colors cursor-pointer rounded-full"
                  >
                    {entityMode === 'characters' && (
                      <motion.span
                        layoutId="discoverEntityPill"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute inset-0 bg-gradient-to-r from-purple-700 to-fuchsia-700 border border-purple-400/40 rounded-full shadow-sm shadow-purple-950/50"
                      />
                    )}
                    <span className={`relative z-10 transition-colors ${entityMode === 'characters' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'}`}>
                      Characters
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchEntityMode('creators')}
                    className="relative px-3.5 py-1 text-xs font-bold transition-colors cursor-pointer rounded-full"
                  >
                    {entityMode === 'creators' && (
                      <motion.span
                        layoutId="discoverEntityPill"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute inset-0 bg-gradient-to-r from-purple-700 to-fuchsia-700 border border-purple-400/40 rounded-full shadow-sm shadow-purple-950/50"
                      />
                    )}
                    <span className={`relative z-10 transition-colors ${entityMode === 'creators' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'}`}>
                      Creators
                    </span>
                  </button>
                </div>

                {/* Pill Group 2: All | Limited Only (SFW) with Framer Motion layoutId */}
                <div className="relative inline-flex items-center p-1 rounded-full bg-[#151823] border border-[#262b3d] select-none">
                  <button
                    type="button"
                    onClick={() => {
                      if (!sfwOnly) return;
                      setSfwOnly(false);
                      setCurrentPage(1);
                    }}
                    className="relative px-3 py-1 text-xs font-bold transition-colors cursor-pointer rounded-full"
                  >
                    {!sfwOnly && (
                      <motion.span
                        layoutId="discoverSfwPill"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute inset-0 bg-gradient-to-r from-purple-700 to-fuchsia-700 border border-purple-400/40 rounded-full shadow-sm shadow-purple-950/50"
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 transition-colors ${!sfwOnly ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'}`}>
                      <Eye className="w-3.5 h-3.5" />
                      <span>All</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (sfwOnly) return;
                      setSfwOnly(true);
                      setCurrentPage(1);
                    }}
                    className="relative px-3 py-1 text-xs font-bold transition-colors cursor-pointer rounded-full"
                  >
                    {sfwOnly && (
                      <motion.span
                        layoutId="discoverSfwPill"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute inset-0 bg-gradient-to-r from-purple-700 to-fuchsia-700 border border-purple-400/40 rounded-full shadow-sm shadow-purple-950/50"
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 transition-colors ${sfwOnly ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'}`}>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Limited Only</span>
                    </span>
                  </button>
                </div>

                {/* Pill Group 3: All | Following | Favorites with Framer Motion layoutId */}
                <div className="relative inline-flex items-center p-1 rounded-full bg-[#151823] border border-[#262b3d] select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setScopeMode('all');
                      setCurrentPage(1);
                    }}
                    className="relative px-3 py-1 text-xs font-bold transition-colors cursor-pointer rounded-full"
                  >
                    {scopeMode === 'all' && (
                      <motion.span
                        layoutId="discoverScopePill"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute inset-0 bg-gradient-to-r from-purple-700 to-fuchsia-700 border border-purple-400/40 rounded-full shadow-sm shadow-purple-950/50"
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 transition-colors ${scopeMode === 'all' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'}`}>
                      <Globe className="w-3.5 h-3.5" />
                      <span>All</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScopeMode('following');
                      setCurrentPage(1);
                    }}
                    className="relative px-3 py-1 text-xs font-bold transition-colors cursor-pointer rounded-full"
                  >
                    {scopeMode === 'following' && (
                      <motion.span
                        layoutId="discoverScopePill"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute inset-0 bg-gradient-to-r from-purple-700 to-fuchsia-700 border border-purple-400/40 rounded-full shadow-sm shadow-purple-950/50"
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 transition-colors ${scopeMode === 'following' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'}`}>
                      <Users className="w-3.5 h-3.5" />
                      <span>Following</span>
                      {followedCreators.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] text-purple-200">
                          {followedCreators.length}
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScopeMode('favorites');
                      setCurrentPage(1);
                    }}
                    className="relative px-3 py-1 text-xs font-bold transition-colors cursor-pointer rounded-full"
                  >
                    {scopeMode === 'favorites' && (
                      <motion.span
                        layoutId="discoverScopePill"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute inset-0 bg-gradient-to-r from-purple-700 to-fuchsia-700 border border-purple-400/40 rounded-full shadow-sm shadow-purple-950/50"
                      />
                    )}
                    <span className={`relative z-10 flex items-center gap-1.5 transition-colors ${scopeMode === 'favorites' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'}`}>
                      <Heart className="w-3.5 h-3.5" />
                      <span>Favorites</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Right: Sort Dropdown (Latest / Trending / Popular) */}
              <div className="relative min-w-[130px]">
                <CustomSelect<CatalogSort>
                  value={communitySort}
                  onChange={val => {
                    setCommunitySort(val);
                    setCurrentPage(1);
                  }}
                  size="sm"
                  options={[
                    { value: 'latest', label: 'Latest' },
                    { value: 'trending', label: 'Trending' },
                    { value: 'popular', label: 'Popular' }
                  ]}
                  className="bg-[#151823] border-[#262b3d] hover:border-purple-500/40 font-semibold"
                />
              </div>
            </div>

            {/* ROW 3: Total Character Counter Badge + Numbered Pagination (< 1 2 3 4 5 ... 295 >) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="px-3.5 py-1.5 rounded-full bg-[#151823] border border-[#262b3d] text-xs font-semibold text-neutral-200">
                {scopeMode === 'all' && !communitySearch && communitySelectedCategories.includes('all')
                  ? '200,000+ characters'
                  : `${communityTotalCount.toLocaleString()} characters`}
              </div>

              {scopeMode !== 'favorites' && entityMode === 'characters' && totalPages > 1 && (
                <div className="flex items-center gap-1 text-xs font-semibold">
                  <button
                    type="button"
                    disabled={currentPage <= 1 || communityLoading}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {getVisiblePageNumbers().map(pageNum => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        pageNum === currentPage
                          ? 'bg-[#2a3045] text-white font-bold border border-purple-500/50'
                          : 'text-neutral-400 hover:text-white hover:bg-[#191d2b]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <span className="px-1 text-neutral-500">...</span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(totalPages)}
                        className="px-2 h-7 rounded-full text-neutral-400 hover:text-white hover:bg-[#191d2b] cursor-pointer"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    disabled={!communityHasMore || currentPage >= totalPages || communityLoading}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Active search indicator */}
            {communitySearch && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#12151e] border border-purple-500/30 text-xs">
                <span className="text-purple-300">
                  Filtering by: <span className="font-bold text-white">"{communitySearch}"</span>
                </span>
                <button
                  onClick={() => {
                    setCommunitySearch('');
                    setCommunitySearchInput('');
                    setCurrentPage(1);
                  }}
                  className="text-neutral-400 hover:text-white underline text-[11px] cursor-pointer"
                >
                  Clear filter
                </button>
              </div>
            )}

            {/* Error Message with Retry */}
            {communityError && (
              <div className="p-4 bg-rose-950/40 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{communityError}</span>
                </div>
                <button
                  onClick={() => fetchCommunityCharacters(currentPage)}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg shrink-0 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {/* ── SMOOTH TRANSITION COVER OR CONTENT VIEW ── */}
            {isSwitchingEntity ? (
              <div className="py-28 flex flex-col items-center justify-center gap-3 animate-fade-in select-none">
                <CatPulsingLoader
                  size="md"
                  label={`Loading ${entityMode === 'creators' ? 'Featured Creators' : 'Characters'}...`}
                  glow={false}
                />
              </div>
            ) : entityMode === 'creators' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1 animate-fade-in">
                {creatorProfiles.map(creator => {
                  const isFollowing = followedCreators.some(
                    f => f.creatorName.toLowerCase() === creator.creatorName.toLowerCase()
                  );
                  return (
                    <div
                      key={creator.creatorName}
                      className="p-4 rounded-2xl bg-[#131621] border border-[#24293b] hover:border-purple-500/40 flex flex-col justify-between gap-3 transition-all shadow-md"
                    >
                      <div
                        onClick={() => onViewCreatorProfile && onViewCreatorProfile(creator.creatorName)}
                        className="flex items-center gap-3.5 cursor-pointer group"
                      >
                        <img
                          src={creator.avatarUrl}
                          alt={creator.creatorName}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-full object-cover border border-purple-500/30 bg-neutral-900 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-bold text-white truncate">
                              @{creator.creatorName}
                            </h3>
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            {creator.botCount}+ public bots · Auto-sync enabled
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleFollowCreator(creator.creatorName, creator.avatarUrl)
                          }
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                            isFollowing
                              ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                              : 'bg-[#1d2233] hover:bg-purple-600/30 text-purple-200 border border-purple-500/30'
                          }`}
                        >
                          {isFollowing ? 'Following' : '+ Follow'}
                        </button>
                      </div>

                      {creator.sampleBots.length > 0 && (
                        <div className="text-[11px] text-neutral-400 line-clamp-1">
                          Notable bots:{' '}
                          <span className="text-neutral-200 font-medium">
                            {creator.sampleBots.join(', ')}
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEntityMode('characters');
                          setScopeMode('all');
                          setCommunitySearchInput(creator.creatorName);
                          setCommunitySearch(creator.creatorName);
                          setCurrentPage(1);
                        }}
                        className="w-full py-2 rounded-xl bg-[#191d2b] hover:bg-[#22283b] text-xs font-semibold text-purple-300 transition-colors cursor-pointer"
                      >
                        View all characters by @{creator.creatorName} →
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Followed Creators Strip (when Following filter is selected) */}
                {scopeMode === 'following' && followedCreators.length > 0 && (
                  <div className="p-3 sm:p-4 rounded-2xl bg-[#14121d] border border-[#262235] space-y-2.5 mb-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        <span>Followed Creators</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-purple-950 text-purple-300 text-[10px] border border-purple-800/40">
                          {followedCreators.length}
                        </span>
                      </span>
                      <span className="text-[10px] text-neutral-500">Tap a creator to search their characters</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {followedCreators.map(fc => (
                        <div
                          key={fc.creatorName}
                          onClick={() => {
                            setScopeMode('all');
                            setCommunitySearchInput(fc.creatorName);
                            setCommunitySearch(fc.creatorName);
                            setCurrentPage(1);
                          }}
                          className="group flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-[#1b1828] hover:bg-purple-950/60 border border-purple-500/30 hover:border-purple-400/60 transition-all cursor-pointer shadow-sm"
                        >
                          {fc.avatarUrl ? (
                            <img
                              src={fc.avatarUrl}
                              alt={fc.creatorName}
                              className="w-5 h-5 rounded-full object-cover border border-purple-400/40 shrink-0"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-purple-900 text-[9px] font-bold text-white flex items-center justify-center shrink-0">
                              {fc.creatorName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-semibold text-neutral-200 group-hover:text-white">
                            @{fc.creatorName}
                          </span>
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              handleToggleFollowCreator(fc.creatorName, fc.avatarUrl);
                            }}
                            className="text-neutral-500 hover:text-rose-400 text-xs ml-0.5 cursor-pointer"
                            title={`Unfollow @${fc.creatorName}`}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {communityLoading ? (
                  /* ── CHARACTERS LOADING SKELETON (2 columns on mobile) ── */
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-72 sm:h-96 rounded-2xl bg-[#12151e] border border-[#1b1e28] animate-pulse p-3 sm:p-4 flex flex-col justify-between"
                      >
                        <div className="h-32 sm:h-44 bg-[#1a1e2b] rounded-xl mb-2 sm:mb-3" />
                        <div className="space-y-2 flex-1">
                          <div className="h-3.5 w-3/4 bg-[#1a1e2b] rounded" />
                          <div className="h-3 w-1/2 bg-[#1a1e2b] rounded" />
                          <div className="h-8 bg-[#1a1e2b] rounded mt-2" />
                        </div>
                        <div className="h-7 bg-[#1a1e2b] rounded mt-2" />
                      </div>
                    ))}
                  </div>
                ) : communityCharacters.length === 0 ? (
                  <div className="py-20 text-center space-y-3 bg-[#12151e]/40 border border-[#1b1e28] rounded-2xl p-8">
                    <Sparkles className="w-8 h-8 text-neutral-500 mx-auto" />
                    <p className="text-sm font-semibold text-neutral-300">
                      {scopeMode === 'following'
                        ? (followedCreators.length === 0
                            ? 'You are not following any creators yet'
                            : `Following ${followedCreators.length} creator${followedCreators.length > 1 ? 's' : ''}`)
                        : scopeMode === 'favorites'
                        ? 'No favorite community characters saved yet'
                        : 'No community characters found'}
                    </p>
                    <p className="text-xs text-neutral-500 max-w-md mx-auto">
                      {scopeMode === 'following'
                        ? (followedCreators.length === 0
                            ? 'Click "+ Follow" next to any @creator on a character card to see all their bots here and get notified when they upload new characters!'
                            : `You are following @${followedCreators.map(f => f.creatorName).join(', @')}. Tap their name above to explore their characters.`)
                        : scopeMode === 'favorites'
                        ? 'Tap the bookmark icon on any community card to save it to your Favorites feed.'
                        : 'Try another search query or select another category filter above.'}
                    </p>
                    <button
                      onClick={() => {
                        setScopeMode('all');
                        setCommunitySearch('');
                        setCommunitySearchInput('');
                        setCommunitySelectedCategories(['all']);
                        setCurrentPage(1);
                      }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Browse All Characters
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-5">
                  {communityCharacters.map(char => {
                    const isCreatorFollowed = followedCreators.some(
                      f => f.creatorName.toLowerCase() === (char.creatorName || '').toLowerCase()
                    );
                    return (
                      <CommunityCharacterCard
                        key={char.id}
                        character={char}
                        onSelect={c => setSelectedCommunityChar(c)}
                        onStartChat={c => handleStartChatCommunityChar(c)}
                        onImport={c => handleImportCommunityChar(c)}
                        isBookmarked={isBookmarked(`datacat_${char.id}`)}
                        onToggleBookmark={() => handleToggleCommunityFavorite(char)}
                        blurNsfw={blurNsfw}
                        isFollowingCreator={isCreatorFollowed}
                        onToggleFollowCreator={(creatorName, avatarUrl) =>
                          handleToggleFollowCreator(creatorName, avatarUrl)
                        }
                        onCreatorClick={creatorName => {
                          setScopeMode('all');
                          setCommunitySearchInput(creatorName);
                          setCommunitySearch(creatorName);
                          setCurrentPage(1);
                        }}
                        onTagClick={(tagId, tagName) => {
                          const matchedCat = POPULAR_COMMUNITY_CATEGORIES.find(
                            c => c.tagId === tagId
                          );
                          if (matchedCat) {
                            handleToggleCategory(matchedCat.value);
                          } else {
                            setCommunitySearchInput(tagName);
                            setCommunitySearch(tagName);
                            setCurrentPage(1);
                          }
                        }}
                      />
                    );
                  })}
                </div>

                {/* Unlimited Infinite Scroll Sentinel & Load More Indicator */}
                {scopeMode !== 'favorites' && (
                  <div
                    ref={loadMoreSentinelRef}
                    className="pt-6 pb-14 flex flex-col items-center justify-center gap-2"
                  >
                    {isLoadingMore ? (
                      <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#141824] border border-purple-500/30 text-xs text-purple-300 shadow-lg">
                        <CatPulsingLoader size="xs" glow={false} />
                        <span>Loading more characters...</span>
                      </div>
                    ) : communityHasMore ? (
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="px-4 py-2 rounded-xl bg-[#151823] hover:bg-[#1c2030] border border-[#262b3d] text-xs font-bold text-neutral-300 hover:text-white cursor-pointer transition-colors"
                      >
                        Load More Characters ({communityCharacters.length.toLocaleString()} loaded)
                      </button>
                    ) : (
                      <span className="text-xs text-neutral-500">
                        You've reached the end of the catalog ({communityCharacters.length} characters)
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: MY LOCAL LIBRARY (Installed & Custom Characters) */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'library' && (
          <div className="w-full h-full overflow-y-auto px-4 sm:px-6 py-5 space-y-5 pb-24 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative flex items-center">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={e => setLibrarySearch(e.target.value)}
                  placeholder="Search your library by character, tag, or creator..."
                  className="w-full bg-[#12151e] border border-[#1b1e28] rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                {librarySearch && (
                  <button
                    onClick={() => setLibrarySearch('')}
                    className="absolute right-3 p-1 text-neutral-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="relative min-w-[150px]">
                <CustomSelect
                  value={librarySort}
                  onChange={val => setLibrarySort(val as any)}
                  options={[
                    { value: 'trending', label: '🔥 Most Chats' },
                    { value: 'popular', label: '❤️ Most Popular' },
                    { value: 'latest', label: '✨ Newest' }
                  ]}
                  className="bg-[#12151e] border-[#1b1e28] hover:border-neutral-600 font-semibold"
                />
              </div>

              <button
                onClick={() => setIsTagDrawerOpen(true)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  selectedTagSlugs.length > 0
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/50'
                    : 'bg-[#12151e] text-neutral-400 hover:text-white border-[#1b1e28]'
                }`}
                title="Filter by Tags"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>

            <div>
              {filteredLocalCharacters.length === 0 ? (
                <div className="py-20 text-center space-y-3 bg-[#12151e]/40 border border-[#1b1e28] rounded-2xl p-8">
                  <Sparkles className="w-8 h-8 text-neutral-500 mx-auto" />
                  <p className="text-sm font-semibold text-neutral-300">No characters found in library</p>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    Browse the Explore All tab to discover 200,000+ characters, or import a character PNG card.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('community')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      Explore All Characters
                    </button>
                    {onOpenImportModal && (
                      <button
                        onClick={onOpenImportModal}
                        className="px-4 py-2 bg-[#1b1e28] hover:bg-[#252a39] text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Upload PNG Card
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-5">
                  {filteredLocalCharacters.map(char => (
                    <CharacterCard
                      key={char.id}
                      character={char}
                      variant="grid"
                      onSelect={onSelectCharacter}
                      onStartChat={onStartChat}
                      isBookmarked={isBookmarked(char.id)}
                      onToggleBookmark={onToggleBookmark}
                      onToggleLike={onToggleLike}
                      blurNsfw={blurNsfw}
                      onTagClick={slug => {
                        setLibraryCategory(slug);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: OPTIONAL RAW WEB HUB (Datacat Embedded SillyTavern Bridge) */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'webhub' && (
          <DatacatHubView
            onImportCard={card => {
              if (onImportCard) {
                onImportCard(card);
                showToast(`✨ Imported "${card.name}" into My Library!`);
              }
            }}
            bridgeConnected={true}
            onBridgeStateChange={() => {}}
            reloadTrigger={0}
          />
        )}
      </div>

      {/* ── Community Character Detail Modal ── */}
      <CommunityCharacterModal
        character={selectedCommunityChar}
        isOpen={Boolean(selectedCommunityChar)}
        onClose={() => setSelectedCommunityChar(null)}
        onViewCreatorProfile={onViewCreatorProfile}
        onStartChat={(c, d) => handleStartChatCommunityChar(c, d)}
        onImport={(c, d) => handleImportCommunityChar(c, d)}
        isBookmarked={
          selectedCommunityChar ? isBookmarked(`datacat_${selectedCommunityChar.id}`) : false
        }
        onToggleBookmark={() => {
          if (selectedCommunityChar) {
            handleToggleCommunityFavorite(selectedCommunityChar);
          }
        }}
        blurNsfw={blurNsfw}
        isFollowingCreator={
          selectedCommunityChar
            ? followedCreators.some(
                f =>
                  f.creatorName.toLowerCase().replace(/^@+/, '').trim() ===
                  (selectedCommunityChar.creatorName || '').toLowerCase().replace(/^@+/, '').trim()
              )
            : false
        }
        onTagClick={tagName => {
          setSelectedCommunityChar(null);
          setScopeMode('all');
          setCommunitySearchInput(tagName);
          setCommunitySearch(tagName);
          setCurrentPage(1);
        }}
        onToggleFollowCreator={(creatorName, avatarUrl) =>
          handleToggleFollowCreator(creatorName, avatarUrl)
        }
      />

      {/* ── Floating Scroll To Top & Quick Search Jump Button (Mobile) ── */}
      {showScrollTop && activeTab === 'community' && (
        <button
          type="button"
          onClick={() => {
            communityScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="fixed bottom-20 right-4 z-40 p-3 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-950/60 border border-purple-400/40 backdrop-blur-md active:scale-90 transition-all cursor-pointer animate-scale-in flex items-center justify-center"
          title="Scroll back to top"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* ── Tag Filter Drawer for Library ── */}
      <TagFilterDrawer
        isOpen={isTagDrawerOpen}
        onClose={() => setIsTagDrawerOpen(false)}
        allTags={allTags}
        selectedTagSlugs={selectedTagSlugs}
        onToggleTag={onToggleTag}
        matchMode="any"
        onChangeMatchMode={() => {}}
        onClearTags={onClearTags}
        matchingCount={filteredLocalCharacters.length}
      />
    </div>
  );
};
