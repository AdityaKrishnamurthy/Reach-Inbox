'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  ExternalLink,
  Mail,
  ChevronDown,
  Archive,
  ArchiveRestore,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { EmailStatusBadge } from '../ui/Badge';
import { useAuth } from '@/lib/auth-context';
import Image from 'next/image';
import { isEmailStarred, toggleEmailStar } from '@/lib/starred';
import { fetchApi } from '@/lib/api';

export interface EmailDetailData {
  id: string;
  campaignId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt: string | null;
  failureReason: string | null;
  etherealPreviewUrl: string | null;
  attempts: number;
  idempotencyKey: string;
  isArchived: boolean;
  isDeleted: boolean;
  delayMs: number;
  hourlyLimit: number;
  senderName: string;
  senderEmail: string;
  createdAt: string;
}

interface EmailDetailProps {
  email: EmailDetailData;
}

export const EmailDetail: React.FC<EmailDetailProps> = ({ email }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [isStarred, setIsStarred] = useState(false);
  const [showRecipientDetails, setShowRecipientDetails] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

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

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else if (email.status === 'sent' || email.status === 'failed') {
      router.push('/dashboard/sent');
    } else {
      router.push('/dashboard/scheduled');
    }
  };

  const handleToggleStar = () => {
    const newState = toggleEmailStar(email.id);
    setIsStarred(newState);
  };

  const runAction = async (
    action: () => Promise<unknown>,
    successMessage: string,
    fallbackListPath: string
  ) => {
    if (isActionPending) return;
    setIsActionPending(true);
    setActionNotice(null);
    try {
      await action();
      setActionNotice(successMessage);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('reachinbox:refresh-counts'));
      }
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackListPath);
        }
      }, 900);
    } catch (err: any) {
      setActionNotice(err.message || 'Action failed. Please try again.');
      setIsActionPending(false);
    }
  };

  const defaultListPath = email.status === 'sent' || email.status === 'failed' ? '/dashboard/sent' : '/dashboard/scheduled';

  const handleArchive = () =>
    runAction(() => fetchApi(`/api/emails/${email.id}/archive`, { method: 'PATCH' }), 'Email archived.', defaultListPath);

  const handleUnarchive = () =>
    runAction(() => fetchApi(`/api/emails/${email.id}/unarchive`, { method: 'PATCH' }), 'Email moved out of archive.', '/dashboard/archived');

  const handleDelete = () =>
    runAction(() => fetchApi(`/api/emails/${email.id}`, { method: 'DELETE' }), 'Email moved to trash.', defaultListPath);

  const handleRestore = () =>
    runAction(() => fetchApi(`/api/emails/${email.id}/restore`, { method: 'PATCH' }), 'Email restored.', '/dashboard/trash');

  const handlePermanentDelete = () => {
    if (!window.confirm('Permanently delete this email? This cannot be undone.')) return;
    runAction(
      () => fetchApi(`/api/emails/${email.id}/permanent`, { method: 'DELETE' }),
      'Email permanently deleted.',
      '/dashboard/trash'
    );
  };

  const formattedDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const normalizeEmailHtml = (rawHtml: string) => {
    if (!rawHtml) return '';
    if (!/<[a-z][\s\S]*>/i.test(rawHtml)) {
      return rawHtml
        .split(/\r?\n\r?\n/)
        .map((p) => `<p>${p.replace(/\r?\n/g, '<br/>')}</p>`)
        .join('');
    }
    return rawHtml
      .replace(/(<p>\s*(<br\s*\/?>)?\s*<\/p>\s*){2,}/gi, '<p><br/></p>')
      .replace(/(<br\s*\/?>\s*){3,}/gi, '<br/><br/>');
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-8 space-y-6 select-none">
      {/* Top Action Bar (Figma Match 9419) */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={handleBack}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 leading-tight">
            {email.subject || '(No Subject)'}
          </h1>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <EmailStatusBadge
            status={email.status}
            scheduledAt={email.scheduledAt}
            failureReason={email.failureReason}
          />

          {email.etherealPreviewUrl && (
            <a
              href={email.etherealPreviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium rounded-md border border-emerald-200 transition-colors"
              title="Inspect Email"
            >
              <span>Preview</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Star Action (hidden for trashed emails, matching the list view) */}
          {!email.isDeleted && (
            <button
              type="button"
              onClick={handleToggleStar}
              className={`p-2 rounded-full transition-colors ${
                isStarred
                  ? 'text-amber-400 hover:text-amber-500 bg-amber-50'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
              title={isStarred ? 'Unstar' : 'Star'}
            >
              <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
            </button>
          )}

          {/* Archive / Unarchive Action */}
          {email.isDeleted ? null : email.isArchived ? (
            <button
              type="button"
              onClick={handleUnarchive}
              disabled={isActionPending}
              className="p-2 rounded-full text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
              title="Unarchive"
            >
              <ArchiveRestore className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleArchive}
              disabled={isActionPending}
              className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Archive"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}

          {/* Delete / Restore / Delete Forever Action */}
          {email.isDeleted ? (
            <>
              <button
                type="button"
                onClick={handleRestore}
                disabled={isActionPending}
                className="p-2 rounded-full text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                title="Restore"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={isActionPending}
                className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                title="Delete forever"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isActionPending}
              className="p-2 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <div className="w-[1px] h-5 bg-gray-200 mx-1" />

          {/* User Avatar */}
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.name || 'User'}
              width={32}
              height={32}
              className="rounded-full flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center justify-center flex-shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs">
          {actionNotice}
        </div>
      )}

      {/* Sender / Recipient Metadata Card */}
      <div className="flex items-start justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#00A36C] text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-sm">
            {email.senderName ? email.senderName.charAt(0).toUpperCase() : <Mail className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{email.senderName}</span>
              <span className="text-xs text-gray-400">&lt;{email.senderEmail}&gt;</span>
            </div>
            <div className="relative inline-block mt-0.5">
              <button
                type="button"
                onClick={() => setShowRecipientDetails(!showRecipientDetails)}
                className="text-xs text-gray-500 hover:text-gray-900 inline-flex items-center gap-1 transition-colors"
              >
                <span>to {email.recipientEmail}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {showRecipientDetails && (
                <div className="absolute left-0 top-full mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-xs space-y-1.5 z-20 min-w-[260px]">
                  <div>
                    <span className="text-gray-400">From: </span>
                    <span className="text-gray-800 font-medium">
                      {email.senderName} &lt;{email.senderEmail}&gt;
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">To: </span>
                    <span className="text-gray-800 font-medium">{email.recipientEmail}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Date: </span>
                    <span className="text-gray-800">
                      {email.sentAt ? formattedDate(email.sentAt) : formattedDate(email.scheduledAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Subject: </span>
                    <span className="text-gray-800">{email.subject}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-right text-xs text-gray-400">
          <div>
            {email.sentAt ? formattedDate(email.sentAt) : `Scheduled: ${formattedDate(email.scheduledAt)}`}
          </div>
          {email.failureReason && (
            <div className="text-red-600 mt-1 font-medium">Error: {email.failureReason}</div>
          )}
        </div>
      </div>

      {/* Message Body Content */}
      <div className="pt-6 pb-8 border-t border-gray-100">
        <div
          className="email-body-content"
          dangerouslySetInnerHTML={{ __html: normalizeEmailHtml(email.body) }}
        />
      </div>

      {/* Campaign Details Footer */}
      <div className="pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-gray-500">
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-gray-400 font-medium mb-1">Status</div>
          <div className="text-gray-900 font-semibold uppercase">{email.status}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-gray-400 font-medium mb-1">Inter-Email Delay</div>
          <div className="text-gray-900 font-semibold">{email.delayMs / 1000}s</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-gray-400 font-medium mb-1">Hourly Limit</div>
          <div className="text-gray-900 font-semibold">{email.hourlyLimit}/hr</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="text-gray-400 font-medium mb-1">Attempts</div>
          <div className="text-gray-900 font-semibold">{email.attempts}</div>
        </div>
      </div>
    </div>
  );
};
