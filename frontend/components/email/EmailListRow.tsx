'use client';

// Single row in an email list (Scheduled/Sent/Archived/Trash/Starred).
// Shows recipient, status badge, subject/preview with search-term
// highlighting, and the context-appropriate row actions (star, unarchive,
// restore, permanent delete) depending on which props the parent view passes.

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, ArchiveRestore, Trash2, RotateCcw } from 'lucide-react';
import { EmailStatusBadge } from '../ui/Badge';
import { isEmailStarred, toggleEmailStar } from '@/lib/starred';

export interface EmailRowData {
  id: string;
  campaignId: string;
  recipientEmail: string;
  subject: string;
  bodyPreview: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  failureReason: string | null;
  etherealPreviewUrl: string | null;
  attempts: number;
  senderName: string;
}

interface EmailListRowProps {
  email: EmailRowData;
  searchQuery?: string;
  /** Row-level actions for the Archived/Trash views (omit for the default Scheduled/Sent lists) */
  onUnarchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
}

const HighlightMatch: React.FC<{ text: string; query?: string }> = ({ text, query }) => {
  if (!query || !query.trim() || !text) return <span>{text}</span>;

  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.trim().toLowerCase() ? (
          <mark key={i} className="bg-emerald-100 text-emerald-900 rounded-sm px-0.5 font-medium not-italic">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

export const EmailListRow: React.FC<EmailListRowProps> = ({
  email,
  searchQuery = '',
  onUnarchive,
  onRestore,
  onPermanentDelete,
}) => {
  const [isStarred, setIsStarred] = useState(false);

  useEffect(() => {
    setIsStarred(isEmailStarred(email.id));

    const handleStarChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string; isStarred: boolean }>;
      if (customEvent.detail && customEvent.detail.id === email.id) {
        setIsStarred(customEvent.detail.isStarred);
      }
    };

    window.addEventListener('reachinbox:star-changed', handleStarChanged);
    return () => {
      window.removeEventListener('reachinbox:star-changed', handleStarChanged);
    };
  }, [email.id]);

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newState = toggleEmailStar(email.id);
    setIsStarred(newState);
  };

  const handleUnarchiveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onUnarchive?.(email.id);
  };

  const handleRestoreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRestore?.(email.id);
  };

  const handlePermanentDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Permanently delete this email? This cannot be undone.')) {
      onPermanentDelete?.(email.id);
    }
  };

  const cleanBodyPreview = email.bodyPreview ? email.bodyPreview.replace(/<[^>]*>?/gm, ' ') : '';

  return (
    <div className="group relative flex items-center justify-between py-3.5 px-6 border-b border-gray-100 hover:bg-gray-50/80 transition-colors cursor-pointer select-none">
      <Link href={`/dashboard/email/${email.id}`} className="absolute inset-0 z-0">
        <span className="sr-only">View email {email.subject}</span>
      </Link>

      <div className="flex items-center gap-4 min-w-0 flex-1 z-10 pointer-events-none">
        {/* Recipient */}
        <div className="w-48 min-w-[160px] truncate text-sm font-medium text-gray-900">
          <span className="text-gray-400 font-normal mr-1">To:</span>
          <HighlightMatch text={email.recipientEmail} query={searchQuery} />
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <EmailStatusBadge
            status={email.status}
            scheduledAt={email.scheduledAt}
            failureReason={email.failureReason}
          />
          {(email.status === 'sent' || email.status === 'failed') && email.sentAt && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {new Date(email.sentAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </span>
          )}
        </div>

        {/* Subject & Preview Snippet */}
        <div className="min-w-0 flex-1 truncate text-sm text-gray-900">
          <span className="font-medium text-gray-900">
            <HighlightMatch text={email.subject || '(No Subject)'} query={searchQuery} />
          </span>
          {cleanBodyPreview && (
            <span className="text-gray-500 font-normal ml-2">
              - <HighlightMatch text={cleanBodyPreview} query={searchQuery} />
            </span>
          )}
        </div>
      </div>

      {/* Right Affordances */}
      <div className="flex items-center gap-3 z-10 pointer-events-auto pl-4">

        {/* Star Icon (hidden in Archived/Trash rows to keep those actions focused) */}
        {!onUnarchive && !onRestore && (
          <button
            type="button"
            onClick={handleStarClick}
            aria-label={isStarred ? 'Unstar email' : 'Star email'}
            className={`p-1 rounded transition-colors ${
              isStarred ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 hover:text-gray-500'
            }`}
          >
            <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
          </button>
        )}

        {/* Archived-view action */}
        {onUnarchive && (
          <button
            type="button"
            onClick={handleUnarchiveClick}
            aria-label="Unarchive"
            title="Unarchive"
            className="p-1 rounded text-gray-400 hover:text-emerald-600 transition-colors"
          >
            <ArchiveRestore className="w-4 h-4" />
          </button>
        )}

        {/* Trash-view actions */}
        {onRestore && (
          <button
            type="button"
            onClick={handleRestoreClick}
            aria-label="Restore"
            title="Restore"
            className="p-1 rounded text-gray-400 hover:text-emerald-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        {onPermanentDelete && (
          <button
            type="button"
            onClick={handlePermanentDeleteClick}
            aria-label="Delete forever"
            title="Delete forever"
            className="p-1 rounded text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
