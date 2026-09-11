import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { checkUrgency } from '@/lib/rules-engine';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert clinical data extraction and intake synthesis assistant in a medical tele-triage system.
Your task is to analyze the patient's transcript and produce a highly descriptive, professional clinical breakdown in English for doctor decision-support.

CRITICAL MANDATES & COMPLIANCE GUARDRAILS:
1. You are a DATA EXTRACTION & SYNTHESIS tool, NOT a diagnostic tool.
2. NEVER output a definitive disease diagnosis or prescribe prescription drugs.
3. TRANSLATION MANDATE: Translate all regional languages/dialects (Hindi, Angika, Bhojpuri, Tamil, Kannada, Hinglish) into clear, professional Medical English.
4. Provide a rich, comprehensive "clinical_synthesis" field capturing:
   - Patient's primary complaints and emotional state (e.g. severe anxiety, acute pain, distress)
   - Detailed timeline and symptom progression
   - Specific questions or guidance requested by the patient (e.g. home remedies vs clinic visit)

Required Output Schema (JSON ONLY, no markdown, no explanatory text):
{
  "clinical_synthesis": "Comprehensive narrative synthesis of the patient's condition, emotional state, symptom progression, and specific guidance requested by the patient.",
  "duration": "Symptom duration in English, e.g. '3 days', 'since this morning', 'acute onset'",
  "severity": "Patient-described severity, e.g. 'unbearable one-sided headache', 'severe cramps', 'moderate'",
  "primary_symptoms": ["list of main complaints translated to English"],
  "associated_symptoms": ["list of accompanying symptoms"],
  "relevant_history": "past medical background or 'none stated'",
  "extraction_confidence": "high" | "medium" | "low"
}`;

async function callGroqLLM(rawText: string) {
  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extract and synthesize detailed clinical intake data from the following patient transcript:\n\n"${rawText}"`,
      },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  return completion.choices[0]?.message?.content || '';
}

