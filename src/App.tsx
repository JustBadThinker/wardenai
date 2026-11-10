/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Character,
  CharacterScenario,
  ChatMessage,
  ContentRating,
  ContentReport,
  Conversation,
  Lorebook,
  Persona,
  ProviderConfig,
  RestrictedInvestigation,
  Tag,
  TagCategory,
  User,
  UserRole,
  GlobalChatBackground
} from './types';
import { firebaseAuthService, DEMO_ACCOUNTS } from './services/firebaseAuth';
import { storageService } from './services/storageService';
import { extractCleanCharacterName } from './services/aiProviderService';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { TopHeader } from './components/navigation/TopHeader';
import { Sidebar } from './components/navigation/Sidebar';
import { MobileBottomBar } from './components/navigation/MobileBottomBar';
import { SlideOverDrawer } from './components/navigation/SlideOverDrawer';
import { CharacterCard } from './components/character/CharacterCard';
import { QuickSearchModal } from './components/character/QuickSearchModal';
import { AppSplashScreen } from './components/common/AppSplashScreen';

// Views
import { HomeView } from './views/HomeView';
import { DiscoverView } from './views/DiscoverView';
import { CharacterProfileView } from './views/CharacterProfileView';
import { CharacterStudioView } from './views/CharacterStudioView';
import { ChatView } from './views/ChatView';
import { ChatsListView } from './views/ChatsListView';
import { PersonaStudioView } from './views/PersonaStudioView';
import { LorebooksView } from './views/LorebooksView';
import { UserProfileView } from './views/UserProfileView';
import { ModerationView } from './views/ModerationView';
import { RestrictedInvestigationView } from './views/RestrictedInvestigationView';
import { ProviderSettingsView } from './views/ProviderSettingsView';
import { SecuritySettingsView } from './views/SecuritySettingsView';
import { SettingsView } from './views/SettingsView';
import { PrivacySecurityView } from './views/PrivacySecurityView';

// Modals
import { AuthModal } from './components/modals/AuthModal';
import { ReportModal } from './components/modals/ReportModal';
import { AgeGateModal } from './components/modals/AgeGateModal';
import { AccountRestrictedModal } from './components/modals/AccountRestrictedModal';
import { CharacterImportModal } from './components/modals/CharacterImportModal';
import { ImportedCardData } from './services/characterImportService';

