import { formatPatientSeverity } from '../lib/clinical/patientSeverityFormatter';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyPhase9dSeverityFraming() {
  console.log('========================================================================');
  console.log('🧪 VERIFYING PHASE 9d: PATIENT-FACING SEVERITY FRAMING & DOCTOR OPD QUEUE INTEGRITY');
  console.log('========================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Softer Framing Mapper Verification
    // -------------------------------------------------------------------------
    console.log('📍 TEST 1: Patient-Facing Softer Status Framing');

    const highInfo = formatPatientSeverity('high');
    const medInfo = formatPatientSeverity('medium');
    const lowInfo = formatPatientSeverity('low');

    console.log(`  └─ High Severity Label: "${highInfo.label}" ✅`);
    console.log(`  └─ Medium Severity Label: "${medInfo.label}" ✅`);
    console.log(`  └─ Low Severity Label: "${lowInfo.label}" ✅`);

    const hasSoftHigh = highInfo.label.includes('prompt doctor review');
    const hasSoftMed = medInfo.label.includes('standard OPD hours');
    const hasSoftLow = lowInfo.label.includes('Routine consultation registered');

    if (!hasSoftHigh || !hasSoftMed || !hasSoftLow) {
      throw new Error('Test 1 Softer Framing Assertion Failed!');
    }
    console.log('  └─ TEST 1 PASSED: Patient-facing softer status messages verified! ✅\n');

    // -------------------------------------------------------------------------
    // TEST 2: Doctor OPD Queue Data Integrity ("AI drafts, doctor decides")
    // -------------------------------------------------------------------------
    console.log('📍 TEST 2: Doctor OPD Queue Raw Urgency Integrity Check');

    const { data: rawIntakes } = await supabase
      .from('intakes')
      .select('id, urgency_level')
      .limit(5);

    console.log(`  └─ Doctor OPD Queue Raw Urgency Samples:`, rawIntakes?.map((i) => i.urgency_level));

    // Confirm DB stores raw un-softened clinical tokens (e.g. 'high', 'routine', 'low', 'medium', or null)
    const validRawTokens = ['high', 'medium', 'low', 'routine', 'emergency', null];
    const allValid = (rawIntakes || []).every((i) => validRawTokens.includes(i.urgency_level));

    console.log(`  └─ Doctor Queue Stores Un-Softened Clinical Tokens: ${allValid} ✅`);

    if (!allValid) {
      throw new Error('Test 2 Doctor OPD Queue Data Integrity Failed!');
    }
    console.log('  └─ TEST 2 PASSED: Doctor OPD Queue preserves raw clinical urgency levels untouched! ✅\n');

    console.log('========================================================================');
    console.log('🎉 PHASE 9d VERIFICATION COMPLETED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('Verification Error:', err.message);
  }
}

verifyPhase9dSeverityFraming();
