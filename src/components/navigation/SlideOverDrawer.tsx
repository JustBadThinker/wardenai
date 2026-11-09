import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  X,
  Home,
  Compass,
  Image,
  Users,
  BookOpen,
  Bookmark,
  Settings,
  MessageSquare,
  Sliders,
  ChevronRight,
  Bell
} from 'lucide-react';
import { Persona, User, UserRole } from '../../types';

interface SlideOverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  activePersona?: Persona;
  onNavigate: (view: string) => void;
  onSwitchRole: (role: UserRole) => void;
  onLogout: () => void;
}

export const SlideOverDrawer: React.FC<SlideOverDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  activePersona,
  onNavigate
}) => {
  const handleNav = (view: string) => {
    onNavigate(view);
    onClose();
  };

  const personaName = activePersona?.name || currentUser.displayName;
  const personaAvatar = activePersona?.avatarUrl || currentUser.avatarUrl;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 350, mass: 0.8 }}
            className="relative w-full max-w-xs sm:max-w-sm bg-[#0c0e14] border-r border-[#1a1d27] h-full flex flex-col justify-between z-10 shadow-2xl overflow-y-auto transform-gpu"
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 0px)'
            }}
          >
            <div>
          {/* Header */}
          <div
            className="px-4 border-b border-[#1a1d27] flex items-center justify-between"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              height: 'calc(52px + env(safe-area-inset-top, 0px))'
            }}
          >
            <div
              onClick={() => handleNav('home')}
              className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center p-1 shadow-sm">
                <img
                  src="/warden-cat-logo.png"
                  alt="Warden AI"
                  className="w-full h-full object-contain filter drop-shadow-sm"
                />
              </div>
              <span className="text-base font-bold tracking-tight warden-brand-text select-none">
                Warden Ai
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleNav('settings')}
                className="p-1.5 text-neutral-400 hover:text-white rounded-md cursor-pointer"
                title="Settings"
              >
                <Bell className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Active Persona Card (Replaces Account Login Card) */}
          <div
            onClick={() => handleNav('personas')}
            className="p-3.5 mx-3 my-3 bg-gradient-to-r from-[#151826] to-[#1a162b] hover:from-[#1b1f32] hover:to-[#221c38] rounded-xl border border-purple-500/30 flex items-center justify-between cursor-pointer transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={personaAvatar}
                alt={personaName}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-purple-500/50 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{personaName}</div>
                <div className="text-[11px] text-purple-300 font-medium truncate">
                  Active Persona · Tap to switch
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-purple-400 shrink-0" />
          </div>

          {/* Navigation Menu List */}
          <div className="px-3 py-1 space-y-0.5 text-sm">
            <button
              onClick={() => handleNav('home')}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-neutral-200 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-all cursor-pointer active:scale-[0.98]"
            >
              <Home className="w-4 h-4 text-purple-400" />
              <span>Home</span>
            </button>

            <button
              onClick={() => handleNav('discover')}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-all cursor-pointer active:scale-[0.98]"
            >
              <Compass className="w-4 h-4 text-neutral-400" />
              <span>Explore All Catalog</span>
            </button>

            <button
              onClick={() => handleNav('chats')}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-all cursor-pointer active:scale-[0.98]"
            >
              <MessageSquare className="w-4 h-4 text-neutral-400" />
              <span>All Chats</span>
            </button>

            <button
              onClick={() => handleNav('studio')}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-all cursor-pointer active:scale-[0.98]"
            >
              <Image className="w-4 h-4 text-neutral-400" />
              <span>Create / My Characters</span>
            </button>

            <button
              onClick={() => handleNav('personas')}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-all cursor-pointer active:scale-[0.98]"
            >
              <Users className="w-4 h-4 text-neutral-400" />
              <span>Personas Studio</span>
            </button>

            <button
              onClick={() => handleNav('lorebooks')}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-all cursor-pointer active:scale-[0.98]"
            >
              <BookOpen className="w-4 h-4 text-neutral-400" />
              <span>Lorebooks</span>
            </button>

            <button
              onClick={() => handleNav('bookmarks')}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-all cursor-pointer active:scale-[0.98]"
            >
              <Bookmark className="w-4 h-4 text-neutral-400" />
              <span>Saved Favorites</span>
            </button>

            <div className="my-2 border-t border-[#1a1d27]" />

            <button
              onClick={() => handleNav('providers')}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-all cursor-pointer active:scale-[0.98]"
            >
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>AI Providers & API Keys</span>
            </button>

            <button
              onClick={() => handleNav('settings')}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-neutral-300 hover:text-white hover:bg-neutral-800/50 rounded-lg transition-all cursor-pointer active:scale-[0.98]"
            >
              <Settings className="w-4 h-4 text-neutral-400" />
              <span>App & Appearance Settings</span>
            </button>
          </div>
        </div>

        {/* Bottom Quick Action */}
        <div className="p-4 border-t border-[#1a1d27]">
          <button
            onClick={() => handleNav('providers')}
            className="w-full py-2.5 text-xs font-bold text-purple-200 hover:text-white bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Configure LLM Provider</span>
          </button>
        </div>
      </motion.div>
    </div>
  )}
</AnimatePresence>
  );
};
