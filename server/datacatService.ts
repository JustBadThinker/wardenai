/**
 * Warden AI — Community Catalog Backend Service
 * Bridges to Datacat / JanitorAI-compatible character database.
 * Manages anonymous device session tokens automatically without credentials.
 */

import type { IncomingMessage, ServerResponse } from 'http';

export interface CommunityCharacterSummary {
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

export interface CommunityCharacterDetail extends CommunityCharacterSummary {
  firstMessage: string;
  personality: string;
  scenario: string;
  descriptionHtml: string;
  alternateGreetings: string[];
  rawCardV2?: any;
}

function cleanCreatorString(raw?: string): string {
  if (!raw) return 'Community Creator';
  let clean = raw.trim().replace(/^@+/, '');
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    const parts = clean.replace(/\/+$/, '').split('/');
    const last = parts[parts.length - 1] || 'creator';
    if (/^[0-9a-f-]{20,}$/i.test(last)) {
      return `janitor_${last.slice(0, 6)}`;
    }
    return last.length > 20 ? `${last.slice(0, 16)}…` : last;
  }
  return clean;
}

function getHighResImageUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.includes('/thumb.webp')) {
    return trimmed.replace('/thumb.webp', '/card.webp');
  }
  if (trimmed.includes('/avatar.webp') && !trimmed.includes('charhub.io')) {
    return trimmed.replace('/avatar.webp', '/card.webp');
  }
  if (trimmed.includes('charhub.io') && trimmed.includes('/avatar.webp')) {
    return trimmed.replace('/avatar.webp', '/chara_card_v2.png');
  }
  return trimmed;
}

class DatacatService {
  private deviceToken: string = '';
  private sessionToken: string = '';
  private authPromise: Promise<string> | null = null;
  private tokenExpiresAt: number = 0;

  // Smart in-memory TTL cache to prevent upstream rate-limiting & make tab switching instant
  private queryCache = new Map<
    string,
    {
      data: { characters: CommunityCharacterSummary[]; totalCount: number; hasMore: boolean };
      expiresAt: number;
    }
  >();
  private detailCache = new Map<
    string,
    {
      data: CommunityCharacterDetail;
      expiresAt: number;
    }
  >();

  private pruneCaches() {
    if (this.queryCache.size > 150) {
      const oldestKey = this.queryCache.keys().next().value;
      if (oldestKey) this.queryCache.delete(oldestKey);
    }
    if (this.detailCache.size > 200) {
      const oldestKey = this.detailCache.keys().next().value;
      if (oldestKey) this.detailCache.delete(oldestKey);
    }
  }

  private generateDeviceToken(): string {
    const e = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(r => r.toString(16).padStart(2, '0'))
      .join('');
    const t = Date.now().toString(36);
    return `anon_${e}_${t}`;
  }

  public async ensureSession(forceFresh = false): Promise<string> {
    if (!forceFresh && this.sessionToken && Date.now() < this.tokenExpiresAt) {
      return this.sessionToken;
    }
    if (this.authPromise) {
      return this.authPromise;
    }

    this.authPromise = (async () => {
      try {
        if (!this.deviceToken || forceFresh) {
          this.deviceToken = this.generateDeviceToken();
        }
        console.log('[DatacatService] Requesting anonymous session token...');
        const res = await fetch('https://datacat.run/api/liberator/identify', {
          method: 'POST',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Origin: 'https://datacat.run',
            Referer: 'https://datacat.run/'
          },
          body: JSON.stringify({ deviceToken: this.deviceToken })
        });

        if (!res.ok) {
          throw new Error(`Identify failed with status ${res.status}`);
        }

        const data = await res.json();
        if (data.sessionToken) {
          this.sessionToken = data.sessionToken;
          // Set expiry to 3 hours from now
          this.tokenExpiresAt = Date.now() + 3 * 60 * 60 * 1000;
          console.log('[DatacatService] Anonymous session established successfully');
          return this.sessionToken;
        }
        throw new Error('No session token in identify response');
      } catch (err) {
        console.error('[DatacatService] Session initialization error:', err);
        throw err;
      } finally {
        this.authPromise = null;
      }
    })();

