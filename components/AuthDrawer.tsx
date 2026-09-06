'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface AuthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: 'patient' | 'doctor';
  initialMode?: 'login' | 'signup';
}

export default function AuthDrawer({
  isOpen,
  onClose,
  initialRole = 'patient',
  initialMode = 'login',
}: AuthDrawerProps) {
  const [role, setRole] = useState<'patient' | 'doctor'>(initialRole);
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setRole(initialRole);
    setMode(initialMode);
    setErrorMsg('');
  }, [initialRole, initialMode, isOpen]);

  if (!isOpen) return null;

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setErrorMsg('');
    try {
      const redirectNext = role === 'doctor' ? '/doctor/dashboard' : '/patient/verify-phone';
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectNext)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'select_account' },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initiate Google Sign-In.');
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (role === 'patient' && mode === 'signup') {
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name: name.trim(), role: 'patient' },
          },
        });
        if (error) throw error;
        onClose();
        router.push('/patient/verify-phone');
      } else if (role === 'patient' && mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onClose();
        const phoneVerified = data.user?.user_metadata?.phone_verified;
        if (!phoneVerified) {
          router.push('/patient/verify-phone');
        } else {
          router.push('/patient/dashboard');
        }
      } else if (role === 'doctor') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        let isSuperAdmin =
          data?.user?.user_metadata?.role === 'super_admin' ||
          data?.user?.app_metadata?.role === 'super_admin' ||
          data?.user?.email === 'admin@vaidyadrishti.com';

        if (!isSuperAdmin && data?.user?.id) {
          const { data: doc } = await supabase
            .from('doctors')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle();

          if (doc?.role === 'super_admin') {
            isSuperAdmin = true;
          }
        }

        onClose();
        if (isSuperAdmin) {
          router.push('/admin');
        } else {
          router.push('/doctor/dashboard');
        }
      }
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end font-sans">
      {/* Dimmed Overlay Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[var(--color-ink)]/60 backdrop-blur-sm transition-opacity cursor-pointer"
      />

      {/* Slide-In Drawer Panel (Full width on mobile <768px, 460px on desktop) */}
      <div className="relative z-50 w-full sm:w-[460px] lg:w-[480px] min-h-screen bg-[var(--color-cream)] shadow-2xl border-l border-[var(--color-border)] flex flex-col justify-between p-6 sm:p-8 overflow-y-auto">
        <div>
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-6 border-b border-[var(--color-border)] mb-6">
            <Link href="/" onClick={onClose} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--color-teal-deep)] flex items-center justify-center p-1 shadow-sm">
                <Image src="/icon.svg" alt="VaidyaDrishti" width={24} height={24} className="object-contain" />
              </div>
              <span className="text-lg font-heading font-extrabold text-[var(--color-teal-deep)] tracking-tight">
                VaidyaDrishti
              </span>
            </Link>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--color-white)] hover:bg-[var(--color-teal-soft)] border border-[var(--color-border)] text-[var(--color-ink)] font-bold text-sm flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Segmented Pill Role Switcher: [ Patient Portal | Doctor Portal ] */}
          <div className="bg-[var(--color-white)] p-1.5 rounded-full border border-[var(--color-border)] flex items-center gap-1 mb-6 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setRole('patient');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                role === 'patient'
                  ? 'bg-[var(--color-violet)] text-white shadow'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              👤 Patient Portal
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('doctor');
                setMode('login');
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                role === 'doctor'
                  ? 'bg-[var(--color-teal-deep)] text-white shadow'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              🩺 Doctor / Admin
            </button>
          </div>

          {/* Title & Subtext */}
          <div className="mb-5">
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-[var(--color-ink)] leading-tight">
              {role === 'patient'
                ? mode === 'login'
                  ? 'Sign In to Patient Portal'
                  : 'Create Patient Account'
                : 'Doctor & Admin Portal Sign In'}
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] mt-1 leading-relaxed">
              {role === 'patient'
                ? 'Access your verified medical records, past OPD visits, and lab documents.'
                : 'Restricted clinical access for RMP practitioners under TPG 2020 & DPDP Act 2023.'}
            </p>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="mb-4 bg-[var(--color-urgent-high-bg)] border border-[var(--color-urgent-high)] text-[var(--color-urgent-high)] p-3 rounded-[var(--radius-md)] text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Google Sign-In Button */}
          <div className="space-y-3 mb-5">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full bg-[var(--color-white)] hover:bg-[var(--color-teal-soft)] text-[var(--color-ink)] border-2 border-[var(--color-border)] rounded-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-3 transition shadow-sm hover:border-[var(--color-violet)] disabled:opacity-60"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-[var(--color-border)] w-full"></div>
              <span className="bg-[var(--color-cream)] px-2.5 text-[10px] font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider absolute">
                or email authentication
              </span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {role === 'patient' && mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ayush Kumar"
                  className="w-full bg-[var(--color-white)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-2.5 text-xs focus:outline-none focus:border-[var(--color-violet)] text-[var(--color-ink)]"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'doctor' ? 'doctor@clinic.com or admin@vaidyadrishti.com' : 'patient@example.com'}
                className="w-full bg-[var(--color-white)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-2.5 text-xs focus:outline-none focus:border-[var(--color-violet)] text-[var(--color-ink)] font-data"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[var(--color-white)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-2.5 text-xs focus:outline-none focus:border-[var(--color-violet)] text-[var(--color-ink)]"
              />
            </div>

            {role === 'patient' && mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[var(--color-white)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-2.5 text-xs focus:outline-none focus:border-[var(--color-violet)] text-[var(--color-ink)]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 text-xs font-bold shadow-md mt-2 ${
                role === 'doctor' ? 'btn-dark' : 'btn-primary'
              }`}
            >
              {isLoading
                ? 'Authenticating...'
                : role === 'patient'
                ? mode === 'signup'
                  ? 'Create Account →'
                  : 'Sign In to Patient Portal →'
                : 'Sign In to Doctor Portal →'}
            </button>
          </form>
        </div>

        {/* Footer Navigation Switcher */}
        <div className="pt-6 border-t border-[var(--color-border)] mt-6 text-center text-xs text-[var(--color-ink-muted)]">
          {role === 'patient' ? (
            mode === 'login' ? (
              <p>
                Don&apos;t have a patient account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg('');
                  }}
                  className="text-[var(--color-violet)] font-bold hover:underline ml-1 cursor-pointer"
                >
                  Sign Up Here
                </button>
              </p>
            ) : (
              <p>
                Already have a patient account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                  }}
                  className="text-[var(--color-violet)] font-bold hover:underline ml-1 cursor-pointer"
                >
                  Sign In Here
                </button>
              </p>
            )
          ) : (
            <p>
              New Doctor / Practice?{' '}
              <Link
                href="/doctor/register"
                onClick={onClose}
                className="text-[var(--color-teal-deep)] font-bold hover:underline ml-1"
              >
                Register Your Practice (Full RMP Form) →
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
