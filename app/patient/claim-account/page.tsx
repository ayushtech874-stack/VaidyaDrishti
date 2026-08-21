'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ClaimAccountPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const resolvedParams = use(searchParams);
  const token = resolvedParams.token;

  const [status, setStatus] = useState<'loading' | 'valid' | 'already_claimed' | 'invalid'>('loading');
  const [patientInfo, setPatientInfo] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setStatus('invalid');
        setErrorMsg('No claim token provided in link.');
        return;
      }

      try {
        const res = await fetch(`/api/patient/verify-claim-token?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) {
          if (data.already_claimed) {
            setStatus('already_claimed');
          } else {
            setStatus('invalid');
            setErrorMsg(data.error || 'Invalid or expired claim token.');
          }
          return;
        }

        setPatientInfo(data.patient);
        setStatus('valid');
      } catch (err: any) {
        setStatus('invalid');
        setErrorMsg(err.message || 'Failed to verify claim token.');
      }
    }

    validateToken();
  }, [token]);

  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !email || !password) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/patient/claim-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to claim account.');

      // Automatically sign in
      await supabase.auth.signInWithPassword({ email, password });
      router.push('/patient/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error setting up your dashboard account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] py-12 px-4 flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-[var(--color-blue-soft)] text-[var(--color-navy)] px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <span>🏥 VaidyaDrishti Patient Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-navy)]">
            Claim Your Patient Dashboard
          </h1>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Track all your consultation visits, prescriptions, appointments, and care reminders in one place.
          </p>
        </div>

        {status === 'loading' && (
          <div className="card-surface p-8 text-center text-xs text-[var(--color-ink-muted)] font-medium">
            Verifying claim token authenticity...
          </div>
        )}

        {status === 'already_claimed' && (
          <div className="card-surface p-6 text-center space-y-4 border-2 border-[var(--color-blue)]">
            <span className="text-4xl">✓</span>
            <h2 className="text-lg font-bold text-[var(--color-navy)]">
              Account Already Claimed!
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
              This patient dashboard account has already been claimed and set up. Please log in with your email and password to access your records.
            </p>
            <Link href="/patient/login" className="btn-primary w-full text-xs py-3 block font-bold">
              Log In to Patient Dashboard →
            </Link>
          </div>
        )}

        {status === 'invalid' && (
          <div className="card-surface p-6 text-center space-y-4 border-2 border-red-300 bg-red-50/50">
            <span className="text-4xl">⚠️</span>
            <h2 className="text-lg font-bold text-red-950">Claim Link Expired or Invalid</h2>
            <p className="text-xs text-red-800 leading-relaxed">{errorMsg}</p>
            <div className="space-y-2">
              <Link href="/patient/signup" className="btn-primary w-full text-xs py-3 block font-bold">
                Standard Patient Signup (OTP) →
              </Link>
              <Link href="/patient/login" className="text-xs text-[var(--color-blue)] font-bold block">
                Existing Patient Login →
              </Link>
            </div>
          </div>
        )}

        {status === 'valid' && (
          <form onSubmit={handleClaimSubmit} className="card-surface p-6 space-y-4 shadow-md border border-[var(--color-border)]">
            {patientInfo && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs space-y-0.5">
                <span className="font-bold">✓ Verified Patient Record:</span>
                <p>{patientInfo.name} ({patientInfo.phone})</p>
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                Account Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full bg-white border border-[var(--color-border)] rounded-xl p-3 text-xs focus:outline-none focus:border-[var(--color-blue)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                Create Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-[var(--color-border)] rounded-xl p-3 text-xs focus:outline-none focus:border-[var(--color-blue)]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3 text-xs font-bold shadow-md"
            >
              {isSubmitting ? 'Setting Up Dashboard Account...' : 'Complete Dashboard Setup →'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
