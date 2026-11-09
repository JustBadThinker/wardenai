/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChevronLeft,
  User as UserIcon,
  Palette,
  MessageSquare,
  Cpu,
  Brain,
  Shield,
  Bell,
  Upload,
  RotateCcw,
  Sliders,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  ExternalLink,
  Zap,
  Activity,
  Save,
  Coins,
  Calculator,
  Lock,
  Unlock,
  Download,
  Sparkles,
  Key
} from 'lucide-react';
import { User, ProviderConfig, GlobalChatBackground, TokenOptimizerLevel, TokenPriceConfig } from '../types';
import { storageService } from '../services/storageService';
import { aiProviderService } from '../services/aiProviderService';
import { TokenOptimizerSlider } from '../components/common/TokenOptimizerSlider';
import { tokenPriceService, TOKEN_PRICE_PRESETS } from '../services/tokenPriceService';
import { WardenVaultModal } from '../components/modals/WardenVaultModal';

interface SettingsViewProps {
  currentUser: User;
  onUpdateUser: (updates: Partial<User>) => void;
  onBack?: () => void;
  onNavigate?: (view: string) => void;
  providers: ProviderConfig[];
  onSaveProvider: (provider: ProviderConfig) => void;
  globalBackground: GlobalChatBackground;
  onUpdateGlobalBackground: (bg: GlobalChatBackground) => void;
}

type SettingsSection =
  | 'appearance'
  | 'chat-prefs'
  | 'providers'
  | 'memory'
  | 'privacy'
  | 'notifications';

type AppearanceTab = 'theme' | 'background' | 'ui';

const APP_THEMES = [
  {
    id: 'default',
    name: 'Warden Cyberpunk',
    description: 'Deep slate base with vibrant violet roleplay accents',
    colors: ['#0c0e14', '#12151e', '#9333ea']
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin Mocha',
    description: 'Soothing pastel mocha dark theme with lavender & mauve warmth',
    colors: ['#1e1e2e', '#181825', '#cba6f7']
  },
  {
    id: 'dracula',
    name: 'Dracula',
    description: 'Iconic vampire dark palette with punchy purple & pink contrast',
    colors: ['#282a36', '#1e1f29', '#bd93f9']
  },
  {
    id: 'amoled',
    name: 'AMOLED Pitch Black',
    description: 'True #000000 battery-saving OLED black for mobile screens',
    colors: ['#000000', '#070709', '#a855f7']
  },
  {
    id: 'amber',
    name: 'Amber Glow',
    description: 'Warm candlelight terminal aesthetic for late-night reading',
    colors: ['#14100c', '#1f1812', '#f59e0b']
  },
  {
    id: 'light',
    name: 'Daylight Mode',
    description: 'Clean high-contrast light appearance for bright environments',
    colors: ['#f8fafc', '#ffffff', '#7c3aed']
  }
];

