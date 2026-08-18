'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { fetchApi } from '@/lib/api';
import { Clock, Send, Star, Archive, Trash2, ChevronDown, LogOut, Plus, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import { getStarredEmailIds } from '@/lib/starred';

interface EmailCounts {
  scheduled: number;
  sent: number;
  archived: number;
  trash: number;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [counts, setCounts] = useState<EmailCounts>({ scheduled: 0, sent: 0, archived: 0, trash: 0 });
  const [starredCount, setStarredCount] = useState(0);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const data = await fetchApi<EmailCounts>('/api/emails/counts');
        if (isMounted && data) {
          setCounts(data);
        }
      } catch {
        // Silently ignore if not logged in yet
      }
    };

    fetchCounts();

    // Auto-refresh counts every 6 seconds and on custom refresh event
    const interval = setInterval(fetchCounts, 6000);
    const handleCustomRefresh = () => fetchCounts();
    window.addEventListener('reachinbox:refresh-counts', handleCustomRefresh);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('reachinbox:refresh-counts', handleCustomRefresh);
    };
  }, [pathname]);

  useEffect(() => {
    // Starred is a localStorage-only concept, so its count is computed
    // locally rather than fetched - it updates instantly on every star toggle.
    const updateStarredCount = () => setStarredCount(getStarredEmailIds().length);
    updateStarredCount();
    window.addEventListener('reachinbox:star-changed', updateStarredCount);
    return () => window.removeEventListener('reachinbox:star-changed', updateStarredCount);
  }, []);

  const isScheduledActive = pathname === '/dashboard' || pathname === '/dashboard/scheduled';
  const isSentActive = pathname === '/dashboard/sent';
  const isStarredActive = pathname === '/dashboard/starred';
  const isArchivedActive = pathname === '/dashboard/archived';
  const isTrashActive = pathname === '/dashboard/trash';

  return (
    <aside className="w-64 min-w-[256px] h-screen bg-white border-r border-gray-200 flex flex-col justify-between select-none">
      <div className="p-4 space-y-6">
        {/* Brand Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-2 hover:opacity-90 transition-opacity cursor-pointer"
          title="ReachInbox Home"
        >
          <div className="w-8 h-8 bg-[#00A36C] text-white rounded-lg flex items-center justify-center font-bold text-base tracking-tight shadow-sm">
            R
          </div>
          <span className="text-lg font-semibold tracking-tight text-gray-900">ReachInbox</span>
        </Link>

        {/* Profile Card */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {user?.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.name || 'User'}
                  width={34}
                  height={34}
                  className="rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'My Account'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {user?.email || 'user@reachinbox.test'}
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>

          {/* Profile Dropdown */}
          {isProfileMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-30">
              <div className="px-3 py-2 border-b border-gray-100">
                <div className="text-xs font-semibold text-gray-900 truncate">{user?.name}</div>
                <div className="text-xs text-gray-500 truncate">{user?.email}</div>
              </div>
              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Compose Button (Figma Match: Outlined Green Pill) */}
        <div>
          <Link
            href="/dashboard/compose"
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-full border border-[#00A36C] bg-white hover:bg-[#F0FDF4] active:bg-[#DCFCE7] text-[#00A36C] font-medium text-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#00A36C]" />
            <span>Compose</span>
          </Link>
        </div>

        {/* Navigation Section */}
        <div className="space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
            CORE
          </div>

          {/* Scheduled Nav */}
          <Link
            href="/dashboard/scheduled"
            className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isScheduledActive
                ? 'bg-[#E8F5E9] text-[#166534]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className={`w-4 h-4 ${isScheduledActive ? 'text-[#166534]' : 'text-gray-400'}`} />
              <span>Scheduled</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isScheduledActive
                  ? 'bg-[#DCFCE7] text-[#166534] font-semibold'
                  : 'text-gray-400'
              }`}
            >
              {counts.scheduled}
            </span>
          </Link>

          {/* Sent Nav */}
          <Link
            href="/dashboard/sent"
            className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isSentActive
                ? 'bg-[#E8F5E9] text-[#166534]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Send className={`w-4 h-4 ${isSentActive ? 'text-[#166534]' : 'text-gray-400'}`} />
              <span>Sent</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isSentActive
                  ? 'bg-[#DCFCE7] text-[#166534] font-semibold'
                  : 'text-gray-400'
              }`}
            >
              {counts.sent}
            </span>
          </Link>

          {/* Starred Nav */}
          <Link
            href="/dashboard/starred"
            className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isStarredActive
                ? 'bg-[#E8F5E9] text-[#166534]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Star className={`w-4 h-4 ${isStarredActive ? 'text-[#166534]' : 'text-gray-400'}`} />
              <span>Starred</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isStarredActive ? 'bg-[#DCFCE7] text-[#166534] font-semibold' : 'text-gray-400'
              }`}
            >
              {starredCount}
            </span>
          </Link>

          {/* Archived Nav */}
          <Link
            href="/dashboard/archived"
            className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isArchivedActive
                ? 'bg-[#E8F5E9] text-[#166534]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Archive className={`w-4 h-4 ${isArchivedActive ? 'text-[#166534]' : 'text-gray-400'}`} />
              <span>Archived</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isArchivedActive ? 'bg-[#DCFCE7] text-[#166534] font-semibold' : 'text-gray-400'
              }`}
            >
              {counts.archived}
            </span>
          </Link>

          {/* Trash Nav */}
          <Link
            href="/dashboard/trash"
            className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isTrashActive
                ? 'bg-[#E8F5E9] text-[#166534]'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <Trash2 className={`w-4 h-4 ${isTrashActive ? 'text-[#166534]' : 'text-gray-400'}`} />
              <span>Trash</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isTrashActive ? 'bg-[#DCFCE7] text-[#166534] font-semibold' : 'text-gray-400'
              }`}
            >
              {counts.trash}
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
};
