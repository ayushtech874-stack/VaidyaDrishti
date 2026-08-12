import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {},
  };

  // 1. Supabase Database Check
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('intakes').select('id').limit(1);
    if (error) {
      checks.services.database = { status: 'error', error: error.message };
      checks.status = 'degraded';
    } else {
      checks.services.database = { status: 'ok' };
    }
  } catch (err: any) {
    checks.services.database = { status: 'error', error: err.message };
    checks.status = 'degraded';
  }

  // 2. Groq API Key Check
  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey && groqApiKey.startsWith('gsk_')) {
    checks.services.groq_ai = { status: 'ok', model: 'llama-3.3-70b-versatile & whisper-large-v3-turbo' };
  } else {
    checks.services.groq_ai = { status: 'warning', message: 'Missing GROQ_API_KEY env var' };
    checks.status = 'degraded';
  }

  // 3. Twilio Config Check
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  checks.services.twilio_whatsapp = {
    status: twilioToken ? 'configured' : 'sandbox_ready',
    message: twilioToken ? 'Twilio production auth token active' : 'Twilio sandbox active',
  };

  checks.responseTimeMs = Date.now() - startTime;

  return NextResponse.json(checks, {
    status: checks.status === 'healthy' ? 200 : 200,
  });
}
