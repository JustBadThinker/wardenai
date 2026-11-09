/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface CatPulsingLoaderProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  glow?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: { box: 'w-4 h-4', img: 'w-3.5 h-3.5', text: 'text-[10px]' },
  sm: { box: 'w-6 h-6', img: 'w-5 h-5', text: 'text-xs' },
  md: { box: 'w-10 h-10', img: 'w-8 h-8', text: 'text-xs' },
  lg: { box: 'w-16 h-16', img: 'w-12 h-12', text: 'text-sm' },
  xl: { box: 'w-24 h-24', img: 'w-18 h-18', text: 'text-base' }
};

export const CatPulsingLoader: React.FC<CatPulsingLoaderProps> = ({
  size = 'md',
  label,
  glow = true,
  className = ''
}) => {
  const conf = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div className={`flex flex-col items-center justify-center gap-2.5 select-none ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Ambient Pulsing Backlight Bloom */}
        {glow && (
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600/40 via-indigo-500/30 to-purple-400/40 blur-md animate-pulse transform-gpu ${conf.box}`}
            style={{ animationDuration: '1.6s' }}
          />
        )}

        {/* Pulsing White Cat Head Icon */}
        <div
          className={`relative flex items-center justify-center animate-pulse transform-gpu ${conf.box}`}
          style={{ animationDuration: '1.4s' }}
        >
          <img
            src="/warden-cat-logo.png"
            alt="Loading..."
            className={`${conf.img} object-contain filter drop-shadow-[0_0_8px_rgba(168,85,247,0.45)]`}
          />
        </div>
      </div>

      {label && (
        <span
          className={`font-medium text-neutral-400 tracking-wide animate-pulse ${conf.text}`}
          style={{ animationDuration: '2s' }}
        >
          {label}
        </span>
      )}
    </div>
  );
};
