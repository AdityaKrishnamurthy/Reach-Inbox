'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, ExternalLink } from 'lucide-react';
import { EmailStatusBadge } from '../ui/Badge';

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
}

export const EmailListRow: React.FC<EmailListRowProps> = ({ email }) => {
  const [isStarred, setIsStarred] = useState(false);

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsStarred(!isStarred);
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="group relative flex items-center justify-between py-3.5 px-6 border-b border-gray-100 hover:bg-gray-50/80 transition-colors cursor-pointer select-none">
      <Link href={`/dashboard/email/${email.id}`} className="absolute inset-0 z-0">
        <span className="sr-only">View email {email.subject}</span>
      </Link>

      <div className="flex items-center gap-4 min-w-0 flex-1 z-10 pointer-events-none">
        {/* Recipient */}
        <div className="w-48 min-w-[160px] truncate text-sm font-medium text-gray-900">
          <span className="text-gray-400 font-normal mr-1">To:</span>
          {email.recipientEmail}
        </div>

        {/* Status Badge */}
        <div className="flex-shrink-0">
          <EmailStatusBadge
            status={email.status}
            scheduledAt={email.scheduledAt}
            failureReason={email.failureReason}
          />
        </div>

        {/* Subject & Preview Snippet */}
        <div className="min-w-0 flex-1 truncate text-sm text-gray-900">
          <span className="font-medium text-gray-900">{email.subject || '(No Subject)'}</span>
          {email.bodyPreview && (
            <span className="text-gray-500 font-normal ml-2">
              — {email.bodyPreview.replace(/<[^>]*>?/gm, ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Right Affordances */}
      <div className="flex items-center gap-3 z-10 pointer-events-auto pl-4">
        {/* Ethereal Mail Preview Link */}
        {email.etherealPreviewUrl && (
          <a
            href={email.etherealPreviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handlePreviewClick}
            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 transition-colors"
            title="Inspect in Ethereal Email"
          >
            <span>Preview</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* Star Icon */}
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
      </div>
    </div>
  );
};
