'use client';

// Top-level client provider wrapper mounted in the root layout. Currently
// just wires up the AuthProvider, but exists as a single seam for adding
// further app-wide context providers without touching layout.tsx.

import React from 'react';
import { AuthProvider } from '@/lib/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
