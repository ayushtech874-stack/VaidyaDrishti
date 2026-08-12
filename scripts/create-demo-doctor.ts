import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createDoctor() {
  const email = 'doctor@vaidyadrishti.com';
  const password = 'DoctorPass123!';

  console.log(`Creating demo doctor account for ${email}...`);

  // Check if user already exists or create new user
  const { data: userList } = await supabase.auth.admin.listUsers();
  const existingUser = userList?.users?.find((u) => u.email === email);

  let userId: string;

  if (existingUser) {
    console.log(`User ${email} already exists. Updating password...`);
    const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password, email_confirm: true }
    );
    if (updateErr) throw updateErr;
    userId = updated.user.id;
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) throw createErr;
    userId = created.user.id;
  }

  // Ensure record exists in doctors table
  const { error: dError } = await supabase
    .from('doctors')
    .upsert([{ id: userId, name: 'Dr. Ramesh Chandra (RMP)', email }]);

  if (dError) {
    console.warn('Warning inserting into doctors table:', dError.message);
  }

  console.log('\n✅ Demo doctor account ready!');
  console.log(`   Email: ${email}`);
  console.log(`   Password: ${password}`);
}

createDoctor();
