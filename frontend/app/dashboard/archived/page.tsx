'use client';

import React from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { EmailList } from '@/components/email/EmailList';
import { useEmailList } from '@/lib/hooks/useEmailList';
import { fetchApi } from '@/lib/api';

export default function ArchivedEmailsPage() {
  const {
    emails,
    loading,
    error,
    search,
    page,
    totalPages,
    totalResults,
    isRefreshing,
    filters,
    setPage,
    handleRefresh,
    handleSearchChange,
    handleFilterChange,
    refetch,
  } = useEmailList({ endpoint: '/api/emails/archived', defaultSort: 'desc' });

  const handleUnarchive = async (id: string) => {
    try {
      await fetchApi(`/api/emails/${id}/unarchive`, { method: 'PATCH' });
      refetch(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('reachinbox:refresh-counts'));
      }
    } catch (err) {
      console.error('Failed to unarchive email:', err);
    }
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
        allowedStatuses={[{ label: 'All', value: 'all' }]}
      />

      <div className="flex-1 overflow-y-auto">
        <EmailList
          emails={emails}
          loading={loading}
          error={error}
          searchQuery={search}
          emptyTitle={search ? `No archived emails matching "${search}"` : 'No archived emails'}
          emptyDescription={
            search
              ? 'Try searching with a different recipient email, subject, or keyword.'
              : 'Emails you archive from the detail view will show up here.'
          }
          page={page}
          totalPages={totalPages}
          totalResults={totalResults}
          onPageChange={setPage}
          onRetry={() => refetch()}
          onUnarchive={handleUnarchive}
        />
      </div>
    </div>
  );
}
