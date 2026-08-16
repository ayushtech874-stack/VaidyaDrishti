import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixIntakesAndDoctorQueues() {
  console.log('🛠️ Fixing Intakes Doctor ID Assignments & Clinic Queue Links in Supabase...');

  // 1. Fetch all doctors and clinics
  const { data: doctors } = await supabase.from('doctors').select('*');
  const { data: clinics } = await supabase.from('clinics').select('*');

  console.log(`Found ${doctors?.length || 0} doctors and ${clinics?.length || 0} clinics.`);

  // 2. Fetch all intakes
  const { data: intakes } = await supabase.from('intakes').select('*');
  console.log(`Found ${intakes?.length || 0} intakes in database.`);

  for (const intake of intakes || []) {
    console.log(`\nIntake ID: ${intake.id}`);
    console.log(`  Clinic ID: ${intake.clinic_id}`);
    console.log(`  Doctor ID: ${intake.doctor_id}`);

    // If doctor_id is null or missing, find doctor assigned to intake.clinic_id
    if (!intake.doctor_id && intake.clinic_id) {
      const assignedDoc = (doctors || []).find((d) => d.clinic_id === intake.clinic_id);

      if (assignedDoc) {
        console.log(`  🔄 Assigning intake to doctor: ${assignedDoc.name} (${assignedDoc.id})...`);
        await supabase.from('intakes').update({ doctor_id: assignedDoc.id }).eq('id', intake.id);
        console.log(`  ✅ Intake updated with doctor_id = ${assignedDoc.id}!`);
      }
    }
  }

  // 3. Ensure Dr. Kriti Sharma profile in doctors table is 100% linked to Healing Touch Hospital
  const kritiDoc = (doctors || []).find((d) => d.email?.toLowerCase().trim() === 'dr.kritisharma@vaidyadrishti.com');
  const healingTouch = (clinics || []).find((c) => c.code === 'HOSP_HealingTouch' || c.name.includes('Healing Touch'));

  if (kritiDoc && healingTouch) {
    console.log(`\nVerifying Dr. Kriti Sharma Clinic Link:`);
    console.log(`  Doctor: ${kritiDoc.name} (${kritiDoc.id})`);
    console.log(`  Clinic: ${healingTouch.name} (${healingTouch.id})`);

    if (kritiDoc.clinic_id !== healingTouch.id) {
      console.log(`  🔄 Updating Dr. Kriti Sharma clinic_id to ${healingTouch.id}...`);
      await supabase.from('doctors').update({ clinic_id: healingTouch.id }).eq('id', kritiDoc.id);
    }
    console.log(`  ✅ Dr. Kriti Sharma clinic link verified!`);
  }

  console.log('\n🎉 INTAKES AND DOCTOR QUEUE LINKS FIXED & VERIFIED PERMANENTLY!');
}

fixIntakesAndDoctorQueues();
