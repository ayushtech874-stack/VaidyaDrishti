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
    let mimeType = 'audio/webm';
    let fileExtension = 'webm';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        audioBuffer = Buffer.from(arrayBuffer);
        mimeType = file.type || 'audio/webm';
        if (mimeType.includes('ogg')) fileExtension = 'ogg';
        else if (mimeType.includes('mp4') || mimeType.includes('m4a')) fileExtension = 'm4a';
        else if (mimeType.includes('wav')) fileExtension = 'wav';
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

    if (media_url && !audioBuffer) {
      console.log(`🎙️ Fetching WhatsApp audio note from URL: ${media_url}...`);
      const audioRes = await fetch(media_url);
      if (audioRes.ok) {
        const audioArrayBuffer = await audioRes.arrayBuffer();
        audioBuffer = Buffer.from(audioArrayBuffer);
        fileExtension = 'ogg';
        mimeType = 'audio/ogg';
      }
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return NextResponse.json({ error: 'No valid audio buffer received' }, { status: 400 });
    }

    console.log(`🎙️ Transcribing ${audioBuffer.length} bytes using Groq Whisper Large-v3 (${fileExtension})...`);

    const audioFile = new File([new Uint8Array(audioBuffer)], `voice_recording.${fileExtension}`, { type: mimeType });

    let transcribedText = '';
    try {
      // Primary Transcription Pass with Regional Indic Phonetic Guidance
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
        prompt: 'यह मरीज की आवाज की रिकॉर्डिंग है। मरीज हिंदी, भोजपुरी, अंगिका, मैथिली, मगही, तमिल, तेलुगु, मराठी, बणाली, पंजाबी या हिंग्लिश में बीमारी बता रहा है। सिर दर्द, पेट दर्द, बुखार, ऐंठन, उल्टी, घबराहट, चक्कर, सीने में दर्द।',
        response_format: 'json',
        temperature: 0.0,
      });

      transcribedText = transcription.text.trim();
      console.log(`✅ Groq Whisper Indic ASR Transcription: "${transcribedText}"`);
    } catch (whisperErr: any) {
      console.error('❌ Groq Whisper ASR API Error:', whisperErr);
      transcribedText = `[Voice recording captured in regional dialect - Audio file saved for doctor review]`;
    }

    if (intake_id) {
      const storagePath = `voice-intakes/${intake_id}.${fileExtension}`;
      try {
        await supabase.storage
          .from('patient-voice-notes')
          .upload(storagePath, audioBuffer, { contentType: mimeType, upsert: true });
      } catch (e) {
        console.warn('Storage upload warning:', e);
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
