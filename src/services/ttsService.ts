/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface KokoroVoiceProfile {
  id: string;
  name: string;
  category: 'female' | 'male' | 'british' | 'anime';
  archetype: string;
  description: string;
  gender: 'female' | 'male';
}

export const KOKORO_VOICES: KokoroVoiceProfile[] = [
  // --- FEMALE VOICES ---
  {
    id: 'af_heart',
    name: 'Heart',
    category: 'female',
    archetype: 'Warm, Natural Waifu (Recommended)',
    description: 'Balanced, highly expressive, warm and natural everyday voice.',
    gender: 'female'
  },
  {
    id: 'af_bella',
    name: 'Bella',
    category: 'female',
    archetype: 'Sweet & Playful Girlfriend',
    description: 'Youthful, energetic, high-spirited, sweet tone.',
    gender: 'female'
  },
  {
    id: 'af_sarah',
    name: 'Sarah',
    category: 'female',
    archetype: 'Mature MILF / Calm Mother / Onee-san',
    description: 'Gentle, comforting, mature resonance with motherly warmth.',
    gender: 'female'
  },
  {
    id: 'af_nicole',
    name: 'Nicole',
    category: 'female',
    archetype: 'Sensual / Whispery / ASMR & Intimate',
    description: 'Soft, breathy, intimate whisper suitable for emotional or late-night RP.',
    gender: 'female'
  },
  {
    id: 'af_sky',
    name: 'Sky',
    category: 'female',
    archetype: 'Cheerful Genki / Tsundere Girl',
    description: 'Brisk, upbeat, slightly sharp and lively speech.',
    gender: 'female'
  },
  {
    id: 'af_alloy',
    name: 'Alloy',
    category: 'female',
    archetype: 'Tomboy / Knight / Steadfast Boss',
    description: 'Slightly deeper female tone, authoritative, calm and assertive.',
    gender: 'female'
  },
  {
    id: 'af_aoede',
    name: 'Aoede',
    category: 'female',
    archetype: 'Melodic / Gentle Priestess',
    description: 'Slow-cadence, tranquil and soothing tone.',
    gender: 'female'
  },
  {
    id: 'af_jessica',
    name: 'Jessica',
    category: 'female',
    archetype: 'Modern Confident Woman',
    description: 'Clear, modern professional conversational delivery.',
    gender: 'female'
  },

  // --- MALE VOICES ---
  {
    id: 'am_adam',
    name: 'Adam',
    category: 'male',
    archetype: 'Deep Baritone / Alpha / Husbando',
    description: 'Deep, commanding, masculine baritone with strong gravitas.',
    gender: 'male'
  },
  {
    id: 'am_michael',
    name: 'Michael',
    category: 'male',
    archetype: 'Warm Boyfriend / Gentle Giant',
    description: 'Friendly, warm, grounded conversational male tone.',
    gender: 'male'
  },
  {
    id: 'am_liam',
    name: 'Liam',
    category: 'male',
    archetype: 'Soft Boy / Twink / MLM (BL)',
    description: 'Young, soft-spoken, boyish, gentle and endearing.',
    gender: 'male'
  },
  {
    id: 'am_fenrir',
    name: 'Fenrir',
    category: 'male',
    archetype: 'Furry / Beastman / Growly Alpha / Orc',
    description: 'Rough, deep, slightly raspy and intimidating beastly voice.',
    gender: 'male'
  },
  {
    id: 'am_echo',
    name: 'Echo',
    category: 'male',
    archetype: 'Cool / Detached Kuudere Male',
    description: 'Calm, measured, low emotion, cyberpunk or assassin vibe.',
    gender: 'male'
  },
  {
    id: 'am_eric',
    name: 'Eric',
    category: 'male',
    archetype: 'Rugged Warrior / Gritty Detective',
    description: 'Husky, weathered, realistic mid-range male timbre.',
    gender: 'male'
  },

  // --- BRITISH & EUROPEAN ACCENTS ---
  {
    id: 'bf_emma',
    name: 'Emma (UK)',
    category: 'british',
    archetype: 'Refined Aristocrat / Elegant Lady',
    description: 'Crisp British RP accent, aristocratic and poised.',
    gender: 'female'
  },
  {
    id: 'bf_isabella',
    name: 'Isabella (UK)',
    category: 'british',
    archetype: 'Duchess / Sassy Villainess',
    description: 'Dramatic, posh, sharp-witted British articulation.',
    gender: 'female'
  },
  {
    id: 'bm_george',
    name: 'George (UK)',
    category: 'british',
    archetype: 'Sophisticated Butler / Noble Lord',
    description: 'Impeccable British gentleman cadence, polite and formal.',
    gender: 'male'
  },
  {
    id: 'bm_lewis',
    name: 'Lewis (UK)',
    category: 'british',
    archetype: 'Gentle Scholar / Mentor',
    description: 'Thoughtful, calm, articulate European academic tone.',
    gender: 'male'
  },

  // --- ANIME INFLECTED ---
  {
    id: 'jf_alpha',
    name: 'Alpha (Anime JP)',
    category: 'anime',
    archetype: 'Kuudere / Anime Waifu',
    description: 'Light, soft, anime-styled cadence with gentle pauses.',
    gender: 'female'
  },
  {
    id: 'jm_kumo',
    name: 'Kumo (Anime JP)',
    category: 'anime',
    archetype: 'Anime Protagonist / Shonen Hero',
    description: 'Clear, high-spirited anime male hero delivery.',
    gender: 'male'
  }
];

