'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginCard } from '@/components/auth/LoginCard';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex flex-col items-center">
      <div className="mb-8 flex items-center gap-2">
        <div className="w-8 h-8 bg-black text-white rounded flex items-center justify-center font-bold text-lg tracking-tight">
          R
        </div>
        <span className="text-xl font-semibold tracking-tight text-gray-900">ReachInbox</span>
      </div>

      <LoginCard errorMessage={error} />

      <div className="mt-8 text-center text-xs text-gray-400">
        ReachInbox Cold Email Infrastructure &bull; Secure Google Authentication
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-gray-400 text-sm">Loading login...</div>}>
        <LoginContent />
      </Suspense>
    </main>
  );
}
