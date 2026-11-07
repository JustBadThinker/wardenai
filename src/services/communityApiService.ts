/**
 * communityApiService.ts
 * Fetches characters from the Warden AI Community Proxy (server.ts),
 * which in turn pulls data from Chub.ai — a public hub hosting thousands of
 * JanitorAI-compatible character cards.
 *
 * The proxy runs on http://localhost:3001. Start it with: npx tsx server.ts
 */

export const PROXY_BASE = 'http://localhost:3001';

// ─── Types returned by Chub.ai API ───────────────────────────────────────────

export interface ChubCharacterNode {
  id: number;
  fullPath: string;           // "creator/char-slug"
  name: string;
  tagline: string;
  description: string;
  nTokens: number;
  starCount: number;
  nChats: number;
  topics: string[];           // tag slugs
  rating: number;
  ratingCount: number;
  nsfw: boolean;
  nsfwImage: boolean;
  lastActivityAt: string;
  createdAt: string;
  avatar_url?: string;        // sometimes included
}

export interface ChubSearchResult {
  data?: {
    nodes?: ChubCharacterNode[];
    total?: number;
    count?: number;
    page?: number;
  };
  nodes?: ChubCharacterNode[];
  total?: number;
}

// ─── Helper: build avatar URL from fullPath ───────────────────────────────────

/**
 * Returns a proxied avatar URL that bypasses CORS.
 * Falls back to the direct Chub.ai URL if the proxy isn't running.
 */
export function getChubAvatarUrl(fullPath: string): string {
  const direct = `https://avatars.chub.ai/avatars/${fullPath}/main_chara.png`;
  return `${PROXY_BASE}/api/avatar?url=${encodeURIComponent(direct)}`;
}

// ─── Search / list characters ─────────────────────────────────────────────────

export type ChubSortMode = 'download_count' | 'created_at' | 'rating_count';

export interface DiscoverOptions {
  search?: string;
  page?: number;
  sort?: ChubSortMode;
  nsfw?: boolean;
  tags?: string[];
}

export interface DiscoverResult {
  characters: ChubCharacterNode[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchCommunityCharacters(
  opts: DiscoverOptions = {}
): Promise<DiscoverResult> {
  const params = new URLSearchParams({
    search: opts.search ?? '',
    page: String(opts.page ?? 1),
    sort: opts.sort ?? 'download_count',
    nsfw: String(opts.nsfw ?? false),
  });

  if (opts.tags && opts.tags.length > 0) {
    params.set('tags', opts.tags.join(','));
  }

  const res = await fetch(`${PROXY_BASE}/api/discover?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Community proxy error: ${res.status}`);
  }

  const json: ChubSearchResult = await res.json();

  // Chub.ai sometimes wraps in { data: { nodes } } and sometimes { nodes }
  const nodes = json?.data?.nodes ?? (json as any)?.nodes ?? [];
  const total = json?.data?.total ?? (json as any)?.total ?? nodes.length;

  return {
    characters: nodes,
    total,
    page: opts.page ?? 1,
    pageSize: 24,
  };
}

// ─── Proxy health check ───────────────────────────────────────────────────────

export async function checkProxyHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${PROXY_BASE}/api/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

