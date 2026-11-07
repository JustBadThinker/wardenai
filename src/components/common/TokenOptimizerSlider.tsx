/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Gauge, Info, ShieldCheck, Sparkles, Activity, User, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { TokenOptimizerLevel } from '../../types';
import {
  TOKEN_OPTIMIZER_TIERS,
  TokenOptimizerTierInfo,
  OptimizedContextResult,
  tokenOptimizerService
} from '../../services/tokenOptimizerService';

interface TokenOptimizerSliderProps {
  value: TokenOptimizerLevel;
  onChange: (level: TokenOptimizerLevel) => void;
  className?: string;
  compact?: boolean;
  liveResult?: OptimizedContextResult;
}

export const TokenOptimizerSlider: React.FC<TokenOptimizerSliderProps> = ({
  value,
  onChange,
  className = '',
  compact = false,
  liveResult
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const currentTier: TokenOptimizerTierInfo = tokenOptimizerService.getTierByLevel(value);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    const tier = tokenOptimizerService.getTierByNumeric(num);
    onChange(tier.level);
  };

  return (
    <div className={`p-3.5 bg-[#121520] border border-[#1f2536] rounded-2xl space-y-3 ${className}`}>
      {/* Header with Title, Live Percentage Badge, and Tooltip Trigger */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
            <Gauge className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm text-white">Token Optimizer</span>
              <button
                type="button"
                onClick={() => setShowTooltip(prev => !prev)}
                className="text-neutral-400 hover:text-purple-300 transition-colors p-0.5 cursor-pointer"
                title="How does Token Optimizer work?"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
            {!compact && (
              <p className="text-[10px] text-neutral-400">
                Real-time context compression preserving persona, activity & acting
              </p>
            )}
          </div>
        </div>

        {/* Live Percentage Badge */}
        <div className="flex items-center gap-1.5">
          <span
            className={`text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full border transition-all ${currentTier.badgeColor}`}
          >
            {currentTier.label} ({liveResult && value !== 'off' ? `-${liveResult.estimatedTokensSavedPct}%` : currentTier.reductionPercentage})
          </span>
        </div>
      </div>

      {/* Stepped Slider Control */}
      <div className="space-y-1.5 pt-1">
        <div className="relative px-1">
          <input
            type="range"
            min="0"
            max="3"
            step="1"
            value={currentTier.numericValue}
            onChange={handleSliderChange}
            className="w-full h-2 bg-[#1b2030] rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all focus:outline-none"
            aria-label="Token Optimizer Level"
          />
        </div>

        {/* 4 Interactive Ticks / Buttons */}
        <div className="grid grid-cols-4 gap-1 text-center">
          {TOKEN_OPTIMIZER_TIERS.map(tier => {
            const isSelected = tier.level === value;
            return (
              <button
                key={tier.level}
                type="button"
                onClick={() => onChange(tier.level)}
                className={`py-1 px-1 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  isSelected
                    ? 'bg-purple-600/25 border border-purple-500/50 text-white font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#181d2a]'
                }`}
              >
                <span>{tier.label}</span>
                <span className={`text-[9px] font-mono ${isSelected ? tier.accentColor : 'text-neutral-500'}`}>
                  {tier.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Summary & Live Token Telemetry Card */}
      <div className="p-2.5 rounded-xl bg-[#0c0e15]/80 border border-[#1c2233] space-y-2 text-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-white text-[11px] sm:text-xs">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>{currentTier.title}</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-neutral-300 leading-tight">
              {currentTier.shortSummary}
            </p>
          </div>
          <span className={`text-[10px] font-mono font-bold shrink-0 ${currentTier.accentColor}`}>
            {liveResult
              ? `${liveResult.rawTokenCount} → ${liveResult.optimizedTokenCount} tok`
              : currentTier.estimatedSavingText}
          </span>
        </div>

        {/* Live Token Bar & Prompt Inspector when inside a chat */}
        {liveResult && (
          <div className="flex items-center justify-between pt-1 border-t border-[#1a1f2e] text-[10px]">
            <span className="text-neutral-400 font-mono">
              {liveResult.savedTokens > 0
                ? `Saving ~${liveResult.savedTokens} tokens per message turn (${liveResult.messages.length} msgs active)`
                : `Uncompressed baseline (${liveResult.rawTokenCount} tokens / turn)`}
            </span>
            <button
              type="button"
              onClick={() => setShowPromptPreview(prev => !prev)}
              className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer shrink-0 ml-2"
            >
              {showPromptPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showPromptPreview ? 'Hide Prompt' : 'Inspect Prompt'}</span>
            </button>
          </div>
        )}

        {showPromptPreview && liveResult && (
          <div className="p-2 rounded-lg bg-[#080a0f] border border-[#1f2536] max-h-44 overflow-y-auto font-mono text-[10px] text-neutral-300 whitespace-pre-wrap leading-relaxed">
            {liveResult.systemPrompt}
          </div>
        )}

        {/* Focus Checklist: Persona, Current Activity, Character Acting */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1 border-t border-[#1a1f2e] text-[10px]">
          <div className="flex items-start gap-1 text-neutral-300">
            <User className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-purple-200">Persona:</span>
              <p className="text-[9.5px] text-neutral-400 leading-tight">{currentTier.focusHighlights.persona}</p>
            </div>
          </div>

          <div className="flex items-start gap-1 text-neutral-300">
            <Activity className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-300">Current Activity:</span>
              <p className="text-[9.5px] text-neutral-400 leading-tight">{currentTier.focusHighlights.currentActivity}</p>
            </div>
          </div>

          <div className="flex items-start gap-1 text-neutral-300">
            <ShieldCheck className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cyan-300">Character Acting:</span>
              <p className="text-[9.5px] text-neutral-400 leading-tight">{currentTier.focusHighlights.characterActing}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Tooltip / Breakdown Modal/Popover */}
      {showTooltip && (
        <div className="p-3 bg-[#0a0c12] border border-purple-500/40 rounded-xl space-y-2 text-[11px] animate-fade-in shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1f2536] pb-1.5">
            <span className="font-bold text-purple-300 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-purple-400" />
              <span>How Token Optimizer Actually Works</span>
            </span>
            <button
              type="button"
              onClick={() => setShowTooltip(false)}
              className="text-neutral-400 hover:text-white text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <p className="text-neutral-300 leading-relaxed text-[10.5px]">
            Before sending your message to Gemini, OpenAI, OpenRouter, or Claude, the optimizer intercepts the raw payload and runs <strong className="text-white">4 real-time pipeline passes</strong>:
          </p>

          <div className="space-y-1.5 pt-1 text-[10px]">
            <div className="p-1.5 rounded-lg bg-[#121622] border border-[#1e2436]">
              <span className="font-bold text-emerald-400">1. Syntax & Duplicate Stripping (Easy ~20%):</span> Deduplicates overlapping paragraphs between Personality and Backstory (very common in Janitor/Chub cards), strips decorative ASCII dividers (════), and cleans W++ syntax bloat.
            </div>
            <div className="p-1.5 rounded-lg bg-[#121622] border border-[#1e2436]">
              <span className="font-bold text-cyan-400">2. Behavioral Sentence Scoring (Medium ~45%):</span> Scores every sentence in the character sheet by acting/voice keywords (speech, tone, mannerisms, dynamic with user) and keeps the highest-scoring behavioral traits while pruning static world-building essays.
            </div>
            <div className="p-1.5 rounded-lg bg-[#121622] border border-[#1e2436]">
              <span className="font-bold text-purple-400">3. Rolling Turn Compaction (Aggressive ~70%):</span> Keeps the latest turns 100% verbatim while compacting older 500-token greetings/narration to spoken dialogue + final action so you don't re-pay for massive opening messages on every turn.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
