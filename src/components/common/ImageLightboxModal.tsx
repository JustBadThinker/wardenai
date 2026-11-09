/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, Check, Sparkles } from 'lucide-react';
import { CatPulsingLoader } from './CatPulsingLoader';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  alt?: string;
}

/**
 * Transforms an image URL to its highest available resolution (HD).
 * E.g. converts Unsplash thumbnail width query parameters to high-res.
 */
export function getHdImageUrl(url: string): string {
  if (!url) return '';
  let result = url;

  // Unsplash: replace small width/quality parameters with high-resolution parameters
  if (result.includes('images.unsplash.com')) {
    result = result
      .replace(/([?&])w=\d+/g, '$1w=1920')
      .replace(/([?&])q=\d+/g, '$1q=90');
    if (!result.includes('w=1920')) {
      result += (result.includes('?') ? '&' : '?') + 'w=1920&q=90';
    }
  }

  // Datacat & Chub: upgrade thumb/card thumbnails to full avatar if applicable
  if (result.includes('chub.ai') || result.includes('datacat.run') || result.includes('charhub')) {
    result = result
      .replace(/[?&]width=\d+/g, '')
      .replace(/[?&]thumb=true/g, '')
      .replace(/\/thumb\.webp(\?|$)/, '/card.webp$1')
      .replace(/\/avatar\.webp(\?|$)/, result.includes('charhub') ? '/chara_card_v2.png$1' : '/card.webp$1');
  }

  // Cloudinary: replace w_xxx,h_xxx,c_fill with high-res limit
  if (result.includes('res.cloudinary.com')) {
    result = result.replace(/\/c_thumb,w_\d+,h_\d+\//, '/c_limit,w_1920/');
  }

  return result;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  alt
}) => {
  const [activeSrc, setActiveSrc] = useState(() => getHdImageUrl(imageUrl));
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Reset loaded status and active source whenever image URL changes or modal opens
  useEffect(() => {
    if (isOpen && imageUrl) {
      setActiveSrc(getHdImageUrl(imageUrl));
      setIsLoaded(false);
      setHasError(false);
      setDownloadSuccess(false);
    }
  }, [isOpen, imageUrl]);

  // Keyboard navigation: Escape key closes lightbox
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    try {
      // Try direct blob fetch for cleanest browser saving
      const response = await fetch(activeSrc, { mode: 'cors' });
      if (!response.ok) throw new Error('Network fetch failed');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const cleanFileName = (title || alt || 'character-artwork')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 40);
      link.download = `${cleanFileName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } catch {
      // Fallback: trigger direct anchor download or open in new tab
      const link = document.createElement('a');
      link.href = activeSrc;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = `${(title || 'artwork').replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    } finally {
      setIsDownloading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/92 backdrop-blur-xl animate-fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative max-w-5xl max-h-[92dvh] w-full flex flex-col items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div className="w-full flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-2 max-w-[65%] sm:max-w-[80%]">
            <span className="px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>HD Preview</span>
            </span>
            {title && (
              <span className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-md">
                {title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Download Image Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-3 py-1.5 rounded-xl bg-[#161a26]/90 hover:bg-[#202638] text-white border border-white/20 hover:border-purple-500/50 text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Download high-resolution image"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Saved</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden xs:inline">Download</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/70 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-white/15 flex items-center justify-center transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Frame with pulsing loader placeholder */}
        <div className="relative min-h-[220px] sm:min-h-[360px] max-w-full max-h-[82dvh] flex items-center justify-center overflow-hidden rounded-2xl bg-[#0a0c12]/60 border border-white/10 shadow-2xl">
          {/* Pulsing Cat Loader while fetching the image */}
          {!isLoaded && !hasError && (
            <div className="p-8 sm:p-14 flex flex-col items-center justify-center">
              <CatPulsingLoader size="lg" label="Loading HD artwork..." />
            </div>
          )}

          {hasError ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              <p>Unable to load high-resolution image.</p>
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-purple-400 hover:underline mt-2 inline-block font-medium"
              >
                Open original link directly
              </a>
            </div>
          ) : (
            <img
              src={activeSrc}
              alt={alt || title || 'Artwork Preview'}
              referrerPolicy="no-referrer"
              onLoad={() => setIsLoaded(true)}
              onError={() => {
                // If HD url failed, retry with original url before showing error state
                if (activeSrc !== imageUrl) {
                  setActiveSrc(imageUrl);
                } else {
                  setHasError(true);
                }
              }}
              className={`max-w-full max-h-[80dvh] object-contain rounded-2xl transition-all duration-300 ${
                isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-98 absolute'
              }`}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
