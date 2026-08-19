'use client';

// Starred emails view ("/dashboard/starred"). Reads the locally stored set
// of starred email IDs, fetches those specific emails by ID, and applies
// search/sort entirely client-side since the starred set is expected to be
// small. Re-fetches whenever a star is toggled elsewhere in the app.

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardHeader, FilterOptions } from '@/components/layout/DashboardHeader';
import { EmailList } from '@/components/email/EmailList';
import { EmailRowData } from '@/components/email/EmailListRow';
import { fetchApi } from '@/lib/api';
import { getStarredEmailIds } from '@/lib/starred';

export default function StarredEmailsPage() {
  const [allEmails, setAllEmails] = useState<EmailRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({ sort: 'desc' });

  const fetchStarred = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const ids = getStarredEmailIds();
      if (ids.length === 0) {
        setAllEmails([]);
        return;
      }
      const res = await fetchApi<{ data: EmailRowData[] }>('/api/emails/by-ids', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      setAllEmails(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load starred emails');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStarred(false);
    const handleStarChanged = () => fetchStarred(true);
    window.addEventListener('reachinbox:star-changed', handleStarChanged);
    return () => window.removeEventListener('reachinbox:star-changed', handleStarChanged);
  }, [fetchStarred]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStarred(true);
  };

  // Starred emails are already fully loaded client-side (small dataset by
  // nature), so search/sort are applied locally rather than round-tripping.
  const query = search.trim().toLowerCase();
  const filtered = query
    ? allEmails.filter(
        (e) =>
          e.recipientEmail.toLowerCase().includes(query) ||
          (e.subject || '').toLowerCase().includes(query) ||
          (e.bodyPreview || '').toLowerCase().includes(query)
      )
    : allEmails;

  const sorted = [...filtered].sort((a, b) => {
    const aTime = new Date(a.sentAt || a.scheduledAt).getTime();
    const bTime = new Date(b.sentAt || b.scheduledAt).getTime();
    return filters.sort === 'asc' ? aTime - bTime : bTime - aTime;
  });

  return (
    <div className="flex flex-col h-full bg-white">
      <DashboardHeader
        searchValue={search}
        onSearchChange={setSearch}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        filterOptions={filters}
        onFilterChange={setFilters}
        allowedStatuses={[{ label: 'All', value: 'all' }]}
      />

      <div className="flex-1 overflow-y-auto">
        <EmailList
          emails={sorted}
          loading={loading}
          error={error}
          searchQuery={search}
          emptyTitle={search ? `No starred emails matching "${search}"` : 'No starred emails'}
          emptyDescription={
            search
              ? 'Try searching with a different recipient email, subject, or keyword.'
              : 'Star an email from any list or its detail view to pin it here.'
          }
          page={1}
          totalPages={1}
          totalResults={sorted.length}
          onPageChange={() => {}}
          onRetry={() => fetchStarred()}
        />
      </div>
    </div>
  );
}
