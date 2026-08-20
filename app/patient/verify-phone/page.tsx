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
      const res = await fetch('/api/patient/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code: otpCode,
          name: fullName,
          age,
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
    <div className="min-h-screen bg-[var(--color-cream)] flex items-center justify-center p-4">
      <div className="card-surface p-8 max-w-md w-full shadow-lg space-y-6">
        <div className="text-center space-y-2">
          <span className="text-4xl">📲</span>
          <h1 className="text-2xl font-extrabold text-[var(--color-navy)]">Phone Verification & Record Linking</h1>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Verify your mobile number to link any prior WhatsApp or Web Intake medical records to your account
          </p>
        </div>

        {infoMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs font-bold text-center">
            {infoMsg}
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {step === 'send' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                Full Name (Optional)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ayush Kumar"
                className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--color-blue)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                Mobile Phone Number *
              </label>
              <p className="text-[11px] text-[var(--color-ink-muted)] mb-1.5">
                Use the same phone number you used for WhatsApp or QR intake
              </p>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 94704 22303 or 10-digit number"
                className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3 text-sm font-data focus:outline-none focus:border-[var(--color-blue)]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-sm font-bold text-center flex items-center justify-center gap-2"
            >
              {isLoading ? 'Sending OTP...' : 'Send Twilio OTP Verification Code →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="bg-[var(--color-blue-soft)] p-3 rounded-xl border border-[var(--color-blue)]/20 text-xs">
              <span className="text-[var(--color-ink-muted)] font-medium">OTP Sent to: </span>
              <strong className="font-data text-[var(--color-navy)]">{phone}</strong>
              <button
                type="button"
                onClick={() => setStep('send')}
                className="ml-2 text-[var(--color-blue)] font-bold text-[11px] hover:underline"
              >
                (Change)
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-navy)] uppercase tracking-wider mb-1">
                Enter 6-Digit OTP Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="123456"
                className="w-full bg-[var(--color-cream)] border border-[var(--color-border)] rounded-xl p-3 text-center text-xl font-bold font-data tracking-widest focus:outline-none focus:border-[var(--color-blue)]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-sm font-bold text-center flex items-center justify-center gap-2"
            >
              {isLoading ? 'Verifying...' : 'Verify OTP & Link Records →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
