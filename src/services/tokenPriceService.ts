/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  TokenPriceConfig,
  ConversationTokenStats,
  ContextBreakdownItem,
  Conversation,
  Character,
  CharacterScenario,
  Persona,
  Lorebook,
  TokenOptimizerLevel,
  TokenCurrency
} from '../types';
import { tokenOptimizerService } from './tokenOptimizerService';

export const DEFAULT_USD_TO_IDR_RATE = 16200;

export const TOKEN_PRICE_PRESETS: TokenPriceConfig[] = [
  // ── Indonesian AI Routers / Proxies (Direct Rupiah Pricing) ──
  {
    presetId: 'indo-router-flash',
    name: 'Indo Router — Gemini Flash',
    pricePer1MInput: 0.075,
    pricePer1MOutput: 0.30,
    pricePer1MInputIdr: 1200, // Rp 1.200 / 1M Input
    pricePer1MOutputIdr: 4800, // Rp 4.800 / 1M Output
    contextLimit: 1048576,
    currency: 'IDR',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },
  {
    presetId: 'indo-router-deepseek',
    name: 'Indo Router — DeepSeek V3',
    pricePer1MInput: 0.14,
    pricePer1MOutput: 0.28,
    pricePer1MInputIdr: 2250, // Rp 2.250 / 1M Input
    pricePer1MOutputIdr: 4500, // Rp 4.500 / 1M Output
    contextLimit: 64000,
    currency: 'IDR',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },
  {
    presetId: 'indo-router-mini',
    name: 'Indo Router — GPT-4o Mini',
    pricePer1MInput: 0.15,
    pricePer1MOutput: 0.60,
    pricePer1MInputIdr: 2400, // Rp 2.400 / 1M Input
    pricePer1MOutputIdr: 9600, // Rp 9.600 / 1M Output
    contextLimit: 128000,
    currency: 'IDR',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },
  {
    presetId: 'indo-router-pro',
    name: 'Indo Router — Gemini Pro',
    pricePer1MInput: 1.25,
    pricePer1MOutput: 5.00,
    pricePer1MInputIdr: 20000, // Rp 20.000 / 1M Input
    pricePer1MOutputIdr: 80000, // Rp 80.000 / 1M Output
    contextLimit: 2097152,
    currency: 'IDR',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },
  {
    presetId: 'indo-custom',
    name: 'Indo Router — Custom (Input Langsung Rp)',
    pricePer1MInput: 0.09,
    pricePer1MOutput: 0.35,
    pricePer1MInputIdr: 1500, // Custom default Rp 1.500 / 1M
    pricePer1MOutputIdr: 5000, // Custom default Rp 5.000 / 1M
    contextLimit: 128000,
    currency: 'IDR',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },

  // ── Global Models ──
  {
    presetId: 'gemini-2.5-flash',
    name: 'Google Gemini 2.5 Flash',
    pricePer1MInput: 0.075,
    pricePer1MOutput: 0.30,
    pricePer1MInputIdr: 1215,
    pricePer1MOutputIdr: 4860,
    contextLimit: 1048576, // 1M tokens
    currency: 'USD',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },
  {
    presetId: 'gemini-2.5-pro',
    name: 'Google Gemini 2.5 Pro',
    pricePer1MInput: 1.25,
    pricePer1MOutput: 5.00,
    pricePer1MInputIdr: 20250,
    pricePer1MOutputIdr: 81000,
    contextLimit: 2097152, // 2M tokens
    currency: 'USD',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },
  {
    presetId: 'gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    pricePer1MInput: 0.15,
    pricePer1MOutput: 0.60,
    pricePer1MInputIdr: 2430,
    pricePer1MOutputIdr: 9720,
    contextLimit: 128000,
    currency: 'USD',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },
  {
    presetId: 'gpt-4o',
    name: 'OpenAI GPT-4o (Standard)',
    pricePer1MInput: 2.50,
    pricePer1MOutput: 10.00,
    pricePer1MInputIdr: 40500,
    pricePer1MOutputIdr: 162000,
    contextLimit: 128000,
    currency: 'USD',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },
  {
    presetId: 'claude-3-5-sonnet',
    name: 'Anthropic Claude 3.5 Sonnet',
    pricePer1MInput: 3.00,
    pricePer1MOutput: 15.00,
    pricePer1MInputIdr: 48600,
    pricePer1MOutputIdr: 243000,
    contextLimit: 200000,
    currency: 'USD',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },
  {
    presetId: 'claude-3-5-haiku',
    name: 'Anthropic Claude 3.5 Haiku',
    pricePer1MInput: 0.80,
    pricePer1MOutput: 4.00,
    pricePer1MInputIdr: 12960,
    pricePer1MOutputIdr: 64800,
    contextLimit: 200000,
    currency: 'USD',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },
  {
    presetId: 'deepseek-v3',
    name: 'DeepSeek V3 / R1',
    pricePer1MInput: 0.14,
    pricePer1MOutput: 0.28,
    pricePer1MInputIdr: 2268,
    pricePer1MOutputIdr: 4536,
    contextLimit: 64000,
    currency: 'USD',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },
  {
    presetId: 'llama-3.3-70b',
    name: 'Llama 3.3 70B (OpenRouter / Groq)',
    pricePer1MInput: 0.40,
    pricePer1MOutput: 0.40,
    pricePer1MInputIdr: 6480,
    pricePer1MOutputIdr: 6480,
    contextLimit: 128000,
    currency: 'USD',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },
  {
    presetId: 'free-sim',
    name: 'Free / Local Simulation',
    pricePer1MInput: 0.00,
    pricePer1MOutput: 0.00,
    pricePer1MInputIdr: 0,
    pricePer1MOutputIdr: 0,
    contextLimit: 32768,
    currency: 'USD',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  },
  {
    presetId: 'custom',
    name: 'Custom Rates ($ / 1M)',
    pricePer1MInput: 0.15,
    pricePer1MOutput: 0.60,
    pricePer1MInputIdr: 2400,
    pricePer1MOutputIdr: 9600,
    contextLimit: 128000,
    currency: 'USD',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  }
];

