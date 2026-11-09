import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import {
  Send,
  Square,
  RotateCcw,
  Edit2,
  Trash2,
  Copy,
  Check,
  Search,
  Sparkles,
  Sliders,
  Heart,
  MessageSquare,
  Brain,
  ChevronDown,
  ChevronUp,
  Lock,
  UserCheck,
  ArrowLeft,
  Settings,
  MoreVertical,
  Plus,
  Palette,
  X,
  Zap,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ChevronsRight,
  PenTool,
  Wand2,
  Loader2,
  Maximize2,
  Minimize2,
  Gauge,
  Coins,
  Calculator,
  TrendingDown
} from 'lucide-react';
import {
  Character,
  CharacterScenario,
  ChatMessage,
  ChatCustomization,
  Conversation,
  Lorebook,
  Persona,
  ProviderConfig,
  ProviderType,
  User,
  GlobalChatBackground,
  TokenOptimizerLevel,
  TokenPriceConfig,
  ConversationTokenStats,
  CumulativeTokenUsage
} from '../types';
import { aiProviderService, extractCleanCharacterName, extractThoughtAndContent } from '../services/aiProviderService';
import { storageService, BotRulePreset } from '../services/storageService';
import { TokenOptimizerSlider } from '../components/common/TokenOptimizerSlider';
import { tokenOptimizerService } from '../services/tokenOptimizerService';
import { tokenPriceService, DEFAULT_USD_TO_IDR_RATE } from '../services/tokenPriceService';
import { TokenCounterModal } from '../components/common/TokenCounterModal';
import { RichTextRenderer } from '../components/common/RichTextRenderer';

interface ChatViewProps {
  conversation: Conversation;
  character: Character;
  scenario?: CharacterScenario;
  persona?: Persona;
  allPersonas: Persona[];
  allProviders: ProviderConfig[];
  lorebooks: Lorebook[];
  currentUser: User;
  onUpdateConversation: (updated: Conversation) => void;
  onBack: () => void;
  onOpenReportWithMessages: (character: Character, messages: ChatMessage[]) => void;
  allCharacters?: Character[];
  allConversations?: Conversation[];
  onSelectConversation?: (conv: Conversation) => void;
  onDeleteConversation?: (convId: string) => void;
  onStartNewChat?: (character: Character) => void;
  globalBackground?: GlobalChatBackground;
}

type RightPanelTab = 'options' | 'memory' | 'customize' | 'hidden';
type MemorySubTab = 'summary' | 'memories' | 'settings';

const DEFAULT_CUSTOMIZATION: ChatCustomization = {
  dialogueColor: '#f3f4f6',
  actionColor: '#c084fc',
  userTextColor: '#e2e8f0',
  backgroundColor: '#0c0e14',
  backgroundImageUrl: '',
  backgroundDim: 0.7,
  fontSize: 'md',
  fontFamily: 'sans'
};

