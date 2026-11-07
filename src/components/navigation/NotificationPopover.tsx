/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  UserPlus,
  MessageSquare,
  Heart,
  Sparkles,
  Check,
  Trash2,
  X,
  Zap,
  Clock
} from 'lucide-react';

export interface AppNotification {
  id: string;
  type: 'follower' | 'comment' | 'favorite' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_1',
    type: 'follower',
    title: 'New Follower',
    message: 'You have a new follower! A community member started following your creator profile.',
    time: '12m ago',
    read: false
  },
  {
    id: 'notif_2',
    type: 'comment',
    title: 'New Character Comment',
    message: 'Someone left feedback: "Incredible roleplay persona! The mannerisms and backstory are so immersive."',
    time: '1h ago',
    read: false
  },
  {
    id: 'notif_3',
    type: 'favorite',
    title: 'Character Favorited',
    message: 'Your character received new community favorites and was added to user collections.',
    time: '3h ago',
    read: false
  },
  {
    id: 'notif_4',
    type: 'system',
    title: 'AI Catalog Ready',
    message: 'Datacat & JanitorAI live integration active with 200,000+ public character cards available in Discover.',
    time: 'Today',
    read: true
  }
];

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  onUpdateUnreadCount: (count: number) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  unreadCount,
  onUpdateUnreadCount
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('warden_notifications_v2');
      return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATIONS;
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync unread count
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    onUpdateUnreadCount(unread);
    try {
      localStorage.setItem('warden_notifications_v2', JSON.stringify(notifications));
    } catch (e) {
      console.warn('Failed to save notifications', e);
    }
  }, [notifications, onUpdateUnreadCount]);

  // Listen for live notifications pushed from storageService (e.g. followed creator uploads)
  useEffect(() => {
    const handleLiveUpdate = (e: Event) => {
      try {
        const custom = e as CustomEvent;
        if (Array.isArray(custom.detail)) {
          setNotifications(custom.detail);
        } else {
          const saved = localStorage.getItem('warden_notifications_v2');
          if (saved) setNotifications(JSON.parse(saved));
        }
      } catch {}
    };
    window.addEventListener('warden-notifications-updated', handleLiveUpdate);
    return () => window.removeEventListener('warden-notifications-updated', handleLiveUpdate);
  }, []);

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'follower':
        return <UserPlus className="w-4 h-4 text-purple-400" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case 'favorite':
        return <Heart className="w-4 h-4 text-rose-400 fill-rose-400/20" />;
      case 'system':
      default:
        return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-12 z-50 w-80 sm:w-96 bg-[#10131c] border border-[#1f2433] rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
    >
      {/* Header */}
      <div className="p-3.5 px-4 bg-[#141724] border-b border-[#1b1e28] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs font-bold text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-purple-600 text-white text-[10px] font-bold">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold px-2 py-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
            >
              Mark read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="text-neutral-400 hover:text-rose-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
              title="Clear all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-[#181c28]">
        {notifications.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <Bell className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-xs font-semibold text-neutral-300">No new notifications</p>
            <p className="text-[11px] text-neutral-500">
              When someone follows your profile, favorites your characters, or leaves comments, you will see them here.
            </p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`p-3.5 flex items-start gap-3 transition-colors ${
                n.read ? 'bg-[#10131c] hover:bg-[#131622]' : 'bg-[#141824] hover:bg-[#181d2e]'
              }`}
            >
              <div className="p-2 rounded-xl bg-[#181c28] border border-[#222736] shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-white truncate">{n.title}</h4>
                  <span className="text-[10px] text-neutral-500 font-mono shrink-0">{n.time}</span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">{n.message}</p>
              </div>

              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1.5 shadow-sm shadow-purple-500/50" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