const STORAGE_KEY = 'warden_token_pricing_v1';

export class TokenPriceService {
  private activeConfig: TokenPriceConfig = {
    ...TOKEN_PRICE_PRESETS[0],
    currency: 'IDR',
    usdToIdrRate: DEFAULT_USD_TO_IDR_RATE
  };

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (typeof parsed.pricePer1MInput === 'number' || typeof parsed.pricePer1MInputIdr === 'number')) {
          this.activeConfig = {
            ...parsed,
            currency: parsed.currency || 'IDR',
            pricePer1MInputIdr: parsed.pricePer1MInputIdr ?? Math.round((parsed.pricePer1MInput || 0.075) * (parsed.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE)),
            pricePer1MOutputIdr: parsed.pricePer1MOutputIdr ?? Math.round((parsed.pricePer1MOutput || 0.30) * (parsed.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE)),
            usdToIdrRate: parsed.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load token pricing config', e);
    }
  }

  public getActiveConfig(): TokenPriceConfig {
    return { ...this.activeConfig };
  }

  public setActiveConfig(config: TokenPriceConfig) {
    this.activeConfig = {
      ...config,
      currency: config.currency || this.activeConfig.currency || 'IDR',
      pricePer1MInputIdr: config.pricePer1MInputIdr ?? Math.round((config.pricePer1MInput || 0) * (config.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE)),
      pricePer1MOutputIdr: config.pricePer1MOutputIdr ?? Math.round((config.pricePer1MOutput || 0) * (config.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE)),
      usdToIdrRate: config.usdToIdrRate || this.activeConfig.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.activeConfig));
    } catch (e) {
      console.warn('Failed to save token pricing config', e);
    }
  }

  public setCurrency(currency: TokenCurrency) {
    this.activeConfig.currency = currency;
    this.setActiveConfig(this.activeConfig);
  }

  public setUsdToIdrRate(rate: number) {
    if (rate > 0) {
      this.activeConfig.usdToIdrRate = rate;
      this.setActiveConfig(this.activeConfig);
    }
  }

  public getPresetById(presetId: string): TokenPriceConfig | undefined {
    return TOKEN_PRICE_PRESETS.find(p => p.presetId === presetId);
  }

  /**
   * Guess the best pricing preset from active model name or provider type
   */
  public matchPresetByModel(modelName?: string, providerType?: string): TokenPriceConfig {
    const raw = `${modelName || ''} ${providerType || ''}`.toLowerCase();
    if (raw.includes('flash')) return TOKEN_PRICE_PRESETS[0]; // gemini-2.5-flash
    if (raw.includes('gemini-2') || raw.includes('gemini-1.5-pro') || raw.includes('gemini-pro')) return TOKEN_PRICE_PRESETS[1];
    if (raw.includes('mini') || raw.includes('4o-mini')) return TOKEN_PRICE_PRESETS[2];
    if (raw.includes('gpt-4') || raw.includes('openai')) return TOKEN_PRICE_PRESETS[3];
    if (raw.includes('sonnet')) return TOKEN_PRICE_PRESETS[4];
    if (raw.includes('haiku')) return TOKEN_PRICE_PRESETS[5];
    if (raw.includes('deepseek')) return TOKEN_PRICE_PRESETS[6];
    if (raw.includes('llama')) return TOKEN_PRICE_PRESETS[7];
    if (raw.includes('simulation') || raw.includes('sim')) return TOKEN_PRICE_PRESETS[8];
    return this.activeConfig;
  }

  /**
   * Formats a token number nicely with thousands separators (e.g. 12,450 or 1.2M)
   */
  public formatTokenCount(num: number): string {
    if (!num || num < 0) return '0';
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
    }
    if (num >= 10_000) {
      return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toLocaleString();
  }

  /**
   * Formats cost in USD or IDR with high precision for micro-cent scale roleplay turns
   */
  public formatCost(
    costInUSD: number,
    currency: TokenCurrency = this.activeConfig.currency || 'IDR',
    usdToIdrRate: number = this.activeConfig.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE
  ): string {
    if (currency === 'IDR') {
      const rate = usdToIdrRate > 0 ? usdToIdrRate : DEFAULT_USD_TO_IDR_RATE;
      const idr = costInUSD * rate;
      return this.formatRupiah(idr);
    }

    if (costInUSD <= 0) return '$0.00';
    if (costInUSD < 0.00001) return '< $0.00001';
    if (costInUSD < 0.0001) return `$${costInUSD.toFixed(5)}`;
    if (costInUSD < 0.01) return `$${costInUSD.toFixed(4)}`;
    return `$${costInUSD.toFixed(2)}`;
  }

  /**
   * Formats direct Rupiah amount
   */
  public formatRupiah(amount: number): string {
    if (amount <= 0) return 'Rp 0';
    if (amount < 0.01) return '< Rp 0,01';
    if (amount < 1) return `Rp ${amount.toFixed(2).replace('.', ',')}`;
    if (amount < 100) return `Rp ${amount.toFixed(1).replace('.', ',')}`;
    return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
  }

  /**
   * Formats 1M token rate in USD or IDR
   */
  public formatRate(
    rateInUSD: number,
    currency: TokenCurrency = this.activeConfig.currency || 'IDR',
    directIdrRate?: number,
    usdToIdrRate: number = this.activeConfig.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE
  ): string {
    if (currency === 'IDR') {
      const idr = typeof directIdrRate === 'number' && directIdrRate > 0
        ? directIdrRate
        : rateInUSD * (usdToIdrRate > 0 ? usdToIdrRate : DEFAULT_USD_TO_IDR_RATE);
      return this.formatRupiah(idr);
    }
    return `$${rateInUSD}`;
  }

  /**
   * Calculates comprehensive token usage, active context, breakdown, and estimated cost
   */
  public calculateStats(params: {
    conversation: Conversation;
    character: Character;
    scenario?: CharacterScenario;
    persona?: Persona;
    lorebooks?: Lorebook[];
    customRules?: string;
    optimizerLevel?: TokenOptimizerLevel;
    config?: TokenPriceConfig;
  }): ConversationTokenStats {
    const {
      conversation,
      character,
      scenario,
      persona,
      lorebooks = [],
      customRules,
      optimizerLevel = conversation.tokenOptimizer || 'off',
      config = this.activeConfig
    } = params;

    const currency: TokenCurrency = config.currency || this.activeConfig.currency || 'USD';
    const rate: number = config.usdToIdrRate || this.activeConfig.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE;

    // 1. Compute raw uncompressed prompt
    const rawCharSheet = [
      character.name,
      character.subtitle || '',
      character.personality || '',
      character.background || '',
      character.systemPrompt || '',
      character.exampleDialogue || ''
    ].join('\n');

    const rawScenarioText = scenario
      ? `${scenario.title}\n${scenario.description}\n${scenario.scenarioInstructions || ''}`
      : '';

    const rawPersonaText = persona
      ? `${persona.name}\n${persona.appearance || ''}\n${persona.personality || ''}\n${persona.roleInstructions || ''}`
      : '';

    const rawLorebooksText = lorebooks
      .flatMap(lb => lb.entries.filter(e => e.enabled).map(e => `${e.title}: ${e.content}`))
      .join('\n');

    const charTokens = tokenOptimizerService.estimateTokens(rawCharSheet);
    const scenarioTokens = tokenOptimizerService.estimateTokens(rawScenarioText);
    const personaTokens = tokenOptimizerService.estimateTokens(rawPersonaText);
    const loreTokens = tokenOptimizerService.estimateTokens(rawLorebooksText);

    // Sum messages tokens
    let userMsgTokens = 0;
    let assistantMsgTokens = 0;

    for (const msg of conversation.messages) {
      const isUser = msg.sender === 'user' || msg.senderRole === 'user';
      const tok = msg.tokenCount || tokenOptimizerService.estimateTokens(msg.content);
      if (isUser) {
        userMsgTokens += tok;
      } else {
        assistantMsgTokens += tok;
      }
    }

    const uncompressedSystem = charTokens + scenarioTokens + personaTokens + loreTokens + (customRules ? tokenOptimizerService.estimateTokens(customRules) : 0);
    const uncompressedTotalContext = uncompressedSystem + userMsgTokens + assistantMsgTokens;

    // 2. Compute optimized context with active optimizer level
    const optResult = tokenOptimizerService.optimizeContext({
      character,
      scenario,
      persona,
      conversation,
      lorebooks,
      customRules,
      level: optimizerLevel
    });

    const activeSystemTokens = tokenOptimizerService.estimateTokens(optResult.systemPrompt);
    const activeHistoryTokens = optResult.messages.reduce(
      (acc, m) => acc + tokenOptimizerService.estimateTokens(m.content),
      0
    );

    // Input tokens is the prompt payload sent to the LLM (System + History)
    const inputTokens = activeSystemTokens + activeHistoryTokens;
    // Output tokens is the accumulated response tokens generated by the AI
    const outputTokens = assistantMsgTokens;
    // Context tokens is the active payload currently resident in the model's context window
    const totalContextTokens = inputTokens;

    const contextLimit = Math.max(1024, config.contextLimit || 128000);
    const contextUsagePercent = Math.min(100, Math.round((totalContextTokens / contextLimit) * 1000) / 10);

    // Optimizer token savings
    const savedTokens = Math.max(0, uncompressedTotalContext - totalContextTokens);

    // Cost calculations:
    let inputCost = 0;
    let outputCost = 0;
    let totalCost = 0;
    let savedCost = 0;
    let formattedInputCost = '';
    let formattedOutputCost = '';
    let formattedTotalCost = '';
    let formattedSavedCost = '';

    if (currency === 'IDR') {
      const idrIn = typeof config.pricePer1MInputIdr === 'number' && config.pricePer1MInputIdr >= 0
        ? config.pricePer1MInputIdr
        : (config.pricePer1MInput || 0) * rate;
      const idrOut = typeof config.pricePer1MOutputIdr === 'number' && config.pricePer1MOutputIdr >= 0
        ? config.pricePer1MOutputIdr
        : (config.pricePer1MOutput || 0) * rate;

      inputCost = (inputTokens / 1_000_000) * idrIn;
      outputCost = (outputTokens / 1_000_000) * idrOut;
      totalCost = inputCost + outputCost;
      savedCost = (savedTokens / 1_000_000) * idrIn;

      formattedInputCost = this.formatRupiah(inputCost);
      formattedOutputCost = this.formatRupiah(outputCost);
      formattedTotalCost = this.formatRupiah(totalCost);
      formattedSavedCost = this.formatRupiah(savedCost);
    } else {
      inputCost = (inputTokens / 1_000_000) * config.pricePer1MInput;
      outputCost = (outputTokens / 1_000_000) * config.pricePer1MOutput;
      totalCost = inputCost + outputCost;
      savedCost = (savedTokens / 1_000_000) * config.pricePer1MInput;

      formattedInputCost = this.formatCost(inputCost, 'USD');
      formattedOutputCost = this.formatCost(outputCost, 'USD');
      formattedTotalCost = this.formatCost(totalCost, 'USD');
      formattedSavedCost = this.formatCost(savedCost, 'USD');
    }

    // Context Breakdown
    const totalForBreakdown = Math.max(1, activeSystemTokens + activeHistoryTokens);
    const breakdown: ContextBreakdownItem[] = [
      {
        label: 'Character & Prompt',
        tokens: charTokens + scenarioTokens,
        percentage: Math.round(((charTokens + scenarioTokens) / totalForBreakdown) * 100),
        color: 'bg-purple-500'
      },
      {
        label: 'Persona & Lore',
        tokens: personaTokens + loreTokens,
        percentage: Math.round(((personaTokens + loreTokens) / totalForBreakdown) * 100),
        color: 'bg-cyan-500'
      },
      {
        label: 'Message History',
        tokens: activeHistoryTokens,
        percentage: Math.round((activeHistoryTokens / totalForBreakdown) * 100),
        color: 'bg-emerald-500'
      }
    ];

    return {
      inputTokens,
      outputTokens,
      totalContextTokens,
      contextLimit,
      contextUsagePercent,
      inputCost,
      outputCost,
      totalCost,
      currency,
      formattedInputCost,
      formattedOutputCost,
      formattedTotalCost,
      formattedSavedCost,
      uncompressedTokens: uncompressedTotalContext,
      savedTokens,
      savedCost,
      breakdown
    };
  }
}

export const tokenPriceService = new TokenPriceService();

