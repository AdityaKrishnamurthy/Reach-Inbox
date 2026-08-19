'use client';

// Sent emails view ("/dashboard/sent"). Lists recipients whose worker job
// has already run, showing both successfully sent and failed deliveries with
// search, status filtering, and pagination via useEmailList.

import React from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { EmailList } from '@/components/email/EmailList';
import { useEmailList } from '@/lib/hooks/useEmailList';

export default function SentEmailsPage() {
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
  } = useEmailList({ endpoint: '/api/emails/sent', defaultSort: 'desc' });

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
          { label: 'All Sent & Failed', value: 'all' },
          { label: 'Sent Successfully', value: 'sent' },
          { label: 'Failed Only', value: 'failed' },
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
              ? `No emails matching "${search}"`
              : filters.status !== 'all'
              ? `No ${filters.status} emails found`
              : 'No sent emails yet'
          }
          emptyDescription={
            search
              ? 'Try searching with a different recipient email, subject, or keyword.'
              : 'Scheduled emails will appear here after they are delivered by the worker.'
          }
          actionText="Compose New Email"
          actionHref="/dashboard/compose"
          page={page}
          totalPages={totalPages}
          totalResults={totalResults}
          onPageChange={setPage}
          onRetry={() => refetch()}
        />
      </div>
    </div>
  );
}
