'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PatientLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // Check if phone is verified
      const phoneVerified = data.user?.user_metadata?.phone_verified;
      if (!phoneVerified) {
        router.push('/patient/verify-phone');
      } else {
        router.push('/patient/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] flex items-center justify-center p-4">
      <div className="card-surface p-8 max-w-md w-full shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <span className="text-4xl">🔑</span>
          <h1 className="text-2xl font-extrabold text-[var(--color-navy)]">Patient Dashboard Sign In</h1>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Access your verified medical records, past visits, and uploaded documents
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@example.com"
              className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--color-blue)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--color-blue)]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3 text-sm font-bold text-center flex items-center justify-center gap-2"
          >
            {isLoading ? 'Signing In...' : 'Sign In to Patient Dashboard →'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[var(--color-border)] space-y-2">
          <p className="text-xs text-[var(--color-ink-muted)]">
            Don&apos;t have a patient account yet?{' '}
            <Link href="/patient/signup" className="text-[var(--color-blue)] font-bold hover:underline">
              Sign Up Here
            </Link>
          </p>
          <p className="text-xs text-[var(--color-ink-muted)] pt-1">
            Are you a doctor or administrator?{' '}
            <Link href="/doctor/login" className="text-[var(--color-navy)] font-bold hover:underline">
              Doctor / Admin Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
