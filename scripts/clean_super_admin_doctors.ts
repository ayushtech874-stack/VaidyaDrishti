import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanSuperAdminFromDoctors() {
  console.log('🧹 Cleaning Super-Admin rows from doctors table...');

  const { data: docs } = await supabase.from('doctors').select('*');
  const superAdminDocs = (docs || []).filter((d) => d.role === 'super_admin' || d.email.includes('admin@vaidyadrishti.com'));

  for (const d of superAdminDocs) {
    console.log(`Removing super_admin row from doctors table: ${d.name} (${d.email})`);
    await supabase.from('doctors').delete().eq('id', d.id);
  }

  console.log('✅ Super-Admin rows removed from doctors table!');
}

cleanSuperAdminFromDoctors();
