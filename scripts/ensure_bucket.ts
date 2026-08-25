import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === 'doctor-verification-docs');

  if (!exists) {
    const { error } = await supabase.storage.createBucket('doctor-verification-docs', {
      public: false,
    });
    if (error) console.log('Bucket error:', error.message);
    else console.log('Created private bucket: doctor-verification-docs ✅');
  } else {
    console.log('Private bucket doctor-verification-docs exists ✅');
  }
}

ensureBucket();