export const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  character,
  scenario,
  persona,
  allPersonas,
  allProviders,
  lorebooks,
  currentUser,
  onUpdateConversation,
  onBack,
  onOpenReportWithMessages,
  allCharacters = [],
  allConversations = [],
  onSelectConversation,
  onDeleteConversation,
  onStartNewChat,
  globalBackground
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return (conversation.messages || []).filter(
      m => m.sender === 'user' || (m.content && m.content.trim().length > 0)
    );
  });
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingChunk, setStreamingChunk] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lightbox Modal & Janitor-style Character/Persona Profile Sheet State
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [characterInfoModal, setCharacterInfoModal] = useState<{ isOpen: boolean; isPersona?: boolean }>({
    isOpen: false,
    isPersona: false
  });

  // Active Global Background from storage or prop
  const activeBg: GlobalChatBackground = globalBackground || storageService.getGlobalChatBackground();

  // Search in conversation / recent
  const [recentSearch, setRecentSearch] = useState('');
  const [expandedSidebarCharId, setExpandedSidebarCharId] = useState<string | null>(character.id);

  useEffect(() => {
    setExpandedSidebarCharId(character.id);
  }, [character.id]);

  // Right panel state (defaults to hidden to avoid squishing mobile screen)
  const [rightPanel, setRightPanel] = useState<RightPanelTab>('hidden');

  const handleInsertFormat = (prefix: string, suffix: string = prefix, placeholder: string = 'text') => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const val = inputText;
    const selected = val.substring(start, end) || placeholder;
    const newVal = val.substring(0, start) + prefix + selected + suffix + val.substring(end);
    setInputText(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      resizeComposer();
    }, 10);
  };
  const [memorySubTab, setMemorySubTab] = useState<MemorySubTab>('summary');

  // Active Provider & Persona & Scenario
  const [activePersonaId, setActivePersonaId] = useState(
    persona?.id || conversation.personaId || allPersonas[0]?.id || ''
  );
  const [activeScenarioId, setActiveScenarioId] = useState(
    scenario?.id || conversation.scenarioId || character.scenarios[0]?.id || ''
  );
  const [activeProviderId, setActiveProviderId] = useState(
    conversation.providerId || allProviders[0]?.id || 'prov_sim'
  );

  // Custom AI Gateway / Proxy settings state (persisted to localStorage)
  const initialProvider = allProviders.find(p => p.id === activeProviderId) || allProviders[0];
  const savedGateway = storageService.getActiveGatewayConfig();

  const [providerType, setProviderType] = useState<ProviderType>(
    savedGateway?.providerType || initialProvider?.providerType || 'simulation'
  );
  const [gatewayBaseUrl, setGatewayBaseUrl] = useState<string>(
    savedGateway?.baseUrl || initialProvider?.baseUrl || 'https://api.openai.com/v1'
  );
  const [gatewayModel, setGatewayModel] = useState<string>(
    savedGateway?.defaultModel || initialProvider?.defaultModel || 'gpt-4o-mini'
  );
  const [gatewayApiKey, setGatewayApiKey] = useState<string>(
    savedGateway?.apiKey || initialProvider?.apiKey || ''
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [gatewaySavedNotice, setGatewaySavedNotice] = useState(false);

  const saveGatewayToLocalStorage = (updates: {
    type?: ProviderType;
    baseUrl?: string;
    model?: string;
    apiKey?: string;
  }) => {
    const nextType = updates.type !== undefined ? updates.type : providerType;
    const nextUrl = updates.baseUrl !== undefined ? updates.baseUrl : gatewayBaseUrl;
    const nextModel = updates.model !== undefined ? updates.model : gatewayModel;
    const nextKey = updates.apiKey !== undefined ? updates.apiKey : gatewayApiKey;

    if (updates.type !== undefined) setProviderType(nextType);
    if (updates.baseUrl !== undefined) setGatewayBaseUrl(nextUrl);
    if (updates.model !== undefined) setGatewayModel(nextModel);
    if (updates.apiKey !== undefined) setGatewayApiKey(nextKey);

    storageService.setActiveGatewayConfig({
      providerType: nextType,
      baseUrl: nextUrl,
      defaultModel: nextModel,
      apiKey: nextKey,
      temperature,
      maxTokens
    });
    setGatewaySavedNotice(true);
    setTimeout(() => setGatewaySavedNotice(false), 2500);
  };

  // Test connection state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Generation parameters
  const [temperature, setTemperature] = useState<number>(0.75);
  const [maxTokens, setMaxTokens] = useState<number>(2048);

  // Summary & memories from conversation
  const [convSummary, setConvSummary] = useState<string>(
    conversation.summary ||
      `${character.name} and ${currentUser.displayName} are conversing. The atmosphere is charged with subtle tension and genuine curiosity.`
  );
  const [lastSummaryDate, setLastSummaryDate] = useState<string>(
    conversation.lastSummaryAt || 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  );
  const [keyMemories, setKeyMemories] = useState<string[]>(
    conversation.keyMemories || [
      `${currentUser.displayName} is roleplaying with ${character.name}.`,
      `${character.name} retains their distinct personality and setting memories.`
    ]
  );

  // Custom Bot Prompt / Rules (Information for bot or rules for botchat)
  const [customPrompt, setCustomPrompt] = useState<string>(
    conversation.customPrompt || ''
  );

  // Memory checkpointing (tracks message index of last summarized point)
  const [memoryCheckpoint, setMemoryCheckpoint] = useState<number>(
    conversation.memoryCheckpoint || 0
  );

  // Thinking process state & writing animation
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingContent, setThinkingContent] = useState('');
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [openThoughtMsgIds, setOpenThoughtMsgIds] = useState<Record<string, boolean>>({});
  const toggleMessageThought = (id: string) =>
    setOpenThoughtMsgIds(prev => ({ ...prev, [id]: !prev[id] }));
  const [displayedText, setDisplayedText] = useState('');

  // Chat Customization (Text coloring, Background styling, Font size)
  const [customization, setCustomization] = useState<ChatCustomization>(() => {
    try {
      const saved = localStorage.getItem('warden_chat_customization_v2');
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOMIZATION;
    } catch {
      return DEFAULT_CUSTOMIZATION;
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  // Floating format toolbar & Quick Persona switcher
  const [isFormatBarOpen, setIsFormatBarOpen] = useState(false);
  const [isPersonaQuickOpen, setIsPersonaQuickOpen] = useState(false);
  const [isAssistMenuOpen, setIsAssistMenuOpen] = useState(false);
  const [isAssisting, setIsAssisting] = useState(false);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);
  const [composerHeight, setComposerHeight] = useState<number>(44);

  // Auto-resize composer textarea whenever inputText or isComposerExpanded changes
  // Eliminates text clipping and ensures full visibility when writing or generating drafts
  const resizeComposer = useCallback(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    // Momentarily set height to auto to measure natural scrollHeight
    el.style.height = 'auto';
    const scrollH = el.scrollHeight;
    const targetMin = isComposerExpanded ? 160 : 44;
    const targetMax = isComposerExpanded ? 400 : 260;
    const newHeight = Math.max(targetMin, Math.min(scrollH, targetMax));
    el.style.height = `${newHeight}px`;
    setComposerHeight(newHeight);
  }, [isComposerExpanded]);

  useLayoutEffect(() => {
    resizeComposer();
  }, [inputText, isComposerExpanded, resizeComposer]);

  // Token Counter & Pricing Modal State
  const [isTokenCounterOpen, setIsTokenCounterOpen] = useState(false);
  const [tokenPriceConfig, setTokenPriceConfig] = useState<TokenPriceConfig>(() =>
    tokenPriceService.matchPresetByModel(gatewayModel, providerType)
  );

  useEffect(() => {
    const matched = tokenPriceService.matchPresetByModel(gatewayModel, providerType);
    setTokenPriceConfig(matched);
  }, [gatewayModel, providerType]);

  const currentPersona = allPersonas.find(p => p.id === activePersonaId) || persona || allPersonas[0];
  const currentProvider: ProviderConfig = {
    ...(allProviders.find(p => p.id === activeProviderId) || allProviders[0]),
    providerType,
    baseUrl: gatewayBaseUrl,
    defaultModel: gatewayModel,
    apiKey: gatewayApiKey,
    temperature,
    maxTokens
  };
  const currentScenario = character.scenarios.find(s => s.id === activeScenarioId) || character.scenarios[0];

  // Extract pure character name for chat (so card titles like 'Giantess Yuuka Kazami — She Found...' show as 'Giantess Yuuka Kazami', and 'he want to win bet' shows as 'Eli')
  const chatCharName = extractCleanCharacterName(
    character.name,
    character.subtitle,
    currentScenario?.openingMessage || conversation.messages?.[0]?.content || character.firstMessage,
    character.personality || character.systemPrompt || character.shortDescription
  );

  const currentOptimizerLevel: TokenOptimizerLevel =
    conversation.tokenOptimizer || storageService.getTokenOptimizerLevel();

  const liveTokenStats = React.useMemo(() => {
    return tokenPriceService.calculateStats({
      conversation: { ...conversation, messages },
      character,
      scenario: currentScenario,
      persona: currentPersona,
      lorebooks,
      customRules: customPrompt,
      optimizerLevel: currentOptimizerLevel,
      config: tokenPriceConfig
    });
  }, [
    conversation,
    messages,
    character,
    currentScenario,
    currentPersona,
    lorebooks,
    customPrompt,
    currentOptimizerLevel,
    tokenPriceConfig
  ]);

  const calcCumulativeUpdate = (
    currentConv: Conversation,
    turnInTokens: number,
    turnOutTokens: number
  ): CumulativeTokenUsage => {
    const prevUsage = currentConv.cumulativeUsage || {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      totalCostIdr: 0,
      turnCount: 0
    };

    const rateInUsd = tokenPriceConfig.pricePer1MInput;
    const rateOutUsd = tokenPriceConfig.pricePer1MOutput;
    const turnUsd = (turnInTokens / 1_000_000) * rateInUsd + (turnOutTokens / 1_000_000) * rateOutUsd;

    const rateInIdr =
      tokenPriceConfig.pricePer1MInputIdr ??
      rateInUsd * (tokenPriceConfig.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE);
    const rateOutIdr =
      tokenPriceConfig.pricePer1MOutputIdr ??
      rateOutUsd * (tokenPriceConfig.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE);
    const turnIdr = (turnInTokens / 1_000_000) * rateInIdr + (turnOutTokens / 1_000_000) * rateOutIdr;

    return {
      totalInputTokens: prevUsage.totalInputTokens + turnInTokens,
      totalOutputTokens: prevUsage.totalOutputTokens + turnOutTokens,
      totalCostUsd: prevUsage.totalCostUsd + turnUsd,
      totalCostIdr: prevUsage.totalCostIdr + turnIdr,
      turnCount: prevUsage.turnCount + 1
    };
  };

  // Bot Rule & Custom Prompt Presets
  const [rulePresets, setRulePresets] = useState<BotRulePreset[]>(() => storageService.getBotRulePresets());
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (!presetId) return;
    const preset = rulePresets.find(p => p.id === presetId);
    if (preset) {
      setCustomPrompt(preset.prompt);
      onUpdateConversation({
        ...conversation,
        customPrompt: preset.prompt
      });
    }
  };

  const handleSaveCurrentAsPreset = () => {
    if (!customPrompt.trim()) return;
    if (!newPresetName.trim()) {
      setIsSavingPreset(true);
      return;
    }
    const newPreset: BotRulePreset = {
      id: 'preset_' + Date.now().toString(36),
      name: newPresetName.trim(),
      prompt: customPrompt.trim(),
      isBuiltin: false
    };
    storageService.saveBotRulePreset(newPreset);
    setRulePresets(storageService.getBotRulePresets());
    setSelectedPresetId(newPreset.id);
    setIsSavingPreset(false);
    setNewPresetName('');
  };

  // Keep active persona synced with prop
  useEffect(() => {
    if (persona?.id && persona.id !== activePersonaId) {
      setActivePersonaId(persona.id);
    }
  }, [persona?.id]);

  // Persist customization
  const updateCustomization = (updates: Partial<ChatCustomization>) => {
    const updated = { ...customization, ...updates };
    setCustomization(updated);
    try {
      localStorage.setItem('warden_chat_customization_v2', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save customization to localStorage', e);
    }
  };

  // Auto scroll to bottom & track scroll position for floating scroll-down button
  const scrollToBottom = (force = false) => {
    const el = messagesContainerRef.current;
    if (el) {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (force || distanceFromBottom < 220) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        if (force) setIsScrolledUp(false);
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTranscriptScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsScrolledUp(distanceFromBottom > 150);
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, displayedText]);

  // Track open overlays for hardware back button consumption (BUG #3)
  const chatOverlaysRef = useRef({
    characterInfoModal,
    lightboxImage,
    isTokenCounterOpen,
    isAssistMenuOpen,
    isFormatBarOpen,
    isPersonaQuickOpen,
    rightPanel
  });

  useEffect(() => {
    chatOverlaysRef.current = {
      characterInfoModal,
      lightboxImage,
      isTokenCounterOpen,
      isAssistMenuOpen,
      isFormatBarOpen,
      isPersonaQuickOpen,
      rightPanel
    };
  });

  useEffect(() => {
    const handleWardenBack = (e: Event) => {
      const o = chatOverlaysRef.current;
      if (o.lightboxImage) {
        e.preventDefault();
        setLightboxImage(null);
        return;
      }
      if (o.characterInfoModal.isOpen) {
        e.preventDefault();
        setCharacterInfoModal({ isOpen: false, isPersona: false });
        return;
      }
      if (o.isTokenCounterOpen) {
        e.preventDefault();
        setIsTokenCounterOpen(false);
        return;
      }
      if (o.isAssistMenuOpen) {
        e.preventDefault();
        setIsAssistMenuOpen(false);
        return;
      }
      if (o.isFormatBarOpen) {
        e.preventDefault();
        setIsFormatBarOpen(false);
        return;
      }
      if (o.isPersonaQuickOpen) {
        e.preventDefault();
        setIsPersonaQuickOpen(false);
        return;
      }
      if (o.rightPanel !== 'hidden') {
        e.preventDefault();
        setRightPanel('hidden');
        return;
      }
    };

    window.addEventListener('warden:back', handleWardenBack);
    return () => window.removeEventListener('warden:back', handleWardenBack);
  }, []);

  // Visual viewport resize handling for Android virtual keyboard (BUG #14)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handleViewportResize = () => {
      if (vv.height < window.innerHeight * 0.85) {
        scrollToBottom(false);
      }
    };
    vv.addEventListener('resize', handleViewportResize);
    return () => vv.removeEventListener('resize', handleViewportResize);
  }, []);

  // Keep state synced if conversation prop updates & automatically load initial greeting if messages empty
  useEffect(() => {
    if (conversation.messages && conversation.messages.length > 0) {
      setMessages(conversation.messages);
    } else {
      const rawOpening =
        scenario?.openingMessage ||
        currentScenario?.openingMessage ||
        character.firstMessage ||
        character.scenarios?.[0]?.openingMessage ||
        '';
      const opening = rawOpening
        .replace(
          /`?\{\{user\}\}`?|`?\[\[user\]\]`?|<user>/gi,
          currentPersona?.name || currentUser.displayName || 'User'
        )
        .replace(/`?\{\{char\}\}`?|`?\[\[char\]\]`?|<char>/gi, chatCharName);
      if (opening) {
        const initialMsg: ChatMessage = {
          id: 'msg_start_' + conversation.id,
          conversationId: conversation.id,
          sender: 'character',
          senderId: character.id,
          senderRole: 'assistant',
          content: opening,
          timestamp: 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        };
        setMessages([initialMsg]);
        onUpdateConversation({
          ...conversation,
          messages: [initialMsg],
          messageCount: 1
        });
      } else {
        setMessages([]);
      }
    }
    if (conversation.summary) setConvSummary(conversation.summary);
    if (conversation.keyMemories) setKeyMemories(conversation.keyMemories);
    if (conversation.lastSummaryAt) setLastSummaryDate(conversation.lastSummaryAt);
    if (conversation.customPrompt !== undefined) setCustomPrompt(conversation.customPrompt);
    if (conversation.memoryCheckpoint !== undefined) setMemoryCheckpoint(conversation.memoryCheckpoint);
    setActiveScenarioId(scenario?.id || character.scenarios?.[0]?.id || '');
    if (conversation.personaId) {
      setActivePersonaId(conversation.personaId);
    } else if (persona?.id) {
      setActivePersonaId(persona.id);
    }
  }, [conversation.id, character.id, scenario?.id]);

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteMessage = (id: string) => {
    const idx = messages.findIndex(m => m.id === id);
    if (idx === -1) return;

    const target = messages[idx];
    const isUserMsg = target.sender === 'user' || target.senderRole === 'user';

    // If deleting a user message (or any turn after the opening), also delete the bot response(s) below it
    const updated = isUserMsg || idx > 0 ? messages.slice(0, idx) : messages.filter(m => m.id !== id);

    setMessages(updated);
    if (editingMessageId === id) {
      setEditingMessageId(null);
      setEditText('');
    }
    // If no messages remain, automatically delete the conversation and remove the character card
    if (updated.length === 0) {
      if (onDeleteConversation) {
        onDeleteConversation(conversation.id);
      }
      onBack();
      return;
    }
    const updatedConv = {
      ...conversation,
      messages: updated,
      messageCount: updated.length,
      updatedAt: new Date().toISOString()
    };
    onUpdateConversation(updatedConv);
  };

  const handleSaveEdit = (id: string) => {
    if (!editText.trim()) return;
    const updated = messages.map(m => (m.id === id ? { ...m, content: editText.trim() } : m));
    setMessages(updated);
    setEditingMessageId(null);
    setEditText('');
    const updatedConv = {
      ...conversation,
      messages: updated,
      updatedAt: new Date().toISOString()
    };
    onUpdateConversation(updatedConv);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText.trim();
    if (!text || isGenerating) return;

    const userMsg: ChatMessage = {
      id: 'msg_u_' + Date.now().toString(36),
      conversationId: conversation.id,
      sender: 'user',
      senderId: currentUser.id,
      senderRole: 'user',
      personaId: currentPersona?.id,
      personaName: currentPersona?.name || currentUser.displayName,
      content: text,
      timestamp: 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsComposerExpanded(false);
    setComposerHeight(44);
    if (textareaRef.current) textareaRef.current.style.height = '44px';

    // AI Generation with natural thinking phase & word-by-word typewriter effect
    setIsGenerating(true);
    setIsThinking(true);
    setIsThinkingOpen(false);
    setStreamingChunk('');
    setDisplayedText('');

    // Generate dynamic character thinking contemplation
    const senderRoleName = currentPersona?.name || currentUser.displayName;
    const thinkingThoughts = [
      `Analyzing ${senderRoleName}'s input: "${text.slice(0, 45)}..."`,
      `Accessing persona state for ${character.name}... Evaluating emotional resonance and setting dynamics.`,
      `Formulating immersive roleplay reply aligned with scenario context and custom guidance.`,
      `Drafting response tone and narrative pacing...`
    ].join('\n');
    setThinkingContent(thinkingThoughts);

    try {
      let accumulated = '';
      const conversationWithRules: Conversation = {
        ...conversation,
        messages: newMessages,
        customPrompt
      };

      let capturedThought = '';
      await aiProviderService.streamRoleplayResponse(
        conversationWithRules,
        character,
        currentScenario,
        currentPersona,
        lorebooks,
        {
          ...currentProvider,
          customPrompt
        },
        {
          onThinking: (thought: string) => {
            capturedThought = thought;
            setThinkingContent(thought);
          },
          onChunk: (chunk: string) => {
            accumulated = chunk;
            setStreamingChunk(accumulated);
          },
          onError: (err: Error) => {
            console.error('Streaming error', err);
            alert(err.message || 'Error communicating with AI router.');
          },
          onComplete: (fullText: string, _tokenEst?: number, thought?: string) => {
            accumulated = fullText;
            if (thought) capturedThought = thought;
          }
        }
      );

      // Thinking complete, now transition to sentence-by-sentence reveal with auto-scroll
      setIsThinking(false);

      const parsedTarget = extractThoughtAndContent(accumulated || streamingChunk, capturedThought);
      const targetText = parsedTarget.content.trim();
      if (!targetText) {
        console.warn('Empty AI response received, omitting empty message card');
        setStreamingChunk('');
        setDisplayedText('');
        return;
      }

      const sentences = targetText.match(/[^.!?\n]+[.!?\n]+[\s"']*|.+/g) || [targetText];
      let currentSoFar = '';
      for (let i = 0; i < sentences.length; i++) {
        currentSoFar += sentences[i];
        setDisplayedText(currentSoFar);
        scrollToBottom(false);
        await new Promise(r => setTimeout(r, Math.min(240, Math.max(95, 950 / sentences.length))));
      }

      const assistantMsg: ChatMessage = {
        id: 'msg_a_' + Date.now().toString(36),
        conversationId: conversation.id,
        sender: 'character',
        senderId: character.id,
        senderRole: 'assistant',
        content: targetText,
        thought: parsedTarget.thought,
        timestamp: 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      setStreamingChunk('');
      setDisplayedText('');

      const turnInTokens = liveTokenStats.inputTokens;
      const turnOutTokens = Math.max(1, Math.round(targetText.length / 4));
      const newCumulative = calcCumulativeUpdate(conversation, turnInTokens, turnOutTokens);

      const updatedConv: Conversation = {
        ...conversation,
        messages: finalMessages,
        messageCount: finalMessages.length,
        customPrompt,
        cumulativeUsage: newCumulative,
        updatedAt: new Date().toISOString()
      };
      onUpdateConversation(updatedConv);
    } catch (err: any) {
      console.error('Chat generation error', err);
    } finally {
      setIsGenerating(false);
      setIsThinking(false);
      setStreamingChunk('');
      setDisplayedText('');
    }
  };

  const handleRegenerate = async (specificMessageIndex?: number, editedUserText?: string) => {
    if (isGenerating) return;

    let trimmed: ChatMessage[] = [];

    if (specificMessageIndex !== undefined) {
      // User requested to regenerate or edit & regenerate from a specific user message
      const targetMsg = messages[specificMessageIndex];
      const newText = editedUserText !== undefined ? editedUserText.trim() : targetMsg.content;
      
      const updatedTargetMsg: ChatMessage = {
        ...targetMsg,
        content: newText,
        personaId: currentPersona?.id || targetMsg.personaId,
        personaName: currentPersona?.name || targetMsg.personaName || currentUser.displayName,
        timestamp: 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      };

      // Keep messages up to this user message, discarding subsequent turns for regeneration
      trimmed = [...messages.slice(0, specificMessageIndex), updatedTargetMsg];
    } else {
      // Standard regenerate last turn
      if (messages.length < 2) return;
      const lastUserIdx = [...messages].reverse().findIndex(m => m.sender === 'user' || m.senderRole === 'user');
      if (lastUserIdx === -1) return;
      const realIdx = messages.length - 1 - lastUserIdx;
      trimmed = messages.slice(0, realIdx + 1);
    }

    setMessages(trimmed);
    setEditingMessageId(null);
    setEditText('');

    setIsGenerating(true);
    setIsThinking(true);
    setIsThinkingOpen(false);
    setStreamingChunk('');
    setDisplayedText('');

    const thinkingThoughts = [
      `Regenerating reply for: "${trimmed[trimmed.length - 1]?.content.slice(0, 45)}..."`,
      `Adjusting creative direction and narrative nuances for ${character.name}...`,
      `Refining in accordance with custom bot guidance.`
    ].join('\n');
    setThinkingContent(thinkingThoughts);

    try {
      let accumulated = '';
      const conversationWithRules: Conversation = {
        ...conversation,
        messages: trimmed,
        customPrompt
      };

      let capturedThought = '';
      await aiProviderService.streamRoleplayResponse(
        conversationWithRules,
        character,
        currentScenario,
        currentPersona,
        lorebooks,
        {
          ...currentProvider,
          customPrompt
        },
        {
          onThinking: (thought: string) => {
            capturedThought = thought;
            setThinkingContent(thought);
          },
          onChunk: (chunk: string) => {
            accumulated = chunk;
            setStreamingChunk(accumulated);
          },
          onError: (err: Error) => {
            console.error('Streaming error', err);
            alert(err.message || 'Error communicating with AI router.');
          },
          onComplete: (fullText: string, _tokenEst?: number, thought?: string) => {
            accumulated = fullText;
            if (thought) capturedThought = thought;
          }
        }
      );

      // Thinking complete, now sentence-by-sentence reveal with auto-scroll
      setIsThinking(false);
      const parsedTarget = extractThoughtAndContent(accumulated || streamingChunk, capturedThought);
      const targetText = parsedTarget.content.trim();
      if (!targetText) {
        console.warn('Empty AI response received, omitting empty message card');
        setStreamingChunk('');
        setDisplayedText('');
        return;
      }

      const sentences = targetText.match(/[^.!?\n]+[.!?\n]+[\s"']*|.+/g) || [targetText];
      let currentSoFar = '';
      for (let i = 0; i < sentences.length; i++) {
        currentSoFar += sentences[i];
        setDisplayedText(currentSoFar);
        scrollToBottom(false);
        await new Promise(r => setTimeout(r, Math.min(240, Math.max(95, 950 / sentences.length))));
      }

      const assistantMsg: ChatMessage = {
        id: 'msg_a_' + Date.now().toString(36),
        conversationId: conversation.id,
        sender: 'character',
        senderId: character.id,
        senderRole: 'assistant',
        content: targetText,
        thought: parsedTarget.thought,
        timestamp: 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      };

      const finalMessages = [...trimmed, assistantMsg];
      setMessages(finalMessages);

      const turnInTokens = liveTokenStats.inputTokens;
      const turnOutTokens = Math.max(1, Math.round(targetText.length / 4));
      const newCumulative = calcCumulativeUpdate(conversation, turnInTokens, turnOutTokens);

      const updatedConv: Conversation = {
        ...conversation,
        messages: finalMessages,
        messageCount: finalMessages.length,
        customPrompt,
        cumulativeUsage: newCumulative,
        updatedAt: new Date().toISOString()
      };
      onUpdateConversation(updatedConv);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
      setIsThinking(false);
      setStreamingChunk('');
      setDisplayedText('');
    }
  };

  const handleContinue = async () => {
    if (isGenerating || messages.length === 0) return;

    // Find the last message; if it's from the character, we extend it directly
    const lastIdx = messages.length - 1;
    const lastMsg = messages[lastIdx];
    const isLastChar = lastMsg.sender === 'character' || lastMsg.senderRole === 'assistant';

    setIsGenerating(true);
    setIsThinking(true);
    setIsThinkingOpen(false);
    setStreamingChunk('');
    setDisplayedText('');

    const senderRoleName = currentPersona?.name || currentUser.displayName;
    setThinkingContent(
      [
        `Extending ${character.name}'s narration seamlessly from the previous paragraph...`,
        `Maintaining scene continuity, pacing, and emotional momentum with ${senderRoleName}.`
      ].join('\n')
    );

    try {
      let accumulated = '';
      // Provide a temporary continuation directive turn to the LLM without saving it as a user message
      const continueInstructionMsg: ChatMessage = {
        id: 'msg_continue_prompt',
        conversationId: conversation.id,
        sender: 'user',
        senderId: currentUser.id,
        senderRole: 'user',
        content: `[System Note: Continue and extend ${character.name}'s narration and dialogue seamlessly from where the last sentence ended. Do not repeat what was already said; advance the scene naturally with rich detail.]`,
        timestamp: 'Now'
      };

      const conversationForContinue: Conversation = {
        ...conversation,
        messages: [...messages, continueInstructionMsg],
        customPrompt
      };

      let capturedThought = '';
      await aiProviderService.streamRoleplayResponse(
        conversationForContinue,
        character,
        currentScenario,
        currentPersona,
        lorebooks,
        {
          ...currentProvider,
          customPrompt
        },
        {
          onThinking: (thought: string) => {
            capturedThought = thought;
            setThinkingContent(thought);
          },
          onChunk: (chunk: string) => {
            accumulated = chunk;
            setStreamingChunk(accumulated);
          },
          onError: (err: Error) => {
            console.error('Continue streaming error', err);
            alert(err.message || 'Error communicating with AI router.');
          },
          onComplete: (fullText: string, _tokenEst?: number, thought?: string) => {
            accumulated = fullText;
            if (thought) capturedThought = thought;
          }
        }
      );

      setIsThinking(false);
      const parsedTarget = extractThoughtAndContent(accumulated || streamingChunk, capturedThought);
      const targetText = parsedTarget.content.trim();
      if (!targetText) {
        console.warn('Empty continue response received, omitting update');
        setStreamingChunk('');
        setDisplayedText('');
        return;
      }
        const sentences = targetText.match(/[^.!?\n]+[.!?\n]+[\s"']*|.+/g) || [targetText];
        let currentSoFar = '';
        for (let i = 0; i < sentences.length; i++) {
          currentSoFar += sentences[i];
          setDisplayedText(currentSoFar);
          scrollToBottom(false);
          await new Promise(r => setTimeout(r, Math.min(240, Math.max(95, 950 / sentences.length))));
        }

        let finalMessages: ChatMessage[];
        if (isLastChar) {
          const updatedLast: ChatMessage = {
            ...lastMsg,
            content: `${lastMsg.content.trim()}\n\n${targetText}`,
            thought: parsedTarget.thought || lastMsg.thought
          };
          finalMessages = [...messages.slice(0, lastIdx), updatedLast];
        } else {
          const assistantMsg: ChatMessage = {
            id: 'msg_a_' + Date.now().toString(36),
            conversationId: conversation.id,
            sender: 'character',
            senderId: character.id,
            senderRole: 'assistant',
            content: targetText,
            thought: parsedTarget.thought,
            timestamp: 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          };
          finalMessages = [...messages, assistantMsg];
        }

        setMessages(finalMessages);

        const turnInTokens = liveTokenStats.inputTokens;
        const turnOutTokens = Math.max(1, Math.round(targetText.length / 4));
        const newCumulative = calcCumulativeUpdate(conversation, turnInTokens, turnOutTokens);

        const updatedConv: Conversation = {
          ...conversation,
          messages: finalMessages,
          messageCount: finalMessages.length,
          customPrompt,
          cumulativeUsage: newCumulative,
          updatedAt: new Date().toISOString()
        };
        onUpdateConversation(updatedConv);
    } catch (err) {
      console.error('Continue narration error:', err);
    } finally {
      setIsGenerating(false);
      setIsThinking(false);
      setStreamingChunk('');
      setDisplayedText('');
    }
  };

  const handleAssistText = async (mode: 'write_for_me' | 'refine_my_word') => {
    setIsAssistMenuOpen(false);
    if (isAssisting || isGenerating) return;

    setIsAssisting(true);
    try {
      const generatedProse = await aiProviderService.assistUserDraft(
        mode,
        inputText,
        character,
        currentPersona,
        { ...conversation, messages },
        currentProvider
      );
      if (generatedProse) {
        setInputText(generatedProse);
        if (generatedProse.length > 80 || generatedProse.includes('\n')) {
          setIsComposerExpanded(true);
        }
        setTimeout(() => {
          resizeComposer();
          if (textareaRef.current) {
            textareaRef.current.scrollTop = 0;
            textareaRef.current.focus();
          }
        }, 30);
      }
    } catch (e) {
      console.error('Text assistance failed', e);
    } finally {
      setIsAssisting(false);
    }
  };

  const handleTestAIConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await aiProviderService.testConnection({
        providerType,
        apiKey: gatewayApiKey.trim(),
        baseUrl: gatewayBaseUrl.trim(),
        defaultModel: gatewayModel.trim()
      });
      setConnectionTestResult(res);
    } catch (e: any) {
      setConnectionTestResult({
        success: false,
        message: e.message || 'Connection test failed. Check URL & network access.'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Helper to build realistic summary based on dialogue turns
  const buildContextualSummary = (messagesSlice: ChatMessage[]): string => {
    if (messagesSlice.length === 0) {
      return `${character.name} and ${currentUser.displayName} are beginning their interaction.`;
    }

    const topics: string[] = [];
    const userTopics = messagesSlice
      .filter(m => m.sender === 'user' || m.senderRole === 'user')
      .map(m => m.content.replace(/\*/g, '').slice(0, 70));

    if (userTopics.length > 0) {
      topics.push(`${currentUser.displayName} discussed: "${userTopics[userTopics.length - 1]}..."`);
    }

    return `${character.name} and ${currentUser.displayName} have exchanged ${messagesSlice.length} turns in "${currentScenario?.title || 'their roleplay session'}". ${character.name} remains deeply engaged in their authentic personality traits. Key themes: ${topics.join('; ') || 'deepened emotional and narrative rapport'}.`;
  };

  // Summarizing progress state
  const [isSummarizing, setIsSummarizing] = useState(false);

  // 1. Initial or Replace with New Memory (Summarize entire conversation from start to current turn and set checkpoint)
  const handleReplaceWithNewMemory = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);

    try {
      const now = 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const result = await aiProviderService.generateDetailedSummary(
        conversation,
        character,
        currentPersona,
        currentProvider,
        messages
      );

      const newCheckpoint = messages.length;
      setConvSummary(result.summary);
      setLastSummaryDate(now);
      setMemoryCheckpoint(newCheckpoint);

      const newMemories = [
        ...result.extractedMemories,
        `Checkpoint #${newCheckpoint}: canon memory refreshed.`
      ];
      setKeyMemories(newMemories);

      const updatedConv: Conversation = {
        ...conversation,
        summary: result.summary,
        lastSummaryAt: now,
        memoryCheckpoint: newCheckpoint,
        keyMemories: newMemories,
        customPrompt
      };
      onUpdateConversation(updatedConv);
    } catch (e) {
      console.error('Failed to generate detailed memory', e);
    } finally {
      setIsSummarizing(false);
    }
  };

  // 2. Continue the Generate Memory (Summarize incremental turns from last checkpoint to current turn and update checkpoint)
  const handleContinueGenerateMemory = async () => {
    if (isSummarizing || messages.length <= memoryCheckpoint) return;
    setIsSummarizing(true);

    try {
      const fromIdx = memoryCheckpoint;
      const toIdx = messages.length;
      const now = 'Today at ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

      const incrementalSlice = messages.slice(fromIdx, toIdx);
      const result = await aiProviderService.generateDetailedSummary(
        conversation,
        character,
        currentPersona,
        currentProvider,
        incrementalSlice,
        convSummary
      );

      const combinedSummary = result.summary;
      setConvSummary(combinedSummary);
      setLastSummaryDate(now);
      setMemoryCheckpoint(toIdx);

      const newMemories = Array.from(new Set([
        ...keyMemories,
        ...result.extractedMemories,
        `Checkpoint #${toIdx}: updated from turn #${fromIdx + 1}.`
      ]));
      setKeyMemories(newMemories);

      const updatedConv: Conversation = {
        ...conversation,
        summary: combinedSummary,
        lastSummaryAt: now,
        memoryCheckpoint: toIdx,
        keyMemories: newMemories,
        customPrompt
      };
      onUpdateConversation(updatedConv);
    } catch (e) {
      console.error('Failed to continue memory generation', e);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Helper to replace {{user}}, [[user]], {{char}}, [[char]] macros AND normalize HTML <img> / bare image URLs into Markdown
  const replaceRoleplayMacros = (rawText: string, personaNameOverride?: string): string => {
    if (!rawText) return '';
    const activeUserLabel =
      personaNameOverride || currentPersona?.name || currentUser.displayName || 'User';
    let processed = rawText
      .replace(/`?\{\{user\}\}`?|`?\[\[user\]\]`?|<user>/gi, activeUserLabel)
      .replace(/`?\{\{char\}\}`?|`?\[\[char\]\]`?|<char>/gi, chatCharName);
    if (character.name && character.name !== chatCharName) {
      processed = processed.split(character.name).join(chatCharName);
      const taglessName = character.name.replace(/^\s*(?:\([a-zA-Z0-9_\s-]+\)|\[[a-zA-Z0-9_\s-]+\])\s*/g, '').trim();
      if (taglessName && taglessName !== chatCharName && taglessName !== character.name) {
        processed = processed.split(taglessName).join(chatCharName);
      }
    }
    return processed
      // Convert HTML <img ... src="url" ...> into Markdown ![alt](url)
      .replace(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*?>/gi, (fullTag, src) => {
        const altMatch = fullTag.match(/\balt=["']([^"']*)["']/i);
        const alt = altMatch ? altMatch[1].trim() : '';
        return `\n![${alt}](${src.trim()})\n`;
      })
      // Convert standalone bare image URLs on their own line into ![](url)
      .replace(
        /(^|\n)\s*(https?:\/\/[^\s<>)"']+\.(?:png|jpe?g|webp|gif)(?:\?[^\s<>)"']*)?)\s*(?=\n|$)/gi,
        '$1![]($2)'
      );
  };

  // Helper to format roleplay text with italics for asterisks (*), bold (**), triple (***), images, and customization.actionColor
  const renderRoleplayText = (
    rawContent: string,
    isUserMessage: boolean = false,
    personaNameOverride?: string
  ) => {
    if (!rawContent) return null;

    const content = replaceRoleplayMacros(rawContent, personaNameOverride);

    // Split on markdown images: ![alt](url) (allowing optional whitespace around url)
    const imageSplitRegex = /(!\[.*?\]\(\s*(?:https?:\/\/[^\s)]+|data:image\/[^\s)]+)\s*\))/g;
    const segments = content.split(imageSplitRegex);

    const baseTextColor = isUserMessage ? customization.userTextColor : customization.dialogueColor;
    const narrationColor = customization.actionColor || '#c084fc';

    return segments.map((seg, sIdx) => {
      // Check if this segment is a full image tag
      const imgMatch = seg.match(
        /^!\[(.*?)\]\(\s*((?:https?:\/\/[^\s)]+|data:image\/[^\s)]+))\s*\)$/
      );
      if (imgMatch) {
        const alt = imgMatch[1];
        const src = imgMatch[2];
        return (
          <span key={`img_${sIdx}`} className="block my-3 max-w-full animate-scale-in">
            <img
              src={src}
              alt={alt || 'Scene media'}
              loading="lazy"
              onClick={() => setLightboxImage({ url: src, title: alt || character.name })}
              className="max-w-full sm:max-w-[380px] max-h-[440px] object-cover rounded-2xl border border-white/15 shadow-2xl transition-all duration-300 hover:scale-[1.015] hover:border-purple-400/50 active:scale-[0.99] cursor-pointer"
            />
            {alt && alt.trim() && (
              <span className="block text-[11px] text-neutral-400 mt-1.5 italic font-sans">
                {alt}
              </span>
            )}
          </span>
        );
      }

      // Parse ***bold italic***, **bold**, and *italic narration* using customization.actionColor
      const tokenRegex = /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[^*\n]+\*)/g;
      const parts = seg.split(tokenRegex);

      return (
        <span key={`txt_${sIdx}`} style={{ color: baseTextColor }}>
          {parts.map((part, i) => {
            if (part.startsWith('***') && part.endsWith('***') && part.length > 6) {
              return (
                <strong
                  key={i}
                  className="font-bold italic"
                  style={{ color: narrationColor }}
                >
                  {part.slice(3, -3)}
                </strong>
              );
            }
            if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
              const inner = part.slice(2, -2);
              const isDialogue = inner.includes('"') || inner.includes('“') || inner.includes('”');
              return (
                <strong
                  key={i}
                  className="font-bold"
                  style={{ color: isDialogue ? baseTextColor : narrationColor }}
                >
                  {inner}
                </strong>
              );
            }
            if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
              return (
                <em
                  key={i}
                  className="italic font-normal"
                  style={{ color: narrationColor }}
                >
                  {part.slice(1, -1)}
                </em>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </span>
      );
    });
  };

  // Font family style mapper
  const getFontFamilyStyle = () => {
    switch (customization.fontFamily) {
      case 'serif':
        return { fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' };
      case 'mono':
        return { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace' };
      case 'casual':
        return { fontFamily: '"Comic Sans MS", "Comic Neue", cursive, sans-serif' };
      case 'rounded':
        return { fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', letterSpacing: '0.015em' };
      case 'sans':
      default:
        return { fontFamily: 'inherit' };
    }
  };

  // Font size class mapper (Optimized for comfortable reading on mobile & desktop)
  const fontSizeClass =
    customization.fontSize === 'sm'
      ? 'text-[13px] sm:text-[14px]'
      : customization.fontSize === 'lg'
      ? 'text-[16px] sm:text-[17.5px]'
      : 'text-[14px] sm:text-[15.5px]';

  return (
    <div className="fixed inset-0 md:relative md:inset-auto flex h-[100dvh] w-full bg-[#0c0e14] overflow-hidden text-neutral-200 select-none z-30">
      {/* 1. COLUMN 2: Recent Chats Column (Desktop only) — Grouped Character Accordion Cards */}
      <div className="hidden lg:flex flex-col w-80 border-r border-[#1a1d27] bg-[#0c0e14] shrink-0">
        <div className="p-3 border-b border-[#1a1d27] space-y-2">
          <div className="bg-[#131620] border border-[#202534] rounded-lg px-2.5 py-1.5 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Search characters or chats..."
              value={recentSearch}
              onChange={e => setRecentSearch(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none w-full"
            />
          </div>
        </div>

        <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-neutral-300 shrink-0">All characters</span>
          <div className="h-px bg-[#1f2433] flex-1" />
        </div>

        {/* Grouped Character Cards: 1 card per character holding multiple chat sessions */}
        <div className="flex-1 overflow-y-auto px-2.5 pb-4 space-y-2.5">
          {(() => {
            const map = new Map<string, Conversation[]>();
            for (const conv of allConversations) {
              if (!conv.messages || conv.messages.length === 0) continue;
              const list = map.get(conv.characterId) || [];
              list.push(conv);
              map.set(conv.characterId, list);
            }

            const groups = Array.from(map.entries())
              .map(([charId, charConvs]) => {
                const char = allCharacters.find(c => c.id === charId) || character;
                const sorted = [...charConvs].sort((a, b) => {
                  const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                  const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                  return timeB - timeA;
                });
                const latestTime = sorted[0]
                  ? new Date(sorted[0].updatedAt || sorted[0].createdAt || 0).getTime()
                  : 0;
                return { charId, char, sorted, latestTime };
              })
              .sort((a, b) => b.latestTime - a.latestTime)
              .filter(g => {
                if (!recentSearch.trim()) return true;
                const q = recentSearch.toLowerCase();
                return (
                  g.char.name.toLowerCase().includes(q) ||
                  (g.char.subtitle || '').toLowerCase().includes(q) ||
                  g.sorted.some(c => c.messages.some(m => m.content.toLowerCase().includes(q)))
                );
              });

            return groups.map(({ charId, char, sorted }) => {
              const isExpanded = expandedSidebarCharId === charId;
              const isActiveChar = charId === character.id;

              return (
                <div
                  key={charId}
                  className={`rounded-xl border overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isExpanded
                      ? 'bg-[#141824] border-purple-500/40 shadow-md shadow-purple-950/20'
                      : isActiveChar
                      ? 'bg-[#141824] border-[#2d344b]'
                      : 'bg-[#11141e] border-[#1e2333]'
                  }`}
                >
                  {/* Character Accordion Header */}
                  <div
                    onClick={() =>
                      setExpandedSidebarCharId(prev => (prev === charId ? null : charId))
                    }
                    className="p-2.5 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-[#191e2d] transition-colors active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={char.avatarUrl}
                        alt={char.name}
                        className="w-11 h-11 rounded-lg object-cover bg-neutral-900 shrink-0 border border-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white line-clamp-2 leading-tight">
                          {char.subtitle ? `${char.name} | ${char.subtitle}` : char.name}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          chats: {sorted.length}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-neutral-400 shrink-0">
                      {onDeleteConversation && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            sorted.forEach(c => onDeleteConversation(c.id));
                          }}
                          className="p-1.5 text-neutral-400 hover:text-rose-400 active:text-rose-400 rounded-lg hover:bg-rose-500/15 transition-all cursor-pointer"
                          title="Delete all chats with this character"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          isExpanded ? 'rotate-180 text-purple-300' : 'rotate-0'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Smoothly Animated Expanded Multi-Chat Sessions List */}
                  <div
                    className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isExpanded
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                    }`}
                  >
                    <div className="overflow-hidden min-h-0">
                      <div className="p-2.5 pt-2 border-t border-[#222738] bg-[#0f121b] space-y-2.5">
                        <div className="flex items-center gap-2">
                          {onStartNewChat && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                onStartNewChat(char);
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#df7afe] to-[#c084fc] hover:from-[#e894ff] hover:to-[#d8b4fe] text-[#170926] font-bold text-[11px] shadow-sm transition-all active:scale-95 cursor-pointer"
                            >
                              Start new chat
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setCharacterInfoModal({ isOpen: true, isPersona: false });
                            }}
                            className="text-[11px] font-semibold text-neutral-300 hover:text-purple-300 transition-colors cursor-pointer px-1.5 py-1"
                          >
                            View character
                          </button>
                        </div>

                        <div className="space-y-2">
                          {sorted.map(conv => {
                            const convPersona =
                              allPersonas.find(p => p.id === conv.personaId) || currentPersona;
                            const isSelected = conv.id === conversation.id;
                            const lastMsg = conv.messages[conv.messages.length - 1];
                            const resolvedMsg = lastMsg
                              ? lastMsg.content
                                  .replace(
                                    /`?\{\{user\}\}`?|`?\[\[user\]\]`?|<user>/gi,
                                    convPersona?.name || currentUser.displayName || 'User'
                                  )
                                  .replace(/`?\{\{char\}\}`?|`?\[\[char\]\]`?|<char>/gi, char.name)
                                  .replace(/[*_~`]/g, '')
                                  .replace(/\s+/g, ' ')
                                  .trim()
                              : '';
                            const sneakPeek = resolvedMsg
                              ? resolvedMsg.slice(0, 100) + (resolvedMsg.length > 100 ? '...' : '')
                              : 'No messages yet...';

                            return (
                              <div
                                key={conv.id}
                                onClick={() => onSelectConversation && onSelectConversation(conv)}
                                className={`relative p-2.5 pl-3.5 rounded-xl border cursor-pointer transition-all duration-200 active:scale-[0.98] space-y-1.5 ${
                                  isSelected
                                    ? 'bg-[#1c2132] border-purple-500/60 text-white shadow-md'
                                    : 'bg-[#161a26] hover:bg-[#1b2030] border-[#262c3f] text-neutral-200'
                                }`}
                              >
                                {/* Left purple accent bar */}
                                <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-purple-400" />

                                {/* Top metadata row: Lock + Persona pill + Message count */}
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Lock className="w-3 h-3 text-neutral-400 shrink-0" />
                                    {convPersona && (
                                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#262c3f] border border-white/10 min-w-0">
                                        <img
                                          src={convPersona.avatarUrl}
                                          alt={convPersona.name}
                                          className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                                        />
                                        <span className="text-[10px] text-neutral-200 font-medium truncate max-w-[100px]">
                                          as {convPersona.name}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-200 shrink-0">
                                    <MessageSquare className="w-3 h-3 text-neutral-400" />
                                    <span>{conv.messages.length}</span>
                                    {onDeleteConversation && (
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation();
                                          onDeleteConversation(conv.id);
                                        }}
                                        className="p-1 text-neutral-400 hover:text-rose-400 active:text-rose-400 rounded-md hover:bg-rose-500/15 transition-all cursor-pointer"
                                        title="Delete this chat session"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Sneak peek */}
                                <p className="text-[11px] text-neutral-200 line-clamp-2 leading-relaxed font-sans">
                                  {sneakPeek}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* 2. COLUMN 3: Main Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-[#0c0e14]">
        {/* Fixed Global Background Wallpaper & Dark Dim Overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div
            className="w-full h-full transition-all duration-300"
            style={{
              backgroundImage: `url("${activeBg.imageUrl || customization.backgroundImageUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80'}")`,
              backgroundPosition: 'center',
              backgroundSize: activeBg.fit || 'cover',
              backgroundRepeat: 'no-repeat',
              filter: `blur(${activeBg.blur ?? 6}px)`
            }}
          />
          <div
            className="absolute inset-0 bg-black transition-opacity duration-300"
            style={{
              opacity: typeof customization.backgroundDim === 'number'
                ? customization.backgroundDim
                : (activeBg.darkOverlay !== undefined ? activeBg.darkOverlay / 100 : 0.7)
            }}
          />
        </div>

        {/* Floating Frosted-Glass Top Bar: Always visible on mobile & desktop */}
        <div
          className="mx-2.5 h-[52px] rounded-2xl border border-white/15 bg-[#0c0e14]/55 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.45)] px-3 sm:px-4 flex items-center justify-between shrink-0 z-30"
          style={{
            marginTop: 'max(8px, env(safe-area-inset-top, 8px))'
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-850 transition-colors cursor-pointer"
              title="Return back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="relative shrink-0">
              <img
                src={character.avatarUrl}
                alt={character.name}
                referrerPolicy="no-referrer"
                onClick={() => setLightboxImage({ url: character.avatarUrl, title: character.name })}
                className="w-8 h-8 rounded-full object-cover bg-neutral-900 ring-1 ring-neutral-700 cursor-pointer hover:ring-2 hover:ring-purple-400 hover:scale-105 active:scale-95 transition-all"
                title="Click to view image preview"
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-black" />
            </div>

            <div className="min-w-0 flex-1 pr-2">
              <button
                type="button"
                onClick={() => setCharacterInfoModal({ isOpen: true, isPersona: false })}
                className="max-w-full text-xs sm:text-sm font-bold text-white hover:text-purple-300 transition-colors leading-tight flex items-center gap-1.5 cursor-pointer text-left"
                title="Click to view character description and card"
              >
                <span className="truncate">{chatCharName}</span>
                {character.contentRating === 'NSFW' && (
                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-rose-950/80 text-rose-400 border border-rose-800/40 shrink-0">
                    18+
                  </span>
                )}
              </button>
              <div className="text-[10px] sm:text-[11px] text-neutral-400 truncate mt-0.5">
                {currentScenario?.title || 'Roleplay Session'}
              </div>
            </div>
          </div>

          {/* Right Action Icons: Quick Token Counter Pill & 3-Dots Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-neutral-400">
            {/* Interactive Token Counter & Price Indicator Pill */}
            {(() => {
              const tier = tokenOptimizerService.getTierByLevel(currentOptimizerLevel);
              return (
                <button
                  type="button"
                  onClick={() => setIsTokenCounterOpen(true)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer shadow-sm active:scale-95 ${tier.badgeColor} hover:brightness-110`}
                  title={`Context: ${tokenPriceService.formatTokenCount(liveTokenStats.totalContextTokens)} / ${tokenPriceService.formatTokenCount(liveTokenStats.contextLimit)} tok (${liveTokenStats.contextUsagePercent}%) · Turn Cost: ${tokenPriceService.formatCost(liveTokenStats.totalCost)} · Rates: $${tokenPriceConfig.pricePer1MInput}/1M in · $${tokenPriceConfig.pricePer1MOutput}/1M out — Click to open Token Counter & Price Calculator`}
                >
                  <Coins className="w-3.5 h-3.5 text-purple-300" />
                  <span className="font-mono">{tokenPriceService.formatTokenCount(liveTokenStats.totalContextTokens)}</span>
                  <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                    · {liveTokenStats.formattedTotalCost}
                  </span>
                  {currentOptimizerLevel !== 'off' && (
                    <span className="text-[9px] font-extrabold px-1 rounded bg-purple-500/30 text-purple-200">
                      {tier.badge}
                    </span>
                  )}
                </button>
              );
            })()}

            {/* The 3-Dots Button (Toggles options/settings drawer smoothly without squishing screen) */}
            <button
              onClick={() => setRightPanel(rightPanel === 'options' ? 'hidden' : 'options')}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer ${
                rightPanel !== 'hidden'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'hover:text-white hover:bg-neutral-800/60 text-neutral-300'
              }`}
              title="Chat Options & AI Settings"
            >
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Continuous Transcript with Custom Styling & Font (No wallpaper tearing/bug) */}
        <div
          ref={messagesContainerRef}
          onScroll={handleTranscriptScroll}
          className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-8 pt-3 pb-1 space-y-3.5 relative z-10 bg-transparent"
          style={getFontFamilyStyle()}
        >
          <div className="relative z-10 space-y-4 max-w-4xl mx-auto">
            {messages.map(msg => {
              const isUser = msg.sender === 'user' || msg.senderRole === 'user';
              // Resolve active persona for user messages: prefer persona saved on message, then active currentPersona
              const msgPersona = msg.personaId ? allPersonas.find(p => p.id === msg.personaId) : null;
              const effectivePersona = msgPersona || currentPersona;
              const senderName = isUser
                ? (effectivePersona?.name || msg.personaName || currentUser.displayName)
                : chatCharName;
              const senderAvatar = isUser
                ? (effectivePersona?.avatarUrl || currentUser.avatarUrl)
                : (character.avatarUrl || character.coverUrl || '');
              const isEditing = editingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className="group flex items-start gap-3 py-2 px-2.5 rounded-2xl hover:bg-white/[0.04] transition-all relative animate-message"
                >
                  {/* Circular Avatar: Click opens centered Lightbox Modal */}
                  <img
                    src={senderAvatar}
                    alt={senderName}
                    referrerPolicy="no-referrer"
                    onClick={() => setLightboxImage({ url: senderAvatar, title: senderName })}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 bg-neutral-900 mt-0.5 shadow-sm cursor-pointer hover:ring-2 hover:ring-purple-400 hover:scale-105 active:scale-95 transition-all"
                    title="Click to view full image preview"
                  />

                  {/* Message Content & Actions */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 min-w-0">
                      <div className="flex items-baseline gap-1.5 min-w-0 shrink">
                        <button
                          type="button"
                          onClick={() => setCharacterInfoModal({ isOpen: true, isPersona: isUser })}
                          className="text-xs sm:text-sm font-bold text-white hover:text-purple-300 transition-colors cursor-pointer text-left truncate max-w-[120px] xs:max-w-[160px] sm:max-w-xs"
                          title="Click to view profile card and description"
                        >
                          {senderName}
                        </button>
                        <span className="text-[10px] text-neutral-500 font-normal shrink-0">{msg.timestamp}</span>
                      </div>

                      {/* Action buttons: transparent frosted glass pill */}
                      <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity flex items-center gap-0.5 sm:gap-1 bg-[#0c0e14]/60 backdrop-blur-xl px-1.5 py-0.5 rounded-xl border border-white/15 shadow-lg shrink-0 mr-0.5 z-10">
                        {/* Allow Regenerate from a user message OR on a character response that follows a user message */}
                        {(isUser || messages.findIndex(m => m.id === msg.id) > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              const msgIndex = messages.findIndex(m => m.id === msg.id);
                              if (msgIndex === -1) return;
                              if (isUser) {
                                handleRegenerate(msgIndex);
                              } else {
                                // Find the preceding user message to regenerate from
                                for (let i = msgIndex - 1; i >= 0; i--) {
                                  if (messages[i].sender === 'user' || messages[i].senderRole === 'user') {
                                    handleRegenerate(i);
                                    return;
                                  }
                                }
                                handleRegenerate();
                              }
                            }}
                            disabled={isGenerating}
                            className="p-1.5 sm:p-1 text-purple-400 hover:text-purple-300 active:scale-90 transition-transform disabled:opacity-40 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                            title={isUser ? 'Regenerate response to this message' : 'Regenerate this response'}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="p-1.5 sm:p-1 text-neutral-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
                          title="Copy"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageId(msg.id);
                            setEditText(msg.content);
                          }}
                          className="p-1.5 sm:p-1 text-neutral-400 hover:text-white active:scale-90 transition-transform cursor-pointer"
                          title="Edit message"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1.5 sm:p-1 text-neutral-400 hover:text-rose-400 active:scale-90 transition-transform cursor-pointer"
                          title={isUser ? 'Delete message and response below' : 'Delete message'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-2 space-y-2 animate-fade-in">
                        <textarea
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          rows={3}
                          enterKeyHint="enter"
                          className="w-full bg-[#131620] border border-[#2b3145] rounded-xl p-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 resize-y"
                        />
                        <div className="flex items-center flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(msg.id)}
                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 active:scale-95 transition-all text-white rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Save
                          </button>
                          {/* If user message: give option to Save & Regenerate from this edited message */}
                          {isUser && (
                            <button
                              type="button"
                              onClick={() => {
                                const msgIndex = messages.findIndex(m => m.id === msg.id);
                                if (msgIndex !== -1) {
                                  handleRegenerate(msgIndex, editText);
                                }
                              }}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 active:scale-95 transition-all text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-purple-600/30"
                              title="Update your message and generate a fresh response from the bot"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Save & Regenerate</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingMessageId(null)}
                            className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 active:scale-95 transition-all text-neutral-300 rounded-lg text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`${fontSizeClass} leading-relaxed mt-1 whitespace-pre-wrap selection:bg-purple-600/40`}
                      >
                        {(() => {
                          const parsed = !isUser
                            ? extractThoughtAndContent(msg.content, msg.thought)
                            : { thought: undefined, content: msg.content };
                          const hasThought = Boolean(parsed.thought);
                          const isThoughtOpen = openThoughtMsgIds[msg.id];

                          return (
                            <>
                              {hasThought && (
                                <div className="mb-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleMessageThought(msg.id)}
                                    className="text-[11px] font-mono flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
                                    title="Toggle AI internal reasoning / thinking process"
                                  >
                                    <Sparkles className="w-3 h-3 text-purple-400" />
                                    <span>{isThoughtOpen ? 'Hide Internal Reasoning' : 'View Internal Reasoning'}</span>
                                  </button>
                                  {isThoughtOpen && (
                                    <div className="mt-1.5 p-3 rounded-xl bg-[#0e111a]/95 border border-purple-500/25 text-neutral-300 text-xs font-sans leading-relaxed whitespace-pre-wrap animate-fade-in shadow-inner max-h-72 overflow-y-auto">
                                      <div className="text-[10px] uppercase font-bold text-purple-400 mb-1 tracking-wider border-b border-purple-900/30 pb-0.5">
                                        Internal Monologue
                                      </div>
                                      {parsed.thought}
                                    </div>
                                  )}
                                </div>
                              )}
                              {renderRoleplayText(
                                parsed.content,
                                isUser,
                                effectivePersona?.name || msg.personaName || currentUser.displayName
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* >> Extend Narration Pill on the latest character response */}
                    {!isUser &&
                      !isGenerating &&
                      messages[messages.length - 1]?.id === msg.id && (
                        <div className="mt-2.5 flex items-center">
                          <button
                            type="button"
                            onClick={handleContinue}
                            className="px-3 py-1 rounded-xl bg-[#0c0e14]/65 hover:bg-purple-600/25 backdrop-blur-xl border border-purple-500/35 hover:border-purple-400 text-purple-300 hover:text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                            title="Extend narration (>>)"
                          >
                            <ChevronsRight className="w-3.5 h-3.5 text-purple-400" />
                            <span>Extend Narration</span>
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              );
            })}

            {/* Live Thinking Phase with Small Window to See Through & Sentence-by-Sentence Reveal */}
            {isGenerating && (
              <div className="flex items-start gap-3 py-2.5 px-3 rounded-2xl bg-[#0c0e14]/55 backdrop-blur-xl border border-white/15 shadow-lg transition-all animate-message">
                <img
                  src={character.avatarUrl}
                  alt={character.name}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shrink-0 bg-neutral-900 mt-0.5 ring-1 ring-purple-500/30"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white">{chatCharName}</span>
                      <span className="text-[10px] text-purple-400 font-mono animate-pulse">
                        {isThinking ? 'thinking...' : 'writing...'}
                      </span>
                    </div>

                    {/* Small Window Toggle Button to inspect the thinking process */}
                    <button
                      type="button"
                      onClick={() => setIsThinkingOpen(!isThinkingOpen)}
                      className="px-2 py-0.5 rounded-lg bg-[#181d2c] hover:bg-[#20273a] text-purple-300 border border-purple-500/25 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                      title="Inspect character internal reasoning & thinking window"
                    >
                      <Brain className="w-3 h-3 text-purple-400" />
                      <span>{isThinkingOpen ? 'Hide Thinking' : 'View Thinking'}</span>
                    </button>
                  </div>

                  {/* Thinking Process Small See-Through Window */}
                  {isThinkingOpen && (
                    <div className="bg-[#090b10]/90 border border-purple-900/40 rounded-xl p-2.5 text-[11px] font-mono text-purple-200/90 space-y-1 shadow-inner animate-in fade-in duration-200 backdrop-blur-sm">
                      <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold border-b border-purple-900/30 pb-1">
                        <span className="flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          <span>Internal Processing Window</span>
                        </span>
                        <span className="text-emerald-400 font-mono">active</span>
                      </div>
                      <div className="whitespace-pre-wrap text-neutral-300 leading-relaxed font-sans text-xs pt-1">
                        {thinkingContent || 'Synthesizing contextual character dialogue...'}
                      </div>
                    </div>
                  )}

                  {/* Writing Animation: While thinking, smooth pulse indicator; Once thinking done, natural word-by-word reveal */}
                  {isThinking ? (
                    <div className="flex items-center gap-2 py-1.5 text-neutral-400 text-xs italic">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                      <span>{chatCharName} is contemplating their response...</span>
                    </div>
                  ) : (
                    <div className={`${fontSizeClass} leading-relaxed whitespace-pre-wrap selection:bg-purple-600/40`}>
                      {renderRoleplayText(displayedText || streamingChunk, false)}
                      <span className="inline-block w-1.5 h-3.5 bg-purple-400 ml-1 animate-pulse align-middle" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-0 m-0 p-0 pointer-events-none" />
          </div>
        </div>

        {/* Center Floating Quick Scroll-Down Button when scrolled up */}
        {isScrolledUp && (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-[#0c0e14]/70 hover:bg-[#161a29]/85 backdrop-blur-2xl border border-purple-400/40 text-white text-xs font-bold shadow-[0_8px_28px_rgba(0,0,0,0.6)] flex items-center gap-1.5 cursor-pointer animate-slide-up active:scale-95 transition-all"
            title="Quick scroll to bottom"
          >
            <ChevronDown className="w-4 h-4 text-purple-400 animate-bounce" />
            <span>Scroll to bottom</span>
          </button>
        )}

        {/* Floating Frosted-Glass Bottom Composer with Format Toolbar & Quick Persona Switcher */}
        <div
          className="z-20 shrink-0 px-2.5 pt-1 bg-transparent"
          style={{
            paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))'
          }}
        >
          <div className="max-w-4xl mx-auto relative">
            {/* 1. Floating Blur Formatting Toolbar (Toggled by + button) */}
            {isFormatBarOpen && (
              <div className="absolute bottom-full mb-2 left-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#0c0e14]/70 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl z-30 animate-slide-up max-w-fit">
                <button
                  type="button"
                  onClick={() => handleInsertFormat('**', '**', 'bold text')}
                  className="px-2 py-1 rounded-lg hover:bg-[#1f2538] text-neutral-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                  title="Bold (**text**)"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormat('*', '*', 'action or narrative')}
                  className="px-2 py-1 rounded-lg hover:bg-[#1f2538] text-purple-300 hover:text-purple-200 text-xs italic font-serif transition-colors cursor-pointer"
                  title="Italic Narration (*narration*)"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormat('"', '"', 'spoken dialogue')}
                  className="px-2 py-1 rounded-lg hover:bg-[#1f2538] text-neutral-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                  title="Spoken Dialogue (&quot;speech&quot;)"
                >
                  " "
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormat('~~', '~~', 'strikethrough')}
                  className="px-2 py-1 rounded-lg hover:bg-[#1f2538] text-neutral-400 hover:text-white text-xs line-through transition-colors cursor-pointer"
                  title="Strikethrough (~~text~~)"
                >
                  S
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormat('[', ']', 'scene note')}
                  className="px-2 py-1 rounded-lg hover:bg-[#1f2538] text-neutral-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                  title="Scene Header / Bracket Note ([note])"
                >
                  [ ]
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertFormat('{{', '}}', 'user')}
                  className="px-2 py-1 rounded-lg hover:bg-[#1f2538] text-purple-400 hover:text-purple-300 text-[11px] font-mono transition-colors cursor-pointer"
                  title="Macro Tag ({{user}} or {{char}})"
                >
                  {'{ }'}
                </button>
                <div className="w-[1px] h-4 bg-[#23293d] mx-0.5" />
                <button
                  type="button"
                  onClick={() => setIsFormatBarOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#1f2538] text-neutral-500 hover:text-neutral-200 text-xs transition-colors cursor-pointer"
                  title="Close format bar"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Main Floating Frosted Glass Input Container */}
            <div className="bg-[#0c0e14]/70 backdrop-blur-2xl border border-white/15 focus-within:border-purple-400/50 rounded-2xl px-3 py-2 flex items-end gap-2 sm:gap-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all">
              {/* Left + Button: Toggles Floating Formatting Toolbar (BUG #10: aligned with input & send button) */}
              <button
                type="button"
                onClick={() => setIsFormatBarOpen(prev => !prev)}
                className={`w-8 h-8 mb-0.5 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                  isFormatBarOpen
                    ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                    : 'bg-[#181c28] hover:bg-[#202638] text-neutral-400 hover:text-white border border-white/10'
                }`}
                title="Format helpers (Bold, Italic, Quotes, Brackets)"
              >
                <Plus className={`w-4 h-4 transition-transform duration-200 ${isFormatBarOpen ? 'rotate-45' : ''}`} />
              </button>

              {/* Quick Persona Switcher with Avatar Selector */}
              <div className="relative shrink-0 mb-0.5">
                <button
                  type="button"
                  onClick={() => setIsPersonaQuickOpen(prev => !prev)}
                  className="w-8 h-8 rounded-xl ring-1 ring-purple-500/40 hover:ring-purple-400 hover:scale-105 transition-all overflow-hidden cursor-pointer"
                  title={`Roleplaying as: ${currentPersona?.name} (Click to switch persona)`}
                >
                  <img
                    src={currentPersona?.avatarUrl || currentUser.avatarUrl}
                    alt={currentPersona?.name || currentUser.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>

                {/* Persona Quick Selector Dropdown */}
                {isPersonaQuickOpen && (
                  <div className="absolute bottom-full mb-2 left-0 w-64 bg-[#121520]/95 backdrop-blur-md border border-[#23293d] rounded-2xl shadow-2xl p-2 z-40 animate-slide-up space-y-1">
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-[#1f2434] mb-1 flex items-center justify-between">
                      <span>Switch Persona</span>
                      <button
                        type="button"
                        onClick={() => setIsPersonaQuickOpen(false)}
                        className="text-neutral-500 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {allPersonas.map(p => {
                        const isSelected = p.id === activePersonaId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setActivePersonaId(p.id);
                              onUpdateConversation({ ...conversation, personaId: p.id });
                              setIsPersonaQuickOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-600/20 border border-purple-500/40 text-purple-200'
                                : 'hover:bg-[#1a1f30] text-neutral-300'
                            }`}
                          >
                            <img
                              src={p.avatarUrl}
                              alt={p.name}
                              className="w-7 h-7 rounded-full object-cover border border-purple-500/30 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate text-white">{p.name}</p>
                              <p className="text-[10px] text-neutral-400 truncate">{p.genderPronouns || 'Roleplay Identity'}</p>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Textarea - Auto-expanding, spacious, and highly legible */}
              <textarea
                ref={textareaRef}
                rows={1}
                enterKeyHint="enter"
                value={inputText}
                onFocus={() => {
                  setTimeout(() => scrollToBottom(true), 250);
                }}
                onChange={e => {
                  setInputText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  const scrollH = el.scrollHeight;
                  const targetMin = isComposerExpanded ? 160 : 44;
                  const targetMax = isComposerExpanded ? 400 : 260;
                  const clamped = Math.max(targetMin, Math.min(scrollH, targetMax));
                  el.style.height = `${clamped}px`;
                  setComposerHeight(clamped);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    const isMobileOrTouch =
                      window.innerWidth < 900 ||
                      window.matchMedia('(hover: none), (pointer: coarse)').matches ||
                      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
                    if (isMobileOrTouch) {
                      // On mobile keyboards, Enter inserts a new line instead of sending
                      return;
                    }
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Message ${chatCharName}...`}
                className="flex-1 bg-transparent text-sm sm:text-[15px] text-neutral-100 placeholder-neutral-500 focus:outline-none resize-none py-2.5 px-2.5 leading-normal overflow-y-auto selection:bg-purple-600/40"
                style={{
                  height: `${composerHeight}px`,
                  minHeight: isComposerExpanded ? '160px' : '44px',
                  maxHeight: isComposerExpanded ? '400px' : '260px',
                  lineHeight: '1.5'
                }}
              />

              {/* Expand / Minimize Toggle for Long Text or Multi-line drafting */}
              {(inputText.trim().length > 30 || isComposerExpanded || composerHeight > 55) && (
                <button
                  type="button"
                  onClick={() => setIsComposerExpanded(prev => !prev)}
                  className={`p-1.5 mb-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                    isComposerExpanded
                      ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  }`}
                  title={isComposerExpanded ? 'Collapse composer window' : 'Expand composer to full editor'}
                >
                  {isComposerExpanded ? (
                    <Minimize2 className="w-3.5 h-3.5 text-purple-300" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </button>
              )}

              {/* Right Controls: >> AI Assist / Extend + Send / Stop button */}
              <div className="flex items-center gap-1.5 shrink-0 relative mb-0.5">
                {isGenerating ? (
                  <button
                    type="button"
                    onClick={() => aiProviderService.stopGeneration()}
                    className="w-8 h-8 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all duration-150 active:scale-90 cursor-pointer shadow-sm ml-1 animate-scale-in"
                    title="Stop Generating"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                  </button>
                ) : (
                  <>
                    {/* >> Button with Popover: "Write for me" or "Refine my word" */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsAssistMenuOpen(prev => !prev)}
                        disabled={isAssisting}
                        className={`h-8 px-2 rounded-xl border flex items-center justify-center gap-0.5 text-xs font-extrabold transition-all duration-150 active:scale-90 cursor-pointer shadow-sm ${
                          isAssistMenuOpen
                            ? 'bg-purple-600 text-white border-purple-400'
                            : 'bg-[#181c28]/80 hover:bg-purple-600/30 border-purple-500/30 hover:border-purple-400 text-purple-300 hover:text-white'
                        }`}
                        title="AI Writing Assistant (>>)"
                      >
                        {isAssisting ? (
                          <Loader2 className="w-4 h-4 text-purple-300 animate-spin" />
                        ) : (
                          <ChevronsRight className="w-4 h-4 text-purple-400" />
                        )}
                      </button>

                      {/* Dropdown Menu for >> Button */}
                      {isAssistMenuOpen && (
                        <div className="absolute bottom-full mb-2.5 right-0 w-60 bg-[#10131d]/95 backdrop-blur-2xl border border-purple-500/40 rounded-2xl shadow-2xl p-2 z-40 animate-slide-up space-y-1">
                          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-[#202638] flex items-center justify-between">
                            <span className="flex items-center gap-1 text-purple-300">
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              <span>AI Text Assistant</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsAssistMenuOpen(false)}
                              className="text-neutral-500 hover:text-white text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Option 1: Write for me */}
                          <button
                            type="button"
                            onClick={() => handleAssistText('write_for_me')}
                            className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-purple-600/20 text-left transition-colors cursor-pointer group"
                          >
                            <PenTool className="w-4 h-4 text-purple-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                            <div>
                              <div className="text-xs font-bold text-white group-hover:text-purple-200">
                                Write for me
                              </div>
                              <div className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                                Turns your outline or blank input into rich roleplay prose
                              </div>
                            </div>
                          </button>

                          {/* Option 2: Refine my word */}
                          <button
                            type="button"
                            onClick={() => handleAssistText('refine_my_word')}
                            disabled={!inputText.trim()}
                            className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-purple-600/20 disabled:opacity-40 text-left transition-colors cursor-pointer group"
                          >
                            <Wand2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                            <div>
                              <div className="text-xs font-bold text-white group-hover:text-purple-200">
                                Refine my word
                              </div>
                              <div className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                                Polishes grammar, sensory details & actions of your text
                              </div>
                            </div>
                          </button>

                          {/* Option 3: Continue Bot Narration (if conversation has turns) */}
                          {messages.length > 0 && (
                            <div className="pt-1 border-t border-[#202638]">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAssistMenuOpen(false);
                                  handleContinue();
                                }}
                                className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-purple-600/20 text-left transition-colors cursor-pointer group"
                              >
                                <ChevronsRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                                <div>
                                  <div className="text-xs font-bold text-white group-hover:text-purple-200">
                                    Extend {chatCharName}'s reply
                                  </div>
                                  <div className="text-[10px] text-neutral-400 leading-tight mt-0.5">
                                    Let {chatCharName} keep talking from where they stopped
                                  </div>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      disabled={!inputText.trim()}
                      className="w-8 h-8 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white flex items-center justify-center transition-all duration-150 active:scale-90 hover:scale-105 cursor-pointer shadow-md shadow-purple-600/30"
                      title="Send message"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Smooth Slide-out Drawer: Opens via the 3-dots button, DOES NOT squish chat! */}
      {rightPanel !== 'hidden' && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setRightPanel('hidden')} />

          {/* Drawer content */}
          <div className="relative w-full max-w-sm sm:w-96 bg-[#0c0e14] border-l border-[#1a1d27] h-full flex flex-col shadow-2xl z-10 animate-drawer-right overflow-hidden">
            {/* Drawer Header with 3 Tabs */}
            <div className="h-[52px] border-b border-[#1a1d27] px-3 sm:px-4 flex items-center justify-between shrink-0 bg-[#0c0e14]">
              <div className="flex items-center gap-1.5 py-1">
                <button
                  onClick={() => setRightPanel('options')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                    rightPanel === 'options' ? 'bg-purple-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  Options
                </button>
                <button
                  onClick={() => setRightPanel('memory')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                    rightPanel === 'memory' ? 'bg-purple-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  Memory
                </button>
                <button
                  onClick={() => setRightPanel('customize')}
                  className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all shrink-0 cursor-pointer ${
                    rightPanel === 'customize' ? 'bg-purple-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  Style
                </button>
              </div>

              <button
                onClick={() => setRightPanel('hidden')}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer shrink-0 ml-1"
                title="Close Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* DRAWER BODY: TAB 1 - OPTIONS & AI GATEWAY */}
            {rightPanel === 'options' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
                {/* Mobile/Drawer Multi-Chat Session Switcher */}
                <div className="p-3 bg-[#131622] border border-[#202534] rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                      <span>Chats with {character.name.split(' ')[0]}</span>
                    </span>
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-900/30 px-1.5 py-0.5 rounded">
                      {allConversations.filter(c => c.characterId === character.id).length || 1}
                    </span>
                  </div>

                  {onStartNewChat && (
                    <button
                      onClick={() => {
                        setRightPanel('hidden');
                        onStartNewChat(character);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-1.5 text-xs shadow-sm shadow-purple-600/30 transition-all cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Start Another New Chat</span>
                    </button>
                  )}

                  {/* List of other conversations with this character */}
                  <div className="space-y-1 pt-1 max-h-40 overflow-y-auto">
                    {[...allConversations]
                      .filter(c => c.characterId === character.id)
                      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
                      .map(conv => {
                        const isSelected = conv.id === conversation.id;
                        const convPersona = allPersonas.find(p => p.id === conv.personaId) || currentPersona;
                        const lastMsg = conv.messages[conv.messages.length - 1];
                        const sneakPeek = lastMsg
                          ? lastMsg.content.replace(/[*#_`]/g, '').trim().slice(0, 70) + (lastMsg.content.length > 70 ? '...' : '')
                          : 'No messages yet';

                        return (
                          <div
                            key={conv.id}
                            onClick={() => {
                              setRightPanel('hidden');
                              onSelectConversation && onSelectConversation(conv);
                            }}
                            className={`p-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-purple-900/30 text-white border border-purple-500/40'
                                : 'bg-[#0d1017] hover:bg-[#151926] text-neutral-300'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 text-[11px] font-bold truncate">
                                <span>{convPersona?.name ? `as ${convPersona.name}` : (conv.title || 'Chat')}</span>
                                {isSelected && <span className="text-[9px] text-purple-400 font-mono">(active)</span>}
                              </div>
                              <p className="text-[10px] text-neutral-400 truncate">{sneakPeek}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] font-mono text-neutral-500">{conv.messages.length} msgs</span>
                              {onDeleteConversation && (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    onDeleteConversation(conv.id);
                                  }}
                                  className="p-1 text-neutral-400 hover:text-rose-400 active:text-rose-400 rounded-md hover:bg-rose-500/15 transition-all cursor-pointer"
                                  title="Delete this chat session"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
                {/* Active Persona dropdown */}
                <div>
                  <label className="text-neutral-400 font-semibold block mb-1.5">Active Persona</label>
                  <select
                    value={activePersonaId}
                    onChange={e => {
                      const newId = e.target.value;
                      setActivePersonaId(newId);
                      onUpdateConversation({ ...conversation, personaId: newId });
                    }}
                    className="w-full bg-[#131620] border border-[#202534] rounded-xl p-2.5 text-xs text-white font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {allPersonas.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Active Scenario dropdown */}
                <div>
                  <label className="text-neutral-400 font-semibold block mb-1.5">Active Scenario</label>
                  <select
                    value={activeScenarioId}
                    onChange={e => setActiveScenarioId(e.target.value)}
                    className="w-full bg-[#131620] border border-[#202534] rounded-xl p-2.5 text-xs text-white font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {character.scenarios.map(sc => (
                      <option key={sc.id} value={sc.id}>
                        {sc.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interactive Token & Price Counter Card */}
                <div className="p-3.5 bg-[#121522] border border-[#20273c] rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                      <Coins className="w-4 h-4 text-purple-400" />
                      <span>Token & Price Counter</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsTokenCounterOpen(true)}
                      className="px-2 py-0.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-[10.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Calculator className="w-3 h-3" />
                      <span>Calculate</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-[#0c0e15] border border-[#1b2132]">
                      <div className="text-[10px] text-neutral-400">Context</div>
                      <div className="font-bold text-white font-mono text-xs mt-0.5">
                        {tokenPriceService.formatTokenCount(liveTokenStats.totalContextTokens)}
                      </div>
                      <div className="text-[9px] text-neutral-500 font-mono">
                        {liveTokenStats.contextUsagePercent}% ctx
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#0c0e15] border border-[#1b2132]">
                      <div className="text-[10px] text-neutral-400">1M Input</div>
                      <div className="font-bold text-purple-300 font-mono text-xs mt-0.5 truncate" title={`Price rate per 1M input tokens: ${tokenPriceService.formatRate(tokenPriceConfig.pricePer1MInput, tokenPriceConfig.currency, tokenPriceConfig.pricePer1MInputIdr, tokenPriceConfig.usdToIdrRate)}`}>
                        {tokenPriceService.formatRate(tokenPriceConfig.pricePer1MInput, tokenPriceConfig.currency, tokenPriceConfig.pricePer1MInputIdr, tokenPriceConfig.usdToIdrRate)}
                      </div>
                      <div className="text-[9px] text-neutral-500 font-mono">
                        {tokenPriceService.formatTokenCount(liveTokenStats.inputTokens)} tok
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-[#0c0e15] border border-[#1b2132]">
                      <div className="text-[10px] text-neutral-400">1M Output</div>
                      <div className="font-bold text-cyan-300 font-mono text-xs mt-0.5 truncate" title={`Price rate per 1M output tokens: ${tokenPriceService.formatRate(tokenPriceConfig.pricePer1MOutput, tokenPriceConfig.currency, tokenPriceConfig.pricePer1MOutputIdr, tokenPriceConfig.usdToIdrRate)}`}>
                        {tokenPriceService.formatRate(tokenPriceConfig.pricePer1MOutput, tokenPriceConfig.currency, tokenPriceConfig.pricePer1MOutputIdr, tokenPriceConfig.usdToIdrRate)}
                      </div>
                      <div className="text-[9px] text-neutral-500 font-mono">
                        {tokenPriceService.formatTokenCount(liveTokenStats.outputTokens)} tok
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-[#1a1f30] text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 text-[11px]">Est. Cost / Turn:</span>
                      <span className="text-purple-300 font-bold">{liveTokenStats.formattedTotalCost}</span>
                    </div>
                    {conversation.cumulativeUsage && conversation.cumulativeUsage.turnCount > 0 && (
                      <div className="flex items-center justify-between text-[10.5px]">
                        <span className="text-neutral-400">Total Spent ({conversation.cumulativeUsage.turnCount} turns):</span>
                        <span className="text-amber-300 font-bold">
                          {tokenPriceConfig.currency === 'IDR'
                            ? tokenPriceService.formatRupiah(conversation.cumulativeUsage.totalCostIdr)
                            : tokenPriceService.formatCost(conversation.cumulativeUsage.totalCostUsd, 'USD')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Token Optimizer Slider with Live Tooltips & Percentages */}
                <TokenOptimizerSlider
                  value={conversation.tokenOptimizer || storageService.getTokenOptimizerLevel()}
                  liveResult={tokenOptimizerService.optimizeContext({
                    character,
                    scenario: currentScenario,
                    persona: currentPersona,
                    lorebooks,
                    conversation: { ...conversation, messages },
                    customRules: customPrompt,
                    level: conversation.tokenOptimizer || storageService.getTokenOptimizerLevel()
                  })}
                  onChange={newLevel => {
                    storageService.setTokenOptimizerLevel(newLevel);
                    onUpdateConversation({ ...conversation, tokenOptimizer: newLevel });
                  }}
                />

                {/* AI Gateway / Proxy / Provider Settings */}
                <div className="p-3.5 bg-[#12151e] border border-[#1e2330] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <span>AI Engine & Proxy Gateway</span>
                    </span>
                    <div className="flex items-center gap-2">
                      {gatewaySavedNotice && (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Saved
                        </span>
                      )}
                      <span className="text-[10px] text-purple-400 uppercase font-mono">{providerType}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-neutral-400 block mb-1 text-[11px]">Provider Architecture</label>
                    <select
                      value={providerType}
                      onChange={e => {
                        const val = e.target.value as ProviderType;
                        let newUrl = gatewayBaseUrl;
                        let newModel = gatewayModel;
                        if (val === 'openrouter') {
                          newUrl = 'https://openrouter.ai/api/v1';
                          newModel = 'anthropic/claude-3.5-sonnet';
                        } else if (val === 'openai') {
                          newUrl = 'https://api.openai.com/v1';
                          newModel = 'gpt-4o-mini';
                        } else if (val === 'gemini') {
                          newModel = 'gemini-2.5-flash';
                        }
                        saveGatewayToLocalStorage({ type: val, baseUrl: newUrl, model: newModel });
                        setConnectionTestResult(null);
                      }}
                      className="w-full bg-[#181c28] border border-[#262c3e] rounded-xl p-2 text-xs text-white cursor-pointer"
                    >
                      <option value="simulation">Built-in Roleplay Simulation Engine</option>
                      <option value="custom">Custom AI Gateway / Reverse Proxy (OpenAI format)</option>
                      <option value="openrouter">OpenRouter (Claude, Llama, Mistral)</option>
                      <option value="openai">OpenAI Direct (GPT-4o, GPT-4o-mini)</option>
                      <option value="gemini">Google Gemini API</option>
                    </select>
                  </div>

                  {/* Gateway Base URL (for custom or openrouter) */}
                  {(providerType === 'custom' || providerType === 'openrouter') && (
                    <div>
                      <label className="text-neutral-400 block mb-1 text-[11px]">Gateway / Proxy Base URL</label>
                      <input
                        type="text"
                        placeholder="https://my-proxy.com/v1"
                        value={gatewayBaseUrl}
                        onChange={e => {
                          saveGatewayToLocalStorage({ baseUrl: e.target.value });
                          setConnectionTestResult(null);
                        }}
                        className="w-full bg-[#181c28] border border-[#262c3e] rounded-xl p-2 text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  )}

                  {/* Model ID */}
                  <div>
                    <label className="text-neutral-400 block mb-1 text-[11px]">Custom Model Name</label>
                    <input
                      type="text"
                      placeholder="e.g. meta-llama/llama-3.3-70b-instruct"
                      value={gatewayModel}
                      onChange={e => {
                        saveGatewayToLocalStorage({ model: e.target.value });
                        setConnectionTestResult(null);
                      }}
                      className="w-full bg-[#181c28] border border-[#262c3e] rounded-xl p-2 text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* API Key */}
                  {providerType !== 'simulation' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-neutral-400 text-[11px]">API Key</label>
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="text-[10px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1"
                        >
                          {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showApiKey ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        placeholder="sk-..."
                        value={gatewayApiKey}
                        onChange={e => {
                          saveGatewayToLocalStorage({ apiKey: e.target.value });
                          setConnectionTestResult(null);
                        }}
                        className="w-full bg-[#181c28] border border-[#262c3e] rounded-xl p-2 text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  )}

                  {/* Local Storage Auto-save Note */}
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Check className="w-3 h-3" />
                      <span>Settings automatically saved to browser</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => saveGatewayToLocalStorage({})}
                      className="text-purple-400 hover:text-purple-300 font-semibold underline text-[10px]"
                    >
                      Save Now
                    </button>
                  </div>

                  {/* Test Connection Button */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleTestAIConnection}
                      disabled={isTestingConnection}
                      className="w-full py-2 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 fill-white" />
                      <span>{isTestingConnection ? 'Testing Connection...' : 'Test Connection'}</span>
                    </button>

                    {/* Connection Test Feedback */}
                    {connectionTestResult && (
                      <div
                        className={`mt-2 p-2.5 rounded-xl text-[11px] leading-relaxed border ${
                          connectionTestResult.success
                            ? 'bg-emerald-950/60 border-emerald-800/50 text-emerald-300'
                            : 'bg-rose-950/60 border-rose-800/50 text-rose-300'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1">
                          {connectionTestResult.success ? '✓ Operational' : '✕ Connection Issue'}
                          {connectionTestResult.latencyMs !== undefined && (
                            <span className="font-mono text-[10px] opacity-80">
                              ({connectionTestResult.latencyMs}ms)
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5">{connectionTestResult.message}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Bot Prompt / Rules (Information for bot or rules for botchat) */}
                <div className="space-y-2.5 pt-2 border-t border-[#1a1d27]">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>Custom Prompt & Bot Rules</span>
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">Injected into System</span>
                  </div>

                  {/* Preset Selector & Global Save */}
                  <div className="space-y-1.5 bg-[#141724] p-2.5 rounded-xl border border-[#222738]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-neutral-400 font-semibold">Rules Preset</span>
                      <button
                        type="button"
                        onClick={() => setIsSavingPreset(!isSavingPreset)}
                        className="text-purple-400 hover:text-purple-300 font-semibold text-[10px] cursor-pointer"
                      >
                        {isSavingPreset ? 'Cancel' : '+ Save as Preset'}
                      </button>
                    </div>

                    {isSavingPreset && (
                      <div className="flex items-center gap-1.5 pt-1 pb-1">
                        <input
                          type="text"
                          value={newPresetName}
                          onChange={e => setNewPresetName(e.target.value)}
                          placeholder="Preset name (e.g. My Style)..."
                          className="flex-1 bg-[#0c0e14] border border-[#262c3e] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCurrentAsPreset}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                        >
                          Save
                        </button>
                      </div>
                    )}

                    <select
                      value={selectedPresetId}
                      onChange={e => handleSelectPreset(e.target.value)}
                      className="w-full bg-[#0c0e14] border border-[#222736] rounded-lg p-2 text-xs text-neutral-200 font-medium focus:outline-none focus:border-purple-500 cursor-pointer"
                    >
                      <option value="">Select a rule preset...</option>
                      {rulePresets.map(preset => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-[11px] text-neutral-400 leading-tight">
                    Add instructions, constraints, or formatting rules for the bot (applies to subsequent turns).
                  </p>
                  <textarea
                    rows={4}
                    value={customPrompt}
                    onChange={e => {
                      setCustomPrompt(e.target.value);
                      setSelectedPresetId('');
                      const updated = {
                        ...conversation,
                        customPrompt: e.target.value
                      };
                      onUpdateConversation(updated);
                    }}
                    placeholder="e.g. Add scene header with [Date & Time: ... | Location: ...]. Use *italic* for actions, &quot;quotes&quot; for dialogue, [Name] tags."
                    className="w-full bg-[#181c28] border border-[#262c3e] rounded-xl p-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500 resize-y font-sans leading-relaxed"
                  />
                  {customPrompt && (
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-0.5">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Rule active for subsequent turns
                      </span>
                      <button
                        onClick={() => {
                          setCustomPrompt('');
                          setSelectedPresetId('');
                          onUpdateConversation({ ...conversation, customPrompt: '' });
                        }}
                        className="text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        Clear rule
                      </button>
                    </div>
                  )}
                </div>

                {/* Generation Settings */}
                <div className="space-y-3 pt-2 border-t border-[#1a1d27]">
                  <span className="text-neutral-400 font-semibold block">Generation Tuning</span>

                  <div className="space-y-1">
                    <div className="flex justify-between text-neutral-300">
                      <span>Temperature</span>
                      <span className="font-mono text-purple-400">{temperature}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1.5"
                      step="0.05"
                      value={temperature}
                      onChange={e => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-neutral-300">
                      <span>Max Tokens</span>
                      <span className="font-mono text-purple-400">{maxTokens}</span>
                    </div>
                    <input
                      type="range"
                      min="256"
                      max="4096"
                      step="64"
                      value={maxTokens}
                      onChange={e => setMaxTokens(parseInt(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Chat Tools */}
                <div className="space-y-2 pt-2 border-t border-[#1a1d27]">
                  <span className="text-neutral-400 font-semibold block mb-1">Chat Controls</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleRegenerate()}
                      disabled={isGenerating}
                      className="py-2 bg-[#131620] hover:bg-[#181c2a] border border-[#202534] rounded-xl text-xs font-semibold text-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Regenerate</span>
                    </button>

                    <button
                      onClick={handleContinue}
                      disabled={isGenerating}
                      className="py-2 bg-[#131620] hover:bg-[#181c2a] border border-[#202534] rounded-xl text-xs font-semibold text-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>↳ Continue</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DRAWER BODY: TAB 2 - MEMORY PANEL */}
            {rightPanel === 'memory' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                <div className="flex items-center gap-4 border-b border-[#1b1e28] pb-1 text-xs font-bold">
                  <button
                    onClick={() => setMemorySubTab('summary')}
                    className={`pb-1.5 relative cursor-pointer ${
                      memorySubTab === 'summary' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Summary
                    {memorySubTab === 'summary' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setMemorySubTab('memories')}
                    className={`pb-1.5 relative cursor-pointer ${
                      memorySubTab === 'memories' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Memories
                    {memorySubTab === 'memories' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setMemorySubTab('settings')}
                    className={`pb-1.5 relative cursor-pointer ${
                      memorySubTab === 'settings' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Settings
                    {memorySubTab === 'settings' && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
                    )}
                  </button>
                </div>

                {memorySubTab === 'summary' && (
                  <div className="space-y-4">
                    {/* Checkpoint Status Banner */}
                    <div className="bg-[#121622] border border-[#202636] rounded-xl p-3 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-neutral-400 block text-[10px]">Active Memory Checkpoint</span>
                        <span className="font-bold text-purple-300 font-mono">
                          {memoryCheckpoint > 0 ? `Turn #${memoryCheckpoint} of ${messages.length}` : `No checkpoint set yet (${messages.length} turns unindexed)`}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-300 border border-purple-700/30">
                        {messages.length - memoryCheckpoint} new turns
                      </span>
                    </div>

                    <div className="bg-[#12151e] border border-[#1e2330] rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white flex items-center gap-1.5">
                          <span>Structured</span>
                          <code className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/30 font-mono">
                            &lt;memory&gt;
                          </code>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const tpl = aiProviderService.getMemoryTemplate(
                              character.name,
                              currentPersona?.name || currentUser.displayName
                            );
                            setConvSummary(tpl);
                            onUpdateConversation({ ...conversation, summary: tpl });
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-[#181c28] hover:bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold transition-colors cursor-pointer"
                          title="Insert structured <memory> template"
                        >
                          + &lt;memory&gt; Template
                        </button>
                      </div>

                      <textarea
                        rows={8}
                        value={convSummary}
                        onChange={e => {
                          const val = e.target.value;
                          setConvSummary(val);
                          onUpdateConversation({
                            ...conversation,
                            summary: val
                          });
                        }}
                        placeholder={`<memory>\nPersona: ${currentPersona?.name || currentUser.displayName}\nCharacter: ${character.name}\nCurrent Activity: ...\nPromises: ...\n</memory>`}
                        className="w-full bg-[#0c0e14] border border-[#23293a] focus:border-purple-500/60 rounded-xl p-2.5 text-[11px] font-mono text-neutral-200 leading-relaxed focus:outline-none resize-y"
                      />
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                        <span>Auto-saved to prompt context</span>
                        <span>{lastSummaryDate}</span>
                      </div>

                      {/* Memory Action Options (Continue Generate vs Replace with New) */}
                      <div className="pt-2 border-t border-[#1b202e] flex flex-col gap-2">
                        {memoryCheckpoint > 0 ? (
                          <>
                            <button
                              onClick={handleContinueGenerateMemory}
                              disabled={messages.length <= memoryCheckpoint || isSummarizing}
                              className="w-full py-2 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                              title="Synthesize conversation from last checkpoint to latest turn and update checkpoint"
                            >
                              <Sparkles className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
                              <span>
                                {isSummarizing
                                  ? 'Synthesizing Detailed Memory...'
                                  : `Continue Generate Memory (from #${memoryCheckpoint} to #${messages.length})`}
                              </span>
                            </button>

                            <button
                              onClick={handleReplaceWithNewMemory}
                              disabled={isSummarizing}
                              className="w-full py-1.5 bg-[#181c28] hover:bg-[#202638] text-neutral-300 hover:text-white border border-[#262c3e] rounded-xl text-[11px] font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                              title="Discard previous checkpoint and generate full fresh summary from first to last turn"
                            >
                              <RotateCcw className="w-3 h-3 text-purple-400" />
                              <span>Replace with New Memory (Full Refresh)</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={handleReplaceWithNewMemory}
                            disabled={isSummarizing}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-purple-600/30"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
                            <span>{isSummarizing ? 'Synthesizing Detailed Memory...' : 'Generate Memory & Set Checkpoint'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-[#12151e] border border-[#1e2330] rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">Key Memories</span>
                      </div>

                      <ul className="space-y-2 text-xs text-neutral-300">
                        {keyMemories.map((mem, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-purple-400 text-sm leading-none">•</span>
                            <span>{mem}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {memorySubTab === 'memories' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <span className="font-bold text-white">Active Lore & Memories</span>
                      <button
                        onClick={() => {
                          const item = prompt('Enter a new memory to add:');
                          if (item && item.trim()) {
                            setKeyMemories([...keyMemories, item.trim()]);
                          }
                        }}
                        className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    {keyMemories.map((mem, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-[#12151e] border border-[#1e2330] rounded-lg text-xs text-neutral-300 flex items-start justify-between gap-2"
                      >
                        <span>{mem}</span>
                        <Trash2
                          onClick={() => setKeyMemories(keyMemories.filter((_, idx) => idx !== i))}
                          className="w-3.5 h-3.5 text-neutral-500 hover:text-rose-400 shrink-0 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {memorySubTab === 'settings' && (
                  <div className="space-y-3">
                    <span className="font-bold text-white block">Memory Retention Policies</span>
                    <p className="text-neutral-400 text-xs leading-relaxed">
                      Salient conversational memories are indexed during roleplay turns to preserve character consistency.
                    </p>
                    <div className="p-3 bg-[#12151e] border border-[#1e2330] rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-300">Auto-Summarize long chats</span>
                        <input type="checkbox" defaultChecked className="accent-purple-500 cursor-pointer" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-300">Preserve canon world codex</span>
                        <input type="checkbox" defaultChecked className="accent-purple-500 cursor-pointer" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DRAWER BODY: TAB 3 - CHAT CUSTOMIZATION */}
            {rightPanel === 'customize' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
                {/* 1. Text Colors */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-purple-400" />
                      <span>Text Coloring</span>
                    </span>
                    <button
                      onClick={() => setCustomization(DEFAULT_CUSTOMIZATION)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 cursor-pointer"
                    >
                      Reset defaults
                    </button>
                  </div>

                  {/* Character Dialogue Color */}
                  <div className="space-y-1.5 bg-[#12151e] border border-[#1e2330] rounded-xl p-3">
                    <label className="text-neutral-300 font-semibold block text-[11px]">
                      Character Dialogue Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customization.dialogueColor}
                        onChange={e => updateCustomization({ dialogueColor: e.target.value })}
                        className="w-7 h-7 rounded-lg border border-neutral-700 bg-transparent cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={customization.dialogueColor}
                        onChange={e => updateCustomization({ dialogueColor: e.target.value })}
                        className="w-24 bg-[#181c28] border border-[#262c3e] rounded-lg px-2 py-1 text-xs font-mono text-white"
                      />
                    </div>
                    {/* Swatches */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {['#ffffff', '#fcd34d', '#6ee7b7', '#67e8f9', '#fda4af', '#e9d5ff'].map(c => (
                        <button
                          key={c}
                          onClick={() => updateCustomization({ dialogueColor: c })}
                          style={{ backgroundColor: c }}
                          className="w-4 h-4 rounded-full border border-black/40 cursor-pointer"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Action / Narration Asterisks Color */}
                  <div className="space-y-1.5 bg-[#12151e] border border-[#1e2330] rounded-xl p-3">
                    <label className="text-neutral-300 font-semibold block text-[11px]">
                      Action & Narration (*italics*) Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customization.actionColor}
                        onChange={e => updateCustomization({ actionColor: e.target.value })}
                        className="w-7 h-7 rounded-lg border border-neutral-700 bg-transparent cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={customization.actionColor}
                        onChange={e => updateCustomization({ actionColor: e.target.value })}
                        className="w-24 bg-[#181c28] border border-[#262c3e] rounded-lg px-2 py-1 text-xs font-mono text-white"
                      />
                    </div>
                    {/* Swatches */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {['#c084fc', '#a5b4fc', '#f472b6', '#38bdf8', '#fbbf24', '#94a3b8'].map(c => (
                        <button
                          key={c}
                          onClick={() => updateCustomization({ actionColor: c })}
                          style={{ backgroundColor: c }}
                          className="w-4 h-4 rounded-full border border-black/40 cursor-pointer"
                        />
                      ))}
                    </div>
                  </div>

                  {/* User Message Text Color */}
                  <div className="space-y-1.5 bg-[#12151e] border border-[#1e2330] rounded-xl p-3">
                    <label className="text-neutral-300 font-semibold block text-[11px]">User Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customization.userTextColor}
                        onChange={e => updateCustomization({ userTextColor: e.target.value })}
                        className="w-7 h-7 rounded-lg border border-neutral-700 bg-transparent cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={customization.userTextColor}
                        onChange={e => updateCustomization({ userTextColor: e.target.value })}
                        className="w-24 bg-[#181c28] border border-[#262c3e] rounded-lg px-2 py-1 text-xs font-mono text-white"
                      />
                    </div>
                    {/* Swatches */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {['#e2e8f0', '#93c5fd', '#86efac', '#fde047', '#f472b6'].map(c => (
                        <button
                          key={c}
                          onClick={() => updateCustomization({ userTextColor: c })}
                          style={{ backgroundColor: c }}
                          className="w-4 h-4 rounded-full border border-black/40 cursor-pointer"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Font Typography & Size */}
                <div className="space-y-3 pt-2 border-t border-[#1a1d27]">
                  <div>
                    <span className="text-neutral-400 font-semibold block text-[11px] mb-1.5">Transcript Typography</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {[
                        { id: 'sans', label: 'Default Sans', sample: 'Aa' },
                        { id: 'serif', label: 'Literary Serif', sample: 'Aa' },
                        { id: 'mono', label: 'Monospace', sample: '01' },
                        { id: 'casual', label: 'Casual Comic', sample: 'Aa' },
                        { id: 'rounded', label: 'Soft Rounded', sample: 'Aa' }
                      ].map(font => (
                        <button
                          key={font.id}
                          onClick={() => updateCustomization({ fontFamily: font.id as any })}
                          className={`p-2 rounded-xl border text-left cursor-pointer transition-colors ${
                            (customization.fontFamily || 'sans') === font.id
                              ? 'bg-purple-600/30 border-purple-500 text-white'
                              : 'bg-[#12151e] border-[#1e2330] text-neutral-400 hover:text-white'
                          }`}
                        >
                          <div className="text-[10px] text-purple-400 font-mono">{font.sample}</div>
                          <div className="text-xs font-semibold truncate">{font.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-neutral-400 font-semibold block text-[11px] mb-1.5">Transcript Font Size</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'sm', label: 'Compact' },
                        { id: 'md', label: 'Regular' },
                        { id: 'lg', label: 'Large' }
                      ].map(item => (
                        <button
                          key={item.id}
                          onClick={() => updateCustomization({ fontSize: item.id as 'sm' | 'md' | 'lg' })}
                          className={`py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                            customization.fontSize === item.id
                              ? 'bg-purple-600/30 border-purple-500 text-white'
                              : 'bg-[#12151e] border-[#1e2330] text-neutral-400 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Background Chat Customization */}
                <div className="space-y-3 pt-2 border-t border-[#1a1d27]">
                  <span className="text-neutral-400 font-semibold block text-[11px]">Chat Background</span>

                  {/* Preset Themes */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { name: 'Pure Obsidian', color: '#090a0f' },
                      { name: 'Midnight Navy', color: '#0b1120' },
                      { name: 'Velvet Violet', color: '#130f1c' },
                      { name: 'Emerald Dusk', color: '#071914' },
                      { name: 'Crimson Void', color: '#180a10' },
                      { name: 'Deep Slate', color: '#0f172a' }
                    ].map(bg => (
                      <button
                        key={bg.name}
                        onClick={() => updateCustomization({ backgroundColor: bg.color, backgroundImageUrl: '' })}
                        style={{ backgroundColor: bg.color }}
                        className={`p-2 rounded-xl border text-[10px] font-bold truncate text-left cursor-pointer transition-all ${
                          customization.backgroundColor === bg.color && !customization.backgroundImageUrl
                            ? 'border-purple-500 ring-1 ring-purple-500'
                            : 'border-neutral-800 text-neutral-300'
                        }`}
                      >
                        {bg.name}
                      </button>
                    ))}
                  </div>

                  {/* Custom Background Image URL */}
                  <div className="space-y-1.5 bg-[#12151e] border border-[#1e2330] rounded-xl p-3">
                    <label className="text-neutral-300 font-semibold block text-[11px] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                      <span>Custom Wallpaper Image URL</span>
                    </label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={customization.backgroundImageUrl || ''}
                      onChange={e => updateCustomization({ backgroundImageUrl: e.target.value })}
                      className="w-full bg-[#181c28] border border-[#262c3e] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                    />

                    {/* Quick presets */}
                    <div className="flex gap-2 pt-1 text-[10px]">
                      <button
                        onClick={() =>
                          updateCustomization({
                            backgroundImageUrl:
                              'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
                            backgroundDim: 0.8
                          })
                        }
                        className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                      >
                        Library Preset
                      </button>
                      <button
                        onClick={() =>
                          updateCustomization({
                            backgroundImageUrl:
                              'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&auto=format&fit=crop&q=80',
                            backgroundDim: 0.85
                          })
                        }
                        className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 cursor-pointer"
                      >
                        Sunset Preset
                      </button>
                      {customization.backgroundImageUrl && (
                        <button
                          onClick={() => updateCustomization({ backgroundImageUrl: '' })}
                          className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 hover:bg-rose-900 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Dim Overlay Slider (BUG #7) */}
                    {(customization.backgroundImageUrl || activeBg.imageUrl || true) && (
                      <div className="pt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-neutral-300">
                          <span>Background Darken Filter</span>
                          <span className="font-mono text-purple-400">
                            {Math.round(customization.backgroundDim * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="0.95"
                          step="0.05"
                          value={customization.backgroundDim}
                          onChange={e => updateCustomization({ backgroundDim: parseFloat(e.target.value) })}
                          className="w-full accent-purple-500 cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Fullscreen Centered Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-2xl max-h-[90vh] flex flex-col items-center animate-modal-pop"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 sm:-right-10 p-2 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-white transition-colors cursor-pointer"
              title="Close image"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
            />

            {lightboxImage.title && (
              <p className="mt-3 text-xs sm:text-sm font-semibold text-neutral-300 bg-black/60 px-3 py-1 rounded-full border border-white/10 text-center truncate max-w-md">
                {lightboxImage.title}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 5. Janitor AI style Character / Persona Info Modal */}
      {characterInfoModal.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setCharacterInfoModal({ isOpen: false })}
        >
          <div
            className="relative w-full max-w-lg max-h-[85vh] bg-[#0f121b] border border-[#23293d] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-modal-pop"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Close Button */}
            <button
              onClick={() => setCharacterInfoModal({ isOpen: false })}
              className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm border border-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* If Persona Info */}
            {characterInfoModal.isPersona ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="flex items-center gap-4 border-b border-[#1b202e] pb-4">
                  <img
                    src={currentPersona?.avatarUrl || currentUser.avatarUrl}
                    alt={currentPersona?.name || 'Persona'}
                    className="w-16 h-16 rounded-2xl object-cover border border-purple-500/40 shadow-lg cursor-pointer"
                    onClick={() => setLightboxImage({ url: currentPersona?.avatarUrl || currentUser.avatarUrl, title: currentPersona?.name || 'Persona' })}
                  />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">User Roleplay Persona</span>
                    <h3 className="text-base font-extrabold text-white">{currentPersona?.name || currentUser.displayName}</h3>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">{currentPersona?.genderPronouns || 'Any pronouns'}</p>
                  </div>
                </div>

                {currentPersona?.appearance && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Appearance</span>
                    <p className="text-xs text-neutral-300 leading-relaxed bg-[#0a0c14] p-3 rounded-xl border border-[#1b202e] whitespace-pre-wrap break-words">
                      {currentPersona.appearance}
                    </p>
                  </div>
                )}

                {currentPersona?.roleInstructions && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Role & Directives</span>
                    <p className="text-xs text-neutral-300 leading-relaxed bg-[#0a0c14] p-3 rounded-xl border border-[#1b202e] whitespace-pre-wrap break-words">
                      {currentPersona.roleInstructions}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Character Profile Card (Janitor AI Style) */
              <div className="flex-1 overflow-y-auto">
                {/* Banner Header with Character Art */}
                <div className="relative h-44 sm:h-52 w-full bg-[#0a0c14] overflow-hidden">
                  <img
                    src={character.avatarUrl || character.coverUrl || ''}
                    alt={character.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top cursor-pointer hover:scale-105 transition-transform duration-300"
                    onClick={() => setLightboxImage({ url: character.avatarUrl || character.coverUrl || '', title: character.name })}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f121b] via-[#0f121b]/50 to-transparent" />

                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-600/30 text-purple-300 border border-purple-500/30">
                          {character.contentRating || 'SFW'}
                        </span>
                        {character.visibility === 'public' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">
                            Community
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-tight">
                        {chatCharName}
                      </h2>
                      <p className="text-xs text-neutral-300 mt-0.5 font-medium line-clamp-1">
                        {character.name !== chatCharName ? character.name : character.subtitle || character.shortDescription}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Character Details Body */}
                <div className="p-4 sm:p-5 space-y-4 text-xs">
                  {/* Creator info */}
                  <div className="flex items-center justify-between py-2 border-b border-[#1b202e] text-[11px]">
                    <span className="text-neutral-400">Created by:</span>
                    <span className="text-purple-300 font-bold">@{character.creatorUsername || 'Warden'}</span>
                  </div>

                  {/* Character Bio / Backstory */}
                  {(character.shortDescription || character.background) && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Description & Backstory</span>
                      <div className="text-xs text-neutral-300 leading-relaxed bg-[#0a0c14] p-3 rounded-xl border border-[#1b202e] overflow-hidden break-words">
                        <RichTextRenderer
                          content={character.background || character.shortDescription}
                          allowImages={true}
                        />
                      </div>
                    </div>
                  )}

                  {/* Personality */}
                  {character.personality && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Personality</span>
                      <div className="text-xs text-neutral-300 leading-relaxed bg-[#0a0c14] p-3 rounded-xl border border-[#1b202e] overflow-hidden break-words">
                        <RichTextRenderer
                          content={character.personality}
                          allowImages={true}
                        />
                      </div>
                    </div>
                  )}

                  {/* Active Scenario Info */}
                  {scenario && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Current Scenario</span>
                      <div className="bg-purple-950/20 border border-purple-500/25 p-3 rounded-xl space-y-1">
                        <p className="font-bold text-purple-200">{scenario.title}</p>
                        {scenario.description && <p className="text-neutral-400">{scenario.description}</p>}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  {character.tagSlugs && character.tagSlugs.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Tags</span>
                      <div className="flex flex-wrap gap-1.5">
                        {character.tagSlugs.map(slug => (
                          <span
                            key={slug}
                            className="px-2 py-0.5 rounded-lg bg-[#181d2a] text-neutral-300 border border-[#222738] text-[10px] capitalize"
                          >
                            {slug.replace(/-/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Start New Chat from this Card */}
                  {onStartNewChat && (
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setCharacterInfoModal({ isOpen: false });
                          onStartNewChat(character);
                        }}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Start New Chat with {character.name.split(' ')[0]}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Token Counter & Pricing Modal */}
      <TokenCounterModal
        isOpen={isTokenCounterOpen}
        onClose={() => setIsTokenCounterOpen(false)}
        stats={liveTokenStats}
        currentConfig={tokenPriceConfig}
        onConfigChange={cfg => setTokenPriceConfig(cfg)}
        optimizerLevel={currentOptimizerLevel}
        cumulativeUsage={conversation.cumulativeUsage}
      />
    </div>
  );
};
