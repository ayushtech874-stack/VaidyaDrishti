import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDuplicatePatientPhones() {
  console.log('🛠️ Cleaning duplicate patient phone numbers in Supabase...');

  // Fetch all patients
  const { data: patients } = await supabase.from('patients').select('*').order('created_at', { ascending: true });

  if (!patients) return;

  const phoneSeen = new Map<string, string>(); // phone -> first patient id

  for (const p of patients) {
    if (!p.phone) continue;

    if (phoneSeen.has(p.phone)) {
      const firstId = phoneSeen.get(p.phone)!;
      console.log(`Duplicate phone found: ${p.phone} for Patient ${p.name} (ID: ${p.id}). First patient ID: ${firstId}`);

      // Check if this duplicate patient has any intakes
      const { data: pIntakes } = await supabase.from('intakes').select('id').eq('patient_id', p.id);

      if (pIntakes && pIntakes.length > 0) {
        console.log(`  Reassigning ${pIntakes.length} intakes from ${p.id} to ${firstId}...`);
        await supabase.from('intakes').update({ patient_id: firstId }).eq('patient_id', p.id);
      }

      // Append timestamp or update duplicate phone so unique constraint can succeed
      const uniquePhone = `${p.phone}_OLD_${p.id.slice(0, 4)}`;
      console.log(`  Updating duplicate patient ${p.name} (${p.id}) phone to ${uniquePhone}...`);
      await supabase.from('patients').update({ phone: uniquePhone }).eq('id', p.id);
    } else {
      phoneSeen.set(p.phone, p.id);
    }
  }

  console.log('✅ Duplicate phone numbers cleaned successfully!');
}

cleanDuplicatePatientPhones();
