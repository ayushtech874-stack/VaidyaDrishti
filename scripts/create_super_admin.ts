import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSuperAdmin(email: string, pass: string, name: string) {
  console.log(`🔐 Setting up Super-Admin Account for: ${email}...`);

  // 1. Create or fetch Auth user in Supabase Auth
  let userId: string;
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password: pass,
    email_confirm: true,
    user_metadata: { name: name.trim(), role: 'super_admin' },
  });

  if (authErr) {
    console.log('User exists in Auth, updating existing user password & role...');
    const { data: users } = await supabase.auth.admin.listUsers();
    const existing = users.users.find((u) => u.email === email.trim());
    if (existing) {
      userId = existing.id;
      await supabase.auth.admin.updateUserById(userId, {
        password: pass,
        user_metadata: { name: name.trim(), role: 'super_admin' },
      });
    } else {
      throw authErr;
    }
  } else {
    userId = authData.user.id;
  }

  // 2. Upsert Super-Admin Doctor Profile in doctors table
  const { data: docData, error: docErr } = await supabase.from('doctors').upsert([
    {
      id: userId,
      name: name.trim(),
      email: email.trim(),
      rmp_registration_number: 'SUPER-ADMIN-DIRECTOR',
      qualifications: 'VaidyaDrishti Chief Administrator',
      role: 'super_admin',
    },
  ]);

  if (docErr) {
    console.error('Error updating doctors table:', docErr);
  } else {
    console.log('✅ Super-Admin profile updated successfully in database!');
  }

  console.log(`\n🎉 SUPER-ADMIN CREATED SUCCESSFULLY!`);
  console.log(`-----------------------------------`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${pass}`);
  console.log(`Role: super_admin`);
  console.log(`Login URL: https://vaidya-drishti.vercel.app/doctor/login\n`);
}

const adminEmail = process.argv[2] || 'admin@vaidyadrishti.com';
const adminPass = process.argv[3] || 'VaidyaSuperAdmin2026!';
const adminName = process.argv[4] || 'VaidyaDrishti Super Admin';

createSuperAdmin(adminEmail, adminPass, adminName);
