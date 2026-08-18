'use client';

import React from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { EmailList } from '@/components/email/EmailList';
import { useEmailList } from '@/lib/hooks/useEmailList';

export default function ScheduledEmailsPage() {
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
  } = useEmailList({ endpoint: '/api/emails/scheduled', defaultSort: 'asc' });

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
          totalResults={totalResults}
          onPageChange={setPage}
          onRetry={() => refetch()}
        />
      </div>
    </div>
  );
}
