import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPhase9bDB() {
  console.log('========================================================================');
  console.log('🛠️ PHASE 9b DB CHECK: MULTI-PROFILE FAMILY ACCOUNT COLUMNS');
  console.log('========================================================================\n');

  // Test selecting new columns from patients table
  const { data: patients, error } = await supabase
    .from('patients')
    .select('id, name, auth_user_id, managed_by_auth_user_id, relationship, display_name')
    .limit(2);

  if (error) {
    console.log('Patients Phase 9b columns query error:', error.message);
  } else {
    console.log('Patients Phase 9b columns query SUCCESS! ✅', patients);
  }
}

setupPhase9bDB();
