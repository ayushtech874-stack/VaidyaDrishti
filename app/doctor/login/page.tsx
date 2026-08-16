'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DoctorLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

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

      if (isSuperAdmin) {
        router.push('/admin');
      } else {
        router.push('/doctor/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full card-surface p-8 shadow-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-[var(--color-blue-soft)] text-[var(--color-navy)] px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
            <span>🩺 RMP Doctor & Admin Portal</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--color-navy)] tracking-tight">
            VaidyaDrishti Sign In
          </h1>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Registered Medical Practitioner Clinical & Administration Portal
          </p>
        </div>

        {errorMsg && (
          <div className="bg-[var(--color-urgent-high-bg)] border border-[var(--color-urgent-high)] text-[var(--color-urgent-high)] text-xs font-semibold p-3.5 rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@clinic.com or admin@vaidyadrishti.com"
              className="w-full px-4 py-3 rounded-xl bg-white border border-[var(--color-border)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-blue)] text-base font-data"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white border border-[var(--color-border)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-blue)] text-base"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full text-base py-3.5 shadow-md"
          >
            {isSubmitting ? 'Authenticating Credentials...' : 'Sign In to Portal →'}
          </button>
        </form>

        <p className="text-[11px] text-[var(--color-ink-muted)] text-center leading-relaxed">
          Restricted clinical access for Registered Medical Practitioners under Telemedicine Practice Guidelines (2020) & DPDP Act 2023.
        </p>
      </div>
    </main>
  );
}
