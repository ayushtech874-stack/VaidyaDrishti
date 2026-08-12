import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function rotateAdminPassword() {
  const adminEmail = 'admin@vaidyadrishti.com';

  // Generate a random 32-character high-entropy password
  const newSecretPassword = crypto.randomBytes(24).toString('hex') + '!Aa1';

  const { data: userList } = await supabase.auth.admin.listUsers();
  const adminUser = userList?.users?.find((u) => u.email === adminEmail);

  if (adminUser) {
    const { error } = await supabase.auth.admin.updateUserById(adminUser.id, {
      password: newSecretPassword,
      app_metadata: { role: 'super_admin' },
    });
    if (error) throw error;
    console.log(`✅ Super-Admin credentials successfully rotated for ${adminEmail}!`);
    console.log(`   Role: super_admin confirmed in app_metadata.`);
  } else {
    const { error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: newSecretPassword,
      email_confirm: true,
      app_metadata: { role: 'super_admin' },
    });
    if (error) throw error;
    console.log(`✅ Super-Admin credentials successfully created & secured for ${adminEmail}!`);
  }
}

rotateAdminPassword();
