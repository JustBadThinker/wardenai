/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Warden AI — Native App Opening Splash & Boot Animation
 * Cinematic 1-second opening sequence that animates the Glowing Cat App Icon
 * with spring physics, ambient glow bloom, and seamless zoom-dissolve into Home.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AppSplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onComplete,
  duration = 980
}) => {
  const [phase, setPhase] = useState<'intro' | 'exit'>('intro');

  useEffect(() => {
    // Phase 1: Play intro animation for ~700ms
    const exitTimer = setTimeout(() => {
      setPhase('exit');
    }, Math.max(500, duration - 320));

    // Phase 2: Complete and unmount after exit dissolve
    const completeTimer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  // Tap to instantly skip if user is in a hurry
  const handleFastSkip = () => {
    onComplete();
  };

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          key="warden-splash-screen"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.12,
            filter: 'blur(8px)',
            transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] }
          }}
          onClick={handleFastSkip}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#08090d] select-none cursor-pointer overflow-hidden transform-gpu"
          style={{ willChange: 'transform, opacity' }}
        >
          {/* ── Ambient Radial Glow Bloom (Pulsing behind icon) ── */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{
              scale: [0.6, 1.25, 1.1],
              opacity: [0, 0.55, 0.4]
            }}
            transition={{
              duration: 0.9,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="absolute w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-purple-600/35 via-indigo-500/30 to-cyan-500/25 blur-3xl pointer-events-none -z-10"
          />

          {/* ── Secondary Subtle Cyan/Blue Aura ── */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [0.8, 1.3, 1.15],
              opacity: [0, 0.35, 0.2]
            }}
            transition={{
              duration: 0.95,
              delay: 0.08,
              ease: [0.16, 1, 0.3, 1]
            }}
            className="absolute w-64 h-64 rounded-full bg-blue-500/20 blur-2xl pointer-events-none -z-10"
          />

          {/* ── Central Icon Container with Spring Physics ── */}
          <div className="relative flex flex-col items-center">
            {/* Ethereal Glow Ring Halo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: 0 }}
              animate={{
                scale: [0.8, 1.08, 1.02],
                opacity: [0, 0.8, 0.45],
                rotate: 45
              }}
              transition={{
                duration: 0.9,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="absolute -inset-3 rounded-[2.6rem] bg-gradient-to-tr from-purple-500/40 via-transparent to-blue-500/40 blur-md pointer-events-none"
            />

            {/* Glowing Cat App Icon */}
            <motion.div
              initial={{ scale: 0.82, opacity: 0, y: 12 }}
              animate={{
                scale: [0.82, 1.03, 1.0],
                opacity: 1,
                y: 0
              }}
              transition={{
                duration: 0.68,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-[2.2rem] sm:rounded-[2.6rem] overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.4),0_20px_50px_rgba(0,0,0,0.85)] border border-white/20 transform-gpu"
            >
              <img
                src="/glowing-cat-icon.png"
                alt="Warden AI"
                className="w-full h-full object-cover select-none pointer-events-none"
                draggable={false}
              />

              {/* Shimmer light sweep across the icon face */}
              <motion.div
                initial={{ x: '-150%', opacity: 0 }}
                animate={{ x: '150%', opacity: [0, 0.65, 0] }}
                transition={{
                  duration: 0.75,
                  delay: 0.18,
                  ease: [0.16, 1, 0.3, 1]
                }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent skew-x-12 pointer-events-none"
              />
            </motion.div>

            {/* ── Brand Typography ── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.55,
                delay: 0.22,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="mt-6 flex flex-col items-center space-y-1.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-[0.28em] text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-indigo-300">
                  WARDEN AI
                </span>
              </div>
              <span className="text-[10px] tracking-[0.28em] font-semibold text-neutral-400 uppercase">
                Roleplay & Creation
              </span>
            </motion.div>

            {/* ── Sleek Minimalist Loading Pill Line ── */}
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 90 }}
              transition={{
                duration: 0.55,
                delay: 0.25,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="h-0.5 mt-5 bg-gradient-to-r from-purple-500 via-indigo-400 to-blue-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.7)]"
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

