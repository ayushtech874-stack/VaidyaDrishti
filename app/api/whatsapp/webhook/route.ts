import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Helper to build TwiML MessagingResponse XML string
 */
function createTwiMLResponse(messageText: string): string {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(messageText);
  return twiml.toString();
}

/**
 * Forgiving consent parser for Indian multilingual inputs
 */
function isConsentAffirmative(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  const affirmativeTerms = [
    'agree', 'yes', 'haan', 'han', 'ok', 'okay', 'yep', 'ha',
    'i consent', 'i agree', 'sahi h', 'sahi hai', 'thik hai', 'thik h', 'accept'
  ];
  return affirmativeTerms.some((term) => normalized.includes(term));
}

function isOptOut(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return ['stop', 'unsubscribe', 'cancel', 'opt out', 'no', 'nahi'].includes(normalized);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const fromPhone = (params.From || '').replace('whatsapp:', '').trim();
    const bodyText = (params.Body || '').trim();

    // 1. Optional Twilio Signature Verification
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioSignature = request.headers.get('x-twilio-signature');
    const url = request.url;

    if (twilioAuthToken && twilioSignature) {
      const isValid = twilio.validateRequest(
        twilioAuthToken,
        twilioSignature,
        url,
        params
      );
      if (!isValid) {
        console.warn('Unauthorized Twilio webhook signature');
        return new Response('Unauthorized Signature', { status: 403 });
      }
    }

    if (!fromPhone) {
      return new Response(createTwiMLResponse('Invalid request'), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // 2. Fetch or initialize WhatsApp session
    let { data: session } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', fromPhone)
      .maybeSingle();

    // Extract potential clinic code keyword e.g. "CLINIC_102" or "PILOT_CLINIC_1"
    let matchedClinicId: string | null = null;
    const clinicCodeMatch = bodyText.match(/CLINIC_[A-Z0-9_-]+/i);

    if (clinicCodeMatch) {
      const code = clinicCodeMatch[0].toUpperCase();
      const { data: clinic } = await supabase
        .from('clinics')
        .select('id')
        .eq('code', code)
        .maybeSingle();

      if (clinic) {
        matchedClinicId = clinic.id;
      }
    }

    if (!session) {
      const { data: newSession } = await supabase
        .from('whatsapp_sessions')
        .insert([
          {
            phone: fromPhone,
            state: 'AWAITING_CONSENT',
            consent_granted: false,
          },
        ])
        .select('*')
        .single();

      session = newSession;
    }

    // Handle Opt-Out / STOP
    if (isOptOut(bodyText)) {
      await supabase
        .from('whatsapp_sessions')
        .update({
          consent_granted: false,
          state: 'AWAITING_CONSENT',
          updated_at: new Date().toISOString(),
        })
        .eq('phone', fromPhone);

      return new Response(
        createTwiMLResponse(
          'You have opted out of VaidyaDrishti. Your data processing has been stopped. Reply AGREE anytime to resume.'
        ),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // 3. State Machine Execution
    const currentState = session?.state || 'AWAITING_CONSENT';

    // STATE 1: AWAITING CONSENT
    if (currentState === 'AWAITING_CONSENT') {
      if (isConsentAffirmative(bodyText)) {
        await supabase
          .from('whatsapp_sessions')
          .update({
            consent_granted: true,
            consented_at: new Date().toISOString(),
            state: 'AWAITING_DEMOGRAPHICS',
            updated_at: new Date().toISOString(),
          })
          .eq('phone', fromPhone);

        return new Response(
          createTwiMLResponse(
            `Thank you for consenting! 🙏\n\nTo assist your doctor, please reply with the patient's Name and Age.\nExample: "Ramesh, 45"`
          ),
          { headers: { 'Content-Type': 'text/xml' } }
        );
      } else {
        return new Response(
          createTwiMLResponse(
            `Welcome to VaidyaDrishti Clinical Triage Assistant. 🩺\n\nTo allow your consulting doctor to review your symptoms, please reply AGREE or YES to consent to storing your intake data under DPDP Act 2023.\n\n⚠️ Disclaimer: This is NOT a diagnosis tool. In a medical emergency, visit the nearest hospital immediately.`
          ),
          { headers: { 'Content-Type': 'text/xml' } }
        );
      }
    }

    // STATE 2: AWAITING DEMOGRAPHICS
    if (currentState === 'AWAITING_DEMOGRAPHICS') {
      // Parse name and age from text e.g. "Ramesh, 45" or "Pooja 28"
      const match = bodyText.match(/^([a-zA-Z\s]+)[,\s]+(\d{1,3})$/);
      let name = bodyText;
      let age = 30; // default fallback if unparsed

      if (match) {
        name = match[1].trim();
        age = parseInt(match[2], 10);
      }

      // Find or create patient row
      let patientId: string;
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('phone', fromPhone)
        .maybeSingle();

      if (existingPatient) {
        patientId = existingPatient.id;
        await supabase.from('patients').update({ name, age }).eq('id', patientId);
      } else {
        const { data: newPatient } = await supabase
          .from('patients')
          .insert([{ name, age, phone: fromPhone }])
          .select('id')
          .single();
        patientId = newPatient!.id;
      }

      // Update session to AWAITING_SYMPTOMS
      await supabase
        .from('whatsapp_sessions')
        .update({
          patient_id: patientId,
          temp_name: name,
          temp_age: age,
          state: 'AWAITING_SYMPTOMS',
          updated_at: new Date().toISOString(),
        })
        .eq('phone', fromPhone);

      return new Response(
        createTwiMLResponse(
          `Got it, ${name} (${age} yrs)! 👍\n\nNow, please describe what symptoms you are feeling, when they started, and how severe they are. You can send a text message or a Voice Note in your language!`
        ),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // STATE 3: AWAITING SYMPTOMS (Text or Audio)
    if (currentState === 'AWAITING_SYMPTOMS') {
      const numMedia = parseInt(params.NumMedia || '0', 10);
      const isAudio = numMedia > 0 && (params.MediaContentType0 || '').startsWith('audio/');

      // Fetch linked patient ID
      let patientId = session?.patient_id;
      if (!patientId) {
        const { data: p } = await supabase
          .from('patients')
          .select('id')
          .eq('phone', fromPhone)
          .single();
        patientId = p?.id;
      }

      if (isAudio) {
        // Voice Note Flow - handled in Prompt 8
        const mediaUrl = params.MediaUrl0;
        
        // Insert pending voice intake row
        const { data: newIntake } = await supabase
          .from('intakes')
          .insert([
            {
              patient_id: patientId,
              raw_text: '[Voice Note Transcribing Pending...]',
              is_voice_intake: true,
              audio_storage_path: mediaUrl,
              status: 'pending_review',
            },
          ])
          .select('id')
          .single();

        // Offload async ASR + Structuring call
        if (newIntake?.id) {
          fetch(`${new URL(request.url).origin}/api/transcribe-voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intake_id: newIntake.id, media_url: mediaUrl }),
          }).catch((err) => console.error('Background ASR trigger failed:', err));
        }

        return new Response(
          createTwiMLResponse(
            'Voice note received! 🎙️ We are converting your audio to clinical summary for your doctor. Thank you!'
          ),
          { headers: { 'Content-Type': 'text/xml' } }
        );
      } else {
        // Text Flow
        const { data: newIntake } = await supabase
          .from('intakes')
          .insert([
            {
              patient_id: patientId,
              raw_text: bodyText,
              is_voice_intake: false,
              status: 'pending_review',
            },
          ])
          .select('id')
          .single();

        // Offload async Groq structuring + rules engine call
        if (newIntake?.id) {
          fetch(`${new URL(request.url).origin}/api/structure-intake`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intake_id: newIntake.id }),
          }).catch((err) => console.error('Background structuring call failed:', err));
        }

        return new Response(
          createTwiMLResponse(
            'Your symptom description has been sent to your consulting doctor. 👨‍⚕️\n\nThis is not a medical diagnosis. If you experience emergency symptoms, please seek immediate in-person care.'
          ),
          { headers: { 'Content-Type': 'text/xml' } }
        );
      }
    }

    return new Response(
      createTwiMLResponse('Thank you for contacting VaidyaDrishti.'),
      { headers: { 'Content-Type': 'text/xml' } }
    );
  } catch (err: any) {
    console.error('Error in WhatsApp webhook:', err);
    return new Response(createTwiMLResponse('An error occurred. Please try again.'), {
      headers: { 'Content-Type': 'text/xml' },
      status: 500,
    });
  }
}
