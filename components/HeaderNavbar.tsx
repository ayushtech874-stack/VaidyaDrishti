'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import LanguageToggle from './LanguageToggle';
import AuthDrawer from './AuthDrawer';

function AuthSearchParamsHandler({
  setAuthRole,
  setAuthMode,
  setIsAuthOpen,
}: {
  setAuthRole: (role: 'patient' | 'doctor') => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  setIsAuthOpen: (open: boolean) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const authParam = searchParams.get('auth');
    if (authParam) {
      if (authParam === 'doctor') {
        setAuthRole('doctor');
        setAuthMode('login');
        setIsAuthOpen(true);
      } else if (authParam === 'signup') {
        setAuthRole('patient');
        setAuthMode('signup');
        setIsAuthOpen(true);
      } else if (authParam === 'patient') {
        setAuthRole('patient');
        setAuthMode('login');
        setIsAuthOpen(true);
      }
    }
  }, [searchParams, setAuthRole, setAuthMode, setIsAuthOpen]);

  return null;
}

export default function HeaderNavbar() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'patient' | 'doctor' | 'super_admin' | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authRole, setAuthRole] = useState<'patient' | 'doctor'>('patient');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        if (user.email === 'admin@vaidyadrishti.com' || user.user_metadata?.role === 'super_admin') {
          setUserRole('super_admin');
        } else {
          const { data: doc } = await supabase
            .from('doctors')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (doc) {
            setUserRole(doc.role === 'super_admin' ? 'super_admin' : 'doctor');
          } else {
            setUserRole('patient');
          }
        }
      } else {
        setUserRole(null);
      }
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (!session?.user) {
        setUserRole(null);
      } else {
        checkAuth();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    router.push('/');
    router.refresh();
  }

  const dashboardHref =
    userRole === 'super_admin'
      ? '/admin'
      : userRole === 'doctor'
      ? '/doctor/dashboard'
      : '/patient/dashboard';

  return (
    <>
      <Suspense fallback={null}>
        <AuthSearchParamsHandler
          setAuthRole={setAuthRole}
          setAuthMode={setAuthMode}
          setIsAuthOpen={setIsAuthOpen}
        />
      </Suspense>

      <header className="sticky top-0 z-40 py-3 px-4 sm:px-6 bg-[var(--color-cream)]/90 backdrop-blur-md border-b border-[var(--color-border)] font-sans">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-[var(--color-teal-deep)] flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Image
                src="/icon.svg"
                alt="VaidyaDrishti"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl font-heading font-extrabold text-[var(--color-ink)] tracking-tight group-hover:text-[var(--color-violet)] transition-colors">
              VaidyaDrishti
            </span>
          </Link>

          {/* Right Controls Container */}
          <div className="flex items-center gap-1.5 sm:gap-3 bg-[var(--color-white)] p-1 sm:p-1.5 pl-2 sm:pl-3 rounded-full border border-[var(--color-border)] shadow-sm shrink-0">
            <LanguageToggle />

            {/* Quick Symptom Check CTA (PROMINENT & RESPONSIVE) */}
            <Link
              href="/patient/intake"
              className="bg-[var(--color-violet-soft)] text-[var(--color-violet)] hover:bg-[var(--color-violet)] hover:text-white px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-extrabold transition-all flex items-center gap-1 border border-[var(--color-violet)]/30 shrink-0"
              title="Official RMP OPD Symptom Intake & Tele-Triage"
            >
              <span>⚡</span>
              <span className="hidden xs:inline sm:inline">Quick Symptom Check</span>
              <span className="inline xs:hidden sm:hidden">Triage</span>
            </Link>

            {user ? (
              /* LOGGED IN NAV STATE */
              <div className="flex items-center gap-1.5">
                <Link
                  href={dashboardHref}
                  className="btn-primary py-1.5 px-3 sm:px-3.5 text-xs font-bold shadow-sm shrink-0"
                >
                  <span>Dashboard</span>
                </Link>

                <Link
                  href={userRole === 'doctor' ? '/doctor/dashboard?tab=profile' : '/patient/dashboard'}
                  className="btn-dark py-1.5 px-3.5 text-xs font-bold shadow-sm hidden md:inline-flex shrink-0"
                >
                  <span>Profile</span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="btn-secondary py-1.5 px-2.5 sm:px-3.5 text-xs font-bold shrink-0"
                >
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              /* LOGGED OUT NAV STATE */
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setAuthRole('patient');
                    setAuthMode('login');
                    setIsAuthOpen(true);
                  }}
                  className="btn-primary py-1.5 px-3 sm:px-3.5 text-xs font-bold shadow-sm cursor-pointer shrink-0"
                >
                  <span>Log In</span>
                </button>

                <button
                  onClick={() => {
                    setAuthRole('patient');
                    setAuthMode('signup');
                    setIsAuthOpen(true);
                  }}
                  className="btn-secondary py-1.5 px-3.5 text-xs font-bold cursor-pointer hidden md:inline-flex shrink-0"
                >
                  <span>Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Slide-In Auth Drawer */}
      <AuthDrawer
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialRole={authRole}
        initialMode={authMode}
      />
    </>
  );
}
