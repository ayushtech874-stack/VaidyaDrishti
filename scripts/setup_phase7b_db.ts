import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPhase7bDb() {
  console.log('🛠️ Setting up Phase 7b E-Prescriptions Schema & Storage...');

  // 1. Create Private Storage Bucket 'prescriptions'
  try {
    const { data: bucketData, error: bucketErr } = await supabase.storage.createBucket('prescriptions', {
      public: false, // Private bucket
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['application/pdf'],
    });

    if (bucketErr) {
      if (bucketErr.message?.includes('already exists') || (bucketErr as any).statusCode === '409') {
        console.log('✅ Bucket prescriptions already exists.');
      } else {
        console.warn('Bucket creation notice:', bucketErr.message);
      }
    } else {
      console.log('✅ Created private storage bucket prescriptions:', bucketData);
    }
  } catch (e: any) {
    console.warn('Storage bucket setup notice:', e.message);
  }

  // 2. Check if prescriptions and prescription_items tables exist
  const { error: rxErr } = await supabase.from('prescriptions').select('id').limit(1);
  console.log('prescriptions check error (PGRST205 if missing):', rxErr?.code, rxErr?.message);

  const { error: itemErr } = await supabase.from('prescription_items').select('id').limit(1);
  console.log('prescription_items check error (PGRST205 if missing):', itemErr?.code, itemErr?.message);
}

setupPhase7bDb();
