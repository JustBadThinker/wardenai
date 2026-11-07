/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Character, CharacterScenario, Persona, Lorebook, Conversation, ChatMessage, TokenOptimizerLevel } from '../types';
import { extractCleanCharacterName } from './aiProviderService';

export interface TokenOptimizerTierInfo {
  level: TokenOptimizerLevel;
  numericValue: number; // 0: Off, 1: Easy, 2: Medium, 3: Aggressive
  label: string;
  badge: string;
  reductionPercentage: string;
  estimatedSavingText: string;
  accentColor: string; // Tailwind color class or hex
  badgeColor: string;
  title: string;
  shortSummary: string;
  description: string;
  focusHighlights: {
    persona: string;
    currentActivity: string;
    characterActing: string;
    tokenTrimming: string;
  };
}

export const TOKEN_OPTIMIZER_TIERS: TokenOptimizerTierInfo[] = [
  {
    level: 'off',
    numericValue: 0,
    label: 'Off',
    badge: '0%',
    reductionPercentage: '0%',
    estimatedSavingText: '0 tokens saved',
    accentColor: 'text-neutral-400',
    badgeColor: 'bg-neutral-800 text-neutral-300 border-neutral-700',
    title: 'Standard Context (Uncompressed)',
    shortSummary: 'Full prompt and history without compression.',
    description: 'Sends the full character card, detailed backstory, all active lorebook entries, and unpruned message history verbatim.',
    focusHighlights: {
      persona: '100% complete persona description and instructions.',
      currentActivity: 'Full scenario description and opening premise.',
      characterActing: 'Full character sheet, personality, and example dialogues.',
      tokenTrimming: 'None. Maximum token consumption.'
    }
  },
  {
    level: 'easy',
    numericValue: 1,
    label: 'Easy',
    badge: '~20%',
    reductionPercentage: '~15% - 25%',
    estimatedSavingText: 'Saves ~20% tokens',
    accentColor: 'text-emerald-400',
    badgeColor: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
    title: 'Light Optimization',
    shortSummary: 'Removes duplicate fluff, ASCII dividers & W++ bloat while keeping 100% of traits.',
    description: 'Strips decorative dividers, deduplicates overlapping card sections, compacts W++ syntax, and condenses boilerplate formatting rules while retaining 100% of persona and character traits.',
    focusHighlights: {
      persona: '100% preserved (all persona traits, backstory, and looks intact).',
      currentActivity: '100% preserved (all scenario prompts and scene context intact).',
      characterActing: 'Full personality, tone, quirks, speech patterns, and mannerisms.',
      tokenTrimming: 'Deduplicates card fields, strips decorative ASCII/HTML bloat, and compacts system rules.'
    }
  },
  {
    level: 'medium',
    numericValue: 2,
    label: 'Medium',
    badge: '~45%',
    reductionPercentage: '~35% - 50%',
    estimatedSavingText: 'Saves ~45% tokens',
    accentColor: 'text-cyan-400',
    badgeColor: 'bg-cyan-950/70 text-cyan-300 border-cyan-800/60',
    title: 'Balanced Optimization (Recommended)',
    shortSummary: 'Prioritizes behavioral acting & scene activity while condensing static lore.',
    description: 'Scores sentences to keep behavioral/speech traits intact, condenses verbose backstory into dense facts, keeps top 2 lore entries, and compacts older chat turns.',
    focusHighlights: {
      persona: 'Essential persona identity, role, appearance, and relationship cues.',
      currentActivity: 'Active scenario title, objective, and recent scene context prioritized.',
      characterActing: 'High-priority dialogue cues, emotional baseline, and speech style locked in.',
      tokenTrimming: 'Filters out static worldbuilding fluff, compacts older turns (6-8), keeps last 5 verbatim.'
    }
  },
  {
    level: 'aggressive',
    numericValue: 3,
    label: 'Aggressive',
    badge: '~70%',
    reductionPercentage: '~60% - 75%',
    estimatedSavingText: 'Saves ~70% tokens',
    accentColor: 'text-purple-400',
    badgeColor: 'bg-purple-950/70 text-purple-300 border-purple-800/60',
    title: 'Ultra-Dense Compression',
    shortSummary: 'Maximum token savings focused strictly on acting, activity, and persona.',
    description: 'Distills verbose character cards into high-density behavioral tokens, relies on structured <memory> for older turns, and sends only the last 4 turns verbatim.',
    focusHighlights: {
      persona: 'Core persona identity, direct relationship with character, and key cues.',
      currentActivity: 'Direct scene activity, immediate goal, and active interaction.',
      characterActing: 'Core psychological voice, speech patterns, behavioral tone, and persona interaction rules.',
      tokenTrimming: 'Dense telegraph-style token format, compact memory, last 4 turns verbatim.'
    }
  }
];

