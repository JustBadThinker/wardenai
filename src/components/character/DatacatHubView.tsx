/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Warden AI — SillyTavern Datacat Bridge & Native Hub View
 * Ported from official datacat-sillytavern-browser extension:
 * https://github.com/datacat-run/datacat-sillytavern-browser
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  X,
  Maximize2,
  Minimize2,
  ZoomOut,
  ZoomIn,
  Download
} from 'lucide-react';
import { CharacterImportService, ImportedCardData } from '../../services/characterImportService';
import { CommunityCharacter, communityCatalogService } from '../../services/communityCatalogService';

interface DatacatHubViewProps {
  onImportCard: (card: ImportedCardData) => void;
  bridgeConnected: boolean;
  onBridgeStateChange: (connected: boolean) => void;
  reloadTrigger?: number;
}

// ─── SillyTavern Datacat Protocol Constants ──────────────────────────────────
const DATACAT_BROWSER_URL = 'https://datacat.run/characters/recent';
const DATACAT_BRIDGE_PARENT_SOURCE = 'sillytavern-datacat-browser';
const DATACAT_BROWSER_CLIENT = 'datacat-browser';
const DATACAT_BROWSER_VERSION = '0.1.9';
const DATACAT_BROWSER_AUTH_MODE = 'client-link';
const DATACAT_BRIDGE_HEARTBEAT_MS = 5000;

const DATACAT_BRIDGE_MSG_READY = 'datacat:st-bridge:ready';
const DATACAT_BRIDGE_MSG_INIT = 'datacat:st-bridge:init';
const DATACAT_BRIDGE_MSG_PREPARE = 'datacat:st-character-card:prepare';
const DATACAT_BRIDGE_MSG_CARD = 'datacat:st-character-card';
const DATACAT_BRIDGE_MSG_ACK = 'datacat:st-character-card:ack';

