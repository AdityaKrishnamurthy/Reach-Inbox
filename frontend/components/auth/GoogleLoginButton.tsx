'use client';

// Button that kicks off the real Google OAuth flow by redirecting the
// browser to the backend's /api/auth/google endpoint (unless a custom
// onClick override is supplied).

import React from 'react';

interface GoogleLoginButtonProps {
  onClick?: () => void;
  disabled?: boolean;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onClick,
  disabled,
}) => {
  const handleGoogleClick = () => {
    if (onClick) {
      onClick();
    } else {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      window.location.href = `${apiUrl}/api/auth/google`;
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-[#E8F5E9] hover:bg-[#DCFCE7] active:bg-[#BBF7D0] text-[#166534] font-medium text-sm rounded border border-[#BBF7D0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Google "G" SVG Icon */}
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        />
      </svg>
      <span>Login with Google</span>
    </button>
  );
};
