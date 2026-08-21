import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupPhase7aDb() {
  console.log('🛠️ Setting up Phase 7a Doctor-Patient Messaging Schema & Storage...');

  // 1. Create Private Storage Bucket 'message-attachments'
  try {
    const { data: bucketData, error: bucketErr } = await supabase.storage.createBucket('message-attachments', {
      public: false, // Private bucket
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    });

    if (bucketErr) {
      if (bucketErr.message?.includes('already exists') || (bucketErr as any).statusCode === '409') {
        console.log('✅ Bucket message-attachments already exists.');
      } else {
        console.warn('Bucket creation notice:', bucketErr.message);
      }
    } else {
      console.log('✅ Created private storage bucket message-attachments:', bucketData);
    }
  } catch (e: any) {
    console.warn('Storage bucket setup notice:', e.message);
  }

  // 2. Check if conversations & messages tables exist
  const { error: convErr } = await supabase.from('conversations').select('id').limit(1);
  console.log('conversations check error (PGRST205 if missing):', convErr?.code, convErr?.message);

  const { error: msgErr } = await supabase.from('messages').select('id').limit(1);
  console.log('messages check error (PGRST205 if missing):', msgErr?.code, msgErr?.message);
}

setupPhase7aDb();
