import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanUnlinkedMockDoctors() {
  console.log('🛠️ Cleaning up unlinked mock test doctor rows...');

  const { data: authData } = await supabase.auth.admin.listUsers();
  const authEmails = new Set((authData?.users || []).map(u => u.email?.toLowerCase().trim()));

  const { data: doctors } = await supabase.from('doctors').select('id, email, name');

  const unlinkedDocIds: string[] = [];

  for (const doc of doctors || []) {
    const isRealAuthUser = authEmails.has(doc.email?.toLowerCase().trim());
    if (!isRealAuthUser) {
      console.log(`- Flagged unlinked mock doctor: ${doc.name} (${doc.email}) - ID: ${doc.id}`);
      unlinkedDocIds.push(doc.id);
    }
  }

  if (unlinkedDocIds.length > 0) {
    const { error } = await supabase.from('doctors').delete().in('id', unlinkedDocIds);
    if (error) console.error('Deletion error:', error.message);
    else console.log(`✅ Removed ${unlinkedDocIds.length} unlinked mock doctor rows!`);
  } else {
    console.log('✅ 100% of doctor rows in DB are valid authenticated users!');
  }
}

cleanUnlinkedMockDoctors();
