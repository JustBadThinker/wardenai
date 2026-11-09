/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Character, CharacterScenario, ContentRating, Lorebook, LorebookEntry, Tag } from '../types';
import { extractCleanCharacterName } from './aiProviderService';

export interface ImportedCardData {
  name: string;
  subtitle?: string;
  shortDescription: string;
  personality: string;
  background: string;
  systemPrompt?: string;
  exampleDialogue: string;
  firstMessage: string;
  alternateGreetings: string[];
  creatorNotes?: string;
  creatorUsername?: string;
  tags: string[];
  avatarUrl?: string; // Base64 data URL if extracted from PNG
  contentRating: ContentRating;
  age?: number;
  lorebook?: {
    name: string;
    description?: string;
    entries: Array<{
      title: string;
      keys: string[];
      content: string;
      priority?: number;
      enabled?: boolean;
    }>;
  };
  originalFormat: 'png_tEXt' | 'chara_card_v2' | 'chara_card_v3' | 'chara_card_v1' | 'warden_json' | 'generic_json';
  unsupportedFields: string[];
  missingMandatoryFields: string[];
}

export interface ImportParseResult {
  success: boolean;
  data?: ImportedCardData;
  error?: string;
  warnings?: string[];
  canEdit?: boolean;
}

export class CharacterImportService {
  private static readonly MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit

