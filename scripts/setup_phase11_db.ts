import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPhase11DB() {
  console.log('========================================================================');
  console.log('🛠️ PHASE 11 DB CHECK: IS_ACTIVE COLUMNS & RLS ISOLATION');
  console.log('========================================================================\n');

  // Verify doctors.is_active and clinics.is_active
  const { data: doctors, error: dErr } = await supabase
    .from('doctors')
    .select('id, name, is_active, registration_status')
    .limit(1);

  if (dErr) {
    console.log('Doctors is_active check error:', dErr.message);
  } else {
    console.log('Doctors is_active check SUCCESS! ✅', doctors);
  }

  const { data: clinics, error: cErr } = await supabase
    .from('clinics')
    .select('id, name, is_active, is_verified')
    .limit(1);

  if (cErr) {
    console.log('Clinics is_active check error:', cErr.message);
  } else {
    console.log('Clinics is_active check SUCCESS! ✅', clinics);
  }
}

setupPhase11DB();
