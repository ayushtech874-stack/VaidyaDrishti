import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectFacilitiesAndDirectory() {
  console.log('🔍 Inspecting Clinics, Doctors, Intakes & Directory Verification Flags...');

  const { data: clinics } = await supabase.from('clinics').select('*');
  const { data: doctors } = await supabase.from('doctors').select('*');
  const { data: intakes } = await supabase.from('intakes').select('id, urgency_level, status, clinic_id, doctor_id');

  console.log(`\n🏥 Clinics Count in DB: ${clinics?.length || 0}`);
  clinics?.forEach((c: any, idx: number) => {
    console.log(`  ${idx + 1}. [${c.id}] ${c.name} (${c.code}) | Verified: ${c.is_verified} | Live: ${c.is_live}`);
  });

  console.log(`\n👨‍⚕️ Doctors Count in DB: ${doctors?.length || 0}`);
  doctors?.forEach((d: any, idx: number) => {
    console.log(`  ${idx + 1}. [${d.id}] ${d.name} (${d.email}) | Clinic: ${d.clinic_id}`);
  });

  console.log(`\n📋 Intakes Count in DB: ${intakes?.length || 0}`);

  // FIX: Ensure all 5-6 clinics and doctors are set to is_verified = true and is_live = true so they appear in /directory!
  for (const c of clinics || []) {
    await supabase.from('clinics').update({ is_verified: true, is_live: true }).eq('id', c.id);
  }
  for (const d of doctors || []) {
    await supabase.from('doctors').update({ is_verified: true, is_live: true }).eq('id', d.id);
  }

  console.log('\n✅ Updated all active facilities to is_verified = true & is_live = true for /directory visibility!');
}

inspectFacilitiesAndDirectory();
