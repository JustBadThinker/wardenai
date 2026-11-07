/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#0c0e14]/85 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around px-2 select-none shadow-2xl">
      {/* 1. Home */}
      <button
        onClick={() => onNavigate('home')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 cursor-pointer active:scale-90 ${
          activeView === 'home'
            ? 'text-purple-300 font-semibold'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Home
          className={`w-5 h-5 transition-transform duration-200 ${
            activeView === 'home'
              ? 'scale-110 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'
              : ''
          }`}
        />
        <span className="text-[10px] tracking-tight mt-0.5">Home</span>
        {activeView === 'home' && (
          <span className="w-1 h-1 rounded-full bg-purple-400 mt-0.5 animate-scale-in" />
        )}
      </button>

      {/* 2. Explore All */}
      <button
        onClick={() => onNavigate('discover')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 cursor-pointer active:scale-90 ${
          activeView === 'discover'
            ? 'text-purple-300 font-semibold'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <Compass
          className={`w-5 h-5 transition-transform duration-200 ${
            activeView === 'discover'
              ? 'scale-110 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'
              : ''
          }`}
        />
        <span className="text-[10px] tracking-tight mt-0.5">Explore</span>
        {activeView === 'discover' && (
          <span className="w-1 h-1 rounded-full bg-purple-400 mt-0.5 animate-scale-in" />
        )}
      </button>

      {/* 3. Chats */}
      <button
        onClick={() => onNavigate('chats')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 cursor-pointer active:scale-90 ${
          activeView === 'chats' || activeView === 'chat'
            ? 'text-purple-300 font-semibold'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
      >
        <MessageSquare
          className={`w-5 h-5 transition-transform duration-200 ${
            activeView === 'chats' || activeView === 'chat'
              ? 'scale-110 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'
              : ''
          }`}
        />
        <span className="text-[10px] tracking-tight mt-0.5">Chats</span>
        {(activeView === 'chats' || activeView === 'chat') && (
          <span className="w-1 h-1 rounded-full bg-purple-400 mt-0.5 animate-scale-in" />
        )}
      </button>

      {/* 4. Profile & Creator Hub */}
      <button
        onClick={() => onNavigate('profile')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 cursor-pointer active:scale-90 ${
          activeView === 'profile' || activeView === 'studio' || activeView === 'personas'
            ? 'text-purple-300 font-semibold'
            : 'text-neutral-400 hover:text-neutral-200'
        }`}
        title={`Profile & Creator Hub (${personaName})`}
      >
        <img
          src={personaAvatar}
          alt={personaName}
          className={`w-6 h-6 rounded-md object-cover transition-all duration-200 ${
            activeView === 'profile' || activeView === 'studio' || activeView === 'personas'
              ? 'ring-2 ring-purple-400 scale-110 shadow-[0_0_8px_rgba(168,85,247,0.5)]'
              : 'ring-1 ring-white/20 opacity-85'
          }`}
        />
        <span className="text-[10px] tracking-tight mt-0.5">Profile</span>
        {(activeView === 'profile' || activeView === 'studio' || activeView === 'personas') && (
          <span className="w-1 h-1 rounded-full bg-purple-400 mt-0.5 animate-scale-in" />
        )}
      </button>
    </nav>
  );
};
