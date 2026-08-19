'use client';

// Shared header used at the top of each email list view (Scheduled/Sent/
// Archived/Trash/Starred). Provides a debounced search input, a status/sort
// filter popover, and a manual refresh button, reporting changes back up via
// callback props rather than owning any list data itself.

import React, { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, RotateCw, X, Check } from 'lucide-react';

export interface FilterOptions {
  status?: string;
  sort?: 'asc' | 'desc';
}

interface DashboardHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  filterOptions?: FilterOptions;
  onFilterChange?: (filters: FilterOptions) => void;
  allowedStatuses?: { label: string; value: string }[];
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  searchValue,
  onSearchChange,
  onRefresh,
  isRefreshing = false,
  filterOptions = { status: 'all', sort: 'desc' },
  onFilterChange,
  allowedStatuses = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Sent Only', value: 'sent' },
    { label: 'Failed Only', value: 'failed' },
  ],
}) => {
  const [localValue, setLocalValue] = useState(searchValue);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Sync external search value if changed from outside
  useEffect(() => {
    setLocalValue(searchValue);
  }, [searchValue]);

  // Click outside to close filter popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onSearchChange(val);
    }, 250);
  };

  const handleClear = () => {
    setLocalValue('');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onSearchChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      onSearchChange(localValue);
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  const isFilterActive =
    (filterOptions.status && filterOptions.status !== 'all') ||
    filterOptions.sort === 'asc';

  return (
    <header className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between gap-4 select-none relative z-20">
      {/* Search Input */}
      <div className="flex-1 max-w-lg">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Search emails, recipients, subjects..."
            className="w-full pl-10 pr-9 py-2 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 rounded-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
          />
          {localValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Action Affordances */}
      <div className="flex items-center gap-2">
        {/* Filter Button & Dropdown */}
        <div className="relative" ref={filterDropdownRef}>
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            aria-label="Filter"
            className={`p-2 rounded-full transition-colors relative ${
              isFilterOpen || isFilterActive
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title="Filter and Sort"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {isFilterActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-600 absolute top-1 right-1" />
            )}
          </button>

          {isFilterOpen && onFilterChange && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-30 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 font-semibold text-gray-900 border-b border-gray-100 flex items-center justify-between">
                <span>Filter & Sort</span>
                {isFilterActive && (
                  <button
                    onClick={() => {
                      onFilterChange({ status: 'all', sort: 'desc' });
                    }}
                    className="text-[11px] text-emerald-600 hover:underline font-normal"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Status Filter */}
              <div className="py-1.5 border-b border-gray-100">
                <div className="px-3 py-1 text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                  Status
                </div>
                {allowedStatuses.map((st) => {
                  const isSelected = (filterOptions.status || 'all') === st.value;
                  return (
                    <button
                      key={st.value}
                      onClick={() => {
                        onFilterChange({ ...filterOptions, status: st.value });
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 transition-colors text-left ${
                        isSelected ? 'text-emerald-700 font-medium bg-emerald-50/50' : 'text-gray-700'
                      }`}
                    >
                      <span>{st.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>

              {/* Sort Order */}
              <div className="py-1.5">
                <div className="px-3 py-1 text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                  Sort By Time
                </div>
                <button
                  onClick={() => onFilterChange({ ...filterOptions, sort: 'desc' })}
                  className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 transition-colors text-left ${
                    (filterOptions.sort || 'desc') === 'desc'
                      ? 'text-emerald-700 font-medium bg-emerald-50/50'
                      : 'text-gray-700'
                  }`}
                >
                  <span>Newest First</span>
                  {(filterOptions.sort || 'desc') === 'desc' && (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </button>
                <button
                  onClick={() => onFilterChange({ ...filterOptions, sort: 'asc' })}
                  className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 transition-colors text-left ${
                    filterOptions.sort === 'asc'
                      ? 'text-emerald-700 font-medium bg-emerald-50/50'
                      : 'text-gray-700'
                  }`}
                >
                  <span>Oldest First</span>
                  {filterOptions.sort === 'asc' && (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reload / Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh"
          className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50 active:scale-95"
          title="Refresh List & Statuses"
        >
          <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>
    </header>
  );
};
