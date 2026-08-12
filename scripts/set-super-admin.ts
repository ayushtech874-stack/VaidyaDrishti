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

async function setSuperAdmin() {
  const adminEmail = 'admin@vaidyadrishti.com';

  console.log(`Setting super_admin role in app_metadata for ${adminEmail}...`);

  // Find user by email
  const { data: userList } = await supabase.auth.admin.listUsers();
  let adminUser = userList?.users?.find((u) => u.email === adminEmail);

  if (!adminUser) {
    console.log(`Creating super_admin user ${adminEmail}...`);
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: 'SuperAdminPass123!',
      email_confirm: true,
      app_metadata: { role: 'super_admin' },
    });
    if (error) throw error;
    adminUser = created.user;
  } else {
    console.log(`Updating app_metadata for existing user ${adminUser.id}...`);
    const { data: updated, error } = await supabase.auth.admin.updateUserById(adminUser.id, {
      app_metadata: { role: 'super_admin' },
    });
    if (error) throw error;
    adminUser = updated.user;
  }

  console.log('\n✅ Super-Admin role successfully provisioned!');
  console.log(`   User ID: ${adminUser.id}`);
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   app_metadata:`, adminUser.app_metadata);
}

setSuperAdmin();