export interface TtsConfig {
  enabled: boolean;
  autoPlay: boolean;
  engine: 'kokoro-local' | 'browser' | 'kokoro-endpoint';
  kokoroEndpoint: string;
  voiceId: string;
  pitch: number; // 0.5 to 1.5 (default 1.0)
  speed: number; // 0.5 to 2.0 (default 1.0)
  dialogueOnly: boolean; // default true (reads only quotation marks "...")
}

export const DEFAULT_TTS_CONFIG: TtsConfig = {
  enabled: false,
  autoPlay: false,
  engine: 'kokoro-local',
  kokoroEndpoint: 'http://localhost:8880/v1/audio/speech',
  voiceId: 'af_heart',
  pitch: 1.0,
  speed: 1.0,
  dialogueOnly: true
};

export type KokoroModelStatus = 'idle' | 'downloading' | 'ready' | 'error';

export interface KokoroProgressState {
  status: KokoroModelStatus;
  progress: number; // 0 to 100
  text: string;
  error?: string;
}

export interface TtsPlaybackState {
  isSpeaking: boolean;
  isSynthesizing: boolean;
  synthesizingMessageId: string | null;
  synthesizingPercent: number; // 0 to 100%
  currentChunk: number;
  totalChunks: number;
  playingChunk: number;
  currentMessageId: string | null;
  kokoroProgress: KokoroProgressState;
}

const STORAGE_KEY = 'warden_tts_settings';
const KOKORO_DOWNLOADED_KEY = 'warden_kokoro_model_cached';

export class TtsService {
  private config: TtsConfig = { ...DEFAULT_TTS_CONFIG };
  private activeAudio: HTMLAudioElement | null = null;
  private isSpeaking = false;
  private isSynthesizing = false;
  private synthesizingMessageId: string | null = null;
  private synthesizingPercent = 0;
  private currentChunk = 0;
  private totalChunks = 0;
  private playingChunk = 0;
  private activeJobId = 0;
  private currentMessageId: string | null = null;
  private playbackQueue: string[] = [];
  private isPlayingQueue = false;
  private activePlaybackSpeed = 1.0;
  private audioCache = new Map<string, string>();
  private chunkCache = new Map<string, string[]>();
  private pendingChunks = new Map<string, string[]>();
  private listeners = new Set<(state: TtsPlaybackState) => void>();

