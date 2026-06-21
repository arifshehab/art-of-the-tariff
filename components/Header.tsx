'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SOURCE_URL = 'https://www.tradecomplianceresourcehub.com/2026/06/03/trump-2-0-tariff-tracker/';

const NAV = [
  { label: 'Map', href: '/' },
  //{ label: 'Timeline', href: '/timeline' },
  { label: 'Source', href: SOURCE_URL, external: true },
];

function Logo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="16" cy="16" r="2.4" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-md">
      <div className="flex items-center justify-between h-[72px] px-5 sm:px-7">
        <Link href="/" className="flex items-center gap-2.5 text-white">
          <Logo />
          <span className="font-bold text-2xl tracking-tight lowercase">prcnt</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-5">
          <nav className="flex items-center gap-0.5">
            {NAV.map((item) => {
              const active = !item.external && pathname === item.href;
              const cls = `px-3 py-1.5 rounded-md text-sm transition-colors ${
                active ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`;
              return item.external ? (
                <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
                  {item.label}
                </a>
              ) : (
                <Link key={item.label} href={item.href} className={cls}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <span className="hidden sm:block w-px h-5 bg-white/10" />
          <a
            href="https://arifshehab.com"
            className="text-sm font-medium text-[#0a0f1e] bg-white hover:bg-slate-200 transition-colors rounded-full px-4 py-1.5"
          >
            Connect
          </a>
        </div>
      </div>
    </header>
  );
}
