import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyProblem2Schema() {
  console.log('🛠️ Applying Problem 2 Schema Updates (is_general_triage & department_patient_labels)...');

  // Set Dr. Kriti Sharma as General Triage Doctor for Healing Touch Hospital
  const { data: doctors } = await supabase.from('doctors').select('id, name, email').eq('email', 'dr.kritisharma@vaidyadrishti.com');
  if (doctors && doctors.length > 0) {
    console.log(`Setting is_general_triage = true for Dr. Kriti Sharma (${doctors[0].id})...`);
    await supabase.from('doctors').update({ is_general_triage: true }).eq('id', doctors[0].id);
  }

  // Set department_patient_labels for departments
  const { data: depts } = await supabase.from('departments').select('id, name');
  if (depts) {
    for (const d of depts) {
      let label = "5. Not sure / general health concern";
      if (d.name.toLowerCase().includes('cardio')) label = "1. Heart, chest, or breathing";
      if (d.name.toLowerCase().includes('ortho')) label = "2. Bones, joints, or an injury";
      if (d.name.toLowerCase().includes('pedia')) label = "3. Child's health";
      if (d.name.toLowerCase().includes('eye') || d.name.toLowerCase().includes('ophthal')) label = "4. Eyes";

      await supabase.from('departments').update({ department_patient_labels: label }).eq('id', d.id);
    }
  }

  console.log('✅ Problem 2 Schema & Baseline Setup Complete!');
}

applyProblem2Schema();
