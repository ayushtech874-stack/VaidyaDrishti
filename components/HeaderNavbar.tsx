'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import LanguageToggle from './LanguageToggle';

export default function HeaderNavbar() {
  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Clean Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#0F172A] flex items-center justify-center p-1 shadow-sm group-hover:scale-105 transition-transform duration-200">
            <Image
              src="/icon.svg"
              alt="VaidyaDrishti"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xl font-bold text-[#0F172A] tracking-tight group-hover:text-blue-600 transition-colors">
            VaidyaDrishti
          </span>
        </Link>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageToggle />

          {/* Patient Portal / Login Button */}
          <Link
            href="/patient/dashboard"
            className="bg-[#0F172A] hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <span>Patient Portal</span>
          </Link>

          {/* Doctor Portal Button */}
          <Link
            href="/doctor/login"
            className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
          >
            <span>Doctor Portal</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
