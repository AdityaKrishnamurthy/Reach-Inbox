'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { EmailRowData } from '@/components/email/EmailListRow';
import { FilterOptions } from '@/components/layout/DashboardHeader';

interface UseEmailListOptions {
  endpoint: '/api/emails/scheduled' | '/api/emails/sent';
  defaultSort: 'asc' | 'desc';
}

interface EmailListResponse {
  data: EmailRowData[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Shared fetch/search/filter/pagination logic for the Scheduled and Sent list
 * pages - both hit the same query-param contract on the backend, differing
 * only in endpoint and default sort order.
 */
export function useEmailList({ endpoint, defaultSort }: UseEmailListOptions) {
  const [emails, setEmails] = useState<EmailRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({ status: 'all', sort: defaultSort });
  const isInitialLoad = useRef(true);

  const fetchEmails = useCallback(
    async (isSilent = false) => {
      if (!isSilent && isInitialLoad.current) {
        setLoading(true);
      }
      setError(null);

      try {
        const params: Record<string, string> = {
          page: page.toString(),
          limit: '20',
          search: search.trim(),
          sort: filters.sort || defaultSort,
        };
        if (filters.status && filters.status !== 'all') {
          params.status = filters.status;
        }
        const qs = new URLSearchParams(params);
        const response = await fetchApi<EmailListResponse>(`${endpoint}?${qs.toString()}`);

        setEmails(response.data || []);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalResults(response.pagination?.total || 0);
      } catch (err: any) {
        setError(err.message || 'Failed to load emails');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
        isInitialLoad.current = false;
      }
    },
    [page, search, filters, endpoint, defaultSort]
  );

  useEffect(() => {
    fetchEmails(false);
  }, [fetchEmails]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchEmails(true);
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

  return {
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
    refetch: fetchEmails,
  };
}
