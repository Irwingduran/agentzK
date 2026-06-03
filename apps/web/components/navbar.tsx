'use client';

import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

type NavbarProps = {
  active?: 'dashboard' | 'sdk' | 'credits';
  variant?: 'default' | 'landing';
};

export function Navbar({ active, variant = 'default' }: NavbarProps) {
  if (variant === 'landing') {
    return (
      <nav className="flex items-center justify-between py-[18px] border-b border-black/[0.09]">
        <a href="/" className="text-base font-extrabold text-slate-900 no-underline tracking-tight font-mono">
          open<em className="not-italic text-amber-500">402</em>
        </a>
        <div className="flex items-center gap-4">
          <a href="/sdk" className="text-xs font-mono font-semibold text-slate-500 no-underline hover:text-slate-800 transition-colors">docs</a>
          <a href="https://github.com/Irwingduran/open402.git" className="text-xs font-mono font-semibold text-slate-500 no-underline hover:text-slate-800 transition-colors">github</a>
          <SignedOut>
            <SignInButton>
              <button className="text-xs font-mono font-bold px-[18px] py-2 rounded-lg bg-slate-900 text-white border-none cursor-pointer hover:bg-slate-700 transition-colors">
                Comenzar →
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <a href="/dashboard" className="text-xs font-mono font-bold px-[18px] py-2 rounded-lg bg-slate-900 text-white no-underline hover:bg-slate-700 transition-colors">
              dashboard →
            </a>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex items-center justify-between px-8 py-3.5 max-w-[1080px] mx-auto">
      <a href="/" className="text-base font-extrabold text-slate-900 no-underline tracking-tight font-mono">
        open<em className="not-italic text-amber-500">402</em>
      </a>
      <div className="flex items-center gap-5">
        <SignedOut>
          <a href="/sdk" className="text-xs font-mono font-semibold text-slate-500 no-underline hover:text-slate-800 transition-colors">Docs</a>
          <SignInButton>
            <button className="text-xs font-mono font-bold px-[18px] py-2 rounded-lg bg-slate-900 text-white border-none cursor-pointer hover:bg-slate-700 transition-colors">
              Comenzar
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <a
            href="/dashboard"
            className={`text-xs font-mono font-semibold no-underline ${active === 'dashboard' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-800'} transition-colors`}
          >
            Dashboard
          </a>
          <a
            href="/credits"
            className={`text-xs font-mono font-semibold no-underline ${active === 'credits' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-800'} transition-colors`}
          >
            Créditos
          </a>
          <a
            href="/sdk"
            className={`text-xs font-mono font-semibold no-underline ${active === 'sdk' ? 'text-amber-500' : 'text-slate-500 hover:text-slate-800'} transition-colors`}
          >
            SDK
          </a>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </nav>
  );
}
