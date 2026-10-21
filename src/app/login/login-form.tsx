'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';
  const errorParam = searchParams.get('error');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(errorParam);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-8">
      <div className="mb-6 text-center">
        <span className="mb-2 inline-block font-sans text-xs font-semibold uppercase tracking-[2.52px] text-[#00d992]">
          Authentication
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-[#ffffff]">
          Sign in to Sutradhar
        </h1>
        <p className="mt-2 text-sm text-[#8b949e]">
          Continue with your Google account to access candidate matching and interview evaluations.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mb-6 rounded-[6px] border border-[#3d3a39] bg-[#101010] p-3.5 text-xs text-[#f2f2f2]"
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00d992]" />
            <span className="font-medium text-[#bdbdbd]">{errorMessage}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="group relative flex w-full items-center justify-center gap-3 rounded-[6px] border border-[#3d3a39] bg-[#101010] px-4 py-3 text-sm font-semibold text-[#f2f2f2] transition-all hover:border-[#00d992] hover:bg-[#151515] hover:text-[#ffffff] focus:outline-none focus:ring-1 focus:ring-[#00d992] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin text-[#00d992]"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span>Connecting to Google...</span>
          </div>
        ) : (
          <>
            <svg
              className="h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
              />
            </svg>
            <span>Sign in with Google</span>
          </>
        )}
      </button>

      <div className="mt-6 border-t border-[#3d3a39] pt-4 text-center">
        <p className="text-xs text-[#8b949e]">
          By continuing, you agree to Sutradhar&apos;s authentication terms and data retention policy.
        </p>
      </div>
    </div>
  );
}
