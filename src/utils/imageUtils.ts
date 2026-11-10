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
 * Safely resolves image URLs without forcibly breaking working thumbnails.
 * Preserves the working CDN source directly so images load reliably across web and mobile.
 */
export function getHighResImageUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Unsplash high quality parameter
  if (trimmed.includes('images.unsplash.com')) {
    return trimmed
      .replace(/([?&])w=\d+/g, '$1w=1080')
      .replace(/([?&])q=\d+/g, '$1q=85');
  }

  // Preserve working thumbnail / avatar URLs directly to prevent 404 card.webp errors
  return trimmed;
}

/**
 * Provides next fallback URL in the resolution cascade if the image fails to load
 */
export function getFallbackImageUrl(currentUrl: string): string | null {
  if (!currentUrl) return null;

  // If card.webp was attempted and failed, fall back to thumb.webp then avatar.webp
  if (currentUrl.includes('/card.webp')) {
    return currentUrl.replace('/card.webp', '/thumb.webp');
  }
  if (currentUrl.includes('/thumb.webp')) {
    return currentUrl.replace('/thumb.webp', '/avatar.webp');
  }

  // If chara_card_v2.png failed on charhub, fall back to avatar.webp
  if (currentUrl.includes('/chara_card_v2.png')) {
    return currentUrl.replace('/chara_card_v2.png', '/avatar.webp');
  }
  if (currentUrl.includes('/avatar_raw.webp')) {
    return currentUrl.replace('/avatar_raw.webp', '/avatar.webp');
  }

  return null;
}