    return this.authPromise;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    let token = await this.ensureSession();
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'application/json',
      Origin: 'https://datacat.run',
      Referer: 'https://datacat.run/',
      'X-Session-Token': token,
      'X-Device-Token': this.deviceToken,
      ...((options.headers as Record<string, string>) || {})
    };

    let res = await fetch(`https://datacat.run${endpoint}`, { ...options, headers });

    // Handle token expiration: retry once with fresh session
    if (res.status === 401) {
      console.warn('[DatacatService] Received 401, renewing session token...');
      token = await this.ensureSession(true);
      headers['X-Session-Token'] = token;
      headers['X-Device-Token'] = this.deviceToken;
      res = await fetch(`https://datacat.run${endpoint}`, { ...options, headers });
    }

    return res;
  }

  /**
   * Search / Browse community characters (with smart TTL cache + stale fallback)
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
    characters: CommunityCharacterSummary[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const limit = Math.min(Math.max(params.limit || 24, 1), 60);
    const offset = Math.max(params.offset || 0, 0);
    const sortMode = params.sort || 'recent';

    const cacheKey = JSON.stringify({
      s: (params.search || '').trim().toLowerCase(),
      t: (params.tagIds || '').trim(),
      l: limit,
      o: offset,
      sort: sortMode,
      c: (params.creators || '').trim().toLowerCase(),
      sfw: Boolean(params.sfwOnly)
    });

    const now = Date.now();
    const cached = this.queryCache.get(cacheKey);
    if (!params.forceRefresh && cached && now < cached.expiresAt) {
      return cached.data;
    }

    // 2 min TTL for latest/fresh so new bots appear fast; 5 min TTL for popular/trending
    const ttlMs =
      sortMode === 'popular' || sortMode === 'trending' ? 5 * 60 * 1000 : 2 * 60 * 1000;

    try {
      // If querying specific followed creators (comma-separated handles), fetch their cards in parallel
      if (params.creators && params.creators.trim()) {
        const creatorHandles = params.creators
          .split(',')
          .map(c => c.trim())
          .filter(Boolean)
          .slice(0, 12);

        const results = await Promise.all(
          creatorHandles.map(async handle => {
            try {
              const q = new URLSearchParams({
                limit: '20',
                offset: '0',
                summary: '1',
                skipCount: '1',
                search: handle
              });
              const r = await this.request(`/api/characters/recent-public?${q.toString()}`);
              if (!r.ok) return [];
              const d = await r.json();
              const list: any[] = d.characters || [];
              return list.filter(
                item =>
                  (item.creatorName || item.creator_name || '').toLowerCase() ===
                    handle.toLowerCase() || list.length <= 5
              );
            } catch {
              return [];
            }
          })
        );

        const seen = new Set<string>();
        const mergedRaw: any[] = [];
        for (const group of results) {
          for (const item of group) {
            const cid = item.characterId || item.id;
            if (cid && !seen.has(cid)) {
              seen.add(cid);
              mergedRaw.push(item);
            }
          }
        }

        let mapped = this.mapRawCharacters(mergedRaw);
        if (params.sfwOnly) {
          mapped = mapped.filter(c => !c.isNsfw);
        }
        this.sortMappedCharacters(mapped, sortMode);

        const paged = mapped.slice(offset, offset + limit);
        const resultPayload = {
          characters: paged,
          totalCount: mapped.length,
          hasMore: offset + limit < mapped.length
        };
        this.pruneCaches();
        this.queryCache.set(cacheKey, { data: resultPayload, expiresAt: now + ttlMs });
        return resultPayload;
      }

      // For standard catalog browse/search: request a wider window when sorting by popular/trending
      const fetchLimit =
        sortMode === 'popular' || sortMode === 'trending'
          ? Math.min(60, Math.max(limit * 2, 48))
          : limit;
      const query = new URLSearchParams({
        limit: String(fetchLimit),
        offset: String(offset),
        summary: '1',
        skipCount: '1'
      });

      if (params.search && params.search.trim()) {
        query.set('search', params.search.trim());
      }

      if (params.tagIds && params.tagIds.trim()) {
        query.set('tagIds', params.tagIds.trim());
      }

      // Always use /api/characters/recent-public (reliable across all filters & sort modes)
      const endpoint = `/api/characters/recent-public?${query.toString()}`;

      const res = await this.request(endpoint);
      if (!res.ok) {
        throw new Error(`Datacat characters query failed with status ${res.status}`);
      }

      const data = await res.json();
      const rawList: any[] = data.characters || [];

      let characters = this.mapRawCharacters(rawList);

      if (params.sfwOnly) {
        characters = characters.filter(c => !c.isNsfw);
      }

      this.sortMappedCharacters(characters, sortMode);
      const sliced = characters.slice(0, limit);

      const estimatedTotal =
        Number(data.totalCount) ||
        (params.search || params.tagIds
          ? Math.max(
              sliced.length,
              offset + (rawList.length >= limit ? limit * 5 : sliced.length)
            )
          : 214520);

      const resultPayload = {
        characters: sliced,
        totalCount: estimatedTotal,
        hasMore: Boolean(data.hasMore ?? rawList.length >= limit)
      };

      this.pruneCaches();
      this.queryCache.set(cacheKey, { data: resultPayload, expiresAt: now + ttlMs });
      return resultPayload;
    } catch (err) {
      // Stale-while-error fallback: if we have an expired cached response, return it rather than failing
      if (cached) {
        console.warn('[DatacatService] Upstream error, serving stale cached catalog:', err);
        return cached.data;
      }
      throw err;
    }
  }

  private mapRawCharacters(rawList: any[]): CommunityCharacterSummary[] {
    return rawList.map(item => {
      const cleanDesc = (item.description || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

      const candidate =
        item.avatarVariantUrls?.card ||
        item.avatarVariantUrls?.hero ||
        item.avatarVariantUrls?.raw ||
        item.avatarDisplayUrl ||
        item.avatar ||
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500';

      const avatar = getHighResImageUrl(candidate);

      return {
        id: item.characterId || item.id,
        characterId: item.characterId || item.id,
        name: item.name || 'Unnamed Character',
        chatName: item.chatName || item.chat_name || item.name || '',
        creatorName: cleanCreatorString(item.creatorName || item.creator_name),
        creatorId: item.creatorId || item.creator_id,
        avatarUrl: avatar,
        shortDescription: cleanDesc.slice(0, 220),
        isNsfw: Boolean(item.isNsfw || item.is_nsfw),
        totalTokens: item.totalTokens || item.total_tokens || item.token_counts?.total_tokens || 0,
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
  }

  private sortMappedCharacters(
    characters: CommunityCharacterSummary[],
    sortMode: 'recent' | 'fresh' | 'popular' | 'trending' | 'latest'
  ) {
    if (sortMode === 'popular') {
      characters.sort((a, b) => {
        const scoreA = (a.chatCount || 0) * 3 + (a.messageCount || 0) + (a.favoritesCount || 0) * 5;
        const scoreB = (b.chatCount || 0) * 3 + (b.messageCount || 0) + (b.favoritesCount || 0) * 5;
        return scoreB - scoreA;
      });
    } else if (sortMode === 'trending') {
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
    } else {
      // 'recent' | 'fresh' | 'latest' — newest timestamp first
      characters.sort((a, b) => {
        const timeA = new Date(a.firstPublishedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.firstPublishedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
    }
  }

  /**
   * Fetch full character definition by ID (cached for 10 minutes)
   */
  public async getCharacterDetail(id: string): Promise<CommunityCharacterDetail> {
    const now = Date.now();
    const cached = this.detailCache.get(id);
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }

    const res = await this.request(`/api/characters/${encodeURIComponent(id)}`);
    if (!res.ok) {
      if (cached) return cached.data;
      throw new Error(`Failed to load character ${id}: status ${res.status}`);
    }

    const data = await res.json();
    const c = data.character;
    if (!c) {
      throw new Error(`Character ${id} not found in response`);
    }

    const rawCardV2 = c.chara_card_v2_json || null;
    const v2Data = rawCardV2?.data || {};

    // Prefer V2 card data when available, fall back to root character object
    const firstMessage =
      c.first_message ||
      c.firstMessage ||
      v2Data.first_mes ||
      v2Data.greeting ||
      c.extracted_first_message ||
      '';

    const personality =
      c.personality ||
      v2Data.personality ||
      v2Data.description ||
      '';

    const scenario =
      c.scenario ||
      v2Data.scenario ||
      '';

    const cleanDesc = (c.description || v2Data.description || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();

    const candidate =
      c.avatarVariantUrls?.hero ||
      c.avatarVariantUrls?.card ||
      c.avatarVariantUrls?.raw ||
      c.avatarDisplayUrl ||
      c.avatar ||
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500';

    const avatar = getHighResImageUrl(candidate);

    const detailObj: CommunityCharacterDetail = {
      id: c.character_id || c.characterId || id,
      characterId: c.character_id || c.characterId || id,
      name: c.name || v2Data.name || 'Unnamed Character',
      chatName: c.chat_name || c.chatName || v2Data.name || '',
      creatorName: cleanCreatorString(c.creator_name || c.creatorName || v2Data.creator),
      creatorId: c.creator_id || c.creatorId,
      avatarUrl: avatar,
      shortDescription: cleanDesc.slice(0, 300),
      isNsfw: Boolean(c.is_nsfw || c.isNsfw),
      totalTokens: c.total_tokens || c.totalTokens || 0,
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
      firstMessage,
      personality: typeof personality === 'string' ? personality : JSON.stringify(personality),
      scenario: typeof scenario === 'string' ? scenario : JSON.stringify(scenario),
      descriptionHtml: c.description || '',
      alternateGreetings: Array.isArray(c.alternate_greetings)
        ? c.alternate_greetings
        : Array.isArray(v2Data.alternate_greetings)
        ? v2Data.alternate_greetings
        : [],
      rawCardV2
    };

    this.pruneCaches();
    this.detailCache.set(id, { data: detailObj, expiresAt: now + 10 * 60 * 1000 });
    return detailObj;
  }
}

