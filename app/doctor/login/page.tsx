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

      // Check role in user_metadata OR doctors table
      let isSuperAdmin = data?.user?.user_metadata?.role === 'super_admin' || data?.user?.app_metadata?.role === 'super_admin';

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
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-emerald-400">VaidyaDrishti</h1>
          <p className="text-sm text-slate-400">
            Registered Medical Practitioner & Super-Admin Portal Sign In
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 text-sm p-3.5 rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@clinic.com or admin@vaidyadrishti.com"
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition text-base"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
          </button>
        </form>

        <p className="text-xs text-slate-500 text-center leading-relaxed">
          Restricted access for Registered Medical Practitioners under Telemedicine Practice Guidelines (2020).
        </p>
      </div>
    </div>
  );
}
