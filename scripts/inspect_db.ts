import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanCommandIntakes() {
  console.log('🧹 Cleaning up test command intakes...');
  const { data, error } = await supabase
    .from('intakes')
    .delete()
    .ilike('raw_text', '%JOIN_HOSP%');

  console.log('Cleaned test command intakes:', data, error);
}

cleanCommandIntakes();
