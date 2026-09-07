'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AuthSplitLayout from '@/components/AuthSplitLayout';

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
      const { error } = await supabase.auth.signUp({
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
    <AuthSplitLayout
      headline="Create Patient Account"
      subtext="Access your past OPD visits, self-reported medical history, and digital health records"
      altLinkPrompt="Already have a patient account?"
      altLinkText="Sign In Here"
      altLinkHref="/patient/login"
      redirectNext="/patient/verify-phone"
      errorMsg={errorMsg}
    >
      <form onSubmit={handleSignup} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full bg-[var(--color-white)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-xs focus:outline-none focus:border-[var(--color-violet)] text-[var(--color-ink)]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full bg-[var(--color-white)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-xs focus:outline-none focus:border-[var(--color-violet)] text-[var(--color-ink)] font-data"
            />
          </div>

        <div>
          <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
            Password (min 8 characters) *
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-sm focus:outline-none focus:border-[var(--color-violet)] text-[var(--color-ink)]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
            Confirm Password *
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-sm focus:outline-none focus:border-[var(--color-violet)] text-[var(--color-ink)]"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full py-3.5 text-sm font-bold shadow-md mt-2"
        >
          {isLoading ? 'Creating Account...' : 'Continue to Phone Verification →'}
        </button>
      </form>
    </AuthSplitLayout>
  );
}
