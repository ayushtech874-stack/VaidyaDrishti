import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillIntakes() {
  console.log('🔄 Starting backfill of doctor_id on existing intakes...');

  const { data: doctors } = await supabase.from('doctors').select('id, name, clinic_id, department_id');
  const { data: intakes } = await supabase.from('intakes').select('id, clinic_id, doctor_id, patient_id, raw_text, created_at');

  const docList = doctors || [];
  const intakeList = intakes || [];

  let backfilledCount = 0;
  const unresolvedIntakes: any[] = [];

  for (const intake of intakeList) {
    if (!intake.doctor_id && intake.clinic_id) {
      // Find all doctors registered under this clinic
      const clinicDocs = docList.filter((d) => d.clinic_id === intake.clinic_id);

      if (clinicDocs.length === 1) {
        // Single-doctor clinic: 100% confident backfill
        const targetDoc = clinicDocs[0];
        console.log(`✅ Backfilling intake ${intake.id} -> ${targetDoc.name} (${targetDoc.id})`);
        await supabase.from('intakes').update({ doctor_id: targetDoc.id }).eq('id', intake.id);
        backfilledCount++;
      } else if (clinicDocs.length > 1) {
        // Multi-doctor facility handling (e.g. Healing Touch Hospital)
        if (intake.clinic_id === '00000000-0000-0000-0000-000000000022') {
          // Dr. Kriti Sharma General Medicine OPD
          const drKriti = clinicDocs.find((d) => d.name.includes('Kriti'));
          if (drKriti) {
            console.log(`✅ Backfilling Healing Touch Hospital intake ${intake.id} -> ${drKriti.name} (${drKriti.id})`);
            await supabase.from('intakes').update({ doctor_id: drKriti.id }).eq('id', intake.id);
            backfilledCount++;
            continue;
          }
        }
        unresolvedIntakes.push(intake);
      } else {
        unresolvedIntakes.push(intake);
      }
    }
  }

  console.log(`\n🎉 Backfill complete! Total rows updated: ${backfilledCount}`);
  console.log(`Unresolved legacy intakes requiring manual assignment: ${unresolvedIntakes.length}`);

  if (unresolvedIntakes.length > 0) {
    console.log('Unresolved Intakes List:', JSON.stringify(unresolvedIntakes, null, 2));
  }
}

backfillIntakes();
