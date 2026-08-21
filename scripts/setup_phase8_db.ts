import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPrescriptionItemsKeys() {
  const { data } = await supabase.from('prescription_items').select('*').limit(1);
  if (data && data[0]) {
    console.log('Prescription Items Table Keys:', Object.keys(data[0]));
  }
}

inspectPrescriptionItemsKeys();
