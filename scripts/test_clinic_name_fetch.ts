import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testClinicNameFetch() {
  console.log('🔍 Testing Doctor & Clinic Name Fetch in Supabase...');

  // 1. Fetch Doctor
  const { data: doc, error: docErr } = await supabase
    .from('doctors')
    .select('id, name, email, clinic_id, department_id')
    .eq('email', 'dr.kritisharma@vaidyadrishti.com')
    .single();

  console.log('DOCTOR ROW:', doc);
  console.log('DOCTOR ERR:', docErr);

  if (doc?.clinic_id) {
    // 2. Fetch Clinic
    const { data: clinic, error: clinicErr } = await supabase
      .from('clinics')
      .select('id, name, code, facility_type, address')
      .eq('id', doc.clinic_id)
      .single();

    console.log('CLINIC ROW:', clinic);
    console.log('CLINIC ERR:', clinicErr);
  }
}

testClinicNameFetch();
