'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

interface AuthSplitLayoutProps {
  headline: string;
  subtext: string;
  children: React.ReactNode;
  altLinkText: string;
  altLinkHref: string;
  altLinkPrompt: string;
  redirectNext?: string;
  badges?: { icon: string; title: string; subtitle: string }[];
  errorMsg?: string;
}

export default function AuthSplitLayout({
  headline,
  subtext,
  children,
  altLinkText,
  altLinkHref,
  altLinkPrompt,
  redirectNext = '/patient/verify-phone',
  badges = [
    { icon: '👨‍⚕️', title: 'Verified RMP Doctors', subtitle: 'TPG 2020 Guidelines Compliant' },
    { icon: '🛡️', title: 'DPDP Act 2023 Compliant', subtitle: 'Encrypted Health Record Storage' },
    { icon: '🏥', title: 'Tier-2 & 3 OPD Network', subtitle: 'Multi-lingual Voice AI Triage' },
  ],
  errorMsg,
}: AuthSplitLayoutProps) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const supabase = createClient();

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setOauthError('');
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectNext)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setOauthError(err.message || 'Failed to initiate Google Sign-In.');
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch my-auto">
        
        {/* LEFT PANEL: Form & Auth Action (bg: --color-cream) */}
        <div className="md:col-span-6 lg:col-span-5 bg-[var(--color-white)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 sm:p-8 shadow-[var(--shadow-card)] flex flex-col justify-between">
          <div>
            {/* Logo / Header */}
            <div className="flex items-center gap-3 mb-8">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-full bg-[var(--color-teal-deep)] flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform duration-200">
                  <Image
                    src="/icon.svg"
                    alt="VaidyaDrishti"
                    width={28}
                    height={28}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xl font-heading font-extrabold text-[var(--color-teal-deep)] tracking-tight">
                  VaidyaDrishti
                </span>
              </Link>
            </div>

            {/* Title & Subtext */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-[var(--color-ink)] leading-tight">
                {headline}
              </h1>
              <p className="text-xs sm:text-sm text-[var(--color-ink-muted)] mt-1.5 font-medium leading-relaxed">
                {subtext}
              </p>
            </div>

            {(errorMsg || oauthError) && (
              <div className="mb-5 bg-[var(--color-urgent-high-bg)] border border-[var(--color-urgent-high)] text-[var(--color-urgent-high)] p-3.5 rounded-[var(--radius-md)] text-xs font-semibold leading-snug">
                {errorMsg || oauthError}
              </div>
            )}

            {/* Google Sign-In Button (ABOVE email/password form) */}
            <div className="mb-6 space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full bg-[var(--color-white)] hover:bg-[var(--color-teal-soft)] text-[var(--color-ink)] border-2 border-[var(--color-border)] rounded-[var(--radius-full)] py-3 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-3 transition-all duration-200 shadow-sm hover:border-[var(--color-violet)] disabled:opacity-60"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
              </button>

              <div className="relative flex items-center justify-center my-4">
                <div className="border-t border-[var(--color-border)] w-full"></div>
                <span className="bg-[var(--color-white)] px-3 text-[11px] font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider absolute">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Actual Form Fields */}
            {children}
          </div>

          {/* Alternate Link Footer */}
          <div className="pt-6 border-t border-[var(--color-border)] text-center text-xs font-medium text-[var(--color-ink-muted)] mt-6">
            {altLinkPrompt}{' '}
            <Link
              href={altLinkHref}
              className="text-[var(--color-violet)] font-bold hover:underline transition-colors ml-1"
            >
              {altLinkText}
            </Link>
          </div>
        </div>

        {/* RIGHT PANEL: Healthcare Visual & Trust Badges (bg: --color-teal-deep) */}
        <div className="hidden md:flex md:col-span-6 lg:col-span-7 bg-[var(--color-teal-deep)] text-white rounded-[var(--radius-lg)] p-8 sm:p-12 relative overflow-hidden flex-col justify-between min-h-[540px] shadow-xl">
          {/* Subtle background decorative shapes */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-[var(--color-teal-soft)]/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-[var(--color-violet)]/15 blur-3xl pointer-events-none"></div>

          {/* Top Badge Banner */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>VaidyaDrishti Tele-Triage Network</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-heading font-extrabold text-white mt-4 leading-tight">
              Empirical AI Triage & Direct Clinical Care
            </h2>
            <p className="text-xs lg:text-sm text-[var(--color-teal-soft)]/90 mt-2 max-w-md leading-relaxed">
              Empowering Tier-2 & Tier-3 Registered Medical Practitioners with 8-language voice intake and secure digital health records.
            </p>
          </div>

          {/* Center Healthcare SVG Graphic */}
          <div className="relative z-10 my-8 flex justify-center items-center">
            <div className="w-full max-w-md h-56 relative bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-full h-full max-h-48 text-[var(--color-teal-soft)] opacity-90" viewBox="0 0 400 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Clean Vector Healthcare Graphic */}
                <rect x="20" y="30" width="360" height="180" rx="16" fill="white" fillOpacity="0.05" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                <path d="M60 120H120L135 90L155 160L175 70L195 140L210 120H340" stroke="#6C4CE0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="280" cy="80" r="28" fill="#EFEAFB" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M280 66V94M266 80H294" stroke="#FAF6EE" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="50" y="50" width="80" height="24" rx="12" fill="#E4EFEE" fillOpacity="0.15" />
                <rect x="60" y="58" width="60" height="8" rx="4" fill="currentColor" fillOpacity="0.6" />
              </svg>
            </div>
          </div>

          {/* Floating Trust Badges Overlapping Image/Bottom Edge */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {badges.map((badge, idx) => (
              <div
                key={idx}
                className="bg-white/95 backdrop-blur-md border border-[var(--color-border)] text-[var(--color-ink)] p-3.5 rounded-[var(--radius-md)] shadow-md hover:translate-y-[-2px] transition-transform duration-200"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="text-xl leading-none">{badge.icon}</span>
                  <div className="font-heading font-extrabold text-xs text-[var(--color-ink)] leading-tight">
                    {badge.title}
                  </div>
                </div>
                <div className="text-[10px] text-[var(--color-ink-muted)] font-medium leading-tight pl-0.5">
                  {badge.subtitle}
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
