import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectIntakesDeep() {
  console.log('🔍 Querying Intakes table directly without doctor_id...');

  const { data: intakes, error } = await supabase
    .from('intakes')
    .select('id, patient_id, clinic_id, raw_text, urgency_level, status, created_at');

  console.log('Error:', error);
  console.log(`Total Intakes in DB: ${intakes?.length || 0}`);
  intakes?.forEach((i: any, idx: number) => {
    console.log(`Intake #${idx + 1}: ${i.id} | Clinic: ${i.clinic_id} | Status: ${i.status} | Text: "${i.raw_text}"`);
  });
}

inspectIntakesDeep();
