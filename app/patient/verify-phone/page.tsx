'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PatientVerifyPhonePage() {
  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/patient/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');

      setInfoMsg(data.message || 'OTP verification code sent via SMS!');
      setPhone(data.phone || phone);
      setStep('verify');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending verification code.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      let pendingIntakeId: string | null = null;
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        pendingIntakeId = params.get('intake_id') || sessionStorage.getItem('pending_intake_id');
      }

      const res = await fetch('/api/patient/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code: otpCode,
          name: fullName,
          age,
          intake_id: pendingIntakeId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OTP Verification failed.');

      setInfoMsg('Phone verified and medical record linked! Redirecting to Dashboard...');
      setTimeout(() => {
        router.push('/patient/dashboard');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid OTP verification code.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] flex items-center justify-center p-4 font-sans">
      <div className="card-surface p-8 max-w-md w-full shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <span className="text-4xl">📲</span>
          <h1 className="text-2xl font-heading font-extrabold text-[var(--color-ink)]">Phone Verification & Record Linking</h1>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Verify your mobile number to link any prior WhatsApp or Web Intake medical records to your account
          </p>
        </div>

        {infoMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-[var(--radius-md)] text-xs font-bold text-center">
            {infoMsg}
          </div>
        )}

        {errorMsg && (
          <div className="bg-[var(--color-urgent-high-bg)] border border-[var(--color-urgent-high)] text-[var(--color-urgent-high)] p-3.5 rounded-[var(--radius-md)] text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {step === 'send' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-xs font-bold text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1.5">
                  Mobile Number (India +91) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-xs font-bold text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-violet)] font-data"
                />
              </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3.5 text-sm font-bold"
            >
              {isLoading ? 'Sending OTP...' : 'Send Twilio OTP Verification Code →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="bg-[var(--color-violet-soft)] p-3 rounded-[var(--radius-md)] border border-[var(--color-violet)]/20 text-xs">
              <span className="text-[var(--color-ink-muted)] font-medium">OTP Sent to: </span>
              <strong className="font-data text-[var(--color-violet)]">{phone}</strong>
              <button
                type="button"
                onClick={() => setStep('send')}
                className="ml-2 text-[var(--color-violet)] font-bold text-[11px] hover:underline"
              >
                (Change)
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider mb-1">
                Enter 6-Digit OTP Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 text-center text-xl font-bold font-data tracking-widest focus:outline-none focus:border-[var(--color-violet)] text-[var(--color-ink)]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3.5 text-sm font-bold"
            >
              {isLoading ? 'Verifying...' : 'Verify OTP & Link Records →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
