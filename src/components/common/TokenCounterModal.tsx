/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Coins,
  Calculator,
  Gauge,
  TrendingDown,
  Layers,
  Sparkles,
  HelpCircle,
  X,
  Info,
  Check,
  Cpu
} from 'lucide-react';
import { TokenPriceConfig, ConversationTokenStats, TokenCurrency, CumulativeTokenUsage } from '../../types';
import {
  tokenPriceService,
  TOKEN_PRICE_PRESETS,
  DEFAULT_USD_TO_IDR_RATE
} from '../../services/tokenPriceService';
import { CustomSelect } from './CustomSelect';

interface TokenCounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: ConversationTokenStats;
  currentConfig: TokenPriceConfig;
  onConfigChange: (config: TokenPriceConfig) => void;
  optimizerLevel?: string;
  cumulativeUsage?: CumulativeTokenUsage;
}

export const TokenCounterModal: React.FC<TokenCounterModalProps> = ({
  isOpen,
  onClose,
  stats,
  currentConfig,
  onConfigChange,
  optimizerLevel = 'off',
  cumulativeUsage
}) => {
  const [currency, setCurrency] = useState<TokenCurrency>(currentConfig.currency || 'USD');
  const [usdToIdrRateInput, setUsdToIdrRateInput] = useState<string>(
    (currentConfig.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE).toString()
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(currentConfig.presetId);
  const [priceInput, setPriceInput] = useState<string>(currentConfig.pricePer1MInput.toString());
  const [priceOutput, setPriceOutput] = useState<string>(currentConfig.pricePer1MOutput.toString());
  const [priceInputIdr, setPriceInputIdr] = useState<string>(() => {
    if (currentConfig.pricePer1MInputIdr !== undefined) {
      return currentConfig.pricePer1MInputIdr.toString();
    }
    const rate = currentConfig.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE;
    return Math.round(currentConfig.pricePer1MInput * rate).toString();
  });
  const [priceOutputIdr, setPriceOutputIdr] = useState<string>(() => {
    if (currentConfig.pricePer1MOutputIdr !== undefined) {
      return currentConfig.pricePer1MOutputIdr.toString();
    }
    const rate = currentConfig.usdToIdrRate || DEFAULT_USD_TO_IDR_RATE;
    return Math.round(currentConfig.pricePer1MOutput * rate).toString();
  });
  const [contextLimitInput, setContextLimitInput] = useState<string>(currentConfig.contextLimit.toString());
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const activeRate = parseFloat(usdToIdrRateInput) || DEFAULT_USD_TO_IDR_RATE;

  const handleCurrencyChange = (newCurrency: TokenCurrency) => {
    setCurrency(newCurrency);
    const updated: TokenPriceConfig = {
      ...currentConfig,
      currency: newCurrency,
      usdToIdrRate: activeRate
    };
    onConfigChange(updated);
    tokenPriceService.setActiveConfig(updated);
    triggerSavedNotice();
  };

  const handleRateExchangeChange = (rateStr: string) => {
    setUsdToIdrRateInput(rateStr);
    const num = parseFloat(rateStr) || DEFAULT_USD_TO_IDR_RATE;
    const updated: TokenPriceConfig = {
      ...currentConfig,
      usdToIdrRate: num
    };
    onConfigChange(updated);
    tokenPriceService.setActiveConfig(updated);
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = TOKEN_PRICE_PRESETS.find(p => p.presetId === presetId);
    if (preset) {
      setPriceInput(preset.pricePer1MInput.toString());
      setPriceOutput(preset.pricePer1MOutput.toString());
      const inIdr = preset.pricePer1MInputIdr ?? Math.round(preset.pricePer1MInput * activeRate);
      const outIdr = preset.pricePer1MOutputIdr ?? Math.round(preset.pricePer1MOutput * activeRate);
      setPriceInputIdr(inIdr.toString());
      setPriceOutputIdr(outIdr.toString());
      setContextLimitInput(preset.contextLimit.toString());
      const updated: TokenPriceConfig = {
        ...preset,
        currency,
        usdToIdrRate: activeRate
      };
      onConfigChange(updated);
      tokenPriceService.setActiveConfig(updated);
      triggerSavedNotice();
    }
  };

  const handleCustomRateChange = (
    field: 'input' | 'output' | 'limit',
    val: string
  ) => {
    let nextPriceInUsd = parseFloat(priceInput) || 0;
    let nextPriceOutUsd = parseFloat(priceOutput) || 0;
    let nextPriceInIdr = parseFloat(priceInputIdr) || 0;
    let nextPriceOutIdr = parseFloat(priceOutputIdr) || 0;

    if (field === 'input') {
      if (currency === 'IDR') {
        setPriceInputIdr(val);
        nextPriceInIdr = parseFloat(val) || 0;
        nextPriceInUsd = activeRate > 0 ? +(nextPriceInIdr / activeRate).toFixed(4) : 0;
        setPriceInput(nextPriceInUsd.toString());
      } else {
        setPriceInput(val);
        nextPriceInUsd = parseFloat(val) || 0;
        nextPriceInIdr = Math.round(nextPriceInUsd * activeRate);
        setPriceInputIdr(nextPriceInIdr.toString());
      }
    } else if (field === 'output') {
      if (currency === 'IDR') {
        setPriceOutputIdr(val);
        nextPriceOutIdr = parseFloat(val) || 0;
        nextPriceOutUsd = activeRate > 0 ? +(nextPriceOutIdr / activeRate).toFixed(4) : 0;
        setPriceOutput(nextPriceOutUsd.toString());
      } else {
        setPriceOutput(val);
        nextPriceOutUsd = parseFloat(val) || 0;
        nextPriceOutIdr = Math.round(nextPriceOutUsd * activeRate);
        setPriceOutputIdr(nextPriceOutIdr.toString());
      }
    } else if (field === 'limit') {
      setContextLimitInput(val);
    }

    const limit = field === 'limit' ? parseInt(val, 10) || 128000 : parseInt(contextLimitInput, 10) || 128000;

    const customConfig: TokenPriceConfig = {
      presetId: 'custom',
      name: currency === 'IDR' ? 'Custom Rates (Rp / 1M)' : 'Custom Rates ($ / 1M)',
      pricePer1MInput: nextPriceInUsd,
      pricePer1MOutput: nextPriceOutUsd,
      pricePer1MInputIdr: nextPriceInIdr,
      pricePer1MOutputIdr: nextPriceOutIdr,
      contextLimit: limit,
      currency,
      usdToIdrRate: activeRate
    };
    setSelectedPresetId('custom');
    onConfigChange(customConfig);
    tokenPriceService.setActiveConfig(customConfig);
    triggerSavedNotice();
  };

  const triggerSavedNotice = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1600);
  };

  // Determine context gauge health color
  const usagePct = stats.contextUsagePercent;
  const gaugeColor =
    usagePct > 85 ? 'bg-rose-500' : usagePct > 60 ? 'bg-amber-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl bg-[#0e111a] border border-[#23293e] rounded-3xl shadow-[0_16px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[92vh] animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1c2236] bg-[#121624] flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-sm shrink-0">
              <Coins className="w-5 h-5 text-purple-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">Token Counter & Pricing</h2>
                {savedSuccess && (
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60 font-mono animate-fade-in shrink-0">
                    Saved
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 truncate">
                Live context window utilization, 1M token rates & cost estimation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Currency Selector: USD ($) vs IDR (Rp) */}
            <div className="flex items-center bg-[#171b29] p-0.5 rounded-xl border border-[#2b334d]">
              <button
                type="button"
                onClick={() => handleCurrencyChange('USD')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currency === 'USD'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Display in US Dollars ($)"
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyChange('IDR')}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currency === 'IDR'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Display in Indonesian Rupiah (Rp)"
              >
                IDR (Rp)
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#1f263c] transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* 1. Context Window Capacity Bar */}
          <div className="p-4 rounded-2xl bg-[#141828] border border-[#20273d] space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Gauge className="w-4 h-4 text-purple-400" />
                <span>Context Window Utilization</span>
              </div>
              <span className="font-mono text-xs text-neutral-300">
                <strong className="text-purple-300 font-bold">{tokenPriceService.formatTokenCount(stats.totalContextTokens)}</strong> / {tokenPriceService.formatTokenCount(stats.contextLimit)} tok
                <span className="text-neutral-500 ml-1.5">({stats.contextUsagePercent}%)</span>
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-2.5 bg-[#0b0d15] rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${gaugeColor}`}
                style={{ width: `${Math.max(2, Math.min(100, stats.contextUsagePercent))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono pt-0.5">
              <span>{tokenPriceService.formatTokenCount(stats.contextLimit - stats.totalContextTokens)} tokens remaining</span>
              <span className="text-purple-300">{currentConfig.name}</span>
            </div>
          </div>

          {/* 2. Key Metrics Grid: 1M Input, 1M Output, Context, Estimated Cost */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Input (Prompt) */}
            <div className="p-3 rounded-2xl bg-[#121522] border border-[#1d2336] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="font-semibold text-neutral-300">Input (Prompt)</span>
                <span className="text-[10px] text-purple-400 font-mono">1M In</span>
              </div>
              <div className="text-sm sm:text-base font-extrabold text-white font-mono">
                {tokenPriceService.formatTokenCount(stats.inputTokens)}
              </div>
              <div className="text-[10.5px] text-neutral-400 font-mono">
                {stats.formattedInputCost}
              </div>
            </div>

            {/* Output (Generated) */}
            <div className="p-3 rounded-2xl bg-[#121522] border border-[#1d2336] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="font-semibold text-neutral-300">Output (AI)</span>
                <span className="text-[10px] text-cyan-400 font-mono">1M Out</span>
              </div>
              <div className="text-sm sm:text-base font-extrabold text-white font-mono">
                {tokenPriceService.formatTokenCount(stats.outputTokens)}
              </div>
              <div className="text-[10.5px] text-neutral-400 font-mono">
                {stats.formattedOutputCost}
              </div>
            </div>

            {/* Total Context */}
            <div className="p-3 rounded-2xl bg-[#121522] border border-[#1d2336] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="font-semibold text-neutral-300">Context</span>
                <span className="text-[10px] text-emerald-400 font-mono">Active</span>
              </div>
              <div className="text-sm sm:text-base font-extrabold text-white font-mono">
                {tokenPriceService.formatTokenCount(stats.totalContextTokens)}
              </div>
              <div className="text-[10.5px] text-neutral-400 font-mono">
                {stats.contextUsagePercent}% of limit
              </div>
            </div>

            {/* Total Estimated Cost */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-950/40 to-[#121522] border border-purple-500/40 space-y-1 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-neutral-300">
                <span className="font-bold text-purple-200">Total Cost</span>
                <Sparkles className="w-3 h-3 text-purple-400" />
              </div>
              <div className="text-sm sm:text-base font-extrabold text-purple-200 font-mono">
                {stats.formattedTotalCost}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono truncate">
                {stats.savedCost > 0 ? `Saved ${stats.formattedSavedCost}` : 'Full payload'}
              </div>
            </div>
          </div>

          {/* 3. Cumulative Conversation Statistics (All turns so far) */}
          <div className="p-4 rounded-2xl bg-[#141828] border border-purple-500/30 space-y-3">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Cumulative Conversation Statistics</span>
              </div>
              <span className="text-[11px] text-purple-300 font-mono">
                {cumulativeUsage?.turnCount || 0} completed {cumulativeUsage?.turnCount === 1 ? 'turn' : 'turns'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#0d101b] border border-[#1d2336]">
                <div className="text-[10px] text-neutral-400">Total Input Tokens</div>
                <div className="font-bold text-white font-mono text-xs sm:text-sm mt-0.5">
                  {tokenPriceService.formatTokenCount(cumulativeUsage?.totalInputTokens || 0)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0d101b] border border-[#1d2336]">
                <div className="text-[10px] text-neutral-400">Total Output Tokens</div>
                <div className="font-bold text-white font-mono text-xs sm:text-sm mt-0.5">
                  {tokenPriceService.formatTokenCount(cumulativeUsage?.totalOutputTokens || 0)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0d101b] border border-[#1d2336]">
                <div className="text-[10px] text-neutral-400">Total Conversation Spend</div>
                <div className="font-bold text-amber-300 font-mono text-xs sm:text-sm mt-0.5">
                  {currency === 'IDR'
                    ? tokenPriceService.formatRupiah(cumulativeUsage?.totalCostIdr || 0)
                    : tokenPriceService.formatCost(cumulativeUsage?.totalCostUsd || 0, 'USD')}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#0d101b] border border-[#1d2336]">
                <div className="text-[10px] text-neutral-400">Average Cost / Turn</div>
                <div className="font-bold text-purple-200 font-mono text-xs sm:text-sm mt-0.5">
                  {cumulativeUsage && cumulativeUsage.turnCount > 0
                    ? currency === 'IDR'
                      ? tokenPriceService.formatRupiah(cumulativeUsage.totalCostIdr / cumulativeUsage.turnCount)
                      : tokenPriceService.formatCost(cumulativeUsage.totalCostUsd / cumulativeUsage.turnCount, 'USD')
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Pricing Calculator & 1M Rates Settings */}
          <div className="p-4 rounded-2xl bg-[#121624] border border-[#20273c] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white">
                <Calculator className="w-4 h-4 text-purple-400" />
                <span>
                  Token Pricing Calculator ({currency === 'IDR' ? 'Rp / 1M Tokens' : '$ / 1M Tokens'})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulaTooltip(prev => !prev)}
                className="text-neutral-400 hover:text-purple-300 transition-colors p-0.5 cursor-pointer"
                title="How 1M token calculation works"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* IDR Exchange Rate Row */}
            {currency === 'IDR' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#161a29] border border-purple-500/30 text-xs text-neutral-300 animate-fade-in">
                <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                  <span>Kurs / Exchange Rate:</span>
                </span>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="text-neutral-400 text-xs">1 USD = Rp</span>
                  <input
                    type="number"
                    min="1000"
                    step="100"
                    value={usdToIdrRateInput}
                    onChange={e => handleRateExchangeChange(e.target.value)}
                    className="w-28 bg-[#0e111a] border border-[#2b334d] px-2.5 py-1 rounded-lg text-xs text-white font-mono text-right focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}

            {/* Formula Explanation Popover */}
            {showFormulaTooltip && (
              <div className="p-3 rounded-xl bg-[#090b12] border border-purple-500/40 text-[11px] text-neutral-300 space-y-1.5 animate-fade-in font-sans leading-relaxed">
                <div className="flex items-center justify-between text-purple-300 font-bold border-b border-[#1f2536] pb-1">
                  <span>How 1M Token Pricing is Calculated</span>
                  <button
                    type="button"
                    onClick={() => setShowFormulaTooltip(false)}
                    className="text-neutral-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p>
                  Most modern LLM providers (Google Gemini, OpenAI, Anthropic, DeepSeek, OpenRouter) charge per <strong>1,000,000 (1M) tokens</strong>.
                </p>
                <div className="p-2 rounded bg-[#131622] font-mono text-[10px] text-purple-200">
                  {currency === 'IDR'
                    ? 'Total Biaya = ((Input Tokens / 1.000.000 × $1M Input) + (Output Tokens / 1.000.000 × $1M Output)) × Kurs IDR'
                    : 'Total Cost = (Input Tokens / 1,000,000 × $1M Input) + (Output Tokens / 1,000,000 × $1M Output)'}
                </div>
                <p className="text-[10px] text-neutral-400">
                  {currency === 'IDR'
                    ? `Contoh: 10.000 input tokens Gemini Flash ($0,075 / 1M) = Rp 12,15 (pada kurs 1 USD = Rp ${activeRate.toLocaleString('id-ID')}).`
                    : 'Example: 10,000 input tokens at $0.075 / 1M = $0.00075. Output responses are billed separately at the 1M output rate.'}
                </p>
              </div>
            )}

            {/* Preset Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-300 flex items-center justify-between">
                <span>Model / Provider Preset</span>
                <span className="text-[10px] text-purple-400 font-mono">10 presets available</span>
              </label>
              <CustomSelect
                value={selectedPresetId}
                onChange={val => handleSelectPreset(val)}
                options={TOKEN_PRICE_PRESETS.map(p => {
                  const inStr = currency === 'IDR'
                    ? (p.pricePer1MInputIdr ? `Rp ${p.pricePer1MInputIdr.toLocaleString('id-ID')}` : tokenPriceService.formatRate(p.pricePer1MInput, 'IDR', activeRate))
                    : `$${p.pricePer1MInput}`;
                  const outStr = currency === 'IDR'
                    ? (p.pricePer1MOutputIdr ? `Rp ${p.pricePer1MOutputIdr.toLocaleString('id-ID')}` : tokenPriceService.formatRate(p.pricePer1MOutput, 'IDR', activeRate))
                    : `$${p.pricePer1MOutput}`;
                  return {
                    value: p.presetId,
                    label: p.name,
                    description: `${inStr} / 1M In · ${outStr} / 1M Out (${tokenPriceService.formatTokenCount(p.contextLimit)} ctx)`
                  };
                })}
                className="bg-[#181d2e] border-[#2b334d]"
              />
            </div>

            {/* 3 Interactive Inputs for Custom Rates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* 1M Input Price */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10.5px]">
                  <label className="font-medium text-neutral-300">
                    {currency === 'IDR' ? '1M Input Price (Rp)' : '1M Input Price ($)'}
                  </label>
                  {currency === 'IDR' ? (
                    <span className="text-[9.5px] font-mono text-purple-400">
                      ≈ ${parseFloat(priceInput) || 0} USD
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-mono text-purple-400">
                      ≈ {tokenPriceService.formatRate(parseFloat(priceInput) || 0, 'IDR', undefined, activeRate)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-neutral-400 font-mono font-bold">
                    {currency === 'IDR' ? 'Rp' : '$'}
                  </span>
                  <input
                    type="number"
                    step={currency === 'IDR' ? '100' : '0.001'}
                    min="0"
                    value={currency === 'IDR' ? priceInputIdr : priceInput}
                    onChange={e => handleCustomRateChange('input', e.target.value)}
                    className={`w-full bg-[#181d2e] border border-[#2b334d] rounded-xl pr-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500 ${
                      currency === 'IDR' ? 'pl-8' : 'pl-6'
                    }`}
                    placeholder={currency === 'IDR' ? '1200' : '0.075'}
                  />
                </div>
              </div>

              {/* 1M Output Price */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10.5px]">
                  <label className="font-medium text-neutral-300">
                    {currency === 'IDR' ? '1M Output Price (Rp)' : '1M Output Price ($)'}
                  </label>
                  {currency === 'IDR' ? (
                    <span className="text-[9.5px] font-mono text-cyan-400">
                      ≈ ${parseFloat(priceOutput) || 0} USD
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-mono text-cyan-400">
                      ≈ {tokenPriceService.formatRate(parseFloat(priceOutput) || 0, 'IDR', undefined, activeRate)}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-neutral-400 font-mono font-bold">
                    {currency === 'IDR' ? 'Rp' : '$'}
                  </span>
                  <input
                    type="number"
                    step={currency === 'IDR' ? '100' : '0.001'}
                    min="0"
                    value={currency === 'IDR' ? priceOutputIdr : priceOutput}
                    onChange={e => handleCustomRateChange('output', e.target.value)}
                    className={`w-full bg-[#181d2e] border border-[#2b334d] rounded-xl pr-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500 ${
                      currency === 'IDR' ? 'pl-8' : 'pl-6'
                    }`}
                    placeholder={currency === 'IDR' ? '4800' : '0.30'}
                  />
                </div>
              </div>

              {/* Context Limit */}
              <div className="space-y-1">
                <label className="text-[10.5px] font-medium text-neutral-300 block">
                  Context Limit (tok)
                </label>
                <input
                  type="number"
                  step="1024"
                  min="1024"
                  value={contextLimitInput}
                  onChange={e => handleCustomRateChange('limit', e.target.value)}
                  className="w-full bg-[#181d2e] border border-[#2b334d] px-2.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  placeholder="128000"
                />
              </div>
            </div>
          </div>

          {/* 4. Context Breakdown Pill Bar */}
          <div className="p-3.5 rounded-2xl bg-[#121522] border border-[#1e2436] space-y-2 text-xs">
            <div className="flex items-center justify-between font-bold text-white text-[11px]">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Active Context Breakdown</span>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">
                {stats.breakdown.length} components
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              {stats.breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] text-neutral-300">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10.5px]">
                    <span className="text-white font-semibold">{tokenPriceService.formatTokenCount(item.tokens)} tok</span>
                    <span className="text-neutral-500 w-8 text-right">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Token Optimizer Impact & Savings */}
          <div className="p-3.5 rounded-2xl bg-[#121624] border border-[#1e2538] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/35 flex items-center justify-center text-purple-300 shrink-0">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                  <span>Optimizer Savings ({optimizerLevel.toUpperCase()})</span>
                </div>
                <p className="text-[10.5px] text-neutral-400">
                  {stats.savedTokens > 0
                    ? `Saved ~${tokenPriceService.formatTokenCount(stats.savedTokens)} tokens (${stats.formattedSavedCost}) this turn`
                    : 'Compresses card fluff to preserve persona and budget'}
                </p>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-2.5 py-1 rounded-xl shrink-0">
              {stats.savedTokens > 0 ? `-${Math.round((stats.savedTokens / Math.max(1, stats.uncompressedTokens)) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#1c2236] bg-[#121624] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-neutral-400 font-mono truncate mr-2">
            {currentConfig.name}: {tokenPriceService.formatRate(currentConfig.pricePer1MInput, currency, currentConfig.pricePer1MInputIdr, activeRate)}/1M in · {tokenPriceService.formatRate(currentConfig.pricePer1MOutput, currency, currentConfig.pricePer1MOutputIdr, activeRate)}/1M out
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

