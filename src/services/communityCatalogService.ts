/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImportedCardData, CharacterImportService } from './characterImportService';
import { ContentRating } from '../types';
import { cleanCreatorHandle, extractCleanCharacterName } from './aiProviderService';
import { getHighResImageUrl, isDefaultPlaceholderAvatar } from '../utils/imageUtils';

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

export type CommunityCatalogSource = 'janitor' | 'chub';

class CommunityCatalogService {
  private getBaseUrls(): string[] {
    const urls: string[] = [''];
    try {
      const customProxy = localStorage.getItem('warden_community_proxy_url');
      if (customProxy && customProxy.trim()) {
        urls.push(customProxy.trim().replace(/\/+$/, ''));
      }
    } catch {}
    urls.push('http://localhost:3001');
    return urls;
  }

  private activeBaseUrlIndex = 0;
  private datacatSessionToken: string = '';
  private datacatTokenExpiresAt: number = 0;
  private datacatIdentifyPromise: Promise<string> | null = null;

  public getActiveSource(): CommunityCatalogSource {
    try {
      const s = localStorage.getItem('warden_catalog_source');
      if (s === 'janitor' || s === 'chub') return s;
    } catch {}
    return 'janitor';
  }

  public setActiveSource(source: CommunityCatalogSource) {
    try {
      localStorage.setItem('warden_catalog_source', source);
      this.clientQueryCache.clear();
      window.dispatchEvent(
        new CustomEvent('warden:catalog-source-changed', { detail: { source } })
      );
    } catch {}
  }

