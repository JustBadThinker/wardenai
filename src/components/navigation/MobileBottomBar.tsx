/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Home, Compass, MessageSquare } from 'lucide-react';
import { Persona, User } from '../../types';

interface MobileBottomBarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  currentUser: User;
  activePersona?: Persona;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeView,
  onNavigate,
  currentUser,
  activePersona
}) => {
  const personaAvatar = activePersona?.avatarUrl || currentUser.avatarUrl;
  const personaName = activePersona?.name || currentUser.displayName;

  const isHome = activeView === 'home';
  const isExplore = activeView === 'discover';
  const isChats = activeView === 'chats' || activeView === 'chat';
  const isProfile = activeView === 'profile' || activeView === 'studio' || activeView === 'personas';

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0e14]/85 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around px-2 select-none shadow-2xl"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(56px + env(safe-area-inset-bottom, 0px))'
      }}
    >
      {/* 1. Home */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        onClick={() => onNavigate('home')}
        className={`relative flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors duration-150 ${
          isHome ? 'text-purple-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        {isHome && (
          <motion.div
            layoutId="mobileNavActivePill"
            className="absolute -inset-x-1 -inset-y-1 bg-purple-500/10 rounded-xl -z-10 border border-purple-500/20"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <Home
          className={`w-5 h-5 transition-transform duration-200 ${
            isHome ? 'scale-110 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : ''
          }`}
        />
        <span className="text-[10px] tracking-tight mt-0.5">Home</span>
        {isHome && (
          <motion.span
            layoutId="mobileNavIndicatorDot"
            className="w-1 h-1 rounded-full bg-purple-400 mt-0.5"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
      </motion.button>

      {/* 2. Explore All */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        onClick={() => onNavigate('discover')}
        className={`relative flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors duration-150 ${
          isExplore ? 'text-purple-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        {isExplore && (
          <motion.div
            layoutId="mobileNavActivePill"
            className="absolute -inset-x-1 -inset-y-1 bg-purple-500/10 rounded-xl -z-10 border border-purple-500/20"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <Compass
          className={`w-5 h-5 transition-transform duration-200 ${
            isExplore ? 'scale-110 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : ''
          }`}
        />
        <span className="text-[10px] tracking-tight mt-0.5">Explore</span>
        {isExplore && (
          <motion.span
            layoutId="mobileNavIndicatorDot"
            className="w-1 h-1 rounded-full bg-purple-400 mt-0.5"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
      </motion.button>

      {/* 3. Chats */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        onClick={() => onNavigate('chats')}
        className={`relative flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors duration-150 ${
          isChats ? 'text-purple-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        {isChats && (
          <motion.div
            layoutId="mobileNavActivePill"
            className="absolute -inset-x-1 -inset-y-1 bg-purple-500/10 rounded-xl -z-10 border border-purple-500/20"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <MessageSquare
          className={`w-5 h-5 transition-transform duration-200 ${
            isChats ? 'scale-110 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : ''
          }`}
        />
        <span className="text-[10px] tracking-tight mt-0.5">Chats</span>
        {isChats && (
          <motion.span
            layoutId="mobileNavIndicatorDot"
            className="w-1 h-1 rounded-full bg-purple-400 mt-0.5"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
      </motion.button>

      {/* 4. Profile & Creator Hub */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.88 }}
        onClick={() => onNavigate('profile')}
        className={`relative flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-colors duration-150 ${
          isProfile ? 'text-purple-300 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
        }`}
        title={`Profile & Creator Hub (${personaName})`}
      >
        {isProfile && (
          <motion.div
            layoutId="mobileNavActivePill"
            className="absolute -inset-x-1 -inset-y-1 bg-purple-500/10 rounded-xl -z-10 border border-purple-500/20"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <img
          src={personaAvatar}
          alt={personaName}
          className={`w-6 h-6 rounded-md object-cover transition-all duration-200 ${
            isProfile
              ? 'ring-2 ring-purple-400 scale-110 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
              : 'ring-1 ring-white/20 opacity-85'
          }`}
        />
        <span className="text-[10px] tracking-tight mt-0.5">Profile</span>
        {isProfile && (
          <motion.span
            layoutId="mobileNavIndicatorDot"
            className="w-1 h-1 rounded-full bg-purple-400 mt-0.5"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
      </motion.button>
    </nav>
  );
};