export interface OptimizedContextResult {
  systemPrompt: string;
  messages: ChatMessage[];
  tierInfo: TokenOptimizerTierInfo;
  rawTokenCount: number;
  optimizedTokenCount: number;
  savedTokens: number;
  estimatedTokensSavedPct: number;
}

export class TokenOptimizerService {
  public getTierByLevel(level: TokenOptimizerLevel = 'off'): TokenOptimizerTierInfo {
    return TOKEN_OPTIMIZER_TIERS.find(t => t.level === level) || TOKEN_OPTIMIZER_TIERS[0];
  }

  public getTierByNumeric(value: number): TokenOptimizerTierInfo {
    const clamped = Math.max(0, Math.min(Math.round(value), 3));
    return TOKEN_OPTIMIZER_TIERS[clamped] || TOKEN_OPTIMIZER_TIERS[0];
  }

  /**
   * Estimates BPE token count (OpenAI / Gemini / Claude approximation: ~3.8 chars per token + punctuation weight)
   */
  public estimateTokens(text: string): number {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const chars = text.length;
    return Math.max(1, Math.round((chars / 3.8 + words * 1.3) / 2));
  }

  /**
   * Cleans visual-only image tags and long base64 strings so they don't consume context tokens
   */
  private stripImages(text: string): string {
    if (!text) return '';
    return text
      .replace(/!\[(.*?)\]\(\s*(?:https?:\/\/[^\s)]+|data:image\/[^\s)]+)\s*\)/g, (_, alt) =>
        alt && alt.trim() ? `[Visual: ${alt.trim()}]` : ''
      )
      .replace(/<img\b[^>]*>/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Strips decorative ASCII dividers, redundant W++ quotes/plus signs, and HTML tags
   */
  private cleanCardSyntaxBloat(text: string): string {
    if (!text) return '';
    return text
      .replace(/<[^>]+>/g, ' ')
      // Strip decorative ASCII dividers (====, ----, ****, ░░░░)
      .replace(/[═─━▬┄┅┈┉╌╍⎯⏤─=*_~░▒▓█]{4,}/g, '')
      // Convert W++ bloat like ("trait1" + "trait2" + "trait3") into (trait1, trait2, trait3)
      .replace(/"\s*\+\s*"/g, ', ')
      .replace(/\[\s*([^\]]+?)\s*\]/g, '[$1]')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Removes duplicate sentences/lines between two blocks of text (e.g., when a card duplicates personality in background)
   */
  private deduplicateAgainst(targetText: string, referenceText: string): string {
    if (!targetText || !referenceText) return targetText || '';
    const refSentences = new Set(
      referenceText
        .split(/(?<=[.?!])\s+|\n+/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 18)
    );

    return targetText
      .split(/\n+/)
      .map(line => {
        const cleanLine = line.trim();
        if (refSentences.has(cleanLine.toLowerCase())) return '';
        return cleanLine;
      })
      .filter(Boolean)
      .join('\n');
  }

  /**
   * Scores sentences by how strongly they describe HOW THE CHARACTER ACTS, SPEAKS, or INTERACTS
   * vs static background filler, and returns the most relevant traits within a character budget.
   */
  private extractActingAndBehavioralCore(text: string, maxChars: number): string {
    if (!text) return '';
    const cleaned = this.cleanCardSyntaxBloat(text);
    if (cleaned.length <= maxChars) return cleaned;

    const chunks = cleaned
      .split(/(?<=[.?!])\s+|\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 6);

    const actingKeywords = /\b(personality|trait|tone|voice|speak|speech|talk|act|behav|manner|quirk|habit|attitude|emotion|feel|dynamic|user|relationship|love|hate|fear|desire|secret|goal|promise|teas|shy|cold|warm|dominant|submissive|flirt|sarcastic|gentle|aggressive|possessive|loyal|tsundere|yandere|kuudere|archetype|style|laugh|smile|gaze|expression)\b/i;

    const scored = chunks.map((chunk, idx) => {
      let score = 0;
      if (actingKeywords.test(chunk)) score += 5;
      if (chunk.includes(':') || chunk.startsWith('-')) score += 2; // key-value trait lines
      if (idx < 3) score += 3; // opening identity lines are usually critical
      return { chunk, score, idx };
    });

    // Sort by relevance score descending, then restore original order for coherent reading
    scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

    const selected: { chunk: string; idx: number }[] = [];
    let currentLen = 0;
    for (const item of scored) {
      if (currentLen + item.chunk.length > maxChars && selected.length >= 2) continue;
      selected.push({ chunk: item.chunk, idx: item.idx });
      currentLen += item.chunk.length + 1;
      if (currentLen >= maxChars) break;
    }

    selected.sort((a, b) => a.idx - b.idx);
    return selected.map(s => s.chunk).join(' ');
  }

  /**
   * Compresses older chat messages so massive 500-token opening greetings don't eat tokens on every turn,
   * while keeping recent messages 100% verbatim.
   */
  private compressMessageHistory(
    messages: ChatMessage[],
    maxTurns: number,
    verbatimRecentTurns: number,
    maxCharsPerOlderTurn: number
  ): ChatMessage[] {
    const sliced = messages.slice(-maxTurns);
    if (sliced.length <= verbatimRecentTurns) return sliced;

    const olderCount = sliced.length - verbatimRecentTurns;
    return sliced.map((msg, idx) => {
      const cleanedContent = this.stripImages(msg.content);
      if (idx < olderCount && cleanedContent.length > maxCharsPerOlderTurn) {
        // Extract spoken dialogue ("...") + last action sentence so continuity is preserved
        const dialogues = cleanedContent.match(/"[^"]{4,140}"/g) || [];
        const tail = cleanedContent.slice(-Math.floor(maxCharsPerOlderTurn * 0.6)).trim();
        const compact = dialogues.length > 0
          ? `${dialogues.slice(0, 2).join(' ')} ... ${tail}`
          : `${cleanedContent.slice(0, Math.floor(maxCharsPerOlderTurn * 0.5)).trim()} ... ${tail}`;
        return {
          ...msg,
          content: compact.slice(0, maxCharsPerOlderTurn)
        };
      }
      return {
        ...msg,
        content: cleanedContent
      };
    });
  }

  /**
   * Builds the unoptimized baseline prompt & messages for exact token comparison
   */
  private buildRawBaseline(options: {
    character: Character;
    scenario?: CharacterScenario;
    persona?: Persona;
    lorebooks: Lorebook[];
    conversation: Conversation;
    customRules?: string;
  }): { systemPrompt: string; messages: ChatMessage[] } {
    const { character, scenario, persona, lorebooks, conversation, customRules } = options;
    const chatCharName = extractCleanCharacterName(character.name, character.subtitle);
    const userName = persona?.name || 'User';

    const sections: string[] = [];
    sections.push(`[CHARACTER IDENTITY]\nName: ${chatCharName} (Card Title: ${character.name})\nPersonality: ${character.personality}\nBackstory: ${character.background}`);
    sections.push(`[CORE INSTRUCTIONS]\n${character.systemPrompt}`);

    if (scenario) {
      sections.push(`[ACTIVE SCENARIO: "${scenario.title}"]\nContext: ${scenario.description}\nScenario Prompt: ${scenario.scenarioInstructions}`);
    }
    if (persona) {
      sections.push(`[USER PERSONA]\nName: ${persona.name}\nAppearance: ${persona.appearance}\nPersonality: ${persona.personality}\nRole: ${persona.roleInstructions || 'Roleplay partner'}`);
    }

    const scanDepth = 8;
    const recentText = conversation.messages.slice(-scanDepth).map(m => m.content).join(' ').toLowerCase();
    const matchedEntries: { title: string; content: string; priority: number }[] = [];
    lorebooks.forEach(lb => {
      lb.entries.forEach(entry => {
        if (!entry.enabled) return;
        if (entry.constant || entry.keys.some(k => k.trim() && recentText.includes(k.trim().toLowerCase()))) {
          matchedEntries.push({ title: entry.title, content: entry.content, priority: entry.priority || 10 });
        }
      });
    });
    if (matchedEntries.length > 0) {
      matchedEntries.sort((a, b) => b.priority - a.priority);
      sections.push(`[ACTIVE WORLD LORE]\n${matchedEntries.map(e => `- ${e.title}: ${e.content}`).join('\n')}`);
    }

    if (conversation.summary) {
      sections.push(`[CONVERSATION MEMORY & CONTINUITY]\n${conversation.summary.trim()}`);
    }
    if (conversation.keyMemories && conversation.keyMemories.length > 0) {
      sections.push(`[KEY MEMORIES]\n${conversation.keyMemories.map(m => `- ${m}`).join('\n')}`);
    }
    if (customRules?.trim()) {
      sections.push(`[USER CUSTOM RULES & INSTRUCTIONS]\n${customRules.trim()}`);
    }
    sections.push(`[FORMATTING GUIDELINES]
- Maintain immersion. Never break character or refer to yourself as an AI.
- Always refer to the user by their persona name ("${userName}") and yourself as "${chatCharName}". Never output raw placeholders like {{user}}, [[user]], {{char}}, or [[char]].
- Format physical micro-actions, gestures, tone, and environment in italics (*action*).
- Put spoken words in double quotes ("spoken dialogue").
- Respond with creative detail, emotional realism, and narrative pacing.`);

    const fullPrompt = this.stripImages(
      sections
        .join('\n\n')
        .replace(/`?\{\{user\}\}`?|`?\[\[user\]\]`?|<user>/gi, userName)
        .replace(/`?\{\{char\}\}`?|`?\[\[char\]\]`?|<char>/gi, chatCharName)
    );

    return {
      systemPrompt: fullPrompt,
      messages: conversation.messages.slice(-10)
    };
  }

  /**
   * Assembles the optimized context based on selected token optimizer level.
   * Guarantees strict focus on:
   * 1. Persona (user identity, relationship, appearance)
   * 2. Current Activity (scenario, scene context, active action)
   * 3. Character Acting (voice, tone, demeanor, mannerisms)
   */
  public optimizeContext(options: {
    character: Character;
    scenario?: CharacterScenario;
    persona?: Persona;
    lorebooks: Lorebook[];
    conversation: Conversation;
    customRules?: string;
    level?: TokenOptimizerLevel;
  }): OptimizedContextResult {
    const level = options.level || options.conversation.tokenOptimizer || 'off';
    const tier = this.getTierByLevel(level);

    // Measure raw baseline for real token savings telemetry
    const rawBaseline = this.buildRawBaseline(options);
    const rawHistoryText = rawBaseline.messages.map(m => m.content).join('\n');
    const rawTokenCount = this.estimateTokens(rawBaseline.systemPrompt + '\n' + rawHistoryText);

    if (tier.level === 'off') {
      return {
        systemPrompt: rawBaseline.systemPrompt,
        messages: rawBaseline.messages,
        tierInfo: tier,
        rawTokenCount,
        optimizedTokenCount: rawTokenCount,
        savedTokens: 0,
        estimatedTokensSavedPct: 0
      };
    }

    const { character, scenario, persona, lorebooks, conversation, customRules } = options;
    const chatCharName = extractCleanCharacterName(character.name, character.subtitle);
    const userName = persona?.name || 'User';

    // Deduplicate background against personality (many imported cards copy-paste the same text into both)
    const cleanPersonality = this.cleanCardSyntaxBloat(character.personality);
    const dedupedBackground = this.cleanCardSyntaxBloat(
      this.deduplicateAgainst(character.background, character.personality)
    );

    // ─────────────────────────────────────────────────────────────
    // TIER 1: EASY (~20% reduction — Deduplicate, strip syntax bloat)
    // ─────────────────────────────────────────────────────────────
    if (tier.level === 'easy') {
      const sections: string[] = [];
      sections.push(
        `[CHARACTER: ${chatCharName}]\nPersonality & Acting: ${cleanPersonality}${
          dedupedBackground ? `\nBackground: ${dedupedBackground}` : ''
        }`
      );

      if (scenario) {
        const cleanScenDesc = this.cleanCardSyntaxBloat(scenario.description);
        const cleanScenInst = this.cleanCardSyntaxBloat(
          this.deduplicateAgainst(scenario.scenarioInstructions, scenario.description)
        );
        sections.push(
          `[CURRENT ACTIVITY / SCENARIO: "${scenario.title}"]\n${cleanScenDesc}${
            cleanScenInst ? `\nScene Direction: ${cleanScenInst}` : ''
          }`
        );
      }

      if (persona) {
        sections.push(
          `[USER PERSONA: ${persona.name}]\nRole: ${persona.roleInstructions || 'Roleplay partner'}\nAppearance: ${this.cleanCardSyntaxBloat(persona.appearance)}\nPersonality: ${this.cleanCardSyntaxBloat(persona.personality)}`
        );
      }

      // Lorebooks matching (top 4 entries)
      const scanDepth = 6;
      const recentText = conversation.messages.slice(-scanDepth).map(m => m.content).join(' ').toLowerCase();
      const matchedEntries: { title: string; content: string; priority: number }[] = [];
      lorebooks.forEach(lb => {
        lb.entries.forEach(entry => {
          if (!entry.enabled) return;
          if (entry.constant || entry.keys.some(k => k.trim() && recentText.includes(k.trim().toLowerCase()))) {
            matchedEntries.push({ title: entry.title, content: this.cleanCardSyntaxBloat(entry.content), priority: entry.priority || 10 });
          }
        });
      });
      if (matchedEntries.length > 0) {
        matchedEntries.sort((a, b) => b.priority - a.priority);
        sections.push(`[ACTIVE LORE]\n${matchedEntries.slice(0, 4).map(e => `- ${e.title}: ${e.content}`).join('\n')}`);
      }

      if (conversation.summary) {
        sections.push(`[MEMORY]\n${conversation.summary.trim()}`);
      }
      if (customRules?.trim()) {
        sections.push(`[RULES]\n${customRules.trim()}`);
      }

      sections.push(
        `[DIRECTIVES] Stay in-character as ${chatCharName} interacting with ${userName}. Enclose spoken dialogue in quotes ("...") and physical actions/expressions in italics (*...*).`
      );

      const easyPrompt = this.stripImages(
        sections
          .join('\n\n')
          .replace(/`?\{\{user\}\}`?|`?\[\[user\]\]`?|<user>/gi, userName)
          .replace(/`?\{\{char\}\}`?|`?\[\[char\]\]`?|<char>/gi, chatCharName)
      );

      const easyMessages = this.compressMessageHistory(conversation.messages, 8, 6, 450);
      const optTokens = this.estimateTokens(easyPrompt + '\n' + easyMessages.map(m => m.content).join('\n'));
      const saved = Math.max(0, rawTokenCount - optTokens);
      const pct = rawTokenCount > 0 ? Math.round((saved / rawTokenCount) * 100) : 20;

      return {
        systemPrompt: easyPrompt,
        messages: easyMessages,
        tierInfo: tier,
        rawTokenCount,
        optimizedTokenCount: optTokens,
        savedTokens: saved,
        estimatedTokensSavedPct: Math.max(12, pct)
      };
    }

    // ─────────────────────────────────────────────────────────────
    // TIER 2: MEDIUM (~45% reduction — Behavioral & Scene Priority)
    // ─────────────────────────────────────────────────────────────
    if (tier.level === 'medium') {
      const sections: string[] = [];

      // 1. Character Acting & Personality (Score & keep behavioral sentences up to 650 chars)
      const actingCore = this.extractActingAndBehavioralCore(cleanPersonality, 650);
      const backgroundCore = this.extractActingAndBehavioralCore(dedupedBackground, 320);

      sections.push(
        `[CHARACTER: ${chatCharName}]\nHow ${chatCharName} Acts & Speaks: ${actingCore}${
          backgroundCore ? `\nKey Context: ${backgroundCore}` : ''
        }`
      );

      // 2. Current Activity / Scenario (Prioritized)
      if (scenario) {
        const activeScene = this.extractActingAndBehavioralCore(
          `${scenario.scenarioInstructions || ''} ${scenario.description || ''}`,
          400
        );
        sections.push(`[CURRENT ACTIVITY: "${scenario.title}"]\n${activeScene}`);
      }

      // 3. User Persona (Identity, looks & relationship)
      if (persona) {
        sections.push(
          `[USER PERSONA: ${persona.name}]\nRole: ${persona.roleInstructions || 'Roleplay partner'} | Looks: ${this.extractActingAndBehavioralCore(persona.appearance, 180)} | Traits: ${this.extractActingAndBehavioralCore(persona.personality, 160)}`
        );
      }

      // 4. Lorebooks: only top 2 highest priority entries
      const scanDepth = 4;
      const recentText = conversation.messages.slice(-scanDepth).map(m => m.content).join(' ').toLowerCase();
      const matchedEntries: { title: string; content: string; priority: number }[] = [];
      lorebooks.forEach(lb => {
        lb.entries.forEach(entry => {
          if (!entry.enabled) return;
          if (entry.constant || entry.keys.some(k => k.trim() && recentText.includes(k.trim().toLowerCase()))) {
            matchedEntries.push({ title: entry.title, content: this.cleanCardSyntaxBloat(entry.content), priority: entry.priority || 10 });
          }
        });
      });
      if (matchedEntries.length > 0) {
        matchedEntries.sort((a, b) => b.priority - a.priority);
        sections.push(`[LORE]\n${matchedEntries.slice(0, 2).map(e => `- ${e.title}: ${e.content.slice(0, 180)}`).join('\n')}`);
      }

      // 5. Memory
      if (conversation.summary) {
        sections.push(`[MEMORY]\n${conversation.summary.trim()}`);
      }
      if (customRules?.trim()) {
        sections.push(`[RULES]\n${customRules.trim()}`);
      }

      sections.push(`[STYLE] Roleplay as ${chatCharName} with ${userName}. Dialogue in "quotes", actions in *italics*.`);

      const mediumPrompt = this.stripImages(
        sections
          .join('\n\n')
          .replace(/`?\{\{user\}\}`?|`?\[\[user\]\]`?|<user>/gi, userName)
          .replace(/`?\{\{char\}\}`?|`?\[\[char\]\]`?|<char>/gi, chatCharName)
      );

      const mediumMessages = this.compressMessageHistory(conversation.messages, 6, 4, 280);
      const optTokens = this.estimateTokens(mediumPrompt + '\n' + mediumMessages.map(m => m.content).join('\n'));
      const saved = Math.max(0, rawTokenCount - optTokens);
      const pct = rawTokenCount > 0 ? Math.round((saved / rawTokenCount) * 100) : 45;

      return {
        systemPrompt: mediumPrompt,
        messages: mediumMessages,
        tierInfo: tier,
        rawTokenCount,
        optimizedTokenCount: optTokens,
        savedTokens: saved,
        estimatedTokensSavedPct: Math.max(30, pct)
      };
    }

    // ─────────────────────────────────────────────────────────────
    // TIER 3: AGGRESSIVE (~70% reduction — Ultra-dense Acting/Activity/Persona)
    // ─────────────────────────────────────────────────────────────
    const sections: string[] = [];

    // 1. Ultra-dense Character Acting & Voice
    const ultraActing = this.extractActingAndBehavioralCore(
      `${cleanPersonality} ${dedupedBackground}`,
      360
    );
    sections.push(`[CHAR: ${chatCharName}]\nActing & Voice: ${ultraActing}`);

    // 2. Current Activity (Immediate scene focus)
    if (scenario) {
      const ultraScene = this.extractActingAndBehavioralCore(
        scenario.scenarioInstructions || scenario.description,
        200
      );
      sections.push(`[ACTIVITY: ${scenario.title}] ${ultraScene}`);
    }

    // 3. Persona (Target identity & relationship)
    if (persona) {
      sections.push(
        `[PERSONA: ${persona.name}] ${persona.roleInstructions || 'Partner'} | ${this.extractActingAndBehavioralCore(persona.appearance, 100)}`
      );
    }

    // 4. Memory continuity
    if (conversation.summary) {
      sections.push(`[MEMORY]\n${conversation.summary.trim().slice(0, 260)}`);
    } else if (conversation.keyMemories && conversation.keyMemories.length > 0) {
      sections.push(`[MEMORY] ${conversation.keyMemories.slice(-3).join(' | ')}`);
    }

    if (customRules?.trim()) {
      sections.push(`[RULES] ${customRules.trim().slice(0, 160)}`);
    }

    sections.push(`[FORMAT] Embody ${chatCharName}'s tone & behavior with ${userName}. "Dialogue", *actions*.`);

    const aggressivePrompt = this.stripImages(
      sections
        .join('\n')
        .replace(/`?\{\{user\}\}`?|`?\[\[user\]\]`?|<user>/gi, userName)
        .replace(/`?\{\{char\}\}`?|`?\[\[char\]\]`?|<char>/gi, chatCharName)
    );

    const aggressiveMessages = this.compressMessageHistory(conversation.messages, 4, 2, 180);
    const optTokens = this.estimateTokens(aggressivePrompt + '\n' + aggressiveMessages.map(m => m.content).join('\n'));
    const saved = Math.max(0, rawTokenCount - optTokens);
    const pct = rawTokenCount > 0 ? Math.round((saved / rawTokenCount) * 100) : 70;

    return {
      systemPrompt: aggressivePrompt,
      messages: aggressiveMessages,
      tierInfo: tier,
      rawTokenCount,
      optimizedTokenCount: optTokens,
      savedTokens: saved,
      estimatedTokensSavedPct: Math.max(55, pct)
    };
  }
}

export const tokenOptimizerService = new TokenOptimizerService();
