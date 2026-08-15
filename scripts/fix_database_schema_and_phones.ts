import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// E.164 Phone Normalization Helper
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

async function fixSchemaAndNormalizeData() {
  console.log('🛠️ Fixing database schema & normalizing patient phone numbers...');

  // 1. DDL Statements to execute via Supabase
  const sql = `
    ALTER TABLE intakes ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;
    ALTER TABLE clinics ADD COLUMN IF NOT EXISTS facility_type TEXT DEFAULT 'clinic';
    ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
    ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_intakes_doctor_id ON intakes(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_intakes_clinic_id ON intakes(clinic_id);
    CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
  `;

  try {
    const res = await (supabase as any).rpc('exec_sql', { sql_query: sql });
    console.log('RPC execution result:', res);
  } catch (err) {
    console.warn('RPC notice:', err);
  }

  // 2. Fetch and Normalize all patient phones in database
  const { data: patients } = await supabase.from('patients').select('*');
  if (patients) {
    console.log(`Checking ${patients.length} patient rows for phone normalization...`);
    for (const p of patients) {
      const normalized = normalizePhone(p.phone);
      if (normalized !== p.phone) {
        console.log(`Normalizing patient ${p.name}: ${p.phone} -> ${normalized}`);
        await supabase.from('patients').update({ phone: normalized }).eq('id', p.id);
      }
    }
  }

  // 3. Populate missing facility_type on clinics
  await supabase.from('clinics').update({ facility_type: 'hospital' }).ilike('name', '%hospital%');
  await supabase.from('clinics').update({ facility_type: 'hospital' }).ilike('name', '%college%');
  await supabase.from('clinics').update({ facility_type: 'clinic' }).ilike('name', '%clinic%');

  // 4. Populate missing doctor_id on existing intakes using clinic/doctor relationship
  const { data: intakes } = await supabase.from('intakes').select('id, clinic_id, doctor_id');
  const { data: doctors } = await supabase.from('doctors').select('id, clinic_id');

  if (intakes && doctors) {
    for (const intake of intakes) {
      if (!intake.doctor_id && intake.clinic_id) {
        const matchingDoc = doctors.find((d) => d.clinic_id === intake.clinic_id);
        if (matchingDoc) {
          console.log(`Updating intake ${intake.id} with doctor_id ${matchingDoc.id}...`);
          await supabase.from('intakes').update({ doctor_id: matchingDoc.id }).eq('id', intake.id);
        }
      }
    }
  }

  console.log('✅ Phone normalization and schema updates complete!');
}

fixSchemaAndNormalizeData();
