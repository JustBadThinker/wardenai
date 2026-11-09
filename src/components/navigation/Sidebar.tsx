/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Home,
  Compass,
  MessageSquare,
  PlusCircle,
  UserCheck,
  BookOpen,
  Bookmark,
  Settings,
  Sliders,
  ChevronRight
} from 'lucide-react';
import { Persona, User, UserRole } from '../../types';

interface SidebarProps {
  currentUser: User;
  activePersona?: Persona;
  activeView: string;
  onNavigate: (view: string) => void;
  onSwitchRole: (role: UserRole) => void;
  onLogout: () => void;
  unreadReportsCount?: number;
  unreadChatsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activePersona,
  activeView,
  onNavigate,
  unreadChatsCount = 0
}) => {
  const mainNav = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'discover', label: 'Explore All', icon: Compass },
    { id: 'chats', label: 'Chats', icon: MessageSquare, badge: unreadChatsCount },
    { id: 'studio', label: 'Create', icon: PlusCircle },
    { id: 'personas', label: 'Personas', icon: UserCheck },
    { id: 'lorebooks', label: 'Lorebooks', icon: BookOpen },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark }
  ];

  const personaName = activePersona?.name || currentUser.displayName;
  const personaAvatar = activePersona?.avatarUrl || currentUser.avatarUrl;

  return (
    <aside className="w-60 border-r border-[#1b1e28] bg-[#0c0e14] flex flex-col justify-between shrink-0 h-screen sticky top-0 hidden md:flex select-none z-20">
      {/* Top Header & Brand */}
      <div className="flex flex-col w-full">
        <div
          onClick={() => onNavigate('home')}
          className="h-16 px-5 flex items-center gap-3 border-b border-[#1b1e28] cursor-pointer hover:bg-neutral-900/40 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center p-1.5 shadow-md shadow-purple-900/30 group-hover:scale-105 transition-transform">
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

        {/* Primary Navigation List */}
        <nav className="p-3 space-y-1">
          {mainNav.map((item, index) => {
            const Icon = item.icon;
            const isActive =
              activeView === item.id || (item.id === 'chats' && activeView === 'chat');

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{ animationDelay: `${index * 30}ms` }}
                className={`w-full h-10 px-3 rounded-lg flex items-center justify-between text-sm font-medium transition-all duration-250 ease-out group cursor-pointer active:scale-[0.97] ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/25 to-purple-600/5 text-purple-200 font-semibold border-l-2 border-purple-500 rounded-l-none shadow-sm shadow-purple-900/20 translate-x-1'
                    : 'text-neutral-400 hover:text-neutral-100 hover:bg-[#151822] hover:translate-x-1'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-all duration-200 ${
                      isActive
                        ? 'text-purple-400 scale-110 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                        : 'text-neutral-400 group-hover:text-purple-300 group-hover:scale-110'
                    }`}
                  />
                  <span className="transition-colors duration-150">{item.label}</span>
                </div>

                {item.badge && item.badge > 0 ? (
                  <span
                    className={`w-5 h-5 rounded-full text-white text-[11px] font-bold flex items-center justify-center shadow-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-purple-600 shadow-purple-600/50 scale-105'
                        : 'bg-neutral-800 text-neutral-300 group-hover:bg-purple-600 group-hover:text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: AI Providers, Settings & Active Persona Card */}
      <div className="p-3 border-t border-[#1b1e28] space-y-1 relative">
        <button
          onClick={() => onNavigate('providers')}
          className={`w-full h-9 px-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-all duration-200 group cursor-pointer active:scale-[0.98] ${
            activeView === 'providers'
              ? 'bg-purple-600/20 text-purple-300 font-semibold border-l-2 border-purple-500 rounded-l-none translate-x-1'
              : 'text-neutral-400 hover:text-neutral-100 hover:bg-[#151822] hover:translate-x-1'
          }`}
        >
          <Sliders className="w-4 h-4 text-neutral-400 group-hover:text-purple-300 transition-all duration-200" />
          <span>AI Providers</span>
        </button>

        <button
          onClick={() => onNavigate('settings')}
          className={`w-full h-9 px-3 rounded-lg flex items-center gap-3 text-sm font-medium transition-all duration-200 group cursor-pointer active:scale-[0.98] ${
            activeView === 'settings'
              ? 'bg-purple-600/20 text-purple-300 font-semibold border-l-2 border-purple-500 rounded-l-none translate-x-1'
              : 'text-neutral-400 hover:text-neutral-100 hover:bg-[#151822] hover:translate-x-1'
          }`}
        >
          <Settings className="w-4 h-4 text-neutral-400 group-hover:text-purple-300 group-hover:rotate-45 transition-all duration-300" />
          <span>Settings</span>
        </button>

        {/* Active Persona Card (No login needed) */}
        <div className="pt-2">
          <div
            onClick={() => onNavigate('personas')}
            className="w-full p-2.5 rounded-xl bg-[#12151e] hover:bg-[#181c28] border border-[#1b1e28] hover:border-purple-500/40 flex items-center justify-between cursor-pointer transition-all duration-200 group active:scale-[0.98]"
            title="Click to switch or edit your Roleplay Persona"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={personaAvatar}
                alt={personaName}
                className="w-8 h-8 rounded-full object-cover border border-purple-500/40 shrink-0 group-hover:scale-105 transition-transform duration-200"
              />
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                  {personaName}
                </p>
                <p className="text-[10px] text-purple-400/90 font-medium truncate">
                  Active Persona
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-purple-400" />
          </div>
        </div>
      </div>
    </aside>
  );
};
