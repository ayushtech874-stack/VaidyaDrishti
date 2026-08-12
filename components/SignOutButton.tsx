'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      router.push('/doctor/login');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition border border-slate-300 flex items-center gap-1.5 disabled:opacity-50"
    >
      🚪 {isSigningOut ? 'Signing Out...' : 'Sign Out / Logout'}
    </button>
  );
}
