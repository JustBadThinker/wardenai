import React, { useState, useEffect, useCallback } from 'react';
import { Character, Conversation, Persona, User } from '../types';
import { CharacterCard } from '../components/character/CharacterCard';
import { CommunityCharacterCard } from '../components/character/CommunityCharacterCard';
import { CommunityCharacterModal } from '../components/character/CommunityCharacterModal';
import {
  communityCatalogService,
  CommunityCharacter,
  CommunityCharacterDetail,
  CommunityCatalogSource
} from '../services/communityCatalogService';
import { ImportedCardData } from '../services/characterImportService';
import { storageService, FollowedCreatorEntry } from '../services/storageService';
import {
  Download,
  Sparkles,
  Eye,
  EyeOff,
  Users,
  Heart,
  Flame,
  Star,
  Library,
  Loader2,
  RefreshCw,
  UserCheck,
  UserPlus,
  ArrowRight
} from 'lucide-react';
import { CatPulsingLoader } from '../components/common/CatPulsingLoader';

interface HomeViewProps {
  characters: Character[];
  conversations: Conversation[];
  activePersona?: Persona;
  currentUser: User;
  onSelectCharacter: (char: Character) => void;
  onStartChat: (char: Character) => void;
  onResumeConversation: (conv: Conversation) => void;
  onNavigate: (view: string) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onToggleLike: (id: string) => void;
  onSelectTag: (tagSlug: string) => void;
  onOpenImportModal?: () => void;
  onImportCard?: (cardData: ImportedCardData) => void;
}

type HomeQuickTab = 'following' | 'favorites' | 'trending' | 'popular' | 'latest' | 'creators';

