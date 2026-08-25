'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/context';

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold shadow-xs">
      <button
        onClick={() => setLocale('en')}
        className={`px-2.5 py-1 rounded-lg transition ${
          locale === 'en'
            ? 'bg-[var(--color-navy)] text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        English
      </button>
      <button
        onClick={() => setLocale('hi')}
        className={`px-2.5 py-1 rounded-lg transition ${
          locale === 'hi'
            ? 'bg-[var(--color-navy)] text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        हिंदी
      </button>
    </div>
  );
}
