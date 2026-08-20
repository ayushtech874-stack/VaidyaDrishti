'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function PatientSignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: fullName.trim(),
            role: 'patient',
          },
        },
      });

      if (error) throw error;

      // On successful signup, redirect to phone verification step
      router.push('/patient/verify-phone');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create patient account.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] flex items-center justify-center p-4">
      <div className="card-surface p-8 max-w-md w-full shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <span className="text-4xl">📱</span>
          <h1 className="text-2xl font-extrabold text-[var(--color-navy)]">Create Patient Account</h1>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Access your past OPD visits, self-reported medical history, and past health documents
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ayush Kumar"
              className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--color-blue)]"
            />
          </div>

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
              Password (min 8 characters) *
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

          <div>
            <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--color-blue)]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3 text.sm font-bold text-center flex items-center justify-center gap-2"
          >
            {isLoading ? 'Creating Account...' : 'Continue to Phone Verification →'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-ink-muted)]">
            Already have a patient account?{' '}
            <Link href="/patient/login" className="text-[var(--color-blue)] font-bold hover:underline">
              Sign In Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
