'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardHeader, FilterOptions } from '@/components/layout/DashboardHeader';
import { EmailList } from '@/components/email/EmailList';
import { EmailRowData } from '@/components/email/EmailListRow';
import { fetchApi } from '@/lib/api';

export default function ScheduledEmailsPage() {
  const [emails, setEmails] = useState<EmailRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({ status: 'all', sort: 'asc' });
  const isInitialLoad = useRef(true);

  const fetchScheduledEmails = useCallback(async (isSilent = false) => {
    if (!isSilent && isInitialLoad.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '20',
        search: search.trim(),
        sort: filters.sort || 'asc',
      };

      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }

      const qs = new URLSearchParams(params);

      const response = await fetchApi<{
        data: EmailRowData[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }>(`/api/emails/scheduled?${qs.toString()}`);

      setEmails(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load scheduled emails');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      isInitialLoad.current = false;
    }
  }, [page, search, filters]);

  useEffect(() => {
    fetchScheduledEmails(false);
  }, [fetchScheduledEmails]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchScheduledEmails(true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('reachinbox:refresh-counts'));
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <DashboardHeader
        searchValue={search}
        onSearchChange={handleSearchChange}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        filterOptions={filters}
        onFilterChange={handleFilterChange}
        allowedStatuses={[
          { label: 'All Scheduled', value: 'all' },
          { label: 'Scheduled', value: 'scheduled' },
          { label: 'Processing', value: 'processing' },
        ]}
      />

      <div className="flex-1 overflow-y-auto">
        <EmailList
          emails={emails}
          loading={loading}
          error={error}
          searchQuery={search}
          emptyTitle={
            search
              ? `No scheduled emails matching "${search}"`
              : filters.status !== 'all'
              ? `No ${filters.status} emails found`
              : 'No scheduled emails'
          }
          emptyDescription={
            search
              ? 'Try searching with a different recipient email, subject, or keyword.'
              : "You don't have any emails scheduled for future delivery right now."
          }
          actionText="Compose New Email"
          actionHref="/dashboard/compose"
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRetry={() => fetchScheduledEmails()}
        />
      </div>
    </div>
  );
}
