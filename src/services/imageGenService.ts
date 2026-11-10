/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Character, ChatMessage, Persona } from '../types';

export type ImageGenProvider = 'pollinations' | 'openai' | 'custom';

export type ImageStylePreset =
  | 'anime'
  | 'semi-realistic'
  | 'photorealistic'
  | 'dark-fantasy'
  | 'pixel-art'
  | 'manga';

export interface ImageStyleOption {
  id: ImageStylePreset;
  label: string;
  description: string;
  promptPrefix: string;
}

export const IMAGE_STYLE_OPTIONS: ImageStyleOption[] = [
  {
    id: 'anime',
    label: 'Anime (Default)',
    description: 'Vibrant, ultra-detailed anime aesthetic with clean linework & expressive lighting.',
    promptPrefix: 'masterpiece, best quality, ultra-detailed anime illustration, vibrant colors, expressive eyes, clean cel-shaded lineart, makoto shinkai aesthetic'
  },
  {
    id: 'semi-realistic',
    label: 'Semi-Realistic / 2.5D',
    description: 'Smooth digital painting with volumetric lighting and realistic textures.',
    promptPrefix: '2.5d semi-realistic digital illustration, soft ambient lighting, highly detailed character concept art, octane render, rich textures'
  },
  {
    id: 'photorealistic',
    label: 'Photorealistic',
    description: 'Realistic photographic look with natural depth of field and soft lighting.',
    promptPrefix: 'raw photo, realistic portrait photography, natural lighting, 8k uhd, dslr, sharp focus, lifelike skin texture'
  },
  {
    id: 'dark-fantasy',
    label: 'Dark Fantasy',
    description: 'Moody, cinematic composition with dramatic shadows and atmospheric fog.',
    promptPrefix: 'cinematic dark fantasy illustration, atmospheric moody lighting, gothic aesthetic, dramatic shadows, epic composition'
  },
  {
    id: 'pixel-art',
    label: 'Pixel Art',
    description: 'Nostalgic 16-bit retro aesthetic with crisp pixel clusters.',
    promptPrefix: '16-bit retro pixel art, detailed pixel sprite, nostalgic gaming aesthetic, clean pixel clusters, vibrant palette'
  },
  {
    id: 'manga',
    label: 'Manga / Monochrome',
    description: 'Classic Japanese manga panel with screentones and high-contrast ink.',
    promptPrefix: 'manga illustration, monochrome screentones, sharp black and white ink lineart, dramatic manga panel, dynamic framing'
  }
];

export interface ImageGenConfig {
  enabled: boolean;
  provider: ImageGenProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
  style: ImageStylePreset;
  customStylePrompt?: string;
  aspectRatio: 'portrait' | 'square' | 'landscape';
  width: number;
  height: number;
  negativePrompt: string;
  enhance?: boolean; // AI Art Director / Prompt Enhancer
}

export function mapToAnomanStyle(stylePreset?: ImageStylePreset): 'flat-illustration' | 'cinematic' | '3d-render' | 'editorial' | 'product-photo' {
  switch (stylePreset) {
    case 'anime':
    case 'manga':
      return 'flat-illustration';
    case 'dark-fantasy':
    case 'pixel-art':
      return 'cinematic';
    case 'semi-realistic':
      return '3d-render';
    case 'photorealistic':
      return 'editorial';
    default:
      return 'flat-illustration';
  }
}

export const DEFAULT_IMAGE_GEN_CONFIG: ImageGenConfig = {
  enabled: true,
  provider: 'pollinations',
  model: 'flux-anime',
  apiKey: '',
  baseUrl: 'https://image.pollinations.ai/prompt',
  style: 'anime',
  customStylePrompt: '',
  aspectRatio: 'portrait',
  width: 832,
  height: 1216,
  negativePrompt: 'low quality, blurry, deformed anatomy, bad hands, missing fingers, extra limbs, watermark, signature, ugly face',
  enhance: true
};

const STORAGE_KEY = 'warden_image_gen_config_v1';

export class ImageGenService {
  private config: ImageGenConfig = { ...DEFAULT_IMAGE_GEN_CONFIG };

  constructor() {
    this.loadConfig();
  }

