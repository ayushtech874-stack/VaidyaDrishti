import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDepartmentsAndDoctors() {
  const { data: depts } = await supabase.from('departments').select('*');
  const { data: docs } = await supabase.from('doctors').select('id, name, clinic_id, department_id');
  console.log('Departments:', depts);
  console.log('Doctors:', docs);
}

inspectDepartmentsAndDoctors();
