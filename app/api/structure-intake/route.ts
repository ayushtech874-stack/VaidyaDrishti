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

const SYSTEM_PROMPT = `You are a clinical data extraction tool designed for structured intake in a telemedicine platform. 
Your ONLY task is to extract objective symptom information from the patient's free-text input and return a JSON object.

CRITICAL MANDATES & COMPLIANCE GUARDRAILS:
1. You are a DATA EXTRACTION tool, NOT a diagnostic tool.
2. NEVER output a likely condition, diagnosis, disease name, or medical opinion.
3. NEVER suggest or recommend any medication, home remedy, or treatment.
4. Extract ONLY facts explicitly stated or directly implied by the patient's words.
5. TRANSLATION MANDATE: Regardless of what regional language or dialect the patient spoke (e.g. Hindi, Angika, Bhojpuri, Maithili, Tamil, Kannada, Marathi, Hinglish), ALL fields in the extracted JSON output MUST be translated and written in clear, professional ENGLISH for doctor review.

Required Output Schema (JSON ONLY, no markdown, no explanatory text):
{
  "duration": "string describing symptom duration in English, e.g., '3 days', 'since this morning', 'unknown'",
  "severity": "patient's description of severity translated to English, e.g., 'mild', 'unbearable', 'moderate', 'not specified'",
  "primary_symptoms": ["list of main complaints translated to English"],
  "associated_symptoms": ["list of secondary or accompanying symptoms translated to English"],
  "relevant_history": "past medical background translated to English, or 'none stated'",
  "extraction_confidence": "high" | "medium" | "low"
}

If the text is messy, unclear, or incomplete, set "extraction_confidence" to "low" or "medium" and capture whatever partial facts you can safely extract.`;

async function callGroqLLM(rawText: string) {
  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extract structured intake data from the following patient transcript:\n\n"${rawText}"`,
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
    // Strip markdown code fences if present
    const cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
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

    // 1. Fetch raw_text and patient age from Supabase
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

    // 2. Call Groq with 1 retry attempt if JSON parsing fails
    while (attempts < 2 && !structuredData) {
      attempts++;
      const llmOutput = await callGroqLLM(intake.raw_text);
      structuredData = parseJSONSafely(llmOutput);
    }

    // Fallback if parsing failed after retries
    if (!structuredData) {
      structuredData = {
        duration: 'Not specified',
        severity: 'Not specified',
        primary_symptoms: [intake.raw_text],
        associated_symptoms: [],
        relevant_history: 'none stated',
        extraction_confidence: 'low',
      };
    }

    // Enforced UI Safeguard: If transcript contains non-English / regional Indic scripts (Tamil, Kannada, Telugu, Bengali, Punjabi), set confidence to medium/low to force raw transcript review gate
    const containsRegionalScript = /[\u0B80-\u0BFF\u0C80-\u0CFF\u0C00-\u0C7F\u0980-\u09FF\u0A00-\u0A7F]/u.test(intake.raw_text);
    if (containsRegionalScript && structuredData.extraction_confidence === 'high') {
      structuredData.extraction_confidence = 'medium';
    }

    // 3. Run Deterministic Red-Flag Rules Engine (TypeScript)
    const patientAge = (intake.patients as any)?.age ?? null;
    const triageResult = checkUrgency(structuredData, patientAge, intake.raw_text);

    // 4. Update structured_data, urgency_level, and red_flags in Supabase
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
        { error: `Failed to save structured data & triage result: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 5. ICMR 2023 Compliance: Write audit logs for LLM Extraction and Triage Evaluation
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
      {
        intake_id,
        event_type: 'TRIAGE_RULE_EVAL',
        actor: 'RULES_ENGINE',
        details: {
          urgency_level: triageResult.urgency_level,
          red_flags_triggered: triageResult.red_flags,
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
