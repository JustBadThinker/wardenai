/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'user' | 'moderator' | 'admin';

export interface User {
  id: string;
  firebaseUid?: string;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  isEmailVerified: boolean;
  isAgeVerified: boolean;
  isSuspended: boolean;
  avatarUrl: string;
  bannerUrl?: string;
  bio: string;
  joinedDate: string;
  followerCount: number;
  followingCount: number;
  publishedCharacterCount: number;
  isNsfwAllowed: boolean;
  blurNsfw: boolean;
  isRestricted?: boolean;
  restrictionReason?: string;
}

export type TagCategory =
  | 'gender'
  | 'romance'
  | 'personality'
  | 'relationship'
  | 'power'
  | 'genre'
  | 'species'
  | 'scenario'
  | 'style'
  | 'rating'
  | 'theme';

export interface Tag {
  id: string;
  name: string;
  slug: string;
  category: TagCategory;
  description?: string;
  count: number;
}

export type ContentRating = 'SFW' | 'Mature' | 'NSFW';

export type PublicationStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'changes_requested'
  | 'rejected'
  | 'unpublished'
  | 'removed'
  | 'private';

export interface CharacterScenario {
  id: string;
  characterId: string;
  title: string;
  description: string;
  openingMessage: string;
  scenarioInstructions: string;
  imageUrl?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterRevision {
  id: string;
  characterId: string;
  version: number;
  changesSummary: string;
  systemPrompt: string;
  contentRating: ContentRating;
  submittedAt: string;
  status: PublicationStatus;
  moderatorNotes?: string;
}

export interface Character {
  id: string;
  creatorId: string;
  creatorUsername: string;
  creatorAvatar: string;
  name: string;
  subtitle?: string;
  avatarUrl: string;
  coverUrl?: string;
  shortDescription: string;
  personality: string;
  background: string;
  systemPrompt: string;
  exampleDialogue: string;
  firstMessage?: string;
  creatorNotes?: string;
  contentRating: ContentRating;
  visibility: 'public' | 'unlisted' | 'private';
  publicationStatus: PublicationStatus;
  moderationNotes?: string;
  scenarios: CharacterScenario[];
  tagSlugs: string[];
  likeCount: number;
  bookmarkCount: number;
  chatCount: number;
  lorebookIds?: string[];
  createdAt: string;
  updatedAt: string;
  age?: number;
}

export interface Persona {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string;
  shortDescription: string;
  appearance: string;
  personality: string;
  background: string;
  genderPronouns?: string;
  roleInstructions?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface LorebookEntry {
  id: string;
  title: string;
  keys: string[]; // trigger phrases
  secondaryKeys?: string[]; // selective secondary triggers (Janitor / SillyTavern)
  content: string;
  priority: number;
  enabled: boolean;
  selective?: boolean; // requires both primary and secondary triggers
  constant?: boolean; // always injected regardless of triggers
  position?: 'before_char' | 'after_char';
}

export interface Lorebook {
  id: string;
  userId: string;
  title: string;
  description: string;
  scanDepth?: number;
  tokenBudget?: number;
  recursiveScanning?: boolean;
  entries: LorebookEntry[];
  isPublic: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId?: string;
  sender: 'user' | 'character' | 'system';
  senderRole?: 'user' | 'assistant' | 'system';
  senderId?: string;
  personaId?: string;
  personaName?: string;
  content: string;
  timestamp: string;
  tokenCount?: number;
}

export interface Conversation {
  id: string;
  userId: string;
  characterId: string;
  scenarioId?: string;
  scenarioTitle?: string;
  personaId: string;
  providerId: string;
  title: string;
  modelName?: string;
  messages: ChatMessage[];
  messageCount?: number;
  isArchived?: boolean;
  isPinned?: boolean;
  summary?: string;
  keyMemories?: string[];
  lastSummaryAt?: string;
  memoryCheckpoint?: number; // message index up to which memory was summarized
  customPrompt?: string; // Custom prompt rule / guidance for this bot conversation
  tokenOptimizer?: TokenOptimizerLevel; // Off, Easy (~20%), Medium (~45%), Aggressive (~70%)
  cumulativeUsage?: CumulativeTokenUsage; // Cumulative session token count & estimated spend
  createdAt: string;
  updatedAt: string;
}

export interface CumulativeTokenUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalCostIdr: number;
  turnCount: number;
}

export type TokenOptimizerLevel = 'off' | 'easy' | 'medium' | 'aggressive';
export type TokenCurrency = 'USD' | 'IDR';

export interface TokenPriceConfig {
  presetId: string;
  name: string;
  pricePer1MInput: number; // USD ($) per 1M (1,000,000) input tokens
  pricePer1MOutput: number; // USD ($) per 1M (1,000,000) output tokens
  pricePer1MInputIdr?: number; // Direct IDR (Rp) per 1M input tokens for Indonesian routers
  pricePer1MOutputIdr?: number; // Direct IDR (Rp) per 1M output tokens for Indonesian routers
  contextLimit: number; // Maximum context tokens (e.g. 32768, 128000, 1000000)
  currency?: TokenCurrency; // 'USD' ($) or 'IDR' (Rp)
  usdToIdrRate?: number; // Exchange rate (e.g. 16200)
}

export interface ContextBreakdownItem {
  label: string;
  tokens: number;
  percentage: number;
  color: string;
}

export interface ConversationTokenStats {
  inputTokens: number;
  outputTokens: number;
  totalContextTokens: number;
  contextLimit: number;
  contextUsagePercent: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: TokenCurrency;
  formattedInputCost: string;
  formattedOutputCost: string;
  formattedTotalCost: string;
  formattedSavedCost: string;
  uncompressedTokens: number;
  savedTokens: number;
  savedCost: number;
  breakdown: ContextBreakdownItem[];
}

export type ProviderType = 'gemini' | 'openai' | 'openrouter' | 'anthropic' | 'custom' | 'simulation';

export interface ProviderConfig {
  id: string;
  userId: string;
  providerType: ProviderType;
  name: string;
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  contextWindow: number;
  streaming: boolean;
  isDefault: boolean;
  customHeaders?: Record<string, string>;
  customPrompt?: string; // Additional custom rule or information for bot
  tokenOptimizer?: TokenOptimizerLevel;
}

export interface GlobalChatBackground {
  imageUrl: string;
  fit: 'cover' | 'contain' | 'fill';
  blur: number; // in pixels (0 - 20)
  darkOverlay: number; // in percentage (0 - 100)
}

export interface ChatCustomization {
  dialogueColor: string; // e.g. '#ffffff'
  actionColor: string; // e.g. '#c084fc' for *italics*
  userTextColor: string; // e.g. '#e2e8f0'
  backgroundColor: string; // e.g. '#0c0e14'
  backgroundImageUrl?: string;
  backgroundDim: number; // 0 to 1
  fontSize: 'sm' | 'md' | 'lg';
  fontFamily?: 'sans' | 'serif' | 'mono' | 'casual' | 'rounded';
}

export interface FollowRelationship {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface ReportEvidenceItem {
  messageId: string;
  sender: string;
  content: string;
  timestamp: string;
}

export interface ContentReport {
  id: string;
  reporterId: string;
  reporterUsername: string;
  targetType: 'character' | 'scenario' | 'user' | 'conversation';
  targetId: string;
  targetTitle: string;
  category: 'hate' | 'harassment' | 'nsfw_mismatch' | 'illegal' | 'spam';
  description: string;
  evidenceMessages?: ReportEvidenceItem[];
  status: 'pending' | 'resolved' | 'dismissed';
  assignedModeratorId?: string;
  moderatorNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface RestrictedInvestigation {
  id: string;
  caseReference: string;
  reason: string;
  suspectedViolation: string;
  requestingInvestigatorId: string;
  requestingInvestigatorName: string;
  approvingAuthorityId?: string;
  approvingAuthorityName?: string;
  targetUserId: string;
  targetUsername: string;
  targetConversationId: string;
  allowedMessageRange?: { startMessageId?: string; endMessageId?: string };
  status: 'pending_approval' | 'approved' | 'rejected' | 'expired' | 'closed';
  expiresAt?: string;
  createdAt: string;
  approvedAt?: string;
  closedAt?: string;
  closureReason?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  timestamp: string;
}
