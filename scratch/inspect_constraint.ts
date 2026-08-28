import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkConstraint() {
  const statuses = ['scheduled', 'pending', 'confirmed', 'completed', 'cancelled', 'booked', 'requested'];
  for (const s of statuses) {
    const { data, error } = await supabase.from('appointments').insert([
      {
        patient_id: '00000000-0000-0000-0000-000000000000',
        doctor_id: '00000000-0000-0000-0000-000000000000',
        scheduled_at: new Date().toISOString(),
        status: s,
      }
    ]).select();
    console.log(`Status '${s}':`, error ? error.message : 'SUCCESS!');
  }
}

checkConstraint();
