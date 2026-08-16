import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDrKritiAuthUser() {
  console.log('🔍 Debugging Dr. Kriti Sharma Auth & Doctor Profile in Supabase...');

  // 1. List all Auth users
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const kritiAuth = usersData?.users.find((u) => u.email?.toLowerCase().includes('kriti'));

  console.log('Auth User Object for Kriti:', kritiAuth);

  // 2. Fetch doctors table row for Kriti
  const { data: docRows } = await supabase.from('doctors').select('*');
  const kritiDoc = (docRows || []).find((d) => d.email?.toLowerCase().includes('kriti'));

  console.log('Doctors Table Row for Kriti:', kritiDoc);

  // 3. Fetch clinics table row
  const { data: clinicRows } = await supabase.from('clinics').select('*');
  const healingTouch = (clinicRows || []).find((c) => c.id === '00000000-0000-0000-0000-000000000022' || c.code === 'HOSP_HealingTouch');

  console.log('Healing Touch Hospital Row:', healingTouch);

  // 4. Test query simulation
  if (kritiAuth && kritiDoc) {
    console.log('\n--- SIMULATING DASHBOARD QUERY FOR KRITI ---');
    const { data: simDoc, error: simErr } = await supabase
      .from('doctors')
      .select('id, name, email, rmp_registration_number, clinic_id, role')
      .or(`id.eq.${kritiAuth.id},email.eq.${kritiAuth.email}`)
      .maybeSingle();

    console.log('Simulation Query Result:', simDoc);
    console.log('Simulation Query Error:', simErr);
  }
}

debugDrKritiAuthUser();