  public loadConfig(): ImageGenConfig {
    if (typeof window === 'undefined') return this.config;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.config = { ...DEFAULT_IMAGE_GEN_CONFIG, ...JSON.parse(saved) };
        // Auto-migrate stale default model for custom or openai
        if (this.config.provider === 'custom') {
          if (!this.config.model || this.config.model === 'flux-anime' || this.config.model === 'turbo' || this.config.model === 'any-dark') {
            this.config.model = 'flux-schnell';
          }
        }
        if (this.config.provider === 'openai') {
          if (!this.config.model || this.config.model === 'flux-anime') {
            this.config.model = 'dall-e-3';
          }
        }
        // Clean accidental model name in customStylePrompt
        if (this.config.customStylePrompt?.trim().toLowerCase() === 'flux-schnell' || this.config.customStylePrompt?.trim().toLowerCase() === 'flux') {
          this.config.customStylePrompt = '';
        }
      }
    } catch {
      this.config = { ...DEFAULT_IMAGE_GEN_CONFIG };
    }
    return this.config;
  }

  public saveConfig(updates: Partial<ImageGenConfig>): ImageGenConfig {
    this.config = { ...this.config, ...updates };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      } catch {}
    }
    return { ...this.config };
  }

  public getConfig(): ImageGenConfig {
    return { ...this.config };
  }

  /**
   * Builds a rich visual prompt from character description, persona, and recent message context.
   */
  public buildScenePrompt(
    character: Character,
    messageContent: string,
    persona?: Persona,
    overrideStyle?: ImageStylePreset,
    customInstructions?: string
  ): string {
    const activeStyle = overrideStyle || this.config.style || 'anime';
    const styleOption = IMAGE_STYLE_OPTIONS.find(s => s.id === activeStyle) || IMAGE_STYLE_OPTIONS[0];

    // 1. Extract Character Visual Highlights (hair, eyes, clothing, archetype)
    const visualTraits: string[] = [];
    const charName = character.name.split(' ')[0] || character.name;
    visualTraits.push(`1girl, ${charName}`);

    const descPool = `${character.shortDescription || ''} ${character.personality || ''} ${character.background || ''}`;
    
    // Hair keywords
    const hairMatch = descPool.match(/\b(black|brown|blonde|silver|white|red|crimson|pink|blue|purple|green|golden)\s+hair\b/i);
    if (hairMatch) visualTraits.push(hairMatch[0].toLowerCase());

    // Eye keywords
    const eyeMatch = descPool.match(/\b(blue|red|amber|crimson|green|brown|hazel|violet|purple|golden|yellow)\s+eyes\b/i);
    if (eyeMatch) visualTraits.push(eyeMatch[0].toLowerCase());

    // Clothing / Outfit keywords
    const clothingMatch = descPool.match(/\b(school uniform|maid outfit|maid dress|black hoodie|hoodie|armor|tank top|sundress|white dress|black dress|suit and tie|business suit|t-shirt and jeans|sweater|kimono|yukata|leather jacket|corset|overalls)\b/i);
    if (clothingMatch) visualTraits.push(clothingMatch[0].toLowerCase());

    // Notable tags (e.g., catgirl, elf, knight, student, bunny girl)
    if (character.tagSlugs && character.tagSlugs.length > 0) {
      const relevantTags = character.tagSlugs
        .filter(t => /cat|bunny|elf|demon|angel|maid|school|suit|armor|furry|vampire|goth|fox|wolf/i.test(t))
        .map(t => t.replace(/-/g, ' '));
      if (relevantTags.length > 0) {
        visualTraits.push(...relevantTags.slice(0, 3));
      }
    }

    // 2. Extract Action / Scene setting from the message
    // Prioritize actions in asterisks: *she cuddles on the couch watching tv*
    const actionMatches: string[] = [];
    const asteriskRegex = /\*([^*]+)\*/g;
    let match: RegExpExecArray | null;
    while ((match = asteriskRegex.exec(messageContent)) !== null) {
      const cleaned = match[1].replace(/[*_#`]/g, '').trim();
      if (cleaned.length > 5 && cleaned.length < 180) {
        actionMatches.push(cleaned);
      }
    }

    let sceneDescription = '';
    if (actionMatches.length > 0) {
      sceneDescription = actionMatches.slice(-2).join(', ');
    } else {
      // Fallback: Use clean snippet of text (dialogue or description)
      const cleanText = messageContent
        .replace(/["“「][^"”」]+["”」]/g, '')
        .replace(/[*_#`~[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      sceneDescription = cleanText ? cleanText.slice(0, 160) : 'conversing warmly with user';
    }

    // 3. User Persona context (if in scene)
    let interactionSnippet = '';
    if (persona && persona.name) {
      const personaDetails: string[] = [];
      if (persona.appearance) {
        const cleanApp = persona.appearance.replace(/[*_#`]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
        if (cleanApp) personaDetails.push(cleanApp);
      }
      interactionSnippet = `together with ${persona.name}${personaDetails.length > 0 ? ` (${personaDetails.join(', ')})` : ''}`;
    }

    // 4. Combine into final prompt (Adaptive: Natural Language for Flux/Modern models, Tag-Prefix for SD)
    const isFluxOrCustom = this.config.provider === 'custom' || /flux/i.test(this.config.model);

    if (isFluxOrCustom) {
      // Natural language descriptive format optimized for Flux T5-XXL text encoder & Anoman Art Director
      const subjectIntro = visualTraits.length > 0
        ? `A gorgeous ${styleOption.label.split(' ')[0].toLowerCase()} illustration of ${visualTraits.join(', ')}`
        : `A gorgeous ${styleOption.label.split(' ')[0].toLowerCase()} illustration of ${charName}`;
      
      const actionText = sceneDescription ? `, ${sceneDescription}` : ', in a charismatic and expressive pose';
      const interactionText = interactionSnippet ? `, ${interactionSnippet}` : '';
      const customNotes = customInstructions?.trim() ? `, ${customInstructions.trim()}` : '';
      const customModifiers = this.config.customStylePrompt?.trim() ? `, ${this.config.customStylePrompt.trim()}` : '';

      return `${subjectIntro}${actionText}${interactionText}${customModifiers}${customNotes}. Atmospheric cinematic lighting, rich volumetric depth, expressive facial features, highly detailed environmental setting, masterpiece composition.`.replace(/\s+/g, ' ');
    }

    const parts = [
      styleOption.promptPrefix,
      this.config.customStylePrompt?.trim() || '',
      visualTraits.join(', '),
      sceneDescription,
      interactionSnippet,
      customInstructions?.trim() || '',
      'cinematic lighting, detailed background, expressive emotions, high quality'
    ].filter(p => p && p.trim().length > 0);

    return parts.join(', ');
  }

  /**
   * Generates an image using the configured provider (Pollinations AI, OpenAI DALL-E, or Custom).
   */
  public async generateImage(
    prompt: string,
    overrideConfig?: Partial<ImageGenConfig>
  ): Promise<{ imageUrl: string; prompt: string }> {
    const cfg = { ...this.config, ...overrideConfig };
    const seed = Math.floor(Math.random() * 10000000);

    // Calculate dimensions based on aspect ratio
    let width = cfg.width || 832;
    let height = cfg.height || 1216;
    if (cfg.aspectRatio === 'square') {
      width = 1024;
      height = 1024;
    } else if (cfg.aspectRatio === 'landscape') {
      width = 1216;
      height = 832;
    } else {
      width = 832;
      height = 1216;
    }

    // ─── PROVIDER 1: POLLINATIONS AI (FREE / ZERO KEY) ──────────────────────────
    if (cfg.provider === 'pollinations' || !cfg.provider) {
      const model = cfg.model || 'flux-anime';
      const cleanPrompt = prompt.trim();
      const encodedPrompt = encodeURIComponent(cleanPrompt);
      const negativePart = cfg.negativePrompt ? `&negative=${encodeURIComponent(cfg.negativePrompt)}` : '';
      
      const targetUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}&nologo=true&seed=${seed}${negativePart}`;

      try {
        // Fetch to ensure image is ready and create a persistent local Blob URL
        const res = await fetch(targetUrl);
        if (!res.ok) {
          throw new Error(`Pollinations API returned status ${res.status}`);
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        return {
          imageUrl: blobUrl,
          prompt: cleanPrompt
        };
      } catch (err: any) {
        console.warn('[ImageGenService] Blob fetch failed, falling back to direct URL:', err);
        return {
          imageUrl: targetUrl,
          prompt: cleanPrompt
        };
      }
    }

    // ─── PROVIDER 2: OPENAI DALL-E 3 ──────────────────────────────────────────
    if (cfg.provider === 'openai') {
      if (!cfg.apiKey) {
        throw new Error('OpenAI API Key is required for DALL-E image generation.');
      }
      const rawBase = (cfg.baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
      const endpoint = rawBase.endsWith('/images/generations') ? rawBase : `${rawBase}/images/generations`;

      const sizeStr = cfg.aspectRatio === 'landscape' ? '1792x1024' : cfg.aspectRatio === 'portrait' ? '1024x1792' : '1024x1024';

      const isLocalDev = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      let targetUrl = endpoint;
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (isLocalDev) {
        targetUrl = '/api/proxy-image-gen';
        requestHeaders['X-Target-Url'] = endpoint;
      }
      if (cfg.apiKey) {
        requestHeaders['Authorization'] = `Bearer ${cfg.apiKey.trim()}`;
      }

      let res: Response;
      try {
        res = await fetch(targetUrl, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify({
            model: cfg.model || 'dall-e-3',
            prompt: prompt.trim(),
            n: 1,
            size: sizeStr,
            quality: 'standard'
          })
        });
      } catch (fetchErr: any) {
        if (isLocalDev) {
          try {
            res = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cfg.apiKey.trim()}`
              },
              body: JSON.stringify({
                model: cfg.model || 'dall-e-3',
                prompt: prompt.trim(),
                n: 1,
                size: sizeStr,
                quality: 'standard'
              })
            });
          } catch {
            throw new Error('Koneksi ke OpenAI gagal / timeout (Failed to fetch). Silakan periksa koneksi internet atau klik Retry.');
          }
        } else {
          throw new Error('Koneksi ke OpenAI gagal / timeout (Failed to fetch). Silakan periksa koneksi internet atau klik Retry.');
        }
      }

      const rawText = await res.text();
      let resJson: any = null;
      try {
        resJson = JSON.parse(rawText);
      } catch {}

      if (!res.ok) {
        let errMsg = `OpenAI returned status ${res.status}`;
        if (resJson?.error?.message) {
          errMsg = resJson.error.message;
        } else if (typeof resJson?.error === 'string') {
          errMsg = resJson.error;
        } else if (typeof resJson?.detail === 'string') {
          errMsg = resJson.detail;
        } else if (resJson?.detail?.message) {
          errMsg = resJson.detail.message;
        } else if (resJson?.message) {
          errMsg = resJson.message;
        } else if (rawText.includes('<title>')) {
          const titleMatch = rawText.match(/<title>([^<]+)<\/title>/i);
          errMsg = titleMatch ? titleMatch[1].trim() : `Server returned HTML error (${res.status})`;
        } else if (rawText) {
          errMsg = rawText.slice(0, 300);
        }
        throw new Error(errMsg);
      }

      const firstItem = resJson?.data?.[0] || resJson?.images?.[0];
      const generatedUrl = firstItem?.url || (firstItem?.b64_json ? `data:image/png;base64,${firstItem.b64_json}` : '');
      if (!generatedUrl) {
        throw new Error('No image URL returned by OpenAI image API');
      }

      return {
        imageUrl: generatedUrl,
        prompt: firstItem?.revised_prompt || prompt
      };
    }

    // ─── PROVIDER 3: CUSTOM OPENAI-COMPATIBLE ENDPOINT ───────────────────────
    if (cfg.provider === 'custom') {
      const rawBase = (cfg.baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
      const endpoint = rawBase.endsWith('/images/generations') ? rawBase : `${rawBase}/images/generations`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (cfg.apiKey) {
        headers['Authorization'] = `Bearer ${cfg.apiKey.trim()}`;
      }

      let modelName = cfg.model?.trim() || 'flux-schnell';
      if (modelName === 'flux-anime' || modelName === 'turbo' || modelName === 'any-dark') {
        modelName = 'flux-schnell';
      }

      // Calculate size compliant with Flux / Fal.ai / Anoman specs
      let sizeStr: string;
      const isFlux = /flux/i.test(modelName) || cfg.provider === 'custom';
      if (isFlux) {
        if (cfg.aspectRatio === 'square') {
          sizeStr = '1024x1024';
        } else if (cfg.aspectRatio === 'landscape') {
          sizeStr = '1024x576'; // exact 16:9, fast & avoids Cloudflare timeout
        } else {
          sizeStr = '576x1024'; // exact 9:16, fast & avoids Cloudflare timeout
        }
      } else {
        if (cfg.aspectRatio === 'square') {
          sizeStr = '1024x1024';
        } else if (cfg.aspectRatio === 'landscape') {
          sizeStr = '1792x1024';
        } else {
          sizeStr = '1024x1792';
        }
      }

      const anomanStyle = mapToAnomanStyle(cfg.style);
      const requestBody: Record<string, any> = {
        model: modelName,
        prompt: prompt.trim(),
        n: 1,
        size: sizeStr,
        enhance: cfg.enhance !== false,
        style: anomanStyle,
        response_format: 'b64_json'
      };

      const isLocalDev = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      let targetUrl = endpoint;
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (isLocalDev) {
        targetUrl = '/api/proxy-image-gen';
        requestHeaders['X-Target-Url'] = endpoint;
      }
      if (cfg.apiKey) {
        requestHeaders['Authorization'] = `Bearer ${cfg.apiKey.trim()}`;
      }

      let res: Response;
      try {
        res = await fetch(targetUrl, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(requestBody)
        });
      } catch (fetchErr: any) {
        if (isLocalDev) {
          try {
            res = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify(requestBody)
            });
          } catch {
            throw new Error('Koneksi ke endpoint API gagal / timeout (Failed to fetch). Silakan periksa Base URL atau klik Retry.');
          }
        } else {
          throw new Error('Koneksi ke endpoint API gagal / timeout (Failed to fetch). Silakan periksa Base URL atau klik Retry.');
        }
      }

      const rawText = await res.text();
      let resJson: any = null;
      try {
        resJson = JSON.parse(rawText);
      } catch {}

      if (!res.ok) {
        let errMsg = `Custom image API returned status ${res.status}`;
        if (resJson?.error?.message) {
          errMsg = resJson.error.message;
        } else if (typeof resJson?.error === 'string') {
          errMsg = resJson.error;
        } else if (typeof resJson?.detail === 'string') {
          errMsg = resJson.detail;
        } else if (resJson?.detail?.message) {
          errMsg = resJson.detail.message;
        } else if (Array.isArray(resJson?.detail)) {
          errMsg = resJson.detail.map((d: any) => d.msg ? `${d.loc ? d.loc.slice(1).join('.') + ': ' : ''}${d.msg}` : JSON.stringify(d)).join('; ');
        } else if (resJson?.message) {
          errMsg = resJson.message;
        } else if (rawText.includes('<title>')) {
          const titleMatch = rawText.match(/<title>([^<]+)<\/title>/i);
          errMsg = titleMatch ? titleMatch[1].trim() : `Server returned HTML error (${res.status})`;
        } else if (rawText.startsWith('<!DOCTYPE html') || rawText.includes('<html')) {
          errMsg = res.status === 524
            ? 'Server Anoman timeout (Cloudflare Error 524). Model gambar membutuhkan waktu terlalu lama. Silakan klik Retry.'
            : res.status === 504
              ? 'Gateway timeout dari server gambar (504).'
              : `Server mengembalikan halaman error HTML (${res.status}).`;
        } else if (rawText) {
          errMsg = rawText.slice(0, 300);
        }
        console.error('[ImageGenService] Custom generation error:', errMsg);
        throw new Error(errMsg);
      }

      const firstItem = resJson?.data?.[0] || resJson?.images?.[0];
      const generatedUrl = firstItem?.url || (firstItem?.b64_json ? `data:image/png;base64,${firstItem.b64_json}` : (typeof firstItem === 'string' ? firstItem : ''));
      if (!generatedUrl) {
        throw new Error('No image returned by custom image endpoint');
      }

      return {
        imageUrl: generatedUrl,
        prompt: resJson?._anoman?.enhanced_prompt || firstItem?.revised_prompt || prompt.trim()
      };
    }

    throw new Error(`Unsupported image provider: ${cfg.provider}`);
  }
}

export const imageGenService = new ImageGenService();

