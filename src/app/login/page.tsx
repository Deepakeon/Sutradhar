import { Suspense } from 'react';
import Link from 'next/link';
import { LoginForm } from './login-form';

export const metadata = {
  title: 'Sign In — Sutradhar',
  description: 'Sign in to Sutradhar with Google OAuth',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#101010] px-4 py-12 text-[#f2f2f2]">
      <div className="mb-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-sm text-[#8b949e] transition-colors hover:text-[#00d992]"
        >
          <svg
            className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
          Back to Home
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="flex h-64 w-full max-w-md items-center justify-center rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00d992] border-t-transparent" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
