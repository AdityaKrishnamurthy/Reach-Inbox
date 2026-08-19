'use client';

// Login route ("/login"). Renders the Google OAuth login card and surfaces
// any auth error passed back via the "error" query param after a failed
// OAuth redirect.

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LoginCard } from '@/components/auth/LoginCard';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex flex-col items-center">
      <Link href="/" className="mb-8 flex items-center gap-2 hover:opacity-90 transition-opacity">
        <div className="w-8 h-8 bg-[#00A36C] text-white rounded-lg flex items-center justify-center font-bold text-lg tracking-tight shadow-sm">
          R
        </div>
        <span className="text-xl font-semibold tracking-tight text-gray-900">Reach-Inbox</span>
      </Link>

      <LoginCard errorMessage={error} />

      <div className="mt-8 text-center text-xs text-gray-400">
        Reach-Inbox Cold Email Infrastructure &bull; Secure Google Authentication
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