  /**
   * Parse PNG file arrayBuffer to extract tEXt/iTXt chunk containing character data
   */
  public static async parsePngCard(file: File): Promise<ImportParseResult> {
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size exceeds 15MB limit (provided: ${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller image.`
      };
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Verify PNG signature: 137 80 78 71 13 10 26 10
      const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      for (let i = 0; i < 8; i++) {
        if (bytes[i] !== pngSignature[i]) {
          return {
            success: false,
            error: 'Invalid PNG file. File does not contain a valid PNG signature.'
          };
        }
      }

      // Convert image to data URL for avatar
      const avatarDataUrl = await this.fileToDataUrl(file);

      // Walk PNG chunks to locate tEXt / iTXt
      const chunks = this.extractPngChunks(bytes);
      let characterJsonString: string | null = null;
      let matchedKeyword = '';

      for (const chunk of chunks) {
        if (chunk.name === 'tEXt') {
          // Format: Keyword (1-79 bytes) + Null (1 byte) + Text string
          const nullIndex = chunk.data.indexOf(0);
          if (nullIndex > 0) {
            const keyword = new TextDecoder('latin1').decode(chunk.data.slice(0, nullIndex));
            if (['chara', 'ccv3', 'character'].includes(keyword.toLowerCase())) {
              matchedKeyword = keyword;
              const textBytes = chunk.data.slice(nullIndex + 1);
              const rawText = new TextDecoder('utf-8').decode(textBytes);
              characterJsonString = this.decodeCardText(rawText);
              if (characterJsonString) break;
            }
          }
        } else if (chunk.name === 'iTXt') {
          // Format: Keyword + Null + compFlag + compMethod + langTag + Null + transKey + Null + text
          const nullIndex = chunk.data.indexOf(0);
          if (nullIndex > 0) {
            const keyword = new TextDecoder('latin1').decode(chunk.data.slice(0, nullIndex));
            if (['chara', 'ccv3', 'character'].includes(keyword.toLowerCase())) {
              matchedKeyword = keyword;
              // Check if uncompressed (compFlag == 0)
              const compFlag = chunk.data[nullIndex + 1];
              if (compFlag === 0) {
                // Find next 2 null bytes (langTag, transKey)
                let textStart = nullIndex + 3;
                let nullCount = 0;
                while (textStart < chunk.data.length && nullCount < 2) {
                  if (chunk.data[textStart] === 0) nullCount++;
                  textStart++;
                }
                const rawText = new TextDecoder('utf-8').decode(chunk.data.slice(textStart));
                characterJsonString = this.decodeCardText(rawText);
                if (characterJsonString) break;
              }
            }
          }
        }
      }

      if (!characterJsonString) {
        return {
          success: false,
          error:
            'No character card data found in this PNG. The image does not contain a "chara" or "ccv3" metadata chunk. Try exporting in JSON or copying the text manually.'
        };
      }

      // Parse JSON
      let parsedJson: any;
      try {
        parsedJson = JSON.parse(characterJsonString);
      } catch (e) {
        return {
          success: false,
          error: 'Character metadata chunk was found, but failed to parse JSON data: ' + (e instanceof Error ? e.message : String(e))
        };
      }

      const mapped = this.mapCardObjectToWarden(parsedJson, avatarDataUrl, 'png_tEXt');
      return {
        success: true,
        data: mapped,
        warnings: mapped.missingMandatoryFields.length > 0
          ? [`Missing required fields: ${mapped.missingMandatoryFields.join(', ')} (you can edit them in the preview).`]
          : undefined
      };
    } catch (err) {
      return {
        success: false,
        error: 'Failed to process PNG file: ' + (err instanceof Error ? err.message : String(err))
      };
    }
  }

  /**
   * Parse JSON character card (V1, V2, V3 or Warden AI native)
   */
  public static parseJsonCard(rawText: string, fallbackAvatarUrl?: string): ImportParseResult {
    if (!rawText.trim()) {
      return { success: false, error: 'JSON content is empty.' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      return {
        success: false,
        error: 'Invalid JSON syntax: ' + (e instanceof Error ? e.message : 'Check for trailing commas or unescaped characters.')
      };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, error: 'JSON card must be an object.' };
    }

    const format: ImportedCardData['originalFormat'] =
      parsed.spec === 'chara_card_v3'
        ? 'chara_card_v3'
        : parsed.spec === 'chara_card_v2'
        ? 'chara_card_v2'
        : parsed.scenarios && parsed.systemPrompt && parsed.name
        ? 'warden_json'
        : parsed.name && (parsed.description || parsed.personality)
        ? 'chara_card_v1'
        : 'generic_json';

    const mapped = this.mapCardObjectToWarden(parsed, fallbackAvatarUrl, format);

    return {
      success: true,
      data: mapped,
      warnings: mapped.missingMandatoryFields.length > 0
        ? [`Missing required fields: ${mapped.missingMandatoryFields.join(', ')}`]
        : undefined
    };
  }

  /**
   * Helper to parse manual text (e.g. pasted W++ or raw character prompts)
   */
  public static parseManualText(text: string): ImportParseResult {
    if (!text.trim()) {
      return { success: false, error: 'Manual text cannot be empty.' };
    }

    // Try parsing as JSON first in case user pasted JSON into text box
    if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
      return this.parseJsonCard(text);
    }

    // Heuristic breakdown: parse lines like Name:, Description:, Personality:, Scenario:, First Message:
    const lines = text.split('\n');
    let currentField = 'description';
    let name = '';
    let description = '';
    let personality = '';
    let scenario = '';
    let firstMessage = '';
    let exampleDialogue = '';
    let tags: string[] = ['manual-import'];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const lower = line.toLowerCase();

      if (/^name\s*[:=-]/i.test(line)) {
        name = line.replace(/^name\s*[:=-]\s*/i, '').trim();
        currentField = 'name';
      } else if (/^(?:description|desc|appearance|details)\s*[:=-]/i.test(line)) {
        description += line.replace(/^(?:description|desc|appearance|details)\s*[:=-]\s*/i, '') + '\n';
        currentField = 'description';
      } else if (/^(?:personality|traits|mind)\s*[:=-]/i.test(line)) {
        personality += line.replace(/^(?:personality|traits|mind)\s*[:=-]\s*/i, '') + '\n';
        currentField = 'personality';
      } else if (/^(?:scenario|setting|context)\s*[:=-]/i.test(line)) {
        scenario += line.replace(/^(?:scenario|setting|context)\s*[:=-]\s*/i, '') + '\n';
        currentField = 'scenario';
      } else if (/^(?:first\s*message|greeting|greeting\s*message|opener)\s*[:=-]/i.test(line)) {
        firstMessage += line.replace(/^(?:first\s*message|greeting|greeting\s*message|opener)\s*[:=-]\s*/i, '') + '\n';
        currentField = 'firstMessage';
      } else if (/^(?:example\s*dialogue|dialogue|examples)\s*[:=-]/i.test(line)) {
        exampleDialogue += line.replace(/^(?:example\s*dialogue|dialogue|examples)\s*[:=-]\s*/i, '') + '\n';
        currentField = 'exampleDialogue';
      } else if (/^(?:tags?|categories)\s*[:=-]/i.test(line)) {
        const rawTags = line.replace(/^(?:tags?|categories)\s*[:=-]\s*/i, '').split(/[,;]/);
        tags = tags.concat(rawTags.map(t => t.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean));
      } else {
        // Append to current active field
        if (currentField === 'name' && !name) {
          name = line;
        } else if (currentField === 'personality') {
          personality += rawLine + '\n';
        } else if (currentField === 'scenario') {
          scenario += rawLine + '\n';
        } else if (currentField === 'firstMessage') {
          firstMessage += rawLine + '\n';
        } else if (currentField === 'exampleDialogue') {
          exampleDialogue += rawLine + '\n';
        } else {
          description += rawLine + '\n';
        }
      }
    }

    if (!name.trim()) {
      // First non-empty line as name if short
      const firstLine = lines.find(l => l.trim().length > 0)?.trim() || 'Imported Character';
      name = firstLine.length < 50 ? firstLine : 'Imported Character';
    }

    if (!firstMessage.trim()) {
      firstMessage = `*${name} stands before you in quiet contemplation.* "Greetings. What brings you to see me today?"`;
    }

    const mapped: ImportedCardData = {
      name: this.sanitizeText(name),
      shortDescription: this.sanitizeText(description.trim() || 'Imported character description.'),
      personality: this.sanitizeText(personality.trim() || 'Adaptable and observant.'),
      background: this.sanitizeText(scenario.trim() || description.trim()),
      exampleDialogue: this.sanitizeText(exampleDialogue.trim() || '<START>\n{{user}}: "Hello."\n{{char}}: *nods respectfully* "Hello."'),
      firstMessage: this.sanitizeText(firstMessage.trim()),
      alternateGreetings: [],
      tags: Array.from(new Set(tags)),
      contentRating: 'SFW',
      age: 21,
      originalFormat: 'generic_json',
      unsupportedFields: [],
      missingMandatoryFields: []
    };

    return {
      success: true,
      data: mapped
    };
  }

  /**
   * Validate and inspect Community character URLs (Datacat, JannyAI, JanitorAI)
   */
  public static validateCommunityUrl(inputUrl: string): {
    isValid: boolean;
    hubType?: 'datacat' | 'jannyai' | 'janitorai' | 'other';
    characterId?: string;
    normalizedUrl?: string;
    errorMessage?: string;
    explanation?: string;
  } {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      return {
        isValid: false,
        errorMessage: 'Please enter a valid URL.'
      };
    }

    try {
      const parsed = new URL(trimmed);
      const hostname = parsed.hostname.toLowerCase();

      // Check supported community hubs: datacat.run, jannyai.com, janitorai.com
      const isDatacat = hostname === 'datacat.run' || hostname.endsWith('.datacat.run');
      const isJanny = hostname === 'jannyai.com' || hostname.endsWith('.jannyai.com');
      const isJanitor = hostname === 'janitorai.com' || hostname.endsWith('.janitorai.com');

      if (!isDatacat && !isJanny && !isJanitor) {
        return {
          isValid: false,
          errorMessage: 'URL must point to jannyai.com, datacat.run, or janitorai.com.',
          explanation: 'Warden AI verifies supported community hubs. If your character card is from another site, download the PNG or JSON card and upload it directly in the PNG Card or JSON tab.'
        };
      }

      const hubType: 'datacat' | 'jannyai' | 'janitorai' = isJanny
        ? 'jannyai'
        : isJanitor
        ? 'janitorai'
        : 'datacat';

      // Extract path parts: /characters/:id, /character/:id, /card/:id, /c/:id
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const charIndex = pathParts.findIndex(p =>
        ['character', 'characters', 'c', 'card', 'bot'].includes(p.toLowerCase())
      );
      const charId = charIndex >= 0 && pathParts[charIndex + 1] ? pathParts[charIndex + 1] : undefined;

      const hubName = isJanny ? 'JannyAI' : isJanitor ? 'JanitorAI' : 'Datacat';

      return {
        isValid: true,
        hubType,
        characterId: charId,
        normalizedUrl: parsed.origin + parsed.pathname,
        explanation: `${hubName} character card detected. Direct browser-based cross-origin fetching is subject to CORS policies and Cloudflare anti-bot controls. If live fetching is blocked by browser restrictions, click "Download Card" or save the portrait PNG from ${hubName} and upload it directly into the PNG Card tab.`
      };
    } catch {
      return {
        isValid: false,
        errorMessage: 'Invalid URL format. Please enter a full URL including https://.'
      };
    }
  }

  // Alias for backward compatibility
  public static validateDatacatUrl(inputUrl: string) {
    return this.validateCommunityUrl(inputUrl);
  }

  /**
   * Attempt authorized community character retrieval (Datacat, JannyAI, JanitorAI) with clear reporting
   */
  public static async fetchCommunityCharacter(url: string): Promise<ImportParseResult> {
    const val = this.validateCommunityUrl(url);
    if (!val.isValid) {
      return {
        success: false,
        error: val.errorMessage || 'Invalid URL.'
      };
    }

    const hubName = val.hubType === 'jannyai' ? 'JannyAI' : val.hubType === 'janitorai' ? 'JanitorAI' : 'Datacat';

    // In a browser client, cross-origin fetch is subject to CORS and Cloudflare protections.
    // We attempt public fetch with proper headers; if blocked or unparseable, provide clear guidance.
    try {
      const response = await fetch(val.normalizedUrl || url, {
        headers: {
          Accept: 'application/json, text/html, image/png, */*'
        }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `${hubName} request returned status ${response.status} (${response.statusText}).`,
          warnings: [
            `${hubName} pages require client-side JavaScript rendering or creator authentication.`,
            'Direct URL import is restricted by creator privacy controls or anti-bot protections.',
            `Recommended fallback: Click "Download Card" or "Export" on ${hubName}, then upload the PNG card file into Warden AI via the "PNG Card" tab.`
          ]
        };
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const jsonText = await response.text();
        return this.parseJsonCard(jsonText);
      }

      if (contentType.includes('image/png')) {
        const blob = await response.blob();
        const file = new File([blob], `${val.hubType || 'card'}_card.png`, { type: 'image/png' });
        return await this.parsePngCard(file);
      }

      // If HTML was returned, check for meta tags or embedded JSON
      const html = await response.text();
      const metaMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
      if (metaMatch && metaMatch[1]) {
        try {
          const nextData = JSON.parse(metaMatch[1]);
          const cardData =
            nextData?.props?.pageProps?.character ||
            nextData?.props?.pageProps?.card ||
            nextData?.props?.pageProps?.bot;
          if (cardData) {
            return {
              success: true,
              data: this.mapCardObjectToWarden(cardData, undefined, 'generic_json')
            };
          }
        } catch {
          // Fall through
        }
      }

      // Check for Nuxt data / state or embedded character JSON in scripts
      const charMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/i);
      if (charMatch && charMatch[1]) {
        try {
          const stateData = JSON.parse(charMatch[1]);
          const cardData = stateData?.character || stateData?.card;
          if (cardData) {
            return {
              success: true,
              data: this.mapCardObjectToWarden(cardData, undefined, 'generic_json')
            };
          }
        } catch {
          // Fall through
        }
      }

      // If HTML has no accessible payload
      return {
        success: false,
        error: `Unable to extract public character payload directly from ${hubName} URL.`,
        warnings: [
          `The character page is protected by dynamic hydration or access restrictions.`,
          `Warden AI respects creator boundaries and does not bypass private controls.`,
          `100% Guaranteed Solution: Click "Download Card" / "Export V2" on ${hubName} (or save the character portrait PNG), then drag and drop the image into the "PNG Card" tab.`
        ]
      };
    } catch (err) {
      // Browser cross-origin CORS restriction
      return {
        success: false,
        error: `Direct URL import unavailable due to browser cross-origin policy (CORS) on ${hubName}: ` + (err instanceof Error ? err.message : String(err)),
        warnings: [
          `Direct retrieval via URL is blocked by browser CORS security policies.`,
          `No problem: ${hubName} cards (JanitorAI compatible) are 100% compatible via file upload!`,
          `Simply click "Download Card" or save the character image from ${hubName}, then drag-and-drop it into the "PNG Card" tab.`
        ]
      };
    }
  }

  // Alias for backward compatibility
  public static fetchDatacatCharacter(url: string): Promise<ImportParseResult> {
    return this.fetchCommunityCharacter(url);
  }

  /**
   * Map raw card JSON (V1, V2, V3 or native) to Warden AI schema
   */
  private static mapCardObjectToWarden(
    raw: any,
    fallbackAvatarUrl?: string,
    format: ImportedCardData['originalFormat'] = 'generic_json'
  ): ImportedCardData {
    // Unpack V2 / V3 data wrapper if present
    const data = raw.data ? raw.data : raw;

    const chatName = this.sanitizeText(
      data.chat_name ||
      raw.chat_name ||
      data.chatName ||
      raw.chatName ||
      data.char_name ||
      ''
    );
    const rawTitle = this.sanitizeText(data.name || data.title || 'Unnamed Character');
    const rawSubtitle = this.sanitizeText(data.subtitle || data.tagline || data.short_description || '');

    // Description / Appearance
    const rawDesc = data.description || data.char_persona || data.char_desc || '';
    const rawPersonality = data.personality || data.char_personality || '';
    const personality = this.sanitizeText(rawPersonality || rawDesc);

    // Opening greetings (supports CCv2, JanitorAI, JannyAI, SillyTavern)
    const rawFirstMes =
      data.first_mes ||
      data.greeting ||
      data.first_message ||
      data.initial_message ||
      data.openingMessage ||
      '';

    const name =
      chatName && chatName !== rawTitle && chatName.length <= 34
        ? chatName
        : extractCleanCharacterName(rawTitle, rawSubtitle, rawFirstMes, personality);

    const subtitle = rawTitle !== name ? rawTitle : rawSubtitle;

    const shortDescription = this.sanitizeText(
      subtitle || (rawDesc.length > 250 ? rawDesc.substring(0, 247) + '...' : rawDesc)
    );

    // Background / Scenario
    const scenario = this.sanitizeText(data.scenario || data.world_scenario || '');
    const background = this.sanitizeText(
      rawDesc && rawDesc !== personality ? rawDesc : scenario || 'A character imported from community archives.'
    );

    const firstMessage = this.sanitizeText(
      rawFirstMes || `*${name} observes you attentively.* "Welcome. I am ${name}."`
    );

    const alternateGreetings: string[] = Array.isArray(data.alternate_greetings)
      ? data.alternate_greetings.map((g: any) => this.sanitizeText(String(g))).filter(Boolean)
      : [];

    // System prompt
    const systemPrompt = this.sanitizeText(
      data.system_prompt ||
      data.systemPrompt ||
      `You are ${name}. Embody their personality, mannerisms, and background in every response. Use asterisks for actions (*she smiles*) and quotes for dialogue ("spoken line"). Never break character.`
    );

    // Dialogue examples (JanitorAI uses example_dialogs, Tavern uses mes_example)
    const exampleDialogue = this.sanitizeText(
      data.mes_example ||
      data.example_dialogue ||
      data.example_dialogs ||
      data.exampleDialogue ||
      `<START>\n{{user}}: "Hello."\n{{char}}: *nods warmly* "Greetings."`
    );

    // Creator notes & metadata
    const creatorNotes = this.sanitizeText(data.creator_notes || data.creatorNotes || data.comment || '');
    const creatorUsername = this.sanitizeText(raw.creator || data.creator || raw.author || data.author || 'Imported Creator');

    // Tags
    let tags: string[] = ['imported'];
    if (Array.isArray(data.tags)) {
      tags = tags.concat(data.tags.map((t: any) => String(t).trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean));
    }
    if (Array.isArray(raw.tags)) {
      tags = tags.concat(raw.tags.map((t: any) => String(t).trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean));
    }

    // Age heuristic (ensures >= 18 Warden AI compliance)
    let age = 20;
    if (typeof data.age === 'number') {
      age = data.age;
    } else if (typeof data.age === 'string') {
      const parsedAge = parseInt(data.age, 10);
      if (!isNaN(parsedAge)) age = parsedAge;
    }

    // Avatar (supports avatarUrl, avatar_url, avatar, image)
    const avatarUrl =
      fallbackAvatarUrl ||
      (typeof data.avatarUrl === 'string' && data.avatarUrl.startsWith('http') ? data.avatarUrl : undefined) ||
      (typeof data.avatar_url === 'string' && data.avatar_url.startsWith('http') ? data.avatar_url : undefined) ||
      (typeof data.avatar === 'string' && data.avatar.startsWith('http') ? data.avatar : undefined) ||
      (typeof data.image === 'string' && data.image.startsWith('http') ? data.image : undefined) ||
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80';

    // Content Rating
    let contentRating: ContentRating = 'SFW';
    const tagString = tags.join(' ').toLowerCase();
    if (data.nsfw === true || tagString.includes('nsfw') || tagString.includes('18+')) {
      contentRating = 'NSFW';
    } else if (tagString.includes('mature') || tagString.includes('violence')) {
      contentRating = 'Mature';
    }

    // Lorebook parsing (character_book in CCv2/CCv3)
    let lorebook: ImportedCardData['lorebook'] | undefined;
    const rawBook = data.character_book || data.lorebook;
    if (rawBook && Array.isArray(rawBook.entries)) {
      lorebook = {
        name: this.sanitizeText(rawBook.name || `${name} Lorebook`),
        description: this.sanitizeText(rawBook.description || `Embedded lore for ${name}`),
        entries: rawBook.entries.map((e: any, idx: number) => ({
          title: this.sanitizeText(e.comment || e.title || `Entry ${idx + 1}`),
          keys: Array.isArray(e.keys) ? e.keys.map(String) : [],
          content: this.sanitizeText(e.content || ''),
          priority: typeof e.priority === 'number' ? e.priority : 10,
          enabled: e.enabled !== false
        }))
      };
    }

    // Unsupported / extra metadata tracking
    const standardKeys = new Set([
      'name', 'char_name', 'title', 'subtitle', 'tagline', 'description', 'char_desc',
      'personality', 'char_personality', 'scenario', 'first_mes', 'greeting',
      'alternate_greetings', 'system_prompt', 'mes_example', 'creator_notes',
      'character_book', 'tags', 'creator', 'author', 'avatar', 'avatarUrl',
      'spec', 'spec_version', 'age', 'nsfw'
    ]);

    const unsupportedFields: string[] = [];
    for (const key of Object.keys(data)) {
      if (!standardKeys.has(key) && typeof data[key] !== 'function') {
        unsupportedFields.push(key);
      }
    }

    // Missing mandatory check (Warden AI requires name, age >= 18, description, personality, firstMessage)
    const missingMandatoryFields: string[] = [];
    if (!name || name === 'Unnamed Character') missingMandatoryFields.push('Character Name');
    if (!personality) missingMandatoryFields.push('Personality');
    if (!shortDescription) missingMandatoryFields.push('Description');
    if (!firstMessage) missingMandatoryFields.push('First Message');
    if (age < 18) missingMandatoryFields.push('Minimum Age (must be 18+)');

    return {
      name,
      subtitle,
      shortDescription,
      personality,
      background,
      systemPrompt,
      exampleDialogue,
      firstMessage,
      alternateGreetings,
      creatorNotes,
      creatorUsername,
      tags: Array.from(new Set(tags)),
      avatarUrl,
      contentRating,
      age: Math.max(age, 18), // Clamp to minimum 18 for safety
      lorebook,
      originalFormat: format,
      unsupportedFields,
      missingMandatoryFields
    };
  }

  /**
   * Sanitize text: prevent script/XSS execution while preserving Markdown & converting HTML <img>/<br>/<p> to Markdown
   */
  public static sanitizeText(input: string): string {
    if (!input) return '';
    return (
      input
        // Strip script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Strip style tags
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Strip dangerous iframe / object tags
        .replace(
          /<(?:iframe|object|embed|applet)\b[^<]*(?:(?!<\/(?:iframe|object|embed|applet)>)<[^<]*)*<\/(?:iframe|object|embed|applet)>/gi,
          ''
        )
        // Convert HTML <img ... src="url" ...> tags into Markdown ![alt](url) so description & first-message images render!
        .replace(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*?>/gi, (fullTag, src) => {
          const altMatch = fullTag.match(/\balt=["']([^"']*)["']/i);
          const alt = altMatch ? altMatch[1].trim() : '';
          return `\n\n![${alt}](${src.trim()})\n\n`;
        })
        // Convert HTML line breaks and block endings into newlines
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:p|div|h[1-6]|li|blockquote|section|article)>/gi, '\n\n')
        .replace(/<hr\s*\/?>/gi, '\n---\n')
        // Convert basic HTML bold/italic to Markdown
        .replace(/<(?:b|strong)\b[^>]*>([\s\S]*?)<\/(?:b|strong)>/gi, '**$1**')
        .replace(/<(?:i|em)\b[^>]*>([\s\S]*?)<\/(?:i|em)>/gi, '*$1*')
        // Strip remaining HTML tags (except roleplay <user> / <char> macros)
        .replace(/<(?!\/?(?:user|char)\b)[a-zA-Z\/][^>]*>/g, '')
        // Decode common HTML entities
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        // Clean excessive blank lines
        .replace(/\n{3,}/g, '\n\n')
        // Remove null bytes
        .replace(/\0/g, '')
        .trim()
    );
  }

  /**
   * Decode card text from raw tEXt/iTXt chunk payload (handles raw JSON or Base64 JSON)
   */
  private static decodeCardText(raw: string): string | null {
    const trimmed = raw.trim();

    // Check if directly JSON
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }

    // Try Base64 decode
    try {
      // Decode standard or URL-safe base64
      const normalized = trimmed.replace(/-/g, '+').replace(/_/g, '/');
      const binaryStr = atob(normalized);
      // Properly decode UTF-8 bytes from binary string
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const decodedUtf8 = new TextDecoder('utf-8').decode(bytes);
      if (decodedUtf8.trim().startsWith('{')) {
        return decodedUtf8.trim();
      }
    } catch {
      // Not base64
    }

    return null;
  }

  /**
   * Helper to parse PNG binary chunks
   */
  private static extractPngChunks(bytes: Uint8Array): Array<{ name: string; data: Uint8Array }> {
    const chunks: Array<{ name: string; data: Uint8Array }> = [];
    let offset = 8; // skip 8-byte PNG signature

    const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    while (offset < bytes.length - 8) {
      const length = dataView.getUint32(offset, false);
      offset += 4;

      const chunkTypeBytes = bytes.slice(offset, offset + 4);
      const chunkName = String.fromCharCode(...chunkTypeBytes);
      offset += 4;

      const chunkData = bytes.slice(offset, offset + length);
      offset += length;

      // Skip 4-byte CRC
      offset += 4;

      chunks.push({ name: chunkName, data: chunkData });

      if (chunkName === 'IEND') break;
    }

    return chunks;
  }

  /**
   * Helper to read file as Data URL
   */
  private static fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image as data URL.'));
      reader.readAsDataURL(file);
    });
  }
}
