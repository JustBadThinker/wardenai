import React, { useState } from 'react';
import { Menu, Search, Bell } from 'lucide-react';
import { User, Persona, ContentRating } from '../../types';
import { NotificationPopover } from './NotificationPopover';

interface TopHeaderProps {
  currentUser: User;
  activePersona?: Persona;
  onSelectPersona: () => void;
  contentRating: ContentRating;
  onChangeContentRating: (rating: ContentRating) => void;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onNavigate: (view: string) => void;
  activeView: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser,
  activePersona,
  onSelectPersona,
  onOpenMobileMenu,
  onOpenSearch,
  onNavigate
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  const personaAvatar = activePersona?.avatarUrl || currentUser.avatarUrl;
  const personaName = activePersona?.name || currentUser.displayName;

  return (
    <header
      className="sticky top-0 z-30 w-full border-b border-[#1b1e28] bg-[#0c0e14]/95 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        height: 'calc(52px + env(safe-area-inset-top, 0px))'
      }}
    >
      {/* Left: Mobile Menu Button & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 text-neutral-300 hover:text-white rounded-md hover:bg-neutral-800/60 transition-all active:scale-90 focus:outline-none cursor-pointer"
          aria-label="Open Navigation Drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 group text-left cursor-pointer active:scale-95 transition-transform"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center p-1 shadow-sm group-hover:scale-105 transition-transform">
            <img
              src="/warden-cat-logo.png"
              alt="Warden AI"
              className="w-full h-full object-contain filter drop-shadow-sm"
            />
          </div>
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-1">
            <span className="text-purple-400">W</span>arden AI
          </span>
        </button>
      </div>

      {/* Middle: Quick Search (Desktop) */}
      <div className="flex-1 max-w-sm hidden md:block mx-4">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-neutral-400 bg-[#141721] border border-[#222736] rounded-lg hover:border-purple-500/40 hover:text-neutral-200 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-neutral-500" />
            <span>Search characters, tags, creators...</span>
          </div>
          <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] bg-neutral-800 text-neutral-400 rounded border border-neutral-700">
            /
          </kbd>
        </button>
      </div>

      {/* Right Controls: Active Persona pill, Search icon (mobile), Bell icon, Persona Avatar */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {activePersona && (
          <button
            onClick={onSelectPersona}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-[#131622] hover:bg-[#1a1f30] active:scale-95 border border-[#202638] hover:border-purple-500/40 rounded-full text-xs transition-all duration-200 cursor-pointer group"
            title="Active Roleplay Persona (click to switch)"
          >
            <img
              src={personaAvatar}
              alt={personaName}
              className="w-5 h-5 rounded-full object-cover border border-purple-500/40 group-hover:scale-105 transition-transform"
            />
            <span className="text-neutral-300 font-medium max-w-[120px] truncate group-hover:text-purple-300">
              as {personaName}
            </span>
          </button>
        )}

        <button
          onClick={onOpenSearch}
          className="md:hidden p-1.5 text-neutral-300 hover:text-white rounded-md hover:bg-neutral-800/60 active:scale-90 transition-all duration-150 cursor-pointer"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(prev => !prev)}
            className={`relative p-1.5 rounded-md transition-all duration-150 active:scale-90 cursor-pointer ${
              isNotifOpen
                ? 'text-purple-400 bg-purple-500/10'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
            }`}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full ring-2 ring-[#0c0e14] animate-pulse" />
            )}
          </button>

          <NotificationPopover
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            unreadCount={unreadCount}
            onUpdateUnreadCount={setUnreadCount}
          />
        </div>

        <button
          onClick={onSelectPersona}
          className="flex items-center rounded-full ring-1 ring-purple-500/50 hover:ring-purple-400 transition-all cursor-pointer overflow-hidden active:scale-90"
          title={`Active Persona: ${personaName}`}
          aria-label="Switch Persona"
        >
          <img
            src={personaAvatar}
            alt={personaName}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
          />
        </button>
      </div>
    </header>
  );
};