  // Background Web Worker for non-blocking neural TTS inference
  private worker: Worker | null = null;
  private kokoroProgress: KokoroProgressState = {
    status: 'idle',
    progress: 0,
    text: ''
  };

  // Pending synthesize resolver
  private pendingSynthesizeResolve: ((blobUrl: string) => void) | null = null;
  private pendingSynthesizeReject: ((err: Error) => void) | null = null;
  private queuedSpeak: { text: string; messageId?: string; config?: Partial<TtsConfig> } | null = null;

  // Chromium GC Guard for Web Speech API
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private browserVoices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.loadConfig();
    this.initBrowserVoices();
    this.checkIfModelPreviouslyDownloaded();
  }

  private initBrowserVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const load = () => {
        try {
          this.browserVoices = window.speechSynthesis.getVoices() || [];
        } catch {}
      };
      load();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = load;
      }
    }
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/kokoroWorker.ts', import.meta.url), {
        type: 'module'
      });

      this.worker.onmessage = (e: MessageEvent) => {
        const { type, status, progress, text, error, messageId, jobId } = e.data || {};

        if (type === 'PROGRESS') {
          this.kokoroProgress = {
            status: status || 'downloading',
            progress: progress || 0,
            text: text || ''
          };
          this.notify();
          return;
        } else if (type === 'MODEL_READY') {
          this.kokoroProgress = {
            status: 'ready',
            progress: 100,
            text: 'Kokoro-82M model ready & active'
          };
          if (typeof window !== 'undefined') {
            localStorage.setItem(KOKORO_DOWNLOADED_KEY, 'true');
          }
          this.notify();

          if (this.queuedSpeak) {
            const { text, messageId, config } = this.queuedSpeak;
            this.queuedSpeak = null;
            this.speak(text, messageId, config);
          }
          return;
        } else if (type === 'ERROR') {
          this.kokoroProgress = {
            status: 'error',
            progress: 0,
            text: 'Kokoro model download failed',
            error: error || 'Network or initialization error'
          };
          this.queuedSpeak = null;
          this.isSynthesizing = false;
          this.synthesizingMessageId = null;
          this.notify();
          return;
        }

        // Job check: ignore messages from old cancelled jobs
        if (jobId !== undefined && jobId !== this.activeJobId) {
          return;
        }

        if (type === 'STOPPED') {
          return;
        }

        if (type === 'GENERATING') {
          if (!this.isSynthesizing || jobId !== this.activeJobId) return;
          this.synthesizingMessageId = messageId || null;
          this.currentChunk = e.data?.currentChunk || 1;
          this.totalChunks = e.data?.totalChunks || 1;
          this.synthesizingPercent = e.data?.percent || 0;
          this.notify();
        } else if (type === 'GENERATING_PROGRESS') {
          if (!this.isSynthesizing || jobId !== this.activeJobId) return;
          this.synthesizingMessageId = messageId || null;
          this.currentChunk = e.data?.currentChunk || 1;
          this.totalChunks = e.data?.totalChunks || 1;
          this.synthesizingPercent = e.data?.percent || 0;
          this.notify();
        } else if (type === 'CHUNK_AUDIO') {
          if (!this.isSynthesizing || jobId !== this.activeJobId) return;
          this.synthesizingMessageId = messageId || null;
          this.currentChunk = e.data?.currentChunk || 1;
          this.totalChunks = e.data?.totalChunks || 1;
          this.synthesizingPercent = 100;

          let chunkBlobUrl = '';
          if (e.data?.blob) {
            chunkBlobUrl = URL.createObjectURL(e.data.blob);
          } else if (e.data?.buffer) {
            const wavBlob = new Blob([e.data.buffer], { type: 'audio/wav' });
            chunkBlobUrl = URL.createObjectURL(wavBlob);
          }

          if (chunkBlobUrl) {
            const cacheKey = e.data?.cacheKey || messageId || 'active';
            if (!this.pendingChunks.has(cacheKey)) {
              this.pendingChunks.set(cacheKey, []);
            }
            this.pendingChunks.get(cacheKey)!.push(chunkBlobUrl);

            this.playbackQueue.push(chunkBlobUrl);
            if (!this.isPlayingQueue) {
              this.currentMessageId = messageId || null;
              this.playNextChunk(jobId);
            }
          }
          this.notify();
        } else if (type === 'AUDIO_READY') {
          if (jobId !== this.activeJobId) return;
          this.isSynthesizing = false;
          this.synthesizingMessageId = null;

          const cacheKey = e.data?.cacheKey || messageId || 'active';
          const collected = this.pendingChunks.get(cacheKey);
          if (collected && collected.length > 0) {
            this.chunkCache.set(cacheKey, [...collected]);
            this.pendingChunks.delete(cacheKey);
          }

          if (this.pendingSynthesizeResolve) {
            this.pendingSynthesizeResolve('ready');
            this.pendingSynthesizeResolve = null;
            this.pendingSynthesizeReject = null;
          }
          if (!this.isPlayingQueue && this.playbackQueue.length === 0) {
            this.isSpeaking = false;
            this.currentMessageId = null;
            this.currentChunk = 0;
            this.totalChunks = 0;
            this.playingChunk = 0;
          }
          this.notify();
        } else if (type === 'GENERATE_ERROR') {
          if (jobId !== this.activeJobId) return;
          this.isSynthesizing = false;
          this.synthesizingMessageId = null;
          this.synthesizingPercent = 0;
          this.currentChunk = 0;
          this.totalChunks = 0;
          this.queuedSpeak = null;
          if (this.pendingSynthesizeReject) {
            this.pendingSynthesizeReject(new Error(error || 'Kokoro speech synthesis failed'));
            this.pendingSynthesizeResolve = null;
            this.pendingSynthesizeReject = null;
          }
          this.notify();
        }
      };

      this.worker.onerror = (err) => {
        console.error('[TtsService Worker Error]', err);
        this.isSynthesizing = false;
        this.synthesizingMessageId = null;
        if (this.pendingSynthesizeReject) {
          this.pendingSynthesizeReject(new Error('Worker crashed or unavailable'));
          this.pendingSynthesizeResolve = null;
          this.pendingSynthesizeReject = null;
        }
        this.notify();
      };
    }
    return this.worker;
  }

  private checkIfModelPreviouslyDownloaded() {
    if (typeof window === 'undefined') return;
    try {
      const wasDownloaded = localStorage.getItem(KOKORO_DOWNLOADED_KEY) === 'true';
      if (wasDownloaded) {
        // Auto-load in background thread without freezing UI
        this.loadKokoroModel(true).catch(() => {});
      }
    } catch {}
  }

  public loadConfig(): TtsConfig {
    if (typeof window === 'undefined') return this.config;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.config = { ...DEFAULT_TTS_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      this.config = { ...DEFAULT_TTS_CONFIG };
    }
    return this.config;
  }

  public saveConfig(updated: Partial<TtsConfig>): TtsConfig {
    this.config = { ...this.config, ...updated };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      } catch {}
    }
    return this.config;
  }

  public getConfig(): TtsConfig {
    return { ...this.config };
  }

  public getKokoroProgress(): KokoroProgressState {
    return { ...this.kokoroProgress };
  }

  public isKokoroReady(): boolean {
    return this.kokoroProgress.status === 'ready';
  }

  public subscribe(cb: (state: TtsPlaybackState) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const state: TtsPlaybackState = {
      isSpeaking: this.isSpeaking,
      isSynthesizing: this.isSynthesizing,
      synthesizingMessageId: this.synthesizingMessageId,
      synthesizingPercent: this.synthesizingPercent,
      currentChunk: this.currentChunk,
      totalChunks: this.totalChunks,
      playingChunk: this.playingChunk,
      currentMessageId: this.currentMessageId,
      kokoroProgress: { ...this.kokoroProgress }
    };
    this.listeners.forEach(cb => cb(state));
  }

  private playNextChunk(expectedJobId?: number): void {
    if (expectedJobId !== undefined && expectedJobId !== this.activeJobId) {
      return;
    }

    const thisJobId = this.activeJobId;

    if (this.playbackQueue.length === 0) {
      this.isPlayingQueue = false;
      if (!this.isSynthesizing) {
        this.isSpeaking = false;
        this.currentMessageId = null;
        this.currentChunk = 0;
        this.totalChunks = 0;
        this.playingChunk = 0;
        this.notify();
      }
      return;
    }

    // Safely detach & stop previous audio instance so its events never fire
    if (this.activeAudio) {
      const prevAudio = this.activeAudio;
      this.activeAudio = null;
      prevAudio.onended = null;
      prevAudio.onerror = null;
      try {
        prevAudio.pause();
        prevAudio.currentTime = 0;
        prevAudio.src = '';
      } catch {}
    }

    this.isPlayingQueue = true;
    this.isSpeaking = true;
    this.playingChunk++;
    this.notify();

    const chunkUrl = this.playbackQueue.shift()!;
    const audio = new Audio(chunkUrl);
    this.activeAudio = audio;
    audio.playbackRate = this.activePlaybackSpeed;

    audio.onended = () => {
      if (this.activeJobId !== thisJobId || this.activeAudio !== audio) {
        return;
      }
      audio.onended = null;
      audio.onerror = null;
      this.playNextChunk(thisJobId);
    };

    audio.onerror = (e) => {
      if (this.activeJobId !== thisJobId || this.activeAudio !== audio) {
        return;
      }
      audio.onended = null;
      audio.onerror = null;
      console.warn('[TtsService] Chunk audio playback error, skipping to next chunk', e);
      this.playNextChunk(thisJobId);
    };

    audio.play().catch(err => {
      // AbortError occurs intentionally when stopped/paused: ignore completely and do NOT advance chunk
      if (err?.name === 'AbortError' || this.activeJobId !== thisJobId || this.activeAudio !== audio) {
        return;
      }
      console.warn('[TtsService] Audio play rejected:', err);
      if (this.activeAudio === audio) {
        audio.onended = null;
        audio.onerror = null;
        this.playNextChunk(thisJobId);
      }
    });
  }

  /**
   * Downloads and auto-wires the Kokoro-82M neural model inside a background Web Worker.
   * Keeps main UI at 60 FPS without freezing!
   */
  public async loadKokoroModel(silent = false): Promise<boolean> {
    if (this.kokoroProgress.status === 'ready') {
      return true;
    }

    if (this.kokoroProgress.status === 'downloading') {
      return false;
    }

    this.kokoroProgress = {
      status: 'downloading',
      progress: 0,
      text: silent ? 'Loading cached Kokoro engine...' : 'Initializing Kokoro-82M background worker...'
    };
    this.notify();

    try {
      const worker = this.getWorker();
      worker.postMessage({ type: 'LOAD_MODEL' });
      return true;
    } catch (err: any) {
      console.error('[TtsService] Failed to spawn Kokoro worker:', err);
      this.kokoroProgress = {
        status: 'error',
        progress: 0,
        text: 'Failed to start Kokoro worker',
        error: err?.message
      };
      this.notify();
      return false;
    }
  }

  /**
   * Helper to trigger direct browser download of the model weights to the user's Downloads/Warden folder
   */
  public downloadModelDirectlyToFolder(): void {
    if (typeof window === 'undefined') return;
    const modelUrl = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model_q8.onnx?download=true';
    const link = document.createElement('a');
    link.href = modelUrl;
    link.download = 'Warden_Kokoro_model_q8.onnx';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Smart Quote Chunk Extractor for Roleplay:
   * Extracts each spoken dialogue quote as an individual chunk.
   * If there are 5 quotes -> 5 chunks (1/5, 2/5, 3/5, 4/5, 5/5).
   * If there is 1 quote with multiple sentences -> splits into sentences.
   * Discards actions/thoughts enclosed in asterisks *...* or _..._.
   */
  public extractSpokenDialogueChunks(text: string, dialogueOnly = true): string[] {
    if (!text) return [];

    // First normalize bold-wrapped quotes: **"..."** -> "..."
    const normalized = text
      .replace(/\*\*(["“「][^"”」]+["”」])\*\*/g, '$1')
      .replace(/(["“「])\*\*([^*]+)\*\*(["”」])/g, '$1$2$3');

    if (dialogueOnly) {
      // 1. Strip narrative/action blocks enclosed in asterisks *...* or _..._
      // so quotes inside actions (e.g. *she pivoted from "sprint" to "stroll"*) are discarded
      const nonNarrativeText = normalized
        .replace(/\*[^*]+\*/g, ' ')
        .replace(/_[^_]+_/g, ' ');

      const quoteRegex = /["“「]([^"”」]+)["”」]/g;
      const rawQuotes: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = quoteRegex.exec(nonNarrativeText)) !== null) {
        const cleaned = match[1].replace(/[*_#`~[\]]/g, '').trim();
        if (cleaned.length > 0 && /[a-zA-Z0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(cleaned)) {
          rawQuotes.push(cleaned);
        }
      }

      if (rawQuotes.length > 0) {
        // Break any exceptionally long monologue (> 160 chars) into natural sentences
        // so playback can start immediately on Chunk 1 while subsequent chunks synthesize in the background.
        // Otherwise, each spoken quote is preserved as its own distinct chunk (e.g. 1/3, 2/3, 3/3).
        const chunks: string[] = [];
        for (const q of rawQuotes) {
          if (q.length > 160 && /[.!?…]\s+/.test(q)) {
            const subSentences = q.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(s => s.length > 0);
            chunks.push(...subSentences);
          } else {
            chunks.push(q);
          }
        }
        return chunks.length > 0 ? chunks : rawQuotes;
      }
    }

    // Fallback: If no spoken quotes outside narration exist (e.g. pure narrative)
    let stripped = normalized
      .replace(/[*_#`~[\]]/g, ' ')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!stripped) return [];

    const rawSentences = stripped
      .split(/(?<=[.!?…])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && /[a-zA-Z0-9\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(s));

    return rawSentences.length > 0 ? rawSentences : [stripped];
  }

  /**
   * Smart Quote Extractor for Roleplay:
   * Extracts only spoken dialogue enclosed in quotation marks: "..." or “...” or 「...」
   * Explicitly discards actions and internal thoughts enclosed in asterisks *...* or _..._
   * so quotes within narration (e.g. *she shifted from "sprint" to "stroll"*) are never spoken.
   */
  public extractSpokenDialogue(text: string, dialogueOnly = true): string {
    const chunks = this.extractSpokenDialogueChunks(text, dialogueOnly);
    return chunks.join(' ');
  }

  /**
   * Stop any current speech playback immediately and kill worker tasks
   */
  public stop(): void {
    this.activeJobId++;
    if (this.worker) {
      try {
        this.worker.postMessage({ type: 'STOP' });
      } catch {}
    }
    this.queuedSpeak = null;
    this.playbackQueue = [];
    this.isPlayingQueue = false;
    this.synthesizingPercent = 0;
    this.currentChunk = 0;
    this.totalChunks = 0;
    this.playingChunk = 0;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.activeUtterance = null;

    if (this.activeAudio) {
      const oldAudio = this.activeAudio;
      this.activeAudio = null;
      oldAudio.onended = null;
      oldAudio.onerror = null;
      try {
        oldAudio.pause();
        oldAudio.currentTime = 0;
        oldAudio.src = '';
      } catch {}
    }
    this.isSpeaking = false;
    this.isSynthesizing = false;
    this.synthesizingMessageId = null;
    this.currentMessageId = null;
    this.notify();
  }

  public getPlaybackState(): TtsPlaybackState {
    return {
      isSpeaking: this.isSpeaking,
      isSynthesizing: this.isSynthesizing,
      synthesizingMessageId: this.synthesizingMessageId,
      synthesizingPercent: this.synthesizingPercent,
      currentChunk: this.currentChunk,
      totalChunks: this.totalChunks,
      playingChunk: this.playingChunk,
      currentMessageId: this.currentMessageId,
      kokoroProgress: { ...this.kokoroProgress }
    };
  }

  /**
   * Plays speech for a given text turn with non-blocking Web Worker Kokoro generation.
   */
  public async speak(
    rawText: string,
    messageId?: string,
    overrideConfig?: Partial<TtsConfig>
  ): Promise<void> {
    const opts = { ...this.config, ...overrideConfig };
    this.activePlaybackSpeed = opts.speed || 1.0;
    const chunks = this.extractSpokenDialogueChunks(rawText, opts.dialogueOnly);
    const spokenText = chunks.join(' ');

    if (!chunks || chunks.length === 0 || !spokenText.trim()) {
      return;
    }

    // If currently speaking or synthesizing this exact message, toggle stop
    if ((this.isSpeaking || this.isSynthesizing) && (this.currentMessageId === messageId || this.synthesizingMessageId === messageId)) {
      this.stop();
      return;
    }

    this.stop();

    const selectedProfile = KOKORO_VOICES.find(v => v.id === opts.voiceId) || KOKORO_VOICES[0];
    const cacheKey = `${messageId || spokenText}_${opts.voiceId}_${opts.speed}`;

    // Priority 1: In-Browser Kokoro Neural Engine via Background Worker
    if (opts.engine === 'kokoro-local' || !opts.engine) {
      // Check cache first! If previously synthesized for this message & voice, replay immediately without compiling!
      const cachedChunks = this.chunkCache.get(cacheKey);
      if (cachedChunks && cachedChunks.length > 0) {
        this.activeJobId++;
        const thisJobId = this.activeJobId;
        this.isSpeaking = true;
        this.currentMessageId = messageId || null;
        this.currentChunk = 0;
        this.totalChunks = cachedChunks.length;
        this.playingChunk = 0;
        this.synthesizingPercent = 0;
        this.isSynthesizing = false;
        this.synthesizingMessageId = null;
        this.playbackQueue = [...cachedChunks];
        this.playNextChunk(thisJobId);
        this.notify();
        return;
      }

      // If model is not ready, start loading, show synthesizing spinner, and queue this message
      if (this.kokoroProgress.status !== 'ready') {
        this.queuedSpeak = { text: rawText, messageId, config: overrideConfig };
        this.isSynthesizing = true;
        this.synthesizingMessageId = messageId || null;
        this.currentChunk = 1;
        this.totalChunks = chunks.length;
        this.playingChunk = 0;
        this.synthesizingPercent = 0;
        this.notify();
        this.loadKokoroModel(false);
        return;
      }

      // Trigger background worker synthesis with streaming chunk playback
      this.activeJobId++;
      const thisJobId = this.activeJobId;
      this.isSynthesizing = true;
      this.synthesizingMessageId = messageId || null;
      this.currentChunk = 1;
      this.totalChunks = chunks.length;
      this.playingChunk = 0;
      this.synthesizingPercent = 0;
      this.notify();

      try {
        const worker = this.getWorker();
        worker.postMessage({
          type: 'GENERATE',
          payload: {
            jobId: thisJobId,
            chunks,
            voice: opts.voiceId,
            speed: opts.speed,
            messageId,
            cacheKey
          }
        });
        return;
      } catch (err) {
        console.warn('[TtsService] Worker Kokoro dispatch failed:', err);
        this.isSynthesizing = false;
        this.synthesizingMessageId = null;
        this.notify();
      }
      return;
    }

    // Priority 2: Custom Kokoro Server Endpoint (OpenAI format /v1/audio/speech)
    if (opts.engine === 'kokoro-endpoint' && opts.kokoroEndpoint) {
      this.isSynthesizing = true;
      this.synthesizingMessageId = messageId || null;
      this.notify();

      try {
        const cacheKey = `endpoint_${opts.voiceId}_${opts.speed}_${opts.pitch}_${spokenText}`;
        let audioBlobUrl = this.audioCache.get(cacheKey);

        if (!audioBlobUrl) {
          const res = await fetch(opts.kokoroEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'kokoro',
              input: spokenText,
              voice: opts.voiceId,
              speed: opts.speed
            })
          });

          if (!res.ok) {
            throw new Error(`Kokoro server responded with status ${res.status}`);
          }

          const blob = await res.blob();
          audioBlobUrl = URL.createObjectURL(blob);
          this.audioCache.set(cacheKey, audioBlobUrl);
        }

        this.isSynthesizing = false;
        this.synthesizingMessageId = null;
        this.isSpeaking = true;
        this.currentMessageId = messageId || null;
        this.notify();

        const audio = new Audio(audioBlobUrl);
        this.activeAudio = audio;
        audio.playbackRate = opts.speed;

        await new Promise<void>((resolve) => {
          audio.onended = () => {
            this.stop();
            resolve();
          };
          audio.onerror = () => {
            this.stop();
            resolve();
          };
          audio.play().catch(() => {
            this.stop();
            resolve();
          });
        });

        return;
      } catch (err) {
        console.warn('[TtsService] Kokoro endpoint failed:', err);
        this.isSynthesizing = false;
        this.synthesizingMessageId = null;
        this.notify();
      }
    }

    // Priority 3: Native Web Speech Synthesis (Explicit fallback if engine is set to 'browser')
    if (opts.engine === 'browser' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.isSpeaking = true;
      this.currentMessageId = messageId || null;
      this.notify();

      await new Promise<void>((resolve) => {
        try {
          window.speechSynthesis.cancel();
          window.speechSynthesis.resume();

          const utterance = new SpeechSynthesisUtterance(spokenText);
          this.activeUtterance = utterance;

          utterance.rate = Math.max(0.6, Math.min(1.8, opts.speed));
          utterance.pitch = Math.max(0.5, Math.min(1.6, opts.pitch));

          let voices = this.browserVoices;
          if (!voices || voices.length === 0) {
            voices = window.speechSynthesis.getVoices() || [];
            this.browserVoices = voices;
          }

          if (voices && voices.length > 0) {
            const isJp = selectedProfile.category === 'anime';
            const langCode = isJp ? 'ja' : (selectedProfile.category === 'british' ? 'en-GB' : 'en-US');
            const matchingVoice = voices.find(v =>
              v.lang.toLowerCase().startsWith(langCode.toLowerCase()) &&
              (selectedProfile.gender === 'female' ? /female|woman|girl|samantha|zira|karen|victoria|natural/i.test(v.name) : /male|man|boy|david|george|alex|natural/i.test(v.name))
            ) || voices.find(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase())) || voices[0];

            if (matchingVoice) {
              utterance.voice = matchingVoice;
            }
          }

          utterance.onend = () => {
            this.activeUtterance = null;
            this.stop();
            resolve();
          };
          utterance.onerror = (e) => {
            console.warn('[TtsService] Speech synthesis utterance error:', e);
            this.activeUtterance = null;
            this.stop();
            resolve();
          };

          setTimeout(() => {
            try {
              window.speechSynthesis.speak(utterance);
            } catch {
              this.stop();
              resolve();
            }
          }, 40);
        } catch {
          this.stop();
          resolve();
        }
      });
    } else {
      this.stop();
    }
  }
}

export const ttsService = new TtsService();
