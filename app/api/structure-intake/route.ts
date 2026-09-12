import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import {
  checkUrgency,
  getDeterministicClinicalRationale,
  getRecommendedSpecialty,
  StructuredIntakeData,
} from '@/lib/rules-engine';

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
4. Provide a rich, comprehensive "clinical_synthesis" field capturing primary complaints, symptom progression, and patient state.

Required Output Schema (JSON ONLY, no markdown, no explanatory text):
{
  "clinical_synthesis": "Comprehensive narrative synthesis of the patient's condition, emotional state, symptom progression, and specific guidance requested.",
  "duration": "Symptom duration in English, e.g. '3 days', 'since this morning', 'acute onset'",
  "severity": "Patient-described severity, e.g. 'unbearable one-sided headache', 'severe cramps', 'moderate'",
  "primary_symptoms": ["list of main complaints translated to English"],
  "associated_symptoms": ["list of accompanying symptoms"],
  "relevant_history": "past medical background or 'none stated'",
  "extraction_confidence": "high" | "medium" | "low"
}`;

const CANDIDATE_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama3-70b-8192',
  'llama-3.1-8b-instant',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
];

async function callGroqLLM(rawText: string): Promise<{ content: string; modelUsed: string }> {
  for (const modelCandidate of CANDIDATE_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Extract and synthesize detailed clinical intake data from the following patient transcript:\n\n"${rawText}"`,
          },
        ],
        model: modelCandidate,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content || '';
      if (content) {
        return { content, modelUsed: modelCandidate };
      }
    } catch (err: any) {
      console.warn(`Groq model ${modelCandidate} failed:`, err?.message || err);
    }
  }
  return { content: '', modelUsed: 'heuristic_fallback' };
}

function parseJSONSafely(content: string): StructuredIntakeData | null {
  try {
    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      clinical_synthesis: String(parsed.clinical_synthesis || 'Patient presented with acute symptoms requiring doctor evaluation.'),
      clinical_reasoning: String(parsed.clinical_reasoning || 'Based on the reported symptoms, appropriate clinical evaluation is recommended.'),
      recommended_specialty: String(parsed.recommended_specialty || 'General Physician'),
      duration: String(parsed.duration || 'Not specified'),
      severity: String(parsed.severity || 'Not specified'),
      primary_symptoms: Array.isArray(parsed.primary_symptoms) ? parsed.primary_symptoms.map(String) : [],
      associated_symptoms: Array.isArray(parsed.associated_symptoms) ? parsed.associated_symptoms.map(String) : [],
      relevant_history: String(parsed.relevant_history || 'none stated'),
      extraction_confidence: (['high', 'medium', 'low'].includes(parsed.extraction_confidence)
        ? parsed.extraction_confidence
        : 'medium') as 'high' | 'medium' | 'low',
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
    const fallbackClinicId = defaultClinic?.id || null;

    const { data: defaultDoc } = await supabase.from('doctors').select('id, name').limit(1).maybeSingle();
    const fallbackDoctorId = defaultDoc?.id || null;

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

      rawTextToStructure = inputRawText;
      patientAgeForTriage = parseInt(body.age, 10) || 30;

      // Safely record patient & intake in DB if requested / available
      try {
        let targetPatientId = body.patient_id;

        if (!targetPatientId) {
          const pName = (body.name || 'Anonymous Patient').trim();
          const pAge = patientAgeForTriage;
          const pPhone = body.phone || `+9190${Date.now().toString().slice(-8)}`;

          const patientInsertData: Record<string, any> = {
            name: pName,
            age: pAge,
            phone: pPhone,
            relationship: 'self',
          };
          if (body.clinic_id || fallbackClinicId) {
            patientInsertData.clinic_id = body.clinic_id || fallbackClinicId;
          }

          const { data: newPatient } = await supabase
            .from('patients')
            .insert([patientInsertData])
            .select('id')
            .single();

          if (newPatient) {
            targetPatientId = newPatient.id;
          }
        }

        const targetClinicId = body.clinic_id || fallbackClinicId;
        const targetDoctorId = body.doctor_id || fallbackDoctorId;

        if (targetPatientId) {
          const intakeInsertData: Record<string, any> = {
            patient_id: targetPatientId,
            raw_text: inputRawText,
            status: 'pending_review',
            urgency_level: 'low',
          };

          if (targetClinicId) intakeInsertData.clinic_id = targetClinicId;
          if (targetDoctorId) intakeInsertData.doctor_id = targetDoctorId;
          if (body.department_id) intakeInsertData.department_id = body.department_id;

          const { data: createdIntake } = await supabase
            .from('intakes')
            .insert([intakeInsertData])
            .select('id')
            .single();

          if (createdIntake) {
            intake_id = createdIntake.id;
          }
        }
      } catch (dbErr: any) {
        console.warn('Non-blocking intake DB persistence notice:', dbErr?.message);
      }
    }

    let structuredData = null;
    let modelUsed = 'none';
    let attempts = 0;

    while (attempts < 2 && !structuredData) {
      attempts++;
      const llmResult = await callGroqLLM(rawTextToStructure);
      modelUsed = llmResult.modelUsed;
      if (llmResult.content) {
        structuredData = parseJSONSafely(llmResult.content);
      }
    }

    if (!structuredData) {
      structuredData = {
        clinical_synthesis: `Patient stated: "${rawTextToStructure}"`,
        clinical_reasoning: 'Symptoms evaluated for general triage assistance.',
        recommended_specialty: 'General Physician',
        duration: 'Not specified',
        severity: 'Not specified',
        primary_symptoms: [rawTextToStructure],
        associated_symptoms: [],
        relevant_history: 'none stated',
        extraction_confidence: 'low' as const,
      };
    }

    const containsRegionalScript = /[\u0B80-\u0BFF\u0C80-\u0CFF\u0C00-\u0C7F\u0980-\u09FF\u0A00-\u0A7F]/u.test(rawTextToStructure);
    if (containsRegionalScript && structuredData.extraction_confidence === 'high') {
      structuredData.extraction_confidence = 'medium';
    }

    const triageResult = checkUrgency(structuredData, patientAgeForTriage, rawTextToStructure);

    // DETERMINISTIC PATIENT-FACING RATIONALE & SPECIALTY MAPPING (Rule-bound, 0 LLM Dependence)
    const deterministicRationale = getDeterministicClinicalRationale(triageResult.urgency_level, triageResult.red_flags);
    const deterministicSpecialty = getRecommendedSpecialty(rawTextToStructure, triageResult.red_flags);

    structuredData.clinical_reasoning = deterministicRationale;
    structuredData.recommended_specialty = deterministicSpecialty;

    if (intake_id) {
      const intakeStatus = triageResult.urgency_level === 'high' ? 'unclaimed_emergency' : 'pending_review';
      await supabase
        .from('intakes')
        .update({
          structured_data: structuredData,
          urgency_level: triageResult.urgency_level,
          red_flags: triageResult.red_flags,
          status: intakeStatus,
        })
        .eq('id', intake_id);
    }

    await supabase.from('audit_logs').insert([
      {
        intake_id: intake_id || null,
        event_type: 'LLM_EXTRACTION',
        actor: 'SYSTEM_AI',
        details: {
          model: modelUsed,
          raw_text: rawTextToStructure,
          structured_output: structuredData,
          urgency_level: triageResult.urgency_level,
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
      clinical_reasoning: deterministicRationale,
      recommended_specialty: deterministicSpecialty,
    });
  } catch (error: any) {
    console.error('Error structuring intake:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
