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
  engine: 'browser' | 'kokoro-endpoint';
  kokoroEndpoint: string;
  voiceId: string;
  pitch: number; // 0.5 to 1.5 (default 1.0)
  speed: number; // 0.5 to 2.0 (default 1.0)
  dialogueOnly: boolean; // default true (reads only quotation marks "...")
}

export const DEFAULT_TTS_CONFIG: TtsConfig = {
  enabled: false,
  autoPlay: false,
  engine: 'browser',
  kokoroEndpoint: 'http://localhost:8880/v1/audio/speech',
  voiceId: 'af_heart',
  pitch: 1.0,
  speed: 1.0,
  dialogueOnly: true
};

const STORAGE_KEY = 'warden_tts_settings';

export class TtsService {
  private config: TtsConfig = { ...DEFAULT_TTS_CONFIG };
  private activeAudio: HTMLAudioElement | null = null;
  private isSpeaking = false;
  private currentMessageId: string | null = null;
  private audioCache = new Map<string, string>();
  private listeners = new Set<(state: { isSpeaking: boolean; currentMessageId: string | null }) => void>();

  constructor() {
    this.loadConfig();
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
      } catch {
        // Ignore storage errors
      }
    }
    return this.config;
  }

  public getConfig(): TtsConfig {
    return { ...this.config };
  }

  public subscribe(cb: (state: { isSpeaking: boolean; currentMessageId: string | null }) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach(cb => cb({ isSpeaking: this.isSpeaking, currentMessageId: this.currentMessageId }));
  }

  /**
   * Smart Quote Extractor for Roleplay:
   * Extracts only spoken dialogue enclosed in quotation marks: "..." or “...” or 「...」
   * If dialogueOnly is true and quotations exist, discards asterisk actions (*smiles*) and descriptions.
   * If no quotations exist, cleanly strips markdown and delivers cleaned message.
   */
  public extractSpokenDialogue(text: string, dialogueOnly = true): string {
    if (!text) return '';

    if (dialogueOnly) {
      // Match all standard and typographic quotes: "...", “...”, 「...」
      const quoteRegex = /["“「]([^"”」]+)["”」]/g;
      const quotes: string[] = [];
      let match: RegExpExecArray | null;

      while ((match = quoteRegex.exec(text)) !== null) {
        const cleaned = match[1].replace(/[*_#`~[\]]/g, '').trim();
        if (cleaned.length > 0) {
          quotes.push(cleaned);
        }
      }

      if (quotes.length > 0) {
        return quotes.join(' ');
      }
    }

    // Fallback if no quotes found or dialogueOnly is disabled:
    // Strip asterisk roleplay actions (*sighs deeply*, *looks down*)
    let stripped = text.replace(/\*[^*]+\*/g, ' ');
    // Strip bracket instructions or system prompts like [Date: ...]
    stripped = stripped.replace(/\[[^\]]+\]/g, ' ');
    // Strip code blocks and markdown artifacts
    stripped = stripped.replace(/```[\s\S]*?```/g, ' ');
    stripped = stripped.replace(/[`_#~]/g, ' ');
    // Normalize excess whitespace
    return stripped.replace(/\s+/g, ' ').trim();
  }

  /**
   * Stop any current speech playback immediately
   */
  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {}
      this.activeAudio = null;
    }
    this.isSpeaking = false;
    this.currentMessageId = null;
    this.notify();
  }

  public getPlaybackState(): { isSpeaking: boolean; currentMessageId: string | null } {
    return {
      isSpeaking: this.isSpeaking,
      currentMessageId: this.currentMessageId
    };
  }

  /**
   * Plays speech for a given text turn, respecting active voice profile, pitch, and speed.
   */
  public async speak(
    rawText: string,
    messageId?: string,
    overrideConfig?: Partial<TtsConfig>
  ): Promise<void> {
    const opts = { ...this.config, ...overrideConfig };
    const spokenText = this.extractSpokenDialogue(rawText, opts.dialogueOnly);

    if (!spokenText || spokenText.length < 1) {
      return;
    }

    // If already playing this message, clicking again toggles stop
    if (this.isSpeaking && this.currentMessageId === messageId) {
      this.stop();
      return;
    }

    this.stop();
    this.isSpeaking = true;
    this.currentMessageId = messageId || null;
    this.notify();

    const selectedProfile = KOKORO_VOICES.find(v => v.id === opts.voiceId) || KOKORO_VOICES[0];

    // Mode 1: Kokoro Endpoint (OpenAI TTS format compatible: POST /v1/audio/speech)
    if (opts.engine === 'kokoro-endpoint' && opts.kokoroEndpoint) {
      try {
        const cacheKey = `${opts.voiceId}_${opts.speed}_${opts.pitch}_${spokenText}`;
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

        const audio = new Audio(audioBlobUrl);
        this.activeAudio = audio;
        audio.playbackRate = opts.speed;

        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = e => reject(e);
          audio.play().catch(reject);
        });

        this.stop();
        return;
      } catch (err) {
        console.warn('[TtsService] Kokoro endpoint failed, falling back to browser speech synthesis:', err);
        // Seamless fallback to browser speech synthesis
      }
    }

    // Mode 2: Native Web Speech Synthesis (Zero MB, Instant, Zero Telemetry)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      await new Promise<void>((resolve) => {
        try {
          const utterance = new SpeechSynthesisUtterance(spokenText);
          utterance.rate = Math.max(0.6, Math.min(1.8, opts.speed));
          utterance.pitch = Math.max(0.5, Math.min(1.6, opts.pitch));

          // Try matching voice by selected gender or English/Japanese language
          const voices = window.speechSynthesis.getVoices();
          if (voices && voices.length > 0) {
            const isJp = selectedProfile.category === 'anime';
            const langCode = isJp ? 'ja' : (selectedProfile.category === 'british' ? 'en-GB' : 'en-US');
            const matchingVoice = voices.find(v =>
              v.lang.toLowerCase().startsWith(langCode.toLowerCase()) &&
              (selectedProfile.gender === 'female' ? /female|woman|girl|samantha|zira|karen|victoria/i.test(v.name) : /male|man|boy|david|george|alex/i.test(v.name))
            ) || voices.find(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase())) || voices[0];

            if (matchingVoice) {
              utterance.voice = matchingVoice;
            }
          }

          utterance.onend = () => {
            this.stop();
            resolve();
          };
          utterance.onerror = () => {
            this.stop();
            resolve();
          };

          window.speechSynthesis.speak(utterance);
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
