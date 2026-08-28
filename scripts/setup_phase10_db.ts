import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPhase10DB() {
  console.log('========================================================================');
  console.log('🛠️ PHASE 10 DB CHECK: DOCTOR SELF-UPDATE POLICY & COLUMNS');
  console.log('========================================================================\n');

  // Verify doctor columns exist
  const { data: doctors, error } = await supabase
    .from('doctors')
    .select('id, name, photo_url, short_bio, qualifications, rmp_registration_number, registration_status')
    .limit(1);

  if (error) {
    console.log('Doctors columns query error:', error.message);
  } else {
    console.log('Doctors columns query SUCCESS! ✅', doctors);
  }
}

setupPhase10DB();
