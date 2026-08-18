'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, ExternalLink, Mail } from 'lucide-react';
import { EmailStatusBadge } from '../ui/Badge';

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

  return (
    <div className="max-w-4xl mx-auto py-6 px-8 space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/scheduled"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            title="Back to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 truncate">
            {email.subject || '(No Subject)'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
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
            >
              <span>View in Ethereal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            className="p-2 rounded-full text-gray-400 hover:text-amber-500 hover:bg-gray-50 transition-colors"
          >
            <Star className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sender / Recipient Metadata Card */}
      <div className="flex items-start justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-sm flex items-center justify-center flex-shrink-0">
            {email.senderName ? email.senderName.charAt(0).toUpperCase() : <Mail className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{email.senderName}</span>
              <span className="text-xs text-gray-400">&lt;{email.senderEmail}&gt;</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              <span>to </span>
              <span className="font-medium text-gray-700">{email.recipientEmail}</span>
            </div>
          </div>
        </div>

        <div className="text-right text-xs text-gray-400">
          <div>
            {email.sentAt ? `Sent: ${formattedDate(email.sentAt)}` : `Scheduled: ${formattedDate(email.scheduledAt)}`}
          </div>
          {email.failureReason && (
            <div className="text-red-600 mt-1 font-medium">Error: {email.failureReason}</div>
          )}
        </div>
      </div>

      {/* Message Body */}
      <div className="pt-6 pb-8 border-t border-gray-100">
        <div
          className="prose prose-sm max-w-none text-gray-800 leading-relaxed space-y-4"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />
      </div>

      {/* Campaign Details Footer */}
      <div className="pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-gray-500">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-gray-400 font-medium mb-1">Status</div>
          <div className="text-gray-900 font-semibold uppercase">{email.status}</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-gray-400 font-medium mb-1">Inter-Email Delay</div>
          <div className="text-gray-900 font-semibold">{email.delayMs / 1000}s</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-gray-400 font-medium mb-1">Hourly Limit</div>
          <div className="text-gray-900 font-semibold">{email.hourlyLimit}/hr</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-gray-400 font-medium mb-1">Attempts</div>
          <div className="text-gray-900 font-semibold">{email.attempts}</div>
        </div>
      </div>
    </div>
  );
};
