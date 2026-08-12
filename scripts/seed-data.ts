import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { checkUrgency } from '../lib/rules-engine';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const groqKey = process.env.GROQ_API_KEY;

if (!supabaseUrl || !supabaseKey || !groqKey) {
  console.error('Missing env variables in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const groq = new Groq({ apiKey: groqKey });

const SYSTEM_PROMPT = `You are a clinical data extraction tool designed for structured intake in a telemedicine platform. 
Your ONLY task is to extract objective symptom information from the patient's free-text input and return a JSON object.

CRITICAL MANDATES & COMPLIANCE GUARDRAILS:
1. You are a DATA EXTRACTION tool, NOT a diagnostic tool.
2. NEVER output a likely condition, diagnosis, disease name, or medical opinion.
3. NEVER suggest or recommend any medication, home remedy, or treatment.

Required Output Schema (JSON ONLY):
{
  "duration": "string",
  "severity": "string",
  "primary_symptoms": ["string"],
  "associated_symptoms": ["string"],
  "relevant_history": "string",
  "extraction_confidence": "high" | "medium" | "low"
}`;

const seedPatients = [
  {
    name: 'Rajesh Sharma',
    age: 58,
    phone: '9811223344',
    raw_text: 'I have severe pressing chest pain since 2 hours radiating to my left arm, and I am sweating profusely and feeling very breathless at rest.',
  },
  {
    name: 'Savitri Devi',
    age: 64,
    phone: '9822334455',
    raw_text: 'Face is drooping on right side, slurred speech started 40 mins ago, unable to lift right hand properly.',
  },
  {
    name: 'Amit Patel',
    age: 32,
    phone: '9833445566',
    raw_text: 'High fever for 5 days continuous. Temperature touching 102F. Taking paracetamol but fever comes back every 6 hours with severe headache and body pain.',
  },
  {
    name: 'Pooja Verma',
    age: 26,
    phone: '9844556677',
    raw_text: 'Severe loose motions and vomiting for last 24 hours. Cannot keep any water down, feeling very dizzy when standing up. Currently 6 months pregnant.',
  },
  {
    name: 'Aarav (Mother: Priya)',
    age: 0,
    phone: '9855667788',
    raw_text: 'My 7 month old infant baby has high fever since yesterday night, crying continuously and refusing to take breast milk.',
  },
  {
    name: 'Sunil Kumar',
    age: 40,
    phone: '9866778899',
    raw_text: 'Mild dry cough and throat irritation since yesterday morning. No fever, no breathing problem.',
  },
  {
    name: 'Meena Kumari',
    age: 35,
    phone: '9877889900',
    raw_text: 'Red itchy spots on both forearms after gardening yesterday. Mild itching, no pain or swelling elsewhere.',
  },
  {
    name: 'Karan Singh',
    age: 29,
    phone: '9888990011',
    raw_text: 'Slight lower back ache after lifting heavy box 2 days back. Pain increases on bending, mild stiffness in morning.',
  },
  {
    name: 'Anita Roy',
    age: 48,
    phone: '9899001122',
    raw_text: 'Mild acidity and heartburn after eating spicy dinner last night. Feeling bloating.',
  },
  {
    name: 'Vikram Joshi',
    age: 22,
    phone: '9800112233',
    raw_text: 'Watery left eye and slight redness since morning. No pain, no vision change.',
  },
  {
    name: 'Deepak Yadav',
    age: 50,
    phone: '9711223344',
    raw_text: 'Mild knee joint pain while climbing stairs for past 2 weeks. Takes crocin occasionally.',
  },
  {
    name: 'Suman Lata',
    age: 43,
    phone: '9722334455',
    raw_text: 'Feeling slightly tired and sluggish for past 3 days. Work stress has been high.',
  },
  {
    name: 'Rohan Gupta',
    age: 19,
    phone: '9733445566',
    raw_text: 'Small pimple on chin getting slightly painful on touch.',
  },
  {
    name: 'Rameshwar Prasad',
    age: 61,
    phone: '9744556677',
    raw_text: 'Bohot jyada chhati me dard ho raha hai kal raat se saans bhi phool rahi hai chalne me. Dawa liya tha farak nahi pada behoshi jaisa lag raha hai.',
  },
  {
    name: 'Kamla Bai',
    age: 70,
    phone: '9755667788',
    raw_text: 'Arey doctor saab pure sar me me dard hai bukhar 4 din se hai khana nahi khaya ja raha sar ghum raha hai bohot kamzori lag rahi hai.',
  },
];

async function seed() {
  console.log('🚀 Running Idempotent Seed via shared Groq + Rules Engine pipeline...\n');

  // Idempotency: Delete old test records for seed phones
  for (const item of seedPatients) {
    const { data: p } = await supabase
      .from('patients')
      .select('id')
      .eq('phone', item.phone)
      .maybeSingle();

    if (p) {
      await supabase.from('intakes').delete().eq('patient_id', p.id);
      await supabase.from('patients').delete().eq('id', p.id);
    }
  }

  for (let i = 0; i < seedPatients.length; i++) {
    const item = seedPatients[i];
    console.log(`[${i + 1}/${seedPatients.length}] Processing patient: ${item.name}...`);

    // Insert patient
    const { data: patient, error: pError } = await supabase
      .from('patients')
      .insert([{ name: item.name, age: item.age, phone: item.phone }])
      .select('id')
      .single();

    if (pError || !patient) {
      console.error(`  ❌ Error creating patient ${item.name}:`, pError?.message);
      continue;
    }

    // Insert raw intake row
    const { data: intake, error: iError } = await supabase
      .from('intakes')
      .insert([
        {
          patient_id: patient.id,
          raw_text: item.raw_text,
          status: 'pending_review',
        },
      ])
      .select('id')
      .single();

    if (iError || !intake) {
      console.error(`  ❌ Error inserting intake for ${item.name}:`, iError?.message);
      continue;
    }

    // Process through Groq Llama 3.3 Structuring
    let structuredData: any = null;
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: item.raw_text },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const textOutput = completion.choices[0]?.message?.content || '{}';
      const cleaned = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      structuredData = JSON.parse(cleaned);
    } catch (err: any) {
      console.warn(`  ⚠️ LLM fallback for ${item.name}:`, err.message);
      structuredData = {
        duration: 'Not specified',
        severity: 'Not specified',
        primary_symptoms: [item.raw_text],
        associated_symptoms: [],
        relevant_history: 'none stated',
        extraction_confidence: 'low',
      };
    }

    // Process through Deterministic Rules Engine
    const triage = checkUrgency(structuredData, item.age, item.raw_text);

    // Save results into Supabase
    await supabase
      .from('intakes')
      .update({
        structured_data: structuredData,
        urgency_level: triage.urgency_level,
        red_flags: triage.red_flags,
      })
      .eq('id', intake.id);

    console.log(
      `  ✅ [${triage.urgency_level.toUpperCase()}] Red Flags: ${triage.red_flags.length} | Confidence: ${structuredData.extraction_confidence || 'medium'}`
    );
  }

  console.log('\n🎉 Idempotent seed completed successfully!');
}

seed();
