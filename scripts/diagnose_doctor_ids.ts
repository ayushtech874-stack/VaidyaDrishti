import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseDoctorIDs() {
  console.log('🔍 STEP 1: DIAGNOSING DOCTOR AUTH USER IDs VS DOCTORS TABLE IDs...\n');

  // 1. List all Auth Users
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) {
    console.error('Auth error:', authErr);
    return;
  }

  // 2. List all Doctors table rows
  const { data: doctorsData, error: docErr } = await supabase.from('doctors').select('*');
  if (docErr) {
    console.error('Doctors query error:', docErr);
    return;
  }

  console.log('========================================================================================');
  console.log('| DOCTOR NAME         | EMAIL                           | AUTH USER ID                         | DOCTORS TABLE ID                     | STATUS |');
  console.log('========================================================================================');

  const results: any[] = [];

  for (const doc of doctorsData || []) {
    const matchingAuth = authData.users.find(
      (u) => u.email?.toLowerCase().trim() === doc.email?.toLowerCase().trim()
    );

    const authId = matchingAuth ? matchingAuth.id : 'NOT FOUND IN AUTH';
    const docTableId = doc.id;
    const isMatch = matchingAuth && authId === docTableId;

    console.log(
      `| ${doc.name.padEnd(19)} | ${doc.email.padEnd(31)} | ${authId.padEnd(36)} | ${docTableId.padEnd(36)} | ${isMatch ? '✅ MATCH' : '❌ MISMATCH'} |`
    );

    results.push({
      name: doc.name,
      email: doc.email,
      authId,
      docTableId,
      isMatch,
    });
  }

  console.log('========================================================================================\n');

  // Explicit Diagnosis for Dr. Kriti Sharma
  const kriti = results.find((r) => r.email.includes('kritisharma'));
  if (kriti) {
    console.log('📋 EXPLICIT DIAGNOSIS FOR DR. KRITI SHARMA:');
    console.log(`- Doctor Name: ${kriti.name}`);
    console.log(`- Email: ${kriti.email}`);
    console.log(`- Auth User ID:    ${kriti.authId}`);
    console.log(`- Doctors Table ID: ${kriti.docTableId}`);
    console.log(`- ID Match Result:  ${kriti.isMatch ? 'PASS (IDs are identical)' : 'FAIL (IDs mismatch)'}\n`);
  }
}

diagnoseDoctorIDs();
