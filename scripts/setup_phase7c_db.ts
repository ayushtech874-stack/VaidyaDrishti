import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPhase7cDb() {
  console.log('🛠️ Setting up Phase 7c Appointments Schema...');

  const { error: availErr } = await supabase.from('doctor_availability').select('id').limit(1);
  console.log('doctor_availability check error (PGRST205 if missing):', availErr?.code, availErr?.message);

  const { error: apptErr } = await supabase.from('appointments').select('id').limit(1);
  console.log('appointments check error (PGRST205 if missing):', apptErr?.code, apptErr?.message);
}

setupPhase7cDb();
