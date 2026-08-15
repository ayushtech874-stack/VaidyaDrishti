import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyPhase4Schema() {
  console.log('🛠️ Applying Phase 4 Schema Updates (is_verified & is_live flags)...');

  // Add columns to clinics & doctors tables
  const sql = `
    ALTER TABLE clinics ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
    ALTER TABLE clinics ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;

    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
    ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;
  `;

  try {
    const res = await (supabase as any).rpc('exec_sql', { sql_query: sql });
    console.log('RPC execution result:', res);
  } catch (err) {
    console.warn('RPC notice:', err);
  }

  // Set existing production clinics to verified & live
  const { data: clinics } = await supabase.from('clinics').select('id, name');
  if (clinics) {
    for (const c of clinics) {
      console.log(`Setting verified & live for clinic: ${c.name} (${c.id})`);
      await supabase.from('clinics').update({ is_verified: true, is_live: true }).eq('id', c.id);
    }
  }

  // Set existing production doctors to verified & live
  const { data: doctors } = await supabase.from('doctors').select('id, name');
  if (doctors) {
    for (const d of doctors) {
      console.log(`Setting verified & live for doctor: ${d.name} (${d.id})`);
      await supabase.from('doctors').update({ is_verified: true, is_live: true }).eq('id', d.id);
    }
  }

  console.log('✅ Phase 4 Schema Updates & Baseline Verification complete!');
}

applyPhase4Schema();