export const HomeView: React.FC<HomeViewProps> = ({
  characters,
  currentUser,
  onSelectCharacter,
  onStartChat,
  onNavigate,
  isBookmarked,
  onToggleBookmark,
  onToggleLike,
  onOpenImportModal,
  onImportCard
}) => {
  const [activeTab, setActiveTab] = useState<HomeQuickTab>('trending');
  const [ratingMode, setRatingMode] = useState<'all' | 'limited'>('all');
  const [catalogSource, setCatalogSource] = useState<CommunityCatalogSource>(() =>
    communityCatalogService.getActiveSource()
  );

  const handleSourceChange = (source: CommunityCatalogSource) => {
    communityCatalogService.setActiveSource(source);
    setCatalogSource(source);
  };

  useEffect(() => {
    const handleSourceChanged = (e: any) => {
      if (e.detail?.source) {
        setCatalogSource(e.detail.source);
      }
    };
    window.addEventListener('warden:catalog-source-changed', handleSourceChanged);
    return () => window.removeEventListener('warden:catalog-source-changed', handleSourceChanged);
  }, []);

  // Community catalog state for Home Quick Tabs
  const [communityChars, setCommunityChars] = useState<CommunityCharacter[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);
  const [selectedCommunityChar, setSelectedCommunityChar] = useState<CommunityCharacter | null>(null);
  const [followedCreators, setFollowedCreators] = useState<FollowedCreatorEntry[]>(() =>
    storageService.getFollowedCreators(currentUser.id)
  );
  const [savedFavorites, setSavedFavorites] = useState<CommunityCharacter[]>(() =>
    storageService.getSavedCommunityFavorites()
  );

  // Sync followed creators
  useEffect(() => {
    setFollowedCreators(storageService.getFollowedCreators(currentUser.id));
  }, [currentUser.id]);

  // Background check for new uploads from followed creators on Home mount
  useEffect(() => {
    const followed = storageService.getFollowedCreators(currentUser.id);
    if (followed.length === 0) return;

    const creatorsQuery = followed.map(c => c.creatorName).join(',');
    communityCatalogService
      .getCharacters({
        offset: 0,
        limit: 24,
        sort: 'latest',
        creators: creatorsQuery
      })
      .then(res => {
        if (res.characters && res.characters.length > 0) {
          storageService.recordAndNotifyCreatorUploads(currentUser.id, res.characters);
          setFollowedCreators(storageService.getFollowedCreators(currentUser.id));
        }
      })
      .catch(() => {});
  }, [currentUser.id]);

  // Fetch community cards for the active quick tab
  const fetchQuickTabFeed = useCallback(async (forceRefresh = false) => {
    setIsLoadingCommunity(true);
    try {
      if (activeTab === 'favorites') {
        const favs = storageService.getSavedCommunityFavorites();
        const filtered = ratingMode === 'limited' ? favs.filter(c => !c.isNsfw) : favs;
        setSavedFavorites(favs);
        setCommunityChars(filtered);
        setIsLoadingCommunity(false);
        return;
      }

      if (activeTab === 'following') {
        const followed = storageService.getFollowedCreators(currentUser.id);
        setFollowedCreators(followed);
        if (followed.length === 0) {
          setCommunityChars([]);
          setIsLoadingCommunity(false);
          return;
        }
        const creatorsQuery = followed.map(c => c.creatorName).join(',');
        const res = await communityCatalogService.getCharacters({
          offset: 0,
          limit: 24,
          sort: 'latest',
          creators: creatorsQuery,
          sfwOnly: ratingMode === 'limited',
          forceRefresh
        });
        storageService.recordAndNotifyCreatorUploads(currentUser.id, res.characters);
        setFollowedCreators(storageService.getFollowedCreators(currentUser.id));
        setCommunityChars(res.characters);
        setIsLoadingCommunity(false);
        return;
      }

      // trending | popular | latest | creators
      const sortParam =
        activeTab === 'trending'
          ? 'trending'
          : activeTab === 'popular'
          ? 'popular'
          : 'latest';

      const res = await communityCatalogService.getCharacters({
        offset: 0,
        limit: 24,
        sort: sortParam,
        sfwOnly: ratingMode === 'limited',
        source: catalogSource,
        forceRefresh
      });
      setCommunityChars(res.characters);
    } catch (err) {
      console.error('Failed to load Home quick tab feed:', err);
    } finally {
      setIsLoadingCommunity(false);
    }
  }, [activeTab, ratingMode, catalogSource, currentUser.id]);

  useEffect(() => {
    fetchQuickTabFeed();
  }, [fetchQuickTabFeed]);

  // Toggle follow community creator
  const handleToggleFollowCreator = (creatorName: string, avatarUrl?: string) => {
    const clean = creatorName.replace(/^@/, '').trim();
    const knownIds = communityChars
      .filter(c => (c.creatorName || '').replace(/^@/, '').toLowerCase() === clean.toLowerCase())
      .map(c => c.id);

    const nowFollowing = storageService.toggleFollowCreator(
      currentUser.id,
      clean,
      avatarUrl,
      knownIds
    );
    setFollowedCreators(storageService.getFollowedCreators(currentUser.id));

    if (nowFollowing) {
      storageService.pushNotification({
        type: 'follower',
        title: `Following @${clean}`,
        message: `You will be notified whenever @${clean} uploads new characters.`
      });
    }
  };

  const isFollowingCreator = (creatorName: string) => {
    return followedCreators.some(
      c => c.creatorName.toLowerCase() === creatorName.replace(/^@/, '').trim().toLowerCase()
    );
  };

  const handleToggleFavoriteCommunity = (char: CommunityCharacter) => {
    storageService.toggleSavedCommunityFavorite(char);
    onToggleBookmark(`datacat_${char.id}`);
    setSavedFavorites(storageService.getSavedCommunityFavorites());
    if (activeTab === 'favorites') {
      const updated = storageService.getSavedCommunityFavorites();
      setCommunityChars(ratingMode === 'limited' ? updated.filter(c => !c.isNsfw) : updated);
    }
  };

  const handleImportCommunityChar = async (
    commChar: CommunityCharacter,
    detail?: CommunityCharacterDetail
  ) => {
    if (!onImportCard) return;
    try {
      const fullDetail = detail || (await communityCatalogService.getCharacterDetail(commChar.id));
      const imported = communityCatalogService.toImportedCardData(commChar, fullDetail);
      onImportCard(imported);
    } catch {
      const imported = communityCatalogService.toImportedCardData(commChar);
      onImportCard(imported);
    }
  };

  // Local published characters (filtered by ratingMode)
  const localPublished = characters.filter(c => {
    if (c.publicationStatus !== 'published') return false;
    if (ratingMode === 'limited' && c.contentRating === 'NSFW') return false;
    return true;
  });

  // Extract unique creators for the "Creators" quick tab
  const uniqueCreators = React.useMemo(() => {
    const map = new Map<
      string,
      { name: string; avatar: string; botCount: number; totalChats: number; sampleBot: string }
    >();
    for (const c of communityChars) {
      const handle = (c.creatorName || 'Community').replace(/^@/, '').trim();
      if (!handle) continue;
      const key = handle.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.botCount += 1;
        existing.totalChats += c.chatCount || 0;
      } else {
        map.set(key, {
          name: handle,
          avatar: c.avatarUrl,
          botCount: 1,
          totalChats: c.chatCount || 0,
          sampleBot: c.name
        });
      }
    }
    for (const fc of followedCreators) {
      const key = fc.creatorName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: fc.creatorName,
          avatar: fc.avatarUrl || '',
          botCount: fc.knownCharacterIds.length || 1,
          totalChats: 0,
          sampleBot: 'Followed Creator'
        });
      }
    }
    return Array.from(map.values());
  }, [communityChars, followedCreators]);

  const tabHeadingMap: Record<HomeQuickTab, string> = {
    following: 'Following',
    favorites: 'Favorites',
    trending: 'Trending',
    popular: 'Popular',
    latest: 'Latest Uploads',
    creators: 'Featured Creators'
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 py-3 space-y-4 pb-24">
      {/* Row 1: Rating Pill Toggle ([ 👁 All | 🚫 Limited Only ]) + Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 rounded-full bg-[#181622] border border-[#2d283e]">
          <button
            onClick={() => setRatingMode('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              ratingMode === 'all'
                ? 'bg-gradient-to-r from-purple-600/90 to-fuchsia-600/80 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>All</span>
          </button>
          <button
            onClick={() => setRatingMode('limited')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              ratingMode === 'limited'
                ? 'bg-gradient-to-r from-purple-600/90 to-fuchsia-600/80 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Limited Only</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="px-3.5 py-1.5 rounded-full bg-[#1a1726] hover:bg-[#241f35] text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Import card from JannyAI, JanitorAI, or Chub"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Import Card</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Janitor-Style Quick Navigation Pill Bar (Image 2) */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex items-center gap-1 p-1.5 rounded-full bg-[#181622] border border-[#2d283e] min-w-max">
          <button
            onClick={() => setActiveTab('following')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'following'
                ? 'bg-gradient-to-r from-purple-600/90 to-fuchsia-600/80 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Following</span>
            {followedCreators.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                {followedCreators.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-gradient-to-r from-purple-600/90 to-fuchsia-600/80 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Favorites</span>
            {savedFavorites.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px]">
                {savedFavorites.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('trending')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'trending'
                ? 'bg-gradient-to-r from-purple-600/90 to-fuchsia-600/80 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Trending</span>
          </button>

          <button
            onClick={() => setActiveTab('popular')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'popular'
                ? 'bg-gradient-to-r from-purple-600/90 to-fuchsia-600/80 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Popular</span>
          </button>

          <button
            onClick={() => setActiveTab('latest')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'latest'
                ? 'bg-gradient-to-r from-purple-600/90 to-fuchsia-600/80 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Latest</span>
          </button>

          <button
            onClick={() => setActiveTab('creators')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'creators'
                ? 'bg-gradient-to-r from-purple-600/90 to-fuchsia-600/80 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Creators</span>
          </button>

          {/* Explore All -> Navigates directly to Image 3 Full Catalog View */}
          <button
            onClick={() => onNavigate('discover')}
            className="px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 text-purple-300 hover:text-white hover:bg-purple-600/20 transition-all cursor-pointer"
          >
            <Library className="w-3.5 h-3.5" />
            <span>Explore All</span>
            <ArrowRight className="w-3 h-3 opacity-75" />
          </button>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-end justify-between pt-1">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
            {activeTab === 'creators' ? 'COMMUNITY' : 'BOTS'}
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
            {tabHeadingMap[activeTab]}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Catalog Source Switcher (JanitorAI <-> Chub.ai) with GPU Bouncy Indicator */}
          <div className="relative inline-flex items-center bg-[#131622] p-0.5 rounded-lg border border-[#262b3d] select-none">
            {/* Sliding Bouncy Indicator (GPU rendered via translate3d) */}
            <div
              className="absolute top-0.5 bottom-0.5 rounded-md bg-purple-600 shadow-xs pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform-gpu"
              style={{
                width: 'calc(50% - 2px)',
                transform: catalogSource === 'janitor'
                  ? 'translate3d(0, 0, 0)'
                  : 'translate3d(100%, 0, 0)'
              }}
            />
            <button
              type="button"
              onClick={() => handleSourceChange('janitor')}
              className={`relative z-10 px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors duration-200 cursor-pointer ${
                catalogSource === 'janitor'
                  ? 'text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Browse JanitorAI characters"
            >
              JanitorAI
            </button>
            <button
              type="button"
              onClick={() => handleSourceChange('chub')}
              className={`relative z-10 px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors duration-200 cursor-pointer ${
                catalogSource === 'chub'
                  ? 'text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Browse Chub.ai / Charhub characters"
            >
              Chub.ai
            </button>
          </div>

          <button
            onClick={() => fetchQuickTabFeed(true)}
            disabled={isLoadingCommunity}
            className="px-3 py-1.5 rounded-lg bg-[#181622] hover:bg-[#221f30] text-neutral-300 text-xs font-semibold flex items-center gap-1.5 border border-[#2d283e] transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCommunity ? 'animate-spin text-purple-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => onNavigate('discover')}
            className="px-3 py-1.5 rounded-lg bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 text-xs font-bold flex items-center gap-1.5 border border-purple-500/30 transition-colors cursor-pointer"
          >
            <span>Explore All 200k+</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      {isLoadingCommunity ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <CatPulsingLoader size="lg" label={`Loading ${tabHeadingMap[activeTab]}...`} />
        </div>
      ) : activeTab === 'creators' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {uniqueCreators.map(creator => {
            const following = isFollowingCreator(creator.name);
            return (
              <div
                key={creator.name}
                className="p-4 rounded-xl bg-[#181523] border border-[#2d2742] hover:border-purple-500/50 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {creator.avatar ? (
                    <img
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-12 h-12 rounded-full object-cover border border-purple-500/40 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-purple-900/50 border border-purple-500/40 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {creator.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">@{creator.name}</div>
                    <div className="text-[11px] text-neutral-400 truncate">
                      {creator.botCount} bots · Featured: {creator.sampleBot}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleFollowCreator(creator.name, creator.avatar)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                    following
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {following ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : communityChars.length === 0 ? (
        <div className="py-16 px-4 rounded-2xl bg-[#14121d] border border-[#262235] text-center max-w-lg mx-auto my-4 space-y-3">
          <Sparkles className="w-8 h-8 text-purple-400 mx-auto" />
          <h3 className="text-base font-bold text-white">
            {activeTab === 'following'
              ? "You aren't following any creators yet"
              : activeTab === 'favorites'
              ? 'No favorite characters saved yet'
              : 'No characters found'}
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {activeTab === 'following'
              ? 'Click the + Follow button next to any @creator handle on a card to follow them and receive automatic notifications when they upload new bots!'
              : activeTab === 'favorites'
              ? 'Click the heart icon on any character card to save it to your Favorites list.'
              : 'Try switching tabs or exploring the full community catalog.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            {activeTab !== 'trending' && (
              <button
                onClick={() => setActiveTab('trending')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Browse Trending
              </button>
            )}
            <button
              onClick={() => onNavigate('discover')}
              className="px-4 py-2 rounded-xl bg-[#1f1c2e] hover:bg-[#29253c] text-neutral-200 text-xs font-bold border border-[#332e4a] transition-colors cursor-pointer"
            >
              Explore All Catalog
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {communityChars.map(commChar => (
            <CommunityCharacterCard
              key={commChar.id}
              character={commChar}
              onSelect={setSelectedCommunityChar}
              onStartChat={c => handleImportCommunityChar(c)}
              onImport={c => handleImportCommunityChar(c)}
              isBookmarked={
                isBookmarked(`datacat_${commChar.id}`) ||
                savedFavorites.some(f => f.id === commChar.id)
              }
              onToggleBookmark={() => handleToggleFavoriteCommunity(commChar)}
              blurNsfw={currentUser.blurNsfw}
              isFollowingCreator={isFollowingCreator(commChar.creatorName)}
              onToggleFollowCreator={handleToggleFollowCreator}
            />
          ))}
        </div>
      )}

      {/* Local Original Characters Section */}
      {localPublished.length > 0 && activeTab !== 'following' && activeTab !== 'favorites' && (
        <div className="pt-6 space-y-3 border-t border-[#1e1b2e]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400">
                WARDEN ORIGINALS & IMPORTED
              </div>
              <h3 className="text-lg font-serif font-bold text-white">Your Workspace Library</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {localPublished.map(char => (
              <CharacterCard
                key={char.id}
                character={char}
                variant="grid"
                onSelect={onSelectCharacter}
                onStartChat={onStartChat}
                isBookmarked={isBookmarked(char.id)}
                onToggleBookmark={onToggleBookmark}
                onToggleLike={onToggleLike}
                blurNsfw={currentUser.blurNsfw}
              />
            ))}
          </div>
        </div>
      )}

      {/* Community Character Detail Modal */}
      <CommunityCharacterModal
        character={selectedCommunityChar}
        isOpen={Boolean(selectedCommunityChar)}
        onClose={() => setSelectedCommunityChar(null)}
        onStartChat={(char, detail) => {
          setSelectedCommunityChar(null);
          handleImportCommunityChar(char, detail);
        }}
        onImport={(char, detail) => {
          setSelectedCommunityChar(null);
          handleImportCommunityChar(char, detail);
        }}
        isBookmarked={
          selectedCommunityChar
            ? isBookmarked(`datacat_${selectedCommunityChar.id}`) ||
              savedFavorites.some(f => f.id === selectedCommunityChar.id)
            : false
        }
        onToggleBookmark={() => {
          if (selectedCommunityChar) {
            handleToggleFavoriteCommunity(selectedCommunityChar);
          }
        }}
        blurNsfw={currentUser.blurNsfw}
        isFollowingCreator={
          selectedCommunityChar ? isFollowingCreator(selectedCommunityChar.creatorName) : false
        }
        onToggleFollowCreator={handleToggleFollowCreator}
      />
    </div>
  );
};