export const DatacatHubView: React.FC<DatacatHubViewProps> = ({
  onImportCard,
  bridgeConnected,
  onBridgeStateChange,
  reloadTrigger = 0
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [nonce, setNonce] = useState<string>('');
  const [lastImportedName, setLastImportedName] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [compactScale, setCompactScale] = useState<boolean>(() => window.innerWidth < 768);
  const [isPillExpanded, setIsPillExpanded] = useState<boolean>(false);
  const [quickImportOpen, setQuickImportOpen] = useState<boolean>(false);
  const [quickQuery, setQuickQuery] = useState<string>('');
  const [lastPreviewedCharId, setLastPreviewedCharId] = useState<string | null>(null);
  const [visibleFeedChars, setVisibleFeedChars] = useState<CommunityCharacter[]>([]);
  const [selectedAutoChar, setSelectedAutoChar] = useState<CommunityCharacter | null>(null);

  // Load the live Datacat feed characters so user can browse or tap to select
  useEffect(() => {
    let active = true;
    communityCatalogService
      .getCharacters({ sort: 'latest', limit: 24 })
      .then(res => {
        if (active && res.characters.length > 0) {
          setVisibleFeedChars(res.characters);
          if (lastPreviewedCharId) {
            const match = res.characters.find(c => String(c.id) === lastPreviewedCharId);
            if (match) {
              setSelectedAutoChar(match);
              setQuickQuery(`https://datacat.run/characters/${match.id}`);
            }
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [reloadTrigger, lastPreviewedCharId]);

  const bridgeRef = useRef<{
    nonce: string;
    origin: string;
    ready: boolean;
  }>({
    nonce: '',
    origin: 'https://datacat.run',
    ready: false,
  });

  // 1. Generate 32-character hex bridge nonce
  useEffect(() => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const generatedNonce = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    setNonce(generatedNonce);
    bridgeRef.current.nonce = generatedNonce;
  }, []);

  // 2. SillyTavern Proactive Heartbeat Sender
  const sendBridgeInit = (targetOrigin = bridgeRef.current.origin) => {
    const iframeWindow = iframeRef.current?.contentWindow;
    const currentNonce = bridgeRef.current.nonce;
    if (!iframeWindow || !currentNonce || !targetOrigin) return;

    try {
      iframeWindow.postMessage(
        {
          type: DATACAT_BRIDGE_MSG_INIT,
          nonce: currentNonce,
          source: DATACAT_BRIDGE_PARENT_SOURCE,
          version: DATACAT_BROWSER_VERSION,
        },
        targetOrigin
      );
    } catch {
      // Cross-origin restriction before frame ready is expected
    }
  };

  // 3. Heartbeat timer (5 seconds, matching SillyTavern)
  useEffect(() => {
    if (!nonce) return;

    const initialTimer = setTimeout(() => sendBridgeInit(), 600);
    const pulseInterval = setInterval(() => sendBridgeInit(), DATACAT_BRIDGE_HEARTBEAT_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(pulseInterval);
    };
  }, [nonce, reloadTrigger]);

  // 4. SillyTavern Protocol Event Listener
  useEffect(() => {
    if (!nonce) return;

    const handleMessage = async (event: MessageEvent) => {
      const origin = event.origin || '';
      if (!origin.includes('datacat.run')) return;

      bridgeRef.current.origin = event.origin;
      const data = event.data;
      if (!data || typeof data !== 'object') return;

      // Auto-capture any character ID or URL sent from Datacat iframe postMessage
      const anyCharId =
        data.metadata?.characterId ||
        data.characterId ||
        data.id ||
        (typeof data.url === 'string' && data.url.match(/characters\/(\d+)/)?.[1]);
      if (anyCharId) {
        const idStr = String(anyCharId);
        setLastPreviewedCharId(idStr);
        setQuickQuery(`https://datacat.run/characters/${idStr}`);
      }

      // Case A: Datacat reports it is ready
      if (data.type === DATACAT_BRIDGE_MSG_READY) {
        bridgeRef.current.ready = true;
        onBridgeStateChange(true);
        sendBridgeInit(event.origin);
        return;
      }

      // Case B: Preflight prepare step
      if (data.type === DATACAT_BRIDGE_MSG_PREPARE) {
        const requestId = data.requestId;
        const characterId = data.metadata?.characterId;
        if (characterId) setLastPreviewedCharId(String(characterId));

        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            {
              type: DATACAT_BRIDGE_MSG_ACK,
              nonce: bridgeRef.current.nonce,
              requestId,
              status: 'need-card',
              message: 'Warden AI (SillyTavern Protocol) is ready for PNG payload.',
              datacatCharacterId: characterId,
              phase: 'Card payload needed',
              step: 'preflight',
              stepLabel: 'Check local copy',
            },
            event.origin
          );
        }
        return;
      }

      // Case C: Datacat sends character card payload with PNG data
      if (data.type === DATACAT_BRIDGE_MSG_CARD) {
        const requestId = data.requestId;
        setImportStatus('importing');

        try {
          let pngBytes: Uint8Array | null = null;

          if (data.png instanceof Uint8Array) {
            pngBytes = data.png;
          } else if (data.png instanceof ArrayBuffer) {
            pngBytes = new Uint8Array(data.png);
          } else if (Array.isArray(data.png)) {
            pngBytes = new Uint8Array(data.png);
          } else if (typeof data.png === 'string') {
            const cleanBase64 = data.png.replace(/^data:image\/png;base64,/, '');
            const binString = atob(cleanBase64);
            const len = binString.length;
            pngBytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              pngBytes[i] = binString.charCodeAt(i);
            }
          }

          if (!pngBytes || pngBytes.length === 0) {
            throw new Error('No PNG card binary data received in Datacat payload.');
          }

          const fileName = data.metadata?.fileName || `${data.metadata?.name || 'character'}.png`;
          const file = new File([pngBytes.buffer as ArrayBuffer], fileName, { type: 'image/png' });

          const parseResult = await CharacterImportService.parsePngCard(file);

          if (!parseResult.success || !parseResult.data) {
            throw new Error(parseResult.error || 'Failed to extract JanitorAI card specifications.');
          }

          // Acknowledge success to Datacat UI
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              {
                type: DATACAT_BRIDGE_MSG_ACK,
                nonce: bridgeRef.current.nonce,
                requestId,
                status: 'success',
                message: `Imported "${parseResult.data.name}" directly into Warden AI!`,
                datacatCharacterId: data.metadata?.characterId,
              },
              event.origin
            );
          }

          onImportCard(parseResult.data);
          setLastImportedName(parseResult.data.name);
          setImportStatus('success');

          // Auto-hide success toast after 6 seconds
          setTimeout(() => {
            setImportStatus('idle');
          }, 6000);
        } catch (err: any) {
          console.error('[Datacat ST Bridge] Import error:', err);
          setErrorMessage(err.message || 'Import failed');
          setImportStatus('error');

          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              {
                type: DATACAT_BRIDGE_MSG_ACK,
                nonce: bridgeRef.current.nonce,
                requestId,
                status: 'error',
                message: err.message || 'Card extraction failed in Warden AI.',
              },
              event.origin
            );
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [nonce, onImportCard, onBridgeStateChange]);

  const iframeSrc = nonce
    ? `${DATACAT_BROWSER_URL}?dc_embed=st&dc_bridge_nonce=${nonce}&dc_client=${DATACAT_BROWSER_CLIENT}&dc_client_version=${DATACAT_BROWSER_VERSION}&dc_auth_mode=${DATACAT_BROWSER_AUTH_MODE}`
    : `${DATACAT_BROWSER_URL}?dc_embed=st`;

  const handleQuickDirectImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickQuery.trim();
    if (!q) return;
    setImportStatus('importing');
    setQuickImportOpen(false);
    try {
      // Check if user pasted a datacat URL or numeric ID
      const idMatch = q.match(/(?:characters\/|^)(\d{3,})/);
      if (idMatch) {
        const detail = await communityCatalogService.getCharacterDetail(idMatch[1]);
        const res = await communityCatalogService.getCharacters({ search: detail.name, limit: 1 });
        const summary = res.characters[0] || {
          id: detail.id,
          name: detail.name,
          chatName: detail.chatName,
          creatorName: detail.creatorName,
          shortDescription: detail.descriptionHtml,
          avatarUrl: detail.avatarUrl,
          isNsfw: detail.isNsfw,
          totalTokens: detail.totalTokens,
          chatCount: 0,
          messageCount: 0,
          favoritesCount: 0,
          tags: detail.tags,
          createdAt: detail.createdAt
        };
        const cardData = communityCatalogService.toImportedCardData(summary, detail);
        onImportCard(cardData);
        setLastImportedName(cardData.name);
        setImportStatus('success');
        setQuickQuery('');
        return;
      }

      // Otherwise search by character name and import the top match
      const searchRes = await communityCatalogService.getCharacters({ search: q, limit: 1 });
      if (!searchRes.characters.length) {
        throw new Error(`No character found matching "${q}"`);
      }
      const char = searchRes.characters[0];
      const detail = await communityCatalogService.getCharacterDetail(char.id);
      const cardData = communityCatalogService.toImportedCardData(char, detail);
      onImportCard(cardData);
      setLastImportedName(cardData.name);
      setImportStatus('success');
      setQuickQuery('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not import character');
      setImportStatus('error');
    }
  };

  return (
    <div
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-[70] h-[100dvh] w-full'
          : 'relative w-full h-[calc(100dvh-9.75rem)] md:h-[calc(100dvh-3.25rem)]'
      } overflow-hidden bg-[#0a0b0e]`}
    >
      {/* ── Seamless Full-Bleed Embedded Frame (Supports Compact 78% Mobile Fit so buttons are never cut off) ── */}
      <iframe
        key={reloadTrigger}
        ref={iframeRef}
        src={iframeSrc}
        title="Datacat Character Hub"
        style={
          compactScale
            ? {
                width: '128.2%',
                height: '128.2%',
                transform: 'scale(0.78)',
                transformOrigin: 'top left'
              }
            : undefined
        }
        className="w-full h-full border-0 block"
        loading="eager"
        sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        referrerPolicy="no-referrer"
      />

      {/* ── Minimizable Floating Helper Widget (1 Small Icon when minimized -> Expands on tap) ── */}
      {!isPillExpanded ? (
        <button
          type="button"
          onClick={() => setIsPillExpanded(true)}
          className="absolute bottom-3.5 right-3.5 z-40 w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600/90 to-indigo-600/90 hover:from-purple-500 hover:to-indigo-500 backdrop-blur-2xl border border-white/25 shadow-[0_8px_28px_rgba(0,0,0,0.65)] flex items-center justify-center text-white cursor-pointer active:scale-90 transition-all animate-scale-in"
          title="Open Quick Import & Screen Fit Tools"
        >
          <Sparkles className="w-5 h-5" />
          {lastPreviewedCharId && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0a0b0e]" />
          )}
        </button>
      ) : (
        <div className="absolute bottom-3.5 right-3.5 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#0c0e14]/85 backdrop-blur-2xl border border-purple-500/40 shadow-[0_8px_32px_rgba(0,0,0,0.7)] text-xs text-white animate-scale-in">
          <button
            type="button"
            onClick={() => setCompactScale(prev => !prev)}
            className={`px-2.5 py-1 rounded-full flex items-center gap-1 font-bold transition-colors cursor-pointer ${
              compactScale
                ? 'bg-purple-600/30 text-purple-200 border border-purple-400/40'
                : 'hover:bg-white/10 text-neutral-300'
            }`}
            title="Fit large Datacat character preview on mobile screen"
          >
            {compactScale ? <ZoomIn className="w-3.5 h-3.5" /> : <ZoomOut className="w-3.5 h-3.5" />}
            <span>{compactScale ? '78%' : '100%'}</span>
          </button>

          <div className="w-px h-4 bg-white/15" />

          <button
            type="button"
            onClick={() => setQuickImportOpen(prev => !prev)}
            className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold flex items-center gap-1 shadow-sm cursor-pointer active:scale-95 transition-all"
            title="Quick Import character on screen"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Quick Import</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(prev => !prev)}
            className="p-1.5 rounded-full hover:bg-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setQuickImportOpen(false);
              setIsPillExpanded(false);
            }}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Minimize to small icon"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Floating Quick Import Popover with Auto-Filled Link & Visual Character Strip ── */}
      {quickImportOpen && isPillExpanded && (
        <form
          onSubmit={handleQuickDirectImport}
          className="absolute bottom-16 right-3.5 z-50 w-[92%] max-w-sm p-3.5 rounded-2xl bg-[#10131d]/95 backdrop-blur-2xl border border-purple-500/40 shadow-2xl space-y-3 animate-slide-up"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Tap Character You See (Auto-Fill Link)</span>
            </span>
            <button
              type="button"
              onClick={() => setQuickImportOpen(false)}
              className="text-neutral-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Live Visual Strip of Characters on Screen — Tap any avatar to auto-fill its link! */}
          {visibleFeedChars.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] text-neutral-400 block">
                Characters currently on Datacat (tap to auto-fill link):
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
                {visibleFeedChars.map(c => {
                  const isSel = selectedAutoChar?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedAutoChar(c);
                        setQuickQuery(`https://datacat.run/characters/${c.id}`);
                      }}
                      className={`shrink-0 flex items-center gap-1.5 p-1 pr-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSel
                          ? 'bg-purple-600/30 border-purple-400 text-white shadow-sm'
                          : 'bg-[#161a28] border-[#252b3d] text-neutral-300 hover:border-purple-500/40'
                      }`}
                    >
                      <img
                        src={c.avatarUrl}
                        alt={c.name}
                        className="w-7 h-7 rounded-lg object-cover bg-neutral-900 shrink-0"
                      />
                      <div className="max-w-[95px]">
                        <div className="text-[10px] font-bold truncate">{c.name}</div>
                        <div className="text-[9px] text-purple-300 truncate">@{c.creatorName}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] text-neutral-400 block">
              Auto-filled Character Link or Name:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={quickQuery}
                onChange={e => {
                  const val = e.target.value;
                  setQuickQuery(val);
                  // Also filter/match from visibleFeedChars if typing name
                  const match = visibleFeedChars.find(c =>
                    c.name.toLowerCase().includes(val.toLowerCase())
                  );
                  if (match) setSelectedAutoChar(match);
                }}
                placeholder="https://datacat.run/characters/..."
                className="flex-1 bg-[#090b10] border border-[#252b3d] rounded-xl px-3 py-2 text-xs text-purple-200 font-mono placeholder-neutral-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold cursor-pointer shrink-0 shadow-md"
              >
                Import
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── Native Floating Toast Notification (bottom-right) ── */}
      {importStatus === 'importing' && (
        <div className="absolute bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#12151e]/95 backdrop-blur-md border border-purple-500/50 rounded-2xl shadow-2xl text-xs text-purple-200 animate-pulse">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>Receiving and extracting card via SillyTavern bridge...</span>
        </div>
      )}

      {importStatus === 'success' && lastImportedName && (
        <div className="absolute bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#12151e]/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl shadow-2xl text-xs text-emerald-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-white">Imported "{lastImportedName}"</p>
            <p className="text-[11px] text-emerald-300/80">Saved to your library & ready to chat!</p>
          </div>
          <button
            onClick={() => setImportStatus('idle')}
            className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {importStatus === 'error' && (
        <div className="absolute bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#12151e]/95 backdrop-blur-md border border-rose-500/50 rounded-2xl shadow-2xl text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage || 'Card extraction failed. Please try saving the PNG.'}</span>
          <button
            onClick={() => setImportStatus('idle')}
            className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
