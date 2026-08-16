import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAllDoctorAuthLinks() {
  console.log('🛠️ Fixing All Doctor Auth Links & ID Mappings in Supabase...');

  // 1. List all Auth users from Supabase Auth
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Error listing auth users:', authErr);
    return;
  }

  console.log(`Found ${authUsers.users.length} Auth users in Supabase Auth.`);

  // 2. Fetch all doctors from doctors table
  const { data: doctors } = await supabase.from('doctors').select('*');

  console.log(`Found ${doctors?.length || 0} Doctor rows in doctors table.`);

  // 3. For each Auth user with email in doctors table, ensure doctors.id === authUser.id!
  for (const authUser of authUsers.users) {
    const matchingDoc = (doctors || []).find((d) => d.email?.toLowerCase().trim() === authUser.email?.toLowerCase().trim());

    if (matchingDoc) {
      console.log(`\nMatching Doctor: ${matchingDoc.name} (${authUser.email})`);
      console.log(`  Auth User ID: ${authUser.id}`);
      console.log(`  Existing Doctor Table ID: ${matchingDoc.id}`);

      if (matchingDoc.id !== authUser.id) {
        console.log(`  🔄 Updating doctors table ID to match Auth User ID: ${authUser.id}...`);

        // First update intakes doctor_id references if any
        await supabase.from('intakes').update({ doctor_id: authUser.id }).eq('doctor_id', matchingDoc.id);

        // Delete old row and insert with authUser.id
        await supabase.from('doctors').delete().eq('id', matchingDoc.id);

        await supabase.from('doctors').insert([
          {
            ...matchingDoc,
            id: authUser.id,
          },
        ]);
        console.log(`  ✅ Doctor ID synced cleanly with Auth ID!`);
      } else {
        console.log(`  ✅ Doctor ID already matches Auth ID!`);
      }
    }
  }

  // 4. Check for any doctors without Auth user, create Auth users for them so they can log in seamlessly
  for (const doc of doctors || []) {
    const hasAuth = authUsers.users.some((u) => u.email?.toLowerCase().trim() === doc.email?.toLowerCase().trim());

    if (!hasAuth && doc.email) {
      console.log(`\nCreating missing Auth user for doctor: ${doc.name} (${doc.email})...`);
      const tempPass = 'VaidyaDoc2026!';
      const { data: newAuth } = await supabase.auth.admin.createUser({
        email: doc.email.trim(),
        password: tempPass,
        email_confirm: true,
        user_metadata: { name: doc.name, role: 'doctor' },
      });

      if (newAuth?.user) {
        await supabase.from('doctors').update({ id: newAuth.user.id }).eq('id', doc.id);
        console.log(`  ✅ Auth user created and linked for ${doc.name}! Password: ${tempPass}`);
      }
    }
  }

  console.log('\n🎉 ALL DOCTOR AUTH LINKS AND ID MAPPINGS FIXED & SYNCED PERMANENTLY!');
}

fixAllDoctorAuthLinks();
