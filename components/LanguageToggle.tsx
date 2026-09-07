'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/context';

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="inline-flex items-center gap-0.5 bg-[var(--color-cream)] p-1 rounded-full border border-[var(--color-border)] text-xs font-bold shadow-xs">
      <button
        onClick={() => setLocale('en')}
        className={`px-2.5 py-0.5 rounded-full transition-all text-xs font-extrabold cursor-pointer ${
          locale === 'en'
            ? 'bg-[var(--color-violet)] text-white shadow-xs'
            : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('hi')}
        className={`px-2.5 py-0.5 rounded-full transition-all text-xs font-extrabold cursor-pointer ${
          locale === 'hi'
            ? 'bg-[var(--color-violet)] text-white shadow-xs'
            : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
        }`}
      >
        HI
      </button>
    </div>
  );
}
