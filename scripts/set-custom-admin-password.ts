import { createClient } from '@supabase/supabase-js';
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

async function setAdminPassword() {
  const adminEmail = 'admin@vaidyadrishti.com';
  const customPass = 'AdminPass123!';

  const { data: userList } = await supabase.auth.admin.listUsers();
  const adminUser = userList?.users?.find((u) => u.email === adminEmail);

  if (adminUser) {
    const { error } = await supabase.auth.admin.updateUserById(adminUser.id, {
      password: customPass,
      app_metadata: { role: 'super_admin' },
    });
    if (error) throw error;
    console.log(`✅ Admin password successfully set for ${adminEmail}!`);
  } else {
    const { error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: customPass,
      email_confirm: true,
      app_metadata: { role: 'super_admin' },
    });
    if (error) throw error;
    console.log(`✅ Admin user successfully created with super_admin role!`);
  }
}

setAdminPassword();