export const datacatService = new DatacatService();

/**
 * Curated high-relevance community categories mapped to Datacat tag IDs
 */
export const COMMUNITY_CATEGORIES = [
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
  { label: 'Non-human / Monster', value: 'nonhuman', tagId: '54' },
  { label: 'Furry', value: 'furry', tagId: '52' },
  { label: 'Game / RPG', value: 'game', tagId: '72' },
  { label: 'Villain', value: 'villain', tagId: '73' },
  { label: 'Hero', value: 'hero', tagId: '50' },
  { label: 'Royalty', value: 'royalty', tagId: '25' },
  { label: 'Angst / Drama', value: 'angst', tagId: '19' },
  { label: 'Comedy', value: 'comedy', tagId: '9' }
];

/**
 * HTTP Middleware handler compatible with Connect / Express / Vite Dev Server
 */
export async function handleCommunityApi(
  req: IncomingMessage,
  res: ServerResponse,
  next?: () => void
): Promise<boolean> {
  const urlString = req.url || '';
  if (!urlString.startsWith('/api/community')) {
    if (next) next();
    return false;
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  try {
    const url = new URL(urlString, 'http://localhost');
    const pathname = url.pathname;

    // Health check
    if (pathname === '/api/community/health') {
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'Warden AI Community Gateway',
          source: 'Datacat / JanitorAI Public Catalog'
        })
      );
      return true;
    }

    // Categories / Tags
    if (pathname === '/api/community/categories' || pathname === '/api/community/tags') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, categories: COMMUNITY_CATEGORIES }));
      return true;
    }

    // Character Detail: /api/community/characters/:id
    const charDetailMatch = pathname.match(/^\/api\/community\/characters\/([^/]+)$/);
    if (charDetailMatch) {
      const charId = decodeURIComponent(charDetailMatch[1]);
      const detail = await datacatService.getCharacterDetail(charId);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, character: detail }));
      return true;
    }

    // Characters Search / Browse: /api/community/characters
    if (pathname === '/api/community/characters') {
      const search = url.searchParams.get('search') || '';
      const tagIds = url.searchParams.get('tagIds') || '';
      const limit = parseInt(url.searchParams.get('limit') || '24', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const sort = (url.searchParams.get('sort') || 'recent') as any;
      const creators = url.searchParams.get('creators') || '';
      const sfwOnly = url.searchParams.get('sfwOnly') === '1' || url.searchParams.get('sfwOnly') === 'true';
      const forceRefresh = url.searchParams.get('refresh') === '1' || url.searchParams.get('refresh') === 'true';

      const result = await datacatService.getCharacters({
        search,
        tagIds,
        limit,
        offset,
        sort,
        creators,
        sfwOnly,
        forceRefresh
      });

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, ...result }));
      return true;
    }

    // Unhandled community endpoint
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Endpoint not found' }));
    return true;
  } catch (err: any) {
    console.error('[handleCommunityApi] Request failed:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        error: 'Community API proxy request failed',
        detail: String(err?.message || err)
      })
    );
    return true;
  }
}

