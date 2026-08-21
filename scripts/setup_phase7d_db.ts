import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPhase7dDb() {
  console.log('🛠️ Setting up Phase 7d Reminders Schema...');

  const { error: subErr } = await supabase.from('patient_push_subscriptions').select('id').limit(1);
  console.log('patient_push_subscriptions check (PGRST205 if missing):', subErr?.code, subErr?.message);

  const { error: remErr } = await supabase.from('reminders').select('id').limit(1);
  console.log('reminders check (PGRST205 if missing):', remErr?.code, remErr?.message);

  const { error: dietErr } = await supabase.from('diet_recommendations').select('id').limit(1);
  console.log('diet_recommendations check (PGRST205 if missing):', dietErr?.code, dietErr?.message);
}

setupPhase7dDb();
