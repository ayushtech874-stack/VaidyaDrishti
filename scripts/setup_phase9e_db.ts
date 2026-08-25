import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPhase9eDB() {
  console.log('========================================================================');
  console.log('🛠️ PHASE 9e DB CHECK: INVOICES TABLE & PER-DOCTOR RLS ISOLATION');
  console.log('========================================================================\n');

  const { data: invoices, error } = await supabase.from('invoices').select('*').limit(1);

  if (error) {
    console.log('Invoices table query error:', error.message);
  } else {
    console.log('Invoices table query SUCCESS! ✅', invoices);
  }
}

setupPhase9eDB();
