import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env variables in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Production repository seed: 0 hardcoded dummy patients.
// All patient intakes are created dynamically via WhatsApp Webhook or Patient Web Portal.
const seedPatients: any[] = [];

async function seed() {
  console.log('🚀 Production seed script initialized with 0 dummy patients.');
  console.log('✅ Only live patient records submitted via WhatsApp / Web Portal are stored.');
}

seed();
