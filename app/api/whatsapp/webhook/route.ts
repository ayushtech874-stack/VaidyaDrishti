import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function createTwiMLResponse(messageText: string): string {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(messageText);
  return twiml.toString();
}

function isConsentAffirmative(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  const affirmativeTerms = [
    'agree', 'yes', '1', 'haan', 'han', 'ok', 'okay', 'yep', 'ha',
    'i consent', 'i agree', 'sahi h', 'sahi hai', 'thik hai', 'accept'
  ];
  return affirmativeTerms.some((term) => normalized.includes(term));
}

function isOptOut(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return ['stop', 'unsubscribe', 'cancel', 'opt out', 'no', '2', 'nahi'].includes(normalized);
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

    // 1. Fetch available clinics & doctors for interactive menus
    const { data: clinics } = await supabase.from('clinics').select('id, name, code');
    const { data: doctors } = await supabase.from('doctors').select('id, name, clinic_id');

    const clinicList: any[] = clinics || [];
    const doctorList: any[] = doctors || [];

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

    // Check for QR keyword match e.g. "JOIN_CLINIC_VinayKrishna"
    let matchedClinicId: string | null = null;
    const clinicCodeMatch = bodyText.match(/JOIN_CLINIC_[A-Z0-9_-]+/i) || bodyText.match(/CLINIC_[A-Z0-9_-]+/i);

    if (clinicCodeMatch) {
      const code = clinicCodeMatch[0].toUpperCase().replace('JOIN_', '');
      const matched = clinicList.find((c: any) => c.code.toUpperCase() === code || c.code.toUpperCase() === `CLINIC_${code}`);
      if (matched) matchedClinicId = matched.id;
    }

    if (!session) {
      const { data: newSession } = await supabase
        .from('whatsapp_sessions')
        .insert([
          {
            phone: fromPhone,
            state: 'AWAITING_CONSENT',
            consent_granted: false,
            temp_clinic_id: matchedClinicId,
          },
        ])
        .select('*')
        .single();

      session = newSession;
    }

    if (matchedClinicId && session) {
      await supabase
        .from('whatsapp_sessions')
        .update({ temp_clinic_id: matchedClinicId })
        .eq('phone', fromPhone);
    }

    // Handle Opt-Out / STOP
    if (isOptOut(bodyText) && session?.state === 'AWAITING_CONSENT') {
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
          'You have opted out of VaidyaDrishti. Reply 1 or AGREE anytime to resume.'
        ),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    const currentState = session?.state || 'AWAITING_CONSENT';

    // STATE 1: AWAITING CONSENT (Interactive Touch 1 or 2)
    if (currentState === 'AWAITING_CONSENT') {
      if (isConsentAffirmative(bodyText)) {
        await supabase
          .from('whatsapp_sessions')
          .update({
            consent_granted: true,
            consented_at: new Date().toISOString(),
            state: 'SELECT_DEPARTMENT',
            updated_at: new Date().toISOString(),
          })
          .eq('phone', fromPhone);

        let menuMsg = `Thank you for consenting! 🙏\n\n🏥 Please select your Consulting Hospital Department:\n\n`;
        clinicList.forEach((clinic: any, idx: number) => {
          const doc = doctorList.find((d: any) => d.clinic_id === clinic.id);
          menuMsg += `${idx + 1}️⃣ ${clinic.name} — ${doc?.name ? `Dr. ${doc.name}` : 'OPD'}\n`;
        });
        menuMsg += `\nReply with number (e.g., 1, 2, or 3)!`;

        return new Response(createTwiMLResponse(menuMsg), {
          headers: { 'Content-Type': 'text/xml' },
        });
      } else {
        return new Response(
          createTwiMLResponse(
            `🩺 Welcome to VaidyaDrishti Hospital Tele-Triage Portal.\n\nTo allow your consulting doctor to review your symptoms under DPDP Act 2023, please tap/reply:\n\n1️⃣ YES / AGREE (Proceed)\n2️⃣ NO (Decline)\n\n⚠️ Disclaimer: This is NOT a diagnosis tool. In a medical emergency, visit the nearest hospital immediately.`
          ),
          { headers: { 'Content-Type': 'text/xml' } }
        );
      }
    }

    // STATE 2: SELECT DEPARTMENT & DOCTOR
    if (currentState === 'SELECT_DEPARTMENT') {
      const selectionIdx = parseInt(bodyText.trim(), 10) - 1;
      let selectedClinic: any = clinicList[selectionIdx];

      if (!selectedClinic && session?.temp_clinic_id) {
        selectedClinic = clinicList.find((c: any) => c.id === session.temp_clinic_id);
      }

      if (!selectedClinic) {
        selectedClinic = clinicList[0];
      }

      await supabase
        .from('whatsapp_sessions')
        .update({
          temp_clinic_id: selectedClinic?.id || null,
          state: 'SELECT_GENDER',
          updated_at: new Date().toISOString(),
        })
        .eq('phone', fromPhone);

      return new Response(
        createTwiMLResponse(
          `Selected: ${selectedClinic?.name || 'General OPD'} 🏥\n\n👤 Please select Patient Sex / Gender:\n\n1️⃣ Male\n2️⃣ Female\n3️⃣ Other\n\nReply 1, 2, or 3!`
        ),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // STATE 3: SELECT GENDER
    if (currentState === 'SELECT_GENDER') {
      const genderMap: Record<string, string> = { '1': 'Male', '2': 'Female', '3': 'Other' };
      const selectedGender = genderMap[bodyText.trim()] || 'Male';

      await supabase
        .from('whatsapp_sessions')
        .update({
          temp_gender: selectedGender,
          state: 'AWAITING_DEMOGRAPHICS',
          updated_at: new Date().toISOString(),
        })
        .eq('phone', fromPhone);

      return new Response(
        createTwiMLResponse(
          `Gender set to: ${selectedGender} 👍\n\nNow, please reply with the patient's Full Name & Age.\nExample: "Ramesh Kumar, 45"`
        ),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // STATE 4: AWAITING DEMOGRAPHICS (Name & Age)
    if (currentState === 'AWAITING_DEMOGRAPHICS') {
      const match = bodyText.match(/^([a-zA-Z\s]+)[,\s]+(\d{1,3})$/);
      let name = bodyText;
      let age = 30;

      if (match) {
        name = match[1].trim();
        age = parseInt(match[2], 10);
      }

      let patientId: string;
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('phone', fromPhone)
        .maybeSingle();

      const sexVal = session?.temp_gender || 'Male';
      const clinicVal = session?.temp_clinic_id || (clinicList[0]?.id || null);

      if (existingPatient) {
        patientId = existingPatient.id;
        await supabase.from('patients').update({ name, age, sex: sexVal }).eq('id', patientId);
      } else {
        let newP = await supabase
          .from('patients')
          .insert([{ name, age, sex: sexVal, phone: fromPhone, clinic_id: clinicVal }])
          .select('id')
          .single();

        if (newP.error) {
          newP = await supabase
            .from('patients')
            .insert([{ name, age, phone: fromPhone }])
            .select('id')
            .single();
        }

        patientId = newP.data!.id;
      }

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
          `Patient Registered: ${name} (${age} yrs, ${sexVal})! ✅\n\n🎙️ Now, please describe your illness or send Voice Notes in your language (Hindi, Bhojpuri, Angika, Tamil, Hinglish, etc.).\n\nYou can send multiple text messages or voice recordings!`
        ),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // STATE 5: AWAITING SYMPTOMS (Voice Notes or Text)
    if (currentState === 'AWAITING_SYMPTOMS') {
      const numMedia = parseInt(params.NumMedia || '0', 10);
      const isAudio = numMedia > 0 && (params.MediaContentType0 || '').startsWith('audio/');

      let patientId = session?.patient_id;
      if (!patientId) {
        const { data: p } = await supabase
          .from('patients')
          .select('id')
          .eq('phone', fromPhone)
          .single();
        patientId = p?.id;
      }

      const clinicVal = session?.temp_clinic_id || (clinicList[0]?.id || null);

      if (isAudio) {
        const mediaUrl = params.MediaUrl0;
        
        let newIntakeRes = await supabase
          .from('intakes')
          .insert([
            {
              clinic_id: clinicVal,
              patient_id: patientId,
              raw_text: '[Voice Note Transcribing Pending...]',
              is_voice_intake: true,
              audio_storage_path: mediaUrl,
              status: 'pending_review',
            },
          ])
          .select('id')
          .single();

        if (newIntakeRes.error) {
          newIntakeRes = await supabase
            .from('intakes')
            .insert([
              {
                patient_id: patientId,
                raw_text: '[Voice Note Transcribing Pending...]',
                is_voice_intake: true,
                status: 'pending_review',
              },
            ])
            .select('id')
            .single();
        }

        const newIntake = newIntakeRes.data;

        if (newIntake?.id) {
          fetch(`${new URL(request.url).origin}/api/transcribe-voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intake_id: newIntake.id, media_url: mediaUrl }),
          }).catch((err) => console.error('Background ASR trigger failed:', err));
        }

        return new Response(
          createTwiMLResponse(
            '🎙️ Voice note received! Converting audio to medical summary for your doctor. You can record more voice notes or reply anytime.'
          ),
          { headers: { 'Content-Type': 'text/xml' } }
        );
      } else {
        let newIntakeRes = await supabase
          .from('intakes')
          .insert([
            {
              clinic_id: clinicVal,
              patient_id: patientId,
              raw_text: bodyText,
              is_voice_intake: false,
              status: 'pending_review',
            },
          ])
          .select('id')
          .single();

        if (newIntakeRes.error) {
          newIntakeRes = await supabase
            .from('intakes')
            .insert([
              {
                patient_id: patientId,
                raw_text: bodyText,
                status: 'pending_review',
              },
            ])
            .select('id')
            .single();
        }

        const newIntake = newIntakeRes.data;

        if (newIntake?.id) {
          fetch(`${new URL(request.url).origin}/api/structure-intake`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intake_id: newIntake.id }),
          }).catch((err) => console.error('Background structuring call failed:', err));
        }

        return new Response(
          createTwiMLResponse(
            '👨‍⚕️ Your health details have been delivered directly to your consulting doctor\'s queue!\n\nThis is not a medical diagnosis. In a severe emergency, seek immediate in-person hospital care.'
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
