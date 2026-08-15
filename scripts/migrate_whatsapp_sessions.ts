import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function migrate() {
  console.log('🔄 Checking / Migrating whatsapp_sessions schema...');

  // Try running SQL commands if exec_sql function exists, or handle column additions
  const sql = `
    ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
    ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS doctor_id UUID;
    ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS current_step TEXT DEFAULT 'awaiting_name';
    ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS draft_data JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
    ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  `;

  try {
    const res = await (supabase as any).rpc('exec_sql', { sql_query: sql });
    console.log('RPC exec_sql result:', res);
  } catch (err) {
    console.warn('RPC exec_sql not directly exposed, checking fallback schema support:', err);
  }

  // Verify column select
  const { data, error } = await supabase.from('whatsapp_sessions').select('*').limit(1);
  console.log('Current whatsapp_sessions sample row:', data, error);
}

migrate();
