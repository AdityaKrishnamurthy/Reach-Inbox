'use client';

// Trash view ("/dashboard/trash"). Lists deleted emails and offers restore
// or permanent-delete actions; restoring also broadcasts a sidebar count
// refresh event so the trash/other counts stay in sync.

import React from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { EmailList } from '@/components/email/EmailList';
import { useEmailList } from '@/lib/hooks/useEmailList';
import { fetchApi } from '@/lib/api';

export default function TrashEmailsPage() {
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
  } = useEmailList({ endpoint: '/api/emails/trash', defaultSort: 'desc' });

  const handleRestore = async (id: string) => {
    try {
      await fetchApi(`/api/emails/${id}/restore`, { method: 'PATCH' });
      refetch(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('reachinbox:refresh-counts'));
      }
    } catch (err) {
      console.error('Failed to restore email:', err);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await fetchApi(`/api/emails/${id}/permanent`, { method: 'DELETE' });
      refetch(true);
    } catch (err) {
      console.error('Failed to permanently delete email:', err);
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
          emptyTitle={search ? `No emails in trash matching "${search}"` : 'Trash is empty'}
          emptyDescription={
            search
              ? 'Try searching with a different recipient email, subject, or keyword.'
              : 'Emails you delete from the detail view will show up here until permanently deleted.'
          }
          page={page}
          totalPages={totalPages}
          totalResults={totalResults}
          onPageChange={setPage}
          onRetry={() => refetch()}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
        />
      </div>
    </div>
  );
}
