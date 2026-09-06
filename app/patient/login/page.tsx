'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PatientLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect direct visits to homepage with auth drawer open
    router.replace('/?auth=patient');
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--color-cream)] flex items-center justify-center p-4 text-xs font-bold text-[var(--color-ink-muted)]">
      Opening Patient Portal Sign In...
    </div>
  );
}