export default function App() {
  // Authentication & Current User
  const [currentUser, setCurrentUser] = useState<User>(firebaseAuthService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isGlobalImportOpen, setIsGlobalImportOpen] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState<string | undefined>(currentUser.restrictionReason);

  // Safety restriction handler
  const handleAccountRestricted = (reason: string) => {
    const updated = {
      ...currentUser,
      isRestricted: true,
      restrictionReason: reason
    };
    setCurrentUser(updated);
    setRestrictionReason(reason);
    firebaseAuthService.updateUserProfile({ isRestricted: true, restrictionReason: reason } as any);
  };

  // Navigation (Default to Homepage first)
  const [activeView, setActiveView] = useState<string>('home');
  const [slideDirection, setSlideDirection] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isAppBooting, setIsAppBooting] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  // Set when the header Search button is tapped; DiscoverView consumes it to focus its search box
  const [pendingSearchFocus, setPendingSearchFocus] = useState(false);

  const SWIPE_TABS = ['home', 'discover', 'chats', 'profile'];
  const MAIN_TABS = ['home', 'discover', 'chats', 'profile'] as const;
  type MainTab = typeof MAIN_TABS[number];
  const isMainTab = (v: string): v is MainTab => MAIN_TABS.includes(v as MainTab);

  const navigateWithDirection = (nextView: string) => {
    const curIdx = SWIPE_TABS.indexOf(activeView);
    const nextIdx = SWIPE_TABS.indexOf(nextView);
    if (curIdx !== -1 && nextIdx !== -1 && curIdx !== nextIdx) {
      setSlideDirection(nextIdx > curIdx ? 1 : -1);
    } else {
      setSlideDirection(0);
    }
    setActiveView(nextView);
  };

  // Helper to detect if touch originates within scrollable horizontal elements or tabs (BUG #6)
  const isInsideHorizontalScroll = (target: EventTarget | null): boolean => {
    let el = target as HTMLElement | null;
    while (el && el !== document.body && el !== document.documentElement) {
      if (
        el.getAttribute?.('data-horizontal-scroll') === 'true' ||
        el.getAttribute?.('role') === 'tablist' ||
        el.getAttribute?.('data-no-swipe') === 'true' ||
        el.classList?.contains('overflow-x-auto') ||
        el.classList?.contains('overflow-x-scroll') ||
        el.classList?.contains('no-swipe') ||
        el.tagName === 'IFRAME' ||
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT'
      ) {
        return true;
      }
      if (
        el.scrollWidth > el.clientWidth &&
        (window.getComputedStyle(el).overflowX === 'auto' || window.getComputedStyle(el).overflowX === 'scroll')
      ) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMainTab(activeView) || isSearchModalOpen || isInsideHorizontalScroll(e.target)) {
      touchStartRef.current = null;
      return;
    }
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };

  const handleTouchMove = (_e: React.TouchEvent) => {
    // Zero CPU overhead during scrolling; keeps vertical scrolling 120Hz native and smooth
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !isMainTab(activeView) || isSearchModalOpen) {
      touchStartRef.current = null;
      return;
    }
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Angle Guard: Horizontal motion must dominate vertical motion by at least 1.8x
    // This strictly prevents natural diagonal thumb scrolls from accidentally triggering tab switches!
    const isHorizontalDominant = absDx > absDy * 1.8;

    // Fast deliberate flick (< 280ms with 38px distance) or longer swipe (> 54px)
    const isFlick = dt < 280 && absDx > 38;
    const isDeliberateSwipe = absDx > 54;

    if (isHorizontalDominant && (isFlick || isDeliberateSwipe)) {
      const curIdx = SWIPE_TABS.indexOf(activeView);
      if (curIdx === -1) return;
      if (dx < 0 && curIdx < SWIPE_TABS.length - 1) {
        navigateWithDirection(SWIPE_TABS[curIdx + 1]);
      } else if (dx > 0 && curIdx > 0) {
        navigateWithDirection(SWIPE_TABS[curIdx - 1]);
      }
    }
  };

  const handleTouchCancel = () => {
    touchStartRef.current = null;
  };

  // Keyboard shortcut: Cmd+K / Ctrl+K / / to open quick search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      } else if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize persisted theme on boot
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('warden_app_theme') || 'default';
      document.documentElement.setAttribute('data-theme', savedTheme);
    } catch {}
  }, []);

  // Content Rating & Safety
  const [contentRating, setContentRating] = useState<ContentRating>('SFW');
  const [isAgeGateOpen, setIsAgeGateOpen] = useState(false);
  const [pendingRating, setPendingRating] = useState<ContentRating | null>(null);

  // Data Stores
  const [characters, setCharacters] = useState<Character[]>(storageService.getCharacters());
  const [tags, setTags] = useState<Tag[]>(storageService.getTags());
  const [personas, setPersonas] = useState<Persona[]>(storageService.getPersonas());
  const [lorebooks, setLorebooks] = useState<Lorebook[]>(storageService.getLorebooks());
  const [conversations, setConversations] = useState<Conversation[]>(
    storageService.getConversations(currentUser.id)
  );
  const [providers, setProviders] = useState<ProviderConfig[]>(
    storageService.getProviders(currentUser.id)
  );
  const [reports, setReports] = useState<ContentReport[]>(storageService.getReports());
  const [investigations, setInvestigations] = useState<RestrictedInvestigation[]>(
    storageService.getInvestigations()
  );
  const [auditLogs, setAuditLogs] = useState(storageService.getAuditLogs());
  const [globalBackground, setGlobalBackground] = useState<GlobalChatBackground>(
    storageService.getGlobalChatBackground()
  );

  // Active Contexts
  const [activePersona, setActivePersona] = useState<Persona | undefined>(
    personas.find(p => p.isDefault) || personas[0]
  );
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [activeScenario, setActiveScenario] = useState<CharacterScenario | undefined>(undefined);
  const [selectedCreatorProfile, setSelectedCreatorProfile] = useState<User | null>(null);

  // Discover filters
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>([]);

  // Modals
  const [reportModalChar, setReportModalChar] = useState<Character | null>(null);
  const [reportModalMessages, setReportModalMessages] = useState<ChatMessage[]>([]);

  // Sync auth state
  useEffect(() => {
    const unsub = firebaseAuthService.subscribe(user => {
      if (user) {
        setCurrentUser(user);
        setConversations(storageService.getConversations(user.id));
        setProviders(storageService.getProviders(user.id));
      }
    });
    return () => unsub();
  }, []);

  // Update active persona if personas list changes
  useEffect(() => {
    if (!activePersona && personas.length > 0) {
      setActivePersona(personas.find(p => p.isDefault) || personas[0]);
    }
  }, [personas]);

  // Reset scroll container to top whenever switching views
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  }, [activeView]);

  // ── Android / Mobile Hardware Back Button (BUG #3) ────────────────────────
  // Track navigation and modal state in a ref for synchronous, fresh reads in event handlers
  const appNavStateRef = useRef({
    activeView,
    isMobileMenuOpen,
    isAuthModalOpen,
    isAgeGateOpen,
    isGlobalImportOpen,
    reportModalChar
  });

  useEffect(() => {
    appNavStateRef.current = {
      activeView,
      isMobileMenuOpen,
      isAuthModalOpen,
      isAgeGateOpen,
      isGlobalImportOpen,
      reportModalChar
    };
  }, [activeView, isMobileMenuOpen, isAuthModalOpen, isAgeGateOpen, isGlobalImportOpen, reportModalChar]);

  // Master Back Button Handler: Hierarchical priority
  const executeAppBackButton = () => {
    // 1. Dispatch custom event so child views (e.g. ChatView modal/lightbox/panel) can consume first
    const customBackEvent = new CustomEvent('warden:back', { cancelable: true });
    window.dispatchEvent(customBackEvent);
    if (customBackEvent.defaultPrevented) {
      return;
    }

    const {
      activeView: currentView,
      isMobileMenuOpen: menuOpen,
      isAuthModalOpen: authOpen,
      isAgeGateOpen: ageOpen,
      isGlobalImportOpen: importOpen,
      reportModalChar: reportChar
    } = appNavStateRef.current;

    // 2. Dismiss open top-level modals
    if (menuOpen) {
      setIsMobileMenuOpen(false);
      return;
    }
    if (authOpen) {
      setIsAuthModalOpen(false);
      return;
    }
    if (ageOpen) {
      setIsAgeGateOpen(false);
      return;
    }
    if (importOpen) {
      setIsGlobalImportOpen(false);
      return;
    }
    if (reportChar) {
      setReportModalChar(null);
      return;
    }

    // 3. Hierarchical sub-views back to their parent views
    if (currentView === 'chat') {
      setActiveView(conversations.length > 0 ? 'chats' : 'discover');
      return;
    }
    if (currentView === 'character-profile' || currentView === 'studio') {
      setActiveView('discover');
      return;
    }
    if (currentView === 'provider-settings' || currentView === 'security-settings') {
      setActiveView('settings');
      return;
    }
    if (currentView === 'privacy-security') {
      setActiveView('security-settings');
      return;
    }
    if (currentView !== 'home') {
      setActiveView('home');
      return;
    }

    // 4. At 'home' root: exit application on native Capacitor Android
    if (Capacitor.isNativePlatform()) {
      CapApp.exitApp();
    }
  };

  useEffect(() => {
    // Capacitor native hardware back button listener
    let removeListener: (() => void) | null = null;
    try {
      CapApp.addListener('backButton', () => {
        executeAppBackButton();
      }).then(handle => {
        removeListener = () => handle.remove();
      });
    } catch {}

    // Web browser popstate synchronization
    window.history.replaceState({ view: activeView }, '');
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState({ view: appNavStateRef.current.activeView }, '');
      executeAppBackButton();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      if (removeListener) removeListener();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Keep browser history stack ready for hardware back pops
    window.history.pushState({ view: activeView }, '');
  }, [activeView]);
  // ──────────────────────────────────────────────────────────────────────────

  // Handle Content Rating change with Age-Gate check
  const handleRequestContentRating = (rating: ContentRating) => {
    if (rating === 'NSFW' || rating === 'Mature') {
      if (!currentUser.isAgeVerified) {
        setPendingRating(rating);
        setIsAgeGateOpen(true);
        return;
      }
    }
    setContentRating(rating);
  };

  const handleConfirmAgeGate = () => {
    firebaseAuthService.updateUserProfile({ isAgeVerified: true, isNsfwAllowed: true });
    if (pendingRating) {
      setContentRating(pendingRating);
    }
    setIsAgeGateOpen(false);
  };

  // Role switching
  const handleSwitchRole = (role: UserRole) => {
    const updated = firebaseAuthService.switchDemoAccount(role);
    setCurrentUser(updated);
    setConversations(storageService.getConversations(updated.id));
    setProviders(storageService.getProviders(updated.id));
    // If on restricted view and switching away from mod/admin, return home
    if (role === 'user' && (activeView === 'moderation' || activeView === 'investigations' || activeView === 'audit-logs')) {
      setActiveView('home');
    }
  };

  // Tag Filtering
  const handleToggleTag = (slug: string) => {
    if (selectedTagSlugs.includes(slug)) {
      setSelectedTagSlugs(selectedTagSlugs.filter(s => s !== slug));
    } else {
      setSelectedTagSlugs([...selectedTagSlugs, slug]);
    }
  };

  const handleAddNewTag = (name: string, category: TagCategory): Tag => {
    const newTag = storageService.addTag(name, category);
    setTags(storageService.getTags());
    return newTag;
  };

  // Character operations
  const handleSelectCharacter = (char: Character) => {
    setSelectedCharacter(char);
    setActiveView('character-profile');
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  };

  const handleForkCharacter = (char: Character) => {
    const forked = storageService.forkCharacter(char, currentUser);
    setCharacters(storageService.getCharacters());
    setSelectedCharacter(forked);
    setActiveView('studio');
  };

  const handleStartChatWithScenario = (
    char: Character,
    scenario?: CharacterScenario,
    customPersona?: Persona
  ) => {
    const personaToUse = customPersona || activePersona || personas[0];
    const defaultProvider = providers.find(p => p.isDefault) || providers[0];

    const rawInitialText =
      scenario?.openingMessage ||
      char.firstMessage ||
      char.scenarios?.[0]?.openingMessage ||
      '';

    const userPersonaName = personaToUse?.name || currentUser.displayName || 'User';
    const chatCharName = extractCleanCharacterName(
      char.name,
      char.subtitle,
      char.firstMessage,
      char.personality
    );
    const initialText = rawInitialText
      .replace(/`?\{\{user\}\}`?|`?\[\[user\]\]`?|<user>/gi, userPersonaName)
      .replace(/`?\{\{char\}\}`?|`?\[\[char\]\]`?|<char>/gi, chatCharName);

    const convId = 'conv_' + Date.now().toString(36);
    const initialMessages: ChatMessage[] = initialText
      ? [
          {
            id: 'msg_init_' + Date.now().toString(36),
            conversationId: convId,
            sender: 'character',
            senderRole: 'assistant',
            senderId: char.id,
            content: initialText,
            rawTemplate: rawInitialText,
            timestamp: 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          }
        ]
      : [];

    // Create a new conversation
    const newConv: Conversation = {
      id: convId,
      userId: currentUser.id,
      characterId: char.id,
      scenarioId: scenario?.id,
      scenarioTitle: scenario?.title,
      personaId: personaToUse.id,
      providerId: defaultProvider?.id || 'prov_sim',
      title: `${char.name}${scenario ? ` · ${scenario.title}` : ''}`,
      messages: initialMessages,
      messageCount: initialMessages.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Ensure character is persisted to storage so it never disappears on refresh / mobile resume
    storageService.upsertCharacter(char);
    setCharacters(storageService.getCharacters());

    const saved = storageService.upsertConversation(newConv);
    setConversations(storageService.getConversations(currentUser.id));
    setSelectedCharacter(char);
    setActiveScenario(scenario);
    setActiveConversation(saved);
    setActiveView('chat');
  };

  const handleResumeConversation = (conv: Conversation) => {
    let char = characters.find(c => c.id === conv.characterId);
    if (!char) {
      const allStored = storageService.getCharacters();
      char = allStored.find(c => c.id === conv.characterId);
    }
    // Auto-recover orphaned character from conversation metadata if not found in storage
    if (!char && conv.characterId) {
      const rawTitle = conv.title || 'Character';
      const parsedName = rawTitle.includes(' · ')
        ? rawTitle.split(' · ')[0].trim()
        : rawTitle.includes(' — ')
        ? rawTitle.split(' — ')[0].trim()
        : rawTitle;
      const firstCharMsg = conv.messages.find(
        m => m.sender === 'character' || m.senderRole === 'assistant'
      );
      const scenarioTitle =
        conv.scenarioTitle ||
        (rawTitle.includes(' · ') ? rawTitle.split(' · ')[1].trim() : 'Initial Encounter');

      char = {
        id: conv.characterId,
        creatorId: currentUser.id,
        creatorUsername: 'Community',
        creatorAvatar: currentUser.avatarUrl,
        name: parsedName,
        subtitle: scenarioTitle,
        avatarUrl:
          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500',
        shortDescription: `${parsedName} — Roleplay character (auto-recovered).`,
        personality: 'Engaging, expressive, and true to persona.',
        background: 'Auto-recovered roleplay conversation context.',
        systemPrompt: `You are ${parsedName}. Embody their personality in every response.`,
        firstMessage: firstCharMsg?.content || '',
        exampleDialogue: '',
        contentRating: 'Mature',
        visibility: 'public',
        publicationStatus: 'published',
        scenarios: [
          {
            id: conv.scenarioId || 'sc_recovered_' + Date.now().toString(36),
            characterId: conv.characterId,
            title: scenarioTitle,
            description: 'Roleplay scenario.',
            openingMessage: firstCharMsg?.content || '',
            scenarioInstructions: 'Roleplay scenario.',
            displayOrder: 1,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt
          }
        ],
        tagSlugs: ['community'],
        likeCount: 1,
        bookmarkCount: 1,
        chatCount: 1,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        age: 20
      };
      if (char) {
        storageService.upsertCharacter(char);
        setCharacters(storageService.getCharacters());
      }
    }

    if (char) {
      setSelectedCharacter(char);
      const sc = char.scenarios?.find(s => s.id === conv.scenarioId) || char.scenarios?.[0];
      setActiveScenario(sc);
      setActiveConversation(conv);
      if (conv.personaId) {
        const p = personas.find(x => x.id === conv.personaId);
        if (p) setActivePersona(p);
      }
      setActiveView('chat');
    }
  };

  const handleDeleteConversation = (convId: string) => {
    storageService.deleteConversation(convId, currentUser.id);
    const remaining = storageService.getConversations(currentUser.id);
    setConversations(remaining);
    if (activeConversation?.id === convId) {
      setActiveConversation(remaining[0] || null);
      if (remaining.length === 0 && activeView === 'chat') {
        setActiveView('chats');
      }
    }
  };

  const handleSaveCharacter = (char: Character, submitForReview = false) => {
    storageService.upsertCharacter(char);
    setCharacters(storageService.getCharacters());
    setActiveView('discover');
  };

  const handleDirectImportCard = (data: ImportedCardData) => {
    // Check if a character with the same name already exists in library to preserve stats & merge
    const existing = characters.find(
      c => c.name.toLowerCase().trim() === data.name.toLowerCase().trim()
    );
    const charId = existing ? existing.id : 'char_' + Date.now().toString(36);

    // Build comprehensive scenarios: Primary opening message + all alternate greetings
    const initialScenarios: CharacterScenario[] = [
      {
        id: 'sc_' + Date.now().toString(36) + '_1',
        characterId: charId,
        title: 'Initial Encounter',
        description: data.shortDescription ? data.shortDescription.slice(0, 160) : 'Default opening situation.',
        openingMessage: data.firstMessage,
        scenarioInstructions: 'Default opening scenario.',
        displayOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    if (Array.isArray(data.alternateGreetings) && data.alternateGreetings.length > 0) {
      data.alternateGreetings.forEach((greeting, idx) => {
        if (!greeting || typeof greeting !== 'string' || !greeting.trim()) return;
        const cleanGreeting = greeting.trim();
        // Generate a clean title from the first sentence or heading if present
        const firstLine = cleanGreeting.split('\n')[0].replace(/^[*_#>\-\s]+|[*_#>\-\s]+$/g, '').slice(0, 36).trim();
        const scenarioTitle = firstLine ? `Alternate ${idx + 1}: ${firstLine}` : `Alternate Scenario ${idx + 1}`;
        initialScenarios.push({
          id: 'sc_' + Date.now().toString(36) + '_' + (idx + 2),
          characterId: charId,
          title: scenarioTitle,
          description: `Alternate opening greeting context #${idx + 1}.`,
          openingMessage: cleanGreeting,
          scenarioInstructions: 'Alternative opening scenario.',
          displayOrder: idx + 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
    }

    const newChar: Character = {
      ...(existing || {}),
      id: charId,
      creatorId: currentUser.id,
      creatorUsername: data.creatorUsername || currentUser.username,
      creatorAvatar: currentUser.avatarUrl,
      name: data.name,
      subtitle: data.subtitle || (data.shortDescription ? data.shortDescription.slice(0, 50) : ''),
      avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500',
      shortDescription: data.shortDescription,
      personality: data.personality,
      background: data.background,
      systemPrompt: data.systemPrompt || `You are ${data.name}. Embody their personality, mannerisms, and background in every response.`,
      exampleDialogue: data.exampleDialogue,
      firstMessage: data.firstMessage,
      creatorNotes: data.creatorNotes,
      contentRating: data.contentRating,
      visibility: 'public',
      publicationStatus: 'published',
      scenarios: initialScenarios.length >= (existing?.scenarios?.length || 0) ? initialScenarios : existing!.scenarios,
      tagSlugs: data.tags.length > 0 ? data.tags : ['imported', 'jannyai'],
      likeCount: existing?.likeCount || 1,
      bookmarkCount: existing?.bookmarkCount || 1,
      chatCount: existing?.chatCount || 0,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      age: data.age || 20
    };
    storageService.upsertCharacter(newChar);
    setCharacters(storageService.getCharacters());
    handleSelectCharacter(newChar);
  };

  // Follow & Bookmarks
  const handleToggleBookmark = (id: string) => {
    storageService.toggleBookmark(id);
    setCharacters([...storageService.getCharacters()]);
  };

  const handleToggleLike = (id: string) => {
    storageService.toggleLikeCharacter(id);
    setCharacters([...storageService.getCharacters()]);
  };

  const handleToggleFollow = (creatorId: string) => {
    if (storageService.isFollowing(currentUser.id, creatorId)) {
      storageService.unfollowUser(currentUser.id, creatorId);
    } else {
      storageService.followUser(currentUser.id, creatorId);
    }
    setCharacters([...storageService.getCharacters()]);
  };

  // View Creator Profile (BUG #11: dynamically resolves both demo accounts and community/imported creators)
  const handleViewCreatorProfile = (creatorIdentifier: string) => {
    if (!creatorIdentifier) return;
    const cleanHandle = creatorIdentifier.replace(/^@+/, '').trim();
    const matched =
      DEMO_ACCOUNTS.find(
        a => a.id === creatorIdentifier || a.username.toLowerCase() === cleanHandle.toLowerCase()
      ) ||
      (() => {
        const sampleChar = characters.find(
          c =>
            c.creatorId === creatorIdentifier ||
            c.creatorUsername?.toLowerCase() === cleanHandle.toLowerCase()
        );
        const dynamicUser: User = {
          id: sampleChar?.creatorId || `creator_${cleanHandle}`,
          username: cleanHandle,
          displayName: sampleChar?.creatorUsername || cleanHandle,
          avatarUrl:
            sampleChar?.creatorAvatar ||
            `https://avatars.charhub.io/avatars/${encodeURIComponent(cleanHandle)}/avatar.webp`,
          bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200',
          bio: `Community creator @${cleanHandle}. Explore their roleplay bots in Warden AI.`,
          role: 'user',
          isEmailVerified: true,
          isAgeVerified: true,
          isSuspended: false,
          joinedDate: new Date().toISOString(),
          followerCount: 0,
          followingCount: 0,
          publishedCharacterCount: 0,
          isNsfwAllowed: true,
          blurNsfw: false,
          email: `${cleanHandle}@community.warden.ai`
        };
        return dynamicUser;
      })();

    setSelectedCreatorProfile(matched);
    setActiveView('user-profile');
  };

  // Moderation Handlers
  const handleApproveCharacter = (charId: string) => {
    const char = storageService.getCharacterById(charId);
    if (char) {
      char.publicationStatus = 'published';
      char.visibility = 'public';
      storageService.upsertCharacter(char);
      setCharacters(storageService.getCharacters());

      storageService.addAuditLog({
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        actorRole: currentUser.role,
        action: 'APPROVE_CHARACTER',
        targetType: 'character',
        targetId: char.id,
        details: `Approved character '${char.name}' with ${char.scenarios.length} scenarios. Now publicly discoverable.`
      });
      setAuditLogs(storageService.getAuditLogs());
    }
  };

  const handleRejectCharacter = (charId: string, reason: string) => {
    const char = storageService.getCharacterById(charId);
    if (char) {
      char.publicationStatus = 'rejected';
      char.moderationNotes = reason;
      storageService.upsertCharacter(char);
      setCharacters(storageService.getCharacters());

      storageService.addAuditLog({
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        actorRole: currentUser.role,
        action: 'REJECT_CHARACTER',
        targetType: 'character',
        targetId: char.id,
        details: `Rejected character '${char.name}'. Reason: ${reason}`
      });
      setAuditLogs(storageService.getAuditLogs());
    }
  };

  const handleRequestChanges = (charId: string, notes: string) => {
    const char = storageService.getCharacterById(charId);
    if (char) {
      char.publicationStatus = 'changes_requested';
      char.moderationNotes = notes;
      storageService.upsertCharacter(char);
      setCharacters(storageService.getCharacters());

      storageService.addAuditLog({
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        actorRole: currentUser.role,
        action: 'REQUEST_CHANGES',
        targetType: 'character',
        targetId: char.id,
        details: `Requested revisions for character '${char.name}'. Feedback: ${notes}`
      });
      setAuditLogs(storageService.getAuditLogs());
    }
  };

  // Restricted Investigation Handlers
  const handleCreateInvestigation = (inv: RestrictedInvestigation) => {
    storageService.createInvestigationRequest(inv);
    setInvestigations(storageService.getInvestigations());
    setAuditLogs(storageService.getAuditLogs());
  };

  const handleApproveInvestigation = (
    id: string,
    authorityId: string,
    authorityName: string,
    decision: 'approved' | 'rejected',
    hours = 24
  ) => {
    storageService.approveInvestigation(id, authorityId, authorityName, decision, hours);
    setInvestigations(storageService.getInvestigations());
    setAuditLogs(storageService.getAuditLogs());
  };

  const handleCloseInvestigation = (id: string, closerId: string, closerName: string, reason: string) => {
    storageService.closeInvestigation(id, closerId, closerName, reason);
    setInvestigations(storageService.getInvestigations());
    setAuditLogs(storageService.getAuditLogs());
  };

  // Reports
  const handleOpenReportModal = (char: Character, messages: ChatMessage[] = []) => {
    setReportModalChar(char);
    setReportModalMessages(messages);
  };

  const handleSubmitReport = (report: ContentReport) => {
    storageService.submitReport(report);
    setReports(storageService.getReports());
  };

  const handleResolveReport = (reportId: string, notes: string) => {
    storageService.updateReportStatus(reportId, 'resolved', notes, currentUser.id);
    setReports(storageService.getReports());
  };

  const handleDismissReport = (reportId: string) => {
    storageService.updateReportStatus(reportId, 'dismissed', 'Dismissed by moderator', currentUser.id);
    setReports(storageService.getReports());
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-neutral-950 text-neutral-100 flex flex-col antialiased selection:bg-indigo-600/30 selection:text-indigo-200 overflow-hidden fixed inset-0">
      {/* Desktop Persistent Sidebar + Main Viewport Layout */}
      <motion.div
        animate={{
          opacity: isAppBooting ? 0 : 1,
          scale: isAppBooting ? 0.96 : 1
        }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-1 h-full min-h-0 overflow-hidden transform-gpu"
      >
        <Sidebar
          currentUser={currentUser}
          activePersona={activePersona}
          activeView={activeView}
          onNavigate={navigateWithDirection}
          onSwitchRole={handleSwitchRole}
          onLogout={() => setIsAuthModalOpen(true)}
          unreadReportsCount={reports.filter(r => r.status === 'pending').length}
          unreadChatsCount={conversations.length}
        />

        {/* Main Content Area */}
        <div className={`flex-1 flex flex-col min-w-0 ${activeView === 'chat' ? 'pb-0' : 'pb-[calc(56px+env(safe-area-inset-bottom,0px))] md:pb-0'} h-full min-h-0 overflow-hidden`}>
          {activeView !== 'chat' && (
            <TopHeader
              currentUser={currentUser}
              activePersona={activePersona}
              onSelectPersona={() => navigateWithDirection('personas')}
              contentRating={contentRating}
              onChangeContentRating={handleRequestContentRating}
              onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
              onOpenSearch={() => {
                setIsSearchModalOpen(true);
              }}
              onNavigate={navigateWithDirection}
              activeView={activeView}
            />
          )}

          <main
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            className="flex-1 min-h-0 relative overflow-hidden"
          >
            {/* ══════════════════════════════════════════════════════════════════════ */}
            {/* 1. PERSISTENT CORE TABS (Kept alive in DOM so tab switching is instant, */}
            {/*    scroll positions are 100% preserved, zero CPU spike, zero lag)       */}
            {/* ══════════════════════════════════════════════════════════════════════ */}
            <div
              className={`w-full h-full relative ${
                isMainTab(activeView) ? 'z-10' : 'z-0 pointer-events-none invisible'
              }`}
            >
              {/* 1. Home Tab */}
              <div
                className={`w-full h-full overflow-y-auto p-3 sm:p-5 transition-opacity duration-200 transform-gpu ${
                  activeView === 'home'
                    ? 'relative z-10 opacity-100'
                    : 'absolute inset-0 z-0 opacity-0 pointer-events-none invisible'
                }`}
              >
                <HomeView
                  characters={characters}
                  conversations={conversations}
                  activePersona={activePersona}
                  currentUser={currentUser}
                  onSelectCharacter={handleSelectCharacter}
                  onStartChat={handleSelectCharacter}
                  onResumeConversation={handleResumeConversation}
                  onNavigate={navigateWithDirection}
                  isBookmarked={id => storageService.isBookmarked(id)}
                  onToggleBookmark={handleToggleBookmark}
                  onToggleLike={handleToggleLike}
                  onSelectTag={slug => {
                    setSelectedTagSlugs([slug]);
                    navigateWithDirection('discover');
                  }}
                  onOpenImportModal={() => setIsGlobalImportOpen(true)}
                  onImportCard={handleDirectImportCard}
                />
              </div>

              {/* 2. Discover Tab */}
              <div
                className={`w-full h-full overflow-hidden p-0 transition-opacity duration-200 transform-gpu ${
                  activeView === 'discover'
                    ? 'relative z-10 opacity-100'
                    : 'absolute inset-0 z-0 opacity-0 pointer-events-none invisible'
                }`}
              >
                <DiscoverView
                  characters={characters}
                  allTags={tags}
                  selectedTagSlugs={selectedTagSlugs}
                  onToggleTag={handleToggleTag}
                  onClearTags={() => setSelectedTagSlugs([])}
                  onSelectCharacter={handleSelectCharacter}
                  onStartChat={handleSelectCharacter}
                  isBookmarked={id => storageService.isBookmarked(id)}
                  onToggleBookmark={handleToggleBookmark}
                  onToggleLike={handleToggleLike}
                  contentRating={contentRating}
                  onChangeContentRating={handleRequestContentRating}
                  blurNsfw={currentUser.blurNsfw}
                  onAddNewTag={handleAddNewTag}
                  onOpenImportModal={() => setIsGlobalImportOpen(true)}
                  onImportCard={handleDirectImportCard}
                  currentUserId={currentUser.id}
                  onViewCreatorProfile={handleViewCreatorProfile}
                  focusSearchRequest={pendingSearchFocus}
                  onSearchFocusHandled={() => setPendingSearchFocus(false)}
                />
              </div>

              {/* 3. Chats Tab */}
              <div
                className={`w-full h-full overflow-y-auto p-3 sm:p-5 transition-opacity duration-200 transform-gpu ${
                  activeView === 'chats'
                    ? 'relative z-10 opacity-100'
                    : 'absolute inset-0 z-0 opacity-0 pointer-events-none invisible'
                }`}
              >
                <ChatsListView
                  conversations={conversations}
                  characters={characters}
                  personas={personas}
                  currentUser={currentUser}
                  onResumeConversation={handleResumeConversation}
                  onDeleteConversation={handleDeleteConversation}
                  onStartNewChat={char => handleStartChatWithScenario(char, char.scenarios?.[0])}
                  onViewCharacter={handleSelectCharacter}
                  onNavigate={navigateWithDirection}
                />
              </div>

              {/* 4. Profile Tab */}
              <div
                className={`w-full h-full overflow-y-auto p-3 sm:p-5 transition-opacity duration-200 transform-gpu ${
                  activeView === 'profile'
                    ? 'relative z-10 opacity-100'
                    : 'absolute inset-0 z-0 opacity-0 pointer-events-none invisible'
                }`}
              >
                <UserProfileView
                  user={currentUser}
                  characters={characters}
                  currentUser={currentUser}
                  isFollowing={false}
                  onToggleFollow={handleToggleFollow}
                  onSelectCharacter={handleSelectCharacter}
                  onStartChat={handleSelectCharacter}
                  isBookmarked={id => storageService.isBookmarked(id)}
                  onToggleBookmark={handleToggleBookmark}
                  onToggleLike={handleToggleLike}
                  onCreateCharacter={() => navigateWithDirection('studio')}
                  onUpdateBio={newBio => {
                    firebaseAuthService.updateUserProfile({ bio: newBio });
                    setCurrentUser(firebaseAuthService.getCurrentUser());
                  }}
                  onUpdateProfile={updates => {
                    firebaseAuthService.updateUserProfile(updates);
                    setCurrentUser(firebaseAuthService.getCurrentUser());
                  }}
                />
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════════ */}
            {/* 2. SECONDARY / SUBVIEWS (Overlays with smooth AnimatePresence)         */}
            {/* ══════════════════════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait" initial={false}>
              {!isMainTab(activeView) && (
                <motion.div
                  key={activeView}
                  initial={{
                    opacity: 0,
                    x: activeView === 'chat' ? '30%' : (slideDirection !== 0 ? slideDirection * 20 : 0),
                    scale: activeView === 'chat' ? 1 : 0.985
                  }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    scale: 1
                  }}
                  exit={{
                    opacity: 0,
                    x: activeView === 'chat' ? '30%' : (slideDirection !== 0 ? slideDirection * -16 : 0),
                    scale: activeView === 'chat' ? 1 : 0.985
                  }}
                  transition={{
                    type: 'spring',
                    damping: 30,
                    stiffness: 340,
                    mass: 0.8
                  }}
                  className={`absolute inset-0 z-20 bg-neutral-950 transform-gpu ${
                    activeView === 'chat'
                      ? 'h-full w-full min-h-0 overflow-hidden'
                      : 'h-full w-full overflow-y-auto p-3 sm:p-5'
                  }`}
                >
                  {activeView === 'character-profile' && selectedCharacter && (
                    <CharacterProfileView
                      character={selectedCharacter}
                      personas={personas}
                      activePersona={activePersona}
                      currentUser={currentUser}
                      isFollowingCreator={storageService.isFollowing(currentUser.id, selectedCharacter.creatorId)}
                      onToggleFollow={handleToggleFollow}
                      isBookmarked={storageService.isBookmarked(selectedCharacter.id)}
                      onToggleBookmark={handleToggleBookmark}
                      onToggleLike={handleToggleLike}
                      onStartChatWithScenario={handleStartChatWithScenario}
                      onBack={() => navigateWithDirection('discover')}
                      onOpenReportModal={c => handleOpenReportModal(c)}
                      onViewCreatorProfile={handleViewCreatorProfile}
                      onForkCharacter={handleForkCharacter}
                    />
                  )}

                  {activeView === 'studio' && (
                    <CharacterStudioView
                      currentUser={currentUser}
                      allTags={tags}
                      initialCharacter={selectedCharacter && selectedCharacter.creatorId === currentUser.id ? selectedCharacter : undefined}
                      onSaveCharacter={handleSaveCharacter}
                      onBack={() => navigateWithDirection('discover')}
                      onAddNewTag={handleAddNewTag}
                      onAccountRestricted={handleAccountRestricted}
                      onStartTestingChat={char => handleStartChatWithScenario(char, char.scenarios[0])}
                      onSaveLorebook={lb => {
                        storageService.upsertLorebook(lb);
                        setLorebooks(storageService.getLorebooks());
                      }}
                    />
                  )}

                  {activeView === 'chat' && (selectedCharacter || characters.length > 0) ? (() => {
                    const activeConv =
                      activeConversation ||
                      conversations[0] || {
                        id: 'conv_empty',
                        characterId: (selectedCharacter || characters[0]).id,
                        userId: currentUser.id,
                        messages: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        messageCount: 0
                      };
                    let activeChar =
                      (activeConv?.characterId ? characters.find(c => c.id === activeConv.characterId) : null) ||
                      (activeConv?.characterId ? storageService.getCharacters().find(c => c.id === activeConv.characterId) : null) ||
                      selectedCharacter;

                    if (!activeChar && activeConv?.characterId) {
                      const rawTitle = activeConv.title || 'Character';
                      const parsedName = rawTitle.includes(' · ')
                        ? rawTitle.split(' · ')[0].trim()
                        : rawTitle.includes(' — ')
                        ? rawTitle.split(' — ')[0].trim()
                        : rawTitle;
                      const firstCharMsg = activeConv.messages.find(
                        m => m.sender === 'character' || m.senderRole === 'assistant'
                      );
                      const scenarioTitle =
                        activeConv.scenarioTitle ||
                        (rawTitle.includes(' · ') ? rawTitle.split(' · ')[1].trim() : 'Initial Encounter');

                      activeChar = {
                        id: activeConv.characterId,
                        creatorId: currentUser.id,
                        creatorUsername: 'Community',
                        creatorAvatar: currentUser.avatarUrl,
                        name: parsedName,
                        subtitle: scenarioTitle,
                        avatarUrl:
                          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500',
                        shortDescription: `${parsedName} — Roleplay character (auto-recovered).`,
                        personality: 'Engaging, expressive, and true to persona.',
                        background: 'Auto-recovered roleplay conversation context.',
                        systemPrompt: `You are ${parsedName}. Embody their personality in every response.`,
                        firstMessage: firstCharMsg?.content || '',
                        exampleDialogue: '',
                        contentRating: 'Mature',
                        visibility: 'public',
                        publicationStatus: 'published',
                        scenarios: [
                          {
                            id: activeConv.scenarioId || 'sc_1',
                            characterId: activeConv.characterId,
                            title: scenarioTitle,
                            description: 'Roleplay scenario.',
                            openingMessage: firstCharMsg?.content || '',
                            scenarioInstructions: 'Roleplay scenario.',
                            displayOrder: 1,
                            createdAt: activeConv.createdAt,
                            updatedAt: activeConv.updatedAt
                          }
                        ],
                        tagSlugs: ['community'],
                        likeCount: 1,
                        bookmarkCount: 1,
                        chatCount: 1,
                        createdAt: activeConv.createdAt,
                        updatedAt: activeConv.updatedAt,
                        age: 20
                      };
                      if (activeChar) {
                        storageService.upsertCharacter(activeChar);
                      }
                    }

                    const resolvedChar = activeChar || characters[0];
                    if (!resolvedChar) return null;

                    return (
                      <ChatView
                        key={`${activeConv.id}_${resolvedChar.id}`}
                        conversation={activeConv}
                        character={resolvedChar}
                        scenario={activeScenario}
                        persona={
                          (activeConv?.personaId ? personas.find(p => p.id === activeConv.personaId) : null) ||
                          activePersona ||
                          personas.find(p => p.isDefault) ||
                          personas[0]
                        }
                        allPersonas={personas}
                        allProviders={providers}
                        lorebooks={lorebooks}
                        currentUser={currentUser}
                        onUpdateConversation={updated => {
                          if (!updated.messages || updated.messages.length === 0) {
                            handleDeleteConversation(updated.id);
                            return;
                          }
                          storageService.upsertConversation(updated);
                          setConversations(storageService.getConversations(currentUser.id));
                          setActiveConversation(updated);
                        }}
                        onBack={() => navigateWithDirection(conversations.length > 0 ? 'chats' : 'discover')}
                        onOpenReportWithMessages={(char, msgs) => handleOpenReportModal(char, msgs)}
                        allCharacters={characters}
                        allConversations={conversations}
                        onSelectConversation={handleResumeConversation}
                        onDeleteConversation={handleDeleteConversation}
                        onStartNewChat={char => handleStartChatWithScenario(char, char.scenarios?.[0] || char.scenarios[0])}
                        globalBackground={globalBackground}
                      />
                    );
                  })() : activeView === 'chat' ? (
                    <ChatsListView
                      conversations={conversations}
                      characters={characters}
                      personas={personas}
                      currentUser={currentUser}
                      onResumeConversation={handleResumeConversation}
                      onDeleteConversation={handleDeleteConversation}
                      onStartNewChat={char => handleStartChatWithScenario(char, char.scenarios?.[0])}
                      onViewCharacter={handleSelectCharacter}
                      onNavigate={navigateWithDirection}
                    />
                  ) : null}

                  {activeView === 'personas' && (
                    <PersonaStudioView
                      personas={personas}
                      currentUser={currentUser}
                      onSavePersona={p => {
                        storageService.upsertPersona(p);
                        const updated = storageService.getPersonas();
                        setPersonas(updated);
                        setActivePersona(p);
                      }}
                      onDeletePersona={id => {
                        storageService.deletePersona(id);
                        const updated = storageService.getPersonas();
                        setPersonas(updated);
                        if (activePersona?.id === id) {
                          setActivePersona(updated.find(x => x.isDefault) || updated[0]);
                        }
                      }}
                      onSetDefaultPersona={id => {
                        storageService.setDefaultPersona(id, currentUser.id);
                        const updated = storageService.getPersonas();
                        setPersonas(updated);
                        const found = updated.find(x => x.id === id);
                        if (found) setActivePersona(found);
                      }}
                    />
                  )}

                  {activeView === 'lorebooks' && (
                    <LorebooksView
                      lorebooks={lorebooks}
                      currentUser={currentUser}
                      onSaveLorebook={lb => {
                        storageService.upsertLorebook(lb);
                        setLorebooks(storageService.getLorebooks());
                      }}
                      onDeleteLorebook={id => {
                        storageService.deleteLorebook(id);
                        setLorebooks(storageService.getLorebooks());
                      }}
                    />
                  )}

                  {activeView === 'user-profile' && selectedCreatorProfile && (
                    <UserProfileView
                      user={selectedCreatorProfile}
                      characters={characters}
                      currentUser={currentUser}
                      isFollowing={storageService.isFollowing(currentUser.id, selectedCreatorProfile.id)}
                      onToggleFollow={handleToggleFollow}
                      onSelectCharacter={handleSelectCharacter}
                      onStartChat={handleSelectCharacter}
                      isBookmarked={id => storageService.isBookmarked(id)}
                      onToggleBookmark={handleToggleBookmark}
                      onToggleLike={handleToggleLike}
                      onUpdateProfile={updates => {
                        firebaseAuthService.updateUserProfile(updates);
                        const updated = firebaseAuthService.getCurrentUser();
                        setCurrentUser(updated);
                        if (selectedCreatorProfile.id === updated.id) {
                          setSelectedCreatorProfile(updated);
                        }
                      }}
                    />
                  )}

                  {activeView === 'bookmarks' && (
                    <div className="max-w-5xl mx-auto pb-16 px-4 sm:px-6 space-y-6">
                      <div className="flex items-center justify-between border-b border-[#1f2433] pb-4">
                        <div>
                          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Saved Bookmarks</h1>
                          <p className="text-xs text-neutral-400 mt-0.5">Your pinned characters for fast access.</p>
                        </div>
                        <span className="text-xs text-purple-400 font-semibold px-2.5 py-1 rounded-full bg-purple-950/30 border border-purple-800/40">
                          {characters.filter(c => storageService.isBookmarked(c.id)).length} saved
                        </span>
                      </div>

                      {characters.filter(c => storageService.isBookmarked(c.id)).length === 0 ? (
                        <div className="py-16 text-center space-y-3 bg-[#111420]/50 border border-[#202636] rounded-2xl p-8">
                          <p className="text-sm font-bold text-white">No Bookmarked Characters Yet</p>
                          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                            Click the bookmark icon on any character card in Discover or Home to save them here for quick access.
                          </p>
                          <button
                            onClick={() => navigateWithDirection('discover')}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Browse Discover Catalog
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {characters
                            .filter(c => storageService.isBookmarked(c.id))
                            .map(char => (
                              <CharacterCard
                                key={char.id}
                                character={char}
                                onSelect={handleSelectCharacter}
                                onStartChat={handleSelectCharacter}
                                isBookmarked={true}
                                onToggleBookmark={handleToggleBookmark}
                                onToggleLike={handleToggleLike}
                                blurNsfw={currentUser.blurNsfw}
                                variant="grid"
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeView === 'security' && (
                    <SecuritySettingsView
                      currentUser={currentUser}
                      onUpdateUser={updates => {
                        const updated = firebaseAuthService.updateUserProfile(updates);
                        setCurrentUser(updated);
                      }}
                      onNavigate={navigateWithDirection}
                    />
                  )}

                  {activeView === 'moderation' && (
                    <ModerationView
                      currentUser={currentUser}
                      characters={characters}
                      reports={reports}
                      onApproveCharacter={handleApproveCharacter}
                      onRejectCharacter={handleRejectCharacter}
                      onRequestChanges={handleRequestChanges}
                      onResolveReport={handleResolveReport}
                      onDismissReport={handleDismissReport}
                    />
                  )}

                  {activeView === 'investigations' && (
                    <RestrictedInvestigationView
                      currentUser={currentUser}
                      investigations={investigations}
                      conversations={conversations}
                      auditLogs={auditLogs}
                      onCreateInvestigation={handleCreateInvestigation}
                      onApproveInvestigation={handleApproveInvestigation}
                      onCloseInvestigation={handleCloseInvestigation}
                    />
                  )}

                  {activeView === 'audit-logs' && (
                    <RestrictedInvestigationView
                      currentUser={currentUser}
                      investigations={investigations}
                      conversations={conversations}
                      auditLogs={auditLogs}
                      onCreateInvestigation={handleCreateInvestigation}
                      onApproveInvestigation={handleApproveInvestigation}
                      onCloseInvestigation={handleCloseInvestigation}
                    />
                  )}

                  {activeView === 'providers' && (
                    <ProviderSettingsView
                      providers={providers}
                      currentUser={currentUser}
                      onSaveProvider={p => {
                        storageService.upsertProvider(p);
                        setProviders(storageService.getProviders(currentUser.id));
                      }}
                      onDeleteProvider={id => {
                        storageService.deleteProvider(id);
                        setProviders(storageService.getProviders(currentUser.id));
                      }}
                      onSetDefaultProvider={id => {
                        storageService.setDefaultProvider(id, currentUser.id);
                        setProviders(storageService.getProviders(currentUser.id));
                      }}
                    />
                  )}

                  {activeView === 'settings' && (
                    <SettingsView
                      currentUser={currentUser}
                      onUpdateUser={updates => {
                        const updated = firebaseAuthService.updateUserProfile(updates);
                        setCurrentUser(updated);
                      }}
                      providers={providers}
                      onSaveProvider={p => {
                        storageService.upsertProvider(p);
                        setProviders(storageService.getProviders(currentUser.id));
                      }}
                      globalBackground={globalBackground}
                      onUpdateGlobalBackground={setGlobalBackground}
                      onBack={() => navigateWithDirection('home')}
                      onNavigate={navigateWithDirection}
                    />
                  )}

                  {activeView === 'privacy-security' && (
                    <PrivacySecurityView onBack={() => navigateWithDirection('settings')} />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </motion.div>

      {/* Mobile Bottom Navigation Bar - strictly hidden in active chat room or during boot */}
      {activeView !== 'chat' && !isAppBooting && (
        <MobileBottomBar
          activeView={activeView}
          onNavigate={navigateWithDirection}
          currentUser={currentUser}
          activePersona={activePersona}
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <SlideOverDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentUser={currentUser}
        activePersona={activePersona}
        onNavigate={setActiveView}
        onSwitchRole={handleSwitchRole}
        onLogout={() => setIsAuthModalOpen(true)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={user => setCurrentUser(user)}
      />

      {/* Age Gate Confirmation Modal */}
      <AgeGateModal
        isOpen={isAgeGateOpen}
        onClose={() => {
          setIsAgeGateOpen(false);
          setPendingRating(null);
        }}
        onConfirm={handleConfirmAgeGate}
      />

      {/* Report Modal */}
      {reportModalChar && (
        <ReportModal
          isOpen={Boolean(reportModalChar)}
          onClose={() => {
            setReportModalChar(null);
            setReportModalMessages([]);
          }}
          character={reportModalChar}
          chatMessages={reportModalMessages}
          currentUser={currentUser}
          onSubmitReport={handleSubmitReport}
        />
      )}

      {/* Account Restricted Modal (Enforces Child Safety & Minimum Age Policy) */}
      <AccountRestrictedModal
        isOpen={Boolean(currentUser.isRestricted)}
        reason={currentUser.restrictionReason || restrictionReason}
        onResetDemo={() => handleSwitchRole('user')}
      />

      {/* Global Character Import Modal (JannyAI / JanitorAI / Datacat) */}
      <CharacterImportModal
        isOpen={isGlobalImportOpen}
        onClose={() => setIsGlobalImportOpen(false)}
        onConfirmImport={handleDirectImportCard}
      />

      {/* Global Quick Search & Command Palette Modal */}
      <QuickSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        characters={characters}
        onSelectCharacter={handleSelectCharacter}
        onStartChat={handleSelectCharacter}
        onNavigateToDiscover={() => {
          setActiveView('discover');
        }}
        onScrollDiscoverTop={() => {
          window.dispatchEvent(new CustomEvent('warden:scroll-discover-top'));
        }}
      />

      {/* Native App Opening Splash & Boot Sequence with smooth zoom-dissolve exit */}
      <AnimatePresence>
        {isAppBooting && (
          <AppSplashScreen onComplete={() => setIsAppBooting(false)} duration={1050} />
        )}
      </AnimatePresence>
    </div>
  );
}
