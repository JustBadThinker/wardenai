/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImportedCardData, CharacterImportService } from './characterImportService';
import { ContentRating } from '../types';
import { cleanCreatorHandle, extractCleanCharacterName } from './aiProviderService';

export interface CommunityCharacter {
  id: string;
  characterId: string;
  name: string;
  chatName: string;
  creatorName: string;
  creatorId?: string;
  avatarUrl: string;
  shortDescription: string;
  isNsfw: boolean;
  totalTokens: number;
  chatCount: number;
  messageCount: number;
  favoritesCount: number;
  tags: Array<{ id: number; name: string; slug: string }>;
  firstPublishedAt?: string;
  createdAt?: string;
}

export interface CommunityCharacterDetail extends CommunityCharacter {
  firstMessage: string;
  personality: string;
  scenario: string;
  descriptionHtml: string;
  alternateGreetings: string[];
  rawCardV2?: any;
}

export interface CommunityCategory {
  label: string;
  value: string;
  tagId: string;
}

export const POPULAR_COMMUNITY_CATEGORIES: CommunityCategory[] = [
  { label: 'All', value: 'all', tagId: '' },
  { label: 'Female', value: 'female', tagId: '3' },
  { label: 'Male', value: 'male', tagId: '4' },
  { label: 'Anime', value: 'anime', tagId: '55' },
  { label: 'Fantasy / Magic', value: 'magical', tagId: '67' },
  { label: 'Romance / Fluff', value: 'fluff', tagId: '18' },
  { label: 'Enemies to Lovers', value: 'enemiestolovers', tagId: '60' },
  { label: 'Dominant', value: 'dominant', tagId: '26' },
  { label: 'Submissive', value: 'submissive', tagId: '51' },
  { label: 'Demi-Human', value: 'demihuman', tagId: '69' },
  { label: 'Non-human', value: 'nonhuman', tagId: '54' },
  { label: 'Furry', value: 'furry', tagId: '52' },
  { label: 'Game / RPG', value: 'game', tagId: '72' },
  { label: 'Villain', value: 'villain', tagId: '73' },
  { label: 'Hero', value: 'hero', tagId: '50' },
  { label: 'Royalty', value: 'royalty', tagId: '25' },
  { label: 'Angst', value: 'angst', tagId: '19' },
  { label: 'Comedy', value: 'comedy', tagId: '9' }
];

class CommunityCatalogService {
  private baseUrls = [
    '', // Relative URL (Vite dev server handles /api/community via plugin)
    'http://localhost:3001' // Dedicated Express proxy server fallback
  ];

  private activeBaseUrlIndex = 0;

  // Client-side memory cache so switching tabs (Trending <-> Popular <-> Latest) is 0ms instant
  private clientQueryCache = new Map<
    string,
    {
      data: { characters: CommunityCharacter[]; totalCount: number; hasMore: boolean };
      expiresAt: number;
    }
  >();

  private clientDetailCache = new Map<
    string,
    {
      data: CommunityCharacterDetail;
      expiresAt: number;
    }
  >();