function parseJSONSafely(content: string) {
  try {
    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      clinical_synthesis: String(parsed.clinical_synthesis || 'Patient presented with acute symptoms requiring doctor evaluation.'),
      duration: String(parsed.duration || 'Not specified'),
      severity: String(parsed.severity || 'Not specified'),
      primary_symptoms: Array.isArray(parsed.primary_symptoms) ? parsed.primary_symptoms.map(String) : [],
      associated_symptoms: Array.isArray(parsed.associated_symptoms) ? parsed.associated_symptoms.map(String) : [],
      relevant_history: String(parsed.relevant_history || 'none stated'),
      extraction_confidence: ['high', 'medium', 'low'].includes(parsed.extraction_confidence)
        ? parsed.extraction_confidence
        : 'medium',
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let intake_id = body.intake_id;
    let rawTextToStructure = '';
    let patientAgeForTriage: number | null = null;

    // Fetch fallback clinic and doctor if needed
    const { data: defaultClinic } = await supabase.from('clinics').select('id').limit(1).maybeSingle();
    const fallbackClinicId = defaultClinic?.id || '00000000-0000-0000-0000-000000000001';

    const { data: defaultDoc } = await supabase.from('doctors').select('id, name').limit(1).maybeSingle();
    const fallbackDoctorId = defaultDoc?.id || '00000000-0000-0000-0000-000000000000';

    if (intake_id) {
      // Scenario A: Existing intake_id supplied
      const { data: intake, error: fetchError } = await supabase
        .from('intakes')
        .select(`
          id,
          raw_text,
          patients (
            age
          )
        `)
        .eq('id', intake_id)
        .single();

      if (fetchError || !intake) {
        return NextResponse.json(
          { error: `Intake not found: ${fetchError?.message}` },
          { status: 404 }
        );
      }

      rawTextToStructure = intake.raw_text;
      patientAgeForTriage = (intake.patients as any)?.age ?? null;
    } else {
      // Scenario B: Form submission without pre-existing intake_id (e.g. /patient/intake or /patient/dashboard/new-consultation)
      const inputRawText = (body.raw_text || body.symptoms || '').trim();
      if (!inputRawText) {
        return NextResponse.json({ error: 'Symptoms description (raw_text) is required.' }, { status: 400 });
      }

      let targetPatientId = body.patient_id;

      if (!targetPatientId) {
        // Create new patient record from intake form inputs
        const pName = (body.name || 'Anonymous Patient').trim();
        const pAge = parseInt(body.age, 10) || 30;
        const pPhone = body.phone || `+9190${Date.now().toString().slice(-8)}`;

        const { data: newPatient, error: patErr } = await supabase
          .from('patients')
          .insert([{
            name: pName,
            age: pAge,
            phone: pPhone,
            clinic_id: body.clinic_id || fallbackClinicId,
            relationship: 'self'
          }])
          .select('id')
          .single();

        if (patErr || !newPatient) {
          throw new Error(`Failed to create patient registration: ${patErr?.message}`);
        }
        targetPatientId = newPatient.id;
        patientAgeForTriage = pAge;
      }

      const targetClinicId = body.clinic_id || fallbackClinicId;
      const targetDoctorId = body.doctor_id || fallbackDoctorId;

      // Create new intake record in DB assigned to doctor queue
      const { data: createdIntake, error: inErr } = await supabase
        .from('intakes')
        .insert([{
          patient_id: targetPatientId,
          clinic_id: targetClinicId,
          doctor_id: targetDoctorId,
          department_id: body.department_id || null,
          raw_text: inputRawText,
          status: 'pending_review',
          urgency_level: 'low'
        }])
        .select('id, raw_text')
        .single();

      if (inErr || !createdIntake) {
        throw new Error(`Failed to create consultation intake: ${inErr?.message}`);
      }

      intake_id = createdIntake.id;
      rawTextToStructure = createdIntake.raw_text;
    }

    let structuredData = null;
    let attempts = 0;

    while (attempts < 2 && !structuredData) {
      attempts++;
      const llmOutput = await callGroqLLM(rawTextToStructure);
      structuredData = parseJSONSafely(llmOutput);
    }

    if (!structuredData) {
      structuredData = {
        clinical_synthesis: `Patient stated: "${rawTextToStructure}"`,
        duration: 'Not specified',
        severity: 'Not specified',
        primary_symptoms: [rawTextToStructure],
        associated_symptoms: [],
        relevant_history: 'none stated',
        extraction_confidence: 'low',
      };
    }

    const containsRegionalScript = /[\u0B80-\u0BFF\u0C80-\u0CFF\u0C00-\u0C7F\u0980-\u09FF\u0A00-\u0A7F]/u.test(rawTextToStructure);
    if (containsRegionalScript && structuredData.extraction_confidence === 'high') {
      structuredData.extraction_confidence = 'medium';
    }

    const triageResult = checkUrgency(structuredData, patientAgeForTriage, rawTextToStructure);

    const { error: updateError } = await supabase
      .from('intakes')
      .update({
        structured_data: structuredData,
        urgency_level: triageResult.urgency_level,
        red_flags: triageResult.red_flags,
      })
      .eq('id', intake_id);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to save structured data: ${updateError.message}` },
        { status: 500 }
      );
    }

    await supabase.from('audit_logs').insert([
      {
        intake_id,
        event_type: 'LLM_EXTRACTION',
        actor: 'SYSTEM_AI',
        details: {
          model: 'llama-3.3-70b-versatile',
          raw_text: rawTextToStructure,
          structured_output: structuredData,
          confidence: structuredData.extraction_confidence,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      intake_id,
      structured_data: structuredData,
      urgency_level: triageResult.urgency_level,
      red_flags: triageResult.red_flags,
    });
  } catch (error: any) {
    console.error('Error structuring intake:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
