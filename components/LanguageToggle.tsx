'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/context';

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="inline-flex items-center gap-1 bg-[var(--color-cream)] p-1 rounded-full border border-[var(--color-border)] text-xs font-bold shadow-xs">
      <button
        onClick={() => setLocale('en')}
        className={`px-3 py-1 rounded-full transition-all text-xs font-extrabold cursor-pointer ${
          locale === 'en'
            ? 'bg-[var(--color-violet)] text-white shadow-xs'
            : 'text-[var(--color-ink)] hover:text-[var(--color-violet)]'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('hi')}
        className={`px-3 py-1 rounded-full transition-all text-xs font-extrabold cursor-pointer ${
          locale === 'hi'
            ? 'bg-[var(--color-violet)] text-white shadow-xs'
            : 'text-[var(--color-ink)] hover:text-[var(--color-violet)]'
        }`}
      >
        HI
      </button>
    </div>
  );
}
