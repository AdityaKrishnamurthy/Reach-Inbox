'use client';

import React, { useState } from 'react';
import { GoogleLoginButton } from './GoogleLoginButton';

interface LoginCardProps {
  errorMessage?: string | null;
}

export const LoginCard: React.FC<LoginCardProps> = ({ errorMessage }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [infoNotice, setInfoNotice] = useState<string | null>(null);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInfoNotice(
      'Notice: Direct email login is a Figma mockup element. Please use "Login with Google" above for real OAuth authentication.'
    );
  };

  return (
    <div className="w-full max-w-[420px] bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
        Login
      </h1>

      {errorMessage && (
        <div className="mb-5 p-3 text-xs bg-red-50 text-red-700 border border-red-200 rounded-md">
          {errorMessage === 'oauth_config_missing'
            ? 'Google OAuth credentials not configured on backend (.env).'
            : errorMessage === 'oauth_failed'
            ? 'Google sign-in was cancelled or failed. Please try again.'
            : errorMessage === 'auth_failed'
            ? 'Authentication failed. Please try again.'
            : errorMessage}
        </div>
      )}

      {infoNotice && (
        <div className="mb-5 p-3 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-md">
          {infoNotice}
        </div>
      )}

      {/* Google OAuth Login Button */}
      <div className="mb-6">
        <GoogleLoginButton />
      </div>

      {/* Divider */}
      <div className="relative flex items-center justify-center mb-6">
        <div className="border-t border-gray-200 w-full" />
        <span className="bg-white px-3 text-xs text-gray-400 font-normal absolute">
          or sign up through email
        </span>
      </div>

      {/* Email Password Form (Figma Visual Match) */}
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email ID"
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          />
        </div>

        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-sm rounded-lg transition-colors shadow-sm"
        >
          Login
        </button>
      </form>
    </div>
  );
};
