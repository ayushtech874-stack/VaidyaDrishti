import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import { normalizePhone } from '@/lib/utils';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
  return createClient(url, key);
}

export function createTwiMLResponse(messageText: string): string {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(messageText);
  return twiml.toString();
}

export function parseGenderInput(text: string): string {
  const norm = text.trim().toLowerCase();
  if (norm === '1' || norm === 'male' || norm === 'm' || norm === 'purush') return 'Male';
  if (norm === '2' || norm === 'female' || norm === 'f' || norm === 'stree' || norm === 'mahila') return 'Female';
  if (norm === '3' || norm === 'other' || norm === 'others') return 'Other';
  return 'Male';
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    const rawFrom = (params.From || '').replace('whatsapp:', '').trim();
    // 1. STRICT SINGLE-FORMAT E.164 NORMALIZATION (+91XXXXXXXXXX)
    const fromPhone = normalizePhone(rawFrom);
    const bodyText = (params.Body || '').trim();

    if (!fromPhone) {
      return new Response(createTwiMLResponse('Invalid request'), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const nowIso = new Date().toISOString();
    const nowMs = Date.now();
    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes session timeout

    // 2. Fetch Clinics & Doctors from Supabase
    const { data: clinics } = await supabase.from('clinics').select('id, name, code, facility_type');
    const { data: doctors } = await supabase.from('doctors').select('id, name, clinic_id, department_id');

    const clinicList: any[] = clinics || [];
    const doctorList: any[] = doctors || [];

    // QR Code Match detection
    let scannedClinic: any = null;
    let scannedDoctor: any = null;
    const qrMatch =
      bodyText.match(/JOIN_CLINIC_[A-Z0-9_-]+/i) ||
      bodyText.match(/CLINIC_[A-Z0-9_-]+/i) ||
      bodyText.match(/JOIN_HOSP_[A-Z0-9_-]+/i) ||
      bodyText.match(/HOSP_[A-Z0-9_-]+/i);

    if (qrMatch) {
      const rawCode = qrMatch[0].toUpperCase();
      const cleanCode = rawCode.replace('JOIN_', '');

      scannedClinic = clinicList.find(
        (c: any) =>
          c.code.toUpperCase() === cleanCode ||
          c.code.toUpperCase() === rawCode ||
          c.code.toUpperCase().includes(cleanCode) ||
          cleanCode.includes(c.code.toUpperCase())
      );

      if (scannedClinic) {
        scannedDoctor = doctorList.find((d: any) => d.clinic_id === scannedClinic.id);
      }
    }

    // 3. Strict E.164 Phone Lookup for Active Session
    const { data: existingSessions } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('phone', fromPhone)
      .order('updated_at', { ascending: false });

    let activeSession = (existingSessions || []).find(
      (s: any) =>
        s.status === 'active' ||
        (!s.status && s.state !== 'completed' && s.state !== 'ended' && s.state !== 'expired')
    );

    // 4. SESSION TIMEOUT CHECK (30 Minutes inactivity)
    if (activeSession) {
      const lastMsgTime = new Date(
        activeSession.last_message_at || activeSession.updated_at || activeSession.consented_at || 0
      ).getTime();

      if (nowMs - lastMsgTime > TIMEOUT_MS) {
        await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'expired',
            state: 'expired',
            updated_at: nowIso,
          })
          .eq('phone', fromPhone);

        activeSession = null;

        return new Response(
          createTwiMLResponse(
            `Your previous intake session timed out due to inactivity. Let's start again! ⏰\n\nIf you have a clinic QR code, please scan it or send Hello to begin.`
          ),
          { headers: { 'Content-Type': 'text/xml' } }
        );
      }
    }

    // 5. EXPLICIT CONTROL KEYWORDS CHECK (END/RESTART)
    const normalizedBody = bodyText.toUpperCase();

    if (['END', 'STOP', 'CANCEL'].includes(normalizedBody)) {
      if (activeSession) {
        await supabase
          .from('whatsapp_sessions')
          .update({
            status: 'ended_by_user',
            state: 'ended',
            current_step: 'ended',
            updated_at: nowIso,
          })
          .eq('phone', fromPhone);
      }

      return new Response(
        createTwiMLResponse(
          `Your intake session has been cancelled. 🛑 No data was saved. Scan a clinic QR code or send Hello anytime to start a fresh intake.`
        ),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    if (normalizedBody === 'RESTART') {
      if (activeSession) {
        const currentClinicId = activeSession.clinic_id || activeSession.temp_clinic_id;
        const nextStep = currentClinicId ? 'awaiting_name' : 'awaiting_clinic_selection';

        await supabase
          .from('whatsapp_sessions')
          .update({
            current_step: nextStep,
            state: nextStep,
            draft_data: {},
            temp_name: null,
            temp_age: null,
            temp_gender: null,
            updated_at: nowIso,
            last_message_at: nowIso,
          })
          .eq('phone', fromPhone);

        if (currentClinicId) {
          const c = clinicList.find((x: any) => x.id === currentClinicId);
          return new Response(
            createTwiMLResponse(
              `Session restarted for ${c?.name || 'your clinic'}! 🔄\n\nWhat's the patient's name?`
            ),
            { headers: { 'Content-Type': 'text/xml' } }
          );
        } else {
          return new Response(
            createTwiMLResponse(
              `Session restarted! 🔄\n\nPlease select your consulting clinic or scan your doctor's QR code.`
            ),
            { headers: { 'Content-Type': 'text/xml' } }
          );
        }
      } else {
        return new Response(
          createTwiMLResponse(
            `No active session to restart. Scan a clinic QR code or reply Hello to start a fresh intake.`
          ),
          { headers: { 'Content-Type': 'text/xml' } }
        );
      }
    }

    // 6. MID-CONVERSATION QR CODE SWITCH CONFIRMATION
    if (activeSession && scannedClinic) {
      const activeClinicId = activeSession.clinic_id || activeSession.temp_clinic_id;
      const draft = activeSession.draft_data || {};

      if (draft.pending_switch_clinic_id) {
        if (['YES', '1', 'AGREE', 'SURE', 'CONFIRM'].includes(normalizedBody)) {
          const newClinicId = draft.pending_switch_clinic_id;
          const newDoctorId = draft.pending_switch_doctor_id;
          const targetClinic = clinicList.find((c: any) => c.id === newClinicId);

          await supabase
            .from('whatsapp_sessions')
            .update({
              clinic_id: newClinicId,
              temp_clinic_id: newClinicId,
              doctor_id: newDoctorId,
              current_step: 'awaiting_name',
              state: 'awaiting_name',
              draft_data: {},
              updated_at: nowIso,
              last_message_at: nowIso,
            })
            .eq('phone', fromPhone);

          return new Response(
            createTwiMLResponse(
              `Switched successfully to ${targetClinic?.name || 'new clinic'}! 🏥\n\nWhat's the patient's name?`
            ),
            { headers: { 'Content-Type': 'text/xml' } }
          );
        } else {
          const currentClinic = clinicList.find((c: any) => c.id === activeClinicId);
          delete draft.pending_switch_clinic_id;
          delete draft.pending_switch_doctor_id;

          await supabase
            .from('whatsapp_sessions')
            .update({
              draft_data: draft,
              updated_at: nowIso,
              last_message_at: nowIso,
            })
            .eq('phone', fromPhone);

          const stepPromptMap: Record<string, string> = {
            awaiting_name: "What's the patient's name?",
            awaiting_age: "What's their age?",
            awaiting_gender: "Please select Patient Sex/Gender:\n1 Male\n2 Female\n3 Other",
            awaiting_symptoms: "Please describe the symptoms — you can type or send a voice note",
          };

          const currentStep = activeSession.current_step || activeSession.state || 'awaiting_name';
          return new Response(
            createTwiMLResponse(
              `Continuing with your registration for ${currentClinic?.name || 'your current clinic'}.\n\n${stepPromptMap[currentStep] || "What's the patient's name?"}`
            ),
            { headers: { 'Content-Type': 'text/xml' } }
          );
        }
      }

      if (scannedClinic.id !== activeClinicId) {
        const currentClinic = clinicList.find((c: any) => c.id === activeClinicId);
        const currentDoc = doctorList.find((d: any) => d.clinic_id === activeClinicId);

        draft.pending_switch_clinic_id = scannedClinic.id;
        draft.pending_switch_doctor_id = scannedDoctor?.id || null;

        await supabase
          .from('whatsapp_sessions')
          .update({
            draft_data: draft,
            updated_at: nowIso,
            last_message_at: nowIso,
          })
          .eq('phone', fromPhone);

        const docTitle = currentDoc?.name ? `with Dr. ${currentDoc.name} ` : '';
        const currentClinicTitle = currentClinic?.name || 'your current clinic';

        return new Response(
          createTwiMLResponse(
            `You're currently registering ${docTitle}at ${currentClinicTitle} — do you want to switch to ${scannedClinic.name} instead?\n\nReply YES to switch or continue with your current session.`
          ),
          { headers: { 'Content-Type': 'text/xml' } }
        );
      }
    }

    // 7. NO ACTIVE SESSION: Create New Session
    if (!activeSession) {
      if (scannedClinic) {
        const { data: newSession } = await supabase
          .from('whatsapp_sessions')
          .insert([
            {
              phone: fromPhone,
              clinic_id: scannedClinic.id,
              temp_clinic_id: scannedClinic.id,
              doctor_id: scannedDoctor?.id || null,
              current_step: 'awaiting_name',
              state: 'awaiting_name',
              draft_data: {},
              status: 'active',
              last_message_at: nowIso,
              updated_at: nowIso,
            },
          ])
          .select('*')
          .single();

        activeSession = newSession;

        const docTitle = scannedDoctor?.name ? ` (${scannedDoctor.name})` : '';
        return new Response(
          createTwiMLResponse(
            `Welcome to ${scannedClinic.name}! 🏥${docTitle}\n\n🛡️ *Privacy & Care Continuity Notice (DPDP Act 2023):*\nBy continuing, your visit history & records may be visible to VaidyaDrishti doctors you consult across network facilities to support continuity of care.\n\nWhat's the patient's name?`
          ),
          { headers: { 'Content-Type': 'text/xml' } }
        );
      } else {
        let menuMsg = `Welcome to VaidyaDrishti Tele-Triage Portal! 🏥\n\n🛡️ *Privacy & Care Continuity Notice (DPDP Act 2023):*\nBy continuing, your visit history & records may be visible to VaidyaDrishti doctors you consult across network facilities to support continuity of care.\n\nPlease select your Consulting Hospital / Doctor:\n\n`;
        clinicList.forEach((clinic: any, idx: number) => {
          const doc = doctorList.find((d: any) => d.clinic_id === clinic.id);
          menuMsg += `${idx + 1}️⃣ ${clinic.name} ${doc?.name ? `— Dr. ${doc.name}` : ''}\n`;
        });
        menuMsg += `\nReply with number (e.g., 1 or 2) or scan your clinic's QR code!`;

        await supabase
          .from('whatsapp_sessions')
          .insert([
            {
              phone: fromPhone,
              current_step: 'awaiting_clinic_selection',
              state: 'awaiting_clinic_selection',
              draft_data: {},
              status: 'active',
              last_message_at: nowIso,
              updated_at: nowIso,
            },
          ]);

        return new Response(createTwiMLResponse(menuMsg), {
          headers: { 'Content-Type': 'text/xml' },
        });
      }
    }

    // 8. STEP-BASED CONVERSATION STATE MACHINE
    const currentStep = activeSession.current_step || activeSession.state || 'awaiting_name';
    const draft = activeSession.draft_data || {};

    const updateSessionStep = async (nextStep: string, updatedDraft: any) => {
      await supabase
        .from('whatsapp_sessions')
        .update({
          current_step: nextStep,
          state: nextStep,
          draft_data: updatedDraft,
          last_message_at: nowIso,
          updated_at: nowIso,
        })
        .eq('phone', fromPhone);
    };

    // STEP: awaiting_clinic_selection
    if (currentStep === 'awaiting_clinic_selection') {
      const choiceNum = parseInt(bodyText.trim(), 10);
      if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= clinicList.length) {
        const selectedClinic = clinicList[choiceNum - 1];
        const assignedDoc = doctorList.find((d: any) => d.clinic_id === selectedClinic.id);

        await supabase
          .from('whatsapp_sessions')
          .update({
            clinic_id: selectedClinic.id,
            temp_clinic_id: selectedClinic.id,
            doctor_id: assignedDoc?.id || null,
            current_step: 'awaiting_name',
            state: 'awaiting_name',
            last_message_at: nowIso,
            updated_at: nowIso,
          })
          .eq('phone', fromPhone);

        return new Response(
          createTwiMLResponse(
            `Selected: ${selectedClinic.name} 🏥\n\nWhat's the patient's name?`
          ),
          { headers: { 'Content-Type': 'text/xml' } }
        );
      } else {
        let menuMsg = `Please select your Consulting Hospital / Doctor by replying with a valid number:\n\n`;
        clinicList.forEach((clinic: any, idx: number) => {
          const doc = doctorList.find((d: any) => d.clinic_id === clinic.id);
          menuMsg += `${idx + 1}️⃣ ${clinic.name} ${doc?.name ? `— Dr. ${doc.name}` : ''}\n`;
        });
        return new Response(createTwiMLResponse(menuMsg), {
          headers: { 'Content-Type': 'text/xml' },
        });
      }
    }

    // STEP: awaiting_name
    if (currentStep === 'awaiting_name') {
      const patientName = bodyText.trim();
      draft.name = patientName;

      await updateSessionStep('awaiting_age', draft);

      return new Response(
        createTwiMLResponse(`What's their age?`),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // STEP: awaiting_age
    if (currentStep === 'awaiting_age') {
      const ageMatch = bodyText.match(/\d{1,3}/);
      const parsedAge = ageMatch ? parseInt(ageMatch[0], 10) : 30;
      draft.age = parsedAge;

      await updateSessionStep('awaiting_gender', draft);

      return new Response(
        createTwiMLResponse(
          `Please select Patient Sex/Gender:\n1 Male\n2 Female\n3 Other`
        ),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // STEP: awaiting_gender
    if (currentStep === 'awaiting_gender') {
      const selectedGender = parseGenderInput(bodyText);
      draft.gender = selectedGender;

      await updateSessionStep('awaiting_symptoms', draft);

      return new Response(
        createTwiMLResponse(
          `Please describe the symptoms — you can type or send a voice note`
        ),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // STEP: awaiting_symptoms
    if (currentStep === 'awaiting_symptoms') {
      const numMedia = parseInt(params.NumMedia || '0', 10);
      const isAudio = numMedia > 0 && (params.MediaContentType0 || '').startsWith('audio/');
      const mediaUrl = isAudio ? params.MediaUrl0 : null;

      draft.symptoms = isAudio ? '[Voice Note Transcribing Pending...]' : bodyText;
      draft.is_voice = isAudio;
      draft.media_url = mediaUrl;

      const clinicIdVal = activeSession.clinic_id || activeSession.temp_clinic_id || clinicList[0]?.id;
      const doctorIdVal = activeSession.doctor_id || null;

      // 9. Create/Update Patient Record with Strict Single E.164 Phone Format
      let patientId: string;
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('phone', fromPhone)
        .maybeSingle();

      if (existingPatient) {
        patientId = existingPatient.id;
        await supabase
          .from('patients')
          .update({
            name: draft.name || 'Unknown Patient',
            age: draft.age || 30,
            sex: draft.gender || 'Male',
            phone: fromPhone,
            clinic_id: clinicIdVal,
          })
          .eq('id', patientId);
      } else {
        let newP = await supabase
          .from('patients')
          .insert([
            {
              name: draft.name || 'Unknown Patient',
              age: draft.age || 30,
              sex: draft.gender || 'Male',
              phone: fromPhone,
              clinic_id: clinicIdVal,
            },
          ])
          .select('id')
          .single();

        if (newP.error) {
          newP = await supabase
            .from('patients')
            .insert([
              {
                name: draft.name || 'Unknown Patient',
                age: draft.age || 30,
                phone: fromPhone,
              },
            ])
            .select('id')
            .single();
        }

        patientId = newP.data!.id;
      }

      // 10. Insert Intake Record with BOTH clinic_id and doctor_id
      let newIntakeRes = await supabase
        .from('intakes')
        .insert([
          {
            clinic_id: clinicIdVal,
            doctor_id: doctorIdVal,
            department_id: doctorIdVal,
            patient_id: patientId,
            raw_text: draft.symptoms,
            is_voice_intake: isAudio,
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
              clinic_id: clinicIdVal,
              patient_id: patientId,
              raw_text: draft.symptoms,
              is_voice_intake: isAudio,
              status: 'pending_review',
            },
          ])
          .select('id')
          .single();
      }

      const newIntake = newIntakeRes.data;

      // 11. Trigger Async Structuring / ASR
      if (newIntake?.id) {
        const origin = new URL(request.url).origin;
        if (isAudio && mediaUrl) {
          fetch(`${origin}/api/transcribe-voice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intake_id: newIntake.id, media_url: mediaUrl }),
          }).catch((err) => console.error('Background ASR trigger failed:', err));
        } else {
          fetch(`${origin}/api/structure-intake`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ intake_id: newIntake.id }),
          }).catch((err) => console.error('Background structuring call failed:', err));
        }
      }

      // 12. Complete Session & WhatsApp Dashboard Claim Nudge
      await supabase
        .from('whatsapp_sessions')
        .update({
          current_step: 'completed',
          state: 'completed',
          status: 'completed',
          draft_data: draft,
          updated_at: nowIso,
          last_message_at: nowIso,
        })
        .eq('phone', fromPhone);

      // Check if patient already has a claimed dashboard account or received a nudge within 24h
      let claimNudgeText = '';
      const { data: currentPatient } = await supabase
        .from('patients')
        .select('id, auth_user_id, last_claim_nudge_sent_at')
        .eq('id', patientId)
        .single();

      if (currentPatient && !currentPatient.auth_user_id) {
        const lastNudgeTime = currentPatient.last_claim_nudge_sent_at ? new Date(currentPatient.last_claim_nudge_sent_at).getTime() : 0;
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

        if (nowMs - lastNudgeTime > TWENTY_FOUR_HOURS_MS) {
          const { generateClaimToken } = await import('@/lib/auth/claimToken');
          const claimTokenStr = generateClaimToken({ patientId: currentPatient.id, phone: fromPhone });
          const origin = new URL(request.url).origin;
          const claimUrl = `${origin}/patient/claim-account?token=${claimTokenStr}`;

          claimNudgeText = `\n\n📲 *Want to track all your visits, prescriptions, and reminders in one place?*\nTap here to set up your VaidyaDrishti dashboard:\n${claimUrl}`;

          // Update last_claim_nudge_sent_at
          await supabase
            .from('patients')
            .update({ last_claim_nudge_sent_at: nowIso })
            .eq('id', currentPatient.id);
        }
      }

      return new Response(
        createTwiMLResponse(
          `Thank you, ${draft.name || 'patient'}! ✅ Your intake has been submitted to your consulting doctor's queue.${claimNudgeText}\n\n🔄 To start a new intake or consult another doctor, reply "NEW" or scan a clinic QR code!`
        ),
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    return new Response(
      createTwiMLResponse(`Thank you for contacting VaidyaDrishti. Reply NEW anytime to start a new consultation!`),
      { headers: { 'Content-Type': 'text/xml' } }
    );
  } catch (err: any) {
    console.error('Error in WhatsApp webhook:', err);
    return new Response(createTwiMLResponse('An error occurred. Reply RESTART to retry.'), {
      headers: { 'Content-Type': 'text/xml' },
      status: 500,
    });
  }
}
