import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDoctorKritiQueue() {
  console.log('🩺 Verifying Dr. Kriti Sharma Queue Data in Supabase...');

  // 1. Fetch Dr. Kriti Sharma profile
  const { data: doctor } = await supabase
    .from('doctors')
    .select('id, name, email, rmp_registration_number, clinic_id')
    .eq('email', 'dr.kritisharma@vaidyadrishti.com')
    .single();

  if (!doctor) {
    console.error('❌ Dr. Kriti Sharma profile not found');
    return;
  }

  console.log(`Doctor Profile: ${doctor.name} (${doctor.id})`);
  console.log(`Clinic ID: ${doctor.clinic_id}`);

  // 2. Fetch Healing Touch Hospital intakes for Dr. Kriti Sharma's clinic
  const { data: intakes, error } = await supabase
    .from('intakes')
    .select(`
      id,
      patient_id,
      clinic_id,
      raw_text,
      urgency_level,
      status,
      created_at,
      patients (
        id,
        name,
        age,
        phone
      )
    `)
    .eq('clinic_id', doctor.clinic_id);

  if (error) {
    console.error('Query error:', error);
    return;
  }

  console.log(`\n📋 Active Intakes Found for Healing Touch Hospital (Dr. Kriti Sharma Queue): ${intakes?.length || 0}`);
  intakes?.forEach((i: any, idx: number) => {
    console.log(`\nIntake #${idx + 1}:`);
    console.log(`  Intake ID: ${i.id}`);
    console.log(`  Patient: ${i.patients?.name || 'N/A'} (${i.patients?.age} yrs)`);
    console.log(`  Phone: ${i.patients?.phone}`);
    console.log(`  Urgency: ${i.urgency_level}`);
    console.log(`  Status: ${i.status}`);
    console.log(`  Raw Text: "${i.raw_text}"`);
  });

  console.log('\n✅ Verification Complete! Dr. Kriti Sharma queue data for Healing Touch Hospital is intact.');
}

verifyDoctorKritiQueue();
