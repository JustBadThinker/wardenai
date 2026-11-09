/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Key,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  Zap,
  Globe,
  Star,
  ExternalLink
} from 'lucide-react';
import { ProviderConfig, ProviderType, User } from '../types';
import { aiProviderService } from '../services/aiProviderService';
import { CustomSelect } from '../components/common/CustomSelect';

interface ProviderSettingsViewProps {
  providers: ProviderConfig[];
  currentUser: User;
  onSaveProvider: (provider: ProviderConfig) => void;
  onDeleteProvider: (id: string) => void;
  onSetDefaultProvider: (id: string) => void;
}

export const ProviderSettingsView: React.FC<ProviderSettingsViewProps> = ({
  providers,
  currentUser,
  onSaveProvider,
  onDeleteProvider,
  onSetDefaultProvider
}) => {
  const [editingProvider, setEditingProvider] = useState<ProviderConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('openrouter');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [defaultModel, setDefaultModel] = useState('anthropic/claude-3.5-sonnet');
  const [temperature, setTemperature] = useState(0.8);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [streaming, setStreaming] = useState(true);

  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingProvider(null);
    setName('My OpenRouter Profile');
    setProviderType('openrouter');
    setApiKey('');
    setBaseUrl('https://openrouter.ai/api/v1');
    setDefaultModel('anthropic/claude-3.5-sonnet');
    setTemperature(0.8);
    setTopP(0.9);
    setMaxTokens(1024);
    setStreaming(true);
    setTestStatus(null);
  };

  const handleStartEdit = (p: ProviderConfig) => {
    setEditingProvider(p);
    setIsCreating(false);
    setName(p.name);
    setProviderType(p.providerType);
    setApiKey(p.apiKey);
    setBaseUrl(p.baseUrl || '');
    setDefaultModel(p.defaultModel);
    setTemperature(p.temperature);
    setTopP(p.topP);
    setMaxTokens(p.maxTokens);
    setStreaming(p.streaming);
    setTestStatus(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const res = await aiProviderService.testConnection({
        providerType,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        defaultModel: defaultModel.trim()
      });
      if (res.success) {
        setTestStatus(`Success: ${res.message}`);
      } else {
        setTestStatus(`Error: ${res.message}`);
      }
    } catch (e: any) {
      setTestStatus(`Error: ${e.message || 'Connection test failed'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const toSave: ProviderConfig = {
      id: editingProvider?.id || 'prov_' + Date.now().toString(36),
      userId: currentUser.id,
      name: name.trim(),
      providerType,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim() || undefined,
      defaultModel: defaultModel.trim(),
      temperature: Number(temperature),
      topP: Number(topP),
      maxTokens: Number(maxTokens),
      contextWindow: 16384,
      streaming,
      isDefault: editingProvider ? editingProvider.isDefault : false
    };

    onSaveProvider(toSave);
    setIsCreating(false);
    setEditingProvider(null);
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <span>AI Provider Management (BYOK)</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Configure custom API keys for OpenAI, OpenRouter, Anthropic, Gemini, and local endpoints. Zero provider lock-in.
          </p>
        </div>

        <button
          onClick={handleStartCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto shadow-sm shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Add Provider</span>
        </button>
      </div>

      {/* Editor Modal */}
      {(isCreating || editingProvider) && (
        <form onSubmit={handleSave} className="p-5 sm:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h2 className="text-sm font-bold text-white">
              {editingProvider ? `Configure Provider: ${editingProvider.name}` : 'New Provider Profile'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingProvider(null);
              }}
              className="text-neutral-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Profile Name</label>
              <input
                type="text"
                placeholder="e.g. My OpenRouter Key"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Provider Service</label>
              <CustomSelect<ProviderType>
                value={providerType}
                onChange={val => {
                  setProviderType(val);
                  if (val === 'gemini') {
                    setDefaultModel('gemini-2.5-flash');
                  } else if (val === 'openrouter') {
                    setDefaultModel('anthropic/claude-3.5-sonnet');
                    setBaseUrl('https://openrouter.ai/api/v1');
                  } else if (val === 'openai') {
                    setDefaultModel('gpt-4o');
                  } else if (val === 'simulation') {
                    setDefaultModel('warden-roleplay-v1');
                  }
                }}
                options={[
                  { value: 'simulation', label: 'Built-in Roleplay Simulation Engine', description: 'Zero-config local simulation' },
                  { value: 'openrouter', label: 'OpenRouter (Claude, Llama, Mistral)', description: 'Multi-provider AI routing' },
                  { value: 'gemini', label: 'Google Gemini API', description: 'Official Google Gemini Direct API' },
                  { value: 'openai', label: 'OpenAI (GPT-4o, GPT-4o-mini)', description: 'Official direct OpenAI endpoint' },
                  { value: 'anthropic', label: 'Anthropic (Claude Direct)', description: 'Direct Claude models' },
                  { value: 'custom', label: 'Custom OpenAI-Compatible Endpoint', description: 'Self-hosted or reverse proxy' }
                ]}
                className="bg-neutral-950 border-neutral-800"
              />
            </div>
          </div>

          {providerType !== 'simulation' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">API Key</label>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              />
              <p className="text-[10px] text-neutral-500">
                Stored securely in your private browser sandbox. Never exposed in public profile or character data.
              </p>
            </div>
          )}

          {(providerType === 'custom' || providerType === 'openrouter') && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Base URL</label>
              <input
                type="text"
                placeholder="https://..."
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">Model Name</label>
              <input
                type="text"
                value={defaultModel}
                onChange={e => setDefaultModel(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-neutral-950 border border-neutral-800 rounded-lg text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-300">
                Temperature ({temperature})
              </label>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          {/* Test Status Feedback */}
          {testStatus && (
            <div
              className={`p-3 rounded-lg text-xs font-mono flex items-center gap-2 ${
                testStatus.startsWith('Success')
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
              }`}
            >
              {testStatus.startsWith('Success') ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{testStatus}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingProvider(null);
                }}
                className="px-3 py-1.5 bg-neutral-800 text-neutral-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Save Profile
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Provider Profiles Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {providers.map(p => (
          <div
            key={p.id}
            className={`p-5 rounded-2xl border transition-all space-y-3 bg-neutral-900/60 ${
              p.isDefault ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-neutral-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{p.name}</span>
                  {p.isDefault && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                      Active
                    </span>
                  )}
                </h3>
                <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                  Model: {p.defaultModel}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onSetDefaultProvider(p.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    p.isDefault ? 'text-amber-400 bg-amber-400/10' : 'text-neutral-500 hover:text-amber-400'
                  }`}
                  title={p.isDefault ? 'Default' : 'Set as Default'}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                </button>
                <button
                  onClick={() => handleStartEdit(p)}
                  className="p-1.5 text-neutral-400 hover:text-white"
                  title="Configure"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
                {p.providerType !== 'simulation' && (
                  <button
                    onClick={() => onDeleteProvider(p.id)}
                    className="p-1.5 text-neutral-500 hover:text-rose-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800/80 text-[11px] text-neutral-400 font-mono flex items-center justify-between">
              <span>Temp: {p.temperature}</span>
              <span>Tokens: {p.maxTokens}</span>
              <span className="capitalize">{p.providerType}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