  private async ensureDatacatSession(): Promise<string> {
    if (this.datacatSessionToken && Date.now() < this.datacatTokenExpiresAt) {
      return this.datacatSessionToken;
    }
    if (this.datacatIdentifyPromise) {
      return this.datacatIdentifyPromise;
    }

    this.datacatIdentifyPromise = (async () => {
      try {
        const rand = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map(r => r.toString(16).padStart(2, '0'))
          .join('');
        const deviceToken = `anon_${rand}_${Date.now().toString(36)}`;
        const res = await fetch('https://datacat.run/api/liberator/identify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://datacat.run',
            Referer: 'https://datacat.run/'
          },
          body: JSON.stringify({ deviceToken })
        });
        if (!res.ok) throw new Error(`Identify status ${res.status}`);
        const data = await res.json();
        if (data.sessionToken) {
          this.datacatSessionToken = data.sessionToken;
          this.datacatTokenExpiresAt = Date.now() + 6 * 3600 * 1000;
          return data.sessionToken;
        }
        throw new Error('No sessionToken in identify response');
      } finally {
        this.datacatIdentifyPromise = null;
      }
    })();

    return this.datacatIdentifyPromise;
  }

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
    const baseUrls = this.getBaseUrls();
    const originalIndex = this.activeBaseUrlIndex;
    let attempts = 0;

    while (attempts < baseUrls.length) {
      const base = baseUrls[this.activeBaseUrlIndex % baseUrls.length];
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
      this.activeBaseUrlIndex = (this.activeBaseUrlIndex + 1) % baseUrls.length;
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

      const isCharhub = Boolean(fullPath && !fullPath.startsWith('chub-') && fullPath.includes('/'));
      const hdCard = isCharhub ? `https://avatars.charhub.io/avatars/${fullPath}/chara_card_v2.png` : '';
      const rawAvatar = isCharhub ? `https://avatars.charhub.io/avatars/${fullPath}/avatar_raw.webp` : '';
      const thumbAvatar = isCharhub ? `https://avatars.charhub.io/avatars/${fullPath}/avatar.webp` : '';

      const candidateAvatar =
        node.max_res_url ||
        hdCard ||
        rawAvatar ||
        node.avatar_url ||
        node.avatar ||
        thumbAvatar ||
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500';

      const avatarUrl = getHighResImageUrl(candidateAvatar);

      return {
        id: fullPath,
        characterId: fullPath,
        name: node.name || 'Unnamed Character',
        chatName: node.name || '',
        creatorName: creator,
        avatarUrl,
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
   * Direct mobile/APK client query to Datacat.run (JanitorAI database)
   */
  private async fetchDirectDatacat(params: {
    search?: string;
    tagIds?: string;
    limit?: number;
    offset?: number;
    sort?: 'recent' | 'fresh' | 'popular' | 'trending' | 'latest';
    sfwOnly?: boolean;
  }): Promise<{
    characters: CommunityCharacter[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const sessionToken = await this.ensureDatacatSession();
    const limit = params.limit || 24;
    const offset = params.offset || 0;
    const fetchLimit =
      params.sort === 'popular' || params.sort === 'trending'
        ? Math.min(60, Math.max(limit * 2, 48))
        : limit;

    const query = new URLSearchParams({
      limit: String(fetchLimit),
      offset: String(offset),
      summary: '1',
      skipCount: '1'
    });
    if (params.search?.trim()) query.set('search', params.search.trim());
    if (params.tagIds?.trim()) query.set('tagIds', params.tagIds.trim());

    const res = await fetch(`https://datacat.run/api/characters/recent-public?${query.toString()}`, {
      headers: {
        'X-Session-Token': sessionToken,
        Origin: 'https://datacat.run',
        Referer: 'https://datacat.run/'
      }
    });

    if (!res.ok) {
      throw new Error(`Direct Datacat query failed (${res.status})`);
    }

    const data = await res.json();
    const rawList: any[] = data.characters || [];

    let characters: CommunityCharacter[] = rawList.map(item => {
      const candidate =
        item.avatarVariantUrls?.card ||
        item.avatarVariantUrls?.hero ||
        item.avatarVariantUrls?.raw ||
        item.avatarDisplayUrl ||
        item.avatar ||
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500';

      const avatarUrl = getHighResImageUrl(candidate);

      return {
        id: item.characterId || item.id,
        characterId: item.characterId || item.id,
        name: item.name || 'Unnamed Character',
        chatName: item.name || '',
        creatorName: cleanCreatorHandle(item.creatorName || item.creator_name || 'community'),
        avatarUrl,
        shortDescription: (item.description || item.personality || '').slice(0, 260),
        isNsfw: Boolean(item.nsfw || item.is_nsfw || item.rating === 'nsfw'),
        totalTokens: Number(item.totalTokens || item.tokenCount) || 850,
        chatCount: item.stats?.chat || 0,
        messageCount: item.stats?.message || 0,
        favoritesCount: item.stats?.favoritesCount?.favoritesCount || item.stats?.favorites || 0,
        tags: Array.isArray(item.tags)
          ? item.tags.map((t: any) => ({
              id: t.id,
              name: t.name || String(t),
              slug: t.slug || String(t).toLowerCase().replace(/\s+/g, '-')
            }))
          : [],
        firstPublishedAt: item.firstPublishedAt || item.first_published_at,
        createdAt: item.createdAt || item.created_at
      };
    });

    if (params.sfwOnly) {
      characters = characters.filter(c => !c.isNsfw);
    }

    if (params.sort === 'popular') {
      characters.sort((a, b) => {
        const scoreA = (a.chatCount || 0) * 3 + (a.messageCount || 0) + (a.favoritesCount || 0) * 5;
        const scoreB = (b.chatCount || 0) * 3 + (b.messageCount || 0) + (b.favoritesCount || 0) * 5;
        return scoreB - scoreA;
      });
    } else if (params.sort === 'trending') {
      const now = Date.now();
      characters.sort((a, b) => {
        const timeA = new Date(a.firstPublishedAt || a.createdAt || now).getTime();
        const timeB = new Date(b.firstPublishedAt || b.createdAt || now).getTime();
        const hoursA = Math.max(1, (now - timeA) / 3600000);
        const hoursB = Math.max(1, (now - timeB) / 3600000);
        const engagementA = (a.chatCount || 0) * 2 + (a.favoritesCount || 0) * 6 + (a.messageCount || 0) * 0.5 + 15;
        const engagementB = (b.chatCount || 0) * 2 + (b.favoritesCount || 0) * 6 + (b.messageCount || 0) * 0.5 + 15;
        return engagementB / Math.pow(hoursB + 2, 0.6) - engagementA / Math.pow(hoursA + 2, 0.6);
      });
    }

    const paged = characters.slice(0, limit);

    return {
      characters: paged,
      totalCount: 50000,
      hasMore: characters.length >= limit
    };
  }

  /**
   * Fetch single character directly from Datacat API
   */
  private async fetchDirectDatacatDetail(id: string): Promise<CommunityCharacterDetail> {
    const sessionToken = await this.ensureDatacatSession();
    const res = await fetch(`https://datacat.run/api/characters/${encodeURIComponent(id)}`, {
      headers: {
        'X-Session-Token': sessionToken,
        Origin: 'https://datacat.run',
        Referer: 'https://datacat.run/'
      }
    });
    if (!res.ok) throw new Error(`Datacat detail status ${res.status}`);
    const data = await res.json();
    const c = data.character || data;

    const candidate =
      c.avatarVariantUrls?.hero ||
      c.avatarVariantUrls?.card ||
      c.avatarVariantUrls?.raw ||
      c.avatarDisplayUrl ||
      c.avatar ||
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500';

    const avatarUrl = getHighResImageUrl(candidate);

    return {
      id: c.character_id || c.characterId || id,
      characterId: c.character_id || c.characterId || id,
      name: c.name || 'Character',
      chatName: c.name || '',
      creatorName: cleanCreatorHandle(c.creatorName || c.creator_name || 'community'),
      avatarUrl,
      shortDescription: (c.description || c.personality || '').slice(0, 260),
      isNsfw: Boolean(c.nsfw || c.is_nsfw || c.rating === 'nsfw'),
      totalTokens: Number(c.totalTokens || c.tokenCount) || 850,
      chatCount: c.stats?.chat || 0,
      messageCount: c.stats?.message || 0,
      favoritesCount: c.stats?.favoritesCount?.favoritesCount || c.stats?.favorites || 0,
      tags: Array.isArray(c.tags)
        ? c.tags.map((t: any) => ({
            id: t.id,
            name: t.name || String(t),
            slug: t.slug || String(t).toLowerCase().replace(/\s+/g, '-')
          }))
        : [],
      firstPublishedAt: c.firstPublishedAt || c.first_published_at,
      createdAt: c.createdAt || c.created_at,
      firstMessage: c.firstMessage || c.first_message || '',
      personality: c.personality || '',
      scenario: c.scenario || '',
      descriptionHtml: c.descriptionHtml || c.description_html || c.description || '',
      alternateGreetings: Array.isArray(c.alternateGreetings) ? c.alternateGreetings : []
    };
  }

  /**
   * Search / Browse community characters (with client cache + dynamic Janitor/Chub source selection)
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
    source?: CommunityCatalogSource;
  }): Promise<{
    characters: CommunityCharacter[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const activeSource = params.source || this.getActiveSource();
    const q = new URLSearchParams();
    if (params.search?.trim()) q.set('search', params.search.trim());
    if (params.tagIds?.trim()) q.set('tagIds', params.tagIds.trim());
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset !== undefined) q.set('offset', String(params.offset));
    if (params.sort) q.set('sort', params.sort);
    if (params.creators?.trim()) q.set('creators', params.creators.trim());
    if (params.sfwOnly) q.set('sfwOnly', '1');
    q.set('source', activeSource);

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

    // 1. If active source is explicitly Chub.ai, fetch directly from Chub
    if (activeSource === 'chub') {
      try {
        const chubPayload = await this.fetchDirectBrowserFallback(params);
        this.clientQueryCache.set(cacheKey, { data: chubPayload, expiresAt: now + ttlMs });
        return chubPayload;
      } catch (err) {
        console.warn('[CommunityCatalogService] Chub search error:', err);
      }
    }

    // 2. Active source is JanitorAI: try proxy first, then direct Datacat, then fallback to Chub
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
    } catch {
      // Direct Datacat on standalone Android APK
      try {
        const directPayload = await this.fetchDirectDatacat(params);
        this.clientQueryCache.set(cacheKey, { data: directPayload, expiresAt: now + ttlMs });
        return directPayload;
      } catch {
        // Fallback to Chub if Datacat fails
        console.info('[CommunityCatalogService] Fallback to Chub catalog');
        const fallbackPayload = await this.fetchDirectBrowserFallback(params);
        this.clientQueryCache.set(cacheKey, { data: fallbackPayload, expiresAt: now + ttlMs });
        return fallbackPayload;
      }
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

    // Chub.ai characters have slashes in their ID (creator/character-slug)
    const isChubCharacter = id.includes('/');

    if (!isChubCharacter) {
      try {
        const res = await this.fetchWithFallback(
          `/api/community/characters/${encodeURIComponent(id)}`
        );
        const data = await res.json();

        if (data.success && data.character) {
          this.clientDetailCache.set(id, { data: data.character, expiresAt: now + 10 * 60 * 1000 });
          return data.character;
        }
      } catch {
        // Try direct Datacat
        try {
          const detail = await this.fetchDirectDatacatDetail(id);
          this.clientDetailCache.set(id, { data: detail, expiresAt: now + 10 * 60 * 1000 });
          return detail;
        } catch {}
      }
    }
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

      const isCharhub = Boolean(fullPath && !fullPath.startsWith('chub-') && fullPath.includes('/'));
      const hdCard = isCharhub ? `https://avatars.charhub.io/avatars/${fullPath}/chara_card_v2.png` : '';
      const rawAvatar = isCharhub ? `https://avatars.charhub.io/avatars/${fullPath}/avatar_raw.webp` : '';
      const thumbAvatar = isCharhub ? `https://avatars.charhub.io/avatars/${fullPath}/avatar.webp` : '';

      const detailCandidate =
        node?.max_res_url ||
        hdCard ||
        rawAvatar ||
        node?.avatar_url ||
        node?.avatar ||
        thumbAvatar ||
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500';

      const avatarUrl = getHighResImageUrl(detailCandidate);

      const detail: CommunityCharacterDetail = {
        id: fullPath,
        characterId: fullPath,
        name: node?.name || def?.name || 'Character',
        chatName: def?.name || node?.name || '',
        creatorName: creator,
        avatarUrl,
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
      avatarUrl: getHighResImageUrl(detail?.avatarUrl || summary.avatarUrl),
      contentRating,
      age: 21,
      originalFormat: 'chara_card_v2',
      unsupportedFields: [],
      missingMandatoryFields: []
    };
  }
}

export const communityCatalogService = new CommunityCatalogService();
