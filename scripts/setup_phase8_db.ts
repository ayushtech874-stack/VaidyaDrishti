import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAppointmentStatusConstraint() {
  const { data, error } = await supabase.from('appointments').select('*').limit(1);
  console.log('Sample Appointment Row:', data);
  // Try inserting sample row to test valid status values
  const statuses = ['pending', 'scheduled', 'confirmed', 'completed', 'cancelled'];
  for (const s of statuses) {
    const { error: err } = await supabase.from('appointments').insert([
      {
        doctor_id: '7d7b555e-01e0-4a56-9992-48f914b21b2e',
        patient_id: '00000000-0000-0000-0000-000000000001',
        scheduled_at: new Date().toISOString(),
        status: s,
      },
    ]);
    if (!err) {
      console.log('VALID STATUS FOUND:', s);
      await supabase.from('appointments').delete().eq('status', s);
      break;
    } else {
      console.log('Invalid status:', s, err.message);
    }
  }
}

inspectAppointmentStatusConstraint();
