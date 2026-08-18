'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { EmailList } from '@/components/email/EmailList';
import { EmailRowData } from '@/components/email/EmailListRow';
import { fetchApi } from '@/lib/api';

export default function SentEmailsPage() {
  const [emails, setEmails] = useState<EmailRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSentEmails = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
      });

      const response = await fetchApi<{
        data: EmailRowData[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/api/emails/sent?${qs.toString()}`);

      setEmails(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load sent emails');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchSentEmails();
  }, [fetchSentEmails]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSentEmails(true);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <DashboardHeader
        searchValue={search}
        onSearchChange={handleSearchChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="flex-1 overflow-y-auto">
        <EmailList
          emails={emails}
          loading={loading}
          error={error}
          emptyTitle="No sent emails yet"
          emptyDescription="Scheduled emails will appear here after they are delivered by the worker."
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRetry={() => fetchSentEmails()}
        />
      </div>
    </div>
  );
}
