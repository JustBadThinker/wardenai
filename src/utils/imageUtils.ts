/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Detects known generic/missing avatar placeholders (e.g. Janitor/Chub default gray headphones icon)
 */
export function isDefaultPlaceholderAvatar(url?: string | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('/assets/avatar.png') ||
    lower.includes('default_avatar') ||
    lower.includes('default-avatar') ||
    lower.includes('empty_avatar') ||
    lower.endsWith('/avatar.png') ||
    lower.includes('/placeholders/')
  );
}

/**
 * Promotes low-resolution thumbnail URLs to full high-resolution artwork URLs
 * - Datacat / JanitorAI: replaces /thumb.webp or /avatar.webp with /card.webp
 * - Charhub / Chub.ai: replaces /avatar.webp with /chara_card_v2.png or /avatar_raw.webp
 */
export function getHighResImageUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // 1. Charhub / Chub.ai upgrade: replace 100px avatar.webp with full HD character card
  if (trimmed.includes('charhub.io') && trimmed.includes('/avatar.webp')) {
    return trimmed.replace('/avatar.webp', '/chara_card_v2.png');
  }

  // 2. Janitor AI / Datacat upgrade: replace thumb or avatar with full card.webp
  if (trimmed.includes('/thumb.webp')) {
    return trimmed.replace('/thumb.webp', '/card.webp');
  }
  if (trimmed.includes('/avatar.webp') && !trimmed.includes('charhub.io')) {
    return trimmed.replace('/avatar.webp', '/card.webp');
  }

  return trimmed;
}

/**
 * Provides next fallback URL in the resolution cascade if the high-res image 404s
 */
export function getFallbackImageUrl(currentUrl: string): string | null {
  if (!currentUrl) return null;

  // If chara_card_v2.png fails on charhub, try avatar_raw.webp, then avatar.webp
  if (currentUrl.includes('/chara_card_v2.png')) {
    return currentUrl.replace('/chara_card_v2.png', '/avatar_raw.webp');
  }
  if (currentUrl.includes('/avatar_raw.webp')) {
    return currentUrl.replace('/avatar_raw.webp', '/avatar.webp');
  }

  // If card.webp fails on Janitor/Datacat, try thumb.webp, then avatar.webp
  if (currentUrl.includes('/card.webp')) {
    return currentUrl.replace('/card.webp', '/thumb.webp');
  }
  if (currentUrl.includes('/thumb.webp')) {
    return currentUrl.replace('/thumb.webp', '/avatar.webp');
  }

  return null;
}
