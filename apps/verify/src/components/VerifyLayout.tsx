import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface VerifyLayoutProps {
  children: ReactNode;
}

/**
 * Public verification app shell.
 * Simplified GovMasthead + centered content (max-w 640px) + minimal footer.
 */
export default function VerifyLayout({ children }: VerifyLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900 antialiased">
      {/* ── Simplified GovMasthead ── */}
      <header className="bg-primary text-white">
        <div className="mx-auto flex max-w-content items-center gap-3 px-6 py-3">
          {/* SA flag emoji as lightweight logo */}
          <span className="text-xl" aria-hidden="true">🇿🇦</span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-wide">
              Republic of South Africa
            </span>
            <span className="text-xs font-normal opacity-80">
              Official Cannabis Tracking System
            </span>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="mx-auto w-full max-w-content flex-1 px-6 py-8">
        {children}
      </main>

      {/* ── Minimal footer ── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 py-4 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Republic of South Africa</span>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <Link
            to="/privacy"
            className="underline decoration-slate-300 underline-offset-2 hover:text-primary"
          >
            Privacy Policy
          </Link>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <Link
            to="/accessibility"
            className="underline decoration-slate-300 underline-offset-2 hover:text-primary"
          >
            Accessibility
          </Link>
        </div>
      </footer>
    </div>
  );
}
