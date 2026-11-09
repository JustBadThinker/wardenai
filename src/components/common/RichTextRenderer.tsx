/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ExternalLink, Image as ImageIcon, X, ZoomIn } from 'lucide-react';
import { CharacterImportService } from '../../services/characterImportService';
import { CatPulsingLoader } from './CatPulsingLoader';
import { ImageLightboxModal } from './ImageLightboxModal';

interface RichTextRendererProps {
  content: string;
  className?: string;
  allowImages?: boolean;
}

/**
 * Validates whether a URL is safe to render as an image or link
 */
function isSafeUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('data:image/')
  );
}

/**
 * Normalizes HTML <img>, <br>, <p>, and bare image URLs into clean Markdown so all JanitorAI/Datacat
 * description banners (Image 1) and first-message scenario images (Image 2) render seamlessly.
 */
export function normalizeMediaMarkdown(raw: string): string {
  if (!raw) return '';
  let text = CharacterImportService.sanitizeText(raw);

  // Also convert standalone bare image URLs on their own line into ![](url)
  text = text.replace(
    /(^|\n)\s*(https?:\/\/[^\s<>)"']+\.(?:png|jpe?g|webp|gif)(?:\?[^\s<>)"']*)?)\s*(?=\n|$)/gi,
    '$1![]($2)'
  );

  return text;
}

/**
 * Image component with error fallback, smooth spring reveal, & click-to-zoom lightbox
 */
const SafeImage: React.FC<{
  src: string;
  alt: string;
  onZoom?: (src: string, alt: string) => void;
}> = ({ src, alt, onZoom }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (!isSafeUrl(src) || hasError) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400 my-1 break-all">
        <ImageIcon className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
        <span className="truncate max-w-[260px]">[Image unavailable: {alt || 'Media'}]</span>
      </span>
    );
  }

  return (
    <figure className="my-3 block w-full overflow-hidden">
      <div
        onClick={() => onZoom && onZoom(src, alt)}
        className="group relative inline-block max-w-full overflow-hidden rounded-xl border border-purple-500/25 bg-[#0c0e14]/80 shadow-lg cursor-pointer transition-all duration-300 hover:border-purple-500/60 hover:shadow-purple-900/20"
      >
        {!isLoaded && (
          <div className="w-64 h-36 flex items-center justify-center bg-[#141722] rounded-xl p-4">
            <CatPulsingLoader size="sm" label="Loading artwork..." glow={false} />
          </div>
        )}
        <img
          src={src}
          alt={alt || 'Scene illustration'}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`max-w-full max-h-[460px] w-auto object-cover rounded-xl transition-all duration-500 ease-out group-hover:scale-[1.015] ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 absolute inset-0'
          }`}
        />
        {isLoaded && (
          <div className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <ZoomIn className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      {alt && alt.trim() && (
        <figcaption className="text-[11px] text-neutral-400 mt-1 italic">{alt}</figcaption>
      )}
    </figure>
  );
};

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  content,
  className = '',
  allowImages = true
}) => {
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

  if (!content) return null;

  const normalized = normalizeMediaMarkdown(content);
  const paragraphs = normalized.split(/\n{2,}/);

  return (
    <>
      <div className={`space-y-3 break-words ${className}`}>
        {paragraphs.map((para, pIdx) => (
          <div key={pIdx} className="leading-relaxed whitespace-pre-wrap break-words">
            {renderInlineTokens(para, allowImages, (src, alt) => setZoomedImage({ src, alt }))}
          </div>
        ))}
      </div>

      {/* Lightbox Modal for Description / Greeting Images */}
      <ImageLightboxModal
        isOpen={Boolean(zoomedImage)}
        onClose={() => setZoomedImage(null)}
        imageUrl={zoomedImage?.src || ''}
        alt={zoomedImage?.alt}
        title={zoomedImage?.alt || 'Artwork Preview'}
      />
    </>
  );
};

function renderInlineTokens(
  text: string,
  allowImages: boolean,
  onZoom?: (src: string, alt: string) => void
): React.ReactNode[] {
  // Master regex pattern for:
  // 1. Markdown Images: !\[(.*?)\]\(\s*(https?:\/\/[^\s)]+|data:image\/[^\s)]+)\s*\)
  // 2. Markdown Links: \[([^\n]+?)\]\((https?:\/\/[^\s)]+)\)
  // 3. Bold-Italic: \*\*\*(.+?)\*\*\*
  // 4. Bold: \*\*(.+?)\*\*
  // 5. Italic/Roleplay Actions: \*([^*\n]+?)\*
  // 6. Inline Code: `([^`\n]+?)`
  const regex =
    /(!\[(.*?)\]\(\s*(https?:\/\/[^\s)]+|data:image\/[^\s)]+)\s*\))|(\[([^\n]+?)\]\((https?:\/\/[^\s)]+)\))|(\*\*\*([\s\S]+?)\*\*\*)|(\*\*([\s\S]+?)\*\*)|(\*([^*\n]+?)\*)|(`([^`\n]+?)`)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      elements.push(text.substring(lastIndex, match.index));
    }

    if (match[1]) {
      const alt = match[2];
      const src = match[3];
      if (allowImages && isSafeUrl(src)) {
        elements.push(<SafeImage key={`img_${match.index}`} src={src} alt={alt} onZoom={onZoom} />);
      } else {
        elements.push(match[1]);
      }
    } else if (match[4]) {
      const label = match[5];
      const href = match[6];
      if (isSafeUrl(href)) {
        elements.push(
          <a
            key={`link_${match.index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 underline inline-flex items-center gap-0.5 font-medium transition-colors"
          >
            <span>{label}</span>
            <ExternalLink className="w-3 h-3 inline-block opacity-70" />
          </a>
        );
      } else {
        elements.push(label);
      }
    } else if (match[7]) {
      elements.push(
        <strong key={`bi_${match.index}`} className="font-bold italic text-purple-300">
          {match[8]}
        </strong>
      );
    } else if (match[9]) {
      elements.push(
        <strong key={`b_${match.index}`} className="font-bold text-white">
          {match[10]}
        </strong>
      );
    } else if (match[11]) {
      elements.push(
        <em key={`em_${match.index}`} className="italic font-normal text-purple-300/95">
          {match[12]}
        </em>
      );
    } else if (match[13]) {
      elements.push(
        <code
          key={`code_${match.index}`}
          className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-purple-300"
        >
          {match[14]}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length > 0 ? elements : [text];
}
