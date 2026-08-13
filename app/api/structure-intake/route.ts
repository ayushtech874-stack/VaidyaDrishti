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
    const { intake_id } = await request.json();

    if (!intake_id) {
      return NextResponse.json({ error: 'Missing intake_id' }, { status: 400 });
    }

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

    let structuredData = null;
    let attempts = 0;

    while (attempts < 2 && !structuredData) {
      attempts++;
      const llmOutput = await callGroqLLM(intake.raw_text);
      structuredData = parseJSONSafely(llmOutput);
    }

    if (!structuredData) {
      structuredData = {
        clinical_synthesis: `Patient stated: "${intake.raw_text}"`,
        duration: 'Not specified',
        severity: 'Not specified',
        primary_symptoms: [intake.raw_text],
        associated_symptoms: [],
        relevant_history: 'none stated',
        extraction_confidence: 'low',
      };
    }

    const containsRegionalScript = /[\u0B80-\u0BFF\u0C80-\u0CFF\u0C00-\u0C7F\u0980-\u09FF\u0A00-\u0A7F]/u.test(intake.raw_text);
    if (containsRegionalScript && structuredData.extraction_confidence === 'high') {
      structuredData.extraction_confidence = 'medium';
    }

    const patientAge = (intake.patients as any)?.age ?? null;
    const triageResult = checkUrgency(structuredData, patientAge, intake.raw_text);

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
          raw_text: intake.raw_text,
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
