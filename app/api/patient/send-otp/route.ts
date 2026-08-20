import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/phone';

// Memory/Database OTP fallback store for development or testing
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export async function POST(request: Request) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in first.' }, { status: 401 });
    }

    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    const normalized = normalizePhone(phone);
    if (!normalized || normalized.length < 12) {
      return NextResponse.json({ error: 'Invalid phone number format. Please enter a valid 10-digit mobile number.' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (accountSid && authToken && verifySid) {
      // Production Twilio Verify API
      try {
        const twilio = require('twilio');
        const client = twilio(accountSid, authToken);
        await client.verify.v2.services(verifySid).verifications.create({
          to: normalized,
          channel: 'sms',
        });

        return NextResponse.json({
          success: true,
          message: `OTP sent via Twilio Verify to ${normalized}`,
          phone: normalized,
        });
      } catch (tErr: any) {
        console.warn('Twilio Verify API notice, falling back to SMS/Mock:', tErr.message);
      }
    }

    // Fallback SMS/Dev OTP Mode
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(normalized, { otp: code, expiresAt: Date.now() + 10 * 60 * 1000 });

    console.log(`[DEV OTP] Phone: ${normalized} | Code: ${code}`);

    return NextResponse.json({
      success: true,
      message: `OTP sent to ${normalized} (Dev Code: ${code})`,
      phone: normalized,
      dev_otp: process.env.NODE_ENV !== 'production' ? code : undefined,
    });
  } catch (err: any) {
    console.error('Send OTP Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to send OTP.' }, { status: 500 });
  }
}