const PRESET_BACKGROUNDS = [
  {
    name: 'Cyberpunk Rain',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1920&q=80'
  },
  {
    name: 'Neon Cathedral',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80'
  },
  {
    name: 'Midnight Metropolis',
    url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1920&q=80'
  },
  {
    name: 'Deep Forest Twilight',
    url: 'https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=1920&q=80'
  }
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onUpdateUser,
  onBack,
  onNavigate,
  providers,
  onSaveProvider,
  globalBackground,
  onUpdateGlobalBackground
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const [appearanceTab, setAppearanceTab] = useState<AppearanceTab>('theme');
  const [vaultModalState, setVaultModalState] = useState<{ isOpen: boolean; mode: 'export' | 'import' }>({
    isOpen: false,
    mode: 'export'
  });
  const [activeTheme, setActiveTheme] = useState<string>(() => {
    try {
      return localStorage.getItem('warden_app_theme') || 'default';
    } catch {
      return 'default';
    }
  });

  const handleSelectTheme = (themeId: string) => {
    setActiveTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    try {
      localStorage.setItem('warden_app_theme', themeId);
    } catch {}
  };

  // Background states
  const [bgImage, setBgImage] = useState(globalBackground.imageUrl);
  const [bgFit, setBgFit] = useState(globalBackground.fit || 'cover');
  const [bgBlur, setBgBlur] = useState(globalBackground.blur ?? 6);
  const [bgOverlay, setBgOverlay] = useState(globalBackground.darkOverlay ?? 40);

  // Token Pricing state
  const [tokenPriceConfig, setTokenPriceConfig] = useState<TokenPriceConfig>(() =>
    tokenPriceService.getActiveConfig()
  );

  // Sync background changes to parent & storage
  const handleApplyBackground = (updates: Partial<GlobalChatBackground>) => {
    const updated: GlobalChatBackground = {
      imageUrl: updates.imageUrl !== undefined ? updates.imageUrl : bgImage,
      fit: updates.fit !== undefined ? updates.fit : bgFit,
      blur: updates.blur !== undefined ? updates.blur : bgBlur,
      darkOverlay: updates.darkOverlay !== undefined ? updates.darkOverlay : bgOverlay
    };
    onUpdateGlobalBackground(updated);
    storageService.setGlobalChatBackground(updated);
  };

  const handleResetBackground = () => {
    const reset = storageService.resetGlobalChatBackground();
    setBgImage(reset.imageUrl);
    setBgFit(reset.fit);
    setBgBlur(reset.blur);
    setBgOverlay(reset.darkOverlay);
    onUpdateGlobalBackground(reset);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setBgImage(result);
        handleApplyBackground({ imageUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Provider states
  const savedGateway = storageService.getActiveGatewayConfig();
  const baseActiveProvider = providers.find(p => p.isDefault) || providers[0] || {
    id: 'prov_custom',
    userId: currentUser.id,
    providerType: 'custom',
    name: 'Custom AI Gateway / Reverse Proxy',
    apiKey: '',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    temperature: 0.75,
    topP: 0.9,
    maxTokens: 2048,
    contextWindow: 8192,
    streaming: true,
    isDefault: true,
    customPrompt: ''
  };
  const activeProvider: ProviderConfig = savedGateway
    ? { ...baseActiveProvider, ...savedGateway }
    : baseActiveProvider;

  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(activeProvider);
  const [showApiKey, setShowApiKey] = useState(false);
  const [providerSaved, setProviderSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<{ loading: boolean; message: string; ok?: boolean } | null>(null);

  const updateProviderConfig = (updates: Partial<ProviderConfig>) => {
    const updated = { ...providerConfig, ...updates };
    setProviderConfig(updated);
    storageService.setActiveGatewayConfig(updated);
  };

  const handleTestConnection = async () => {
    setTestStatus({ loading: true, message: 'Testing connection to AI Gateway...' });
    try {
      const startTime = Date.now();
      const res = await aiProviderService.testConnection(providerConfig);
      const latency = Date.now() - startTime;
      if (res.success) {
        setTestStatus({
          loading: false,
          ok: true,
          message: `✓ Operational (${res.latencyMs || latency}ms) — Connected to Gateway / Proxy successfully!`
        });
      } else {
        setTestStatus({
          loading: false,
          ok: false,
          message: `✗ Connection failed: ${res.message || 'Server returned an error'}`
        });
      }
    } catch (e: any) {
      setTestStatus({
        loading: false,
        ok: false,
        message: `✗ Connection error: ${e.message || 'Unknown network error'}`
      });
    }
  };

  const handleSaveProviderSettings = () => {
    storageService.setActiveGatewayConfig(providerConfig);
    onSaveProvider(providerConfig);
    setProviderSaved(true);
    setTimeout(() => setProviderSaved(false), 2500);
  };

  const navCategories = [
    { id: 'appearance', label: 'Appearance & Themes', icon: Palette },
    { id: 'providers', label: 'Generation & Providers', icon: Cpu },
    { id: 'chat-prefs', label: 'Chat Preferences', icon: MessageSquare },
    { id: 'memory', label: 'Memory & Context', icon: Brain },
    { id: 'privacy', label: 'Backup & Data', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  return (
    <div className="max-w-6xl mx-auto pb-24 text-neutral-200 select-none">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Column */}
        <div className="md:col-span-4 bg-[#0c0e14] border border-[#1b1e28] rounded-2xl p-3 space-y-1">
          <div className="px-3 py-3 border-b border-[#1b1e28] flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-1 -ml-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <span>Settings</span>
            </h2>
          </div>

          <div className="pt-2 space-y-1">
            {navCategories.map(cat => {
              const Icon = cat.icon;
              const isActive = activeSection === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveSection(cat.id as SettingsSection)}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 border-l-2 border-purple-500 rounded-l-none'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#141722]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-neutral-400'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Main Settings Pane */}
        <div className="md:col-span-8 bg-[#0c0e14] border border-[#1b1e28] rounded-2xl p-5 sm:p-6 space-y-6">
          {/* SECTION: APPEARANCE (LOCKED SPECIFICATION) */}
          {activeSection === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Appearance</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Customize how Warden AI looks and feels.
                </p>
              </div>

              {/* Sub-tabs: Theme, Background, UI */}
              <div className="flex items-center gap-6 border-b border-[#1b1e28] text-xs font-semibold">
                <button
                  onClick={() => setAppearanceTab('theme')}
                  className={`pb-2.5 transition-colors cursor-pointer ${
                    appearanceTab === 'theme'
                      ? 'text-white border-b-2 border-purple-500'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Theme
                </button>
                <button
                  onClick={() => setAppearanceTab('background')}
                  className={`pb-2.5 transition-colors cursor-pointer ${
                    appearanceTab === 'background'
                      ? 'text-white border-b-2 border-purple-500'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Background
                </button>
                <button
                  onClick={() => setAppearanceTab('ui')}
                  className={`pb-2.5 transition-colors cursor-pointer ${
                    appearanceTab === 'ui'
                      ? 'text-white border-b-2 border-purple-500'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  UI
                </button>
              </div>

              {/* Background Configuration (Panel 3 Reference) */}
              {appearanceTab === 'background' && (
                <div className="space-y-6">
                  {/* Preview Card */}
                  <div className="relative aspect-[21/9] sm:aspect-[24/9] w-full rounded-2xl overflow-hidden border border-[#1b1e28] bg-black shadow-lg">
                    {/* Render live image with current blur & darkOverlay */}
                    <div
                      className="absolute inset-0 transition-all duration-300"
                      style={{
                        backgroundImage: `url(${bgImage})`,
                        backgroundPosition: 'center',
                        backgroundSize: bgFit,
                        backgroundRepeat: 'no-repeat',
                        filter: `blur(${bgBlur}px)`
                      }}
                    />
                    <div
                      className="absolute inset-0 bg-black transition-opacity duration-300"
                      style={{ opacity: bgOverlay / 100 }}
                    />

                    {/* Preview Mock Text */}
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center pointer-events-none">
                      <div className="bg-[#12151e]/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-lg">
                        <p className="text-xs font-semibold text-white">Chat Transcript Preview</p>
                        <p className="text-[11px] text-purple-300 italic mt-0.5">
                          *The rain falls gently over the city streets...*
                        </p>
                      </div>
                    </div>

                    {/* Top Right Quick Action Buttons */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                      <label
                        className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white cursor-pointer transition-colors border border-white/10"
                        title="Upload new image"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>

                      <button
                        onClick={handleResetBackground}
                        className="w-8 h-8 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-rose-300 hover:text-rose-200 transition-colors border border-white/10"
                        title="Reset to default background"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Change Background Action Row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 flex items-center gap-2 cursor-pointer transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Change Background</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>

                    <button
                      onClick={() => {
                        const url = window.prompt('Enter image URL:', bgImage);
                        if (url) {
                          setBgImage(url);
                          handleApplyBackground({ imageUrl: url });
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-[#141722] hover:bg-[#1a1f2e] text-neutral-300 border border-[#1b1e28] text-xs font-semibold transition-colors"
                    >
                      Paste Image URL
                    </button>
                  </div>

                  {/* Presets Grid */}
                  <div>
                    <label className="text-xs font-semibold text-neutral-400 block mb-2">
                      Popular Themes & Presets
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PRESET_BACKGROUNDS.map(preset => (
                        <button
                          key={preset.name}
                          onClick={() => {
                            setBgImage(preset.url);
                            handleApplyBackground({ imageUrl: preset.url });
                          }}
                          className={`relative h-16 rounded-xl overflow-hidden border text-left p-2 group transition-all cursor-pointer ${
                            bgImage === preset.url
                              ? 'border-purple-500 ring-2 ring-purple-500/30'
                              : 'border-[#1b1e28] hover:border-neutral-600'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-colors" />
                          <span className="relative z-10 text-[10px] font-bold text-white block">
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Controls: Image Fit, Blur slider, Dark Overlay slider */}
                  <div className="space-y-4 pt-2 border-t border-[#1b1e28]">
                    {/* Image Fit */}
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-semibold text-neutral-200">Image Fit</label>
                        <p className="text-[11px] text-neutral-400">Scale behavior for widescreen and vertical displays</p>
                      </div>
                      <select
                        value={bgFit}
                        onChange={e => {
                          const val = e.target.value as any;
                          setBgFit(val);
                          handleApplyBackground({ fit: val });
                        }}
                        className="bg-[#12151e] border border-[#1b1e28] text-xs text-neutral-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500 cursor-pointer"
                      >
                        <option value="cover">Cover (Fill screen)</option>
                        <option value="contain">Contain (Fit aspect)</option>
                        <option value="fill">Fill (Stretch)</option>
                      </select>
                    </div>

                    {/* Blur Slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-neutral-200">Blur</label>
                        <span className="text-purple-400 font-mono font-semibold">{bgBlur} px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="1"
                        value={bgBlur}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setBgBlur(val);
                          handleApplyBackground({ blur: val });
                        }}
                        className="w-full h-1.5 bg-[#1a1f2e] rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    {/* Dark Overlay Slider */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-neutral-200">Dark Overlay</label>
                        <span className="text-purple-400 font-mono font-semibold">{bgOverlay}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="90"
                        step="5"
                        value={bgOverlay}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setBgOverlay(val);
                          handleApplyBackground({ darkOverlay: val });
                        }}
                        className="w-full h-1.5 bg-[#1a1f2e] rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                    </div>

                    {/* Reset to Default Button */}
                    <div className="pt-2">
                      <button
                        onClick={handleResetBackground}
                        className="w-full py-2.5 rounded-xl bg-[#12151e] hover:bg-[#181c28] border border-[#1b1e28] text-neutral-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Reset to Default</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Theme Sub-tab */}
              {appearanceTab === 'theme' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {APP_THEMES.map(theme => {
                      const isSelected = activeTheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => handleSelectTheme(theme.id)}
                          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'bg-purple-600/15 border-purple-500 ring-1 ring-purple-500/40 shadow-lg'
                              : 'bg-[#12151e] border-[#1b1e28] hover:border-neutral-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                                <span>{theme.name}</span>
                                {isSelected && (
                                  <span className="px-1.5 py-0.5 text-[9px] rounded bg-purple-600 text-white font-bold uppercase">
                                    Active
                                  </span>
                                )}
                              </h4>
                              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                                {theme.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            {theme.colors.map((hex, i) => (
                              <span
                                key={i}
                                className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* UI Sub-tab */}
              {appearanceTab === 'ui' && (
                <div className="p-4 bg-[#12151e] border border-[#1b1e28] rounded-xl space-y-3 text-xs">
                  <h4 className="font-bold text-white">Motion & Animations</h4>
                  <p className="text-neutral-400">
                    Fluid, micro-interactions (100–160ms) and panel transitions (220–300ms) with zero layout jump.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SECTION: GENERATION & PROVIDERS */}
          {activeSection === 'providers' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white">Generation & Providers</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Configure your AI Engine, Reverse Proxy / Gateway, API keys, and model parameters.
                </p>
              </div>

              {/* Architecture Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Provider Architecture</label>
                <select
                  value={providerConfig.providerType}
                  onChange={e =>
                    setProviderConfig({
                      ...providerConfig,
                      providerType: e.target.value as any
                    })
                  }
                  className="w-full bg-[#12151e] border border-[#1b1e28] text-xs text-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500"
                >
                  <option value="custom">Custom AI Gateway / Reverse Proxy (OpenAI format)</option>
                  <option value="gemini">Google Gemini API (Official Direct)</option>
                  <option value="openrouter">OpenRouter API</option>
                  <option value="simulation">Simulated Offline Roleplay Engine</option>
                </select>
              </div>

              {/* Base URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Gateway / Proxy Base URL</label>
                <input
                  type="text"
                  value={providerConfig.baseUrl || ''}
                  onChange={e =>
                    setProviderConfig({ ...providerConfig, baseUrl: e.target.value })
                  }
                  placeholder="https://api.anoman.io/v1"
                  className="w-full bg-[#12151e] border border-[#1b1e28] text-xs text-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              {/* Model Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Model Name</label>
                <input
                  type="text"
                  value={providerConfig.defaultModel || ''}
                  onChange={e =>
                    setProviderConfig({ ...providerConfig, defaultModel: e.target.value })
                  }
                  placeholder="gemma-3-4b-it or gpt-4o-mini"
                  className="w-full bg-[#12151e] border border-[#1b1e28] text-xs text-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              {/* API Key with Show/Hide */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300">API Key</label>
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showApiKey ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={providerConfig.apiKey || ''}
                  onChange={e =>
                    setProviderConfig({ ...providerConfig, apiKey: e.target.value })
                  }
                  placeholder="Enter your API token..."
                  className="w-full bg-[#12151e] border border-[#1b1e28] text-xs text-neutral-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              {/* Test Connection Button */}
              <div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus?.loading}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-600/30"
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>{testStatus?.loading ? 'Testing...' : '⚡ Test Connection'}</span>
                </button>

                {testStatus && (
                  <div
                    className={`mt-3 p-3 rounded-xl border text-xs font-medium ${
                      testStatus.ok
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {testStatus.message}
                  </div>
                )}
              </div>

              {/* Sliders: Temperature & Max Tokens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1b1e28]">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-neutral-300 font-semibold">Temperature</label>
                    <span className="text-purple-400 font-mono">{providerConfig.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={providerConfig.temperature}
                    onChange={e =>
                      setProviderConfig({
                        ...providerConfig,
                        temperature: Number(e.target.value)
                      })
                    }
                    className="w-full h-1.5 bg-[#1a1f2e] rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-neutral-300 font-semibold">Max Tokens</label>
                    <span className="text-purple-400 font-mono">{providerConfig.maxTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="128"
                    max="8192"
                    step="128"
                    value={providerConfig.maxTokens}
                    onChange={e =>
                      setProviderConfig({
                        ...providerConfig,
                        maxTokens: Number(e.target.value)
                      })
                    }
                    className="w-full h-1.5 bg-[#1a1f2e] rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>
              </div>

              {/* Token Optimizer Global Configuration */}
              <TokenOptimizerSlider
                value={providerConfig.tokenOptimizer || storageService.getTokenOptimizerLevel()}
                onChange={newLevel => {
                  storageService.setTokenOptimizerLevel(newLevel);
                  updateProviderConfig({ tokenOptimizer: newLevel });
                }}
              />

              {/* Default Token Pricing & 1M Rates */}
              <div className="p-4 bg-[#12151e] border border-[#1b1e28] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs sm:text-sm">Token Pricing & Cost Rates</h4>
                      <p className="text-[10px] text-neutral-400">
                        Default cost estimation rates per 1,000,000 input & output tokens
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Currency Selector */}
                    <div className="flex items-center bg-[#171b29] p-0.5 rounded-xl border border-[#2b334d]">
                      <button
                        type="button"
                        onClick={() => {
                          const updated: TokenPriceConfig = { ...tokenPriceConfig, currency: 'USD' };
                          setTokenPriceConfig(updated);
                          tokenPriceService.setActiveConfig(updated);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          tokenPriceConfig.currency === 'USD'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        USD ($)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated: TokenPriceConfig = { ...tokenPriceConfig, currency: 'IDR' };
                          setTokenPriceConfig(updated);
                          tokenPriceService.setActiveConfig(updated);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          tokenPriceConfig.currency === 'IDR'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        IDR (Rp)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-300">Preset Model Rate</label>
                  <select
                    value={tokenPriceConfig.presetId}
                    onChange={e => {
                      const found = TOKEN_PRICE_PRESETS.find(p => p.presetId === e.target.value);
                      if (found) {
                        const updated = {
                          ...found,
                          currency: tokenPriceConfig.currency,
                          usdToIdrRate: tokenPriceConfig.usdToIdrRate
                        };
                        setTokenPriceConfig(updated);
                        tokenPriceService.setActiveConfig(updated);
                      }
                    }}
                    className="w-full bg-[#171b28] border border-[#232a3d] text-xs text-neutral-200 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    {TOKEN_PRICE_PRESETS.map(p => {
                      const inStr = tokenPriceConfig.currency === 'IDR'
                        ? (p.pricePer1MInputIdr ? `Rp ${p.pricePer1MInputIdr.toLocaleString('id-ID')}` : tokenPriceService.formatRate(p.pricePer1MInput, 'IDR', p.pricePer1MInputIdr, tokenPriceConfig.usdToIdrRate))
                        : `$${p.pricePer1MInput}`;
                      const outStr = tokenPriceConfig.currency === 'IDR'
                        ? (p.pricePer1MOutputIdr ? `Rp ${p.pricePer1MOutputIdr.toLocaleString('id-ID')}` : tokenPriceService.formatRate(p.pricePer1MOutput, 'IDR', p.pricePer1MOutputIdr, tokenPriceConfig.usdToIdrRate))
                        : `$${p.pricePer1MOutput}`;
                      return (
                        <option key={p.presetId} value={p.presetId}>
                          {p.name} — {inStr} / 1M In · {outStr} / 1M Out ({tokenPriceService.formatTokenCount(p.contextLimit)} ctx)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {tokenPriceConfig.currency === 'IDR' && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#171b29] border border-purple-500/30 text-xs text-neutral-300">
                    <span className="font-semibold text-purple-300">Kurs / Exchange Rate:</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-neutral-400 text-xs">1 USD = Rp</span>
                      <input
                        type="number"
                        min="1000"
                        step="100"
                        value={tokenPriceConfig.usdToIdrRate || 16200}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 16200;
                          const next: TokenPriceConfig = { ...tokenPriceConfig, usdToIdrRate: val };
                          setTokenPriceConfig(next);
                          tokenPriceService.setActiveConfig(next);
                        }}
                        className="w-28 bg-[#0e111a] border border-[#2b334d] px-2.5 py-1 rounded-lg text-xs text-white font-mono text-right focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-neutral-400">
                      {tokenPriceConfig.currency === 'IDR' ? '1M Input Price (Rp)' : '1M Input Price ($)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-neutral-400 font-mono font-bold">
                        {tokenPriceConfig.currency === 'IDR' ? 'Rp' : '$'}
                      </span>
                      <input
                        type="number"
                        step={tokenPriceConfig.currency === 'IDR' ? '100' : '0.001'}
                        min="0"
                        value={
                          tokenPriceConfig.currency === 'IDR'
                            ? (tokenPriceConfig.pricePer1MInputIdr ?? Math.round(tokenPriceConfig.pricePer1MInput * (tokenPriceConfig.usdToIdrRate || 16200)))
                            : tokenPriceConfig.pricePer1MInput
                        }
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          const rate = tokenPriceConfig.usdToIdrRate || 16200;
                          const isIdr = tokenPriceConfig.currency === 'IDR';
                          const inIdr = isIdr ? val : Math.round(val * rate);
                          const inUsd = isIdr ? (rate > 0 ? +(val / rate).toFixed(4) : 0) : val;
                          const next: TokenPriceConfig = {
                            ...tokenPriceConfig,
                            presetId: 'custom',
                            name: isIdr ? 'Custom Rates (Rp / 1M)' : 'Custom Rates ($ / 1M)',
                            pricePer1MInput: inUsd,
                            pricePer1MInputIdr: inIdr
                          };
                          setTokenPriceConfig(next);
                          tokenPriceService.setActiveConfig(next);
                        }}
                        className={`w-full bg-[#171b28] border border-[#232a3d] pr-2 py-1.5 text-xs text-white font-mono rounded-xl focus:outline-none focus:border-purple-500 ${
                          tokenPriceConfig.currency === 'IDR' ? 'pl-8' : 'pl-6'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-neutral-400">
                      {tokenPriceConfig.currency === 'IDR' ? '1M Output Price (Rp)' : '1M Output Price ($)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs text-neutral-400 font-mono font-bold">
                        {tokenPriceConfig.currency === 'IDR' ? 'Rp' : '$'}
                      </span>
                      <input
                        type="number"
                        step={tokenPriceConfig.currency === 'IDR' ? '100' : '0.001'}
                        min="0"
                        value={
                          tokenPriceConfig.currency === 'IDR'
                            ? (tokenPriceConfig.pricePer1MOutputIdr ?? Math.round(tokenPriceConfig.pricePer1MOutput * (tokenPriceConfig.usdToIdrRate || 16200)))
                            : tokenPriceConfig.pricePer1MOutput
                        }
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          const rate = tokenPriceConfig.usdToIdrRate || 16200;
                          const isIdr = tokenPriceConfig.currency === 'IDR';
                          const outIdr = isIdr ? val : Math.round(val * rate);
                          const outUsd = isIdr ? (rate > 0 ? +(val / rate).toFixed(4) : 0) : val;
                          const next: TokenPriceConfig = {
                            ...tokenPriceConfig,
                            presetId: 'custom',
                            name: isIdr ? 'Custom Rates (Rp / 1M)' : 'Custom Rates ($ / 1M)',
                            pricePer1MOutput: outUsd,
                            pricePer1MOutputIdr: outIdr
                          };
                          setTokenPriceConfig(next);
                          tokenPriceService.setActiveConfig(next);
                        }}
                        className={`w-full bg-[#171b28] border border-[#232a3d] pr-2 py-1.5 text-xs text-white font-mono rounded-xl focus:outline-none focus:border-purple-500 ${
                          tokenPriceConfig.currency === 'IDR' ? 'pl-8' : 'pl-6'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-neutral-400">Context Window Limit</label>
                    <input
                      type="number"
                      step="1024"
                      min="1024"
                      value={tokenPriceConfig.contextLimit}
                      onChange={e => {
                        const val = parseInt(e.target.value, 10) || 128000;
                        const next: TokenPriceConfig = {
                          ...tokenPriceConfig,
                          presetId: 'custom',
                          name: 'Custom Rates ($ / 1M)',
                          contextLimit: val
                        };
                        setTokenPriceConfig(next);
                        tokenPriceService.setActiveConfig(next);
                      }}
                      className="w-full bg-[#171b28] border border-[#232a3d] px-2.5 py-1.5 text-xs text-white font-mono rounded-xl focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Prompt Rule */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Global Bot System Rules & Directives
                </label>
                <textarea
                  rows={3}
                  value={providerConfig.customPrompt || ''}
                  onChange={e =>
                    setProviderConfig({
                      ...providerConfig,
                      customPrompt: e.target.value
                    })
                  }
                  placeholder="Set global rules for all bot responses (e.g. Always write in detailed multi-paragraph roleplay prose, maintain emotional realism, etc.)..."
                  className="w-full bg-[#12151e] border border-[#1b1e28] text-xs text-neutral-200 rounded-xl p-3 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Save Button */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSaveProviderSettings}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{providerSaved ? '✓ Saved to Device!' : 'Save Provider Settings'}</span>
                </button>
                <p className="text-[11px] text-neutral-400 text-center">
                  Settings are stored in your local browser storage and loaded automatically.
                </p>
              </div>
            </div>
          )}

          {/* SECTION: CHAT PREFERENCES */}
          {activeSection === 'chat-prefs' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white">Chat Preferences</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Tailor formatting, colors, and the Discord transcript experience.
                </p>
              </div>

              <div className="p-4 bg-[#12151e] border border-[#1b1e28] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Hide Thinking Process</h4>
                    <p className="text-[11px] text-neutral-400">Folds internal chain of thought with a natural writing animation</p>
                  </div>
                  <span className="text-purple-400 font-semibold text-xs">Enabled</span>
                </div>

                <div className="border-t border-[#1b1e28] pt-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Word-by-word Typing Flow</h4>
                    <p className="text-[11px] text-neutral-400">Natural rhythmic reveal of generated replies</p>
                  </div>
                  <span className="text-purple-400 font-semibold text-xs">Enabled</span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: MEMORY & CONTEXT */}
          {activeSection === 'memory' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white">Memory & Checkpoints</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Long-term narrative retention without hallucinations.
                </p>
              </div>

              <div className="p-4 bg-[#12151e] border border-[#1b1e28] rounded-xl space-y-2 text-xs text-neutral-300 leading-relaxed">
                <p>
                  Warden AI uses checkpointed summarization. When generating memory, the system creates a high-fidelity narrative recap from message checkpoint #1 to the current turn.
                </p>
                <p className="text-neutral-400">
                  You can update memory continuously or perform a full refresh at any time inside the chat panel.
                </p>
              </div>
            </div>
          )}

          {/* SECTION: PRIVACY & DATA */}
          {activeSection === 'privacy' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white">Privacy & Data</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Warden AI strictly adheres to zero unauthorized telemetry and local client-first storage.
                </p>
              </div>

              {/* Link to full Privacy & Security page */}
              {onNavigate && (
                <button
                  onClick={() => onNavigate('privacy-security')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/25 rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">Privacy & Security Policy</p>
                      <p className="text-xs text-neutral-500">What we store, what we send, your rights</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-neutral-500 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              )}

              {/* Primary Encrypted .warden Vault Backup & Restore Card */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-[#121624] via-[#101420] to-[#0d1018] border border-purple-500/40 rounded-2xl shadow-xl space-y-3 relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-600/25 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                      <Lock className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <span>Encrypted Warden Vault</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/40 text-[10px] font-mono font-bold">
                          .warden
                        </span>
                      </h4>
                      <p className="text-[11px] text-purple-300/80 mt-0.5">
                        AES-GCM-256 encrypted native backup & safe non-destructive merge
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  Safely export or restore all your <strong>personas</strong> (merged non-destructively without deleting existing ones), <strong>conversations & complete message history</strong>, <strong>custom bot prompt rules</strong>, characters, and lorebooks. Provider API credentials are strictly excluded.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setVaultModalState({ isOpen: true, mode: 'export' })}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/35 transition-all cursor-pointer active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export .warden Vault</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVaultModalState({ isOpen: true, mode: 'import' })}
                    className="px-4 py-2.5 rounded-xl bg-[#161a26] hover:bg-[#1f2538] text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-sm"
                  >
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    <span>Import & Merge .warden</span>
                  </button>
                </div>
              </div>

              {/* Secondary Legacy Unencrypted JSON Backup */}
              <div className="p-4 bg-[#12151e] border border-[#1b1e28] rounded-xl space-y-2.5">
                <h4 className="text-xs font-bold text-neutral-300 flex items-center gap-2">
                  <span>Legacy Raw JSON Backup (Unencrypted)</span>
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Export or import unencrypted raw JSON files for manual inspection or external tool scripting.
                </p>
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    onClick={() => {
                      const data = {
                        characters: storageService.getCharacters(),
                        conversations: storageService.getConversations(currentUser.id),
                        personas: storageService.getPersonas(),
                        lorebooks: storageService.getLorebooks()
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `warden_ai_backup_${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#181c28] hover:bg-[#202536] text-neutral-300 text-xs font-semibold border border-[#222736] transition-colors cursor-pointer"
                  >
                    Export .json
                  </button>

                  <label className="px-3.5 py-1.5 rounded-lg bg-[#181c28] hover:bg-[#202536] text-neutral-300 text-xs font-semibold border border-[#222736] transition-colors cursor-pointer">
                    <span>Import .json</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          try {
                            const parsed = JSON.parse(String(reader.result || '{}'));
                            if (Array.isArray(parsed.characters)) {
                              parsed.characters.forEach((c: any) => storageService.upsertCharacter(c));
                            }
                            if (Array.isArray(parsed.personas)) {
                              parsed.personas.forEach((p: any) => storageService.upsertPersona(p));
                            }
                            if (Array.isArray(parsed.conversations)) {
                              parsed.conversations.forEach((conv: any) => storageService.upsertConversation(conv));
                            }
                            alert('Backup restored! Reloading app...');
                            window.location.reload();
                          } catch {
                            alert('Invalid backup JSON file.');
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white">Notifications</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Manage in-app alert badges and sound cues.</p>
              </div>
              <div className="p-4 bg-[#12151e] border border-[#1b1e28] rounded-xl text-xs text-neutral-400">
                In-app notification badges are active on the primary sidebar.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Warden Encrypted Vault Modal (.warden) */}
      <WardenVaultModal
        isOpen={vaultModalState.isOpen}
        onClose={() => setVaultModalState(s => ({ ...s, isOpen: false }))}
        userId={currentUser.id}
        initialMode={vaultModalState.mode}
      />
    </div>
  );
};
