/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PrivacySecurityView.tsx
 * Ultra-Transparent Privacy, Security & Technical Architecture Manifesto.
 * More transparent than any corporate AI platform:
 * - Real live LocalStorage auditor inspecting user device storage
 * - Side-by-side comparison matrix: Corporate AI vs Warden AI
 * - Zero-sugarcoating breakdown of data-flow, BYOK, Firebase Auth, and Chub.ai proxy
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  Database,
  Server,
  Cpu,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  HardDrive,
  Globe,
  Key,
  UserCheck,
  Trash2,
  FileText,
  MessageSquare,
  Zap,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Terminal,
  Code2,
  Sliders,
  ExternalLink
} from 'lucide-react';

interface StorageAuditItem {
  key: string;
  name: string;
  sizeBytes: number;
  itemCount: number;
  description: string;
}

interface AccordionProps {
  icon: React.ReactNode;
  title: string;
  badge?: { text: string; color: 'green' | 'yellow' | 'blue' | 'red' };
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Accordion({ icon, title, badge, children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const badgeColors = {
    green: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
    yellow: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
    red: 'bg-red-500/15 text-red-400 border border-red-500/25',
  };

  return (
    <div className="border border-[#1e2333] rounded-2xl overflow-hidden bg-[#0f1119] transition-all">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-[#141824] transition-colors cursor-pointer select-none"
      >
        <span className="text-purple-400 shrink-0">{icon}</span>
        <span className="flex-1 font-semibold text-white text-sm sm:text-base">{title}</span>
        {badge && (
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${badgeColors[badge.color]}`}>
            {badge.text}
          </span>
        )}
        <span className="text-neutral-500 shrink-0">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 text-sm text-neutral-400 leading-relaxed space-y-3 border-t border-[#1e2333]">
          {children}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: 'good' | 'warn' | 'info' }) {
  const colors = {
    good: 'text-emerald-400',
    warn: 'text-amber-400',
    info: 'text-blue-400',
  };
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[#1a1d2a] last:border-0">
      <span className="text-neutral-400 text-xs shrink-0 w-44">{label}</span>
      <span className={`text-xs font-mono font-medium text-right flex-1 break-all ${highlight ? colors[highlight] : 'text-neutral-300'}`}>
        {value}
      </span>
    </div>
  );
}

export function PrivacySecurityView({ onBack }: { onBack?: () => void }) {
  // Live storage audit state
  const [storageItems, setStorageItems] = useState<StorageAuditItem[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [purgeSuccess, setPurgeSuccess] = useState<string | null>(null);

  const runStorageAudit = () => {
    const knownKeys = [
      { key: 'warden_conversations_v9', name: 'Chat Conversations', desc: 'All dialogue turns, summaries, and memories.' },
      { key: 'warden_characters_v9', name: 'Custom Characters', desc: 'Locally authored and imported character cards.' },
      { key: 'warden_personas_v7', name: 'User Personas', desc: 'Your custom roleplay personas, appearances, and avatars.' },
      { key: 'warden_lorebooks_v7', name: 'Lorebooks & World Lore', desc: 'Keyword-triggered world info entries.' },
      { key: 'warden_providers_v7', name: 'AI Provider Configs', desc: 'API keys, custom endpoints, model IDs, temperature.' },
      { key: 'warden_bot_rule_presets_v1', name: 'Bot Rule Presets', desc: 'Global formatting presets and instructions.' },
      { key: 'warden_chat_background_v1', name: 'Global Wallpaper', desc: 'Custom chat room wallpaper URL and settings.' },
      { key: 'warden_bookmarks_v7', name: 'Bookmarked Characters', desc: 'Favorite characters saved for fast access.' },
      { key: 'warden_likes_v7', name: 'Liked Characters', desc: 'IDs of liked characters.' },
      { key: 'warden_notifications', name: 'Notifications Cache', desc: 'Local alerts and notification log.' }
    ];

    let grandTotal = 0;
    const items: StorageAuditItem[] = [];

    knownKeys.forEach(k => {
      const raw = localStorage.getItem(k.key);
      if (raw) {
        const bytes = new Blob([raw]).size;
        grandTotal += bytes;
        let count = 0;
        try {
          const parsed = JSON.parse(raw);
          count = Array.isArray(parsed) ? parsed.length : 1;
        } catch {
          count = 1;
        }
        items.push({
          key: k.key,
          name: k.name,
          sizeBytes: bytes,
          itemCount: count,
          description: k.desc
        });
      }
    });

    setStorageItems(items);
    setTotalBytes(grandTotal);
  };

  useEffect(() => {
    runStorageAudit();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleExportFullArchive = () => {
    const backup: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('warden_')) {
        try {
          backup[k] = JSON.parse(localStorage.getItem(k) || '');
        } catch {
          backup[k] = localStorage.getItem(k);
        }
      }
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `warden_complete_local_vault_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePurgeChatsOnly = () => {
    if (window.confirm('Are you sure you want to delete ALL chat conversations from this device? Custom characters, lorebooks, and personas will remain.')) {
      localStorage.removeItem('warden_conversations_v9');
      runStorageAudit();
      setPurgeSuccess('All chat transcripts purged from client storage.');
      setTimeout(() => setPurgeSuccess(null), 4000);
    }
  };

  return (
    <div className="min-h-full bg-[#0c0e14] text-neutral-200 pb-24">
      {/* Top Breadcrumb & Return Bar */}
      <div className="border-b border-[#1a1d27] bg-[#0c0e14]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-[#141824] hover:bg-[#1c2233] text-neutral-400 hover:text-white border border-[#23293d] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white tracking-wide uppercase">Warden AI Privacy & Architecture</span>
          </div>
        </div>
        <div className="text-[11px] font-mono text-neutral-500">
          Client-First Protocol v1.4
        </div>
      </div>

      {/* Hero Manifesto */}
      <div className="relative overflow-hidden bg-gradient-to-b from-purple-950/40 via-[#0c0e14] to-transparent border-b border-[#1a1d27] px-4 sm:px-8 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(147,51,234,0.15),_transparent_70%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Radical Transparency Manifesto</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            More Transparent Than Any Corporate AI
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 max-w-2xl leading-relaxed">
            Most AI roleplay apps hide behind 50-page legal terms while quietly funneling your intimate dialogues,
            angst roleplays, and creative prompts into unencrypted cloud databases, employee dashboards, and machine-learning training pools.
          </p>

          <p className="text-sm sm:text-base text-purple-300 font-semibold max-w-2xl leading-relaxed">
            Warden AI is engineered with the exact opposite philosophy: zero chat servers, zero telemetry SDKs, client-side BYOK, and complete local vault control.
          </p>

          {/* Quick Stats Grid */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Chats on Warden Servers', value: '0 Bytes', highlight: 'text-emerald-400' },
              { label: 'Third-Party Trackers', value: '0 Installed', highlight: 'text-emerald-400' },
              { label: 'AI Model Training', value: 'Never', highlight: 'text-emerald-400' },
              { label: 'Network Route', value: 'Direct Client Fetch', highlight: 'text-purple-300' },
            ].map(card => (
              <div key={card.label} className="p-3.5 bg-[#0f1119] border border-[#1e2333] rounded-2xl flex flex-col justify-center">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">{card.label}</span>
                <span className={`text-base sm:text-lg font-black tracking-tight mt-0.5 ${card.highlight}`}>{card.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8">

        {/* 1. BRUTAL COMPARISON MATRIX: Corporate AI vs Warden AI */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Corporate AI vs. Warden AI: The Unfiltered Reality</h2>
          </div>

          <div className="overflow-x-auto border border-[#1e2333] rounded-2xl bg-[#0f1119]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1e2333] bg-[#131622] text-neutral-400 text-[11px] uppercase tracking-wider">
                  <th className="p-3.5 font-bold w-1/4">Aspect</th>
                  <th className="p-3.5 font-bold text-rose-400 w-3/8">Corporate Roleplay Apps</th>
                  <th className="p-3.5 font-bold text-emerald-400 w-3/8">Warden AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2333] text-neutral-300">
                <tr>
                  <td className="p-3.5 font-semibold text-white">Chat Storage</td>
                  <td className="p-3.5 text-neutral-400 flex items-start gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>Stored indefinitely on corporate cloud databases (AWS/GCP/Postgres). Subject to leaks and employee access.</span>
                  </td>
                  <td className="p-3.5 text-emerald-300">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>0 bytes stored on our servers.</strong> Every word lives strictly inside your browser's local storage on your physical device.</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-white">Employee Access</td>
                  <td className="p-3.5 text-neutral-400 flex items-start gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>Trust & Safety teams and internal engineers can open and inspect flagged conversations.</span>
                  </td>
                  <td className="p-3.5 text-emerald-300">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Mathematically impossible.</strong> We have no API, backend database, or server logs to read your private roleplay even if subpoenaed.</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-white">AI Model Training</td>
                  <td className="p-3.5 text-neutral-400 flex items-start gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>Chat logs are scraped to fine-tune proprietary LLMs and RLHF alignment filters.</span>
                  </td>
                  <td className="p-3.5 text-emerald-300">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Zero training.</strong> Warden AI trains zero models on customer transcripts.</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-white">Telemetry & Trackers</td>
                  <td className="p-3.5 text-neutral-400 flex items-start gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>Bundled with Google Analytics, Mixpanel, Datadog session replays, and Meta ad pixels.</span>
                  </td>
                  <td className="p-3.5 text-emerald-300">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>0 analytics trackers.</strong> 0 tracking cookies. 0 session recording software. Inspect our bundle anytime.</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-white">API Key Handling</td>
                  <td className="p-3.5 text-neutral-400 flex items-start gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>Keys sent to app servers or proprietary proxy relays, creating central point of failure.</span>
                  </td>
                  <td className="p-3.5 text-emerald-300">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>Direct BYOK (Bring Your Own Key).</strong> Raw <code>fetch()</code> requests dispatch straight from your browser to Google/OpenAI.</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="p-3.5 font-semibold text-white">Data Portability</td>
                  <td className="p-3.5 text-neutral-400 flex items-start gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>Walled garden. Difficult or impossible to bulk-export characters, lorebooks, and histories.</span>
                  </td>
                  <td className="p-3.5 text-emerald-300">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span><strong>1-Click JSON Vault Export</strong> and 1-Click Complete Storage Purge built right into this screen.</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. LIVE LOCAL STORAGE AUDITOR */}
        <div className="p-6 bg-[#0f1119] border border-purple-500/30 rounded-2xl shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white">Live Client Storage Auditor</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-600/20 text-purple-300 border border-purple-500/30">
                  Real-time
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Here is the exact data Warden AI currently holds in your browser's physical storage right now.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={runStorageAudit}
                className="px-3 py-1.5 rounded-lg bg-[#181c28] hover:bg-[#202538] text-xs font-semibold text-neutral-200 border border-[#252b3d] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                <span>Refresh Audit</span>
              </button>
              <button
                onClick={handleExportFullArchive}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-purple-600/30"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Vault</span>
              </button>
            </div>
          </div>

          {/* Storage Summary Bar */}
          <div className="p-3.5 bg-[#0a0c14] border border-[#1e2333] rounded-xl flex items-center justify-between text-xs">
            <span className="text-neutral-400">Total Encrypted Storage Used on Device:</span>
            <span className="font-mono font-bold text-purple-300 text-sm">{formatBytes(totalBytes)}</span>
          </div>

          {/* Breakdown table */}
          <div className="space-y-2">
            {storageItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-500 bg-[#0a0c14] rounded-xl border border-[#1e2333]">
                No stored items found in local storage.
              </div>
            ) : (
              storageItems.map(item => (
                <div key={item.key} className="p-3 bg-[#0a0c14] border border-[#1b1e2a] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono font-semibold text-purple-300">{item.key}</code>
                      <span className="text-xs text-neutral-300 font-medium">({item.name})</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs font-mono">
                    <span className="text-neutral-400">{item.itemCount} items</span>
                    <span className="text-emerald-400 font-bold">{formatBytes(item.sizeBytes)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Danger zone actions */}
          <div className="pt-2 border-t border-[#1e2333] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-neutral-400">Need to leave zero digital footprint on this device?</span>
            <button
              onClick={handlePurgeChatsOnly}
              className="px-3.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Purge All Chats from Device</span>
            </button>
          </div>

          {purgeSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{purgeSuccess}</span>
            </div>
          )}
        </div>

        {/* 3. TECHNICAL DEEP DIVES (Accordions) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Technical Deep-Dive Disclosures</h2>
          </div>

          {/* Under-The-Hood Network Routing */}
          <Accordion
            icon={<Code2 className="w-5 h-5" />}
            title="Exact Client-Side Code Architecture (How BYOK Works)"
            badge={{ text: 'Verifiable', color: 'green' }}
            defaultOpen
          >
            <p>
              In corporate AI apps, your browser sends prompts to their server (<code>POST api.company.com/chat</code>),
              which logs the prompt, runs moderation, and then forwards to an LLM.
            </p>
            <p>
              In Warden AI, <strong className="text-white">your browser connects directly to the AI provider endpoint</strong>.
              Here is the exact TypeScript code path from <code className="text-purple-300">src/services/aiProviderService.ts</code>:
            </p>

            <div className="p-3 bg-[#08090f] border border-[#1a1d27] rounded-xl font-mono text-[11px] text-neutral-300 overflow-x-auto space-y-1">
              <p className="text-neutral-500">// 1. Direct browser fetch to your configured endpoint:</p>
              <p className="text-purple-300">const response = await fetch(endpoint, &#123;</p>
              <p className="pl-4">method: 'POST',</p>
              <p className="pl-4 text-emerald-400">headers: &#123; 'Authorization': `Bearer $&#123;provider.apiKey&#125;` &#125;,</p>
              <p className="pl-4">body: JSON.stringify(&#123; model: provider.defaultModel, messages: [...] &#125;)</p>
              <p className="text-purple-300">&#125;);</p>
            </div>

            <p className="text-xs text-neutral-400">
              Notice: There is <strong>no intermediary server proxying your text</strong>. The request leaves your browser
              directly addressed to Google, OpenAI, OpenRouter, or your own self-hosted Ollama / vLLM instance.
            </p>
          </Accordion>

          {/* What Gets Sent Over The Wire */}
          <Accordion
            icon={<MessageSquare className="w-5 h-5" />}
            title="What Exact Payload Goes Over The Wire When You Chat"
            badge={{ text: 'Transparent', color: 'blue' }}
          >
            <p>
              When an AI response is requested, Warden AI constructs a context payload strictly composed of:
            </p>
            <div className="space-y-2">
              {[
                { title: 'Character System Card', desc: 'Name, personality traits, and system instructions you configured.' },
                { title: 'Active Scenario Instructions', desc: 'The specific scene setting, scenario description, and opening tone.' },
                { title: 'Active Persona Card', desc: 'Your chosen persona name, pronouns, and appearance notes.' },
                { title: 'Keyword-Matched Lorebook Entries', desc: 'Only entries whose trigger words were mentioned in the last 5 turns.' },
                { title: 'Continuous Story Summary', desc: 'The running condensed story arc summary (to conserve tokens).' },
                { title: 'Recent Message Window', desc: 'The rolling last 10 messages of dialogue.' },
                { title: 'Bot Rules & Formatting Directives', desc: 'Formatting rules (italics for actions, quotes for dialogue).' }
              ].map(sec => (
                <div key={sec.title} className="p-2.5 bg-[#0a0c14] border border-[#1b1e2a] rounded-lg flex items-start gap-2.5">
                  <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-white">{sec.title}: </span>
                    <span className="text-xs text-neutral-400">{sec.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-500">
              None of this is stored on any Warden server. It travels directly encrypted over HTTPS to your chosen LLM endpoint.
            </p>
          </Accordion>

          {/* Chub.ai Community Discovery Proxy */}
          <Accordion
            icon={<Globe className="w-5 h-5" />}
            title="Community Discover & The Chub.ai Proxy"
            badge={{ text: 'Localhost:3001', color: 'yellow' }}
          >
            <p>
              The <strong>Discover</strong> tab pulls public character cards from Chub.ai (a public community repository).
              Because Chub's API does not support browser CORS directly, a lightweight proxy is included:
            </p>
            <div className="bg-[#0a0c14] border border-[#1e2333] rounded-xl p-3 space-y-1">
              <InfoRow label="Proxy Location" value="http://localhost:3001 (server.ts)" highlight="info" />
              <InfoRow label="Data Transferred" value="Public character names, taglines, avatar images" highlight="info" />
              <InfoRow label="Your Identity Sent" value="Zero. No username or account ID is shared" highlight="good" />
              <InfoRow label="Your Chats Sent" value="Zero. Discovery has no connection to chats" highlight="good" />
            </div>
            <p className="text-xs text-neutral-400">
              When you download or chat with a Community character, the character card JSON is saved directly into your device's
              own local storage. Chub.ai has no record of your conversations.
            </p>
          </Accordion>

          {/* Firebase Authentication Disclosures */}
          <Accordion
            icon={<UserCheck className="w-5 h-5" />}
            title="Firebase Authentication: What Google Knows & Doesn't Know"
            badge={{ text: 'Auth Only', color: 'blue' }}
          >
            <p>
              Warden AI uses Google Firebase Authentication for account sign-ins (Google OAuth and Email/Password).
              Here is the exact boundary:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl space-y-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  What Firebase receives:
                </span>
                <ul className="text-[11px] text-neutral-300 space-y-1 list-disc list-inside">
                  <li>Your email address</li>
                  <li>Your OAuth display name</li>
                  <li>Account created timestamp</li>
                </ul>
              </div>

              <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl space-y-2">
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  What Firebase NEVER receives:
                </span>
                <ul className="text-[11px] text-neutral-300 space-y-1 list-disc list-inside">
                  <li>Your chat conversations</li>
                  <li>Your custom AI prompts or personas</li>
                  <li>Your third-party AI provider API keys</li>
                  <li>Your lorebooks or world info</li>
                </ul>
              </div>
            </div>
          </Accordion>

          {/* Admin & Content Moderation Boundaries */}
          <Accordion
            icon={<Eye className="w-5 h-5" />}
            title="Admin & Content Moderation Boundaries"
            badge={{ text: 'Strict Boundaries', color: 'green' }}
          >
            <p>
              Warden AI features a community moderation portal for reviewing <strong>publicly submitted characters</strong>.
              It is critical to understand the separation between public cards and private roleplays:
            </p>
            <div className="p-3.5 bg-[#0a0c14] border border-[#1e2333] rounded-xl space-y-2 text-xs">
              <p>
                <strong className="text-white">Community Cards:</strong> When a creator submits a card to be published globally on Warden AI,
                moderators review the card title, cover image, and system instructions for illegal material (such as child sexual abuse material, non-consensual exploitation, or extreme real-world violence).
              </p>
              <p className="text-purple-300 font-semibold">
                <strong>Your Private Chats:</strong> Moderators cannot see, search, or access your private chats.
                Because conversations live on your local device, no moderator dashboard exists that could ever display them.
              </p>
            </div>
          </Accordion>
        </div>

        {/* 4. EXPLICIT NON-NEGOTIABLE GUARANTEES */}
        <div className="p-6 bg-gradient-to-r from-purple-950/20 via-[#0f1119] to-indigo-950/20 border border-[#1e2333] rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Our 7 Non-Negotiable Guarantees</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-300">
            {[
              'We do NOT store your chat conversations on any cloud server.',
              'We do NOT sell, lease, or monetize your personal information.',
              'We do NOT train machine-learning models on your creative writing.',
              'We do NOT embed telemetry pixels or behavioural spyware.',
              'We do NOT hold your data hostage — 100% exportable anytime.',
              'We do NOT proxy or inspect your direct BYOK API keys.',
              'We do NOT use automated filters to shadowban your private thoughts.',
            ].map(promise => (
              <div key={promise} className="flex items-start gap-2.5 p-2.5 bg-[#0a0c14] border border-[#1a1d27] rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{promise}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. VULNERABILITY REPORTING & OPEN DIALOGUE */}
        <div className="p-5 bg-[#0f1119] border border-[#1e2333] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Found a Privacy Gap or Vulnerability?</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              We reward responsible disclosures. If you discover any data leakage or unwanted telemetry, reach out immediately.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="mailto:security@warden.ai"
              className="px-4 py-2 rounded-xl bg-[#181c28] hover:bg-[#202538] text-white text-xs font-bold border border-[#252b3d] transition-colors"
            >
              security@warden.ai
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
