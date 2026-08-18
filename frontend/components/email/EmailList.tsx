'use client';

import React from 'react';
import { EmailListRow, EmailRowData } from './EmailListRow';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

interface EmailListProps {
  emails: EmailRowData[];
  loading: boolean;
  error?: string | null;
  emptyTitle: string;
  emptyDescription: string;
  page: number;
  totalPages: number;
  totalResults?: number;
  searchQuery?: string;
  onPageChange: (newPage: number) => void;
  onRetry?: () => void;
  actionText?: string;
  actionHref?: string;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  loading,
  error,
  emptyTitle,
  emptyDescription,
  page,
  totalPages,
  totalResults = 0,
  searchQuery = '',
  onPageChange,
  onRetry,
  actionText,
  actionHref,
}) => {
  if (loading) {
    return <LoadingState rows={8} />;
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm mb-4">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
        {onRetry && (
          <div>
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionText={searchQuery ? undefined : actionText}
        actionHref={searchQuery ? undefined : actionHref}
      />
    );
  }

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Email Rows List */}
      <div className="divide-y divide-gray-100">
        {emails.map((email) => (
          <EmailListRow key={email.id} email={email} searchQuery={searchQuery} />
        ))}
      </div>

      {/* Result Count & Pagination Controls */}
      <div className="py-4 px-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-white">
        <div>
          {totalResults > 0
            ? `Showing ${emails.length} of ${totalResults} result${totalResults === 1 ? '' : 's'}`
            : null}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
