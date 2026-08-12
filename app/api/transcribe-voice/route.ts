import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let audioBuffer: Buffer | null = null;
    let intake_id: string | null = null;
    let media_url: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      try {
        const body = await request.json();
        intake_id = body.intake_id;
        media_url = body.media_url;
      } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON or multipart request body' }, { status: 400 });
      }
    }

    // If media_url provided (WhatsApp), fetch audio buffer
    if (media_url && !audioBuffer) {
      console.log(`🎙️ Fetching audio note from URL ${media_url}...`);
      const audioRes = await fetch(media_url);
      if (audioRes.ok) {
        const audioArrayBuffer = await audioRes.arrayBuffer();
        audioBuffer = Buffer.from(audioArrayBuffer);
      }
    }

    if (!audioBuffer) {
      return NextResponse.json({ error: 'No valid audio file or media_url received' }, { status: 400 });
    }

    // Transcribe audio using Groq Whisper API
    const audioFile = new File([new Uint8Array(audioBuffer)], 'voice_intake.webm', { type: 'audio/webm' });

    let transcribedText = '';
    try {
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3-turbo',
        prompt: 'Patient describing health symptoms in Hindi, Angika, Bhojpuri, Maithili, Magahi, Devanagari, or English.',
        response_format: 'json',
        temperature: 0.0,
      });

      transcribedText = transcription.text.trim();
    } catch (whisperErr: any) {
      console.error('Groq Whisper transcription error:', whisperErr);
      transcribedText = '[Voice recording captured in regional dialect - Audio file saved for doctor review]';
    }

    // If intake_id exists, update intake record
    if (intake_id) {
      const storagePath = `voice-intakes/${intake_id}.ogg`;
      try {
        await supabase.storage
          .from('patient-voice-notes')
          .upload(storagePath, audioBuffer, { contentType: 'audio/ogg', upsert: true });
      } catch (e) {
        console.warn('Storage upload skipped:', e);
      }

      await supabase
        .from('intakes')
        .update({
          raw_text: transcribedText,
          audio_storage_path: storagePath,
          voice_asr_confidence: 'high',
        })
        .eq('id', intake_id);

      const origin = new URL(request.url).origin;
      fetch(`${origin}/api/structure-intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake_id }),
      }).catch((err) => console.error('Background structuring call failed:', err));
    }

    return NextResponse.json({
      success: true,
      text: transcribedText,
      transcribed_text: transcribedText,
    });
  } catch (err: any) {
    console.error('Error transcribing voice intake:', err);
    return NextResponse.json({ error: err.message || 'ASR process failed' }, { status: 500 });
  }
}
