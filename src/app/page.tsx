import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is already logged in, redirect directly to dashboard
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#101010] text-[#f2f2f2]">
      {/* Navigation Bar */}
      <header className="border-b border-[#3d3a39] bg-[#101010]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#00d992]" />
            <span className="font-sans text-lg font-semibold tracking-tight text-[#ffffff]">
              Sutradhar
            </span>
          </div>

          <nav className="flex items-center gap-6">
            <Link
              href="/login"
              className="rounded-[6px] border border-[#00d992] bg-[#00d992] px-4 py-2 text-sm font-semibold text-[#101010] transition-colors hover:bg-[#2fd6a1]"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center sm:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-normal tracking-tight text-[#ffffff] sm:text-6xl sm:leading-[1.1]">
            Technical Interview Partner Matching &amp; Evaluation
          </h1>

          <p className="mt-6 text-lg leading-8 text-[#bdbdbd]">
            Connect with compatible peers for mock technical interviews, record
            sessions with automated retention, and receive AI-generated
            questionnaires and feedback.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="rounded-[6px] bg-[#00d992] px-6 py-3 text-base font-semibold text-[#101010] transition-colors hover:bg-[#2fd6a1] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#00d992]"
            >
              Sign in with Google
            </Link>
            <Link
              href="/dashboard"
              className="rounded-[6px] border border-[#3d3a39] bg-[#101010] px-6 py-3 text-base font-semibold text-[#f2f2f2] transition-colors hover:border-[#8b949e] hover:bg-[#1a1a1a]"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#3d3a39] bg-[#101010] py-8 text-center text-xs text-[#8b949e]">
        <p>&copy; 2026 Sutradhar. Designed for technical mock interviews.</p>
      </footer>
    </div>
  );
}
