import React from 'react';

export const LoadingState: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full divide-y divide-gray-100 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="py-4 px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-36 h-4 bg-gray-200 rounded" />
            <div className="w-28 h-5 bg-gray-100 rounded-full" />
            <div className="w-64 h-4 bg-gray-200 rounded" />
          </div>
          <div className="w-4 h-4 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
};
