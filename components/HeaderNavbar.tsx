'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LanguageToggle from './LanguageToggle';

export default function HeaderNavbar() {
  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-[var(--color-border)] sticky top-0 z-50 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-navy)] flex items-center justify-center p-1 shadow-sm group-hover:scale-105 transition-transform">
            <Image
              src="/icon.svg"
              alt="VaidyaDrishti Logo"
              width={36}
              height={36}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <span className="text-xl font-extrabold text-[var(--color-navy)] tracking-tight block leading-none group-hover:text-blue-700 transition-colors">
              VaidyaDrishti
            </span>
            <span className="text-[10px] text-[var(--color-ink-muted)] font-semibold hidden sm:inline-block">
              AI Tele-Triage & OPD Health Network
            </span>
          </div>
        </Link>

        {/* Right Section: Language Toggle & Navigation Links */}
        <div className="flex items-center gap-3">
          <LanguageToggle />

          <div className="flex items-center gap-2">
            <Link
              href="/directory"
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 transition hidden sm:inline-block"
            >
              📍 Directory
            </Link>

            <Link
              href="/patient/intake"
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <span>🩺</span>
              <span className="hidden md:inline">Quick Intake</span>
            </Link>

            <Link
              href="/patient/dashboard"
              className="bg-[var(--color-navy)] hover:bg-blue-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
            >
              <span>📱</span>
              <span className="hidden md:inline">My Dashboard</span>
            </Link>

            <Link
              href="/doctor/login"
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>👨‍⚕️</span>
              <span className="hidden lg:inline">Doctor Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