  private async fetchWithFallback(endpoint: string): Promise<Response> {
    const originalIndex = this.activeBaseUrlIndex;
    let attempts = 0;

    while (attempts < this.baseUrls.length) {
      const base = this.baseUrls[this.activeBaseUrlIndex];
      const url = `${base}${endpoint}`;
      try {
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json'
          }
        });
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            return res;
          }
        }
        console.warn(`[CommunityCatalogService] ${url} returned ${res.status}, trying fallback`);
      } catch (err) {
        console.warn(`[CommunityCatalogService] Error connecting to ${url}:`, err);
      }

      // Cycle to next base URL
      this.activeBaseUrlIndex = (this.activeBaseUrlIndex + 1) % this.baseUrls.length;
      attempts++;
    }

    // Reset index to original for next calls
    this.activeBaseUrlIndex = originalIndex;
    throw new Error('Unable to connect to community character catalog service.');
  }

  /**
   * Pure Single-Page App (SPA) Direct Browser Fallback via Chub.ai public CORS API
   * Used automatically if Warden AI is hosted statically without a Node.js backend.
   */
  private async fetchDirectBrowserFallback(params: {
    search?: string;
    limit?: number;
    offset?: number;
    sort?: 'recent' | 'fresh' | 'popular' | 'trending' | 'latest';
    sfwOnly?: boolean;
  }): Promise<{
    characters: CommunityCharacter[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const limit = params.limit || 24;
    const page = Math.floor((params.offset || 0) / limit) + 1;
    const sortMap: Record<string, string> = {
      popular: 'download_count',
      trending: 'trending_downloads',
      latest: 'created_at',
      fresh: 'created_at',
      recent: 'created_at'
    };
    const chubSort = sortMap[params.sort || 'trending'] || 'trending_downloads';

    const q = new URLSearchParams({
      first: String(limit),
      page: String(page),
      namespace: 'characters',
      sort: chubSort,
      asc: 'false',
      nsfw: params.sfwOnly ? 'false' : 'true',
      nsfl: 'false'
    });
    if (params.search?.trim()) {
      q.set('search', params.search.trim());
    }

    const res = await fetch(`https://api.chub.ai/search?${q.toString()}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`Direct browser catalog fallback failed (${res.status})`);
    }
    const json = await res.json();
    const nodes: any[] = json?.data?.nodes || json?.nodes || [];

    const characters: CommunityCharacter[] = nodes.map((node, idx) => {
      const fullPath: string = node.fullPath || node.id || `chub-${idx}`;
      const creator = fullPath.includes('/') ? fullPath.split('/')[0] : 'community';
      const rawDesc = String(node.tagline || node.description || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return {
        id: fullPath,
        characterId: fullPath,
        name: node.name || 'Unnamed Character',
        chatName: node.name || '',
        creatorName: creator,
        avatarUrl:
          node.avatar_url ||
          (fullPath && !fullPath.startsWith('chub-') && fullPath.includes('/')
            ? `https://avatars.charhub.io/avatars/${fullPath}/avatar.webp`
            : '') ||
          node.max_res_url ||
          node.avatar ||
          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500',
        shortDescription: rawDesc.slice(0, 220),
        isNsfw: Boolean(node.nsfw_image || (node.topics || []).includes('NSFW')),
        totalTokens: Number(node.nTokens) || 850,
        chatCount: Number(node.starCount || node.nChats || 0),
        messageCount: Number(node.nMessages || node.ratingCount || 0),
        favoritesCount: Number(node.nFavorites || node.starCount || 0),
        tags: Array.isArray(node.topics)
          ? node.topics.slice(0, 8).map((t: string, i: number) => ({
              id: i + 1,
              name: String(t),
              slug: String(t).toLowerCase().replace(/\s+/g, '-')
            }))
          : [],
        firstPublishedAt: node.createdAt,
        createdAt: node.createdAt
      };
    });

    return {
      characters,
      totalCount: Number(json?.data?.count) || 120000,
      hasMore: characters.length >= limit
    };
  }

  /**
   * Search / Browse community characters (with client cache + SPA fallback)
   */
  public async getCharacters(params: {
    search?: string;
    tagIds?: string;
    limit?: number;
    offset?: number;
    sort?: 'recent' | 'fresh' | 'popular' | 'trending' | 'latest';
    creators?: string;
    sfwOnly?: boolean;
    forceRefresh?: boolean;
  }): Promise<{
    characters: CommunityCharacter[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const q = new URLSearchParams();
    if (params.search?.trim()) q.set('search', params.search.trim());
    if (params.tagIds?.trim()) q.set('tagIds', params.tagIds.trim());
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset !== undefined) q.set('offset', String(params.offset));
    if (params.sort) q.set('sort', params.sort);
    if (params.creators?.trim()) q.set('creators', params.creators.trim());
    if (params.sfwOnly) q.set('sfwOnly', '1');

    const cacheKey = q.toString();
    const now = Date.now();
    const cached = this.clientQueryCache.get(cacheKey);

    if (!params.forceRefresh && cached && now < cached.expiresAt) {
      return cached.data;
    }

    if (params.forceRefresh) {
      q.set('refresh', '1');
    }

    const ttlMs =
      params.sort === 'popular' || params.sort === 'trending' ? 3 * 60 * 1000 : 90 * 1000;

    try {
      const res = await this.fetchWithFallback(`/api/community/characters?${q.toString()}`);
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch characters');
      }

      const payload = {
        characters: data.characters || [],
        totalCount: data.totalCount || 0,
        hasMore: Boolean(data.hasMore)
      };

      this.clientQueryCache.set(cacheKey, { data: payload, expiresAt: now + ttlMs });
      return payload;
    } catch (proxyErr) {
      if (cached) {
        return cached.data;
      }
      // If deployed as a standalone static Single-Page Web App (no local proxy), use direct browser fallback
      console.info('[CommunityCatalogService] Using direct browser SPA catalog fallback');
      const fallbackPayload = await this.fetchDirectBrowserFallback(params);
      this.clientQueryCache.set(cacheKey, { data: fallbackPayload, expiresAt: now + ttlMs });
      return fallbackPayload;
    }
  }

  /**
   * Fetch full character detail (cached on client for 10 minutes, with standalone APK/SPA fallback)
   */
  public async getCharacterDetail(id: string): Promise<CommunityCharacterDetail> {
    const now = Date.now();
    const cached = this.clientDetailCache.get(id);
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }

    try {
      const res = await this.fetchWithFallback(`/api/community/characters/${encodeURIComponent(id)}`);
      const data = await res.json();

      if (!data.success || !data.character) {
        throw new Error(data.error || 'Failed to fetch character detail');
      }

      this.clientDetailCache.set(id, { data: data.character, expiresAt: now + 10 * 60 * 1000 });
      return data.character;
    } catch {
      // Standalone APK / SPA fallback via Chub public API
      const chubRes = await fetch(`https://api.chub.ai/api/characters/${id}?full=true`, {
        headers: { Accept: 'application/json' }
      });
      if (!chubRes.ok) {
        throw new Error(`Unable to fetch character detail (${chubRes.status})`);
      }
      const chubJson = await chubRes.json();
      const node = chubJson?.node || chubJson?.data?.node || chubJson;
      const def = node?.definition || {};
      const fullPath: string = node?.fullPath || id;
      const creator = cleanCreatorHandle(fullPath.includes('/') ? fullPath.split('/')[0] : node?.creator || 'community');

      const detail: CommunityCharacterDetail = {
        id: fullPath,
        characterId: fullPath,
        name: node?.name || def?.name || 'Character',
        chatName: def?.name || node?.name || '',
        creatorName: creator,
        avatarUrl:
          node?.avatar_url ||
          (fullPath && !fullPath.startsWith('chub-') && fullPath.includes('/')
            ? `https://avatars.charhub.io/avatars/${fullPath}/avatar.webp`
            : '') ||
          node?.max_res_url ||
          node?.avatar ||
          'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500',
        shortDescription: String(node?.tagline || node?.description || '').replace(/<[^>]*>/g, ' ').trim().slice(0, 260),
        isNsfw: Boolean(node?.nsfw_image || (node?.topics || []).includes('NSFW')),
        totalTokens: Number(node?.nTokens) || 850,
        chatCount: Number(node?.starCount || node?.nChats || 0),
        messageCount: Number(node?.nMessages || 0),
        favoritesCount: Number(node?.nFavorites || node?.starCount || 0),
        tags: Array.isArray(node?.topics)
          ? node.topics.slice(0, 8).map((t: string, i: number) => ({
              id: i + 1,
              name: String(t),
              slug: String(t).toLowerCase().replace(/\s+/g, '-')
            }))
          : [],
        firstMessage: def?.first_message || def?.greeting || `*${node?.name || 'They'} look at you with quiet interest.*`,
        personality: def?.personality || def?.description || node?.description || 'Expressive roleplay companion.',
        scenario: def?.scenario || node?.tagline || '',
        descriptionHtml: node?.description || def?.description || '',
        alternateGreetings: Array.isArray(def?.alternate_greetings) ? def.alternate_greetings : []
      };

      this.clientDetailCache.set(id, { data: detail, expiresAt: now + 10 * 60 * 1000 });
      return detail;
    }
  }

  /**
   * Convert community character to Warden AI ImportedCardData format
   */
  public toImportedCardData(
    summary: CommunityCharacter,
    detail?: CommunityCharacterDetail
  ): ImportedCardData {
    const rawTitle = CharacterImportService.sanitizeText(summary.name);
    const candidateChatName = CharacterImportService.sanitizeText(
      detail?.chatName || summary.chatName || detail?.rawCardV2?.data?.name || ''
    );

    const personality = CharacterImportService.sanitizeText(
      detail?.personality || summary.shortDescription || 'Observant, adaptive and expressive companion.'
    );

    const firstMessage = CharacterImportService.sanitizeText(
      detail?.firstMessage ||
        `*${rawTitle} looks over at you, their gaze lingering with quiet interest.* "Hello there. What brings you to see me?"`
    );

    // Prioritize clean chatName if valid and different from raw title; otherwise cleanly extract name from title/prompt
    const name =
      candidateChatName && candidateChatName !== rawTitle && candidateChatName.length <= 34
        ? candidateChatName
        : extractCleanCharacterName(
            rawTitle,
            summary.shortDescription,
            firstMessage,
            personality
          );

    const subtitle = rawTitle !== name ? rawTitle : CharacterImportService.sanitizeText(summary.shortDescription || '');

    const richFullDesc = CharacterImportService.sanitizeText(
      detail?.descriptionHtml ||
        summary.shortDescription ||
        `${name} — community roleplay character.`
    );
    const shortDesc = CharacterImportService.sanitizeText(
      summary.shortDescription || richFullDesc.slice(0, 300)
    );

    const background = CharacterImportService.sanitizeText(
      detail?.descriptionHtml
        ? `${richFullDesc}${detail?.scenario ? `\n\n${CharacterImportService.sanitizeText(detail.scenario)}` : ''}`
        : detail?.scenario || shortDesc || 'Imported from Datacat / JanitorAI Community Catalog.'
    );

    const tagStrings = summary.tags.map(t =>
      t.slug ? t.slug.toLowerCase() : t.name.toLowerCase().replace(/\s+/g, '-')
    );
    if (!tagStrings.includes('community')) tagStrings.push('community');
    if (!tagStrings.includes('janitorai')) tagStrings.push('janitorai');

    const contentRating: ContentRating = summary.isNsfw ? 'NSFW' : 'SFW';

    return {
      name,
      subtitle: subtitle || undefined,
      shortDescription: shortDesc,
      personality,
      background,
      exampleDialogue:
        detail?.rawCardV2?.data?.mes_example ||
        `<START>\n{{user}}: "Hello."\n{{char}}: *smiles warmly* "Greetings."`,
      firstMessage,
      alternateGreetings: detail?.alternateGreetings || [],
      creatorNotes: `Imported from Datacat / JanitorAI community database. Original creator: @${cleanCreatorHandle(summary.creatorName)}`,
      creatorUsername: cleanCreatorHandle(summary.creatorName),
      tags: tagStrings,
      avatarUrl: summary.avatarUrl,
      contentRating,
      age: 21,
      originalFormat: 'chara_card_v2',
      unsupportedFields: [],
      missingMandatoryFields: []
    };
  }
}

export const communityCatalogService = new CommunityCatalogService();
